import type { ReactNode } from 'react'

/** Cabeçalho de tela no estilo painel: "R · REPOSITÓRIOS" em mono espaçado. */
export function PageTitle({ index, title, children }: { index: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <span className="flex h-6 min-w-6 items-center justify-center rounded-sm border border-accent/60 bg-accent/10 px-1 font-mono text-[11px] font-bold text-accent">{index}</span>
      <h2 className="label !text-[13px] !text-fg">{title}</h2>
      {children ? <div className="ml-auto flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  )
}
