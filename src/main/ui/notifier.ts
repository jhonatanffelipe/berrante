import { Notification } from 'electron'
import type { RuntimeEvent } from '../application/runtime/RuntimeService'

const seconds = (ms: number) => (ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60_000)}min ${Math.round((ms % 60_000) / 1000)}s`)

/** Texto do aviso do sistema (macOS ou Windows) para cada evento da boiada. */
export function notificationFor(event: RuntimeEvent): { title: string; body: string } {
  switch (event.type) {
    case 'played':
      return event.summary.ok
        ? { title: `${event.projectName}: boiada de pé`, body: `Subiu em ${seconds(event.summary.durationMs)}.` }
        : { title: `${event.projectName}: o workflow parou`, body: `O passo "${event.summary.haltedAt}" falhou. Veja o log.` }
    case 'crashed':
      return { title: `${event.projectName}: ${event.serviceName} caiu`, body: event.restarting ? 'Reiniciando sozinho…' : 'Abra o Berrante para ver o log.' }
    case 'gaveUp':
      return { title: `${event.projectName}: ${event.serviceName} não para de pé`, body: 'Caiu 3 vezes em 5 minutos; parei de reiniciar sozinho.' }
  }
}

export function notify(title: string, body: string, onClick?: () => void): void {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body, silent: false })
  if (onClick) n.on('click', onClick)
  n.show()
}
