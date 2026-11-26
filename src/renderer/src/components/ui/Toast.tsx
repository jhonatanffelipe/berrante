import * as RToast from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { PixelBlock } from './PixelBlock'
import { accentText, type Tone } from '../../lib/accent'

interface ToastItem {
  id: number
  title: string
  body?: string
  accent: Tone
}

const Ctx = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => undefined)
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((t: Omit<ToastItem, 'id'>) => setItems((all) => [...all.slice(-3), { ...t, id: Date.now() + Math.random() }]), [])
  return (
    <Ctx.Provider value={push}>
      <RToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((t) => (
          <RToast.Root key={t.id} onOpenChange={(open) => !open && setItems((all) => all.filter((x) => x.id !== t.id))} className="animate-block-drop">
            <PixelBlock accent={t.accent} size="sm" glow className="w-80 bg-deep px-4 py-3">
              <RToast.Title className={`label ${accentText[t.accent]}`}>{t.title}</RToast.Title>
              {t.body ? <RToast.Description className="selectable mt-1 whitespace-pre-wrap break-words text-xs text-fg/80">{t.body}</RToast.Description> : null}
            </PixelBlock>
          </RToast.Root>
        ))}
        <RToast.Viewport className="fixed bottom-4 right-4 z-[60] flex flex-col gap-3 outline-none" />
      </RToast.Provider>
    </Ctx.Provider>
  )
}
