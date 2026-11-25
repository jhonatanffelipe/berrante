import type { ReadmeSuggestion } from '@shared/types'

const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'shell-session', 'shellsession', 'terminal'])

/** Seções de setup/execução, em inglês e português (comparadas sem acento). */
const SETUP_SECTION =
  /\b(setup|set up|install|installation|getting started|get started|quick ?start|running|run|usage|develop|development|local|como rodar|rodar|executar|execucao|subir|instalacao|instalar|configuracao|comecando|primeiros passos|ambiente|desenvolvimento)\b/

export function normalizeHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[`*_~[\]()#]/g, '')
    .toLowerCase()
    .trim()
}

export function isSetupSection(heading: string): boolean {
  return SETUP_SECTION.test(normalizeHeading(heading))
}

/** Remove prompt ($ ou >), comentários de linha e de fim de linha fora de aspas. */
export function cleanCommandLine(line: string): string {
  let text = line.trim().replace(/^(\$|>|%)\s+/, '')
  if (text.startsWith('#')) return ''
  let quote: string | null = null
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === '#' && i > 0 && /\s/.test(text[i - 1] ?? '')) {
      text = text.slice(0, i)
      break
    }
  }
  return text.trim()
}

function blockToCommands(body: string[]): string[] {
  const commands: string[] = []
  let pending = ''
  for (const raw of body) {
    const cleaned = cleanCommandLine(raw)
    if (!cleaned && !pending) continue
    if (cleaned.endsWith('\\')) {
      pending += cleaned.slice(0, -1).trimEnd() + ' '
      continue
    }
    const full = (pending + cleaned).trim()
    pending = ''
    if (full) commands.push(full)
  }
  if (pending.trim()) commands.push(pending.trim())
  return commands
}

/**
 * Extrai blocos de código shell das seções de setup/execução de um README Markdown.
 * Uma seção vale se ela ou algum heading ancestral casar com SETUP_SECTION.
 */
export function parseReadme(markdown: string): ReadmeSuggestion[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const stack: { level: number; text: string }[] = []
  const bySection = new Map<string, string[]>()

  let fence: { marker: string; lang: string; body: string[] } | null = null

  for (const line of lines) {
    if (fence) {
      if (line.trim().startsWith(fence.marker) && line.trim().replace(/[`~]/g, '') === '') {
        const current = stack[stack.length - 1]
        const relevant = stack.some((h) => isSetupSection(h.text))
        if (current && relevant && SHELL_LANGS.has(fence.lang)) {
          const commands = blockToCommands(fence.body)
          if (commands.length) {
            const list = bySection.get(current.text) ?? []
            list.push(...commands)
            bySection.set(current.text, list)
          }
        }
        fence = null
      } else {
        fence.body.push(line)
      }
      continue
    }

    const open = line.match(/^\s{0,3}(`{3,}|~{3,})\s*([\w-]*)/)
    if (open) {
      fence = { marker: open[1] ?? '```', lang: (open[2] ?? '').toLowerCase(), body: [] }
      continue
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      const level = heading[1]!.length
      while (stack.length && stack[stack.length - 1]!.level >= level) stack.pop()
      stack.push({ level, text: heading[2]!.trim() })
    }
  }

  return [...bySection.entries()].map(([section, commands]) => ({ section, commands: dedupe(commands) }))
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)]
}

/**
 * Serviços citados em `docker compose up` no README.
 * - null: o README não fala de compose up
 * - []:   compose up sem lista (sobe tudo)
 */
export function composeServicesFromReadme(suggestions: ReadmeSuggestion[]): string[] | null {
  let found: string[] | null = null
  for (const cmd of suggestions.flatMap((s) => s.commands)) {
    for (const part of cmd.split(/&&|;/)) {
      const m = part.trim().match(/^(?:docker\s+compose|docker-compose)\b(.*)$/)
      if (!m) continue
      const tokens = (m[1] ?? '').trim().split(/\s+/).filter(Boolean)
      const upIdx = tokens.indexOf('up')
      if (upIdx === -1) continue
      const services: string[] = []
      for (let i = upIdx + 1; i < tokens.length; i++) {
        const token = tokens[i]!
        if (token.startsWith('-')) {
          if (['--scale', '--timeout', '-t', '--wait-timeout', '--pull', '--exit-code-from', '--attach', '--no-attach'].includes(token)) i++
          continue
        }
        services.push(token)
      }
      if (services.length === 0) return []
      found = [...new Set([...(found ?? []), ...services])]
    }
  }
  return found
}

/** Redes `docker network create X` citadas no README. */
export function networksFromReadme(suggestions: ReadmeSuggestion[]): string[] {
  const nets = new Set<string>()
  for (const cmd of suggestions.flatMap((s) => s.commands)) {
    for (const m of cmd.matchAll(/docker\s+network\s+create\s+(?:-[-\w]+(?:[ =]\S+)?\s+)*([\w.-]+)/g)) {
      if (m[1]) nets.add(m[1])
    }
  }
  return [...nets]
}
