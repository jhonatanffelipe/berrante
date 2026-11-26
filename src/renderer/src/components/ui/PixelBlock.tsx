import type { HTMLAttributes } from 'react'
import { accentEdge, type Tone } from '../../lib/accent'
import { cn } from '../../lib/cn'

interface Props extends HTMLAttributes<HTMLDivElement> {
  accent?: Tone
  size?: 'sm' | 'md'
  glow?: boolean
}

/** Painel de telemetria: fundo levemente mais claro que a página, borda de 1px tingida. */
export function PixelBlock({ accent = 'line', size = 'md', glow = false, className, ...rest }: Props) {
  return <div className={cn('pixel-block', size === 'sm' && 'pixel-block-sm', glow && 'pixel-block-glow', accentEdge[accent], className)} {...rest} />
}
