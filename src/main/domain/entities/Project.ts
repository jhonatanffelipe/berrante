import type { Project, ProjectInput, StartupPlan } from '@shared/types'
import { AppError } from '../errors/AppError'

export const ProjectEntity = {
  create(input: ProjectInput, id: string, now: Date): Project {
    const iso = now.toISOString()
    return { id, ...ProjectEntity.normalize(input), plan: null, createdAt: iso, updatedAt: iso }
  },

  update(project: Project, input: ProjectInput, now: Date): Project {
    const normalized = ProjectEntity.normalize(input)
    const removed = project.repositoryIds.filter((r) => !normalized.repositoryIds.includes(r))
    const plan = project.plan && removed.length > 0 ? StartupPlanOps.withoutRepos(project.plan, removed) : project.plan
    return { ...project, ...normalized, plan, updatedAt: now.toISOString() }
  },

  withPlan(project: Project, plan: StartupPlan, now: Date): Project {
    const foreign = plan.services.find((s) => !project.repositoryIds.includes(s.repoId))
    if (foreign) throw AppError.validation(`O serviço "${foreign.name}" pertence a um repositório fora da tropa`)
    return { ...project, plan: { ...plan, updatedAt: now.toISOString() }, updatedAt: now.toISOString() }
  },

  normalize(input: ProjectInput): ProjectInput {
    const name = input.name.trim()
    if (!name) throw AppError.validation('A tropa precisa de um nome')
    return { ...input, name, repositoryIds: [...new Set(input.repositoryIds)] }
  }
}

export const StartupPlanOps = {
  withoutRepos(plan: StartupPlan, repoIds: string[]): StartupPlan {
    const services = plan.services.filter((s) => !repoIds.includes(s.repoId))
    const ids = new Set(services.map((s) => s.id))
    return {
      ...plan,
      services: services.map((s) => ({ ...s, dependsOn: s.dependsOn.filter((d) => ids.has(d)) })),
      actions: plan.actions.filter((a) => !repoIds.includes(a.repoId))
    }
  }
}
