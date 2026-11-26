import type { LocalRepository, Project, ProjectRuntime } from '@shared/types'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { SegmentBar } from '../../components/ui/SegmentBar'
import { shortPath } from '../../lib/format'
import { ServiceRow } from './ServiceRow'

interface Props {
  project: Project
  repo: LocalRepository
  runtime: ProjectRuntime | null
  now: number
  onAction: (repoId: string, name: string) => void
}

export function RepoCard({ project, repo, runtime, now, onAction }: Props) {
  const services = (project.plan?.services ?? []).filter((s) => s.repoId === repo.id).sort((a, b) => a.order - b.order)
  const actions = (project.plan?.actions ?? []).filter((a) => a.repoId === repo.id)
  const byId = new Map((runtime?.services ?? []).map((s) => [s.serviceId, s]))
  const playable = services.filter((s) => s.enabled && s.kind !== 'setup')
  const running = playable.filter((s) => byId.get(s.id)?.status === 'running').length

  return (
    <PixelBlock className="animate-block-drop overflow-hidden">
      <header className="flex items-center gap-4 border-b border-line/60 px-5 py-3">
        <span className="label shrink-0 whitespace-nowrap">{repo.name}</span>
        <span className="min-w-0 truncate font-mono text-[11px] text-comment">{shortPath(repo.path)}</span>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <SegmentBar value={playable.length ? running / playable.length : 0} segments={Math.max(playable.length * 3, 6)} height={10} />
          <span className="font-mono text-xs font-bold text-fg">
            {running}/{playable.length} <span className="font-normal text-comment">de pé</span>
          </span>
        </div>
      </header>
      <div className="divide-y divide-line/50">
        {services.length === 0 ? <p className="px-5 py-4 text-comment">Nenhum serviço no plano para este repositório.</p> : null}
        {services.map((s, i) => (
          <ServiceRow key={s.id} index={i + 1} projectId={project.id} service={s} state={byId.get(s.id)} now={now} />
        ))}
      </div>
      {actions.length ? (
        <footer className="flex flex-wrap items-center gap-1.5 border-t border-line/60 bg-darker/40 px-5 py-3">
          <span className="label-muted mr-2">ações</span>
          {actions.map((a) => (
            <PixelButton key={a.name} size="sm" title={a.command} onClick={() => onAction(repo.id, a.name)}>
              ▸ {a.name}
            </PixelButton>
          ))}
        </footer>
      ) : null}
    </PixelBlock>
  )
}
