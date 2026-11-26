import type { LocalRepository } from '@shared/types'
import type { LocalRepositoryRepository } from '@main/domain/repositories'
import { AppError } from '@main/domain/errors/AppError'
import type { GetProjectUseCase } from './GetProjectUseCase'

/** Repositórios de uma tropa que ainda existem no Berrante, na ordem da tropa. */
export class ProjectRepos {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly repos: LocalRepositoryRepository
  ) {}

  async list(projectId: string): Promise<LocalRepository[]> {
    const project = await this.getProject.execute(projectId)
    const found = await Promise.all(project.repositoryIds.map((id) => this.repos.findById(id)))
    return found.filter((r): r is LocalRepository => r !== null)
  }

  async one(projectId: string, repoId: string): Promise<LocalRepository> {
    const repo = (await this.list(projectId)).find((r) => r.id === repoId)
    if (!repo) throw AppError.notFound('Repositório da tropa')
    return repo
  }
}
