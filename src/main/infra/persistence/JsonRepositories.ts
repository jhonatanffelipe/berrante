import { homedir } from 'node:os'
import { join } from 'node:path'
import type { LocalRepository, Project, Settings } from '@shared/types'
import type {
  LocalRepositoryRepository,
  PersistedProcess,
  ProjectRepository,
  RuntimeStateRepository,
  SettingsRepository
} from '@main/domain/repositories'
import { JsonFile } from './JsonFile'

export class JsonProjectRepository implements ProjectRepository {
  private readonly file: JsonFile<Project[]>
  constructor(dir: string) {
    this.file = new JsonFile(join(dir, 'projects.json'), () => [])
  }
  async list(): Promise<Project[]> {
    return [...(await this.file.read())].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
  async findById(id: string): Promise<Project | null> {
    return (await this.file.read()).find((p) => p.id === id) ?? null
  }
  async save(project: Project): Promise<void> {
    await this.file.update((all) => [...all.filter((p) => p.id !== project.id), project])
  }
  async delete(id: string): Promise<void> {
    await this.file.update((all) => all.filter((p) => p.id !== id))
  }
}

export class JsonLocalRepositoryRepository implements LocalRepositoryRepository {
  private readonly file: JsonFile<LocalRepository[]>
  constructor(dir: string) {
    this.file = new JsonFile(join(dir, 'repositories.json'), () => [])
  }
  async list(): Promise<LocalRepository[]> {
    return [...(await this.file.read())].sort((a, b) => a.name.localeCompare(b.name))
  }
  async findById(id: string): Promise<LocalRepository | null> {
    return (await this.file.read()).find((r) => r.id === id) ?? null
  }
  async findByPath(path: string): Promise<LocalRepository | null> {
    return (await this.file.read()).find((r) => r.path === path) ?? null
  }
  async save(repo: LocalRepository): Promise<void> {
    await this.file.update((all) => [...all.filter((r) => r.id !== repo.id), repo])
  }
  async delete(id: string): Promise<void> {
    await this.file.update((all) => all.filter((r) => r.id !== id))
  }
}

export const DEFAULT_SETTINGS = (): Settings => ({
  cloneRoot: join(homedir(), 'www'),
  aiCli: 'claude',
  aiEnabled: false,
  accent: 'azul',
  tintBackground: true,
  showGrid: true,
  notifications: true,
  terminalApp: 'Terminal',
  stopTimeoutMs: 5000
})

export class JsonSettingsRepository implements SettingsRepository {
  private readonly file: JsonFile<Partial<Settings>>
  constructor(dir: string) {
    this.file = new JsonFile(join(dir, 'settings.json'), () => ({}))
  }
  /** Só chaves conhecidas (descarta campos de versões antigas, como `theme`). */
  async get(): Promise<Settings> {
    const defaults = DEFAULT_SETTINGS()
    const stored = (await this.file.read()) as Record<string, unknown>
    const merged = { ...defaults } as Record<string, unknown>
    for (const key of Object.keys(defaults)) if (stored[key] !== undefined) merged[key] = stored[key]
    return merged as unknown as Settings
  }
  async save(settings: Settings): Promise<void> {
    await this.file.write(settings)
  }
}

export class JsonRuntimeStateRepository implements RuntimeStateRepository {
  private readonly file: JsonFile<PersistedProcess[]>
  constructor(dir: string) {
    this.file = new JsonFile(join(dir, 'runtime-state.json'), () => [])
  }
  load(): Promise<PersistedProcess[]> {
    return this.file.read()
  }
  save(entries: PersistedProcess[]): Promise<void> {
    return this.file.write(entries)
  }
}
