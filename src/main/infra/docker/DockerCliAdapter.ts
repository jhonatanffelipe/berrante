import { spawn } from 'node:child_process'
import type { ContainerAction, ContainerState, DockerContainer } from '@shared/types'
import type { CommandRunner, DockerGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { ShellEnv } from '../platform/ShellEnv'

interface PsRow {
  Service?: string
  Name?: string
  State?: string
  Health?: string
  Publishers?: { URL?: string; PublishedPort?: number; TargetPort?: number }[] | null
}

/** `docker compose ps --format json` devolve array (versões antigas) ou NDJSON (atuais). */
export function parseComposePs(output: string): Map<string, ContainerState> {
  const text = output.trim()
  if (!text) return new Map()
  let rows: PsRow[]
  try {
    const parsed = JSON.parse(text) as PsRow | PsRow[]
    rows = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    rows = text
      .split('\n')
      .filter((l) => l.trim().startsWith('{'))
      .map((l) => JSON.parse(l) as PsRow)
  }
  const map = new Map<string, ContainerState>()
  for (const r of rows) {
    if (!r.Service) continue
    const ports = (r.Publishers ?? [])
      .filter((p) => p.PublishedPort)
      .map((p) => `${p.PublishedPort}:${p.TargetPort}`)
    map.set(r.Service, { name: r.Name ?? r.Service, state: (r.State ?? 'unknown').toLowerCase(), health: r.Health ? r.Health.toLowerCase() : null, ports: [...new Set(ports)] })
  }
  return map
}

interface DockerPsRow {
  ID?: string
  Names?: string
  Image?: string
  State?: string
  Status?: string
  Ports?: string
  Labels?: string
}

/** `--format '{{json .}}'` devolve Labels como "k=v,k=v"; valores com vírgula (config_files) continuam no anterior. */
export function parseLabels(raw: string | undefined): Record<string, string> {
  const labels: Record<string, string> = {}
  let last: string | null = null
  for (const part of (raw ?? '').split(',')) {
    const eq = part.indexOf('=')
    const key = eq > 0 ? part.slice(0, eq) : ''
    if (key && /^[\w.-]+$/.test(key)) {
      last = key
      labels[key] = part.slice(eq + 1)
    } else if (last) {
      labels[last] += `,${part}`
    }
  }
  return labels
}

/** "0.0.0.0:5432->5432/tcp, :::5432->5432/tcp" → ["5432:5432"]. Portas só expostas ficam de fora. */
export function parsePsPorts(raw: string | undefined): string[] {
  const ports = new Set<string>()
  for (const m of (raw ?? '').matchAll(/:(\d+(?:-\d+)?)->(\d+(?:-\d+)?)\/(tcp|udp)/g)) ports.add(m[3] === 'udp' ? `${m[1]}:${m[2]}/udp` : `${m[1]}:${m[2]}`)
  return [...ports]
}

/** NDJSON de `docker ps -a --format '{{json .}}'`. */
export function parseDockerPs(output: string): Omit<DockerContainer, 'owners'>[] {
  const result: Omit<DockerContainer, 'owners'>[] = []
  for (const line of output.split('\n')) {
    if (!line.trim().startsWith('{')) continue
    let row: DockerPsRow
    try {
      row = JSON.parse(line) as DockerPsRow
    } catch {
      continue
    }
    if (!row.ID) continue
    const labels = parseLabels(row.Labels)
    const status = row.Status ?? ''
    // Docker antigo não tem State no json: deduz do Status.
    const state = (row.State || (/^Up\b/.test(status) ? (/\(Paused\)/.test(status) ? 'paused' : 'running') : /^Exited\b/.test(status) ? 'exited' : /^Created\b/.test(status) ? 'created' : /^Restarting\b/.test(status) ? 'restarting' : 'unknown')).toLowerCase()
    result.push({
      id: row.ID,
      name: (row.Names ?? row.ID).split(',')[0]!,
      image: row.Image ?? '',
      state,
      status,
      ports: parsePsPorts(row.Ports),
      composeProject: labels['com.docker.compose.project'] ?? null,
      composeService: labels['com.docker.compose.service'] ?? null,
      workingDir: labels['com.docker.compose.project.working_dir'] ?? null
    })
  }
  return result
}

export class DockerCliAdapter implements DockerGateway {
  constructor(
    private readonly runner: CommandRunner,
    private readonly shellEnv: ShellEnv
  ) {}

  private async compose(cwd: string, file: string, args: string[], timeoutMs = 120_000) {
    return this.runner.run('docker', ['compose', '-f', file, ...args], { cwd, timeoutMs })
  }

  async available(): Promise<boolean> {
    const { code } = await this.runner.run('docker', ['info', '--format', '{{.ServerVersion}}'], { timeoutMs: 8000 })
    return code === 0
  }

  async composeUp(cwd: string, file: string, services: string[], onOutput: (data: string) => void): Promise<void> {
    const env = await this.shellEnv.resolve()
    await new Promise<void>((resolve, reject) => {
      const child = spawn('docker', ['compose', '-f', file, 'up', '-d', ...services], { cwd, env })
      child.stdout.on('data', (d: Buffer) => onOutput(d.toString('utf8')))
      child.stderr.on('data', (d: Buffer) => onOutput(d.toString('utf8')))
      child.once('error', (err) => reject(new AppError('DOCKER', `docker indisponível: ${err.message}`)))
      child.once('exit', (code) => (code === 0 ? resolve() : reject(new AppError('DOCKER', `docker compose up saiu com código ${code}`))))
    })
  }

  async composeStop(cwd: string, file: string, services: string[]): Promise<void> {
    const { code, stderr } = await this.compose(cwd, file, ['stop', ...services])
    if (code !== 0) throw new AppError('DOCKER', 'docker compose stop falhou', { output: stderr })
  }

  async composeRestart(cwd: string, file: string, services: string[]): Promise<void> {
    const { code, stderr } = await this.compose(cwd, file, ['restart', ...services])
    if (code !== 0) throw new AppError('DOCKER', 'docker compose restart falhou', { output: stderr })
  }

  async composePs(cwd: string, file: string): Promise<Map<string, ContainerState>> {
    const { stdout, code } = await this.compose(cwd, file, ['ps', '-a', '--format', 'json'], 15_000)
    return code === 0 ? parseComposePs(stdout) : new Map()
  }

  followLogs(cwd: string, file: string, service: string, onData: (data: string) => void): () => void {
    let stopped = false
    let child: ReturnType<typeof spawn> | null = null
    void this.shellEnv.resolve().then((env) => {
      if (stopped) return
      child = spawn('docker', ['compose', '-f', file, 'logs', '-f', '--no-log-prefix', '--tail', '200', service], { cwd, env: { ...env, FORCE_COLOR: '1' } })
      child.stdout?.on('data', (d: Buffer) => onData(d.toString('utf8')))
      child.stderr?.on('data', (d: Buffer) => onData(d.toString('utf8')))
      child.on('error', () => undefined)
    })
    return () => {
      stopped = true
      child?.kill('SIGTERM')
    }
  }

  async networkExists(name: string): Promise<boolean> {
    const { code } = await this.runner.run('docker', ['network', 'inspect', name], { timeoutMs: 8000 })
    return code === 0
  }

  async listContainers(): Promise<{ ok: true; containers: Omit<DockerContainer, 'owners'>[] } | { ok: false; error: string }> {
    const { stdout, stderr, code } = await this.runner.run('docker', ['ps', '-a', '--no-trunc', '--format', '{{json .}}'], { timeoutMs: 15_000 })
    if (code !== 0) return { ok: false, error: stderr.trim().split('\n').pop() || 'docker não respondeu' }
    return { ok: true, containers: parseDockerPs(stdout) }
  }

  async containerAction(id: string, action: ContainerAction): Promise<void> {
    const { code, stderr } = await this.runner.run('docker', [action, id], { timeoutMs: 120_000 })
    if (code !== 0) throw new AppError('DOCKER', `docker ${action} falhou`, { output: stderr })
  }

  async stackServices(cwd: string, globalArgs: string[]): Promise<string[]> {
    const { stdout, stderr, code } = await this.runner.run('docker', ['compose', ...globalArgs, 'config', '--services'], { cwd, timeoutMs: 20_000 })
    if (code !== 0) throw new AppError('DOCKER', 'docker compose config falhou', { output: stderr })
    return stdout.split('\n').map((l) => l.trim()).filter(Boolean)
  }

  async stackPs(cwd: string, globalArgs: string[]): Promise<Map<string, ContainerState>> {
    const { stdout, code } = await this.runner.run('docker', ['compose', ...globalArgs, 'ps', '-a', '--format', 'json'], { cwd, timeoutMs: 15_000 })
    return code === 0 ? parseComposePs(stdout) : new Map()
  }

  async stackAction(cwd: string, globalArgs: string[], action: 'up' | 'stop' | 'restart', services: string[]): Promise<void> {
    const args = action === 'up' ? ['up', '-d', ...services] : [action, ...services]
    // `up` pode baixar imagem e construir: dá mais tempo.
    const { code, stderr } = await this.runner.run('docker', ['compose', ...globalArgs, ...args], { cwd, timeoutMs: action === 'up' ? 600_000 : 120_000 })
    if (code !== 0) throw new AppError('DOCKER', `docker compose ${action} falhou`, { output: stderr })
  }
}
