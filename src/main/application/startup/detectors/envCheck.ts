import type { EnvCheck } from '@shared/types'

export const ENV_EXAMPLE_FILES = ['.env.example', '.env.sample', '.env.template', '.env.dist']

/** Só as chaves; valores nunca saem daqui (podem ser segredos). */
export function parseEnvKeys(text: string): string[] {
  const keys: string[] = []
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=/)
    if (m?.[1]) keys.push(m[1])
  }
  return [...new Set(keys)]
}

export function checkEnv(exampleFile: string, exampleText: string, envText: string | null): EnvCheck {
  const expected = parseEnvKeys(exampleText)
  if (envText === null) return { exampleFile, envFile: '.env', envExists: false, missingKeys: expected }
  const present = new Set(parseEnvKeys(envText))
  return { exampleFile, envFile: '.env', envExists: true, missingKeys: expected.filter((k) => !present.has(k)) }
}

/**
 * Linhas do exemplo para as chaves que faltam (com o valor de exemplo, que é público),
 * prontas para anexar ao `.env`.
 */
export function missingEnvLines(exampleText: string, missingKeys: string[]): string[] {
  const wanted = new Set(missingKeys)
  const lines: string[] = []
  for (const line of exampleText.replace(/\r\n?/g, '\n').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=/)
    if (m?.[1] && wanted.has(m[1])) {
      lines.push(line.trim())
      wanted.delete(m[1])
    }
  }
  return lines
}
