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

/** Flags do `up` que levam valor separado (o valor não é nome de serviço). */
const UP_FLAGS_WITH_VALUE = new Set(['-t', '--timeout', '--wait-timeout', '--scale', '--pull', '--exit-code-from', '--attach', '--no-attach'])

export interface ComposeUpStep {
  /** Argumentos globais do compose, antes do `up` (ex.: `-f docker-compose.dev.yml -p fazenda`). */
  globalArgs: string[]
  /** Serviços citados depois do `up`; vazio = todos os do compose. */
  services: string[]
}

/**
 * Lê um passo `docker compose ... up ...` para controlar os mesmos containers fora do workflow
 * (sem shell: os tokens viram argv). Outros comandos, ou com metacaracteres de shell: null.
 */
export function parseComposeUp(command: string): ComposeUpStep | null {
  if (/[;&|`$<>'"\\]/.test(command)) return null
  const m = command.match(COMPOSE_UP)
  if (!m) return null
  const head = m[1]!.trim().split(/\s+/)
  const globalArgs = head[0] === 'docker-compose' ? head.slice(1) : head.slice(2)
  const services: string[] = []
  const tokens = command.slice(m[0].length).trim().split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    if (UP_FLAGS_WITH_VALUE.has(t)) i++
    else if (!t.startsWith('-')) services.push(t)
  }
  return { globalArgs, services }
}
