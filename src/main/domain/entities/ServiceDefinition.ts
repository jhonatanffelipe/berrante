import type { ServiceDefinition, StartupPlan } from '@shared/types'
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

/** Passos que entram no "play": os habilitados, na ordem do workflow (`dependsOn` só existe em planos antigos). */
export function playableServices(plan: StartupPlan): ServiceDefinition[] {
  return orderServices(plan.services.filter((s) => s.enabled))
}

/** Reescreve `order` em passos de 10 seguindo a ordem efetiva e limpa o `dependsOn` legado. */
export function flattenWorkflow(services: ServiceDefinition[]): ServiceDefinition[] {
  let ordered: ServiceDefinition[]
  try {
    ordered = orderServices(services)
  } catch {
    ordered = [...services].sort((a, b) => a.order - b.order)
  }
  return ordered.map((s, i) => ({ ...s, order: i * 10, dependsOn: [] }))
}
