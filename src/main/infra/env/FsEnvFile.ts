import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { EnvFileGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

/** Só nomes simples na raiz do repo (`.env`, `.env.example`…): nada de subir pastas. */
function target(repoPath: string, file: string): string {
  if (basename(file) !== file || !file.startsWith('.env')) throw AppError.validation('Arquivo de ambiente inválido')
  return join(repoPath, file)
}

export class FsEnvFile implements EnvFileGateway {
  async read(repoPath: string, file: string): Promise<string | null> {
    return readFile(target(repoPath, file), 'utf8').catch(() => null)
  }

  async create(repoPath: string, file: string, content: string): Promise<void> {
    // flag wx: falha se o arquivo já existir (nunca sobrescreve um .env).
    await writeFile(target(repoPath, file), content, { flag: 'wx', mode: 0o600 })
  }

  async append(repoPath: string, file: string, content: string): Promise<void> {
    await appendFile(target(repoPath, file), content)
  }
}
