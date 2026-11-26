import type { LocalRepository } from '@shared/types'
import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'
import type { ShellGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { repoForPath } from './SaveStartupPlanUseCase'

/** Seletor de pasta de um passo do workflow: abre na pasta atual e só aceita pastas dentro da tropa. */
export class PickStepFolderUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository,
    private readonly shell: ShellGateway
  ) {}

  async execute(projectId: string, defaultPath?: string): Promise<string | null> {
    const project = await this.projects.findById(projectId)
    if (!project) throw AppError.notFound('Tropa')
    const repos = (await Promise.all(project.repositoryIds.map((id) => this.repos.findById(id)))).filter((r): r is LocalRepository => r !== null)
    const folder = await this.shell.pickFolder('Pasta onde o comando roda', defaultPath ?? repos[0]?.path)
    if (!folder) return null
    if (!repoForPath(repos, folder)) throw AppError.validation('Escolha uma pasta dentro de um dos repositórios da tropa')
    return folder
  }
}
