import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { DraculaAccent } from '@shared/types'
import { accentFace } from '../../lib/accent'
import { cn } from '../../lib/cn'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  accent?: DraculaAccent | 'line'
  size?: 'sm' | 'md' | 'lg'
}

/** Botão que "afunda" 2px ao clicar. */
export const PixelButton = forwardRef<HTMLButtonElement, Props>(function PixelButton(
  { accent = 'line', size = 'md', className, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('pixel-btn', accentFace[accent], size === 'sm' && '!px-2 !py-1 !text-[8px]', size === 'lg' && '!px-5 !py-3 !text-pixel-lg', className)}
      {...rest}
    />
  )
})
