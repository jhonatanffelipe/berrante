import { useEffect, useState } from 'react'
import type { AiWorkflowSuggestion, LocalRepository } from '@shared/types'
import { stepWaitFor, WAIT_FOR_LABEL } from '@shared/workflow'
import { Dialog } from '../../components/ui/Dialog'
import { PixelButton } from '../../components/ui/PixelButton'
import { cn } from '../../lib/cn'
import { folderLabel } from './folderLabel'

export type ApplyMode = 'replace' | 'append'

/**
 * Workflow sugerido pela IA: uma lista numerada, na ordem em que roda, com o porquê de cada passo.
 * Nada é aplicado sem o usuário escolher; o resultado vai para o rascunho e ainda precisa ser salvo.
 */
export function AiWorkflowDialog({
  suggestion,
  repos,
  onClose,
  onApply
}: {
  suggestion: AiWorkflowSuggestion | null
  repos: LocalRepository[]
  onClose: () => void
  onApply: (selectedIds: Set<string>, mode: ApplyMode) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  useEffect(() => setSelected(new Set(suggestion?.steps.map((s) => s.step.id))), [suggestion])
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <Dialog open={suggestion !== null} onOpenChange={(o) => !o && onClose()} title={`Workflow sugerido (${suggestion?.cli ?? ''})`} description="É só uma sugestão: desmarque o que não quiser. Nada roda sem você salvar e tocar o berrante." accent="accent" width="max-w-3xl">
      {suggestion?.notes ? <p className="selectable mb-4 whitespace-pre-wrap bg-darker p-3 text-xs text-fg/80">{suggestion.notes}</p> : null}
      {suggestion && suggestion.steps.length === 0 ? <p className="text-comment">A IA não conseguiu montar um workflow com esses repositórios.</p> : null}
      <ol className="space-y-2">
        {suggestion?.steps.map(({ step, reason }, i) => (
          <li key={step.id}>
            <label className={cn('flex cursor-pointer gap-3 bg-darker p-3', selected.has(step.id) ? 'outline outline-2 outline-purple' : 'opacity-60')}>
              <input type="checkbox" className="mt-1 accent-[rgb(var(--c-purple))]" checked={selected.has(step.id)} onChange={() => toggle(step.id)} />
              <span className="w-6 shrink-0 font-mono text-sm text-comment">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-fg">{step.name}</span>
                  <span className="font-mono text-[11px] text-comment">{folderLabel(repos, step.cwd)}</span>
                  <span className="ml-auto text-[11px] text-comment">segue ao {WAIT_FOR_LABEL[stepWaitFor(step)]}</span>
                </div>
                <code className="selectable block break-all text-xs text-green">$ {step.command}</code>
                {reason ? <p className="text-xs text-comment">{reason}</p> : null}
              </div>
            </label>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex items-center justify-end gap-2">
        <PixelButton onClick={onClose}>Descartar</PixelButton>
        <PixelButton disabled={selected.size === 0} onClick={() => onApply(selected, 'append')}>Adicionar ao final</PixelButton>
        <PixelButton accent="accent" disabled={selected.size === 0} onClick={() => onApply(selected, 'replace')}>
          Usar como meu workflow ({selected.size})
        </PixelButton>
      </div>
    </Dialog>
  )
}
