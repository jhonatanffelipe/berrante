/** "Linha completada": uma fileira de blocos acende e some quando toda a boiada fica de pé. */
export function LineClear({ onDone }: { onDone: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex origin-center animate-line-clear gap-[3px] px-2" onAnimationEnd={onDone} aria-hidden>
      {Array.from({ length: 48 }, (_, i) => (
        <span key={i} className="h-3 flex-1 rounded-[1px] bg-accent shadow-[0_0_10px_rgb(var(--c-accent)/0.8)]" />
      ))}
      <span className="label absolute inset-x-0 -bottom-7 text-center !text-accent">boiada completa</span>
    </div>
  )
}
