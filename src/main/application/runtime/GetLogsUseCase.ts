import type { ProcessManagerGateway } from '@main/domain/ports'

/** `serviceId` aqui é a chave de runtime (projectId::serviceId). */
export class GetLogsUseCase {
  constructor(private readonly pm: ProcessManagerGateway) {}

  async execute(key: string): Promise<string> {
    return this.pm.logs(key)
  }

  async clear(key: string): Promise<void> {
    this.pm.clearLogs(key)
  }
}
