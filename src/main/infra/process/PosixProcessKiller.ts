import { execFile } from 'node:child_process'
import type { ProcessKiller } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { isWindows, system32 } from '../platform/platform'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function isAlive(target: number): boolean {
  try {
    process.kill(target, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/** SIGTERM → espera → SIGKILL. `target` negativo = process group. */
export async function terminate(target: number, timeoutMs: number): Promise<void> {
  try {
    process.kill(target, 'SIGTERM')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ESRCH') return
    if (code === 'EPERM') throw new AppError('PROCESS', 'Sem permissão para encerrar esse processo')
    throw err
  }
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isAlive(target)) return
    await sleep(100)
  }
  try {
    process.kill(target, 'SIGKILL')
  } catch {
    /* já morreu */
  }
}

/** `taskkill /T /F`: a árvore inteira a partir do PID (o Windows não tem process group como o POSIX). */
function taskkillTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    execFile(system32('taskkill.exe'), ['/PID', String(pid), '/T', '/F'], { windowsHide: true, timeout: 15_000 }, () => resolve())
  })
}

/**
 * O grupo do serviço está vivo?
 * - POSIX: o spawn com `detached` cria um process group (pgid = pid do shell).
 * - Windows: não há process group; o grupo é a árvore que nasce no shell (pgid = pid do shell).
 */
export function isGroupAlive(pgid: number): boolean {
  return isWindows ? isAlive(pgid) : isAlive(-pgid)
}

/**
 * Encerra o grupo do serviço.
 * - POSIX: SIGTERM no grupo, SIGKILL depois do timeout.
 * - Windows: processos de console não têm um "SIGTERM" de fora; a árvore é encerrada com `taskkill /T /F`.
 */
export async function terminateGroup(pgid: number, timeoutMs: number): Promise<void> {
  if (!isWindows) return terminate(-pgid, timeoutMs)
  if (!isAlive(pgid)) return
  await taskkillTree(pgid)
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isAlive(pgid)) return
    await sleep(100)
  }
  try {
    process.kill(pgid)
  } catch {
    /* já morreu */
  }
}

export class PosixProcessKiller implements ProcessKiller {
  isAlive(pid: number): boolean {
    return isAlive(pid)
  }
  kill(pid: number, timeoutMs: number): Promise<void> {
    if (pid <= 1 || pid === process.pid) throw new AppError('PROCESS', 'Esse processo não pode ser encerrado')
    // No Windows, PID 4 é o "System": nem tenta.
    if (isWindows && pid === 4) throw new AppError('PROCESS', 'Esse processo não pode ser encerrado')
    return terminate(pid, timeoutMs)
  }
}
