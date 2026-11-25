import type { SecretStore } from '@main/domain/repositories'
import type { Hasher } from '@main/domain/ports'
import type { TotpGuard } from './TotpGuard'
import { generateRecoveryCodes } from './RecoveryCodes'

export class RegenerateRecoveryCodesUseCase {
  constructor(
    private readonly guard: TotpGuard,
    private readonly secrets: SecretStore,
    private readonly hasher: Hasher
  ) {}

  async execute(code: string): Promise<string[]> {
    await this.guard.verifyCode(code)
    const { codes, hashes } = generateRecoveryCodes(this.hasher)
    await this.secrets.set('totp.recovery', JSON.stringify(hashes))
    return codes
  }
}
