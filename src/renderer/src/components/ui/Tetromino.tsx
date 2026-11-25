import type { BlockShape, DraculaAccent } from '@shared/types'
import { accentBg } from '../../lib/accent'
import { cn } from '../../lib/cn'

/** Coordenadas [x, y] dos 4 quadrados de cada formato. */
export const SHAPES: Record<BlockShape, [number, number][]> = {
  bar: [[0, 0], [1, 0], [2, 0], [3, 0]],
  square: [[0, 0], [1, 0], [0, 1], [1, 1]],
  tee: [[0, 0], [1, 0], [2, 0], [1, 1]],
  ell: [[0, 0], [0, 1], [0, 2], [1, 2]],
  jay: [[1, 0], [1, 1], [1, 2], [0, 2]],
  ess: [[1, 0], [2, 0], [0, 1], [1, 1]],
  zed: [[0, 0], [1, 0], [1, 1], [2, 1]]
}

interface Props {
  shape: BlockShape
  accent: DraculaAccent
  cell?: number
  className?: string
}

/** Bloco decorativo de 4 quadrados (ícone de tropa, sidebar, empty state). */
export function Tetromino({ shape, accent, cell = 8, className }: Props) {
  const cells = SHAPES[shape]
  const w = Math.max(...cells.map(([x]) => x)) + 1
  const h = Math.max(...cells.map(([, y]) => y)) + 1
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: w * cell, height: h * cell }} aria-hidden>
      {cells.map(([x, y]) => (
        <span key={`${x}-${y}`} className={cn('pixel-cell absolute', accentBg[accent])} style={{ left: x * cell, top: y * cell, width: cell, height: cell }} />
      ))}
    </div>
  )
}
