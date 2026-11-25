import type { LocalRepositoryRepository } from '@main/domain/repositories'
import type { ShellGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

export class RevealRepoUseCase {
  constructor(
    private readonly repos: LocalRepositoryRepository,
    private readonly shell: ShellGateway
  ) {}

  async execute(repoId: string): Promise<void> {
    const repo = await this.repos.findById(repoId)
    if (!repo) throw AppError.notFound('Repositório')
    this.shell.reveal(repo.path)
  }
}
