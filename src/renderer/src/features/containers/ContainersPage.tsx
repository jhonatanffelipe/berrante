import { useMemo, useState } from 'react'
import type { ContainerAction, ContainerList, DockerContainer } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { useInterval } from '../../lib/useAsync'
import { cn } from '../../lib/cn'
import { shortPath } from '../../lib/format'
import { containerStatus, healthFromStatus, isContainerUp } from '../../lib/containerStatus'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { PixelDigits } from '../../components/ui/PixelDigits'
import { PageTitle } from '../../components/ui/PageTitle'
import { StatusBlock } from '../../components/ui/StatusBlock'
import { Badge } from '../../components/ui/Badge'
import { Term, Tip } from '../../components/ui/Term'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../layout/AppData'

type Filter = 'running' | 'all' | 'berrante' | 'others'

const ACTION_LABEL: Record<ContainerAction, string> = { start: 'subiu', stop: 'parou', restart: 'reiniciou' }

/** "Curral": todos os containers Docker da máquina, ao vivo, com parar / subir / reiniciar. */
export function ContainersPage() {
  const { go } = useAppData()
  const toast = useToast()
  const [list, setList] = useState<ContainerList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('running')
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState<Set<string>>(new Set())

  const load = async () => {
    try {
      setList(await call('containers:list'))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  useInterval(() => void load(), paused ? null : 3000)
  if (list === null && !error) void load()

  const all = list?.containers ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter((c) => {
      if (filter === 'running' && !isContainerUp(c.state)) return false
      if (filter === 'berrante' && !c.owners.length) return false
      if (filter === 'others' && c.owners.length) return false
      if (!q) return true
      return [c.name, c.image, c.id, c.composeProject ?? '', c.composeService ?? '', c.workingDir ?? '', ...c.ports, ...c.owners.map((o) => o.projectName)].some((v) => v.toLowerCase().includes(q))
    })
  }, [all, search, filter])

  const act = async (c: DockerContainer, action: ContainerAction) => {
    setBusy((b) => new Set(b).add(c.id))
    try {
      await call('containers:action', { id: c.id, action })
      toast({ title: `${c.name} ${ACTION_LABEL[action]}`, accent: action === 'stop' ? 'cyan' : 'green' })
      await load()
    } catch (err) {
      toast({ title: `Falha em ${c.name}`, body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy((b) => {
        const next = new Set(b)
        next.delete(c.id)
        return next
      })
    }
  }

  const running = all.filter((c) => isContainerUp(c.state)).length

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageTitle index="D" title="Curral">
        <span className="label-muted">
          <Term tech="Containers Docker da máquina (docker ps -a): estado, portas, compose e tropa dona">docker ps · a cada 3s</Term>
        </span>
      </PageTitle>
      <PixelBlock className="flex flex-wrap items-end gap-8 px-6 py-5">
        <div className="flex items-end gap-4">
          <PixelDigits value={`${running}/${all.length}`} cell={9} />
          <span className="mb-1 font-mono text-xl font-bold">de pé</span>
        </div>
        <p className="mb-1 text-[13px] text-fg/80">
          <b className="text-fg">{all.filter((c) => c.owners.length).length}</b> de tropas · <b className="text-fg">{all.filter((c) => !c.owners.length).length}</b> de fora
        </p>
        <div className="mb-1 ml-auto flex flex-wrap items-center gap-2">
          <input className="pixel-input w-64" placeholder="nome, imagem, porta, tropa…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="pixel-input w-36" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="running">De pé</option>
            <option value="all">Todos</option>
            <option value="berrante">De tropas</option>
            <option value="others">De fora</option>
          </select>
          <PixelButton onClick={() => setPaused((p) => !p)}>{paused ? '▶ ao vivo' : '❚❚ pausar'}</PixelButton>
        </div>
      </PixelBlock>
      {error ? <p className="text-red">{error}</p> : null}
      {list && !list.available ? (
        <EmptyState title="Docker não respondeu">
          Abra o Docker Desktop (ou o daemon) e espere ele ficar pronto.
          {list.error ? <span className="mt-2 block font-mono text-xs">{list.error}</span> : null}
        </EmptyState>
      ) : (
        <PixelBlock className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <thead className="border-b border-line/60 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-comment">
              <tr>
                <th className="w-32 px-3 py-2">estado</th>
                <th className="px-3 py-2">container</th>
                <th className="w-32 px-3 py-2">portas</th>
                <th className="px-3 py-2">compose</th>
                <th className="w-36 px-3 py-2">tropa</th>
                <th className="w-28 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-line/40">
              {list === null ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center"><Spinner label="contando o curral…" /></td></tr>
              ) : null}
              {filtered.map((c) => {
                const up = isContainerUp(c.state)
                const isBusy = busy.has(c.id)
                return (
                  <tr key={c.id} className={cn('selectable align-top hover:bg-line/20', c.owners.length > 0 && 'bg-accent/[0.04]')}>
                    <td className="px-3 py-2.5">
                      <StatusBlock status={containerStatus(c.state, healthFromStatus(c.status))} />
                    </td>
                    <td className="px-3 py-2">
                      <p className="truncate font-semibold text-fg" title={c.name}>{c.name}</p>
                      <p className="truncate font-mono text-xs text-comment" title={c.image}>{c.image}</p>
                      <p className="truncate text-[11px] text-comment">{c.status}</p>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.ports.length ? c.ports.map((p) => <Badge key={p} tone={up ? 'green' : 'line'}>:{p}</Badge>) : <span className="text-comment">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {c.composeProject ? (
                        <>
                          <p className="truncate text-fg/90">{c.composeProject}<span className="text-comment"> · {c.composeService}</span></p>
                          <p className="truncate text-xs text-comment" title={c.workingDir ?? ''}>{c.workingDir ? shortPath(c.workingDir) : ''}</p>
                        </>
                      ) : (
                        <span className="text-comment">avulso</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {c.owners.length ? (
                        c.owners.map((o) => (
                          <button key={o.projectId} className="block truncate text-left text-green hover:underline" onClick={() => go({ name: 'project', id: o.projectId })}>
                            {o.projectName}
                          </button>
                        ))
                      ) : (
                        <span className="text-comment">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        {up ? (
                          <>
                            <Tip label="Reiniciar">
                              <PixelButton size="icon" disabled={isBusy} onClick={() => void act(c, 'restart')} aria-label={`Reiniciar ${c.name}`}>↻</PixelButton>
                            </Tip>
                            <Tip label="Parar">
                              <PixelButton size="icon" disabled={isBusy} className="text-red" onClick={() => void act(c, 'stop')} aria-label={`Parar ${c.name}`}>■</PixelButton>
                            </Tip>
                          </>
                        ) : (
                          <Tip label="Subir">
                            <PixelButton size="icon" disabled={isBusy} onClick={() => void act(c, 'start')} aria-label={`Subir ${c.name}`}>▶</PixelButton>
                          </Tip>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {list && filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-comment">Nenhum container nesse filtro.</td></tr>
              ) : null}
            </tbody>
          </table>
        </PixelBlock>
      )}
    </div>
  )
}
