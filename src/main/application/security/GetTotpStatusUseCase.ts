import type { TotpStatus } from '@shared/types'
import type { TotpGuard } from './TotpGuard'

export class GetTotpStatusUseCase {
  constructor(private readonly guard: TotpGuard) {}

  async execute(): Promise<TotpStatus> {
    return { enabled: await this.guard.isEnabled(), recoveryCodesLeft: await this.guard.recoveryCodesLeft() }
  }
}
