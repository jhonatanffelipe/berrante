import type { AuthStatus } from '@shared/types'
import type { Logger } from '@main/domain/ports'
import type { GithubSession } from './GithubSession'

export class GetAuthStatusUseCase {
  constructor(
    private readonly session: GithubSession,
    private readonly clientId: string,
    private readonly logger: Logger
  ) {}

  async execute(): Promise<AuthStatus> {
    const deviceFlowAvailable = this.clientId.length > 0
    try {
      const user = await this.session.currentUser()
      return { authenticated: user !== null, user, source: user ? await this.session.source() : null, deviceFlowAvailable }
    } catch (err) {
      this.logger.warn('auth.status.failed', { error: (err as Error).message })
      return { authenticated: false, user: null, source: null, deviceFlowAvailable }
    }
  }
}
