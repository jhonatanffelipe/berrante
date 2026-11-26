import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import type { CommandRunner } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { buildWslArgs, buildWslEnv, SERVICE_SCRIPT } from '../platform/wsl/wslCore'
import type { WslShellEnv } from '../platform/wsl/WslShellEnv'
import type { WslTarget } from '../platform/wsl/WslTarget'
import type { ProcessHost, SpawnedProcess } from './ProcessHost'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Serviços dentro da distro: `wsl.exe -d <distro> --cd <cwd> --exec setsid -w /bin/sh -c SERVICE_SCRIPT berrante <pidFile> <comando>`.
 * O `setsid` dá ao serviço um grupo de processos próprio no Linux; o script grava o PGID num arquivo temporário,
 * que é lido logo depois. O `wsl.exe` fica vivo enquanto o serviço roda (`-w`) e é `detached` no Windows, então
 * sobrevive ao fechamento do app ("Manter rodando"). Parar manda o sinal para o grupo lá dentro.
 */
export class WslProcessHost implements ProcessHost {
  constructor(
    private readonly target: WslTarget,
    private readonly shellEnv: WslShellEnv,
    private readonly runner: CommandRunner
  ) {}

  async spawn(command: string, cwd: string, env: Record<string, string>, logFd: number): Promise<SpawnedProcess> {
    const [distro, login] = await Promise.all([this.target.distro(), this.shellEnv.resolve()])
    const pidFile = `/tmp/berrante-${randomUUID()}.pgid`
    const { PATH, ...extra } = env
    const child = spawn(
      this.target.exe,
      buildWslArgs(distro, cwd, ['/usr/bin/setsid', '-w', '/bin/sh', '-c', SERVICE_SCRIPT, 'berrante', pidFile, command]),
      {
        env: buildWslEnv(process.env, { ...extra, BERRANTE_PATH: PATH ?? login.PATH, BERRANTE_SHELL: login.SHELL }),
        detached: true,
        windowsHide: true,
        stdio: ['ignore', logFd, logFd]
      }
    )
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', (err) => reject(new AppError('PROCESS', `Falha ao iniciar o wsl.exe: ${err.message}`)))
    })
    let exited = false
    child.once('exit', () => (exited = true))

    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      const { stdout } = await this.runner.run('/bin/sh', ['-c', 'cat "$1" 2>/dev/null && rm -f "$1"', 'sh', pidFile], { timeoutMs: 10_000 })
      const pgid = Number(stdout.trim())
      if (Number.isInteger(pgid) && pgid > 1) return { child, pid: pgid, pgid }
      if (exited) break
      await sleep(150)
    }
    if (!exited) child.kill()
    throw new AppError('PROCESS', exited ? 'O serviço saiu antes de iniciar (veja o log)' : 'Não consegui identificar o processo do serviço dentro da WSL')
  }

  async isGroupAlive(pgid: number): Promise<boolean> {
    const { code } = await this.runner.run('/bin/sh', ['-c', 'kill -s 0 -- "-$1" 2>/dev/null', 'sh', String(pgid)], { timeoutMs: 10_000 })
    return code === 0
  }

  async terminateGroup(pgid: number, timeoutMs: number): Promise<void> {
    if (pgid <= 1) return
    const signal = (name: 'TERM' | 'KILL') =>
      this.runner.run('/bin/sh', ['-c', `kill -s ${name} -- "-$1" 2>/dev/null`, 'sh', String(pgid)], { timeoutMs: 10_000 })
    if ((await signal('TERM')).code !== 0) return
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (!(await this.isGroupAlive(pgid))) return
      await sleep(250)
    }
    await signal('KILL')
  }
}
