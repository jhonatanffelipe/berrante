import type { ReactNode } from 'react'

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="label-muted">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-comment">{hint}</span> : null}
    </label>
  )
}
