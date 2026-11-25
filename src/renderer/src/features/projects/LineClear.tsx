import { DRACULA_ACCENTS } from '@shared/types'
import { accentBg } from '../../lib/accent'

/** "Linha completada": uma fileira de blocos acende e some quando toda a boiada fica de pé. */
export function LineClear({ onDone }: { onDone: () => void }) {
  const cells = Array.from({ length: 24 }, (_, i) => DRACULA_ACCENTS[i % DRACULA_ACCENTS.length]!)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex origin-center animate-line-clear gap-0.5 px-4" onAnimationEnd={onDone} aria-hidden>
      {cells.map((c, i) => (
        <span key={i} className={`pixel-cell h-4 flex-1 ${accentBg[c]}`} />
      ))}
      <span className="absolute inset-x-0 -bottom-7 text-center font-pixel text-pixel text-green">boiada completa!</span>
    </div>
  )
}
