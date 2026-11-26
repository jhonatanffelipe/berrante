import { useEffect, useRef } from 'react'
import type { MenuCommand } from '@shared/menu'

/** Assina os comandos do menu nativo. O handler mais recente é sempre o usado (sem re-assinar). */
export function useMenuCommand(handler: (command: MenuCommand) => void): void {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => window.berrante.on('menu:command', (cmd) => ref.current(cmd)), [])
}
