import type { ServiceStatus } from '@shared/types'
import { accentBg, statusAccent, statusLabel } from '../../lib/accent'
import { cn } from '../../lib/cn'

/** Status como um bloquinho colorido + rótulo. "subindo" pisca. */
export function StatusBlock({ status, withLabel = true }: { status: ServiceStatus; withLabel?: boolean }) {
  const accent = statusAccent[status]
  return (
    <span className="inline-flex items-center gap-2" title={statusLabel[status]}>
      <span className={cn('pixel-cell inline-block h-3 w-3', accent === 'line' ? 'bg-line' : accentBg[accent], status === 'starting' && 'animate-blink')} />
      {withLabel && <span className="font-terminal text-lg leading-none text-fg/90">{statusLabel[status]}</span>}
    </span>
  )
}
