import type { ReactNode } from 'react'
import { type Tone } from '../../lib/accent'
import { cn } from '../../lib/cn'

const STYLE: Record<Tone, string> = {
  green: 'border-green/60 bg-green/10 text-green',
  red: 'border-red/60 bg-red/10 text-red',
  yellow: 'border-yellow/60 bg-yellow/10 text-yellow',
  orange: 'border-orange/60 bg-orange/10 text-orange',
  cyan: 'border-cyan/60 bg-cyan/10 text-cyan',
  pink: 'border-pink/60 bg-pink/10 text-pink',
  purple: 'border-purple/60 bg-purple/10 text-purple',
  accent: 'border-accent/60 bg-accent/10 text-accent',
  line: 'border-line bg-darker/60 text-comment'
}

/** Etiqueta contornada em mono (ex: "RODANDO 12m", "PDF OK"). */
export function Badge({ tone = 'line', children, className, blink }: { tone?: Tone; children: ReactNode; className?: string; blink?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-[1px] font-mono text-[10px] font-bold uppercase tracking-[0.12em]', STYLE[tone], blink && 'animate-blink', className)}>
      {children}
    </span>
  )
}
