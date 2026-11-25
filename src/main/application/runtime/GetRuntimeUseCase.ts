import type { ProjectRuntime } from '@shared/types'
import type { GetProjectUseCase } from '../projects/GetProjectUseCase'
import type { RuntimeService } from './RuntimeService'

export class GetRuntimeUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly runtime: RuntimeService
  ) {}

  async execute(projectId: string): Promise<ProjectRuntime> {
    return this.runtime.refresh(await this.getProject.execute(projectId))
  }
}
