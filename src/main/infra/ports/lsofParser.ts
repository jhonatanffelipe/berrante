import type { PortBinding } from '@shared/types'
import type { ProcessInfo } from '@main/domain/ports'

export type RawListen = Omit<PortBinding, 'owner' | 'fullCommand' | 'cwd'>

const LINE =
  /^(?<command>\S+)\s+(?<pid>\d+)\s+(?<user>\S+)\s+\S+\s+(?:IPv4|IPv6)\s+\S+\s+\S+\s+(?<proto>TCP)\s+(?<name>\S+)\s+\(LISTEN\)\s*$/

/** "\x20" e afins que o lsof usa para escapar caracteres no COMMAND. */
function unescapeLsof(text: string): string {
  return text.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
}

export function splitAddress(name: string): { address: string; port: number } | null {
  const idx = name.lastIndexOf(':')
  if (idx <= 0) return null
  const port = Number(name.slice(idx + 1))
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null
  return { address: name.slice(0, idx), port }
}

/**
 * Parser da saída tabular de `lsof -iTCP -sTCP:LISTEN -n -P`.
 * Une IPv4/IPv6 do mesmo PID+porta numa linha só (endereços separados por vírgula).
 */
export function parseLsofListen(output: string): RawListen[] {
  const byKey = new Map<string, RawListen>()
  for (const line of output.split('\n')) {
    if (!line.trim() || line.startsWith('COMMAND')) continue
    const m = line.match(LINE)
    if (!m?.groups) continue
    const addr = splitAddress(m.groups.name!)
    if (!addr) continue
    const pid = Number(m.groups.pid)
    const key = `${pid}:${addr.port}`
    const existing = byKey.get(key)
    if (existing) {
      if (!existing.address.split(', ').includes(addr.address)) existing.address += `, ${addr.address}`
      continue
    }
    byKey.set(key, {
      port: addr.port,
      address: addr.address,
      protocol: 'TCP',
      pid,
      command: unescapeLsof(m.groups.command!),
      user: m.groups.user!
    })
  }
  return [...byKey.values()].sort((a, b) => a.port - b.port || a.pid - b.pid)
}

/** Parser de `ps -axo pid=,ppid=,pgid=,user=,command=`. */
export function parsePs(output: string): Map<number, ProcessInfo> {
  const table = new Map<number, ProcessInfo>()
  for (const line of output.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/)
    if (!m) continue
    const pid = Number(m[1])
    table.set(pid, { pid, ppid: Number(m[2]), pgid: Number(m[3]), user: m[4]!, command: m[5]!.trim() })
  }
  return table
}

/** Parser de `lsof -a -d cwd -p <pids> -Fpn` (formato de campos: p<pid> / f<fd> / n<path>). */
export function parseLsofCwd(output: string): Map<number, string> {
  const result = new Map<number, string>()
  let pid: number | null = null
  for (const line of output.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1))
    else if (line.startsWith('n') && pid !== null) result.set(pid, line.slice(1))
  }
  return result
}
