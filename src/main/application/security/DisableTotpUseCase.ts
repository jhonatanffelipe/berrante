import type { TotpStatus } from '@shared/types'
import type { SecretStore, SettingsRepository } from '@main/domain/repositories'
import type { Logger } from '@main/domain/ports'
import type { TotpGuard } from './TotpGuard'

/** Desligar o 2FA também desliga a integração com IA (que depende dele). */
export class DisableTotpUseCase {
  constructor(
    private readonly guard: TotpGuard,
    private readonly secrets: SecretStore,
    private readonly settings: SettingsRepository,
    private readonly logger: Logger
  ) {}

  async execute(code: string): Promise<TotpStatus> {
    await this.guard.verifyCode(code)
    await this.secrets.delete('totp.secret')
    await this.secrets.delete('totp.recovery')
    await this.secrets.delete('totp.lastStep')
    this.guard.revokeElevation()
    const s = await this.settings.get()
    if (s.aiEnabled) await this.settings.save({ ...s, aiEnabled: false })
    this.logger.info('security.totp.disabled')
    return { enabled: false, recoveryCodesLeft: 0 }
  }
}
