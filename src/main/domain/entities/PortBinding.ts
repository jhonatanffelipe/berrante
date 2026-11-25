import type { PortBinding, PortOwner } from '@shared/types'

export interface ManagedProcessRef {
  pgid: number
  pid: number
  owner: Omit<PortOwner, 'managed'>
}

export interface PublishedPortRef {
  port: number
  owner: Omit<PortOwner, 'managed'>
}

/**
 * Associa cada porta a um serviço do Berrante:
 * 1) processo cujo PGID é de um serviço spawnado por nós; 2) porta publicada por container de um compose da tropa.
 */
export function attachOwners(
  bindings: Omit<PortBinding, 'owner'>[],
  pgidOf: Map<number, number>,
  managed: ManagedProcessRef[],
  published: PublishedPortRef[]
): PortBinding[] {
  const byPgid = new Map(managed.map((m) => [m.pgid, m]))
  const byPort = new Map(published.map((p) => [p.port, p]))
  return bindings.map((b) => {
    const pgid = pgidOf.get(b.pid)
    const proc = pgid !== undefined ? byPgid.get(pgid) : undefined
    if (proc) return { ...b, owner: { ...proc.owner, managed: true } }
    const pub = byPort.get(b.port)
    if (pub) return { ...b, owner: { ...pub.owner, managed: true } }
    return { ...b, owner: null }
  })
}
