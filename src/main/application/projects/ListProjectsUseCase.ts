import type { Project } from '@shared/types'
import type { ProjectRepository } from '@main/domain/repositories'

export class ListProjectsUseCase {
  constructor(private readonly projects: ProjectRepository) {}
  execute(): Promise<Project[]> {
    return this.projects.list()
  }
}
