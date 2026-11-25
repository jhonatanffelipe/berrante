import type { DeviceFlowPoll } from '@shared/types'
import type { GithubGateway, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { DeviceFlowState } from './DeviceFlowState'
import type { GithubSession } from './GithubSession'

export class PollDeviceFlowUseCase {
  constructor(
    private readonly github: GithubGateway,
    private readonly state: DeviceFlowState,
    private readonly session: GithubSession,
    private readonly clientId: string,
    private readonly logger: Logger
  ) {}

  async execute(): Promise<DeviceFlowPoll> {
    const flow = this.state.current
    if (!flow) throw new AppError('VALIDATION', 'Nenhum login em andamento')
    if (Date.now() > flow.expiresAt) {
      this.state.current = null
      return { status: 'expired' }
    }
    const result = await this.github.pollDeviceFlow(this.clientId, flow.deviceCode)
    if (result.status === 'authorized') {
      this.state.current = null
      const user = await this.session.store(result.token, 'device-flow')
      this.logger.info('auth.login', { source: 'device-flow', login: user.login })
      return { status: 'authorized', user }
    }
    if (result.status === 'slow_down') {
      flow.interval = result.interval ?? flow.interval + 5
      return { status: 'slow_down', interval: flow.interval }
    }
    if (result.status !== 'pending') this.state.current = null
    return { status: result.status }
  }
}
