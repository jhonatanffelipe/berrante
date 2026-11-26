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
  /** Windows: distro WSL onde os repositórios vivem e os comandos rodam (null = distro padrão). */
  wslDistro: string | null
}

/** Estado da WSL no Windows (ou `supported: false` nos outros sistemas). */
export interface WslStatus {
  supported: boolean
  installed: boolean
  distros: { name: string; isDefault: boolean; version: number | null }[]
  /** Distro em uso (a escolhida ou a padrão). */
  current: string | null
  home: string | null
  tools: { name: string; available: boolean; hint: string }[]
  error: string | null
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
