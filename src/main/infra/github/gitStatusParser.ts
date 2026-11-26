import type { GitBranchState } from '@main/domain/ports'

/** Lê a saída de `git status --porcelain=v2 --branch`. */
export function parseGitStatus(output: string): GitBranchState {
  const state: GitBranchState = { branch: null, upstream: null, ahead: 0, behind: 0, changes: 0 }
  for (const line of output.split('\n')) {
    if (!line) continue
    if (line.startsWith('# branch.head ')) {
      const head = line.slice('# branch.head '.length).trim()
      state.branch = head === '(detached)' ? null : head
    } else if (line.startsWith('# branch.upstream ')) {
      state.upstream = line.slice('# branch.upstream '.length).trim()
    } else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+) -(\d+)/)
      if (m) {
        state.ahead = Number(m[1])
        state.behind = Number(m[2])
      }
    } else if (!line.startsWith('#')) {
      state.changes++
    }
  }
  return state
}

/** Junta a saída de `git for-each-ref` (locais e `origin/*`) numa lista sem repetição. */
export function parseBranchRefs(output: string): string[] {
  const names = new Set<string>()
  for (const raw of output.split('\n')) {
    const ref = raw.trim()
    if (!ref || ref === 'origin' || ref.endsWith('/HEAD')) continue
    names.add(ref.startsWith('origin/') ? ref.slice('origin/'.length) : ref)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}
