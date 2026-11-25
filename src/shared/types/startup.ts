import type { DraculaAccent } from './palette'

export type PackageManagerName = 'yarn' | 'pnpm' | 'npm' | 'bun'

export interface PackageManagerInfo {
  name: PackageManagerName
  version: string | null
  /** De onde veio a decisão (lockfile, campo packageManager ou fallback). */
  source: 'packageManager' | 'lockfile' | 'fallback'
  lockfile: string | null
}

export type ScriptCategory = 'service' | 'action'

export interface ClassifiedScript {
  name: string
  command: string
  category: ScriptCategory
}

export interface ComposeServiceInfo {
  name: string
  image: string | null
  containerName: string | null
  ports: string[]
  profiles: string[]
  hasHealthcheck: boolean
  dependsOn: string[]
}

export interface ComposeInfo {
  file: string
  projectName: string | null
  services: ComposeServiceInfo[]
  externalNetworks: string[]
  /** 'docker' = `docker compose config`; 'yaml' = fallback lendo o arquivo. */
  source: 'docker' | 'yaml'
}

export interface ReadmeSuggestion {
  section: string
  commands: string[]
}

export interface EnvCheck {
  exampleFile: string
  envFile: string
  envExists: boolean
  missingKeys: string[]
}

export interface RepoDetection {
  repoId: string
  repoName: string
  repoPath: string
  packageJson: boolean
  packageManager: PackageManagerInfo | null
  nodeModulesInstalled: boolean
  scripts: ClassifiedScript[]
  compose: ComposeInfo | null
  readme: ReadmeSuggestion[]
  env: EnvCheck | null
  warnings: string[]
}

/**
 * - setup:   comando de preparo que termina (ex: docker network create, yarn install)
 * - compose: serviço do docker compose
 * - script:  script longo do package.json (yarn dev)
 * - command: comando livre (sugerido por README/IA ou digitado)
 */
export type ServiceKind = 'setup' | 'compose' | 'script' | 'command'
export type ServiceOrigin = 'detected' | 'readme' | 'ai' | 'user'

export interface ServiceDefinition {
  id: string
  repoId: string
  name: string
  kind: ServiceKind
  /** Comando de shell. Para compose, é o nome do serviço. */
  command: string
  composeFile: string | null
  /** Caminho absoluto. */
  cwd: string
  env: Record<string, string>
  enabled: boolean
  order: number
  dependsOn: string[]
  color: DraculaAccent
  origin: ServiceOrigin
}

export interface RepoAction {
  repoId: string
  name: string
  command: string
}

export interface StartupPlan {
  services: ServiceDefinition[]
  actions: RepoAction[]
  detectedAt: string
  updatedAt: string
}

export interface PlanDiffEntry {
  type: 'added' | 'removed' | 'changed'
  serviceId: string
  name: string
  before: ServiceDefinition | null
  after: ServiceDefinition | null
  fields: string[]
}

export interface AiPlanSuggestion {
  cli: AiCliName
  plan: StartupPlan
  diff: PlanDiffEntry[]
  notes: string | null
}

export type AiCliName = 'claude' | 'agy'
