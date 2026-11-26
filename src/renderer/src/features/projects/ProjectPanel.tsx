import { useEffect, useRef, useState } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import type { PortConflict, Project } from '@shared/types'
import { runtimeKey } from '@shared/runtime'
import { isLongRunning, stepWaitFor } from '@shared/workflow'
import { call, errorMessage } from '../../lib/api'
import { useInterval } from '../../lib/useAsync'
import { PixelButton } from '../../components/ui/PixelButton'
import { Term } from '../../components/ui/Term'
import { StatusBlock } from '../../components/ui/StatusBlock'
import { Tetromino } from '../../components/ui/Tetromino'
import { Tabs, TabsContent, TabsList } from '../../components/ui/Tabs'
import { EmptyState } from '../../components/ui/EmptyState'
import { Dialog } from '../../components/ui/Dialog'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelDigits } from '../../components/ui/PixelDigits'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../layout/AppData'
import { useProjectRuntime } from '../runtime/RuntimeProvider'
import { LogViewer } from '../runtime/LogViewer'
import { ProjectFormDialog } from './ProjectFormDialog'
import { useMenuCommand } from '../../lib/useMenuCommand'
import { RepoCard } from './RepoCard'
import { LineClear } from './LineClear'
import { PlanEditor } from '../startup/PlanEditor'

