import type { GithubRepo } from '@shared/types'
import type { GithubGateway } from '@main/domain/ports'

const TTL_MS = 5 * 60_000

/** Cache em memória da lista completa de repos (busca/filtro/paginação são locais). */
export class RepoCatalog {
  private cache: { at: number; repos: Omit<GithubRepo, 'localPath'>[] } | null = null

  constructor(private readonly github: GithubGateway) {}

  async all(token: string, refresh: boolean): Promise<Omit<GithubRepo, 'localPath'>[]> {
    if (!refresh && this.cache && Date.now() - this.cache.at < TTL_MS) return this.cache.repos
    const repos = await this.github.listAllRepos(token)
    this.cache = { at: Date.now(), repos }
    return repos
  }

  find(fullName: string): Omit<GithubRepo, 'localPath'> | null {
    return this.cache?.repos.find((r) => r.fullName.toLowerCase() === fullName.toLowerCase()) ?? null
  }

  invalidate(): void {
    this.cache = null
  }
}
