import type { Settings } from '@shared/types'
import type { SettingsRepository } from '@main/domain/repositories'

export class GetSettingsUseCase {
  constructor(private readonly settings: SettingsRepository) {}
  execute(): Promise<Settings> {
    return this.settings.get()
  }
}
