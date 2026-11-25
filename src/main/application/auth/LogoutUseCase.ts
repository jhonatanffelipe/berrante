import type { AuthStatus } from '@shared/types'
import type { Logger } from '@main/domain/ports'
import type { GithubSession } from './GithubSession'
import type { RepoCatalog } from '../github/RepoCatalog'

export class LogoutUseCase {
  constructor(
    private readonly session: GithubSession,
    private readonly catalog: RepoCatalog,
    private readonly deviceFlowAvailable: boolean,
    private readonly logger: Logger
  ) {}

  async execute(): Promise<AuthStatus> {
    await this.session.clear()
    this.catalog.invalidate()
    this.logger.info('auth.logout')
    return { authenticated: false, user: null, source: null, deviceFlowAvailable: this.deviceFlowAvailable }
  }
}
