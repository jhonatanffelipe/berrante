import type { PortBinding } from '@shared/types'
import type { CommandRunner, PortScannerGateway, ProcessInfo } from '@main/domain/ports'
import { parseLsofCwd, parseLsofListen, parsePs } from './lsofParser'

/** macOS/Linux: `lsof -iTCP -sTCP:LISTEN -n -P` + `ps` (no Linux, `ss -ltnp` pode substituir). */
export class LsofPortScanner implements PortScannerGateway {
  constructor(private readonly runner: CommandRunner) {}

  async processTable(): Promise<Map<number, ProcessInfo>> {
    const { stdout } = await this.runner.run('ps', ['-axo', 'pid=,ppid=,pgid=,user=,command='], { timeoutMs: 8000 })
    return parsePs(stdout)
  }

  async listListening(): Promise<Omit<PortBinding, 'owner'>[]> {
    // lsof devolve 1 quando algum filtro não casa; a saída continua válida.
    const { stdout } = await this.runner.run('lsof', ['-iTCP', '-sTCP:LISTEN', '-n', '-P'], { timeoutMs: 10_000 })
    const rows = parseLsofListen(stdout)
    if (!rows.length) return []

    const pids = [...new Set(rows.map((r) => r.pid))]
    const [table, cwdOut] = await Promise.all([
      this.processTable(),
      this.runner.run('lsof', ['-a', '-d', 'cwd', '-p', pids.join(','), '-Fpn'], { timeoutMs: 10_000 })
    ])
    const cwds = parseLsofCwd(cwdOut.stdout)
    return rows.map((r) => ({ ...r, fullCommand: table.get(r.pid)?.command ?? null, cwd: cwds.get(r.pid) ?? null }))
  }
}
