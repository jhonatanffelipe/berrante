import { useState } from 'react'
import { Tetromino } from '../../components/ui/Tetromino'
import { Term } from '../../components/ui/Term'
import { PixelButton } from '../../components/ui/PixelButton'
import { StatusBlock } from '../../components/ui/StatusBlock'
import { cn } from '../../lib/cn'
import { accentText } from '../../lib/accent'
import { useAppData, type View } from './AppData'
import { useRuntimeCtx } from '../runtime/RuntimeProvider'
import { ProjectFormDialog } from '../projects/ProjectFormDialog'

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-center gap-3 px-3 py-2 text-left font-pixel text-pixel uppercase', active ? 'bg-line text-fg' : 'text-comment hover:bg-line/40 hover:text-fg')}
    >
      {children}
    </button>
  )
}

export function Sidebar() {
  const { view, go, projects, auth } = useAppData()
  const { runtimes } = useRuntimeCtx()
  const [creating, setCreating] = useState(false)
  const is = (v: View['name'], id?: string) => view.name === v && (!id || (view.name === 'project' && view.id === id))

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-deep shadow-[4px_0_0_0_rgb(var(--c-line))]">
      {/* área de arrastar da janela (titleBarStyle hiddenInset) */}
      <div className="h-10 shrink-0 [-webkit-app-region:drag]" />
      <div className="flex items-center gap-3 px-4 pb-4">
        <div className="flex flex-col gap-0.5">
          <Tetromino shape="tee" accent="purple" cell={6} />
          <Tetromino shape="bar" accent="pink" cell={6} />
        </div>
        <div>
          <h1 className="font-pixel text-pixel-lg text-purple">Berrante</h1>
          <p className="font-terminal text-lg leading-none text-comment">um toque, a boiada vem</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <span className="font-pixel text-[9px] uppercase text-comment">
          <Term tech="Projeto: um grupo de repositórios que sobem juntos">Tropas</Term>
        </span>
        <PixelButton size="sm" accent="purple" onClick={() => setCreating(true)} aria-label="Nova tropa">
          +
        </PixelButton>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-auto px-2">
        {projects.length === 0 ? <p className="px-3 py-2 text-xs text-comment">Nenhuma tropa ainda.</p> : null}
        {projects.map((p) => {
          const rt = runtimes[p.id]
          const running = rt?.services.filter((s) => s.status === 'running').length ?? 0
          return (
            <button
              key={p.id}
              onClick={() => go({ name: 'project', id: p.id })}
              className={cn('flex w-full items-center gap-3 px-3 py-2 text-left', is('project', p.id) ? 'bg-line' : 'hover:bg-line/40')}
            >
              <Tetromino shape={p.icon} accent={p.color} cell={5} />
              <span className={cn('flex-1 truncate', is('project', p.id) ? 'text-fg' : accentText[p.color])}>{p.name}</span>
              {running > 0 ? <StatusBlock status={rt?.allRunning ? 'running' : 'starting'} withLabel={false} /> : null}
            </button>
          )
        })}
      </nav>

      <div className="space-y-0.5 border-t-4 border-line px-2 py-3">
        <NavItem active={is('repos')} onClick={() => go({ name: 'repos' })}>
          <span className="pixel-cell h-2.5 w-2.5 bg-cyan" /> Repositórios
        </NavItem>
        <NavItem active={is('ports')} onClick={() => go({ name: 'ports' })}>
          <span className="pixel-cell h-2.5 w-2.5 bg-orange" />
          <Term tech="Portas TCP em LISTEN e PIDs (lsof + ps)" side="right">
            Contar a boiada
          </Term>
        </NavItem>
        <NavItem active={is('settings')} onClick={() => go({ name: 'settings' })}>
          <span className="pixel-cell h-2.5 w-2.5 bg-yellow" /> Configurações
        </NavItem>
      </div>
      <div className="flex items-center gap-2 px-4 pb-4 text-xs text-comment">
        {auth?.user ? (
          <>
            <img src={auth.user.avatarUrl} alt="" className="h-5 w-5 [image-rendering:pixelated]" />
            <span className="truncate">@{auth.user.login}</span>
          </>
        ) : (
          <span>GitHub desconectado</span>
        )}
      </div>
      <ProjectFormDialog open={creating} onOpenChange={setCreating} project={null} />
    </aside>
  )
}
