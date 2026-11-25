import type { GitOperationResult } from '@shared/types'
import type { LocalRepositoryRepository } from '@main/domain/repositories'
import type { GitGateway, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { GithubSession } from '../auth/GithubSession'

export class PullRepoUseCase {
  constructor(
    private readonly repos: LocalRepositoryRepository,
    private readonly git: GitGateway,
    private readonly session: GithubSession,
    private readonly logger: Logger
  ) {}

  async execute(repoId: string): Promise<GitOperationResult> {
    const repository = await this.repos.findById(repoId)
    if (!repository) throw AppError.notFound('Repositório')
    const token = repository.githubFullName ? await this.session.token() : null
    const output = await this.git.pull(repository.path, token)
    this.logger.info('repo.pulled', { repoId, path: repository.path })
    return { repository, output }
  }
}
