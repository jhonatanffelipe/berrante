import { spawn } from 'node:child_process'
import { existsSync, lstatSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { TerminalGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { ShellEnv } from '../platform/ShellEnv'
import { envGet, findGitBash, system32 } from '../platform/platform'

/** O wt.exe é um alias de execução (reparse point): o existsSync não enxerga, o lstat sim. */
const linkExists = (path: string): boolean => {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

interface Launch {
  file: string
  args: string[]
}

/**
 * Abre o terminal escolhido já na pasta. Cada um tem seu jeito de receber a pasta:
 * - Windows Terminal: `wt.exe -d <pasta>` (alias de execução em %LOCALAPPDATA%\Microsoft\WindowsApps);
 * - PowerShell / Prompt de Comando: console novo com cwd na pasta;
 * - Git Bash: `git-bash.exe --cd=<pasta>`.
 */
export class WindowsTerminal implements TerminalGateway {
  constructor(private readonly shellEnv: ShellEnv) {}

  private async launch(app: string, cwd: string): Promise<Launch | null> {
    const env = await this.shellEnv.resolve()
    switch (app) {
      case 'PowerShell': {
        const pwsh = join(envGet(env, 'ProgramFiles') ?? 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe')
        return { file: existsSync(pwsh) ? pwsh : system32('WindowsPowerShell\\v1.0\\powershell.exe'), args: ['-NoExit'] }
      }
      case 'Prompt de Comando':
        return { file: envGet(env, 'ComSpec') ?? system32('cmd.exe'), args: ['/K'] }
      case 'Git Bash': {
        const bash = findGitBash(env)
        const gitBash = bash ? join(bash, '..', '..', 'git-bash.exe') : null
        return gitBash && existsSync(gitBash) ? { file: gitBash, args: [`--cd=${cwd}`] } : null
      }
      default: {
        // "Windows Terminal" (e qualquer valor de outro sistema, como "Terminal" vindo do macOS).
        const local = envGet(env, 'LOCALAPPDATA')
        const wt = local ? join(local, 'Microsoft', 'WindowsApps', 'wt.exe') : null
        return { file: wt && linkExists(wt) ? wt : 'wt.exe', args: ['-d', cwd] }
      }
    }
  }

  async open(app: string, cwd: string): Promise<void> {
    const info = await stat(cwd).catch(() => null)
    if (!info?.isDirectory()) throw AppError.validation('A pasta não existe mais')
    const target = await this.launch(app, cwd)
    if (!target) throw new AppError('NOT_FOUND', `${app} não encontrado: instale ou escolha outro terminal nas configurações`)
    const env = await this.shellEnv.resolve()
    await new Promise<void>((resolve, reject) => {
      // detached no Windows: o processo ganha o próprio console (visível) e não fecha junto com o Berrante.
      const child = spawn(target.file, target.args, { cwd, env, detached: true, stdio: 'ignore' })
      child.once('spawn', () => {
        child.unref()
        resolve()
      })
      child.once('error', (err) => {
        const missing = (err as NodeJS.ErrnoException).code === 'ENOENT'
        reject(new AppError('NOT_FOUND', missing ? `${app} não encontrado: instale ou escolha outro terminal nas configurações` : `Não deu para abrir o ${app}`, { output: err.message }))
      })
    })
  }
}
