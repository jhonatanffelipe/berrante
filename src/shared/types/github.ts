export interface GithubUser {
  login: string
  name: string | null
  avatarUrl: string
}

export type AuthSource = 'device-flow' | 'gh-cli'

export interface AuthStatus {
  authenticated: boolean
  user: GithubUser | null
  source: AuthSource | null
  deviceFlowAvailable: boolean
}

export interface DeviceFlowStart {
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export type DeviceFlowPoll =
  | { status: 'pending' }
  | { status: 'slow_down'; interval: number }
  | { status: 'expired' }
  | { status: 'denied' }
  | { status: 'authorized'; user: GithubUser }

export interface GithubRepo {
  id: number
  fullName: string
  name: string
  owner: string
  private: boolean
  fork: boolean
  archived: boolean
  description: string | null
  language: string | null
  defaultBranch: string
  cloneUrl: string
  htmlUrl: string
  updatedAt: string
  /** Caminho local se o repo já estiver clonado/importado. */
  localPath: string | null
}

export type RepoVisibilityFilter = 'all' | 'public' | 'private'
export type RepoCloneFilter = 'all' | 'cloned' | 'not-cloned'

export interface RepoListQuery {
  search?: string
  owner?: string
  visibility?: RepoVisibilityFilter
  cloned?: RepoCloneFilter
  page?: number
  perPage?: number
  refresh?: boolean
}

export interface RepoListResult {
  items: GithubRepo[]
  page: number
  perPage: number
  total: number
  owners: string[]
}
