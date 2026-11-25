import type { DeviceFlowStart } from '@shared/types'
import type { GithubGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { DeviceFlowState } from './DeviceFlowState'

export class StartDeviceFlowUseCase {
  constructor(
    private readonly github: GithubGateway,
    private readonly state: DeviceFlowState,
    private readonly clientId: string
  ) {}

  async execute(): Promise<DeviceFlowStart> {
    if (!this.clientId) {
      throw new AppError('VALIDATION', 'BERRANTE_GITHUB_CLIENT_ID não configurado em config/.env. Use "Importar sessão do gh" ou veja o README.')
    }
    const flow = await this.github.startDeviceFlow(this.clientId)
    this.state.current = { deviceCode: flow.deviceCode, verificationUri: flow.verificationUri, expiresAt: Date.now() + flow.expiresIn * 1000, interval: flow.interval }
    return { userCode: flow.userCode, verificationUri: flow.verificationUri, expiresIn: flow.expiresIn, interval: flow.interval }
  }
}
