import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { IpcChannel, IpcOutput } from '@shared/ipc/contract'
import { ipcSchemas } from '@shared/ipc/schemas'
import type { IpcEnvelope } from '@shared/types'
import type { Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { toEnvelopeError } from './errorHandler'
import type { z } from 'zod'

export type Handler<C extends IpcChannel> = (input: z.output<(typeof ipcSchemas)[C]>) => Promise<IpcOutput<C>>
export type Handlers = { [C in IpcChannel]: Handler<C> }

/** Só aceita chamadas da nossa própria página (file:// empacotado ou dev server). */
function trustedSender(event: IpcMainInvokeEvent, devUrl: string | undefined): boolean {
  const url = event.senderFrame?.url ?? ''
  if (url.startsWith('file://')) return true
  return Boolean(devUrl && url.startsWith(devUrl))
}

export function registerIpc(handlers: Handlers, logger: Logger, devUrl: string | undefined): void {
  for (const channel of Object.keys(handlers) as IpcChannel[]) {
    ipcMain.handle(channel, async (event, payload: unknown): Promise<IpcEnvelope<unknown>> => {
      const started = Date.now()
      try {
        if (!trustedSender(event, devUrl)) throw new AppError('VALIDATION', 'Origem não autorizada')
        const parsed = ipcSchemas[channel].safeParse(payload)
        if (!parsed.success) {
          throw AppError.validation('Dados inválidos', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
        }
        const data = await (handlers[channel] as Handler<IpcChannel>)(parsed.data as never)
        logger.debug('ipc.ok', { channel, durationMs: Date.now() - started })
        return { ok: true, data }
      } catch (err) {
        return toEnvelopeError(err, channel, logger, Date.now() - started)
      }
    })
  }
}
