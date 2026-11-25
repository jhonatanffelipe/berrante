import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthStatus, LocalRepository, Project, Settings } from '@shared/types'
import { call } from '../../lib/api'

export type View = { name: 'project'; id: string } | { name: 'repos' } | { name: 'ports' } | { name: 'settings' }

interface AppDataCtx {
  view: View
  go: (v: View) => void
  projects: Project[]
  repos: LocalRepository[]
  settings: Settings | null
  auth: AuthStatus | null
  reloadProjects: () => Promise<void>
  reloadRepos: () => Promise<void>
  setSettings: (s: Settings) => void
  setAuth: (a: AuthStatus) => void
  upsertProject: (p: Project) => void
}

const Ctx = createContext<AppDataCtx | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>({ name: 'repos' })
  const [projects, setProjects] = useState<Project[]>([])
  const [repos, setRepos] = useState<LocalRepository[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [auth, setAuth] = useState<AuthStatus | null>(null)

  const reloadProjects = useCallback(async () => setProjects(await call('projects:list')), [])
  const reloadRepos = useCallback(async () => setRepos(await call('repos:listLocal')), [])

  useEffect(() => {
    void (async () => {
      const [p, r, s, a] = await Promise.all([call('projects:list'), call('repos:listLocal'), call('settings:get'), call('auth:status')])
      setProjects(p)
      setRepos(r)
      setSettings(s)
      setAuth(a)
      if (p[0]) setView({ name: 'project', id: p[0].id })
    })()
  }, [])

  useEffect(() => {
    if (!settings) return
    document.documentElement.dataset.theme = settings.theme
    document.body.classList.toggle('bg-grid', settings.showGrid)
  }, [settings])

  const upsertProject = (p: Project) => setProjects((all) => (all.some((x) => x.id === p.id) ? all.map((x) => (x.id === p.id ? p : x)) : [...all, p]))

  return (
    <Ctx.Provider value={{ view, go: setView, projects, repos, settings, auth, reloadProjects, reloadRepos, setSettings, setAuth, upsertProject }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAppData(): AppDataCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('AppDataProvider ausente')
  return ctx
}
