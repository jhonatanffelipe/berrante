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

export interface ProjectRuntime {
  projectId: string
  services: RunningProcess[]
  allRunning: boolean
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

export interface StartResult {
  started: string[]
  skipped: string[]
  conflicts: PortConflict[]
}

export type QuitChoice = 'keep' | 'stop' | 'cancel'
