import type { TotpStatus } from '@shared/types'
import type { SecretStore } from '@main/domain/repositories'
import type { TotpGateway, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { PendingTotpSetup } from './PendingTotpSetup'

export class ConfirmTotpSetupUseCase {
  constructor(
    private readonly pending: PendingTotpSetup,
    private readonly totp: TotpGateway,
    private readonly secrets: SecretStore,
    private readonly logger: Logger
  ) {}

  async execute(code: string): Promise<TotpStatus> {
    const setup = this.pending.take()
    if (!setup) throw new AppError('VALIDATION', 'Configuração expirada. Gere um novo QR code.')
    const step = await this.totp.verify(setup.secret, code, null)
    if (step === null) throw new AppError('TOTP_INVALID', 'Código inválido. Confira o horário do dispositivo.')
    await this.secrets.set('totp.secret', setup.secret)
    await this.secrets.set('totp.recovery', JSON.stringify(setup.recoveryHashes))
    await this.secrets.set('totp.lastStep', String(step))
    this.pending.clear()
    this.logger.info('security.totp.enabled')
    return { enabled: true, recoveryCodesLeft: setup.recoveryHashes.length }
  }
}
