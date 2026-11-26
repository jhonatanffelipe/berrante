import { stat } from 'node:fs/promises'
import type { Settings } from '@shared/types'
import type { SettingsRepository } from '@main/domain/repositories'
import { AppError } from '@main/domain/errors/AppError'

export type SettingsPatch = Partial<Pick<Settings, 'cloneRoot' | 'aiCli' | 'accent' | 'tintBackground' | 'showGrid' | 'stopTimeoutMs'>>

/** aiEnabled fica de fora: só muda via SetAiEnabledUseCase (exige 2FA). */
export class UpdateSettingsUseCase {
  constructor(private readonly settings: SettingsRepository) {}

  async execute(patch: SettingsPatch): Promise<Settings> {
    if (patch.cloneRoot) {
      const info = await stat(patch.cloneRoot).catch(() => null)
      if (!info?.isDirectory()) throw AppError.validation('A pasta raiz precisa existir')
    }
    const next = { ...(await this.settings.get()), ...patch }
    await this.settings.save(next)
    return next
  }
}
