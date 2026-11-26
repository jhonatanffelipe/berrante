import type { RepoGitStatus } from '@shared/types'
import type { GitGateway, Logger } from '@main/domain/ports'
import type { GithubSession } from '../auth/GithubSession'
import type { ProjectRepos } from '../projects/ProjectRepos'

/** "Marcar a tropa": branch, alterações e commits à frente/atrás de cada repositório. */
export class GetProjectGitStatusUseCase {
  constructor(
    private readonly projectRepos: ProjectRepos,
    private readonly git: GitGateway,
    private readonly session: GithubSession,
    private readonly logger: Logger
  ) {}

  async execute(projectId: string, fetch = false): Promise<RepoGitStatus[]> {
    const started = Date.now()
    const repos = await this.projectRepos.list(projectId)
    const token = fetch && repos.some((r) => r.githubFullName) ? await this.session.token() : null
    const result = await Promise.all(
      repos.map(async (repo): Promise<RepoGitStatus> => {
        try {
          // Sem rede (fetch falhou) ainda vale mostrar o estado local.
          if (fetch) await this.git.fetch(repo.path, repo.githubFullName ? token : null).catch(() => undefined)
          return { repoId: repo.id, repoName: repo.name, ...(await this.git.status(repo.path)), error: null }
        } catch (err) {
          return { repoId: repo.id, repoName: repo.name, branch: null, upstream: null, ahead: 0, behind: 0, changes: 0, error: (err as Error).message }
        }
      })
    )
    this.logger.info('git.status', { projectId, repos: repos.length, fetch, durationMs: Date.now() - started })
    return result
  }
}
