/** Setup em andamento fica só em memória até o usuário confirmar com um código válido. */
export class PendingTotpSetup {
  private value: { secret: string; recoveryHashes: string[]; expiresAt: number } | null = null

  set(v: { secret: string; recoveryHashes: string[] }): void {
    this.value = { ...v, expiresAt: Date.now() + 10 * 60_000 }
  }

  take(): { secret: string; recoveryHashes: string[] } | null {
    const v = this.value
    if (!v || v.expiresAt < Date.now()) return null
    return v
  }

  clear(): void {
    this.value = null
  }
}
