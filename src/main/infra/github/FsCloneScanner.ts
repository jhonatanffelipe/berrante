import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { LocalCloneScanner, Workspace } from '@main/domain/ports'
import { parseGithubFullName } from '@main/domain/entities/LocalRepository'

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', 'vendor', 'Library'])

/**
 * Lê `.git/config` direto (sem spawn) para mapear "owner/repo" → caminho local.
 * Percorre pelo caminho do host (UNC no Windows) e devolve caminhos do workspace.
 */
export class FsCloneScanner implements LocalCloneScanner {
  constructor(private readonly workspace: Workspace) {}

  async scan(root: string, depth: number): Promise<Map<string, string>> {
    const found = new Map<string, string>()
    const walk = async (dir: string, level: number): Promise<void> => {
      let entries: import('node:fs').Dirent[]
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      if (entries.some((e) => e.name === '.git')) {
        const config = await readFile(join(dir, '.git', 'config'), 'utf8').catch(() => '')
        const url = config.match(/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/)?.[1]
        const fullName = url ? parseGithubFullName(url) : null
        if (fullName && !found.has(fullName.toLowerCase())) found.set(fullName.toLowerCase(), this.workspace.fromHost(dir) ?? dir)
        return
      }
      if (level >= depth) return
      await Promise.all(
        entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP.has(e.name)).map((e) => walk(join(dir, e.name), level + 1))
      )
    }
    await walk(this.workspace.toHost(root), 0)
    return found
  }
}
