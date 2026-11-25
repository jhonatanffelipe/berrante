import type { AiCliName } from './startup'

export type ThemeName = 'dracula' | 'alucard'

export interface Settings {
  cloneRoot: string
  aiCli: AiCliName
  aiEnabled: boolean
  theme: ThemeName
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
