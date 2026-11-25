import type { PlanDiffEntry, ServiceDefinition, StartupPlan } from '@shared/types'
import { AppError } from '../errors/AppError'

/**
 * Ordena os serviços respeitando `dependsOn` (topológica) e, entre os livres, o campo `order`.
 * Lança CONFLICT em caso de ciclo.
 */
export function orderServices(services: ServiceDefinition[]): ServiceDefinition[] {
  const byId = new Map(services.map((s) => [s.id, s]))
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const result: ServiceDefinition[] = []

  const visit = (svc: ServiceDefinition, trail: string[]): void => {
    if (visited.has(svc.id)) return
    if (visiting.has(svc.id)) {
      throw new AppError('CONFLICT', `Dependência circular: ${[...trail, svc.name].join(' → ')}`)
    }
    visiting.add(svc.id)
    const deps = svc.dependsOn
      .map((d) => byId.get(d))
      .filter((d): d is ServiceDefinition => Boolean(d))
      .sort((a, b) => a.order - b.order)
    for (const dep of deps) visit(dep, [...trail, svc.name])
    visiting.delete(svc.id)
    visited.add(svc.id)
    result.push(svc)
  }

  for (const svc of [...services].sort((a, b) => a.order - b.order)) visit(svc, [])
  return result
}

/** Serviços que entram no "play": habilitados + dependências deles (mesmo desabilitadas não entram). */
export function playableServices(plan: StartupPlan): ServiceDefinition[] {
  return orderServices(plan.services.filter((s) => s.enabled))
}

const DIFF_FIELDS: (keyof ServiceDefinition)[] = ['name', 'kind', 'command', 'cwd', 'env', 'enabled', 'order', 'dependsOn', 'composeFile']

export function diffPlans(before: StartupPlan | null, after: StartupPlan): PlanDiffEntry[] {
  const prev = new Map((before?.services ?? []).map((s) => [s.id, s]))
  const next = new Map(after.services.map((s) => [s.id, s]))
  const entries: PlanDiffEntry[] = []

  for (const [id, svc] of next) {
    const old = prev.get(id)
    if (!old) {
      entries.push({ type: 'added', serviceId: id, name: svc.name, before: null, after: svc, fields: [] })
      continue
    }
    const fields = DIFF_FIELDS.filter((f) => JSON.stringify(old[f]) !== JSON.stringify(svc[f]))
    if (fields.length) entries.push({ type: 'changed', serviceId: id, name: svc.name, before: old, after: svc, fields })
  }
  for (const [id, svc] of prev) {
    if (!next.has(id)) entries.push({ type: 'removed', serviceId: id, name: svc.name, before: svc, after: null, fields: [] })
  }
  return entries
}
