import type { ServiceStatus } from '@shared/types'

/** Estado do docker (+ health) no mesmo vocabulário dos serviços da tropa. */
export function containerStatus(state: string | null | undefined, health?: string | null): ServiceStatus {
  switch (state) {
    case 'running':
      return health === 'starting' ? 'starting' : health === 'unhealthy' ? 'crashed' : 'running'
    case 'restarting':
    case 'created':
      return 'starting'
    case 'dead':
      return 'crashed'
    case 'exited':
    case 'paused':
      return 'stopped'
    default:
      return 'idle'
  }
}

export const isContainerUp = (state: string | null | undefined): boolean => state === 'running' || state === 'restarting'

/** Health no texto do `docker ps` ("Up 3 minutes (healthy)", "(health: starting)"). */
export function healthFromStatus(status: string): string | null {
  const m = /\((healthy|unhealthy|health: starting)\)/.exec(status)
  return m ? m[1]!.replace('health: ', '') : null
}
