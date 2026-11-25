import * as RTabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

export const Tabs = RTabs.Root
export const TabsContent = RTabs.Content

export function TabsList({ items }: { items: { value: string; label: ReactNode }[] }) {
  return (
    <RTabs.List className="flex gap-1 border-b-4 border-line">
      {items.map((i) => (
        <RTabs.Trigger
          key={i.value}
          value={i.value}
          className="-mb-1 px-4 py-2 font-pixel text-pixel uppercase text-comment data-[state=active]:bg-line data-[state=active]:text-fg hover:text-fg"
        >
          {i.label}
        </RTabs.Trigger>
      ))}
    </RTabs.List>
  )
}
