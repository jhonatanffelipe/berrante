import type { AiCliStatus } from '@shared/types'
import type { AiCliGateway } from '@main/domain/ports'

export class GetAiCliStatusUseCase {
  constructor(private readonly ai: AiCliGateway) {}

  async execute(): Promise<AiCliStatus[]> {
    return Promise.all((['claude', 'agy'] as const).map(async (name) => ({ name, path: this.ai.path(name), available: await this.ai.available(name) })))
  }
}
