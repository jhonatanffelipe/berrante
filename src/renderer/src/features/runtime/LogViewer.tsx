import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { call, errorMessage } from '../../lib/api'
import { PixelButton } from '../../components/ui/PixelButton'
import { Tip } from '../../components/ui/Term'
import { useToast } from '../../components/ui/Toast'
import { themeColor } from '../../lib/themeColors'
import { useRuntimeCtx } from './RuntimeProvider'

interface Match {
  row: number
  col: number
  len: number
}

/** Linhas que parecem erro (pt e en, Node, Python, Go…). */
const ERROR_RE = /(error|erro\b|exception|fatal|failed|falhou|ERR!|panic|unhandled|traceback)/gi
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07/g

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Procura no buffer do xterm (linhas quebradas contam separado, o que basta para log). */
function findMatches(term: Terminal, re: RegExp): Match[] {
  const buf = term.buffer.active
  const out: Match[] = []
  for (let y = 0; y < buf.length; y++) {
    const line = buf.getLine(y)?.translateToString(true)
    if (!line) continue
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(line))) {
      out.push({ row: y, col: m.index, len: Math.max(1, m[0].length) })
      if (!m[0].length) re.lastIndex++
    }
  }
  return out
}

/**
 * Log em tempo real com cores ANSI (xterm.js). O histórico vem do buffer circular do main;
 * o scrollback do xterm é o buffer circular do lado do renderer.
 */
export function LogViewer({ logKey, height = 280 }: { logKey: string; height?: number }) {
  const host = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const cursor = useRef<{ row: number; col: number } | null>(null)
  const { onLog } = useRuntimeCtx()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<{ index: number; total: number } | null>(null)

  /** Vai para a próxima (ou anterior) ocorrência a partir da última seleção, dando a volta no fim. */
  const jump = (re: RegExp, dir: 1 | -1): boolean => {
    const term = termRef.current
    if (!term) return false
    const matches = findMatches(term, re)
    if (!matches.length) {
      term.clearSelection()
      setHits({ index: 0, total: 0 })
      return false
    }
    const at = cursor.current
    const after = (m: Match) => !at || m.row > at.row || (m.row === at.row && m.col > at.col)
    const before = (m: Match) => at && (m.row < at.row || (m.row === at.row && m.col < at.col))
    const idx = dir === 1 ? Math.max(0, matches.findIndex(after)) : (() => {
      const list = matches.map((m, i) => [m, i] as const).filter(([m]) => before(m))
      return list.length ? list[list.length - 1]![1] : matches.length - 1
    })()
    const m = matches[idx]!
    cursor.current = { row: m.row, col: m.col }
    term.select(m.col, m.row, m.len)
    term.scrollToLine(Math.max(0, m.row - Math.floor(term.rows / 2)))
    setHits({ index: idx + 1, total: matches.length })
    return true
  }

  const search = (dir: 1 | -1) => {
    const text = query.trim()
    if (text) jump(new RegExp(escapeRe(text), 'gi'), dir)
  }

  const nextError = () => {
    if (!jump(ERROR_RE, 1)) toast({ title: 'Nenhum erro no log', accent: 'green' })
  }

  const copy = async () => {
    try {
      const text = (await call('runtime:getLogs', { serviceId: logKey })).replace(ANSI_RE, '').replace(/\r/g, '')
      await navigator.clipboard.writeText(text)
      toast({ title: 'Log copiado', accent: 'cyan' })
    } catch (err) {
      toast({ title: 'Não copiou', body: errorMessage(err), accent: 'red' })
    }
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      search(e.shiftKey ? -1 : 1)
    } else if (e.key === 'Escape') {
      setQuery('')
      setHits(null)
      cursor.current = null
      termRef.current?.clearSelection()
    }
  }

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
    termRef.current = term
    cursor.current = null

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
      termRef.current = null
      term.dispose()
    }
  }, [logKey, onLog])

  return (
    <div>
      <div className="flex items-center gap-1.5 border-b border-line/60 bg-darker px-2 py-1.5">
        <input
          className="pixel-input !w-56 !py-1 font-mono text-xs"
          placeholder="buscar no log (Enter / ⇧Enter)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHits(null)
            cursor.current = null
          }}
          onKeyDown={onKey}
          aria-label="Buscar no log"
        />
        <Tip label="Anterior (⇧Enter)">
          <PixelButton size="icon" disabled={!query.trim()} onClick={() => search(-1)} aria-label="Ocorrência anterior">↑</PixelButton>
        </Tip>
        <Tip label="Próxima (Enter)">
          <PixelButton size="icon" disabled={!query.trim()} onClick={() => search(1)} aria-label="Próxima ocorrência">↓</PixelButton>
        </Tip>
        {hits ? <span className="font-mono text-[11px] text-comment">{hits.total ? `${hits.index}/${hits.total}` : 'nada'}</span> : null}
        <div className="ml-auto flex gap-1.5">
          <PixelButton size="sm" className="text-orange" onClick={nextError}>⚠ próximo erro</PixelButton>
          <PixelButton size="sm" onClick={() => void copy()}>⧉ copiar</PixelButton>
        </div>
      </div>
      <div ref={host} className="selectable bg-darker p-2" style={{ height }} />
    </div>
  )
}
