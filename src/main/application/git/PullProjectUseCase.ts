import type { RepoGitResult } from '@shared/types'
import type { GitGateway, Logger } from '@main/domain/ports'
import type { GithubSession } from '../auth/GithubSession'
import type { ProjectRepos } from '../projects/ProjectRepos'

const lastLine = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean).pop() ?? ''

/** Pull (`--ff-only`) em todos os repositórios da tropa; um que falha não impede os outros. */
export class PullProjectUseCase {
  constructor(
    private readonly projectRepos: ProjectRepos,
    private readonly git: GitGateway,
    private readonly session: GithubSession,
    private readonly logger: Logger
  ) {}

  async execute(projectId: string): Promise<RepoGitResult[]> {
    const started = Date.now()
    const repos = await this.projectRepos.list(projectId)
    const token = repos.some((r) => r.githubFullName) ? await this.session.token() : null
    const result = await Promise.all(
      repos.map(async (repo): Promise<RepoGitResult> => {
        try {
          const output = await this.git.pull(repo.path, repo.githubFullName ? token : null)
          return { repoId: repo.id, repoName: repo.name, status: 'ok', message: lastLine(output) || 'atualizado' }
        } catch (err) {
          const output = (err as { details?: { output?: string } }).details?.output
          return { repoId: repo.id, repoName: repo.name, status: 'failed', message: lastLine(output ?? '') || (err as Error).message }
        }
      })
    )
    this.logger.info('git.pullAll', { projectId, ok: result.filter((r) => r.status === 'ok').length, failed: result.filter((r) => r.status === 'failed').length, durationMs: Date.now() - started })
    return result
  }
}
