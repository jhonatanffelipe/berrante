import { useEffect, useMemo, useState } from 'react'
import type { BranchOption, RepoGitResult, RepoGitStatus } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { cn } from '../../lib/cn'
import { Dialog } from '../../components/ui/Dialog'
import { PixelButton } from '../../components/ui/PixelButton'
import { Spinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/Toast'

interface Props {
  open: boolean
  projectId: string
  repoCount: number
  status: RepoGitStatus[]
  onClose: () => void
  onDone: (results: RepoGitResult[]) => void
}

/** "Trocar de pasto": escolhe uma branch e troca em todos os repos da tropa que a têm. */
export function BranchDialog({ open, projectId, repoCount, status, onClose, onDone }: Props) {
  const toast = useToast()
  const [branches, setBranches] = useState<BranchOption[] | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setBranches(null)
    setQuery('')
    setSelected(null)
    call('projects:branches', { projectId })
      .then(setBranches)
      .catch((err) => {
        toast({ title: 'Não listou as branches', body: errorMessage(err), accent: 'red' })
        setBranches([])
      })
  }, [open, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = useMemo(() => new Set(status.map((s) => s.branch).filter(Boolean)), [status])
  const filtered = (branches ?? []).filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 200)
  const dirty = status.filter((s) => s.changes > 0)

  const submit = async (branch = selected) => {
    if (!branch || busy) return
    setBusy(true)
    try {
      onDone(await call('projects:checkout', { projectId, branch }))
    } catch (err) {
      toast({ title: 'Não trocou de branch', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Trocar de pasto" description="Troca de branch em todos os repositórios da tropa que a têm. Quem tiver alteração não salva fica onde está." accent="cyan" width="max-w-xl">
      <input className="pixel-input font-mono" placeholder="filtrar branches…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus aria-label="Filtrar branches" />
      <div className="mt-3 max-h-72 space-y-1 overflow-auto">
        {branches === null ? (
          <div className="flex items-center gap-2 py-4 text-comment"><Spinner /> lendo as branches…</div>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-comment">Nenhuma branch encontrada.</p>
        ) : (
          filtered.map((b) => (
            <button
              key={b.name}
              type="button"
              onClick={() => setSelected(b.name)}
              onDoubleClick={() => void submit(b.name)}
              className={cn('flex w-full items-center gap-3 rounded border px-3 py-2 text-left font-mono text-xs', selected === b.name ? 'border-accent bg-accent/10' : 'border-line hover:bg-line/40')}
            >
              <span className="min-w-0 flex-1 truncate text-fg">{b.name}</span>
              {current.has(b.name) ? <Badge tone="green">atual</Badge> : null}
              <span className="text-comment">{b.repoIds.length}/{repoCount} repo(s)</span>
            </button>
          ))
        )}
      </div>
      {dirty.length ? (
        <p className="mt-3 text-xs text-orange">⚠ Com alteração não salva (não vão trocar): {dirty.map((d) => d.repoName).join(', ')}</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <PixelButton onClick={onClose}>Cancelar</PixelButton>
        <PixelButton accent="cyan" disabled={!selected || busy} onClick={() => void submit()}>
          {busy ? 'Trocando…' : selected ? `Trocar para ${selected}` : 'Escolha uma branch'}
        </PixelButton>
      </div>
    </Dialog>
  )
}
