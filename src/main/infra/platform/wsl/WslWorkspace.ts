import type { CommandRunner, Workspace } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { hostToWslPath, wslToHostPath } from './wslCore'
import type { WslShellEnv } from './WslShellEnv'
import type { WslTarget } from './WslTarget'

/**
 * Windows: os repositórios vivem na distro. Testes de existência e criação de pasta rodam lá dentro
 * (rápido e com as permissões do Linux); leitura de arquivos usa o caminho UNC `\\wsl.localhost\<distro>\…`.
 */
export class WslWorkspace implements Workspace {
  constructor(
    private readonly target: WslTarget,
    private readonly runner: CommandRunner,
    private readonly shellEnv: WslShellEnv
  ) {}

  toHost(path: string): string {
    return wslToHostPath(path, this.target.current())
  }

  fromHost(hostPath: string): string | null {
    return hostToWslPath(hostPath, this.target.current())
  }

  private async test(flag: '-e' | '-d', path: string): Promise<boolean> {
    const { code } = await this.runner.run('/bin/sh', ['-c', `[ ${flag} "$1" ]`, 'sh', path], { timeoutMs: 15_000 })
    return code === 0
  }

  exists(path: string): Promise<boolean> {
    return this.test('-e', path)
  }

  isDirectory(path: string): Promise<boolean> {
    return this.test('-d', path)
  }

  async mkdirp(path: string): Promise<void> {
    const { code, stderr } = await this.runner.run('mkdir', ['-p', '--', path], { timeoutMs: 15_000 })
    if (code !== 0) throw new AppError('PROCESS', `Não consegui criar a pasta ${path}`, { output: stderr.slice(0, 500) })
  }

  async home(): Promise<string> {
    return (await this.shellEnv.resolve()).HOME
  }
}
