import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import type { GitOperationResult } from '@shared/types'
import type { LocalRepositoryRepository, SettingsRepository } from '@main/domain/repositories'
import type { Clock, GitGateway, IdGenerator, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { LocalRepositoryEntity } from '@main/domain/entities/LocalRepository'
import type { GithubSession } from '../auth/GithubSession'
import type { RepoCatalog } from './RepoCatalog'

export class CloneRepoUseCase {
  constructor(
    private readonly session: GithubSession,
    private readonly catalog: RepoCatalog,
    private readonly git: GitGateway,
    private readonly repos: LocalRepositoryRepository,
    private readonly settings: SettingsRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly logger: Logger
  ) {}

  async execute(input: { fullName: string; subdir?: string }): Promise<GitOperationResult> {
    const token = await this.session.requireToken()
    const meta = this.catalog.find(input.fullName)
    if (!meta) throw AppError.notFound('Repositório no GitHub')

    const { cloneRoot } = await this.settings.get()
    const base = resolve(cloneRoot, input.subdir ?? '')
    if (base !== cloneRoot && !base.startsWith(cloneRoot + sep)) throw AppError.validation('Subpasta fora da pasta raiz')
    const dest = join(base, meta.name)
    if (existsSync(dest)) throw new AppError('CONFLICT', `Já existe uma pasta em ${dest}`)

    await mkdir(base, { recursive: true })
    const started = Date.now()
    // URL limpa (https://github.com/owner/repo.git): o token só vai pelo GIT_ASKPASS.
    const output = await this.git.clone(meta.cloneUrl, dest, token)
    const repository = LocalRepositoryEntity.create({ id: this.ids.next(), path: dest, remoteUrl: meta.cloneUrl, now: this.clock.now() })
    await this.repos.save(repository)
    this.logger.info('repo.cloned', { fullName: meta.fullName, dest, durationMs: Date.now() - started })
    return { repository, output }
  }
}
