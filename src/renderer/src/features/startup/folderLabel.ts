import type { LocalRepository } from '@shared/types'

/** "repo/subpasta" para uma pasta dentro da tropa; o caminho inteiro se estiver fora. */
export function folderLabel(repos: LocalRepository[], cwd: string): string {
  const repo = repos
    .filter((r) => cwd === r.path || cwd.startsWith(`${r.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]
  if (!repo) return cwd
  const rest = cwd.slice(repo.path.length).replace(/^\//, '')
  return rest ? `${repo.name}/${rest}` : repo.name
}
