import type { LocalRepository, Project, StartupPlan } from '@shared/types'
import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'
import type { Clock } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { ProjectEntity } from '@main/domain/entities/Project'
import { flattenWorkflow } from '@main/domain/entities/ServiceDefinition'
import { isInside } from './pathGuard'

/** Repositório da tropa que contém a pasta (o mais específico, se houver repos aninhados). */
export function repoForPath(repos: LocalRepository[], cwd: string): LocalRepository | null {
  return repos.filter((r) => isInside(r.path, cwd)).sort((a, b) => b.path.length - a.path.length)[0] ?? null
}

export class SaveStartupPlanUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository,
    private readonly clock: Clock
  ) {}

  async execute(projectId: string, plan: StartupPlan): Promise<Project> {
    const project = await this.projects.findById(projectId)
    if (!project) throw AppError.notFound('Tropa')
    const repos = (await Promise.all(project.repositoryIds.map((id) => this.repos.findById(id)))).filter((r): r is LocalRepository => r !== null)

    const ids = new Set<string>()
    const services = plan.services.map((svc) => {
      if (ids.has(svc.id)) throw AppError.validation(`Passo duplicado: ${svc.id}`)
      ids.add(svc.id)
      if (!svc.command.trim()) throw AppError.validation(`O passo "${svc.name}" está sem comando`)
      // O repo vem da pasta escolhida, não do que o renderer mandou.
      const repo = repoForPath(repos, svc.cwd)
      if (!repo) throw AppError.validation(`A pasta de "${svc.name}" precisa ficar dentro de um repositório da tropa`)
      return { ...svc, repoId: repo.id }
    })

    // Perfis só apontam para passos que existem; nomes repetidos não fazem sentido no seletor.
    const names = new Set<string>()
    const profiles = (plan.profiles ?? []).map((p) => {
      const name = p.name.trim()
      if (names.has(name.toLowerCase())) throw AppError.validation(`Perfil duplicado: ${name}`)
      names.add(name.toLowerCase())
      return { ...p, name, serviceIds: p.serviceIds.filter((id) => ids.has(id)) }
    })
    const cleaned = services.map((s) => ({ ...s, healthUrl: s.waitFor === 'health' ? (s.healthUrl ?? null) : null }))
    if (cleaned.some((s) => s.waitFor === 'health' && !s.healthUrl)) throw AppError.validation('Passo que segue ao responder precisa da URL de healthcheck')
    const updated = ProjectEntity.withPlan(project, { ...plan, services: flattenWorkflow(cleaned), profiles }, this.clock.now())
    await this.projects.save(updated)
    return updated
  }
}
