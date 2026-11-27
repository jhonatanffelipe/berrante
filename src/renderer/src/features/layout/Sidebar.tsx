import { useState, type ReactNode } from 'react'
import { Tetromino } from '../../components/ui/Tetromino'
import { Term } from '../../components/ui/Term'
import { PixelButton } from '../../components/ui/PixelButton'
import { cn } from '../../lib/cn'
import { useInterval } from '../../lib/useAsync'
import { useMenuCommand } from '../../lib/useMenuCommand'
import { useAppData, type View } from './AppData'
import { useRuntimeCtx } from '../runtime/RuntimeProvider'
import { ProjectFormDialog } from '../projects/ProjectFormDialog'
import { isWindows } from '../../lib/platform'

/** Card de navegação: índice em mono, rótulo e um ponto de estado no canto. */
function NavCard({ index, active, dot, onClick, children }: { index: string; active: boolean; dot?: 'accent' | 'green' | 'yellow' | 'off'; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex w-full flex-col items-center gap-1 rounded-md border px-3 py-3 text-center transition-colors',
        active ? 'border-accent bg-accent/[0.06] shadow-[0_0_16px_-6px_rgb(var(--c-accent)/0.8)]' : 'border-line/70 bg-deep hover:border-line'
      )}
    >
      <span className={cn('absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full', dot === 'green' ? 'bg-green' : dot === 'yellow' ? 'animate-blink bg-yellow' : active || dot === 'accent' ? 'bg-accent' : 'bg-comment/50')} />
      <span className="font-mono text-[11px] text-comment">{index}</span>
      <span className={cn('flex max-w-full items-center gap-2 truncate font-semibold', active ? 'text-fg' : 'text-fg/85')}>{children}</span>
    </button>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

export function Sidebar() {
  const { view, go, projects, auth } = useAppData()
  const { runtimes } = useRuntimeCtx()
  const [creating, setCreating] = useState(false)
  useMenuCommand((cmd) => cmd.type === 'newProject' && setCreating(true))
  const [now, setNow] = useState(new Date())
  useInterval(() => setNow(new Date()), 10_000)
  const is = (v: View['name'], id?: string) => view.name === v && (!id || (view.name === 'project' && view.id === id))
  const running = Object.values(runtimes).reduce((acc, rt) => acc + rt.services.filter((s) => s.status === 'running').length, 0)

  return (
    <aside className="flex w-[216px] shrink-0 flex-col gap-3 border-r border-line/60 bg-bg px-3 pb-3">
      <div className="h-8 shrink-0 [-webkit-app-region:drag]" />
      <div className="flex flex-col items-center gap-2 border-b border-line/60 pb-4">
        <div className="flex items-center gap-2">
          <Tetromino shape="zed" accent="accent" cell={5} />
          <span className="font-pixel text-[13px] text-accent drop-shadow-[0_0_8px_rgb(var(--c-accent)/0.5)]">BERRANTE</span>
        </div>
        <span className="label-muted !text-[9px]">um toque · a boiada vem</span>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="label-muted">
          <Term tech="Projeto: um grupo de repositórios que sobem juntos">Tropas</Term>
        </span>
        <PixelButton size="icon" onClick={() => setCreating(true)} aria-label="Nova tropa">
          +
        </PixelButton>
      </div>
      <nav className="-mr-1 flex-1 space-y-2 overflow-auto pr-1">
        {projects.length === 0 ? <p className="px-1 text-xs text-comment">Nenhuma tropa ainda. Crie no +.</p> : null}
        {projects.map((p, i) => {
          const rt = runtimes[p.id]
          const up = rt?.services.filter((s) => s.status === 'running').length ?? 0
          return (
            <NavCard key={p.id} index={pad(i + 1)} active={is('project', p.id)} dot={rt?.allRunning ? 'green' : up > 0 ? 'yellow' : 'off'} onClick={() => go({ name: 'project', id: p.id })}>
              <Tetromino shape={p.icon} accent={p.color} cell={4} />
              <span className="truncate">{p.name}</span>
            </NavCard>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-line/60 pt-3">
        <NavCard index="R" active={is('repos')} onClick={() => go({ name: 'repos' })}>
          Repositórios
        </NavCard>
        <NavCard index="P" active={is('ports')} onClick={() => go({ name: 'ports' })}>
          <Term tech={isWindows ? 'Portas TCP em LISTEN e PIDs (netstat + PowerShell)' : 'Portas TCP em LISTEN e PIDs (lsof + ps)'} side="right">
            Contar a boiada
          </Term>
        </NavCard>
        <NavCard index="D" active={is('containers')} onClick={() => go({ name: 'containers' })}>
          <Term tech="Containers Docker da máquina: parar, subir e reiniciar" side="right">
            Curral
          </Term>
        </NavCard>
        <NavCard index="C" active={is('settings')} onClick={() => go({ name: 'settings' })}>
          Configurações
        </NavCard>
      </div>

      <div className="rounded-md border border-line/70 bg-deep px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className={cn('font-mono text-[10px] font-bold uppercase tracking-[0.14em]', auth?.user ? 'text-green' : 'text-comment')}>
            {auth?.user ? 'online' : 'offline'}
          </span>
          <span className="font-mono text-[10px] text-comment">{running} de pé</span>
        </div>
        <div className="mt-1 flex items-end justify-between">
          <span className="font-mono text-xl font-bold text-fg">{`${pad(now.getHours())}:${pad(now.getMinutes())}`}</span>
          {auth?.user ? <img src={auth.user.avatarUrl} alt={`@${auth.user.login}`} title={`@${auth.user.login}`} className="h-5 w-5 rounded-sm" /> : null}
        </div>
      </div>
      <ProjectFormDialog open={creating} onOpenChange={setCreating} project={null} />
    </aside>
  )
}
