import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { call } from '../../lib/api'
import { themeColor } from '../../lib/themeColors'
import { useRuntimeCtx } from './RuntimeProvider'

/**
 * Log em tempo real com cores ANSI (xterm.js). O histórico vem do buffer circular do main;
 * o scrollback do xterm é o buffer circular do lado do renderer.
 */
export function LogViewer({ logKey, height = 280 }: { logKey: string; height?: number }) {
  const host = useRef<HTMLDivElement>(null)
  const { onLog } = useRuntimeCtx()

  useEffect(() => {
    if (!host.current) return
    const term = new Terminal({
      convertEol: true,
      disableStdin: true,
      cursorBlink: false,
      cursorStyle: 'underline',
      scrollback: 5000,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 12,
      lineHeight: 1.2,
      theme: {
        background: themeColor('darker'),
        foreground: themeColor('fg'),
        cursor: themeColor('darker'),
        selectionBackground: themeColor('purple', 0.35),
        black: themeColor('deep'),
        brightBlack: themeColor('comment'),
        red: themeColor('red'),
        brightRed: themeColor('red'),
        green: themeColor('green'),
        brightGreen: themeColor('green'),
        yellow: themeColor('yellow'),
        brightYellow: themeColor('yellow'),
        blue: themeColor('purple'),
        brightBlue: themeColor('purple'),
        magenta: themeColor('pink'),
        brightMagenta: themeColor('pink'),
        cyan: themeColor('cyan'),
        brightCyan: themeColor('cyan'),
        white: themeColor('fg'),
        brightWhite: themeColor('fg')
      }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host.current)
    fit.fit()

    let disposed = false
    const pending: string[] = []
    let ready = false
    const off = onLog(logKey, (data) => (ready ? term.write(data) : pending.push(data)))
    void call('runtime:getLogs', { serviceId: logKey })
      .then((history) => {
        if (disposed) return
        term.write(history)
        // Chunks que chegaram durante o fetch e já podem estar no histórico: só os que vieram depois.
        ready = true
        pending.length = 0
      })
      .catch(() => (ready = true))

    const observer = new ResizeObserver(() => fit.fit())
    observer.observe(host.current)
    return () => {
      disposed = true
      off()
      observer.disconnect()
      term.dispose()
    }
  }, [logKey, onLog])

  return <div ref={host} className="selectable bg-darker p-2" style={{ height }} />
}
