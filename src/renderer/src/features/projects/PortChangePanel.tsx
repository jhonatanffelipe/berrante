import { useEffect, useState } from 'react'
import type { PortChangePlan, PortConflict } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { cn } from '../../lib/cn'
import { PixelButton } from '../../components/ui/PixelButton'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

interface Props {
  projectId: string
  conflict: PortConflict
  onChanged: () => Promise<void>
  onCancel: () => void
}

const KIND_LABEL: Record<'port' | 'url' | 'add', string> = { port: 'porta', url: 'endereço', add: 'nova' }

/**
 * Troca a porta ocupada pelo `.env`: sugere uma livre (na máquina e em todas as tropas),
 * mostra cada linha que muda e só grava depois de confirmar.
 */
export function PortChangePanel({ projectId, conflict, onChanged, onCancel }: Props) {
  const toast = useToast()
  const [plan, setPlan] = useState<PortChangePlan | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async (newPort?: number) => {
    setError(null)
    try {
      const p = await call('runtime:planPortChange', { projectId, serviceId: conflict.serviceId, port: conflict.port, newPort })
      setPlan(p)
      if (newPort === undefined && p.newPort) setValue(String(p.newPort))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    void load()
  }, [conflict.serviceId, conflict.port]) // eslint-disable-line react-hooks/exhaustive-deps

  // Número digitado: recalcula o plano (o main confere se a porta está livre) depois de uma pausa.
  useEffect(() => {
    const n = Number(value)
    if (!plan || !Number.isInteger(n) || n === plan.newPort) return
    const t = setTimeout(() => void load(n), 400)
    return () => clearTimeout(t)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const apply = async () => {
    if (!plan?.newPort) return
    setBusy(true)
    try {
      await call('runtime:applyPortChange', { projectId, serviceId: conflict.serviceId, port: conflict.port, newPort: plan.newPort })
      toast({ title: `${conflict.serviceName}: :${conflict.port} → :${plan.newPort}`, body: `${new Set(plan.edits.map((e) => `${e.repoId}/${e.file}`)).size} arquivo(s) .env atualizado(s).`, accent: 'green' })
      await onChanged()
    } catch (err) {
      toast({ title: 'Não trocou a porta', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(false)
    }
  }

  if (!plan && !error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-comment">
        <Spinner /> procurando uma porta livre em todas as tropas…
      </div>
    )
  }

  return (
    <div className="space-y-2 border-t border-line/60 px-3 py-3 text-xs">
      <label className="flex items-center gap-2">
        <span className="text-comment">nova porta</span>
        <input
          className={cn('pixel-input !w-28 !py-1 font-mono', error && '!border-red')}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 5))}
          aria-label="Nova porta"
        />
        {plan?.newPort && !error ? <span className="text-green">livre na máquina e em nenhuma tropa</span> : null}
      </label>
      {error ? <p className="text-red">{error}</p> : null}
      {plan?.edits.length ? (
        <div className="space-y-1">
          <p className="text-comment">O que muda:</p>
          {plan.edits.map((e, i) => (
            <div key={`${e.repoId}-${e.file}-${e.key}-${i}`} className="rounded border border-line bg-deep px-2 py-1.5 font-mono">
              <p className="text-comment">
                {e.repoName}/{e.file} · <span className="text-fg">{e.key}</span> ({KIND_LABEL[e.kind]})
              </p>
              {e.before ? <p className="selectable break-all text-red">- {e.before}</p> : null}
              <p className="selectable break-all text-green">+ {e.after}</p>
            </div>
          ))}
        </div>
      ) : null}
      {plan?.warnings.map((w) => (
        <p key={w} className="text-orange">⚠ {w}</p>
      ))}
      <div className="flex justify-end gap-2 pt-1">
        <PixelButton size="sm" onClick={onCancel}>Cancelar</PixelButton>
        <PixelButton size="sm" accent="green" disabled={!plan?.canApply || Boolean(error) || busy} onClick={() => void apply()}>
          {busy ? 'Trocando…' : plan?.newPort ? `Trocar para :${plan.newPort}` : 'Trocar'}
        </PixelButton>
      </div>
    </div>
  )
}
