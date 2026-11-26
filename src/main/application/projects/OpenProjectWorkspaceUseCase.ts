import type { EditorGateway, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { GetProjectUseCase } from './GetProjectUseCase'
import { assertWorkspaceExists } from './assertWorkspace'

/** Abre no VS Code o `.code-workspace` salvo na tropa (o caminho nunca vem do renderer). */
export class OpenProjectWorkspaceUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly editor: EditorGateway,
    private readonly logger: Logger
  ) {}

  async execute(projectId: string): Promise<void> {
    const project = await this.getProject.execute(projectId)
    if (!project.workspaceFile) throw AppError.validation('Essa tropa não tem workspace do VS Code: configure em Editar tropa')
    await assertWorkspaceExists(this.editor, project.workspaceFile)
    await this.editor.openWorkspace(project.workspaceFile)
    this.logger.info('projects.workspace.open', { projectId })
  }
}
