import type { EditorGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

export async function assertWorkspaceExists(editor: EditorGateway, path: string | null | undefined): Promise<void> {
  if (path && !(await editor.workspaceExists(path))) throw AppError.validation(`Workspace não encontrado: ${path}`)
}
