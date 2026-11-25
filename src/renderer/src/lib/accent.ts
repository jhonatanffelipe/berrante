import type { DraculaAccent, ServiceStatus } from '@shared/types'

/** Classes completas (o JIT do Tailwind precisa ver as strings inteiras). */
export const accentBg: Record<DraculaAccent, string> = {
  cyan: 'bg-cyan',
  green: 'bg-green',
  orange: 'bg-orange',
  pink: 'bg-pink',
  purple: 'bg-purple',
  red: 'bg-red',
  yellow: 'bg-yellow'
}

export const accentText: Record<DraculaAccent, string> = {
  cyan: 'text-cyan',
  green: 'text-green',
  orange: 'text-orange',
  pink: 'text-pink',
  purple: 'text-purple',
  red: 'text-red',
  yellow: 'text-yellow'
}

/** Cor da "face" dos botões pixelados (var usada pelo .pixel-btn). */
export const accentFace: Record<DraculaAccent | 'line', string> = {
  cyan: '[--face:rgb(var(--c-cyan))] text-bg',
  green: '[--face:rgb(var(--c-green))] text-bg',
  orange: '[--face:rgb(var(--c-orange))] text-bg',
  pink: '[--face:rgb(var(--c-pink))] text-bg',
  purple: '[--face:rgb(var(--c-purple))] text-bg',
  red: '[--face:rgb(var(--c-red))] text-bg',
  yellow: '[--face:rgb(var(--c-yellow))] text-bg',
  line: '[--face:rgb(var(--c-line))] text-fg'
}

export const statusAccent: Record<ServiceStatus, DraculaAccent | 'line'> = {
  idle: 'line',
  starting: 'yellow',
  running: 'green',
  crashed: 'red',
  stopped: 'line',
  exited: 'cyan'
}

export const statusLabel: Record<ServiceStatus, string> = {
  idle: 'parado',
  starting: 'subindo',
  running: 'rodando',
  crashed: 'caiu',
  stopped: 'recolhido',
  exited: 'concluído'
}
