import * as RTabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

export const Tabs = RTabs.Root
export const TabsContent = RTabs.Content

export function TabsList({ items }: { items: { value: string; label: ReactNode }[] }) {
  return (
    <RTabs.List className="flex gap-6 border-b border-line">
      {items.map((i) => (
        <RTabs.Trigger
          key={i.value}
          value={i.value}
          className="-mb-px border-b-2 border-transparent pb-2.5 pt-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-comment hover:text-fg data-[state=active]:border-accent data-[state=active]:text-fg"
        >
          {i.label}
        </RTabs.Trigger>
      ))}
    </RTabs.List>
  )
}
