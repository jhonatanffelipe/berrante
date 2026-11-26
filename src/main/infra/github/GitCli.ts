import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
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
 */
export class GitCli implements GitGateway {
  constructor(
    private readonly runner: CommandRunner,
    private readonly askpassPath: string
  ) {}

  private async authEnv(token: string | null): Promise<Record<string, string>> {
    const base = { GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }
    if (!token) return base
    await mkdir(dirname(this.askpassPath), { recursive: true })
    await writeFile(this.askpassPath, ASKPASS_SCRIPT, { mode: 0o700 })
    await chmod(this.askpassPath, 0o700)
    return { ...base, GIT_ASKPASS: this.askpassPath, SSH_ASKPASS: this.askpassPath, BERRANTE_GIT_TOKEN: token }
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
