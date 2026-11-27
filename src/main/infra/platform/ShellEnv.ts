import { execFile } from 'node:child_process'
import { userInfo } from 'node:os'
import { envGet, findGitBash, isWindows } from './platform'

const DELIMITER = '__BERRANTE_ENV__'

export interface ShellInvocation {
  file: string
  args: string[]
  /** cmd.exe precisa da linha de comando sem as aspas extras que o Node colocaria. */
  windowsVerbatimArguments?: boolean
}

/**
 * Ambiente e shell usados em todo spawn.
 * - macOS: apps GUI herdam um PATH mínimo (sem nvm, homebrew, ~/.local/bin); resolve uma vez o ambiente do shell
 *   de login do usuário.
 * - Windows: o ambiente do processo já é o do usuário. Os comandos rodam no Git Bash (do Git for Windows), para que
 *   os mesmos comandos POSIX do plano (`&&`, `>/dev/null`, `cp`) funcionem nos dois sistemas; sem Git Bash, cmd.exe.
 */
export class ShellEnv {
  private env: Record<string, string> | null = null
  readonly shell: string

  constructor() {
    if (isWindows) this.shell = findGitBash() ?? envGet(process.env, 'ComSpec') ?? 'cmd.exe'
    else this.shell = process.env.SHELL || '/bin/zsh'
  }

  /** true quando os comandos rodam num shell POSIX (sempre no macOS; no Windows, com Git Bash). */
  get posix(): boolean {
    return !isWindows || /bash(\.exe)?$/i.test(this.shell)
  }

  /** Como rodar `command` no shell escolhido. */
  invocation(command: string): ShellInvocation {
    if (this.posix) return { file: this.shell, args: ['-c', command] }
    return { file: this.shell, args: ['/d', '/s', '/c', `"${command}"`], windowsVerbatimArguments: true }
  }

  async resolve(): Promise<Record<string, string>> {
    if (this.env) return this.env
    const base = Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => typeof e[1] === 'string'))
    if (isWindows) {
      this.env = base
    } else {
      try {
        const stdout = await new Promise<string>((resolve, reject) => {
          execFile(
            this.shell,
            ['-ilc', `printf '${DELIMITER}'; env; printf '${DELIMITER}'`],
            { timeout: 8000, env: { ...base, DISABLE_AUTO_UPDATE: 'true', ZSH_TMUX_AUTOSTARTED: 'true' }, maxBuffer: 4 * 1024 * 1024 },
            (err, out) => (err && !out ? reject(err) : resolve(out))
          )
        })
        const body = stdout.split(DELIMITER)[1] ?? ''
        const parsed: Record<string, string> = {}
        for (const line of body.split('\n')) {
          const idx = line.indexOf('=')
          if (idx > 0) parsed[line.slice(0, idx)] = line.slice(idx + 1)
        }
        this.env = { ...base, ...parsed }
      } catch {
        const home = userInfo().homedir
        this.env = { ...base, PATH: [`${home}/.local/bin`, '/opt/homebrew/bin', '/usr/local/bin', base.PATH ?? '/usr/bin:/bin'].join(':') }
      }
    }
    // Variáveis do próprio Electron não devem vazar para os projetos.
    for (const key of Object.keys(this.env)) {
      const upper = key.toUpperCase()
      if (upper.startsWith('ELECTRON_') || upper === 'NODE_OPTIONS' || upper === 'VITE_DEV_SERVER_URL') delete this.env[key]
    }
    return this.env
  }
}
