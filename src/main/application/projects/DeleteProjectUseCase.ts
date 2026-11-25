import type { ProjectRepository } from '@main/domain/repositories'
import { AppError } from '@main/domain/errors/AppError'
import type { RuntimeService } from '../runtime/RuntimeService'

export class DeleteProjectUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly runtime: RuntimeService
  ) {}

  async execute(id: string): Promise<void> {
    if (this.runtime.hasActive(id)) throw new AppError('CONFLICT', 'Recolha a boiada antes de apagar a tropa')
    await this.projects.delete(id)
  }
}
