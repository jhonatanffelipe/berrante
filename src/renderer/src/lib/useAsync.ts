import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './api'

/** Busca simples com loading/erro/reload; evita race de respostas antigas. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const seq = useRef(0)

  const load = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    try {
      const result = await fn()
      if (id === seq.current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      if (id === seq.current) setError(errorMessage(err))
    } finally {
      if (id === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void load()
  }, [load])

  return { data, setData, error, loading, reload: load }
}

export function useInterval(fn: () => void, ms: number | null): void {
  const saved = useRef(fn)
  saved.current = fn
  useEffect(() => {
    if (ms === null) return
    const id = setInterval(() => saved.current(), ms)
    return () => clearInterval(id)
  }, [ms])
}
