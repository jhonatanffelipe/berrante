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
  /** Avisos do sistema quando a boiada sobe, um passo falha ou um serviço cai. */
  notifications: boolean
  /** App usado em "Abrir terminal na pasta". */
  terminalApp: TerminalApp
  stopTimeoutMs: number
}

export const MAC_TERMINAL_APPS = ['Terminal', 'iTerm', 'Warp', 'Ghostty'] as const
export const WINDOWS_TERMINAL_APPS = ['Windows Terminal', 'PowerShell', 'Prompt de Comando', 'Git Bash'] as const
export const TERMINAL_APPS = [...MAC_TERMINAL_APPS, ...WINDOWS_TERMINAL_APPS] as const
/** Terminais oferecidos nas configurações em cada sistema. */
export const terminalAppsFor = (platform: string): readonly TerminalApp[] => (platform === 'win32' ? WINDOWS_TERMINAL_APPS : MAC_TERMINAL_APPS)
export type TerminalApp = (typeof TERMINAL_APPS)[number]

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
