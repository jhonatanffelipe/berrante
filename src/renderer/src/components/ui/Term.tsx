import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

/** Vocabulário caipira com o termo técnico no tooltip. */
export function Term({ children, tech, side = 'bottom' }: { children: ReactNode; tech: string; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>
        <span className="cursor-help underline decoration-comment decoration-dotted underline-offset-4">{children}</span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={6} className="pixel-block pixel-block-sm z-50 max-w-xs bg-darker px-3 py-2 font-mono text-xs text-fg">
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
        <Tooltip.Content sideOffset={6} className="pixel-block pixel-block-sm z-50 bg-darker px-2 py-1 font-mono text-xs text-fg">
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
