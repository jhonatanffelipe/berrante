/** Repositório local conhecido pelo Berrante (clonado ou importado). */
export interface LocalRepository {
  id: string
  name: string
  path: string
  githubFullName: string | null
  remoteUrl: string | null
  addedAt: string
}

export interface GitOperationResult {
  repository: LocalRepository
  output: string
}
