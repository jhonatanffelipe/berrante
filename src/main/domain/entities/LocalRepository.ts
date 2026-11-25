import type { LocalRepository } from '@shared/types'


export const LocalRepositoryEntity = {
  create(params: { id: string; path: string; remoteUrl: string | null; now: Date }): LocalRepository {
    return {
      id: params.id,
      name: params.path.split(/[\\/]/).filter(Boolean).pop() ?? params.path,
      path: params.path,
      remoteUrl: params.remoteUrl,
      githubFullName: params.remoteUrl ? parseGithubFullName(params.remoteUrl) : null,
      addedAt: params.now.toISOString()
    }
  }
}

/** Extrai "owner/repo" de URLs https, ssh (git@) ou ssh://, ignorando credenciais embutidas. */
export function parseGithubFullName(remoteUrl: string): string | null {
  const m = remoteUrl.trim().match(/github\.com[:/]+(?:[^/@]+@)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i)
  if (!m) return null
  return `${m[1]}/${m[2]}`
}
