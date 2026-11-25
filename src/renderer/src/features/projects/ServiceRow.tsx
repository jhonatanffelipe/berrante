import { useState } from 'react'
import type { RunningProcess, ServiceDefinition } from '@shared/types'
import { runtimeKey } from '@shared/runtime'
import { call, errorMessage } from '../../lib/api'
import { accentBg } from '../../lib/accent'
import { cn } from '../../lib/cn'
import { uptime } from '../../lib/format'
import { StatusBlock } from '../../components/ui/StatusBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { Tip } from '../../components/ui/Term'
import { useToast } from '../../components/ui/Toast'
import { LogViewer } from '../runtime/LogViewer'

const KIND_LABEL: Record<ServiceDefinition['kind'], string> = { setup: 'preparo', compose: 'container', script: 'script', command: 'comando' }

interface Props {
  projectId: string
  service: ServiceDefinition
  state: RunningProcess | undefined
  now: number
}

export function ServiceRow({ projectId, service, state, now }: Props) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const status = state?.status ?? 'idle'
  const active = status === 'running' || status === 'starting'

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

  return (
    <div className={cn('bg-bg/60', !service.enabled && 'opacity-60')}>
      <div className="flex items-center gap-3 px-3 py-2">
        <span className={cn('pixel-cell h-6 w-2', accentBg[service.color])} />
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <div className="flex items-center gap-2">
            <span className="truncate text-fg">{service.name}</span>
            <span className="bg-line px-1.5 font-pixel text-[7px] uppercase text-comment">{KIND_LABEL[service.kind]}</span>
            {!service.enabled ? <span className="font-pixel text-[7px] uppercase text-comment">fora do play</span> : null}
            {service.origin === 'ai' ? <span className="bg-purple/20 px-1.5 font-pixel text-[7px] uppercase text-purple">IA</span> : null}
          </div>
          <p className="truncate text-xs text-comment">{service.kind === 'compose' ? `docker compose · ${service.command}` : service.command}</p>
        </button>
        <StatusBlock status={status} />
        <div className="w-44 text-right font-terminal text-lg leading-none text-comment">
          {state?.container ? (
            <span title={state.container.name}>
              {state.container.state}
              {state.container.health ? ` · ${state.container.health}` : ''}
            </span>
          ) : state?.pid ? (
            <span>pid {state.pid}</span>
          ) : null}
          {state?.ports.length ? <span className="ml-2 text-cyan">:{state.ports.join(' :')}</span> : null}
          {active ? <span className="ml-2">{uptime(state?.startedAt ?? null, now)}</span> : null}
        </div>
        <div className="flex gap-1">
          {active ? (
            <>
              <Tip label="Reiniciar">
                <PixelButton size="sm" accent="yellow" disabled={busy} onClick={() => void act('runtime:restartService')} aria-label="Reiniciar">↻</PixelButton>
              </Tip>
              <Tip label="Parar">
                <PixelButton size="sm" accent="red" disabled={busy} onClick={() => void act('runtime:stopService')} aria-label="Parar">■</PixelButton>
              </Tip>
            </>
          ) : (
            <Tip label="Subir só este">
              <PixelButton size="sm" accent="green" disabled={busy} onClick={() => void act('runtime:startService')} aria-label="Subir">▶</PixelButton>
            </Tip>
          )}
          <Tip label={open ? 'Esconder log' : 'Ver log'}>
            <PixelButton size="sm" onClick={() => setOpen((o) => !o)} aria-label="Log">≡</PixelButton>
          </Tip>
        </div>
      </div>
      {open ? <LogViewer logKey={runtimeKey(projectId, service.id)} /> : null}
    </div>
  )
}
