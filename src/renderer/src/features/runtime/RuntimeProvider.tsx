import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { LogChunk, ProjectRuntime } from '@shared/types'
import { call, subscribe } from '../../lib/api'

type LogListener = (data: string) => void

interface RuntimeCtx {
  runtimes: Record<string, ProjectRuntime>
  setRuntime: (rt: ProjectRuntime) => void
  onLog: (key: string, listener: LogListener) => () => void
}

const Ctx = createContext<RuntimeCtx | null>(null)

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [runtimes, setRuntimes] = useState<Record<string, ProjectRuntime>>({})
  const listeners = useRef(new Map<string, Set<LogListener>>())

  useEffect(() => {
    const offStatus = subscribe('runtime:status', (rt) => setRuntimes((all) => ({ ...all, [rt.projectId]: rt })))
    const offLogs = subscribe('runtime:logs', (chunks: LogChunk[]) => {
      for (const c of chunks) listeners.current.get(c.serviceId)?.forEach((l) => l(c.data))
    })
    return () => {
      offStatus()
      offLogs()
    }
  }, [])

  // Funções estáveis: o LogViewer depende de onLog e não pode recriar o terminal a cada status.
  const setRuntime = useCallback((rt: ProjectRuntime) => setRuntimes((all) => ({ ...all, [rt.projectId]: rt })), [])
  const onLog = useCallback((key: string, listener: LogListener) => {
    const set = listeners.current.get(key) ?? new Set()
    set.add(listener)
    listeners.current.set(key, set)
    return () => {
      set.delete(listener)
    }
  }, [])
  const value = useMemo<RuntimeCtx>(() => ({ runtimes, setRuntime, onLog }), [runtimes, setRuntime, onLog])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRuntimeCtx(): RuntimeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('RuntimeProvider ausente')
  return ctx
}

/** Runtime de uma tropa: carrega via IPC e depois acompanha os eventos. */
export function useProjectRuntime(projectId: string): ProjectRuntime | null {
  const { runtimes, setRuntime } = useRuntimeCtx()
  useEffect(() => {
    void call('runtime:get', { projectId }).then(setRuntime).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])
  return runtimes[projectId] ?? null
}
