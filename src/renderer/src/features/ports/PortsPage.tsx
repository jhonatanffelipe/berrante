import { useMemo, useState } from 'react'
import type { PortBinding } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { useInterval } from '../../lib/useAsync'
import { cn } from '../../lib/cn'
import { shortPath } from '../../lib/format'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { Term } from '../../components/ui/Term'
import { Dialog } from '../../components/ui/Dialog'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useTotp } from '../security/TotpProvider'
import { useAppData } from '../layout/AppData'

type OwnerFilter = 'all' | 'berrante' | 'others'

/** "Contar a boiada": portas TCP em LISTEN, ao vivo (polling 2s). */
export function PortsPage() {
  const { go } = useAppData()
  const toast = useToast()
  const withTotp = useTotp()
  const [rows, setRows] = useState<PortBinding[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [owner, setOwner] = useState<OwnerFilter>('all')
  const [paused, setPaused] = useState(false)
  const [target, setTarget] = useState<PortBinding | null>(null)

  const load = async () => {
    try {
      setRows(await call('ports:list'))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  useInterval(() => void load(), paused ? null : 2000)
  if (rows === null && !error) void load()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (rows ?? []).filter((r) => {
      if (owner === 'berrante' && !r.owner) return false
      if (owner === 'others' && r.owner) return false
      if (!q) return true
      return [String(r.port), String(r.pid), r.command, r.fullCommand ?? '', r.user, r.cwd ?? '', r.owner?.projectName ?? '', r.owner?.serviceName ?? ''].some((v) => v.toLowerCase().includes(q))
    })
  }, [rows, search, owner])

  const kill = async (row: PortBinding) => {
    setTarget(null)
    try {
      const done = await withTotp(`Encerrar o PID ${row.pid} (${row.command}), que não é do Berrante, exige o código 2FA.`, async (code) => {
        await call('ports:kill', { pid: row.pid, totpCode: code })
        return true
      })
      if (done) {
        toast({ title: `PID ${row.pid} encerrado`, accent: 'green' })
        await load()
      }
    } catch (err) {
      toast({ title: 'Não deu para matar', body: errorMessage(err), accent: 'red' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto font-pixel text-pixel-lg text-orange">
          <Term tech="Portas TCP em LISTEN (lsof) + processo (ps): porta, PID, comando, usuário, cwd">Contar a boiada</Term>
        </h2>
        <input className="pixel-input max-w-xs" placeholder="porta, pid, comando, pasta…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="pixel-input w-40" value={owner} onChange={(e) => setOwner(e.target.value as OwnerFilter)}>
          <option value="all">Todos</option>
          <option value="berrante">Do Berrante</option>
          <option value="others">De fora</option>
        </select>
        <PixelButton accent={paused ? 'green' : 'line'} onClick={() => setPaused((p) => !p)}>{paused ? '▶ ao vivo' : '❚❚ pausar'}</PixelButton>
      </div>
      {error ? <p className="text-red">{error}</p> : null}
      <PixelBlock className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-line/60 font-pixel text-[8px] uppercase text-comment">
            <tr>
              <th className="w-20 px-3 py-2">porta</th>
              <th className="w-20 px-3 py-2">pid</th>
              <th className="px-3 py-2">comando</th>
              <th className="w-24 px-3 py-2">usuário</th>
              <th className="px-3 py-2">cwd</th>
              <th className="w-44 px-3 py-2">tropa / serviço</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-line/40">
            {rows === null ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center"><Spinner label="contando…" /></td></tr>
            ) : null}
            {filtered.map((r) => (
              <tr key={`${r.pid}-${r.port}`} className={cn('selectable align-top', r.owner && 'bg-green/5')}>
                <td className="px-3 py-2 font-terminal text-xl leading-none text-cyan">{r.port}</td>
                <td className="px-3 py-2 font-terminal text-lg leading-none">{r.pid}</td>
                <td className="px-3 py-2">
                  <p className="truncate text-fg">{r.command}</p>
                  <p className="truncate text-xs text-comment" title={r.fullCommand ?? ''}>{r.fullCommand}</p>
                  <p className="text-[11px] text-comment">{r.address}</p>
                </td>
                <td className="truncate px-3 py-2 text-comment">{r.user}</td>
                <td className="truncate px-3 py-2 text-xs text-comment" title={r.cwd ?? ''}>{r.cwd ? shortPath(r.cwd) : '—'}</td>
                <td className="px-3 py-2">
                  {r.owner ? (
                    <button className="text-left text-green hover:underline" onClick={() => go({ name: 'project', id: r.owner!.projectId })}>
                      {r.owner.projectName}
                      <span className="block text-xs text-comment">{r.owner.serviceName}</span>
                    </button>
                  ) : (
                    <span className="text-comment">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <PixelButton size="sm" accent="red" onClick={() => setTarget(r)}>matar</PixelButton>
                </td>
              </tr>
            ))}
            {rows && filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-comment">Nenhuma porta nesse filtro.</td></tr>
            ) : null}
          </tbody>
        </table>
      </PixelBlock>

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)} title={`Matar PID ${target?.pid ?? ''}?`} accent="red" width="max-w-md"
        description={target?.owner ? `É o serviço "${target.owner.serviceName}" da tropa ${target.owner.projectName}: o grupo inteiro recebe SIGTERM e depois SIGKILL.` : 'Processo de fora do Berrante: SIGTERM e, se não sair, SIGKILL. Exige 2FA.'}>
        <p className="selectable mb-4 break-all bg-darker p-3 text-xs">{target?.fullCommand ?? target?.command}</p>
        <div className="flex justify-end gap-2">
          <PixelButton onClick={() => setTarget(null)}>Cancelar</PixelButton>
          <PixelButton accent="red" onClick={() => target && void kill(target)}>Matar</PixelButton>
        </div>
      </Dialog>
    </div>
  )
}