export function ProjectPanel({ project }: { project: Project }) {
  const { repos, reloadProjects, go, projects } = useAppData()
  const toast = useToast()
  const runtime = useProjectRuntime(project.id)
  const [now, setNow] = useState(Date.now())
  const [playing, setPlaying] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [conflicts, setConflicts] = useState<PortConflict[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tab, setTab] = useState(project.plan ? 'boiada' : 'plano')
  const [actionLog, setActionLog] = useState<{ key: string; name: string; serviceId: string } | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const wasAllRunning = useRef<boolean | null>(null)

  useInterval(() => setNow(Date.now()), 1000)

  useEffect(() => {
    setTab(project.plan ? 'boiada' : 'plano')
    setActionLog(null)
    wasAllRunning.current = null
  }, [project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!runtime) return
    if (wasAllRunning.current === false && runtime.allRunning) setCelebrate(true)
    wasAllRunning.current = runtime.allRunning
  }, [runtime])

  const projectRepos = project.repositoryIds.map((id) => repos.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => Boolean(r))
  const anyActive = runtime?.services.some((s) => s.status === 'running' || s.status === 'starting') ?? false
  const plan = project.plan?.services ?? []
  const playable = plan.filter((s) => s.enabled && isLongRunning(s))
  const stateOf = new Map((runtime?.services ?? []).map((s) => [s.serviceId, s]))
  const running = playable.filter((s) => stateOf.get(s.id)?.status === 'running').length
  const counts = { steps: plan.filter((s) => s.enabled).length, oneShot: plan.filter((s) => s.enabled && stepWaitFor(s) === 'exit' && s.kind !== 'compose').length }
  const ports = [...new Set((runtime?.services ?? []).flatMap((s) => s.ports))].sort((a, b) => a - b)

  const play = async (ignoreConflicts = false) => {
    setPlaying(true)
    setConflicts(null)
    try {
      const result = await call('runtime:startAll', { projectId: project.id, ignoreConflicts })
      if (result.conflicts.length) {
        setConflicts(result.conflicts)
        return
      }
      if (result.skipped.length) toast({ title: 'O workflow parou no meio', body: `Um passo falhou e ${result.skipped.length} passo(s) seguinte(s) não rodaram. Veja o log.`, accent: 'orange' })
    } catch (err) {
      toast({ title: 'O berrante falhou', body: errorMessage(err), accent: 'red' })
    } finally {
      setPlaying(false)
    }
  }

  const stopAll = async () => {
    setStopping(true)
    try {
      await call('runtime:stopAll', { projectId: project.id })
      toast({ title: 'Boiada recolhida', accent: 'cyan' })
    } catch (err) {
      toast({ title: 'Falha ao recolher', body: errorMessage(err), accent: 'red' })
    } finally {
      setStopping(false)
    }
  }

  const runAction = async (repoId: string, name: string) => {
    try {
      const id = await call('runtime:runAction', { projectId: project.id, repoId, name })
      setActionLog({ key: runtimeKey(project.id, id), name, serviceId: id })
    } catch (err) {
      toast({ title: `Ação ${name} falhou`, body: errorMessage(err), accent: 'red' })
    }
  }

  const remove = async () => {
    try {
      await call('projects:delete', { id: project.id })
      await reloadProjects()
      const next = projects.find((p) => p.id !== project.id)
      go(next ? { name: 'project', id: next.id } : { name: 'repos' })
    } catch (err) {
      toast({ title: 'Não apagou', body: errorMessage(err), accent: 'red' })
    }
  }

  useMenuCommand((cmd) => {
    if (cmd.type === 'play' && !playing && project.plan) void play()
    else if (cmd.type === 'stop' && !stopping && anyActive) void stopAll()
    else if (cmd.type === 'editProject') setEditing(true)
    else if (cmd.type === 'tab') setTab(cmd.tab)
  })

  const actionState = actionLog ? runtime?.services.find((s) => runtimeKey(project.id, s.serviceId) === actionLog.key) : undefined

  return (
    <div className="relative mx-auto max-w-6xl">
      {celebrate ? <LineClear onDone={() => setCelebrate(false)} /> : null}
      <PixelBlock className="mb-5 grid grid-cols-[minmax(0,1fr)_minmax(400px,460px)] gap-6 px-6 py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Tetromino shape={project.icon} accent={project.color} cell={5} className="mr-1" />
            <span className="label">tropa</span>
            <span className="text-comment">·</span>
            <span className="label truncate">{project.name}</span>
            <span className="text-comment">·</span>
            <span className="label-muted">{projectRepos.length} repo(s)</span>
            <Badge tone={runtime?.allRunning ? 'green' : running > 0 ? 'yellow' : 'line'}>{runtime?.allRunning ? 'boiada completa' : running > 0 ? 'parcial' : 'parado'}</Badge>
          </div>
          <div className="mt-4 flex items-end gap-4">
            <PixelDigits value={`${running}/${playable.length}`} cell={9} />
            <span className="mb-1 font-mono text-xl font-bold text-fg">de pé</span>
          </div>
          <p className="mt-4 text-[13px] text-fg/80">
            <b className="text-fg">{counts.steps}</b> passo(s) no workflow · <b className="text-fg">{playable.length}</b> fica(m) de pé · <b className="text-fg">{counts.oneShot}</b> roda(m) e termina(m) ·{' '}
            <b className="text-fg">{project.plan?.actions.length ?? 0}</b> ação(ões)
          </p>
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-4 border-l border-line/60 pl-6">
          <div>
            <span className="label-muted">portas</span>
            <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-auto">
              {ports.length ? ports.map((p) => <Badge key={p} tone="green">:{p}</Badge>) : <span className="font-mono text-xs text-comment">nenhuma aberta</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PixelButton size="lg" accent="accent" disabled={playing || !project.plan} onClick={() => void play()}>
              ▶ <Term tech="Start all: sobe todos os serviços habilitados na ordem do plano">{playing ? 'Tocando…' : 'Tocar o berrante'}</Term>
            </PixelButton>
            <PixelButton size="lg" className="text-red" disabled={stopping || !anyActive} onClick={() => void stopAll()}>
              ■ <Term tech="Stop all: para processos (SIGTERM → SIGKILL no grupo) e containers da tropa">Recolher</Term>
            </PixelButton>
            <Menu.Root>
              <Menu.Trigger asChild>
                <PixelButton size="lg" aria-label="Mais opções">⋮</PixelButton>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Content align="end" sideOffset={6} className="z-50 min-w-40 rounded border border-line bg-deep p-1 shadow-lg">
                  <Menu.Item onSelect={() => setEditing(true)} className="cursor-pointer rounded-sm px-3 py-2 outline-none data-[highlighted]:bg-line">Editar tropa</Menu.Item>
                  <Menu.Item onSelect={() => setConfirmDelete(true)} className="cursor-pointer rounded-sm px-3 py-2 text-red outline-none data-[highlighted]:bg-line">Apagar tropa</Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu.Root>
          </div>
        </div>
      </PixelBlock>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList items={[{ value: 'boiada', label: 'Boiada' }, { value: 'plano', label: 'Plano de subida' }]} />
        <TabsContent value="boiada" className="space-y-4 pt-5">
          {projectRepos.length === 0 ? (
            <EmptyState title="Tropa vazia">Edite a tropa e adicione repositórios.</EmptyState>
          ) : !project.plan ? (
            <EmptyState title="Sem plano de subida">
              Vá em <button className="text-accent underline" onClick={() => setTab('plano')}>Plano de subida</button> e detecte como cada repo sobe.
            </EmptyState>
          ) : (
            projectRepos.map((repo) => <RepoCard key={repo.id} project={project} repo={repo} runtime={runtime} now={now} onAction={(r, n) => void runAction(r, n)} />)
          )}
          {actionLog ? (
            <PixelBlock accent="accent" className="overflow-hidden">
              <header className="flex items-center gap-3 border-b border-line/60 px-5 py-3">
                <span className="label">ação · {actionLog.name}</span>
                {actionState ? <StatusBlock status={actionState.status} /> : null}
                <div className="ml-auto flex gap-1">
                  {actionState?.status === 'running' ? (
                    <PixelButton size="icon" className="text-red" onClick={() => void call('runtime:stopService', { projectId: project.id, serviceId: actionLog.serviceId })}>■</PixelButton>
                  ) : null}
                  <PixelButton size="icon" onClick={() => setActionLog(null)}>✕</PixelButton>
                </div>
              </header>
              <LogViewer logKey={actionLog.key} height={240} />
            </PixelBlock>
          ) : null}
        </TabsContent>
        <TabsContent value="plano" className="pt-5">
          <PlanEditor project={project} onSaved={() => setTab('boiada')} />
        </TabsContent>
      </Tabs>

      <Dialog open={conflicts !== null} onOpenChange={(o) => !o && setConflicts(null)} title="Porta ocupada no pasto" description="Antes de tocar o berrante, estas portas já estão em uso por outros processos:" accent="orange">
        <div className="space-y-2">
          {conflicts?.map((c) => (
            <div key={`${c.serviceId}-${c.port}`} className="rounded border border-line bg-darker px-3 py-2 font-mono text-xs">
              <span className="text-orange">:{c.port}</span> → {c.serviceName} <span className="text-comment">(pid {c.pid}: {c.command.slice(0, 80)})</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PixelButton onClick={() => { setConflicts(null); go({ name: 'ports' }) }}>Contar a boiada</PixelButton>
          <PixelButton accent="orange" onClick={() => void play(true)}>Subir mesmo assim</PixelButton>
        </div>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Apagar tropa?" description="Os repositórios e pastas continuam; só a tropa e o plano somem." accent="red" width="max-w-sm">
        <div className="flex justify-end gap-2">
          <PixelButton onClick={() => setConfirmDelete(false)}>Cancelar</PixelButton>
          <PixelButton accent="red" onClick={() => void remove()}>Apagar</PixelButton>
        </div>
      </Dialog>
      <ProjectFormDialog open={editing} onOpenChange={setEditing} project={project} />
    </div>
  )
}
