import type { BrowserGateway } from '@main/domain/ports'

/** Abre http://localhost:<porta> no navegador padrão. */
export class OpenLocalPortUseCase {
  constructor(private readonly browser: BrowserGateway) {}

  execute(port: number): Promise<void> {
    return this.browser.openLocalPort(port)
  }
}
