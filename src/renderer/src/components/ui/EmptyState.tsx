import type { ReactNode } from 'react'
import { Tetromino } from './Tetromino'

/** Pilha de blocos decorativa + mensagem. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      <div className="flex items-end gap-1 opacity-90">
        <Tetromino shape="ell" accent="accent" cell={12} className="animate-block-drop" />
        <Tetromino shape="square" accent="accent" cell={12} className="animate-block-drop opacity-70 [animation-delay:120ms]" />
        <Tetromino shape="tee" accent="accent" cell={12} className="animate-block-drop opacity-50 [animation-delay:240ms]" />
        <Tetromino shape="jay" accent="accent" cell={12} className="animate-block-drop opacity-30 [animation-delay:360ms]" />
      </div>
      <h2 className="title text-lg">{title}</h2>
      {children ? <div className="max-w-md text-comment">{children}</div> : null}
    </div>
  )
}
