import type { ShellGateway } from '@main/domain/ports'
import type { SettingsRepository } from '@main/domain/repositories'

/** Seletor do `.code-workspace` da tropa: abre no arquivo atual ou na pasta raiz dos clones. */
export class PickWorkspaceFileUseCase {
  constructor(
    private readonly shell: ShellGateway,
    private readonly settings: SettingsRepository
  ) {}

  async execute(defaultPath?: string): Promise<string | null> {
    const start = defaultPath ?? (await this.settings.get()).cloneRoot
    return this.shell.pickFile('Workspace do VS Code', { name: 'Workspace do VS Code', extensions: ['code-workspace'] }, start)
  }
}
