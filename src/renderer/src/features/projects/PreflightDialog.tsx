import { useState } from 'react'
import type { Preflight } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { Dialog } from '../../components/ui/Dialog'
import { PixelButton } from '../../components/ui/PixelButton'
import { useToast } from '../../components/ui/Toast'
import { PortChangePanel } from './PortChangePanel'
import { shortPaths } from '../../lib/format'

interface Props {
  projectId: string
  preflight: Preflight | null
  /** "Subir mesmo assim"; ausente quando a vistoria foi só uma conferência. */
  onPlayAnyway?: () => void
  onRecheck: () => Promise<void>
  onClose: () => void
  onOpenPorts: () => void
}

/** Vistoria do pasto: portas ocupadas e `.env` incompletos antes de tocar o berrante. */
export function PreflightDialog({ projectId, preflight, onPlayAnyway, onRecheck, onClose, onOpenPorts }: Props) {
  const toast = useToast()
  const [fixing, setFixing] = useState<string | null>(null)
  const [changing, setChanging] = useState<string | null>(null)

  const fix = async (repoId: string, repoName: string) => {
    setFixing(repoId)
    try {
      await call('projects:fixEnv', { projectId, repoId })
      toast({ title: `.env de ${repoName} em dia`, body: 'Confira os valores: vieram do exemplo.', accent: 'green' })
      await onRecheck()
    } catch (err) {
      toast({ title: 'Não mexeu no .env', body: errorMessage(err), accent: 'red' })
    } finally {
      setFixing(null)
    }
  }

  const conflicts = preflight?.conflicts ?? []
  const env = preflight?.env ?? []

  return (
    <Dialog open={preflight !== null} onOpenChange={(o) => !o && onClose()} title="Vistoria do pasto" description="Antes de tocar o berrante, isto aqui pode atrapalhar a subida:" accent="orange" width="max-w-xl">
      {conflicts.length ? (
        <section className="space-y-2">
          <h4 className="label">Porta ocupada</h4>
          {conflicts.map((c) => {
            const key = `${c.serviceId}-${c.port}`
            return (
              <div key={key} className="rounded border border-line bg-darker">
                <div className="flex items-start gap-3 px-3 py-2 font-mono text-xs">
                  <p className="min-w-0 flex-1 break-words">
                    <span className="text-orange">:{c.port}</span> → {c.serviceName} <span className="text-comment">(pid {c.pid}: {shortPaths(c.command).slice(0, 80)})</span>
                  </p>
                  {changing !== key ? (
                    <PixelButton size="sm" accent="cyan" onClick={() => setChanging(key)}>
                      Mudar porta
                    </PixelButton>
                  ) : null}
                </div>
                {changing === key ? (
                  <PortChangePanel
                    projectId={projectId}
                    conflict={c}
                    onCancel={() => setChanging(null)}
                    onChanged={async () => {
                      setChanging(null)
                      await onRecheck()
                    }}
                  />
                ) : null}
              </div>
            )
          })}
        </section>
      ) : null}
      {env.length ? (
        <section className="mt-4 space-y-2">
          <h4 className="label">.env incompleto</h4>
          {env.map((e) => (
            <div key={e.repoId} className="flex items-start gap-3 rounded border border-line bg-darker px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-mono font-bold text-fg">{e.repoName}</p>
                <p className="mt-0.5 break-words font-mono text-comment">
                  {e.envExists ? `faltam ${e.missingKeys.length}: ${e.missingKeys.join(', ')}` : `sem .env (o ${e.exampleFile} tem ${e.missingKeys.length} variável(is))`}
                </p>
              </div>
              <PixelButton size="sm" accent="cyan" disabled={fixing !== null} onClick={() => void fix(e.repoId, e.repoName)}>
                {fixing === e.repoId ? '…' : e.envExists ? 'Completar .env' : 'Criar .env'}
              </PixelButton>
            </div>
          ))}
        </section>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        {conflicts.length ? <PixelButton onClick={onOpenPorts}>Contar a boiada</PixelButton> : null}
        {onPlayAnyway ? (
          <PixelButton accent="orange" onClick={onPlayAnyway}>Subir mesmo assim</PixelButton>
        ) : (
          <PixelButton onClick={onClose}>Fechar</PixelButton>
        )}
      </div>
    </Dialog>
  )
}
