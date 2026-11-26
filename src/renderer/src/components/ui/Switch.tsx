import * as RSwitch from '@radix-ui/react-switch'

export function Switch({ checked, onCheckedChange, disabled, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className="relative h-5 w-9 shrink-0 rounded-sm border border-line bg-darker disabled:opacity-40 data-[state=checked]:border-accent/70 data-[state=checked]:bg-accent/15"
    >
      <RSwitch.Thumb className="block h-3 w-3 translate-x-[3px] rounded-[1px] bg-comment transition-transform duration-75 data-[state=checked]:translate-x-[19px] data-[state=checked]:bg-accent data-[state=checked]:shadow-[0_0_8px_rgb(var(--c-accent)/0.6)]" />
    </RSwitch.Root>
  )
}
