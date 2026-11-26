import { themeCssVars, type AccentName } from '@shared/theme'

const KEY = 'berrante.theme'

export function applyTheme(accent: AccentName, tint: boolean): void {
  const root = document.documentElement
  for (const [name, value] of Object.entries(themeCssVars(accent, tint))) root.style.setProperty(name, value)
  try {
    localStorage.setItem(KEY, JSON.stringify({ accent, tint }))
  } catch {
    /* sem storage: só perde o pré-carregamento */
  }
}

/** Antes do primeiro IPC: último tema usado (ou azul tingido), para não piscar. */
export function applySavedTheme(): void {
  let saved: { accent?: AccentName; tint?: boolean } = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as typeof saved
  } catch {
    /* ignora */
  }
  applyTheme(saved.accent ?? 'azul', saved.tint ?? true)
}
