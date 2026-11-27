import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc/channels'
import { IPC_EVENT_NAMES, type BerranteApi, type IpcEventName } from '@shared/ipc/contract'

const allowedChannels = new Set<string>(IPC_CHANNELS)
const allowedEvents = new Set<string>(IPC_EVENT_NAMES)

/** Superfície mínima: invoke em canais da allowlist e assinatura de eventos conhecidos. */
const api: BerranteApi = {
  invoke: ((channel: string, input?: unknown) => {
    if (!allowedChannels.has(channel)) return Promise.reject(new Error(`Canal não permitido: ${channel}`))
    return ipcRenderer.invoke(channel, input)
  }) as BerranteApi['invoke'],
  on: (event, listener) => {
    if (!allowedEvents.has(event)) throw new Error(`Evento não permitido: ${event}`)
    const wrapped = (_e: IpcRendererEvent, payload: unknown) => listener(payload as never)
    ipcRenderer.on(event as IpcEventName, wrapped)
    return () => ipcRenderer.removeListener(event, wrapped)
  },
  platform: process.platform
}

contextBridge.exposeInMainWorld('berrante', api)
