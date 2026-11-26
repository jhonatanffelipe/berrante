import type { EnvFileGateway, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { checkEnv, ENV_EXAMPLE_FILES, missingEnvLines } from '../startup/detectors/envCheck'
import type { ProjectRepos } from '../projects/ProjectRepos'

const ENV_FILE = '.env'

/**
 * Cria o `.env` a partir do exemplo ou, se ele já existe, anexa só as chaves que faltam
 * (com o valor do exemplo). Nunca apaga nem reescreve o que já está lá.
 */
export class FixEnvUseCase {
  constructor(
    private readonly projectRepos: ProjectRepos,
    private readonly files: EnvFileGateway,
    private readonly logger: Logger
  ) {}

  async execute(projectId: string, repoId: string): Promise<void> {
    const repo = await this.projectRepos.one(projectId, repoId)
    let exampleFile: string | null = null
    let exampleText: string | null = null
    for (const candidate of ENV_EXAMPLE_FILES) {
      exampleText = await this.files.read(repo.path, candidate)
      if (exampleText !== null) {
        exampleFile = candidate
        break
      }
    }
    if (!exampleFile || exampleText === null) throw AppError.validation(`${repo.name} não tem .env.example para copiar`)

    const current = await this.files.read(repo.path, ENV_FILE)
    if (current === null) {
      await this.files.create(repo.path, ENV_FILE, exampleText)
      this.logger.info('env.created', { projectId, repoId, from: exampleFile })
      return
    }
    const { missingKeys } = checkEnv(exampleFile, exampleText, current)
    if (!missingKeys.length) return
    const lines = missingEnvLines(exampleText, missingKeys)
    const prefix = current.length && !current.endsWith('\n') ? '\n' : ''
    await this.files.append(repo.path, ENV_FILE, `${prefix}\n# Adicionadas pelo Berrante a partir de ${exampleFile}\n${lines.join('\n')}\n`)
    this.logger.info('env.completed', { projectId, repoId, keys: missingKeys })
  }
}
