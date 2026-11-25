import type { SecretStore } from '@main/domain/repositories'
import type { Clock, Hasher, TotpGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

export type TotpScope = 'ai' | 'kill' | 'manage'

const ELEVATION_MS = 5 * 60_000
const MAX_FAILURES = 5
const LOCKOUT_MS = 60_000

/**
 * Serviço de aplicação do 2FA: verifica TOTP ou código de recuperação, bloqueia replay
 * e concede uma "elevação" curta por escopo para não pedir o código a cada clique.
 */
export class TotpGuard {
  private elevatedUntil = new Map<TotpScope, number>()
  private failures = 0
  private lockedUntil = 0

  constructor(
    private readonly secrets: SecretStore,
    private readonly totp: TotpGateway,
    private readonly hasher: Hasher,
    private readonly clock: Clock
  ) {}

  async isEnabled(): Promise<boolean> {
    return (await this.secrets.get('totp.secret')) !== null
  }

  async recoveryCodesLeft(): Promise<number> {
    const raw = await this.secrets.get('totp.recovery')
    return raw ? (JSON.parse(raw) as string[]).length : 0
  }

  /** Valida sem exigir elevação (usado para habilitar/desabilitar). */
  async verifyCode(code: string): Promise<void> {
    const now = this.clock.now().getTime()
    if (now < this.lockedUntil) throw new AppError('TOTP_INVALID', 'Muitas tentativas. Aguarde um minuto.')
    const secret = await this.secrets.get('totp.secret')
    if (!secret) throw new AppError('TOTP_NOT_CONFIGURED', 'Configure o 2FA nas configurações primeiro')

    const ok = /^\d{6}$/.test(code) ? await this.checkTotp(secret, code) : await this.consumeRecovery(code)
    if (!ok) {
      this.failures++
      if (this.failures >= MAX_FAILURES) {
        this.lockedUntil = now + LOCKOUT_MS
        this.failures = 0
      }
      throw new AppError('TOTP_INVALID', 'Código 2FA inválido')
    }
    this.failures = 0
  }

  async require(scope: TotpScope, code?: string): Promise<void> {
    if (!(await this.isEnabled())) throw new AppError('TOTP_NOT_CONFIGURED', 'Essa ação exige 2FA. Configure nas configurações.')
    if ((this.elevatedUntil.get(scope) ?? 0) > this.clock.now().getTime()) return
    if (!code) throw new AppError('TOTP_REQUIRED', 'Informe o código do autenticador', { scope })
    await this.verifyCode(code)
    this.elevatedUntil.set(scope, this.clock.now().getTime() + ELEVATION_MS)
  }

  revokeElevation(): void {
    this.elevatedUntil.clear()
  }

  private async checkTotp(secret: string, code: string): Promise<boolean> {
    const last = await this.secrets.get('totp.lastStep')
    const step = await this.totp.verify(secret, code, last ? Number(last) : null)
    if (step === null) return false
    await this.secrets.set('totp.lastStep', String(step))
    return true
  }

  private async consumeRecovery(code: string): Promise<boolean> {
    const raw = await this.secrets.get('totp.recovery')
    if (!raw) return false
    const hashes = JSON.parse(raw) as string[]
    const hash = this.hasher.hash(code.trim().toLowerCase())
    if (!hashes.includes(hash)) return false
    await this.secrets.set('totp.recovery', JSON.stringify(hashes.filter((h) => h !== hash)))
    return true
  }
}
