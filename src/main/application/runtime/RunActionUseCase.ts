import type { GetProjectUseCase } from '../projects/GetProjectUseCase'
import type { RuntimeService } from './RuntimeService'

export class RunActionUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly runtime: RuntimeService
  ) {}

  async execute(projectId: string, repoId: string, name: string): Promise<string> {
    return this.runtime.runAction(await this.getProject.execute(projectId), repoId, name)
  }
}
