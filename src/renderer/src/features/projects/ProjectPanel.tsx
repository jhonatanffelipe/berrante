import { useEffect, useRef, useState } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import type { PortConflict, Project } from '@shared/types'
import { runtimeKey } from '@shared/runtime'
import { call, errorMessage } from '../../lib/api'
import { useInterval } from '../../lib/useAsync'
import { PixelButton } from '../../components/ui/PixelButton'
import { Term } from '../../components/ui/Term'
import { Tetromino } from '../../components/ui/Tetromino'
import { Tabs, TabsContent, TabsList } from '../../components/ui/Tabs'
import { EmptyState } from '../../components/ui/EmptyState'
import { Dialog } from '../../components/ui/Dialog'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../layout/AppData'
import { useProjectRuntime } from '../runtime/RuntimeProvider'
import { LogViewer } from '../runtime/LogViewer'
import { ProjectFormDialog } from './ProjectFormDialog'
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

  const play = async (ignoreConflicts = false) => {
    setPlaying(true)
    setConflicts(null)
    try {
      const result = await call('runtime:startAll', { projectId: project.id, ignoreConflicts })
      if (result.conflicts.length) {
        setConflicts(result.conflicts)
        return
      }
      if (result.skipped.length) toast({ title: 'Parte da boiada ficou', body: `${result.skipped.length} serviço(s) pulado(s) por dependência que falhou.`, accent: 'orange' })
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

  const actionState = actionLog ? runtime?.services.find((s) => runtimeKey(project.id, s.serviceId) === actionLog.key) : undefined

  return (
    <div className="relative mx-auto max-w-6xl">
      {celebrate ? <LineClear onDone={() => setCelebrate(false)} /> : null}
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Tetromino shape={project.icon} accent={project.color} cell={10} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-pixel text-pixel-lg text-fg">{project.name}</h2>
          <p className="font-terminal text-xl leading-none text-comment">
            {projectRepos.length} repositório(s) · {project.plan?.services.filter((s) => s.enabled).length ?? 0} serviço(s) no play
          </p>
        </div>
        <PixelButton size="lg" accent="green" disabled={playing || !project.plan} onClick={() => void play()}>
          ▶ <Term tech="Start all: sobe todos os serviços habilitados na ordem do plano">{playing ? 'Tocando…' : 'Tocar o berrante'}</Term>
        </PixelButton>
        <PixelButton size="lg" accent="red" disabled={stopping || !anyActive} onClick={() => void stopAll()}>
          ■ <Term tech="Stop all: para processos (SIGTERM → SIGKILL no grupo) e containers da tropa">Recolher a boiada</Term>
        </PixelButton>
        <Menu.Root>
          <Menu.Trigger asChild>
            <PixelButton aria-label="Mais opções">⋮</PixelButton>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content align="end" sideOffset={6} className="pixel-block pixel-block-sm z-50 min-w-40 bg-darker p-1">
              <Menu.Item onSelect={() => setEditing(true)} className="cursor-pointer px-3 py-2 outline-none data-[highlighted]:bg-line">Editar tropa</Menu.Item>
              <Menu.Item onSelect={() => setConfirmDelete(true)} className="cursor-pointer px-3 py-2 text-red outline-none data-[highlighted]:bg-line">Apagar tropa</Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList items={[{ value: 'boiada', label: 'Boiada' }, { value: 'plano', label: 'Plano de subida' }]} />
        <TabsContent value="boiada" className="space-y-5 pt-5">
          {projectRepos.length === 0 ? (
            <EmptyState title="Tropa vazia">Edite a tropa e adicione repositórios.</EmptyState>
          ) : !project.plan ? (
            <EmptyState title="Sem plano de subida">
              Vá em <button className="text-purple underline" onClick={() => setTab('plano')}>Plano de subida</button> e detecte como cada repo sobe.
            </EmptyState>
          ) : (
            projectRepos.map((repo) => <RepoCard key={repo.id} project={project} repo={repo} runtime={runtime} now={now} onAction={(r, n) => void runAction(r, n)} />)
          )}
          {actionLog ? (
            <PixelBlock accent="orange">
              <header className="flex items-center gap-3 bg-line/50 px-4 py-2">
                <span className="font-pixel text-pixel text-orange">ação: {actionLog.name}</span>
                <span className="font-terminal text-lg text-comment">{actionState?.status ?? ''}</span>
                <div className="ml-auto flex gap-1">
                  {actionState?.status === 'running' ? (
                    <PixelButton size="sm" accent="red" onClick={() => void call('runtime:stopService', { projectId: project.id, serviceId: actionLog.serviceId })}>■</PixelButton>
                  ) : null}
                  <PixelButton size="sm" onClick={() => setActionLog(null)}>✕</PixelButton>
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
            <div key={`${c.serviceId}-${c.port}`} className="bg-darker px-3 py-2">
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
