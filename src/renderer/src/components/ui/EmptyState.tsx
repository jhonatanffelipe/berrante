import type { ReactNode } from 'react'
import { Tetromino } from './Tetromino'

/** Pilha de blocos decorativa + mensagem. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex items-end gap-1">
        <Tetromino shape="ell" accent="purple" cell={14} className="animate-block-drop" />
        <Tetromino shape="square" accent="pink" cell={14} className="animate-block-drop [animation-delay:120ms]" />
        <Tetromino shape="tee" accent="cyan" cell={14} className="animate-block-drop [animation-delay:240ms]" />
        <Tetromino shape="jay" accent="green" cell={14} className="animate-block-drop [animation-delay:360ms]" />
      </div>
      <h2 className="font-pixel text-pixel-lg text-fg">{title}</h2>
      {children ? <div className="max-w-md text-comment">{children}</div> : null}
    </div>
  )
}
