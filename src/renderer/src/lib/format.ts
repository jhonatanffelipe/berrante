export function uptime(startedAt: string | null, now = Date.now()): string {
  if (!startedAt) return '—'
  const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}h${String(m).padStart(2, '0')}m` : m ? `${m}m${String(sec).padStart(2, '0')}s` : `${sec}s`
}

/** Troca todas as pastas de usuário de um texto (ex.: comando com vários caminhos) por `~`. */
export function shortPaths(text: string): string {
  return text.replace(/\/Users\/[^/\s]+/g, '~').replace(/\/home\/[^/\s]+/g, '~')
}

export function shortPath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~')
}

/** Duração curta: "42s", "1min 05s". */
export function duration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, '0')}s`
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
