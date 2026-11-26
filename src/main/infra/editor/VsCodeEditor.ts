import { stat } from 'node:fs/promises'
import type { CommandRunner, EditorGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

const VSCODE_BUNDLE_ID = 'com.microsoft.VSCode'

/** Abre pelo bundle id do macOS: funciona mesmo sem o comando `code` instalado no PATH. */
export class VsCodeEditor implements EditorGateway {
  constructor(private readonly runner: CommandRunner) {}

  async workspaceExists(path: string): Promise<boolean> {
    try {
      return (await stat(path)).isFile()
    } catch {
      return false
    }
  }

  async openWorkspace(path: string): Promise<void> {
    const { code, stderr } = await this.runner.run('open', ['-b', VSCODE_BUNDLE_ID, path], { timeoutMs: 15_000 })
    if (code !== 0) {
      const missing = /Unable to find application/i.test(stderr)
      throw new AppError('NOT_FOUND', missing ? 'VS Code não encontrado: instale o Visual Studio Code em Aplicativos' : 'Não deu para abrir o VS Code', { output: stderr })
    }
  }
}
