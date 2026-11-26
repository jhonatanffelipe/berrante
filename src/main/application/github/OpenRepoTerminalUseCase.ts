import type { LocalRepositoryRepository, SettingsRepository } from '@main/domain/repositories'
import type { TerminalGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

/** Abre o terminal escolhido nas configurações na pasta do repositório (o caminho nunca vem do renderer). */
export class OpenRepoTerminalUseCase {
  constructor(
    private readonly repos: LocalRepositoryRepository,
    private readonly settings: SettingsRepository,
    private readonly terminal: TerminalGateway
  ) {}

  async execute(repoId: string): Promise<void> {
    const repo = await this.repos.findById(repoId)
    if (!repo) throw AppError.notFound('Repositório')
    await this.terminal.open((await this.settings.get()).terminalApp, repo.path)
  }
}
