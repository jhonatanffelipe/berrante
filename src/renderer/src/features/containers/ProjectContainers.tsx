import { useEffect, useState } from 'react'
import type { Project, ProjectContainers as ProjectContainersData, ProjectStack, StackAction } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { useInterval } from '../../lib/useAsync'
import { shortPath } from '../../lib/format'
import { containerStatus, isContainerUp } from '../../lib/containerStatus'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { SegmentBar } from '../../components/ui/SegmentBar'
import { StatusBlock } from '../../components/ui/StatusBlock'
import { Badge } from '../../components/ui/Badge'
import { Tip } from '../../components/ui/Term'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

const DONE: Record<StackAction, string> = { up: 'subiu', stop: 'parou', restart: 'reiniciou' }

/** Aba "Containers" da tropa: os containers que os passos `docker compose ... up` sobem, um a um ou a stack inteira. */
export function ProjectContainers({ project, onOpenPlan }: { project: Project; onOpenPlan: () => void }) {
  const toast = useToast()
  const [data, setData] = useState<ProjectContainersData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Set<string>>(new Set())

  const load = async () => {
    try {
      setData(await call('containers:project', { projectId: project.id }))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  useEffect(() => {
    setData(null)
    void load()
  }, [project.id, project.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps
  useInterval(() => void load(), 3000)

  const act = async (stack: ProjectStack, action: StackAction, service?: string) => {
    const key = `${stack.id}:${service ?? '*'}`
    setBusy((b) => new Set(b).add(key))
    try {
      await call('containers:projectAction', { projectId: project.id, stackId: stack.id, action, service })
      toast({ title: `${service ?? stack.name} ${DONE[action]}`, accent: action === 'stop' ? 'cyan' : 'green' })
      await load()
    } catch (err) {
      toast({ title: `Falha em ${service ?? stack.name}`, body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy((b) => {
        const next = new Set(b)
        next.delete(key)
        return next
      })
    }
  }

  if (error && !data) return <p className="text-red">{error}</p>
  if (!data) return <div className="py-10 text-center"><Spinner label="olhando o curral…" /></div>
  if (!data.stacks.length) {
    return (
      <EmptyState title="Nenhum container no workflow">
        Essa tropa não tem passo <code className="font-mono text-fg">docker compose … up</code> habilitado. Adicione um no{' '}
        <button className="text-accent underline" onClick={onOpenPlan}>Plano de subida</button>.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-4">
      {!data.available ? <p className="text-orange">O Docker não respondeu: abra o Docker Desktop para ver e controlar os containers.</p> : null}
      {data.stacks.map((stack) => {
        const up = stack.services.filter((s) => isContainerUp(s.container?.state)).length
        const stackBusy = busy.has(`${stack.id}:*`)
        return (
          <PixelBlock key={stack.id} className="overflow-hidden">
            <header className="flex flex-wrap items-center gap-4 border-b border-line/60 px-5 py-3">
              <div className="min-w-0">
                <span className="label whitespace-nowrap">{stack.name}</span>
                <p className="truncate font-mono text-[11px] text-comment" title={`${stack.compose} · ${stack.cwd}`}>
                  {stack.compose} · {shortPath(stack.cwd)}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <SegmentBar value={stack.services.length ? up / stack.services.length : 0} segments={Math.max(stack.services.length * 3, 6)} height={10} />
                <span className="font-mono text-xs font-bold text-fg">
                  {up}/{stack.services.length} <span className="font-normal text-comment">de pé</span>
                </span>
                <div className="flex gap-1.5">
                  <PixelButton size="sm" disabled={stackBusy || !data.available} onClick={() => void act(stack, 'up')}>{stackBusy ? '…' : '▶ subir todos'}</PixelButton>
                  <PixelButton size="sm" disabled={stackBusy || !data.available || up === 0} onClick={() => void act(stack, 'restart')}>↻</PixelButton>
                  <PixelButton size="sm" className="text-red" disabled={stackBusy || !data.available || up === 0} onClick={() => void act(stack, 'stop')}>■ parar todos</PixelButton>
                </div>
              </div>
            </header>
            {stack.error ? <p className="selectable whitespace-pre-wrap border-b border-line/60 px-5 py-3 font-mono text-xs text-red">{stack.error}</p> : null}
            <div className="divide-y divide-line/50">
              {stack.services.length === 0 && !stack.error ? <p className="px-5 py-4 text-comment">O compose não listou serviços.</p> : null}
              {stack.services.map((s, i) => {
                const c = s.container
                const isUp = isContainerUp(c?.state)
                const isBusy = stackBusy || busy.has(`${stack.id}:${s.service}`)
                return (
                  <div key={s.service} className="flex items-center gap-5 px-5 py-3">
                    <span className="w-6 font-mono text-[15px] text-comment">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="title truncate">{s.service}</span>
                        <StatusBlock status={containerStatus(c?.state, c?.health)} />
                        {c?.health ? <Badge tone={c.health === 'healthy' ? 'green' : c.health === 'unhealthy' ? 'red' : 'yellow'}>{c.health}</Badge> : null}
                        {!c ? <Badge>não criado</Badge> : null}
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-comment">{c ? `${c.name} · ${c.state}` : 'docker compose ainda não subiu esse serviço'}</p>
                    </div>
                    <div className="flex max-w-56 flex-wrap justify-end gap-1">
                      {c?.ports.map((p) => <Badge key={p} tone={isUp ? 'green' : 'line'}>:{p}</Badge>)}
                    </div>
                    <div className="flex gap-1.5">
                      {isUp ? (
                        <>
                          <Tip label="Reiniciar">
                            <PixelButton size="icon" disabled={isBusy || !data.available} onClick={() => void act(stack, 'restart', s.service)} aria-label={`Reiniciar ${s.service}`}>↻</PixelButton>
                          </Tip>
                          <Tip label="Parar">
                            <PixelButton size="icon" disabled={isBusy || !data.available} className="text-red" onClick={() => void act(stack, 'stop', s.service)} aria-label={`Parar ${s.service}`}>■</PixelButton>
                          </Tip>
                        </>
                      ) : (
                        <Tip label="Subir só este">
                          <PixelButton size="icon" disabled={isBusy || !data.available} onClick={() => void act(stack, 'up', s.service)} aria-label={`Subir ${s.service}`}>▶</PixelButton>
                        </Tip>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </PixelBlock>
        )
      })}
    </div>
  )
}
