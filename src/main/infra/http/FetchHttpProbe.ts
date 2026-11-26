import type { HttpProbe } from '@main/domain/ports'
import { isLocalHealthUrl } from '@shared/workflow'

const TIMEOUT_MS = 2000

/** GET no healthcheck local: 2xx e 3xx contam como de pé. Nunca sai de localhost. */
export class FetchHttpProbe implements HttpProbe {
  async ok(url: string): Promise<boolean> {
    if (!isLocalHealthUrl(url)) return false
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) })
      await res.body?.cancel().catch(() => undefined)
      return res.status >= 200 && res.status < 400
    } catch {
      return false
    }
  }
}
