import type { Project, StartupPlan } from '@shared/types'
import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'
import type { Clock } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { ProjectEntity } from '@main/domain/entities/Project'
import { orderServices } from '@main/domain/entities/ServiceDefinition'
import { isInside } from './pathGuard'

export class SaveStartupPlanUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository,
    private readonly clock: Clock
  ) {}

  async execute(projectId: string, plan: StartupPlan): Promise<Project> {
    const project = await this.projects.findById(projectId)
    if (!project) throw AppError.notFound('Tropa')

    const ids = new Set<string>()
    for (const svc of plan.services) {
      if (ids.has(svc.id)) throw AppError.validation(`Serviço duplicado: ${svc.id}`)
      ids.add(svc.id)
      const repo = await this.repos.findById(svc.repoId)
      if (!repo) throw AppError.validation(`Repositório do serviço "${svc.name}" não existe`)
      if (!isInside(repo.path, svc.cwd)) throw AppError.validation(`O cwd de "${svc.name}" precisa ficar dentro de ${repo.path}`)
    }
    orderServices(plan.services) // valida ciclos

    const updated = ProjectEntity.withPlan(project, plan, this.clock.now())
    await this.projects.save(updated)
    return updated
  }
}
