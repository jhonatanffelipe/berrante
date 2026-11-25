import type { Project } from '@shared/types'
import type { ProjectRepository } from '@main/domain/repositories'
import { AppError } from '@main/domain/errors/AppError'

export class GetProjectUseCase {
  constructor(private readonly projects: ProjectRepository) {}
  async execute(id: string): Promise<Project> {
    const project = await this.projects.findById(id)
    if (!project) throw AppError.notFound('Tropa')
    return project
  }
}
