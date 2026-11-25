import type { RunningProcess, ServiceStatus } from '@shared/types'

export const RunningProcessEntity = {
  idle(projectId: string, serviceId: string): RunningProcess {
    return { serviceId, projectId, status: 'idle', pid: null, pgid: null, ports: [], startedAt: null, exitCode: null, container: null }
  },

  isActive(status: ServiceStatus): boolean {
    return status === 'starting' || status === 'running'
  },

  /** Saída de processo: código 0 de um serviço longo também é "parou", não "crash". */
  statusOnExit(code: number | null, signal: NodeJS.Signals | null, stopRequested: boolean): ServiceStatus {
    if (stopRequested) return 'stopped'
    if (code === 0) return 'exited'
    if (signal === 'SIGTERM' || signal === 'SIGKILL') return 'stopped'
    return 'crashed'
  }
}
