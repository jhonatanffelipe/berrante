import type { GetProjectUseCase } from '../projects/GetProjectUseCase'
import type { RuntimeService } from './RuntimeService'
import { findService } from './findService'

export class StartServiceUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly runtime: RuntimeService
  ) {}

  async execute(projectId: string, serviceId: string): Promise<void> {
    const project = await this.getProject.execute(projectId)
    await this.runtime.startService(project, findService(project, serviceId))
  }
}
