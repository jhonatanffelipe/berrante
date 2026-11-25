import type { LocalRepository, Project, ProjectRuntime } from '@shared/types'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
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
  const running = services.filter((s) => byId.get(s.id)?.status === 'running').length

  return (
    <PixelBlock accent={project.color} className="animate-block-drop">
      <header className="flex items-center gap-3 bg-line/50 px-4 py-2">
        <span className="font-pixel text-pixel text-fg">{repo.name}</span>
        <span className="truncate text-xs text-comment">{shortPath(repo.path)}</span>
        <span className="ml-auto font-terminal text-lg leading-none text-comment">
          {running}/{services.filter((s) => s.enabled && s.kind !== 'setup').length} de pé
        </span>
      </header>
      <div className="divide-y-2 divide-line/60">
        {services.length === 0 ? <p className="px-4 py-3 text-comment">Nenhum serviço no plano para este repositório.</p> : null}
        {services.map((s) => (
          <ServiceRow key={s.id} projectId={project.id} service={s} state={byId.get(s.id)} now={now} />
        ))}
      </div>
      {actions.length ? (
        <footer className="flex flex-wrap gap-1 border-t-2 border-line/60 px-3 py-2">
          <span className="mr-2 self-center font-pixel text-[8px] uppercase text-comment">ações</span>
          {actions.map((a) => (
            <PixelButton key={a.name} size="sm" accent="orange" title={a.command} onClick={() => onAction(repo.id, a.name)}>
              {a.name}
            </PixelButton>
          ))}
        </footer>
      ) : null}
    </PixelBlock>
  )
}
