import type { CommandRunner, GhCliGateway } from '@main/domain/ports'

/** Lê o token do `gh` já logado. O valor só transita em memória até o SecretStore. */
export class GhCliAdapter implements GhCliGateway {
  constructor(private readonly runner: CommandRunner) {}

  async token(): Promise<string | null> {
    const gh = await this.runner.which('gh')
    if (!gh) return null
    const { stdout, code } = await this.runner.run(gh, ['auth', 'token', '--hostname', 'github.com'], { timeoutMs: 10_000 })
    const token = stdout.trim()
    return code === 0 && token ? token : null
  }
}
