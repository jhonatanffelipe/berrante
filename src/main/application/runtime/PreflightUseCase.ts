import type { Preflight } from '@shared/types'
import type { CheckEnvUseCase } from '../env/CheckEnvUseCase'
import type { GetProjectUseCase } from '../projects/GetProjectUseCase'
import type { RuntimeService } from './RuntimeService'

/** Vistoria antes de tocar o berrante: portas ocupadas e `.env` incompletos, em paralelo. */
export class PreflightUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly runtime: RuntimeService,
    private readonly checkEnv: CheckEnvUseCase
  ) {}

  async execute(projectId: string, profileId?: string | null): Promise<Preflight> {
    const project = await this.getProject.execute(projectId)
    const [conflicts, env] = await Promise.all([this.runtime.conflicts(project, profileId), this.checkEnv.execute(projectId, profileId).catch(() => [])])
    return { conflicts, env }
  }
}
