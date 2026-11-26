/** Estado do git de um repositório da tropa. */
export interface RepoGitStatus {
  repoId: string
  repoName: string
  /** null = HEAD destacado (detached). */
  branch: string | null
  upstream: string | null
  ahead: number
  behind: number
  /** Arquivos modificados, adicionados, removidos ou não rastreados. */
  changes: number
  /** Preenchido quando o git não respondeu (pasta sem git, por exemplo). */
  error: string | null
}

/** Branch disponível em um ou mais repositórios da tropa (local ou em origin). */
export interface BranchOption {
  name: string
  repoIds: string[]
}

/** Resultado de uma operação git em um repositório (pull, troca de branch). */
export interface RepoGitResult {
  repoId: string
  repoName: string
  status: 'ok' | 'skipped' | 'failed'
  message: string
}
