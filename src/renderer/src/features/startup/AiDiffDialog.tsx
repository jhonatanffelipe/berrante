import { useEffect, useState } from 'react'
import type { AiPlanSuggestion, ServiceDefinition } from '@shared/types'
import { Dialog } from '../../components/ui/Dialog'
import { PixelButton } from '../../components/ui/PixelButton'
import { cn } from '../../lib/cn'

const TYPE_STYLE = { added: 'text-green', removed: 'text-red', changed: 'text-yellow' } as const
const TYPE_LABEL = { added: '+ novo', removed: '− remover', changed: '~ alterar' } as const

function show(svc: ServiceDefinition | null, field: string): string {
  if (!svc) return ''
  const v = (svc as unknown as Record<string, unknown>)[field]
  return typeof v === 'string' ? v : JSON.stringify(v)
}

/**
 * Sugestão da IA como diff. Nada é aplicado nem executado sem o usuário marcar e confirmar;
 * os comandos aparecem por extenso para revisão.
 */
export function AiDiffDialog({ suggestion, onClose, onApply }: { suggestion: AiPlanSuggestion | null; onClose: () => void; onApply: (selected: Set<string>) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  useEffect(() => setSelected(new Set()), [suggestion])
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <Dialog open={suggestion !== null} onOpenChange={(o) => !o && onClose()} title={`Sugestão da IA (${suggestion?.cli ?? ''})`} description="Revise cada mudança. Nada roda sem a sua confirmação." accent="accent" width="max-w-3xl">
      {suggestion?.notes ? <p className="selectable mb-4 whitespace-pre-wrap bg-darker p-3 text-xs text-fg/80">{suggestion.notes}</p> : null}
      {suggestion && suggestion.diff.length === 0 ? <p className="text-comment">A IA concorda com o plano atual. Nada para mudar.</p> : null}
      <div className="space-y-2">
        {suggestion?.diff.map((d) => (
          <label key={d.serviceId} className={cn('flex cursor-pointer gap-3 bg-darker p-3', selected.has(d.serviceId) && 'outline outline-2 outline-purple')}>
            <input type="checkbox" className="mt-1 accent-[rgb(var(--c-purple))]" checked={selected.has(d.serviceId)} onChange={() => toggle(d.serviceId)} />
            <div className="min-w-0 flex-1">
              <div className="flex gap-2">
                <span className={cn('font-mono text-[10px] font-bold uppercase', TYPE_STYLE[d.type])}>{TYPE_LABEL[d.type]}</span>
                <span className="text-fg">{d.name}</span>
                <span className="text-xs text-comment">{(d.after ?? d.before)?.kind}</span>
              </div>
              {d.type === 'added' ? <code className="selectable mt-1 block break-all text-xs text-green">$ {d.after?.command}</code> : null}
              {d.type === 'removed' ? <code className="selectable mt-1 block break-all text-xs text-red line-through">$ {d.before?.command}</code> : null}
              {d.type === 'changed'
                ? d.fields.map((f) => (
                    <div key={f} className="selectable mt-1 text-xs">
                      <span className="text-comment">{f}: </span>
                      <span className="text-red line-through">{show(d.before, f)}</span> <span className="text-green">{show(d.after, f)}</span>
                    </div>
                  ))
                : null}
            </div>
          </label>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        <PixelButton size="sm" onClick={() => setSelected(new Set(suggestion?.diff.map((d) => d.serviceId)))}>Marcar tudo</PixelButton>
        <div className="flex gap-2">
          <PixelButton onClick={onClose}>Descartar</PixelButton>
          <PixelButton accent="accent" disabled={selected.size === 0} onClick={() => onApply(selected)}>
            Aplicar {selected.size} mudança(s)
          </PixelButton>
        </div>
      </div>
    </Dialog>
  )
}
