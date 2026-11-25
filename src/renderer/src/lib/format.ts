export function uptime(startedAt: string | null, now = Date.now()): string {
  if (!startedAt) return '—'
  const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}h${String(m).padStart(2, '0')}m` : m ? `${m}m${String(sec).padStart(2, '0')}s` : `${sec}s`
}

export function shortPath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~')
}
