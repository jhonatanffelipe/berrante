import { accentBg, type Tone } from '../../lib/accent'
import { cn } from '../../lib/cn'

interface Props {
  /** 0..1 */
  value: number
  segments?: number
  tone?: Tone
  className?: string
  height?: number
}

/** Barra de progresso em blocos, como um medidor de equalizador. */
export function SegmentBar({ value, segments = 24, tone = 'accent', className, height = 16 }: Props) {
  const lit = Math.round(Math.max(0, Math.min(1, value)) * segments)
  return (
    <div className={cn('flex gap-[3px]', className)} role="meter" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn('w-[7px] rounded-[1px]', i < lit ? cn(accentBg[tone], 'shadow-[0_0_6px_rgb(var(--c-accent)/0.45)]') : 'bg-line/50')}
          style={{ height }}
        />
      ))}
    </div>
  )
}
