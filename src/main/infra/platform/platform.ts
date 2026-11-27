import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const isWindows = process.platform === 'win32'
export const isMac = process.platform === 'darwin'

type Env = Record<string, string | undefined>

/** Lê uma variável sem diferenciar maiúsculas: no Windows o PATH costuma vir como "Path". */
export function envGet(env: Env, name: string): string | undefined {
  if (env[name] !== undefined) return env[name]
  const upper = name.toUpperCase()
  const key = Object.keys(env).find((k) => k.toUpperCase() === upper)
  return key ? env[key] : undefined
}

/**
 * Bash do Git for Windows (o mesmo Git que o Berrante já usa para clonar).
 * Nunca o `C:\Windows\System32\bash.exe`, que é o do WSL e roda em outro sistema de arquivos.
 */
export function findGitBash(env: Env = process.env): string | null {
  const candidates: string[] = []
  for (const base of [envGet(env, 'ProgramW6432'), envGet(env, 'ProgramFiles'), envGet(env, 'ProgramFiles(x86)')]) {
    if (base) candidates.push(join(base, 'Git', 'bin', 'bash.exe'))
  }
  const local = envGet(env, 'LOCALAPPDATA')
  if (local) candidates.push(join(local, 'Programs', 'Git', 'bin', 'bash.exe'))
  // Git instalado em outro lugar (scoop, winget com outra pasta): parte do git.exe no PATH.
  for (const dir of (envGet(env, 'PATH') ?? '').split(';').filter(Boolean)) {
    if (!existsSync(join(dir, 'git.exe'))) continue
    // <git>\cmd\git.exe, <git>\bin\git.exe ou <git>\mingw64\bin\git.exe
    candidates.push(join(dirname(dir), 'bin', 'bash.exe'), join(dirname(dirname(dir)), 'bin', 'bash.exe'))
  }
  return candidates.find((c) => !/\\system32\\/i.test(c) && existsSync(c)) ?? null
}

/** Executável do sistema em System32 (taskkill, cmd, netstat…), sem depender do PATH. */
export function system32(exe: string, env: Env = process.env): string {
  const root = envGet(env, 'SystemRoot') ?? 'C:\\Windows'
  return join(root, 'System32', exe)
}
