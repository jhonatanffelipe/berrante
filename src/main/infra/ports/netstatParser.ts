import type { ProcessInfo } from '@main/domain/ports'
import { splitAddress } from './lsofParser'

export interface NetstatListen {
  port: number
  address: string
  pid: number
}

export interface WindowsProcess {
  pid: number
  ppid: number
  /** FILETIME (UTC) da criação; 0 quando o Windows não informa. */
  created: number
  name: string
  command: string
}

/** Endereço no formato do lsof: curinga vira "*", IPv6 fica entre colchetes. */
function normalizeAddress(address: string): string {
  if (address === '0.0.0.0' || address === '[::]' || address === '*') return '*'
  return address
}

/**
 * Parser de `netstat -ano`. O nome do estado ("LISTENING", "ESCUTANDO"…) muda com o idioma do Windows, então uma
 * linha TCP está em LISTEN quando o endereço remoto tem porta 0 (0.0.0.0:0 ou [::]:0).
 * Une IPv4/IPv6 do mesmo PID+porta numa linha só, como o parser do lsof.
 */
export function parseNetstatListen(output: string): NetstatListen[] {
  const byKey = new Map<string, NetstatListen>()
  for (const line of output.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/)
    if (cols.length < 5 || cols[0] !== 'TCP') continue
    const local = splitAddress(cols[1]!)
    const remote = cols[2]!
    const pid = Number(cols[cols.length - 1])
    if (!local || !/:0$/.test(remote) || !Number.isInteger(pid) || pid <= 0) continue
    const address = normalizeAddress(local.address)
    const key = `${pid}:${local.port}`
    const existing = byKey.get(key)
    if (existing) {
      if (!existing.address.split(', ').includes(address)) existing.address += `, ${address}`
      continue
    }
    byKey.set(key, { port: local.port, address, pid })
  }
  return [...byKey.values()].sort((a, b) => a.port - b.port || a.pid - b.pid)
}

/** Linhas "pid<TAB>ppid<TAB>criação<TAB>nome<TAB>linha de comando" do script de processos. */
export function parseWindowsProcesses(output: string): WindowsProcess[] {
  const result: WindowsProcess[] = []
  for (const line of output.split(/\r?\n/)) {
    const [pid, ppid, created, name, ...rest] = line.split('\t')
    if (!pid || !/^\d+$/.test(pid) || !ppid || !/^\d+$/.test(ppid)) continue
    result.push({ pid: Number(pid), ppid: Number(ppid), created: Number(created) || 0, name: name?.trim() ?? '', command: rest.join('\t').trim() })
  }
  return result
}

/** "node.exe" → "node", como o lsof mostra. */
export function shortName(name: string): string {
  return name.replace(/\.exe$/i, '')
}

/**
 * Monta a tabela de processos com um pgid "sintético": o Windows não tem process group, então o grupo de um processo
 * é o ancestral mais próximo que está em `roots` (o shell de cada serviço do Berrante); fora disso, o próprio PID.
 * O Windows não reaproveita o PPID de pai morto, mas reaproveita PIDs: só sobe para um pai criado antes do filho.
 */
export function buildProcessTable(processes: WindowsProcess[], roots: Set<number>): Map<number, ProcessInfo> {
  const byPid = new Map(processes.map((p) => [p.pid, p]))
  const table = new Map<number, ProcessInfo>()
  for (const p of processes) {
    let pgid = p.pid
    let current: WindowsProcess | undefined = p
    const seen = new Set<number>()
    while (current && !seen.has(current.pid)) {
      if (roots.has(current.pid)) {
        pgid = current.pid
        break
      }
      seen.add(current.pid)
      const parent = byPid.get(current.ppid)
      if (!parent || parent.pid === current.pid || (parent.created && current.created && parent.created > current.created)) break
      current = parent
    }
    table.set(p.pid, { pid: p.pid, ppid: p.ppid, pgid, user: '', command: p.command || shortName(p.name) })
  }
  return table
}
