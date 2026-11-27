import { execFile } from 'node:child_process'
import { access, constants } from 'node:fs/promises'
import { delimiter, isAbsolute, join } from 'node:path'
import type { CommandResult, CommandRunner, RunOptions } from '@main/domain/ports'
import type { ShellEnv } from './ShellEnv'
import { envGet, isWindows } from './platform'

/**
 * No Windows, o execFile sem shell só roda executáveis de verdade (.exe/.com): um .cmd/.bat exigiria cmd.exe e
 * reabriria a porta para injeção. Por isso o which() só devolve .exe/.com.
 */
const WINDOWS_EXTENSIONS = ['.exe', '.com']

/** Executa binários via argv (sem shell → sem injeção). */
export class NodeCommandRunner implements CommandRunner {
  constructor(private readonly shellEnv: ShellEnv) {}

  async run(file: string, args: string[], options: RunOptions = {}): Promise<CommandResult> {
    const env = { ...(await this.shellEnv.resolve()), ...options.env }
    return new Promise((resolve) => {
      const child = execFile(
        file,
        args,
        // windowsHide: sem isso, cada git/docker/netstat abre (e fecha) uma janela de console no Windows.
        { cwd: options.cwd, env, timeout: options.timeoutMs ?? 30_000, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
        (error, stdout, stderr) => {
          const code = error ? (typeof (error as NodeJS.ErrnoException).code === 'number' ? Number((error as NodeJS.ErrnoException).code) : 1) : 0
          resolve({ stdout: String(stdout), stderr: String(stderr) || (error && !stderr ? error.message : ''), code })
        }
      )
      if (options.input !== undefined) child.stdin?.end(options.input)
    })
  }

  private async executable(path: string): Promise<boolean> {
    try {
      await access(path, constants.X_OK)
      return true
    } catch {
      return false
    }
  }

  async which(binary: string): Promise<string | null> {
    const names = isWindows && !/\.(exe|com)$/i.test(binary) ? WINDOWS_EXTENSIONS.map((ext) => binary + ext) : [binary]
    if (binary.includes('/') || (isWindows && (binary.includes('\\') || isAbsolute(binary)))) {
      for (const name of names) if (await this.executable(name)) return name
      return null
    }
    const env = await this.shellEnv.resolve()
    for (const dir of (envGet(env, 'PATH') ?? '').split(delimiter).filter(Boolean)) {
      for (const name of names) {
        const candidate = join(dir, name)
        if (await this.executable(candidate)) return candidate
      }
    }
    return null
  }
}
