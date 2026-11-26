import { useState } from 'react'
import type { RunningProcess, ServiceDefinition } from '@shared/types'
import { runtimeKey } from '@shared/runtime'
import { call, errorMessage } from '../../lib/api'
import { accentBg } from '../../lib/accent'
import { cn } from '../../lib/cn'
import { uptime } from '../../lib/format'
import { StatusBlock } from '../../components/ui/StatusBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { SegmentBar } from '../../components/ui/SegmentBar'
import { Badge } from '../../components/ui/Badge'
import { Tip } from '../../components/ui/Term'
import { useToast } from '../../components/ui/Toast'
import { LogViewer } from '../runtime/LogViewer'

const KIND_LABEL: Record<ServiceDefinition['kind'], string> = { setup: 'preparo', compose: 'container', script: 'script', command: 'comando' }

interface Props {
  index: number
  projectId: string
  service: ServiceDefinition
  state: RunningProcess | undefined
  now: number
}

/** Linha de serviço no estilo painel: índice, título + status, comando, medidor e valor à direita. */
export function ServiceRow({ index, projectId, service, state, now }: Props) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const status = state?.status ?? 'idle'
  const active = status === 'running' || status === 'starting'
  const meter = status === 'running' || status === 'exited' ? 1 : status === 'starting' ? 0.45 : 0

  const act = async (channel: 'runtime:startService' | 'runtime:stopService' | 'runtime:restartService') => {
    setBusy(true)
    try {
      await call(channel, { projectId, serviceId: service.id })
      if (channel !== 'runtime:stopService') setOpen(true)
    } catch (err) {
      toast({ title: `Falha em ${service.name}`, body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const value = state?.ports.length ? `:${state.ports.join(' :')}` : state?.container ? (state.container.health ?? state.container.state) : state?.pid ? `pid ${state.pid}` : '—'

  return (
    <div className={cn(!service.enabled && 'opacity-55')}>
      <div className="flex items-center gap-5 px-5 py-3.5">
        <span className="w-6 font-mono text-[15px] text-comment">{String(index).padStart(2, '0')}</span>
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[1px]', accentBg[service.color])} />
            <span className="title truncate">{service.name}</span>
            <StatusBlock status={status} extra={active && state?.startedAt ? uptime(state.startedAt, now) : undefined} />
            <Badge>{KIND_LABEL[service.kind]}</Badge>
            {!service.enabled ? <Badge>fora do play</Badge> : null}
            {service.origin === 'ai' ? <Badge tone="purple">IA</Badge> : null}
          </div>
          <p className="mt-1 truncate font-mono text-xs text-comment">{service.kind === 'compose' ? `docker compose · ${service.command}${state?.container ? ` · ${state.container.name}` : ''}` : service.command}</p>
        </button>
        <SegmentBar value={meter} segments={20} tone={status === 'crashed' ? 'red' : status === 'exited' ? 'cyan' : 'accent'} className={cn('hidden lg:flex', status === 'starting' && 'animate-blink')} height={14} />
        <span className={cn('w-28 truncate text-right font-mono text-[15px] font-bold', state?.ports.length ? 'text-fg' : 'text-comment')} title={value}>
          {value}
        </span>
        <div className="flex gap-1.5">
          {active ? (
            <>
              <Tip label="Reiniciar">
                <PixelButton size="icon" disabled={busy} onClick={() => void act('runtime:restartService')} aria-label="Reiniciar">↻</PixelButton>
              </Tip>
              <Tip label="Parar">
                <PixelButton size="icon" disabled={busy} className="text-red" onClick={() => void act('runtime:stopService')} aria-label="Parar">■</PixelButton>
              </Tip>
            </>
          ) : (
            <Tip label="Subir só este">
              <PixelButton size="icon" disabled={busy} onClick={() => void act('runtime:startService')} aria-label="Subir">▶</PixelButton>
            </Tip>
          )}
          <Tip label={open ? 'Esconder log' : 'Ver log'}>
            <PixelButton size="icon" className={cn(open && 'text-accent')} onClick={() => setOpen((o) => !o)} aria-label="Log">≡</PixelButton>
          </Tip>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line/60">
          <LogViewer logKey={runtimeKey(projectId, service.id)} />
        </div>
      ) : null}
    </div>
  )
}
