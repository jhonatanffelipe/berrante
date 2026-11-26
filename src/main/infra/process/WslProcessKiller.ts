import type { CommandRunner, ProcessKiller } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Encerra um PID de dentro da distro (aba "Contar a boiada"): SIGTERM e SIGKILL depois do timeout. */
export class WslProcessKiller implements ProcessKiller {
  constructor(private readonly runner: CommandRunner) {}

  private async signal(pid: number, name: '0' | 'TERM' | 'KILL') {
    return this.runner.run('/bin/sh', ['-c', `kill -s ${name} -- "$1"`, 'sh', String(pid)], { timeoutMs: 10_000 })
  }

  async isAlive(pid: number): Promise<boolean> {
    return (await this.signal(pid, '0')).code === 0
  }

  async kill(pid: number, timeoutMs: number): Promise<void> {
    if (pid <= 1) throw new AppError('PROCESS', 'Esse processo não pode ser encerrado')
    const term = await this.signal(pid, 'TERM')
    if (term.code !== 0) {
      if (/not permitted/i.test(term.stderr)) throw new AppError('PROCESS', 'Sem permissão para encerrar esse processo')
      return
    }
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (!(await this.isAlive(pid))) return
      await sleep(250)
    }
    await this.signal(pid, 'KILL')
  }
}
