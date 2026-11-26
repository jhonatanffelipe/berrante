import type { ContainerList } from '@shared/types'
import type { DockerGateway } from '@main/domain/ports'
import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'
import { ownersOf } from '@main/domain/entities/ComposeStack'

/** "Curral": todos os containers da máquina, com a tropa dona de cada um. */
export class ListContainersUseCase {
  constructor(
    private readonly docker: DockerGateway,
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository
  ) {}

  async execute(): Promise<ContainerList> {
    const [listed, projects, repos] = await Promise.all([this.docker.listContainers(), this.projects.list(), this.repos.list()])
    if (!listed.ok) return { available: false, error: listed.error, containers: [] }
    const repoPaths = new Map(repos.map((r) => [r.id, r.path]))
    const containers = listed.containers.map((c) => ({ ...c, owners: ownersOf(c.workingDir, projects, repoPaths) }))
    // De pé primeiro; depois por nome.
    containers.sort((a, b) => Number(b.state === 'running') - Number(a.state === 'running') || a.name.localeCompare(b.name))
    return { available: true, error: null, containers }
  }
}
