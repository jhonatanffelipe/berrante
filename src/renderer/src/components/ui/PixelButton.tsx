import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { accentFace, type Tone } from '../../lib/accent'
import { cn } from '../../lib/cn'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  accent?: Tone
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

/** Botão que "afunda" 2px ao clicar. `line` = contornado; as demais cores = preenchido. */
export const PixelButton = forwardRef<HTMLButtonElement, Props>(function PixelButton(
  { accent = 'line', size = 'md', className, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'pixel-btn',
        accentFace[accent],
        size === 'sm' && '!px-2 !py-1 !text-[10px]',
        size === 'lg' && '!px-5 !py-2.5 !text-[12px]',
        size === 'icon' && '!h-7 !w-7 !p-0 !text-[11px]',
        className
      )}
      {...rest}
    />
  )
})
