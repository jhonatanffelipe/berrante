import { execFile } from 'node:child_process'
import { access, constants } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import type { CommandResult, CommandRunner, RunOptions } from '@main/domain/ports'
import type { ShellEnv } from './ShellEnv'

/** Executa binários via argv (sem shell → sem injeção). */
export class NodeCommandRunner implements CommandRunner {
  constructor(private readonly shellEnv: ShellEnv) {}

  async run(file: string, args: string[], options: RunOptions = {}): Promise<CommandResult> {
    const env = { ...(await this.shellEnv.resolve()), ...options.env }
    return new Promise((resolve) => {
      const child = execFile(
        file,
        args,
        { cwd: options.cwd, env, timeout: options.timeoutMs ?? 30_000, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
        (error, stdout, stderr) => {
          const code = error ? (typeof (error as NodeJS.ErrnoException).code === 'number' ? Number((error as NodeJS.ErrnoException).code) : 1) : 0
          resolve({ stdout: String(stdout), stderr: String(stderr) || (error && !stderr ? error.message : ''), code })
        }
      )
      if (options.input !== undefined) child.stdin?.end(options.input)
    })
  }

  async which(binary: string): Promise<string | null> {
    if (binary.includes('/')) {
      try {
        await access(binary, constants.X_OK)
        return binary
      } catch {
        return null
      }
    }
    const env = await this.shellEnv.resolve()
    for (const dir of (env.PATH ?? '').split(delimiter)) {
      const candidate = join(dir, binary)
      try {
        await access(candidate, constants.X_OK)
        return candidate
      } catch {
        /* próximo */
      }
    }
    return null
  }
}
