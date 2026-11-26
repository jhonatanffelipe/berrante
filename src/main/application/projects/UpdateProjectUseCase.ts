import type { Project, ProjectInput } from '@shared/types'
import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'
import type { Clock, EditorGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { ProjectEntity } from '@main/domain/entities/Project'
import { assertReposExist } from './assertRepos'
import { assertWorkspaceExists } from './assertWorkspace'

export class UpdateProjectUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository,
    private readonly clock: Clock,
    private readonly editor: EditorGateway
  ) {}

  async execute(id: string, input: ProjectInput): Promise<Project> {
    const project = await this.projects.findById(id)
    if (!project) throw AppError.notFound('Tropa')
    await assertReposExist(this.repos, input.repositoryIds)
    await assertWorkspaceExists(this.editor, input.workspaceFile?.trim())
    const updated = ProjectEntity.update(project, input, this.clock.now())
    await this.projects.save(updated)
    return updated
  }
}
