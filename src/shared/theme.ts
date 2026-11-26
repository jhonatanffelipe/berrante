/**
 * Motor de tema. Único lugar com hex do app.
 * O usuário escolhe a cor de destaque; o fundo (preto/cinza) é tingido com o matiz dela,
 * como um painel de telemetria: azul → fundo azul-marinho quase preto, laranja → marrom quase preto etc.
 * Temas prontos (ex.: Drácula) trazem a paleta inteira e ignoram o "tingir".
 */

/** Paleta oficial do Drácula (draculatheme.com), mapeada para os tokens do app. */
const DRACULA = {
  bg: '#282a36',
  deep: '#2f3242',
  darker: '#21222c',
  line: '#44475a',
  fg: '#f8f8f2',
  comment: '#6272a4',
  accent: '#bd93f9',
  'on-accent': '#282a36',
  cyan: '#8be9fd',
  green: '#50fa7b',
  orange: '#ffb86c',
  pink: '#ff79c6',
  purple: '#bd93f9',
  red: '#ff5555',
  yellow: '#f1fa8c'
} as const

export const ACCENTS = {
  azul: { label: 'Azul', hex: '#2f8cff' },
  limao: { label: 'Verde-limão', hex: '#c6ff1a' },
  verde: { label: 'Verde', hex: '#22e07a' },
  ciano: { label: 'Ciano', hex: '#19d3f0' },
  laranja: { label: 'Laranja', hex: '#ff7a1a' },
  rosa: { label: 'Rosa', hex: '#ff3d9a' },
  roxo: { label: 'Roxo', hex: '#9b6bff' },
  vermelho: { label: 'Vermelho', hex: '#ff3b4e' },
  ambar: { label: 'Âmbar', hex: '#ffc21a' },
  dracula: { label: 'Drácula', hex: DRACULA.accent, preset: DRACULA }
} as const

export type AccentName = keyof typeof ACCENTS
export const ACCENT_NAMES = Object.keys(ACCENTS) as [AccentName, ...AccentName[]]

/** Tema pronto: paleta fixa, sem derivar do matiz. */
export function isPresetTheme(name: AccentName): boolean {
  return 'preset' in ACCENTS[name]
}

/** Cores fixas (status e cores das tropas): vivas, iguais em qualquer destaque. */
const FIXED = {
  cyan: '#3fd8f2',
  green: '#39e58c',
  orange: '#ff9a3c',
  pink: '#ff5fae',
  purple: '#a98bff',
  red: '#ff4d5e',
  yellow: '#ffd23f'
} as const

export type ThemeToken = 'bg' | 'deep' | 'darker' | 'line' | 'fg' | 'comment' | 'accent' | 'on-accent' | keyof typeof FIXED
export type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function rgbToHue([r, g, b]: Rgb): number {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  if (d === 0) return 0
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4
  h *= 60
  return h < 0 ? h + 360 : h
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sn = s / 100
  const ln = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

/**
 * Deriva a paleta inteira. Com `tint` desligado, o fundo fica cinza neutro (saturação 0)
 * e só os destaques têm cor.
 */
export function deriveTheme(accent: AccentName, tint: boolean): Record<ThemeToken, Rgb> {
  const def = ACCENTS[accent]
  if (def && 'preset' in def) {
    return Object.fromEntries(Object.entries(def.preset).map(([k, v]) => [k, hexToRgb(v)])) as Record<ThemeToken, Rgb>
  }
  const accentRgb = hexToRgb(ACCENTS[accent]?.hex ?? ACCENTS.azul.hex)
  const h = rgbToHue(accentRgb)
  const s = (v: number) => (tint ? v : 0)
  return {
    bg: hslToRgb(h, s(62), 6),
    deep: hslToRgb(h, s(48), 9.5),
    darker: hslToRgb(h, s(62), 4),
    line: hslToRgb(h, s(34), 18),
    fg: hslToRgb(h, s(30), 95),
    comment: hslToRgb(h, s(16), 62),
    accent: accentRgb,
    'on-accent': hslToRgb(h, s(60), 6),
    ...(Object.fromEntries(Object.entries(FIXED).map(([k, v]) => [k, hexToRgb(v)])) as Record<keyof typeof FIXED, Rgb>)
  }
}

/** Variáveis CSS (`--c-<token>: r g b`) para o Tailwind aplicar opacidade. */
export function themeCssVars(accent: AccentName, tint: boolean): Record<string, string> {
  return Object.fromEntries(Object.entries(deriveTheme(accent, tint)).map(([k, [r, g, b]]) => [`--c-${k}`, `${r} ${g} ${b}`]))
}

export function windowBackground(accent: AccentName, tint: boolean): string {
  return rgbToHex(deriveTheme(accent, tint).bg)
}
