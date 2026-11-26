import type { AiCliName } from './startup'

import type { AccentName } from '../theme'
export type { AccentName } from '../theme'

export interface Settings {
  cloneRoot: string
  aiCli: AiCliName
  aiEnabled: boolean
  /** Cor de destaque; o fundo é tingido com o matiz dela. */
  accent: AccentName
  tintBackground: boolean
  showGrid: boolean
  stopTimeoutMs: number
}

export interface TotpStatus {
  enabled: boolean
  recoveryCodesLeft: number
}

export interface TotpSetup {
  otpauthUri: string
  qrDataUrl: string
  secret: string
  recoveryCodes: string[]
}

export interface AiCliStatus {
  name: AiCliName
  path: string
  available: boolean
}
