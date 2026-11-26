import { useEffect, useState } from 'react'
import { BLOCK_SHAPES, DRACULA_ACCENTS, type BlockShape, type DraculaAccent, type Project } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { accentBg } from '../../lib/accent'
import { cn } from '../../lib/cn'
import { shortPath } from '../../lib/format'
import { Dialog } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { PixelButton } from '../../components/ui/PixelButton'
import { Tetromino } from '../../components/ui/Tetromino'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../layout/AppData'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
}

/** Criar/editar tropa: nome, cor, ícone de bloco e repositórios. */
export function ProjectFormDialog({ open, onOpenChange, project }: Props) {
  const { repos, upsertProject, go } = useAppData()
  const toast = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState<DraculaAccent>('purple')
  const [icon, setIcon] = useState<BlockShape>('tee')
  const [repoIds, setRepoIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setColor(project?.color ?? 'purple')
    setIcon(project?.icon ?? 'tee')
    setRepoIds(project?.repositoryIds ?? [])
  }, [open, project])

  const toggle = (id: string) => setRepoIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const save = async () => {
    setBusy(true)
    try {
      const input = { name, color, icon, repositoryIds: repoIds }
      const saved = project ? await call('projects:update', { id: project.id, input }) : await call('projects:create', input)
      upsertProject(saved)
      onOpenChange(false)
      if (!project) go({ name: 'project', id: saved.id })
    } catch (err) {
      toast({ title: 'Não salvou', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={project ? 'Editar tropa' : 'Nova tropa'} description="Uma tropa junta os repositórios que sobem juntos." accent={color} width="max-w-2xl">
      <div className="space-y-5">
        <Field label="Nome">
          <input className="pixel-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Fazenda Boa Vista" autoFocus maxLength={60} />
        </Field>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Cor">
            <div className="flex flex-wrap gap-2">
              {DRACULA_ACCENTS.map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className={cn('h-7 w-7 rounded-sm', accentBg[c], color === c && 'outline outline-2 outline-offset-2 outline-fg')} />
              ))}
            </div>
          </Field>
          <Field label="Bloco">
            <div className="flex flex-wrap items-center gap-3">
              {BLOCK_SHAPES.map((s) => (
                <button key={s} type="button" aria-label={s} onClick={() => setIcon(s)} className={cn('p-1.5', icon === s ? 'bg-line' : 'hover:bg-line/40')}>
                  <Tetromino shape={s} accent={color} cell={6} />
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Field label={`Repositórios (${repoIds.length})`} hint="A ordem de seleção é a ordem dos cards no painel.">
          <div className="max-h-56 space-y-1 overflow-auto bg-darker p-2">
            {repos.length === 0 ? <p className="p-2 text-comment">Importe ou clone repositórios primeiro.</p> : null}
            {repos.map((r) => {
              const idx = repoIds.indexOf(r.id)
              return (
                <button key={r.id} type="button" onClick={() => toggle(r.id)} className={cn('flex w-full items-center gap-3 px-2 py-1.5 text-left', idx >= 0 ? 'bg-line' : 'hover:bg-line/40')}>
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[10px] font-bold', idx >= 0 ? `${accentBg[color]} border-transparent text-on-accent` : 'border-line bg-darker')}>{idx >= 0 ? idx + 1 : ''}</span>
                  <span className="flex-1">{r.name}</span>
                  <span className="truncate text-xs text-comment">{shortPath(r.path)}</span>
                </button>
              )
            })}
          </div>
        </Field>
        <div className="flex justify-end gap-2">
          <PixelButton onClick={() => onOpenChange(false)}>Cancelar</PixelButton>
          <PixelButton accent={color} onClick={() => void save()} disabled={busy || !name.trim()}>
            {project ? 'Salvar' : 'Criar tropa'}
          </PixelButton>
        </div>
      </div>
    </Dialog>
  )
}
