import { spawn, type ChildProcess } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProcessExit, ProcessHandle, ProcessManagerGateway, SpawnRequest, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { ShellEnv } from '../platform/ShellEnv'
import { FileTail } from './FileTail'
import { LogRing } from './LogRing'
import { isAlive, terminate } from './PosixProcessKiller'

interface Entry {
  handle: ProcessHandle | null
  child: ChildProcess | null
  ring: LogRing
  tail: FileTail | null
  watcher: NodeJS.Timeout | null
  exit: Promise<ProcessExit> | null
  finishing: Promise<ProcessExit> | null
  stopping: boolean
}

const safeName = (id: string) => id.replace(/[^\w.-]+/g, '_').slice(0, 120)

/**
 * Spawna cada serviço com `detached: true` (novo process group, pgid = pid) e saída redirecionada
 * para arquivo, para que os processos possam sobreviver ao fechamento do app ("manter a boiada").
 */
export class ProcessManager implements ProcessManagerGateway {
  private entries = new Map<string, Entry>()
  private exitListeners: ((exit: ProcessExit) => void)[] = []
  private logListeners: ((serviceId: string, data: string) => void)[] = []

  constructor(
    private readonly logsDir: string,
    private readonly shellEnv: ShellEnv,
    private readonly logger: Logger
  ) {}

  private entry(serviceId: string): Entry {
    let e = this.entries.get(serviceId)
    if (!e) {
      e = { handle: null, child: null, ring: new LogRing(), tail: null, watcher: null, exit: null, finishing: null, stopping: false }
      this.entries.set(serviceId, e)
    }
    return e
  }

  onExit(listener: (exit: ProcessExit) => void): void {
    this.exitListeners.push(listener)
  }

  onLog(listener: (serviceId: string, data: string) => void): void {
    this.logListeners.push(listener)
  }

  appendLog(serviceId: string, data: string): void {
    this.entry(serviceId).ring.push(data)
    for (const l of this.logListeners) l(serviceId, data)
  }

  logs(serviceId: string): string {
    return this.entries.get(serviceId)?.ring.text() ?? ''
  }

  clearLogs(serviceId: string): void {
    this.entries.get(serviceId)?.ring.clear()
  }

  isAlive(serviceId: string): boolean {
    const h = this.entries.get(serviceId)?.handle
    return Boolean(h && isAlive(-h.pgid))
  }

  handles(): ProcessHandle[] {
    return [...this.entries.values()].map((e) => e.handle).filter((h): h is ProcessHandle => h !== null && isAlive(-h.pgid))
  }

  async spawn(req: SpawnRequest): Promise<ProcessHandle> {
    if (this.isAlive(req.serviceId)) throw new AppError('CONFLICT', 'Esse serviço já está rodando')
    await mkdir(this.logsDir, { recursive: true })
    const logFile = join(this.logsDir, `${safeName(req.serviceId)}.log`)
    const fd = openSync(logFile, 'w', 0o600)
    const env = { ...(await this.shellEnv.resolve()), FORCE_COLOR: '1', CLICOLOR_FORCE: '1', ...req.env }

    let child: ChildProcess
    try {
      child = spawn(this.shellEnv.shell, ['-c', req.command], { cwd: req.cwd, env, detached: true, stdio: ['ignore', fd, fd] })
    } finally {
      closeSync(fd)
    }
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', (err) => reject(new AppError('PROCESS', `Falha ao iniciar: ${err.message}`)))
    })
    child.unref()

    const pid = child.pid!
    const handle: ProcessHandle = { serviceId: req.serviceId, projectId: req.projectId, pid, pgid: pid, startedAt: new Date().toISOString(), logFile }
    const e = this.entry(req.serviceId)
    e.handle = handle
    e.child = child
    e.stopping = false
    e.finishing = null
    e.tail = new FileTail(logFile, (data) => this.appendLog(req.serviceId, data))
    await e.tail.start()
    e.exit = new Promise<ProcessExit>((resolve) => {
      child.once('exit', (code, signal) => void this.finish(req.serviceId, code, signal).then(resolve))
    })
    this.logger.info('process.spawned', { serviceId: req.serviceId, pid, cwd: req.cwd })
    return handle
  }

  /** Idempotente: exit do ChildProcess, watcher de adotados e stop() podem chamar ao mesmo tempo. */
  private finish(serviceId: string, code: number | null, signal: NodeJS.Signals | null): Promise<ProcessExit> {
    const e = this.entry(serviceId)
    if (!e.finishing) e.finishing = this.doFinish(e, serviceId, code, signal)
    return e.finishing
  }

  private async doFinish(e: Entry, serviceId: string, code: number | null, signal: NodeJS.Signals | null): Promise<ProcessExit> {
    await e.tail?.stop()
    e.tail = null
    if (e.watcher) clearInterval(e.watcher)
    e.watcher = null
    const pgid = e.handle?.pgid
    // O shell pode morrer e deixar filhos no grupo: limpa o grupo inteiro.
    if (pgid && isAlive(-pgid)) await terminate(-pgid, 2000).catch(() => undefined)
    e.handle = null
    e.child = null
    const exit: ProcessExit = { serviceId, code, signal: e.stopping && !signal ? 'SIGTERM' : signal }
    this.logger.info('process.exited', { serviceId, code, signal })
    for (const l of this.exitListeners) l(exit)
    return exit
  }

  waitForExit(serviceId: string): Promise<ProcessExit> {
    const exit = this.entries.get(serviceId)?.exit
    if (!exit) return Promise.resolve({ serviceId, code: null, signal: null })
    return exit
  }

  async stop(serviceId: string, timeoutMs: number): Promise<void> {
    const e = this.entries.get(serviceId)
    if (!e?.handle) return
    e.stopping = true
    await terminate(-e.handle.pgid, timeoutMs)
    if (!e.child && e.handle) await this.finish(serviceId, null, 'SIGTERM')
    else await e.exit
  }

  /** Processos de uma sessão anterior: sem ChildProcess, então vigia por polling do pgid. */
  async adopt(handles: ProcessHandle[]): Promise<ProcessHandle[]> {
    const adopted: ProcessHandle[] = []
    for (const h of handles) {
      if (!isAlive(-h.pgid)) continue
      const e = this.entry(h.serviceId)
      e.handle = h
      e.stopping = false
      e.finishing = null
      const size = await stat(h.logFile).then((s) => s.size, () => 0)
      e.tail = new FileTail(h.logFile, (data) => this.appendLog(h.serviceId, data))
      await e.tail.start(Math.max(0, size - 64 * 1024)).catch(() => (e.tail = null))
      e.exit = new Promise((resolve) => {
        e.watcher = setInterval(() => {
          if (!isAlive(-h.pgid)) void this.finish(h.serviceId, null, null).then(resolve)
        }, 1000)
      })
      adopted.push(h)
    }
    return adopted
  }

  async stopAllManaged(timeoutMs: number): Promise<void> {
    await Promise.all(this.handles().map((h) => this.stop(h.serviceId, timeoutMs)))
  }
}
