import type { PortConflict, Project, ProjectRuntime, RunningProcess, ServiceDefinition, StartResult } from '@shared/types'
import { actionServiceId, runtimeKey } from '@shared/runtime'
import type { ProjectRepository, RuntimeStateRepository, SettingsRepository } from '@main/domain/repositories'
import type { DockerGateway, Logger, PortScannerGateway, ProcessExit, ProcessManagerGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { RunningProcessEntity } from '@main/domain/entities/RunningProcess'
import { playableServices } from '@main/domain/entities/ServiceDefinition'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const TAG = (text: string, color = 35) => `\r\n\x1b[${color}m▌ berrante\x1b[0m ${text}\r\n`

const POLL_MS = 2000
const READY_TIMEOUT_MS = 120_000
const SCRIPT_SETTLE_MS = 2500

/** Portas candidatas por serviço (compose publicado, env PORT, portas vistas antes). */
export type PortHints = (project: Project) => Promise<Map<string, number[]>>

/**
 * Orquestra a subida/parada das tropas. Mantém o estado vivo dos serviços,
 * emite mudanças para o renderer e persiste os PIDs para re-adoção.
 */
export class RuntimeService {
  private states = new Map<string, RunningProcess>()
  private followers = new Map<string, () => void>()
  private listeners: ((runtime: ProjectRuntime) => void)[] = []
  private seenPorts = new Map<string, number[]>()
  private projectCache = new Map<string, Project>()
  private timer: NodeJS.Timeout | null = null
  private polling = false
  private playing = new Set<string>()

  constructor(
    private readonly projects: ProjectRepository,
    private readonly pm: ProcessManagerGateway,
    private readonly docker: DockerGateway,
    private readonly scanner: PortScannerGateway,
    private readonly settings: SettingsRepository,
    private readonly runtimeState: RuntimeStateRepository,
    private readonly portHints: PortHints,
    private readonly logger: Logger
  ) {}

  // ------------------------------------------------------------------ ciclo de vida

  async init(): Promise<void> {
    this.pm.onExit((exit) => void this.onProcessExit(exit))
    const persisted = await this.runtimeState.load()
    const adopted = await this.pm.adopt(
      persisted.map((p) => ({ serviceId: runtimeKey(p.projectId, p.serviceId), projectId: p.projectId, pid: p.pid, pgid: p.pgid, startedAt: p.startedAt, logFile: p.logFile }))
    )
    for (const h of adopted) {
      const serviceId = h.serviceId.split('::')[1] ?? h.serviceId
      this.set(h.projectId, serviceId, { status: 'running', pid: h.pid, pgid: h.pgid, startedAt: h.startedAt })
      this.pm.appendLog(h.serviceId, TAG('processo re-adotado de uma sessão anterior'))
    }
    if (adopted.length) this.logger.info('runtime.adopted', { count: adopted.length })
    await this.persist()
    for (const project of await this.projects.list()) await this.refreshCompose(project).catch(() => undefined)
    this.timer = setInterval(() => void this.poll(), POLL_MS)
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer)
    for (const stop of this.followers.values()) stop()
    this.followers.clear()
  }

  onStatus(listener: (runtime: ProjectRuntime) => void): void {
    this.listeners.push(listener)
  }

  // ------------------------------------------------------------------ consultas

  private key(projectId: string, serviceId: string): string {
    return runtimeKey(projectId, serviceId)
  }

  private get(projectId: string, serviceId: string): RunningProcess {
    return this.states.get(this.key(projectId, serviceId)) ?? RunningProcessEntity.idle(projectId, serviceId)
  }

  private set(projectId: string, serviceId: string, patch: Partial<RunningProcess>): void {
    const next = { ...this.get(projectId, serviceId), ...patch }
    this.states.set(this.key(projectId, serviceId), next)
  }

  snapshot(project: Project): ProjectRuntime {
    this.projectCache.set(project.id, project)
    const planIds = (project.plan?.services ?? []).map((s) => s.id)
    const actionIds = [...this.states.values()].filter((s) => s.projectId === project.id && s.serviceId.startsWith('action:')).map((s) => s.serviceId)
    const services = [...planIds, ...actionIds].map((id) => this.get(project.id, id))
    // Preparos (rede, install) terminam e não contam: "boiada completa" = todo serviço longo de pé.
    const enabled = (project.plan?.services ?? []).filter((s) => s.enabled && s.kind !== 'setup')
    const allRunning = enabled.length > 0 && enabled.every((s) => this.get(project.id, s.id).status === 'running')
    return { projectId: project.id, services, allRunning }
  }

  hasActive(projectId: string): boolean {
    return [...this.states.values()].some((s) => s.projectId === projectId && RunningProcessEntity.isActive(s.status))
  }

  anyActive(): boolean {
    return [...this.states.values()].some((s) => RunningProcessEntity.isActive(s.status))
  }

  managedProcesses(): { projectId: string; serviceId: string; pid: number; pgid: number }[] {
    return [...this.states.values()]
      .filter((s) => s.pgid !== null && s.pid !== null && RunningProcessEntity.isActive(s.status))
      .map((s) => ({ projectId: s.projectId, serviceId: s.serviceId, pid: s.pid!, pgid: s.pgid! }))
  }

  private emit(projectId: string): void {
    const project = this.projectCache.get(projectId)
    if (!project) return
    const snap = this.snapshot(project)
    for (const l of this.listeners) l(snap)
  }

  // ------------------------------------------------------------------ conflitos de porta

  async conflicts(project: Project): Promise<PortConflict[]> {
    if (!project.plan) return []
    const hints = await this.portHints(project)
    const listening = await this.scanner.listListening()
    const table = await this.scanner.processTable()
    const ownPgids = new Set(this.managedProcesses().map((m) => m.pgid))
    const result: PortConflict[] = []
    for (const svc of project.plan.services.filter((s) => s.enabled)) {
      if (RunningProcessEntity.isActive(this.get(project.id, svc.id).status)) continue
      const ports = new Set([...(hints.get(svc.id) ?? []), ...(this.seenPorts.get(this.key(project.id, svc.id)) ?? [])])
      for (const port of ports) {
        const holder = listening.find((l) => l.port === port)
        if (!holder) continue
        const pgid = table.get(holder.pid)?.pgid
        if (pgid !== undefined && ownPgids.has(pgid)) continue
        result.push({ port, serviceId: svc.id, serviceName: svc.name, pid: holder.pid, command: holder.fullCommand ?? holder.command })
      }
    }
    return result
  }

  // ------------------------------------------------------------------ play / stop

  async startAll(project: Project, ignoreConflicts = false): Promise<StartResult> {
    if (!project.plan) throw new AppError('VALIDATION', 'Detecte e salve o plano de subida antes de tocar o berrante')
    if (this.playing.has(project.id)) throw new AppError('CONFLICT', 'O berrante já está tocando para essa tropa')
    const conflicts = ignoreConflicts ? [] : await this.conflicts(project)
    if (conflicts.length) return { started: [], skipped: [], conflicts }

    this.projectCache.set(project.id, project)
    this.playing.add(project.id)
    const started: string[] = []
    const skipped: string[] = []
    const failed = new Set<string>()
    const started0 = Date.now()
    try {
      for (const svc of playableServices(project.plan)) {
        const blocked = svc.dependsOn.find((d) => failed.has(d))
        if (blocked) {
          skipped.push(svc.id)
          failed.add(svc.id)
          this.pm.appendLog(this.key(project.id, svc.id), TAG(`pulado: dependência "${blocked}" falhou`, 31))
          continue
        }
        // Já de pé: não sobe de novo. Setups (rede, install) são idempotentes e sempre rodam.
        if (svc.kind !== 'setup' && RunningProcessEntity.isActive(this.get(project.id, svc.id).status)) continue
        try {
          await this.startOne(project, svc)
          const ok = await this.waitReady(project, svc)
          if (!ok) failed.add(svc.id)
          else started.push(svc.id)
        } catch (err) {
          failed.add(svc.id)
          this.set(project.id, svc.id, { status: 'crashed' })
          this.pm.appendLog(this.key(project.id, svc.id), TAG(`erro: ${(err as Error).message}`, 31))
          this.emit(project.id)
        }
      }
    } finally {
      this.playing.delete(project.id)
    }
    this.logger.info('runtime.play', { projectId: project.id, started: started.length, failed: failed.size, durationMs: Date.now() - started0 })
    return { started, skipped, conflicts: [] }
  }

  async startService(project: Project, svc: ServiceDefinition): Promise<void> {
    this.projectCache.set(project.id, project)
    await this.startOne(project, svc)
  }

  private async startOne(project: Project, svc: ServiceDefinition): Promise<void> {
    const key = this.key(project.id, svc.id)
    this.set(project.id, svc.id, { status: 'starting', exitCode: null, startedAt: new Date().toISOString(), ports: [] })
    this.emit(project.id)

    if (svc.kind === 'compose') {
      if (!svc.composeFile) throw AppError.validation(`Serviço compose "${svc.name}" sem arquivo`)
      this.pm.appendLog(key, TAG(`docker compose up -d ${svc.command}`))
      await this.docker.composeUp(svc.cwd, svc.composeFile, [svc.command], (d) => this.pm.appendLog(key, d))
      this.follow(project.id, svc)
      await this.refreshCompose(project)
      return
    }

    this.pm.appendLog(key, TAG(`$ ${svc.command}  (cwd ${svc.cwd})`))
    const handle = await this.pm.spawn({ serviceId: key, projectId: project.id, command: svc.command, cwd: svc.cwd, env: svc.env })
    this.set(project.id, svc.id, { pid: handle.pid, pgid: handle.pgid, startedAt: handle.startedAt })
    await this.persist()
    this.emit(project.id)
  }

  /** Espera o serviço ficar pronto: setup termina com 0; compose fica running/healthy; script sobrevive alguns segundos. */
  private async waitReady(project: Project, svc: ServiceDefinition): Promise<boolean> {
    const key = this.key(project.id, svc.id)
    if (svc.kind === 'setup') {
      const exit = await this.pm.waitForExit(key)
      return exit.code === 0
    }
    if (svc.kind === 'compose') {
      const deadline = Date.now() + READY_TIMEOUT_MS
      while (Date.now() < deadline) {
        const st = this.get(project.id, svc.id)
        if (st.status === 'running') return true
        if (st.status === 'crashed' || st.status === 'stopped') return false
        await sleep(1500)
        await this.refreshCompose(project)
      }
      this.pm.appendLog(key, TAG('timeout esperando o container ficar saudável; seguindo', 33))
      return true
    }
    await sleep(SCRIPT_SETTLE_MS)
    const alive = this.pm.isAlive(key)
    if (alive && this.get(project.id, svc.id).status === 'starting') {
      this.set(project.id, svc.id, { status: 'running' })
      this.emit(project.id)
    }
    return alive
  }

  async stopService(project: Project, svc: ServiceDefinition | { id: string; kind: 'command' }): Promise<void> {
    const timeout = (await this.settings.get()).stopTimeoutMs
    if ('composeFile' in svc && svc.kind === 'compose' && svc.composeFile) {
      this.followers.get(this.key(project.id, svc.id))?.()
      this.followers.delete(this.key(project.id, svc.id))
      await this.docker.composeStop(svc.cwd, svc.composeFile, [svc.command])
      this.set(project.id, svc.id, { status: 'stopped' })
      this.emit(project.id)
      return
    }
    this.set(project.id, svc.id, { status: this.get(project.id, svc.id).status === 'idle' ? 'idle' : 'stopped' })
    await this.pm.stop(this.key(project.id, svc.id), timeout)
    this.emit(project.id)
  }

  async restartService(project: Project, svc: ServiceDefinition): Promise<void> {
    if (svc.kind === 'compose' && svc.composeFile) {
      this.set(project.id, svc.id, { status: 'starting' })
      this.emit(project.id)
      await this.docker.composeRestart(svc.cwd, svc.composeFile, [svc.command])
      if (!this.followers.has(this.key(project.id, svc.id))) this.follow(project.id, svc)
      await this.refreshCompose(project)
      return
    }
    await this.stopService(project, svc)
    await this.startOne(project, svc)
    void this.waitReady(project, svc)
  }

  /** Recolher a boiada: processos (ordem reversa) e depois containers, agrupados por compose. */
  async stopAll(project: Project): Promise<void> {
    this.projectCache.set(project.id, project)
    const timeout = (await this.settings.get()).stopTimeoutMs
    const procs = [...this.states.values()].filter((s) => s.projectId === project.id && s.pgid !== null && RunningProcessEntity.isActive(s.status))
    await Promise.all(
      procs.map(async (s) => {
        this.set(project.id, s.serviceId, { status: 'stopped' })
        await this.pm.stop(this.key(project.id, s.serviceId), timeout)
      })
    )

    const compose = (project.plan?.services ?? []).filter((s) => s.kind === 'compose' && s.composeFile)
    const groups = new Map<string, ServiceDefinition[]>()
    for (const s of compose) {
      const st = this.get(project.id, s.id).status
      if (!s.enabled && !RunningProcessEntity.isActive(st)) continue
      const k = `${s.cwd}\0${s.composeFile}`
      groups.set(k, [...(groups.get(k) ?? []), s])
    }
    for (const list of groups.values()) {
      const first = list[0]!
      for (const s of list) {
        this.followers.get(this.key(project.id, s.id))?.()
        this.followers.delete(this.key(project.id, s.id))
      }
      try {
        await this.docker.composeStop(first.cwd, first.composeFile!, list.map((s) => s.command))
        for (const s of list) this.set(project.id, s.id, { status: 'stopped' })
      } catch (err) {
        this.logger.warn('runtime.compose.stop.failed', { projectId: project.id, error: (err as Error).message })
      }
    }
    await this.persist()
    this.emit(project.id)
    this.logger.info('runtime.stopAll', { projectId: project.id, processes: procs.length, composeGroups: groups.size })
  }

  async stopEverything(): Promise<void> {
    for (const project of await this.projects.list()) {
      if (this.hasActive(project.id)) await this.stopAll(project).catch(() => undefined)
    }
    await this.pm.stopAllManaged(2000)
  }

  async runAction(project: Project, repoId: string, name: string): Promise<string> {
    const action = project.plan?.actions.find((a) => a.repoId === repoId && a.name === name)
    if (!action) throw AppError.notFound('Ação')
    const svc = project.plan!.services.find((s) => s.repoId === repoId)
    const cwd = svc?.cwd
    if (!cwd) throw AppError.validation('Repositório sem cwd conhecido no plano')
    const id = actionServiceId(repoId, name)
    const def: ServiceDefinition = { id, repoId, name, kind: 'command', command: action.command, composeFile: null, cwd: cwd, env: {}, enabled: false, order: 0, dependsOn: [], color: 'orange', origin: 'detected' }
    this.projectCache.set(project.id, project)
    this.pm.clearLogs(this.key(project.id, id))
    await this.startOne(project, def)
    this.set(project.id, id, { status: 'running' })
    this.emit(project.id)
    return id
  }

  // ------------------------------------------------------------------ eventos e polling

  private async onProcessExit(exit: ProcessExit): Promise<void> {
    const [projectId, serviceId] = exit.serviceId.split('::') as [string, string]
    const current = this.get(projectId, serviceId)
    const stopRequested = current.status === 'stopped'
    const status = RunningProcessEntity.statusOnExit(exit.code, exit.signal, stopRequested)
    this.set(projectId, serviceId, { status, exitCode: exit.code, pid: null, pgid: null, ports: [] })
    const color = status === 'crashed' ? 31 : 90
    this.pm.appendLog(exit.serviceId, TAG(`processo terminou (${exit.code ?? exit.signal ?? '?'}) → ${status}`, color))
    await this.persist()
    this.emit(projectId)
  }

  private follow(projectId: string, svc: ServiceDefinition): void {
    const key = this.key(projectId, svc.id)
    this.followers.get(key)?.()
    this.followers.set(key, this.docker.followLogs(svc.cwd, svc.composeFile!, svc.command, (d) => this.pm.appendLog(key, d)))
  }

  private async refreshCompose(project: Project): Promise<void> {
    this.projectCache.set(project.id, project)
    const compose = (project.plan?.services ?? []).filter((s) => s.kind === 'compose' && s.composeFile)
    const files = new Map<string, ServiceDefinition[]>()
    for (const s of compose) {
      const k = `${s.cwd}\0${s.composeFile}`
      files.set(k, [...(files.get(k) ?? []), s])
    }
    let changed = false
    for (const list of files.values()) {
      const first = list[0]!
      const ps = await this.docker.composePs(first.cwd, first.composeFile!)
      for (const s of list) {
        const c = ps.get(s.command)
        const prev = this.get(project.id, s.id)
        let status = prev.status
        if (c) {
          if (c.state === 'running') status = c.health === 'starting' ? 'starting' : c.health === 'unhealthy' ? 'crashed' : 'running'
          else if (c.state === 'restarting') status = 'starting'
          else if (c.state === 'exited' || c.state === 'dead') status = prev.status === 'starting' ? 'crashed' : 'stopped'
          else if (c.state === 'created') status = 'starting'
        } else if (prev.status === 'running') {
          status = 'stopped'
        }
        const ports = c ? c.ports.map((p) => Number(p.split(':')[0])).filter(Number.isFinite) : []
        if (status !== prev.status || JSON.stringify(c ?? null) !== JSON.stringify(prev.container) || JSON.stringify(ports) !== JSON.stringify(prev.ports)) {
          changed = true
          this.set(project.id, s.id, { status, container: c ?? null, ports })
          if (status === 'running' && !this.followers.has(this.key(project.id, s.id))) this.follow(project.id, s)
        }
      }
    }
    if (changed) this.emit(project.id)
  }

  /** Atualiza containers e portas dos processos ativos (um lsof por ciclo). */
  private async poll(): Promise<void> {
    if (this.polling) return
    this.polling = true
    try {
      const activeProjects = new Set([...this.states.values()].filter((s) => RunningProcessEntity.isActive(s.status)).map((s) => s.projectId))
      for (const projectId of activeProjects) {
        const project = this.projectCache.get(projectId) ?? (await this.projects.findById(projectId))
        if (project) await this.refreshCompose(project).catch(() => undefined)
      }
      const managed = this.managedProcesses()
      if (!managed.length) return
      const [listening, table] = await Promise.all([this.scanner.listListening(), this.scanner.processTable()])
      const portsByPgid = new Map<number, number[]>()
      for (const l of listening) {
        const pgid = table.get(l.pid)?.pgid
        if (pgid === undefined) continue
        portsByPgid.set(pgid, [...new Set([...(portsByPgid.get(pgid) ?? []), l.port])].sort((a, b) => a - b))
      }
      const touched = new Set<string>()
      for (const m of managed) {
        const ports = portsByPgid.get(m.pgid) ?? []
        const prev = this.get(m.projectId, m.serviceId)
        const status = ports.length && prev.status === 'starting' ? 'running' : prev.status
        if (JSON.stringify(ports) !== JSON.stringify(prev.ports) || status !== prev.status) {
          this.set(m.projectId, m.serviceId, { ports, status })
          if (ports.length) this.seenPorts.set(this.key(m.projectId, m.serviceId), ports)
          touched.add(m.projectId)
        }
      }
      for (const p of touched) this.emit(p)
    } catch (err) {
      this.logger.debug('runtime.poll.failed', { error: (err as Error).message })
    } finally {
      this.polling = false
    }
  }

  async refresh(project: Project): Promise<ProjectRuntime> {
    await this.refreshCompose(project).catch(() => undefined)
    return this.snapshot(project)
  }

  private async persist(): Promise<void> {
    const entries = this.pm.handles().map((h) => {
      const [projectId, serviceId] = h.serviceId.split('::') as [string, string]
      return { projectId, serviceId, pid: h.pid, pgid: h.pgid, logFile: h.logFile, startedAt: h.startedAt }
    })
    await this.runtimeState.save(entries).catch((err) => this.logger.warn('runtime.persist.failed', { error: (err as Error).message }))
  }

  /** Fechar o app mantendo a boiada: só para de seguir logs de containers. */
  detach(): void {
    this.dispose()
  }
}
