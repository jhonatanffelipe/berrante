/** Três blocos piscando em sequência. */
export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-comment" role="status">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-blink rounded-[1px] bg-accent" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </span>
      {label ? <span className="font-mono text-xs">{label}</span> : null}
    </span>
  )
}
