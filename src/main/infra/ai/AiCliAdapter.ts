import type { AiCliName } from '@shared/types'
import type { AiCliGateway, CommandRunner } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

const TIMEOUT_MS = 4 * 60_000

/** Tenta extrair o primeiro objeto JSON de um texto (o modelo às vezes embrulha em ```json). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = (fenced?.[1] ?? text).trim()
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1))
    throw new AppError('AI', 'A IA não devolveu um JSON válido')
  }
}

/** Desembrulha o envelope `--output-format json` das CLIs (result / structured_output). */
export function unwrapCliOutput(stdout: string): unknown {
  const envelope = extractJson(stdout) as Record<string, unknown>
  if (envelope && typeof envelope === 'object') {
    if (envelope.is_error === true) throw new AppError('AI', `A CLI de IA retornou erro: ${String(envelope.result ?? '').slice(0, 300)}`)
    if (envelope.structured_output && typeof envelope.structured_output === 'object') return envelope.structured_output
    if (typeof envelope.result === 'string') return extractJson(envelope.result)
    if (typeof envelope.response === 'string') return extractJson(envelope.response)
    if (Array.isArray(envelope.services)) return envelope
  }
  throw new AppError('AI', 'Formato de resposta da CLI de IA não reconhecido')
}

/**
 * Chama a CLI local em modo não interativo e somente leitura:
 * - claude: só ferramentas de leitura (--tools Read,Glob,Grep), sem persistir sessão.
 * - agy: modo plan (sem edição nem execução).
 */
export class AiCliAdapter implements AiCliGateway {
  constructor(
    private readonly runner: CommandRunner,
    /** `~/.local/bin` no sistema onde os comandos rodam (no Windows, dentro da WSL). */
    private readonly binDir: () => Promise<string>
  ) {}

  async path(cli: AiCliName): Promise<string> {
    return `${await this.binDir()}/${cli}`
  }

  async available(cli: AiCliName): Promise<boolean> {
    return (await this.runner.which(await this.path(cli))) !== null
  }

  async requestJson(cli: AiCliName, prompt: string, schema: object, cwd: string): Promise<unknown> {
    const path = await this.path(cli)
    if (!(await this.available(cli))) throw new AppError('AI', `CLI "${cli}" não encontrada em ${path}`)
    const schemaJson = JSON.stringify(schema)
    const args =
      cli === 'claude'
        ? ['-p', '--output-format', 'json', '--json-schema', schemaJson, '--tools', 'Read,Glob,Grep', '--no-session-persistence', prompt]
        : ['-p', '--output-format', 'json', '--json-schema', schemaJson, '--mode', 'plan', prompt]
    const { stdout, stderr, code } = await this.runner.run(path, args, { cwd, timeoutMs: TIMEOUT_MS })
    if (code !== 0 && !stdout.trim()) throw new AppError('AI', `A CLI ${cli} falhou`, { output: stderr.slice(0, 2000) })
    return unwrapCliOutput(stdout)
  }
}
