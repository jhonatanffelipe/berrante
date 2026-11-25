import * as RSwitch from '@radix-ui/react-switch'

export function Switch({ checked, onCheckedChange, disabled, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className="relative h-5 w-10 shrink-0 bg-darker shadow-[0_0_0_2px_rgb(var(--c-line))] disabled:opacity-40 data-[state=checked]:bg-green/30"
    >
      <RSwitch.Thumb className="pixel-cell block h-4 w-4 translate-x-0.5 bg-comment transition-transform duration-75 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-green" />
    </RSwitch.Root>
  )
}
