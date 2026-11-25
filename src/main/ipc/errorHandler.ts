import type { IpcEnvelope, SerializedError } from '@shared/types'
import type { Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

/** Handler único: loga com contexto e devolve um erro serializável (nunca stack/segredos ao renderer). */
export function toEnvelopeError(err: unknown, channel: string, logger: Logger, durationMs: number): IpcEnvelope<never> {
  if (err instanceof AppError) {
    const level = err.code === 'INTERNAL' ? 'error' : 'warn'
    logger[level]('ipc.error', { channel, code: err.code, message: err.message, durationMs })
    return { ok: false, error: err.toJSON() }
  }
  const message = err instanceof Error ? err.message : String(err)
  logger.error('ipc.unexpected', { channel, message, stack: err instanceof Error ? err.stack : undefined, durationMs })
  const error: SerializedError = { code: 'INTERNAL', message: 'Erro inesperado no Berrante. Veja o log para detalhes.' }
  return { ok: false, error }
}
