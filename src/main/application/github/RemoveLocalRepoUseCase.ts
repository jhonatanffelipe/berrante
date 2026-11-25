import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'
import type { Clock } from '@main/domain/ports'
import { ProjectEntity } from '@main/domain/entities/Project'

/** Remove do Berrante (não apaga a pasta) e tira o repo das tropas. */
export class RemoveLocalRepoUseCase {
  constructor(
    private readonly repos: LocalRepositoryRepository,
    private readonly projects: ProjectRepository,
    private readonly clock: Clock
  ) {}

  async execute(repoId: string): Promise<void> {
    for (const p of await this.projects.list()) {
      if (!p.repositoryIds.includes(repoId)) continue
      const input = { name: p.name, color: p.color, icon: p.icon, repositoryIds: p.repositoryIds.filter((r) => r !== repoId) }
      await this.projects.save(ProjectEntity.update(p, input, this.clock.now()))
    }
    await this.repos.delete(repoId)
  }
}
