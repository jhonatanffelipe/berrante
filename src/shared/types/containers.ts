import type { ContainerState } from './runtime'

/** Ação sobre um container avulso (pelo ID, na tela do curral). */
export type ContainerAction = 'start' | 'stop' | 'restart'

/** Ação sobre os containers de uma stack compose da tropa (pelo serviço do compose). */
export type StackAction = 'up' | 'stop' | 'restart'

export interface ContainerOwner {
  projectId: string
  projectName: string
}

/** Um container da máquina (`docker ps -a`), com a tropa dona quando a pasta do compose é de um repo dela. */
export interface DockerContainer {
  id: string
  name: string
  image: string
  /** running, exited, paused, restarting, created, dead… */
  state: string
  /** Texto do docker: "Up 3 minutes (healthy)", "Exited (0) 2 hours ago". */
  status: string
  /** Portas publicadas como "host:container". */
  ports: string[]
  composeProject: string | null
  composeService: string | null
  workingDir: string | null
  owners: ContainerOwner[]
}

export interface ContainerList {
  available: boolean
  /** Motivo quando o docker não responde. */
  error: string | null
  containers: DockerContainer[]
}

export interface StackService {
  service: string
  /** null = nunca criado (o compose ainda não subiu esse serviço). */
  container: ContainerState | null
}

/** Containers que um passo `docker compose ... up` da tropa sobe. */
export interface ProjectStack {
  /** ID do passo do plano que define a stack. */
  id: string
  name: string
  cwd: string
  /** Comando compose sem o `up` (ex.: `docker compose -f docker-compose.dev.yml`). */
  compose: string
  services: StackService[]
  error: string | null
}

export interface ProjectContainers {
  available: boolean
  stacks: ProjectStack[]
}
