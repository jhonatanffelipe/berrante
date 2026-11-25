import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import type { RepoFiles } from '@main/domain/ports'

const MAX_FILE_BYTES = 1024 * 1024

/** Acesso somente leitura aos arquivos de um repo, preso à raiz (sem escapar com ../). */
export class FsRepoFiles implements RepoFiles {
  constructor(private readonly root: string) {}

  private safe(relPath: string): string {
    const full = resolve(this.root, relPath)
    if (full !== this.root && !full.startsWith(this.root + sep)) throw new Error(`Caminho fora do repositório: ${relPath}`)
    return full
  }

  async readText(relPath: string): Promise<string | null> {
    try {
      const full = this.safe(relPath)
      const info = await stat(full)
      if (!info.isFile() || info.size > MAX_FILE_BYTES) return null
      return await readFile(full, 'utf8')
    } catch {
      return null
    }
  }

  async exists(relPath: string): Promise<boolean> {
    try {
      await stat(this.safe(relPath))
      return true
    } catch {
      return false
    }
  }

  async list(): Promise<string[]> {
    try {
      return (await readdir(this.root)).sort()
    } catch {
      return []
    }
  }
}
