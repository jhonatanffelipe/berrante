import type {
  AiCliName,
  ComposeInfo,
  ContainerState,
  GithubRepo,
  GithubUser,
  PortBinding,
  ServiceStatus,
  WslStatus
} from '@shared/types'

// ---------- Sistema / plataforma ----------

export interface CommandResult {
  stdout: string
  stderr: string
  code: number
}

export interface RunOptions {
  cwd?: string
  env?: Record<string, string>
  timeoutMs?: number
  input?: string
}

/** Comando em execução com saída em fluxo (ex.: `docker compose up`, `logs -f`). */
export interface RunningCommand {
  /** Código de saída (null se terminou por sinal ou não conseguiu iniciar). */
  done: Promise<number | null>
  kill(): void
}

/**
 * Executa binários sem shell (argv). No macOS/Linux roda direto; no Windows o `WslCommandRunner`
 * executa dentro da distro (`wsl.exe -d <distro> --exec …`).
 */
export interface CommandRunner {
  run(file: string, args: string[], options?: RunOptions): Promise<CommandResult>
  stream(file: string, args: string[], options: Omit<RunOptions, 'input' | 'timeoutMs'>, onData: (data: string) => void): RunningCommand
  which(binary: string): Promise<string | null>
}

/**
 * Onde os repositórios vivem. No macOS/Linux é o próprio sistema; no Windows é a distro WSL:
 * os caminhos guardados são Linux (`/home/…`) e o "host" é o caminho UNC (`\\wsl.localhost\<distro>\…`).
 */
export interface Workspace {
  /** Caminho que o Node/Explorer do host consegue abrir. */
  toHost(path: string): string
  /** Converte um caminho do host (ex.: diálogo de pasta) para o caminho do workspace, ou null se não houver. */
  fromHost(hostPath: string): string | null
  exists(path: string): Promise<boolean>
  isDirectory(path: string): Promise<boolean>
  mkdirp(path: string): Promise<void>
  /** Pasta pessoal dentro do workspace (padrão da pasta de clones). */
  home(): Promise<string>
}

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
  debug(message: string, context?: Record<string, unknown>): void
}

export interface Clock {
  now(): Date
}

export interface IdGenerator {
  next(): string
}

// ---------- Inspeção de repositórios (leitura) ----------

export interface RepoFiles {
  readText(relPath: string): Promise<string | null>
  exists(relPath: string): Promise<boolean>
  list(): Promise<string[]>
}

export interface RepoInspectorGateway {
  files(repoPath: string): RepoFiles
  composeConfig(repoPath: string, composeFile: string): Promise<ComposeInfo | null>
}

// ---------- Processos ----------

export interface SpawnRequest {
  serviceId: string
  projectId: string
  command: string
  cwd: string
  env: Record<string, string>
}

export interface ProcessExit {
  serviceId: string
  code: number | null
  signal: NodeJS.Signals | null
}

export interface ProcessHandle {
  serviceId: string
  projectId: string
  pid: number
  pgid: number
  startedAt: string
  logFile: string
}

export interface ProcessManagerGateway {
  spawn(request: SpawnRequest): Promise<ProcessHandle>
  /** SIGTERM no grupo, SIGKILL após timeout. */
  stop(serviceId: string, timeoutMs: number): Promise<void>
  /** Espera um processo "setup" terminar e devolve o código de saída. */
  waitForExit(serviceId: string): Promise<ProcessExit>
  isAlive(serviceId: string): boolean
  handles(): ProcessHandle[]
  logs(serviceId: string): string
  clearLogs(serviceId: string): void
  appendLog(serviceId: string, data: string): void
  onExit(listener: (exit: ProcessExit) => void): void
  onLog(listener: (serviceId: string, data: string) => void): void
  /** Re-adota processos mantidos ao fechar o app anteriormente. */
  adopt(handles: ProcessHandle[]): Promise<ProcessHandle[]>
  stopAllManaged(timeoutMs: number): Promise<void>
}

export interface ProcessKiller {
  isAlive(pid: number): Promise<boolean>
  /** SIGTERM e SIGKILL após timeout. */
  kill(pid: number, timeoutMs: number): Promise<void>
}

// ---------- Portas ----------

export interface ProcessInfo {
  pid: number
  ppid: number
  pgid: number
  user: string
  command: string
}

export interface PortScannerGateway {
  listListening(): Promise<Omit<PortBinding, 'owner'>[]>
  processTable(): Promise<Map<number, ProcessInfo>>
}

// ---------- Docker ----------

export interface DockerGateway {
  available(): Promise<boolean>
  composeUp(cwd: string, composeFile: string, services: string[], onOutput: (data: string) => void): Promise<void>
  composeStop(cwd: string, composeFile: string, services: string[]): Promise<void>
  composeRestart(cwd: string, composeFile: string, services: string[]): Promise<void>
  composePs(cwd: string, composeFile: string): Promise<Map<string, ContainerState>>
  /** Segue logs de um serviço; retorna função para parar. */
  followLogs(cwd: string, composeFile: string, service: string, onData: (data: string) => void): () => void
  networkExists(name: string): Promise<boolean>
}

// ---------- GitHub / Git ----------

export interface GithubGateway {
  getUser(token: string): Promise<GithubUser>
  listAllRepos(token: string): Promise<Omit<GithubRepo, 'localPath'>[]>
  startDeviceFlow(clientId: string): Promise<{ deviceCode: string; userCode: string; verificationUri: string; expiresIn: number; interval: number }>
  pollDeviceFlow(
    clientId: string,
    deviceCode: string
  ): Promise<{ status: 'pending' | 'slow_down' | 'expired' | 'denied'; interval?: number } | { status: 'authorized'; token: string }>
}

export interface GitGateway {
  clone(url: string, dest: string, token: string | null): Promise<string>
  pull(repoPath: string, token: string | null): Promise<string>
  originUrl(repoPath: string): Promise<string | null>
  isRepo(path: string): Promise<boolean>
}

export interface GhCliGateway {
  token(): Promise<string | null>
}

/** Varre a pasta raiz atrás de clones (para marcar "já clonado"). */
export interface LocalCloneScanner {
  scan(root: string, depth: number): Promise<Map<string, string>>
}

// ---------- IA ----------

export interface AiCliGateway {
  path(cli: AiCliName): Promise<string>
  available(cli: AiCliName): Promise<boolean>
  /** Executa em modo não interativo e devolve o JSON bruto produzido pelo modelo. */
  requestJson(cli: AiCliName, prompt: string, schema: object, cwd: string): Promise<unknown>
}

// ---------- Segurança ----------

export interface TotpGateway {
  generateSecret(): string
  uri(secret: string, label: string, issuer: string): string
  /** Retorna o time step usado (para bloquear replay) ou null. */
  verify(secret: string, code: string, afterTimeStep: number | null): Promise<number | null>
  qrDataUrl(uri: string): Promise<string>
}

export interface Hasher {
  hash(value: string): string
  randomToken(bytes: number): string
}

/** Diagnóstico do ambiente WSL (Windows); nos outros sistemas devolve `supported: false`. */
export interface WslStatusGateway {
  status(): Promise<WslStatus>
}

// ---------- UI do SO ----------

export interface ShellGateway {
  openExternal(url: string): Promise<void>
  reveal(path: string): void
  pickFolder(title: string, defaultPath?: string): Promise<string | null>
}

export type { ServiceStatus }
