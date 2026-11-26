import type { ContainerState } from '@shared/types'
import type { CommandRunner, DockerGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

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

export class DockerCliAdapter implements DockerGateway {
  constructor(private readonly runner: CommandRunner) {}

  private async compose(cwd: string, file: string, args: string[], timeoutMs = 120_000) {
    return this.runner.run('docker', ['compose', '-f', file, ...args], { cwd, timeoutMs })
  }

  async available(): Promise<boolean> {
    const { code } = await this.runner.run('docker', ['info', '--format', '{{.ServerVersion}}'], { timeoutMs: 8000 })
    return code === 0
  }

  async composeUp(cwd: string, file: string, services: string[], onOutput: (data: string) => void): Promise<void> {
    const code = await this.runner.stream('docker', ['compose', '-f', file, 'up', '-d', ...services], { cwd }, onOutput).done
    if (code === null) throw new AppError('DOCKER', 'docker indisponível')
    if (code !== 0) throw new AppError('DOCKER', `docker compose up saiu com código ${code}`)
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
    const running = this.runner.stream(
      'docker',
      ['compose', '-f', file, 'logs', '-f', '--no-log-prefix', '--tail', '200', service],
      { cwd, env: { FORCE_COLOR: '1' } },
      onData
    )
    return () => running.kill()
  }

  async networkExists(name: string): Promise<boolean> {
    const { code } = await this.runner.run('docker', ['network', 'inspect', name], { timeoutMs: 8000 })
    return code === 0
  }
}
