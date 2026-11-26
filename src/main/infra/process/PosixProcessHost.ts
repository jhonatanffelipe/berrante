import { spawn } from 'node:child_process'
import { AppError } from '@main/domain/errors/AppError'
import type { ShellEnv } from '../platform/ShellEnv'
import type { ProcessHost, SpawnedProcess } from './ProcessHost'
import { isAlive, terminate } from './PosixProcessKiller'

/** `detached: true` cria um process group novo (pgid = pid); a saída vai direto para o arquivo de log. */
export class PosixProcessHost implements ProcessHost {
  constructor(private readonly shellEnv: ShellEnv) {}

  async spawn(command: string, cwd: string, env: Record<string, string>, logFd: number): Promise<SpawnedProcess> {
    const child = spawn(this.shellEnv.shell, ['-c', command], { cwd, env: { ...(await this.shellEnv.resolve()), ...env }, detached: true, stdio: ['ignore', logFd, logFd] })
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', (err) => reject(new AppError('PROCESS', `Falha ao iniciar: ${err.message}`)))
    })
    return { child, pid: child.pid!, pgid: child.pid! }
  }

  async isGroupAlive(pgid: number): Promise<boolean> {
    return isAlive(-pgid)
  }

  terminateGroup(pgid: number, timeoutMs: number): Promise<void> {
    return terminate(-pgid, timeoutMs)
  }
}
