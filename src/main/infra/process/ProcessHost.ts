import type { ChildProcess } from 'node:child_process'

export interface SpawnedProcess {
  child: ChildProcess
  /** PID mostrado ao usuário e usado para cruzar com lsof/ps. */
  pid: number
  /** Grupo de processos do serviço (alvo do SIGTERM/SIGKILL). */
  pgid: number
}

/**
 * Como o sistema sobe um serviço num grupo de processos próprio e encerra o grupo.
 * macOS/Linux: `spawn(shell, ['-c', cmd], { detached })`. Windows: `wsl.exe … setsid` dentro da distro.
 */
export interface ProcessHost {
  spawn(command: string, cwd: string, env: Record<string, string>, logFd: number): Promise<SpawnedProcess>
  isGroupAlive(pgid: number): Promise<boolean>
  /** SIGTERM no grupo e SIGKILL depois do timeout. */
  terminateGroup(pgid: number, timeoutMs: number): Promise<void>
}
