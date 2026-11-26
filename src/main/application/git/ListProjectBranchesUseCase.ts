import type { BranchOption } from '@shared/types'
import type { GitGateway } from '@main/domain/ports'
import type { ProjectRepos } from '../projects/ProjectRepos'

/** Branches de todos os repositórios da tropa, com quais repos têm cada uma (as mais comuns primeiro). */
export class ListProjectBranchesUseCase {
  constructor(
    private readonly projectRepos: ProjectRepos,
    private readonly git: GitGateway
  ) {}

  async execute(projectId: string): Promise<BranchOption[]> {
    const repos = await this.projectRepos.list(projectId)
    const byName = new Map<string, string[]>()
    await Promise.all(
      repos.map(async (repo) => {
        const names = await this.git.branches(repo.path).catch(() => [])
        for (const name of names) byName.set(name, [...(byName.get(name) ?? []), repo.id])
      })
    )
    return [...byName.entries()]
      .map(([name, repoIds]) => ({ name, repoIds }))
      .sort((a, b) => b.repoIds.length - a.repoIds.length || a.name.localeCompare(b.name))
  }
}
