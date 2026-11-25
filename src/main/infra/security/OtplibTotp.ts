import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'
import { createHash, randomBytes } from 'node:crypto'
import type { Hasher, TotpGateway } from '@main/domain/ports'

const PERIOD = 30

export class OtplibTotp implements TotpGateway {
  generateSecret(): string {
    return generateSecret()
  }

  uri(secret: string, label: string, issuer: string): string {
    return generateURI({ issuer, label, secret })
  }

  /** Aceita ±1 janela (30s) e rejeita time steps já usados (replay). */
  async verify(secret: string, code: string, afterTimeStep: number | null): Promise<number | null> {
    const result = await verify({ secret, token: code, epochTolerance: PERIOD, ...(afterTimeStep !== null ? { afterTimeStep } : {}) })
    if (!result.valid) return null
    const step = (result as { timeStep?: number }).timeStep
    return typeof step === 'number' ? step : Math.floor(Date.now() / 1000 / PERIOD)
  }

  qrDataUrl(uri: string): Promise<string> {
    return QRCode.toDataURL(uri, { margin: 1, width: 240, color: { dark: '#282a36', light: '#f8f8f2' } })
  }
}

export class NodeHasher implements Hasher {
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }
  randomToken(bytes: number): string {
    return randomBytes(bytes).toString('hex')
  }
}
