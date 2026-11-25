import type { LocalRepository, Project, Settings } from '@shared/types'

export interface ProjectRepository {
  list(): Promise<Project[]>
  findById(id: string): Promise<Project | null>
  save(project: Project): Promise<void>
  delete(id: string): Promise<void>
}

export interface LocalRepositoryRepository {
  list(): Promise<LocalRepository[]>
  findById(id: string): Promise<LocalRepository | null>
  findByPath(path: string): Promise<LocalRepository | null>
  save(repo: LocalRepository): Promise<void>
  delete(id: string): Promise<void>
}

export interface SettingsRepository {
  get(): Promise<Settings>
  save(settings: Settings): Promise<void>
}

/** Segredos cifrados (safeStorage). Nunca expor os valores ao renderer nem ao log. */
export interface SecretStore {
  get(key: SecretKey): Promise<string | null>
  set(key: SecretKey, value: string): Promise<void>
  delete(key: SecretKey): Promise<void>
}
export type SecretKey = 'github.token' | 'github.source' | 'totp.secret' | 'totp.recovery' | 'totp.lastStep'

/** Estado de processos spawnados, para re-adotar após reiniciar o app (processos "mantidos"). */
export interface PersistedProcess {
  serviceId: string
  projectId: string
  pid: number
  pgid: number
  logFile: string
  startedAt: string
}

export interface RuntimeStateRepository {
  load(): Promise<PersistedProcess[]>
  save(entries: PersistedProcess[]): Promise<void>
}
