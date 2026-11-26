import { execFile } from 'node:child_process'
import { userInfo } from 'node:os'

const DELIMITER = '__BERRANTE_ENV__'

/**
 * Apps GUI no macOS herdam um PATH mínimo (sem nvm, homebrew, ~/.local/bin).
 * Resolve uma vez o ambiente do shell de login do usuário e usa em todo spawn.
 * Em Linux é o mesmo fluxo.
 */
export class ShellEnv {
  private env: Record<string, string> | null = null
  readonly shell: string

  constructor(private readonly platform: NodeJS.Platform = process.platform) {
    this.shell = process.env.SHELL || (platform === 'darwin' ? '/bin/zsh' : '/bin/bash')
  }

  async resolve(): Promise<Record<string, string>> {
    if (this.env) return this.env
    const base = Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => typeof e[1] === 'string'))
    if (this.platform === 'win32') {
      this.env = base
      return base
    }
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
    // Variáveis do próprio Electron não devem vazar para os projetos.
    for (const key of Object.keys(this.env)) {
      if (key.startsWith('ELECTRON_') || key === 'NODE_OPTIONS' || key === 'VITE_DEV_SERVER_URL') delete this.env[key]
    }
    return this.env
  }
}
