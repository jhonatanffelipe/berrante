import type { Settings } from '@shared/types'
import type { SettingsRepository } from '@main/domain/repositories'
import type { Workspace } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

export type SettingsPatch = Partial<Pick<Settings, 'cloneRoot' | 'aiCli' | 'accent' | 'tintBackground' | 'showGrid' | 'stopTimeoutMs' | 'wslDistro'>>

/** aiEnabled fica de fora: só muda via SetAiEnabledUseCase (exige 2FA). */
export class UpdateSettingsUseCase {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly workspace: Workspace,
    private readonly onChange: (next: Settings, previous: Settings) => void = () => undefined
  ) {}

  async execute(patch: SettingsPatch): Promise<Settings> {
    if (patch.cloneRoot && !(await this.workspace.isDirectory(patch.cloneRoot))) throw AppError.validation('A pasta raiz precisa existir')
    const previous = await this.settings.get()
    const next = { ...previous, ...patch }
    await this.settings.save(next)
    this.onChange(next, previous)
    return next
  }
}
