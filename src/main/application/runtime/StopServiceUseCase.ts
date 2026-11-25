import type { GetProjectUseCase } from '../projects/GetProjectUseCase'
import type { RuntimeService } from './RuntimeService'
import { findService } from './findService'

export class StopServiceUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly runtime: RuntimeService
  ) {}

  async execute(projectId: string, serviceId: string): Promise<void> {
    const project = await this.getProject.execute(projectId)
    const svc = serviceId.startsWith('action:') ? { id: serviceId, kind: 'command' as const } : findService(project, serviceId)
    await this.runtime.stopService(project, svc)
  }
}
