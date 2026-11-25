import * as RDialog from '@radix-ui/react-dialog'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { DraculaAccent } from '@shared/types'
import { PixelBlock } from './PixelBlock'
import { cn } from '../../lib/cn'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  accent?: DraculaAccent | 'line'
  width?: string
  children: ReactNode
}

/** Margem mínima que o diálogo mantém dentro da janela ao ser arrastado. */
const EDGE = 48

/**
 * Diálogo arrastável pelo cabeçalho.
 * O posicionamento (centro + deslocamento do arrasto) fica num wrapper e a animação no filho,
 * para o `transform` da animação não sobrescrever o da centralização.
 */
export function Dialog({ open, onOpenChange, title, description, accent = 'purple', width = 'max-w-lg', children }: Props) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setOffset({ x: 0, y: 0 })
  }, [open])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, input, textarea, select, a')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const el = box.current
    if (!d || !el) return
    const rect = el.getBoundingClientRect()
    // Limites: o cabeçalho nunca sai da janela (sempre dá para pegar de volta).
    const halfW = rect.width / 2
    const halfH = rect.height / 2
    const maxX = window.innerWidth / 2 + halfW - EDGE
    const maxY = window.innerHeight / 2 + halfH - EDGE
    const minY = -(window.innerHeight / 2 - halfH)
    const x = Math.min(maxX, Math.max(-maxX, d.baseX + e.clientX - d.startX))
    const y = Math.min(maxY, Math.max(minY, d.baseY + e.clientY - d.startY))
    setOffset({ x, y })
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-darker/80" />
        <RDialog.Content
          ref={box}
          className={cn('fixed left-1/2 top-1/2 z-50 w-[92vw]', width)}
          style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
          onPointerDownOutside={(e) => drag.current && e.preventDefault()}
        >
          <div className="animate-block-drop">
            <PixelBlock accent={accent} className="flex max-h-[85vh] flex-col bg-bg">
              <div
                className="cursor-move touch-none select-none px-5 pb-3 pt-5"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onDoubleClick={() => setOffset({ x: 0, y: 0 })}
                title="Arraste para mover · duplo clique centraliza"
              >
                <div className="flex items-start gap-3">
                  <RDialog.Title className="flex-1 font-pixel text-pixel-lg text-fg">{title}</RDialog.Title>
                  <span className="mt-1 grid grid-cols-3 gap-0.5 opacity-50" aria-hidden>
                    {Array.from({ length: 6 }, (_, i) => (
                      <span key={i} className="h-1 w-1 bg-comment" />
                    ))}
                  </span>
                </div>
                {description ? (
                  <RDialog.Description className="mt-1 text-comment">{description}</RDialog.Description>
                ) : (
                  <RDialog.Description className="sr-only">{title}</RDialog.Description>
                )}
              </div>
              <div className="overflow-auto px-5 pb-5">{children}</div>
            </PixelBlock>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}
