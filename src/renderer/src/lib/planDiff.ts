import type { PlanDiffEntry, StartupPlan } from '@shared/types'

/** Aplica só as entradas do diff que o usuário marcou. */
export function applyDiff(current: StartupPlan, entries: PlanDiffEntry[], selected: Set<string>, now = new Date()): StartupPlan {
  let services = [...current.services]
  for (const e of entries) {
    if (!selected.has(e.serviceId)) continue
    if (e.type === 'removed') services = services.filter((s) => s.id !== e.serviceId)
    else if (e.type === 'changed' && e.after) services = services.map((s) => (s.id === e.serviceId ? e.after! : s))
    else if (e.type === 'added' && e.after) services.push(e.after)
  }
  const ids = new Set(services.map((s) => s.id))
  return {
    ...current,
    services: services.map((s) => ({ ...s, dependsOn: s.dependsOn.filter((d) => ids.has(d)) })),
    updatedAt: now.toISOString()
  }
}
