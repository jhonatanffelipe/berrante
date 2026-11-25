import type { TotpSetup } from '@shared/types'
import type { Hasher, TotpGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { TotpGuard } from './TotpGuard'
import { generateRecoveryCodes } from './RecoveryCodes'
import type { PendingTotpSetup } from './PendingTotpSetup'

export class BeginTotpSetupUseCase {
  constructor(
    private readonly guard: TotpGuard,
    private readonly totp: TotpGateway,
    private readonly hasher: Hasher,
    private readonly pending: PendingTotpSetup
  ) {}

  async execute(): Promise<TotpSetup> {
    if (await this.guard.isEnabled()) throw new AppError('CONFLICT', '2FA já está ativo. Desative antes de reconfigurar.')
    const secret = this.totp.generateSecret()
    const uri = this.totp.uri(secret, 'Berrante', 'Berrante')
    const recovery = generateRecoveryCodes(this.hasher)
    this.pending.set({ secret, recoveryHashes: recovery.hashes })
    return { otpauthUri: uri, qrDataUrl: await this.totp.qrDataUrl(uri), secret, recoveryCodes: recovery.codes }
  }
}
