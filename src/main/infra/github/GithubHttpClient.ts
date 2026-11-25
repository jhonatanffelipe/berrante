import type { GithubRepo, GithubUser } from '@shared/types'
import type { GithubGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

const API = 'https://api.github.com'
const UA = 'Berrante-Desktop'

interface ApiRepo {
  id: number
  full_name: string
  name: string
  owner: { login: string }
  private: boolean
  fork: boolean
  archived: boolean
  description: string | null
  language: string | null
  default_branch: string
  clone_url: string
  html_url: string
  updated_at: string
}

function nextLink(header: string | null): string | null {
  if (!header) return null
  const m = header.split(',').find((p) => p.includes('rel="next"'))?.match(/<([^>]+)>/)
  return m?.[1] ?? null
}

export class GithubHttpClient implements GithubGateway {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  private async api<T>(url: string, token: string): Promise<{ body: T; res: Response }> {
    const res = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': UA }
    })
    if (res.status === 401) throw new AppError('UNAUTHENTICATED', 'Sessão do GitHub expirada ou revogada. Entre novamente.')
    if (!res.ok) throw new AppError('GITHUB', `GitHub respondeu ${res.status}`, { status: res.status })
    return { body: (await res.json()) as T, res }
  }

  async getUser(token: string): Promise<GithubUser> {
    const { body } = await this.api<{ login: string; name: string | null; avatar_url: string }>(`${API}/user`, token)
    return { login: body.login, name: body.name, avatarUrl: body.avatar_url }
  }

  /** Pessoais + colaborador + orgs, todas as páginas (máx. 30 páginas de 100). */
  async listAllRepos(token: string): Promise<Omit<GithubRepo, 'localPath'>[]> {
    const repos: Omit<GithubRepo, 'localPath'>[] = []
    let url: string | null = `${API}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`
    for (let page = 0; url && page < 30; page++) {
      const { body, res }: { body: ApiRepo[]; res: Response } = await this.api<ApiRepo[]>(url, token)
      for (const r of body) {
        repos.push({
          id: r.id,
          fullName: r.full_name,
          name: r.name,
          owner: r.owner.login,
          private: r.private,
          fork: r.fork,
          archived: r.archived,
          description: r.description,
          language: r.language,
          defaultBranch: r.default_branch,
          cloneUrl: r.clone_url,
          htmlUrl: r.html_url,
          updatedAt: r.updated_at
        })
      }
      url = nextLink(res.headers.get('link'))
    }
    return repos
  }

  async startDeviceFlow(clientId: string) {
    const res = await this.fetchImpl('https://github.com/login/device/code', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ client_id: clientId, scope: 'repo read:user' })
    })
    const body = (await res.json()) as Record<string, unknown>
    if (!res.ok || typeof body.device_code !== 'string') {
      throw new AppError('GITHUB', `Não foi possível iniciar o login: ${String(body.error_description ?? body.error ?? res.status)}`)
    }
    return {
      deviceCode: body.device_code,
      userCode: String(body.user_code),
      verificationUri: String(body.verification_uri),
      expiresIn: Number(body.expires_in),
      interval: Number(body.interval ?? 5)
    }
  }

  async pollDeviceFlow(clientId: string, deviceCode: string) {
    const res = await this.fetchImpl('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ client_id: clientId, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
    })
    const body = (await res.json()) as Record<string, unknown>
    if (typeof body.access_token === 'string') return { status: 'authorized' as const, token: body.access_token }
    switch (body.error) {
      case 'authorization_pending':
        return { status: 'pending' as const }
      case 'slow_down':
        return { status: 'slow_down' as const, interval: Number(body.interval ?? 10) }
      case 'expired_token':
        return { status: 'expired' as const }
      case 'access_denied':
        return { status: 'denied' as const }
      default:
        throw new AppError('GITHUB', `Erro no login do GitHub: ${String(body.error_description ?? body.error ?? res.status)}`)
    }
  }
}
