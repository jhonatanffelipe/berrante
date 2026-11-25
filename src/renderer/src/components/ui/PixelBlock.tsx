import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import type { DraculaAccent } from '@shared/types'

const edge: Record<DraculaAccent | 'line', string> = {
  line: '[--edge:rgb(var(--c-line))]',
  cyan: '[--edge:rgb(var(--c-cyan))]',
  green: '[--edge:rgb(var(--c-green))]',
  orange: '[--edge:rgb(var(--c-orange))]',
  pink: '[--edge:rgb(var(--c-pink))]',
  purple: '[--edge:rgb(var(--c-purple))]',
  red: '[--edge:rgb(var(--c-red))]',
  yellow: '[--edge:rgb(var(--c-yellow))]'
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  accent?: DraculaAccent | 'line'
  size?: 'sm' | 'md'
}

/** Card em forma de "bloco": borda pixelada em degraus, sem cantos arredondados. */
export function PixelBlock({ accent = 'line', size = 'md', className, ...rest }: Props) {
  return <div className={cn('pixel-block', size === 'sm' && 'pixel-block-sm', edge[accent], className)} {...rest} />
}
