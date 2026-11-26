import { stat } from 'node:fs/promises'
import type { LocalRepository } from '@shared/types'
import type { LocalRepositoryRepository, SettingsRepository } from '@main/domain/repositories'
import type { Clock, GitGateway, IdGenerator, ShellGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { LocalRepositoryEntity } from '@main/domain/entities/LocalRepository'

export class ImportLocalFolderUseCase {
  constructor(
    private readonly repos: LocalRepositoryRepository,
    private readonly git: GitGateway,
    private readonly shell: ShellGateway,
    private readonly settings: SettingsRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  /** Importa a pasta indicada ou as escolhidas no diálogo (várias de uma vez). */
  async execute(path?: string): Promise<LocalRepository[]> {
    const targets = path ? [path] : await this.shell.pickFolders('Importar pastas locais (⌘-clique para várias)', (await this.settings.get()).cloneRoot)
    const imported: LocalRepository[] = []
    for (const target of targets) imported.push(await this.importOne(target))
    return imported
  }

  private async importOne(target: string): Promise<LocalRepository> {
    const info = await stat(target).catch(() => null)
    if (!info?.isDirectory()) throw AppError.validation('Selecione uma pasta')

    const existing = await this.repos.findByPath(target)
    if (existing) return existing

    const remoteUrl = (await this.git.isRepo(target)) ? await this.git.originUrl(target) : null
    const repo = LocalRepositoryEntity.create({ id: this.ids.next(), path: target, remoteUrl, now: this.clock.now() })
    await this.repos.save(repo)
    return repo
  }
}
