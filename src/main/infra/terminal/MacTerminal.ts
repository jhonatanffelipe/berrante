import { stat } from 'node:fs/promises'
import type { CommandRunner, TerminalGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

/** `open -a <app> <pasta>`: Terminal, iTerm, Warp e Ghostty abrem uma janela já na pasta. */
export class MacTerminal implements TerminalGateway {
  constructor(private readonly runner: CommandRunner) {}

  async open(app: string, cwd: string): Promise<void> {
    const info = await stat(cwd).catch(() => null)
    if (!info?.isDirectory()) throw AppError.validation('A pasta não existe mais')
    const { code, stderr } = await this.runner.run('open', ['-a', app, cwd], { timeoutMs: 15_000 })
    if (code !== 0) {
      const missing = /Unable to find application/i.test(stderr)
      throw new AppError('NOT_FOUND', missing ? `${app} não encontrado: instale ou escolha outro terminal nas configurações` : `Não deu para abrir o ${app}`, { output: stderr })
    }
  }
}
