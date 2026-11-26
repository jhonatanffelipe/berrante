export type ServiceStatus = 'idle' | 'starting' | 'running' | 'crashed' | 'stopped' | 'exited'

export interface RunningProcess {
  serviceId: string
  projectId: string
  status: ServiceStatus
  pid: number | null
  pgid: number | null
  ports: number[]
  startedAt: string | null
  exitCode: number | null
  /** Para compose: estado e health do container. */
  container: ContainerState | null
}

export interface ContainerState {
  name: string
  state: string
  health: string | null
  ports: string[]
}

/** Resumo da última vez que o berrante tocou para a tropa (só na memória do app). */
export interface PlaySummary {
  finishedAt: string
  durationMs: number
  ok: boolean
  /** Nome do passo que falhou, se o workflow parou no meio. */
  haltedAt: string | null
}

export interface ProjectRuntime {
  projectId: string
  services: RunningProcess[]
  allRunning: boolean
  lastPlay: PlaySummary | null
}

export interface LogChunk {
  serviceId: string
  data: string
}

export interface PortConflict {
  port: number
  serviceId: string
  serviceName: string
  pid: number
  command: string
}

/** Repositório com `.env` ausente ou com variáveis do exemplo faltando. */
export interface EnvIssue {
  repoId: string
  repoName: string
  exampleFile: string
  envExists: boolean
  missingKeys: string[]
}

/** Uma linha de `.env` que muda junto com a porta (valores com credencial chegam mascarados). */
export interface PortEdit {
  repoId: string
  repoName: string
  /** Caminho relativo ao repositório (ex.: `.env`, `infra/.env`). */
  file: string
  key: string
  before: string | null
  after: string
  /** port = de onde o serviço lê a porta; url = endereço que cita a porta; add = variável nova no `.env`. */
  kind: 'port' | 'url' | 'add'
}

/** Troca de porta proposta para um passo com porta ocupada. */
export interface PortChangePlan {
  serviceId: string
  serviceName: string
  port: number
  /** Porta livre na máquina e em nenhuma tropa (null = não achei uma). */
  newPort: number | null
  edits: PortEdit[]
  /** Por que não dá para trocar sozinho (ou cuidados), em texto para o usuário. */
  warnings: string[]
  canApply: boolean
}

/** Vistoria antes de tocar o berrante: portas ocupadas e `.env` incompletos. */
export interface Preflight {
  conflicts: PortConflict[]
  env: EnvIssue[]
}

export interface StartResult {
  started: string[]
  skipped: string[]
  conflicts: PortConflict[]
}

export type QuitChoice = 'keep' | 'stop' | 'cancel'
