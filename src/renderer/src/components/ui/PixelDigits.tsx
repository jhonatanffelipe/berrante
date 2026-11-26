import { cn } from '../../lib/cn'

/** Fonte dot-matrix 5x7 desenhada em blocos (números grandes do painel). */
const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
}

interface Props {
  value: string | number
  /** Lado de cada bloco em px. */
  cell?: number
  className?: string
  /** Classe de cor (fill) dos blocos acesos. */
  tone?: string
}

export function PixelDigits({ value, cell = 7, className, tone = 'fill-accent' }: Props) {
  const chars = String(value).split('').filter((c) => GLYPHS[c])
  const gap = Math.max(1, Math.round(cell / 6))
  const step = cell + gap
  const charW = 5 * step
  const spacing = step
  const width = chars.length * charW + Math.max(0, chars.length - 1) * spacing
  const height = 7 * step
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0 drop-shadow-[0_0_10px_rgb(var(--c-accent)/0.35)]', className)}
      role="img"
      aria-label={String(value)}
    >
      {chars.map((ch, ci) =>
        GLYPHS[ch]!.flatMap((row, y) =>
          row.split('').map((bit, x) =>
            bit === '1' ? (
              <rect key={`${ci}-${x}-${y}`} x={ci * (charW + spacing) + x * step} y={y * step} width={cell} height={cell} rx={cell > 5 ? 1 : 0} className={tone} />
            ) : null
          )
        )
      )}
    </svg>
  )
}
