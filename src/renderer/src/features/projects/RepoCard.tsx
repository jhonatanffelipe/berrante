import type { LocalRepository, Project, ProjectRuntime, RepoGitStatus } from '@shared/types'
import { isLongRunning } from '@shared/workflow'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { SegmentBar } from '../../components/ui/SegmentBar'
import { shortPath } from '../../lib/format'
import { call, errorMessage } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Tip } from '../../components/ui/Term'
import { useToast } from '../../components/ui/Toast'
import { ServiceRow } from './ServiceRow'

interface Props {
  project: Project
  repo: LocalRepository
  runtime: ProjectRuntime | null
  now: number
  git: RepoGitStatus | undefined
  onAction: (repoId: string, name: string) => void
  onOpenPort: (port: number) => void
}

/** Marcação do git no cabeçalho: branch, alterações não salvas e commits à frente/atrás. */
function GitMark({ git }: { git: RepoGitStatus }) {
  if (git.error) return <Badge tone="line">sem git</Badge>
  return (
    <span className="flex items-center gap-1.5">
      <Tip label={git.upstream ? `rastreando ${git.upstream}` : 'sem branch remota'}>
        <span>
          <Badge tone={git.branch ? 'cyan' : 'orange'}>⎇ {git.branch ?? 'detached'}</Badge>
        </span>
      </Tip>
      {git.changes ? (
        <Tip label="Arquivos modificados ou não rastreados">
          <span>
            <Badge tone="orange">✎ {git.changes}</Badge>
          </span>
        </Tip>
      ) : null}
      {git.ahead ? (
        <Tip label="Commits que ainda não subiram (push)">
          <span>
            <Badge tone="purple">↑{git.ahead}</Badge>
          </span>
        </Tip>
      ) : null}
      {git.behind ? (
        <Tip label="Commits novos no remoto (faça pull)">
          <span>
            <Badge tone="yellow">↓{git.behind}</Badge>
          </span>
        </Tip>
      ) : null}
    </span>
  )
}

export function RepoCard({ project, repo, runtime, now, git, onAction, onOpenPort }: Props) {
  const toast = useToast()
  const services = (project.plan?.services ?? []).filter((s) => s.repoId === repo.id).sort((a, b) => a.order - b.order)
  const actions = (project.plan?.actions ?? []).filter((a) => a.repoId === repo.id)
  const byId = new Map((runtime?.services ?? []).map((s) => [s.serviceId, s]))
  const playable = services.filter((s) => s.enabled && isLongRunning(s))
  // Numera só o que entra no play: quem fica fora não ocupa posição na fila.
  const playOrder = new Map(services.filter((s) => s.enabled).map((s, i) => [s.id, i + 1]))
  const running = playable.filter((s) => byId.get(s.id)?.status === 'running').length

  return (
    <PixelBlock className="animate-block-drop overflow-hidden">
      <header className="flex items-center gap-4 border-b border-line/60 px-5 py-3">
        <span className="label shrink-0 whitespace-nowrap">{repo.name}</span>
        {git ? <GitMark git={git} /> : null}
        <span className="min-w-0 truncate font-mono text-[11px] text-comment">{shortPath(repo.path)}</span>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <Tip label="Abrir terminal nesta pasta">
            <PixelButton size="icon" aria-label={`Abrir terminal em ${repo.name}`} onClick={() => void call('repos:openTerminal', { repoId: repo.id }).catch((err) => toast({ title: 'Terminal não abriu', body: errorMessage(err), accent: 'red' }))}>
              {'>_'}
            </PixelButton>
          </Tip>
          {playable.length ? (
            <>
              <SegmentBar value={running / playable.length} segments={Math.max(playable.length * 3, 6)} height={10} />
              <span className="font-mono text-xs font-bold text-fg">
                {running}/{playable.length} <span className="font-normal text-comment">{playable.length === 1 ? 'processo de pé' : 'processos de pé'}</span>
              </span>
            </>
          ) : (
            <Tip label="Este repositório só tem passos que rodam e terminam (rede, docker compose up -d, install): não há processo para ficar de pé.">
              <span className="font-mono text-xs text-comment">só preparo</span>
            </Tip>
          )}
        </div>
      </header>
      <div className="divide-y divide-line/50">
        {services.length === 0 ? <p className="px-5 py-4 text-comment">Nenhum serviço no plano para este repositório.</p> : null}
        {services.map((s) => (
          <ServiceRow key={s.id} index={s.enabled ? playOrder.get(s.id) : undefined} projectId={project.id} service={s} state={byId.get(s.id)} now={now} onOpenPort={onOpenPort} />
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
