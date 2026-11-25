import type { GithubRepo, RepoListQuery, RepoListResult } from '@shared/types'
import type { LocalCloneScanner } from '@main/domain/ports'
import type { LocalRepositoryRepository, SettingsRepository } from '@main/domain/repositories'
import type { GithubSession } from '../auth/GithubSession'
import type { RepoCatalog } from './RepoCatalog'

export class ListGithubReposUseCase {
  constructor(
    private readonly session: GithubSession,
    private readonly catalog: RepoCatalog,
    private readonly localRepos: LocalRepositoryRepository,
    private readonly scanner: LocalCloneScanner,
    private readonly settings: SettingsRepository
  ) {}

  async execute(query: RepoListQuery): Promise<RepoListResult> {
    const token = await this.session.requireToken()
    const [all, local, settings] = await Promise.all([this.catalog.all(token, query.refresh ?? false), this.localRepos.list(), this.settings.get()])

    const localByName = await this.scanner.scan(settings.cloneRoot, 2)
    for (const r of local) if (r.githubFullName) localByName.set(r.githubFullName.toLowerCase(), r.path)

    const search = query.search?.trim().toLowerCase()
    let items: GithubRepo[] = all.map((r) => ({ ...r, localPath: localByName.get(r.fullName.toLowerCase()) ?? null }))
    if (search) items = items.filter((r) => r.fullName.toLowerCase().includes(search) || (r.description ?? '').toLowerCase().includes(search))
    if (query.owner) items = items.filter((r) => r.owner === query.owner)
    if (query.visibility === 'private') items = items.filter((r) => r.private)
    if (query.visibility === 'public') items = items.filter((r) => !r.private)
    if (query.cloned === 'cloned') items = items.filter((r) => r.localPath)
    if (query.cloned === 'not-cloned') items = items.filter((r) => !r.localPath)

    const perPage = query.perPage ?? 30
    const page = query.page ?? 1
    return {
      items: items.slice((page - 1) * perPage, page * perPage),
      page,
      perPage,
      total: items.length,
      owners: [...new Set(all.map((r) => r.owner))].sort()
    }
  }
}
