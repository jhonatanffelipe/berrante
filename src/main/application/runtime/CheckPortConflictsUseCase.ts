import type { PortConflict } from '@shared/types'
import type { GetProjectUseCase } from '../projects/GetProjectUseCase'
import type { RuntimeService } from './RuntimeService'

export class CheckPortConflictsUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly runtime: RuntimeService
  ) {}

  async execute(projectId: string, profileId?: string | null): Promise<PortConflict[]> {
    return this.runtime.conflicts(await this.getProject.execute(projectId), profileId)
  }
}
