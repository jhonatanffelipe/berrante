import { appendFile, mkdir, stat, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Logger } from '@main/domain/ports'

const SECRET_PATTERNS: RegExp[] = [
  /\b(gh[pousr]_[A-Za-z0-9]{20,})\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /(authorization["']?\s*[:=]\s*["']?)(bearer|token)\s+[^\s"']+/gi,
  /(x-access-token:)[^@\s]+/gi,
  /\b(device_code|access_token|refresh_token|secret|password|totp)(["']?\s*[:=]\s*["']?)[^\s"',}]+/gi
]

export function redact(text: string): string {
  let out = text
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, (match, ...groups) => {
      const g = groups.slice(0, -2) as (string | undefined)[]
      if (g.length >= 2 && g[0] && g[1] !== undefined && /[:=]/.test(g[1] ?? '')) return `${g[0]}${g[1]}[REDACTED]`
      if (g[0] && /authorization|x-access-token/i.test(g[0])) return `${g[0]}[REDACTED]`
      return '[REDACTED]'
    })
  }
  return out
}

const MAX_BYTES = 5 * 1024 * 1024

/** Logger JSON-lines em arquivo + console, com redação de segredos e rotação simples. */
export class RedactingLogger implements Logger {
  private queue: Promise<void> = Promise.resolve()

  constructor(
    private readonly file: string,
    private readonly echo = true
  ) {}

  private write(level: string, message: string, context?: Record<string, unknown>): void {
    const line = redact(JSON.stringify({ ts: new Date().toISOString(), level, message, ...context }))
    if (this.echo) (level === 'error' ? console.error : console.log)(line)
    this.queue = this.queue
      .then(async () => {
        await mkdir(dirname(this.file), { recursive: true })
        const size = await stat(this.file).then((s) => s.size, () => 0)
        if (size > MAX_BYTES) await rename(this.file, `${this.file}.1`)
        await appendFile(this.file, line + '\n', { mode: 0o600 })
      })
      .catch(() => undefined)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context)
  }
  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context)
  }
  error(message: string, context?: Record<string, unknown>): void {
    this.write('error', message, context)
  }
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.BERRANTE_DEBUG) this.write('debug', message, context)
  }
}
