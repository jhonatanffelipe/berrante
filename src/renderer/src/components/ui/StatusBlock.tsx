import type { ServiceStatus } from '@shared/types'
import { accentBg, statusAccent, statusLabel } from '../../lib/accent'
import { Badge } from './Badge'

/** Status do serviço como badge contornado; "subindo" pisca. */
export function StatusBlock({ status, extra, withLabel = true }: { status: ServiceStatus; extra?: string; withLabel?: boolean }) {
  if (!withLabel) {
    const tone = statusAccent[status]
    return <span className={`inline-block h-2 w-2 rounded-[1px] ${accentBg[tone]} ${status === 'starting' ? 'animate-blink' : ''}`} title={statusLabel[status]} />
  }
  return (
    <Badge tone={statusAccent[status]} blink={status === 'starting'}>
      {statusLabel[status]}
      {extra ? <span className="font-normal opacity-80">{extra}</span> : null}
    </Badge>
  )
}
