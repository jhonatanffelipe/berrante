import type { PortChangePlan } from '@shared/types'
import type { PortChangePlanner } from './PortChangePlanner'

/** Troca a porta nos .env da tropa (o plano é recalculado aqui; nada do renderer vira conteúdo de arquivo). */
export class ApplyPortChangeUseCase {
  constructor(private readonly planner: PortChangePlanner) {}

  execute(projectId: string, serviceId: string, port: number, newPort: number): Promise<PortChangePlan> {
    return this.planner.apply(projectId, serviceId, port, newPort)
  }
}
