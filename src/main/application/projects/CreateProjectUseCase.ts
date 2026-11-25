import type { Project, ProjectInput } from '@shared/types'
import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'
import type { Clock, IdGenerator } from '@main/domain/ports'
import { ProjectEntity } from '@main/domain/entities/Project'
import { assertReposExist } from './assertRepos'

export class CreateProjectUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async execute(input: ProjectInput): Promise<Project> {
    await assertReposExist(this.repos, input.repositoryIds)
    const project = ProjectEntity.create(input, this.ids.next(), this.clock.now())
    await this.projects.save(project)
    return project
  }
}
