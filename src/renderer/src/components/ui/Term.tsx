import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

/** Vocabulário caipira com o termo técnico no tooltip. */
export function Term({ children, tech, side = 'bottom' }: { children: ReactNode; tech: string; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>
        <span className="cursor-help underline decoration-comment/60 decoration-dotted underline-offset-4">{children}</span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded border border-line bg-darker px-3 py-2 text-xs text-fg shadow-lg">
          {tech}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

/** Tooltip genérico para botões de ícone. */
export function Tip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content sideOffset={6} className="z-50 rounded border border-line bg-darker px-2 py-1 text-xs text-fg shadow-lg">
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
