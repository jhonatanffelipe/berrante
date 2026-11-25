import type { GetProjectUseCase } from '../projects/GetProjectUseCase'
import type { RuntimeService } from './RuntimeService'

/** "Recolher a boiada": para processos e containers da tropa. */
export class StopAllUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly runtime: RuntimeService
  ) {}

  async execute(projectId: string): Promise<void> {
    await this.runtime.stopAll(await this.getProject.execute(projectId))
  }
}
