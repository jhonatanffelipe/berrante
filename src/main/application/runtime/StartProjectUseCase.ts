import type { StartResult } from '@shared/types'
import type { GetProjectUseCase } from '../projects/GetProjectUseCase'
import type { RuntimeService } from './RuntimeService'

/** "Tocar o berrante": sobe todos os serviços habilitados na ordem do plano. */
export class StartProjectUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly runtime: RuntimeService
  ) {}

  async execute(projectId: string, ignoreConflicts = false, profileId?: string | null): Promise<StartResult> {
    return this.runtime.startAll(await this.getProject.execute(projectId), ignoreConflicts, profileId)
  }
}
