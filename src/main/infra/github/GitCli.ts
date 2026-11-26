import type { CommandRunner, GitGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { redact } from '../logging/RedactingLogger'

const ASKPASS_SCRIPT = `#!/bin/sh
case "$1" in
  Username*) echo "x-access-token" ;;
  *) echo "$BERRANTE_GIT_TOKEN" ;;
esac
`

/**
 * Git via CLI. Autenticação HTTPS por GIT_ASKPASS: o token vai só no env do processo filho,
 * nunca na URL do remote, e o credential helper é desligado para não gravar no Keychain.
 * O script de askpass é gravado pelo próprio runner, então fica onde o git roda (no Windows, dentro da WSL).
 */
export class GitCli implements GitGateway {
  private askpass: Promise<string> | null = null

  constructor(
    private readonly runner: CommandRunner,
    /** Pasta (no sistema onde o git roda) para o script de askpass. */
    private readonly askpassDir: () => Promise<string>
  ) {}

  private writeAskpass(): Promise<string> {
    if (!this.askpass) {
      this.askpass = (async () => {
        const dir = await this.askpassDir()
        const path = `${dir}/askpass.sh`
        const { code, stderr } = await this.runner.run(
          '/bin/sh',
          ['-c', 'umask 077 && mkdir -p "$1" && cat > "$2" && chmod 700 "$2"', 'sh', dir, path],
          { input: ASKPASS_SCRIPT, timeoutMs: 15_000 }
        )
        if (code !== 0) throw new AppError('GIT', 'Não consegui preparar o GIT_ASKPASS', { output: stderr.slice(0, 500) })
        return path
      })()
      this.askpass.catch(() => (this.askpass = null))
    }
    return this.askpass
  }

  private async authEnv(token: string | null): Promise<Record<string, string>> {
    const base = { GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }
    if (!token) return base
    const path = await this.writeAskpass()
    return { ...base, GIT_ASKPASS: path, SSH_ASKPASS: path, BERRANTE_GIT_TOKEN: token }
  }

  private async git(args: string[], token: string | null, cwd?: string, timeoutMs = 10 * 60_000): Promise<string> {
    const env = await this.authEnv(token)
    const { stdout, stderr, code } = await this.runner.run('git', ['-c', 'credential.helper=', ...args], { cwd, env, timeoutMs })
    const output = redact(`${stdout}${stderr}`.trim())
    if (code !== 0) throw new AppError('GIT', `git ${args[0]} falhou`, { output })
    return output
  }

  clone(url: string, dest: string, token: string | null): Promise<string> {
    if (/\/\/[^/]*@/.test(url)) throw AppError.validation('URL de clone não pode conter credenciais')
    return this.git(['clone', '--progress', url, dest], token)
  }

  pull(repoPath: string, token: string | null): Promise<string> {
    return this.git(['pull', '--ff-only'], token, repoPath)
  }

  async originUrl(repoPath: string): Promise<string | null> {
    const { stdout, code } = await this.runner.run('git', ['remote', 'get-url', 'origin'], { cwd: repoPath, timeoutMs: 5000 })
    return code === 0 ? stdout.trim() || null : null
  }

  async isRepo(path: string): Promise<boolean> {
    const { stdout, code } = await this.runner.run('git', ['rev-parse', '--is-inside-work-tree'], { cwd: path, timeoutMs: 5000 })
    return code === 0 && stdout.trim() === 'true'
  }
}
