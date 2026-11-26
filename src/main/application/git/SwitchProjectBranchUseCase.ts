import type { RepoGitResult } from '@shared/types'
import type { GitGateway, Logger } from '@main/domain/ports'
import type { ProjectRepos } from '../projects/ProjectRepos'

/**
 * "Trocar de pasto": troca de branch em todos os repositórios da tropa que a têm.
 * Repo com alteração não salva fica de fora (nada de stash escondido).
 */
export class SwitchProjectBranchUseCase {
  constructor(
    private readonly projectRepos: ProjectRepos,
    private readonly git: GitGateway,
    private readonly logger: Logger
  ) {}

  async execute(projectId: string, branch: string): Promise<RepoGitResult[]> {
    const repos = await this.projectRepos.list(projectId)
    const result = await Promise.all(
      repos.map(async (repo): Promise<RepoGitResult> => {
        const base = { repoId: repo.id, repoName: repo.name }
        try {
          const [state, branches] = await Promise.all([this.git.status(repo.path), this.git.branches(repo.path)])
          if (state.branch === branch) return { ...base, status: 'skipped', message: 'já está nessa branch' }
          if (!branches.includes(branch)) return { ...base, status: 'skipped', message: 'não tem essa branch' }
          if (state.changes > 0) return { ...base, status: 'skipped', message: `${state.changes} alteração(ões) não salvas: faça commit ou stash antes` }
          await this.git.switchBranch(repo.path, branch)
          return { ...base, status: 'ok', message: `agora em ${branch}` }
        } catch (err) {
          const output = (err as { details?: { output?: string } }).details?.output
          return { ...base, status: 'failed', message: output?.split('\n').filter(Boolean).pop() ?? (err as Error).message }
        }
      })
    )
    this.logger.info('git.switchAll', { projectId, branch, switched: result.filter((r) => r.status === 'ok').length })
    return result
  }
}
