import type { DraculaAccent, ServiceStatus } from '@shared/types'

export type Tone = DraculaAccent | 'accent' | 'line'

/** Classes completas (o JIT do Tailwind precisa ver as strings inteiras). */
export const accentBg: Record<Tone, string> = {
  cyan: 'bg-cyan',
  green: 'bg-green',
  orange: 'bg-orange',
  pink: 'bg-pink',
  purple: 'bg-purple',
  red: 'bg-red',
  yellow: 'bg-yellow',
  accent: 'bg-accent',
  line: 'bg-line'
}

export const accentText: Record<Tone, string> = {
  cyan: 'text-cyan',
  green: 'text-green',
  orange: 'text-orange',
  pink: 'text-pink',
  purple: 'text-purple',
  red: 'text-red',
  yellow: 'text-yellow',
  accent: 'text-accent',
  line: 'text-comment'
}

/** Botão: preenchido com a cor (texto escuro) ou contornado ("line"). */
export const accentFace: Record<Tone, string> = {
  cyan: '[--face:rgb(var(--c-cyan))] [--edge:rgb(var(--c-cyan))] text-on-accent',
  green: '[--face:rgb(var(--c-green))] [--edge:rgb(var(--c-green))] text-on-accent',
  orange: '[--face:rgb(var(--c-orange))] [--edge:rgb(var(--c-orange))] text-on-accent',
  pink: '[--face:rgb(var(--c-pink))] [--edge:rgb(var(--c-pink))] text-on-accent',
  purple: '[--face:rgb(var(--c-purple))] [--edge:rgb(var(--c-purple))] text-on-accent',
  red: '[--face:rgb(var(--c-red))] [--edge:rgb(var(--c-red))] text-on-accent',
  yellow: '[--face:rgb(var(--c-yellow))] [--edge:rgb(var(--c-yellow))] text-on-accent',
  accent: '[--face:rgb(var(--c-accent))] [--edge:rgb(var(--c-accent))] text-on-accent',
  line: '[--face:rgb(var(--c-deep))] text-fg hover:[--edge:rgb(var(--c-accent)/0.6)]'
}

/** Borda tingida para painéis/badges. */
export const accentEdge: Record<Tone, string> = {
  cyan: '[--edge:rgb(var(--c-cyan)/0.55)]',
  green: '[--edge:rgb(var(--c-green)/0.55)]',
  orange: '[--edge:rgb(var(--c-orange)/0.55)]',
  pink: '[--edge:rgb(var(--c-pink)/0.55)]',
  purple: '[--edge:rgb(var(--c-purple)/0.55)]',
  red: '[--edge:rgb(var(--c-red)/0.55)]',
  yellow: '[--edge:rgb(var(--c-yellow)/0.55)]',
  accent: '[--edge:rgb(var(--c-accent)/0.8)]',
  line: '[--edge:rgb(var(--c-line))]'
}

export const statusAccent: Record<ServiceStatus, Tone> = {
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
