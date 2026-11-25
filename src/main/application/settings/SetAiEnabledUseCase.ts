import type { Settings } from '@shared/types'
import type { SettingsRepository } from '@main/domain/repositories'
import type { Logger } from '@main/domain/ports'
import type { TotpGuard } from '../security/TotpGuard'

export class SetAiEnabledUseCase {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly guard: TotpGuard,
    private readonly logger: Logger
  ) {}

  async execute(enabled: boolean, totpCode?: string): Promise<Settings> {
    if (enabled) await this.guard.require('ai', totpCode)
    const next = { ...(await this.settings.get()), aiEnabled: enabled }
    await this.settings.save(next)
    this.logger.info('settings.ai', { enabled, cli: next.aiCli })
    return next
  }
}
