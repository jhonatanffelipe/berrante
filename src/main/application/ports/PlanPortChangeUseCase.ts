import type { PortChangePlan } from '@shared/types'
import type { PortChangePlanner } from './PortChangePlanner'

/** Mostra como trocar a porta ocupada de um passo: porta livre sugerida e linhas do .env que mudam. */
export class PlanPortChangeUseCase {
  constructor(private readonly planner: PortChangePlanner) {}

  async execute(projectId: string, serviceId: string, port: number, newPort?: number): Promise<PortChangePlan> {
    return (await this.planner.plan(projectId, serviceId, port, newPort)).plan
  }
}
