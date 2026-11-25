import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { RepoFiles } from '@main/domain/ports'

export const FIXTURES = join(__dirname, 'fixtures')

/** RepoFiles em memória a partir de uma fixture: `__entries.json` lista a raiz original do repo. */
export function fixtureRepo(name: string): { path: string; files: RepoFiles } {
  const dir = join(FIXTURES, 'repos', name)
  const entries = JSON.parse(readFileSync(join(dir, '__entries.json'), 'utf8')) as string[]
  const read = (rel: string): string | null => {
    const full = join(dir, rel)
    if (existsSync(full)) return readFileSync(full, 'utf8')
    // .env real não é copiado: simula um .env completo a partir do exemplo.
    if (rel === '.env' && entries.includes('.env') && existsSync(join(dir, '.env.example'))) {
      return readFileSync(join(dir, '.env.example'), 'utf8')
    }
    return null
  }
  return {
    path: `/fixtures/${name}`,
    files: {
      readText: async (rel) => read(rel),
      exists: async (rel) => entries.includes(rel),
      list: async () => entries
    }
  }
}

export function fixtureText(rel: string): string {
  return readFileSync(join(FIXTURES, rel), 'utf8')
}
