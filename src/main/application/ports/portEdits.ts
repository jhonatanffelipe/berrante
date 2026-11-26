/**
 * Funções puras para trocar uma porta nos arquivos `.env` (sem I/O: testáveis).
 *
 * Uma linha "aponta" para a porta quando:
 * - a chave tem PORT no nome e o valor é exatamente a porta (`PORT=3333`, `DB_PORT="5432"`), ou
 * - o valor cita a porta num endereço local (`API_URL=http://localhost:3333/api`).
 */

export interface EnvPortLine {
  /** Índice da linha no arquivo (0-based). */
  index: number
  key: string
  before: string
  after: string
  /** `PORT` com o valor da porta (de onde o processo lê) ou só um endereço que cita a porta. */
  kind: 'port' | 'url'
}

const LINE_RE = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_.]*)(\s*=\s*)(.*)$/
const LOCAL_HOSTS = '(?:localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[::1\\])'

/** Valor sem aspas e sem comentário no fim (`3333 # api` → `3333`). */
function bareValue(raw: string): string {
  const trimmed = raw.trim()
  const quoted = trimmed.match(/^(['"])(.*?)\1(?:\s+#.*)?$/)
  if (quoted) return quoted[2]!
  return trimmed.replace(/\s+#.*$/, '')
}

function urlRe(port: number): RegExp {
  return new RegExp(`(${LOCAL_HOSTS}:)${port}(?!\\d)`, 'g')
}

/** Linhas do `.env` que apontam para `port`, já com a versão trocada para `newPort`. */
export function envPortLines(text: string, port: number, newPort: number): EnvPortLine[] {
  const out: EnvPortLine[] = []
  text.split('\n').forEach((line, index) => {
    const m = line.replace(/\r$/, '').match(LINE_RE)
    if (!m) return
    const [, prefix, key, eq, raw] = m as unknown as [string, string, string, string, string]
    if (/PORT/i.test(key) && bareValue(raw) === String(port)) {
      const after = `${prefix}${key}${eq}${raw.replace(String(port), String(newPort))}`
      out.push({ index, key, before: line.replace(/\r$/, ''), after, kind: 'port' })
      return
    }
    const re = urlRe(port)
    if (re.test(raw)) {
      const after = `${prefix}${key}${eq}${raw.replace(urlRe(port), `$1${newPort}`)}`
      out.push({ index, key, before: line.replace(/\r$/, ''), after, kind: 'url' })
    }
  })
  return out
}

/** Aplica as linhas trocadas, preservando o resto do arquivo (inclusive `\r\n`). */
export function applyEnvLines(text: string, lines: EnvPortLine[]): string {
  const rows = text.split('\n')
  for (const l of lines) {
    const cr = rows[l.index]?.endsWith('\r') ? '\r' : ''
    rows[l.index] = l.after + cr
  }
  return rows.join('\n')
}

/** Portas citadas num `.env`: chaves com PORT de valor numérico e endereços locais com porta. */
export function envPorts(text: string): number[] {
  const ports = new Set<number>()
  for (const line of text.split('\n')) {
    const m = line.replace(/\r$/, '').match(LINE_RE)
    if (!m) continue
    const value = bareValue(m[4]!)
    if (/PORT/i.test(m[2]!) && /^\d{2,5}$/.test(value)) ports.add(Number(value))
    for (const u of value.matchAll(new RegExp(`${LOCAL_HOSTS}:(\\d{2,5})`, 'g'))) ports.add(Number(u[1]))
  }
  return [...ports].filter((p) => p > 0 && p < 65_536)
}

/** Valor de uma chave do `.env` (a última definição vale, como no dotenv). */
export function envValue(text: string, key: string): string | null {
  let value: string | null = null
  for (const line of text.split('\n')) {
    const m = line.replace(/\r$/, '').match(LINE_RE)
    if (m && m[2] === key) value = bareValue(m[4]!)
  }
  return value
}

/**
 * No compose, a porta publicada vem de uma variável com padrão (`"${API_PORT:-3333}:3333"`)?
 * Devolve o nome da variável, para o Berrante declarar no `.env` em vez de mexer no compose.
 */
export function composePortVar(composeText: string, port: number): string | null {
  const re = new RegExp(`\\$\\{([A-Za-z_][A-Za-z0-9_]*)(?::?-)${port}\\}\\s*:`, 'g')
  return re.exec(composeText)?.[1] ?? null
}

/** A porta está escrita fixa no compose (`- "3333:3333"`, `- 127.0.0.1:3333:3333`)? */
export function composeHasLiteralPort(composeText: string, port: number): boolean {
  return new RegExp(`(^|[\\s"'\\[,:-])${port}\\s*:\\s*\\d+`, 'm').test(composeText)
}

/** Primeira porta livre depois de `from` (fora de `taken`), sem sair das portas de usuário. */
export function suggestPort(from: number, taken: Set<number>): number | null {
  for (let p = Math.max(1024, from + 1); p < 65_536 && p < from + 2000; p++) {
    if (!taken.has(p)) return p
  }
  return null
}
