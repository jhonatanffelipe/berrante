import type { PortBinding } from '@shared/types'
import type { CommandRunner, PortScannerGateway, ProcessInfo } from '@main/domain/ports'
import { system32 } from '../platform/platform'
import { buildProcessTable, parseNetstatListen, parseWindowsProcesses, shortName, type WindowsProcess } from './netstatParser'

const POWERSHELL = () => system32('WindowsPowerShell\\v1.0\\powershell.exe')
const PS_ARGS = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command']

const PROCESSES_SCRIPT = [
  '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
  'Get-CimInstance Win32_Process | ForEach-Object {',
  '  $c = if ($_.CreationDate) { $_.CreationDate.ToFileTimeUtc() } else { 0 }',
  '  $cmd = if ($_.CommandLine) { $_.CommandLine -replace "[\\r\\n\\t]", " " } else { "" }',
  '  "$($_.ProcessId)`t$($_.ParentProcessId)`t$c`t$($_.Name)`t$cmd"',
  '}'
].join('\n')

const ownersScript = (pids: number[]) =>
  [
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
    `Get-CimInstance Win32_Process -Filter "${pids.map((p) => `ProcessId=${p}`).join(' OR ')}" | ForEach-Object {`,
    '  $o = Invoke-CimMethod -InputObject $_ -MethodName GetOwner',
    '  "$($_.ProcessId)`t$($_.Name)`t$($o.User)"',
    '}'
  ].join('\n')

/**
 * Ler a tabela de processos custa ~1 s de PowerShell. Ela é reaproveitada por alguns segundos e renovada antes disso
 * quando aparece em LISTEN um PID que ela ainda não conhece.
 */
const TABLE_TTL_MS = 5000

const ownerKey = (p: { pid: number; name: string }) => `${p.pid}:${p.name}`

/**
 * Windows: `netstat -ano` (portas em LISTEN e PID) + `Get-CimInstance Win32_Process` (PPID e linha de comando).
 * O Windows não informa a pasta de trabalho de outro processo: `cwd` fica vazio.
 */
export class WindowsPortScanner implements PortScannerGateway {
  private cached: { at: number; processes: Promise<WindowsProcess[]> } | null = null
  /** Dono (usuário) por PID; a chave inclui o nome para não herdar o dono de um PID reaproveitado. */
  private owners = new Map<string, string>()
  private ownersLoading: Promise<void> | null = null

  constructor(
    private readonly runner: CommandRunner,
    /** PIDs dos shells dos serviços do Berrante: viram o "grupo" dos processos abaixo deles. */
    private readonly groupRoots: () => Iterable<number>
  ) {}

  private processes(force = false): Promise<WindowsProcess[]> {
    if (!force && this.cached && Date.now() - this.cached.at < TABLE_TTL_MS) return this.cached.processes
    const processes = this.runner
      .run(POWERSHELL(), [...PS_ARGS, PROCESSES_SCRIPT], { timeoutMs: 15_000 })
      .then(({ stdout }) => parseWindowsProcesses(stdout))
    const entry = { at: Date.now(), processes }
    this.cached = entry
    // Falhou: não guarda o erro, tenta de novo na próxima chamada.
    processes.catch(() => {
      if (this.cached === entry) this.cached = null
    })
    return processes
  }

  async processTable(): Promise<Map<number, ProcessInfo>> {
    return buildProcessTable(await this.processes(), new Set(this.groupRoots()))
  }

  /**
   * Dono de cada processo em LISTEN. O GetOwner custa ~150 ms por processo: roda em segundo plano e o usuário aparece
   * na varredura seguinte (até lá, vazio).
   */
  private ownersOf(procs: WindowsProcess[]): Map<number, string> {
    const missing = procs.filter((p) => !this.owners.has(ownerKey(p)))
    if (missing.length && !this.ownersLoading) {
      this.ownersLoading = this.loadOwners(missing)
        .catch(() => undefined)
        .finally(() => (this.ownersLoading = null))
    }
    return new Map(procs.map((p) => [p.pid, this.owners.get(ownerKey(p)) ?? '']))
  }

  private async loadOwners(missing: WindowsProcess[]): Promise<void> {
    const { stdout } = await this.runner.run(POWERSHELL(), [...PS_ARGS, ownersScript(missing.map((p) => p.pid))], { timeoutMs: 30_000 })
    if (this.owners.size > 2000) this.owners.clear()
    for (const p of missing) this.owners.set(ownerKey(p), '')
    for (const line of stdout.split(/\r?\n/)) {
      const [pid, name, user] = line.split('\t')
      if (pid && /^\d+$/.test(pid)) this.owners.set(ownerKey({ pid: Number(pid), name: name?.trim() ?? '' }), user?.trim() ?? '')
    }
  }

  async listListening(): Promise<Omit<PortBinding, 'owner'>[]> {
    const { stdout } = await this.runner.run(system32('netstat.exe'), ['-ano'], { timeoutMs: 10_000 })
    const rows = parseNetstatListen(stdout)
    if (!rows.length) return []

    let processes = await this.processes()
    const known = new Set(processes.map((p) => p.pid))
    // PID 4 é o "System" (http.sys, SMB): nunca aparece na tabela do Win32_Process com linha de comando.
    if (rows.some((r) => r.pid > 4 && !known.has(r.pid))) processes = await this.processes(true)
    const byPid = new Map(processes.map((p) => [p.pid, p]))
    const listening = [...new Set(rows.map((r) => r.pid))].map((pid) => byPid.get(pid)).filter((p): p is WindowsProcess => Boolean(p))
    const owners = this.ownersOf(listening)
    return rows.map((r) => {
      const proc = byPid.get(r.pid)
      return {
        port: r.port,
        address: r.address,
        protocol: 'TCP' as const,
        pid: r.pid,
        command: proc ? shortName(proc.name) : r.pid === 4 ? 'System' : '?',
        user: owners.get(r.pid) ?? '',
        fullCommand: proc?.command || null,
        cwd: null
      }
    })
  }
}
