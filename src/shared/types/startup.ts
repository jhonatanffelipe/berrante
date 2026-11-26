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
 * Origem do passo (só informativa). O comportamento vem de `waitFor`.
 * - setup:   comando que termina (docker compose up -d, yarn install, rede)
 * - compose: legado: um container do compose por linha (planos antigos)
 * - script:  script longo do package.json (yarn dev)
 * - command: comando livre digitado ou sugerido pela IA
 */
export type ServiceKind = 'setup' | 'compose' | 'script' | 'command'
export type ServiceOrigin = 'detected' | 'readme' | 'ai' | 'user'

/**
 * Quando o workflow segue para o próximo passo:
 * - exit:  o comando termina com sucesso (docker compose up -d, yarn install)
 * - port:  o processo abre uma porta TCP (yarn dev de uma API ou front)
 * - start: o processo continua vivo por alguns segundos (worker, fila)
 */
export type WaitFor = 'exit' | 'port' | 'start'

/** Um passo do workflow de subida: roda `command` em `cwd`, na ordem de `order`. */
export interface ServiceDefinition {
  id: string
  /** Repositório da tropa que contém `cwd` (o main recalcula ao salvar). */
  repoId: string
  name: string
  kind: ServiceKind
  /** Comando de shell. No legado `compose`, é o nome do serviço. */
  command: string
  composeFile: string | null
  /** Caminho absoluto, dentro de um repositório da tropa. */
  cwd: string
  env: Record<string, string>
  enabled: boolean
  order: number
  /** Ausente em planos antigos: veja `stepWaitFor`. */
  waitFor?: WaitFor
  /** Legado: planos novos rodam só pela ordem e deixam vazio. */
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

/** Passo sugerido pela IA, com o porquê de estar naquela posição. */
export interface AiWorkflowStep {
  step: ServiceDefinition
  reason: string
}

/** Workflow sugerido pela IA: só uma sugestão, o usuário escolhe o que entra no plano. */
export interface AiWorkflowSuggestion {
  cli: AiCliName
  steps: AiWorkflowStep[]
  notes: string | null
}

export type AiCliName = 'claude' | 'agy'
