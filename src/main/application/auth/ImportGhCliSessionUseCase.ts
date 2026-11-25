import type { AuthStatus } from '@shared/types'
import type { GhCliGateway, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { GithubSession } from './GithubSession'

export class ImportGhCliSessionUseCase {
  constructor(
    private readonly gh: GhCliGateway,
    private readonly session: GithubSession,
    private readonly deviceFlowAvailable: boolean,
    private readonly logger: Logger
  ) {}

  async execute(): Promise<AuthStatus> {
    const token = await this.gh.token()
    if (!token) throw new AppError('GITHUB', 'gh CLI não encontrado ou não logado (rode `gh auth login`)')
    const user = await this.session.store(token, 'gh-cli')
    this.logger.info('auth.login', { source: 'gh-cli', login: user.login })
    return { authenticated: true, user, source: 'gh-cli', deviceFlowAvailable: this.deviceFlowAvailable }
  }
}
