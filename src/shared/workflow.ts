import type { ServiceDefinition, WaitFor } from './types'

export const WAIT_FOR_LABEL: Record<WaitFor, string> = {
  exit: 'terminar',
  port: 'abrir uma porta',
  start: 'iniciar'
}

export const WAIT_FOR_HINT: Record<WaitFor, string> = {
  exit: 'Espera o comando acabar com sucesso (docker compose up -d, yarn install).',
  port: 'Espera o processo abrir uma porta TCP (yarn dev de API ou front).',
  start: 'Espera alguns segundos com o processo vivo (worker, fila).'
}

/** `waitFor` efetivo, inclusive para planos salvos antes do campo existir. */
export function stepWaitFor(s: Pick<ServiceDefinition, 'waitFor' | 'kind'>): WaitFor {
  if (s.waitFor) return s.waitFor
  if (s.kind === 'setup') return 'exit'
  if (s.kind === 'script') return 'port'
  return 'start'
}

/** Passos que ficam de pé (contam no placar "boiada completa"). */
export function isLongRunning(s: Pick<ServiceDefinition, 'waitFor' | 'kind'>): boolean {
  return s.kind === 'compose' || stepWaitFor(s) !== 'exit'
}

const COMPOSE_UP = /^\s*((?:docker\s+compose|docker-compose)\b.*?)\s+up\b/

/**
 * Para um passo `docker compose ... up ...`, devolve o comando que para os mesmos containers
 * (`docker compose ... stop`), usado ao recolher a boiada. Outros comandos: null.
 */
export function composeStopCommand(command: string): string | null {
  if (/[;&|`$<>]/.test(command)) return null
  const m = command.match(COMPOSE_UP)
  if (!m) return null
  const services = command
    .slice(m[0].length)
    .trim()
    .split(/\s+/)
    .filter((t) => t && !t.startsWith('-'))
  return [m[1], 'stop', ...services].join(' ')
}
