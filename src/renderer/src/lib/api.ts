import type { IpcChannel, IpcEventName, IpcEvents, IpcInput, IpcOutput } from '@shared/ipc/contract'
import type { ErrorCode, SerializedError } from '@shared/types'

export class BerranteError extends Error {
  readonly code: ErrorCode
  readonly details?: unknown
  constructor(error: SerializedError) {
    super(error.message)
    this.code = error.code
    this.details = error.details
  }
}

/** Chama o main e desembrulha o envelope; erros viram BerranteError com `code`. */
export async function call<C extends IpcChannel>(
  channel: C,
  ...args: undefined extends IpcInput<C> ? [input?: IpcInput<C>] : [input: IpcInput<C>]
): Promise<IpcOutput<C>> {
  const envelope = await window.berrante.invoke(channel, ...args)
  if (envelope.ok) return envelope.data
  throw new BerranteError(envelope.error)
}

export function subscribe<E extends IpcEventName>(event: E, listener: (payload: IpcEvents[E]) => void): () => void {
  return window.berrante.on(event, listener)
}

export function errorMessage(err: unknown): string {
  if (err instanceof BerranteError) {
    const output = (err.details as { output?: string } | undefined)?.output
    return output ? `${err.message}\n${output.slice(-400)}` : err.message
  }
  return err instanceof Error ? err.message : String(err)
}
