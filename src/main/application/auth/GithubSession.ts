import type { AuthSource, GithubUser } from '@shared/types'
import type { SecretStore } from '@main/domain/repositories'
import type { GithubGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

/** Acesso ao token (sempre via SecretStore) e cache do usuário logado. */
export class GithubSession {
  private user: GithubUser | null = null

  constructor(
    private readonly secrets: SecretStore,
    private readonly github: GithubGateway
  ) {}

  async token(): Promise<string | null> {
    return this.secrets.get('github.token')
  }

  async requireToken(): Promise<string> {
    const token = await this.token()
    if (!token) throw new AppError('UNAUTHENTICATED', 'Entre com o GitHub primeiro')
    return token
  }

  async source(): Promise<AuthSource | null> {
    return (await this.secrets.get('github.source')) as AuthSource | null
  }

  async currentUser(): Promise<GithubUser | null> {
    if (this.user) return this.user
    const token = await this.token()
    if (!token) return null
    try {
      this.user = await this.github.getUser(token)
    } catch (err) {
      if (err instanceof AppError && err.code === 'UNAUTHENTICATED') await this.clear()
      throw err
    }
    return this.user
  }

  async store(token: string, source: AuthSource): Promise<GithubUser> {
    const user = await this.github.getUser(token)
    await this.secrets.set('github.token', token)
    await this.secrets.set('github.source', source)
    this.user = user
    return user
  }

  async clear(): Promise<void> {
    this.user = null
    await this.secrets.delete('github.token')
    await this.secrets.delete('github.source')
  }
}
