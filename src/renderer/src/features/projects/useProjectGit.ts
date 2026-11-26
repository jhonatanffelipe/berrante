import { useCallback, useEffect, useRef, useState } from 'react'
import type { RepoGitStatus } from '@shared/types'
import { call } from '../../lib/api'

/** Estado do git dos repos da tropa: carrega ao abrir e quando a janela volta ao foco. */
export function useProjectGit(projectId: string) {
  const [status, setStatus] = useState<RepoGitStatus[]>([])
  const [loading, setLoading] = useState(false)
  // Foco da janela e montagem chegam juntos: uma consulta por vez e no máximo uma a cada 3s (fetch sempre passa).
  const inFlight = useRef(false)
  const lastAt = useRef(0)

  const reload = useCallback(
    async (fetch = false) => {
      if (inFlight.current || (!fetch && Date.now() - lastAt.current < 3000)) return
      inFlight.current = true
      lastAt.current = Date.now()
      setLoading(true)
      try {
        setStatus(await call('projects:gitStatus', { projectId, fetch }))
      } catch {
        setStatus([])
      } finally {
        inFlight.current = false
        setLoading(false)
      }
    },
    [projectId]
  )

  useEffect(() => {
    setStatus([])
    lastAt.current = 0
    void reload()
    const onFocus = () => void reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  return { status, loading, reload }
}
