import { execFile, spawn } from 'node:child_process'
import type { CommandResult, CommandRunner, RunningCommand, RunOptions } from '@main/domain/ports'
import { buildWslArgs, buildWslEnv, decodeWslOutput, RUN_SCRIPT } from './wslCore'
import type { WslShellEnv } from './WslShellEnv'
import type { WslTarget } from './WslTarget'

/**
 * Executa binários dentro da distro: `wsl.exe -d <distro> --cd <cwd> --exec /bin/sh -c RUN_SCRIPT berrante <arquivo> <args…>`.
 * O script é fixo e só aplica o PATH do login; arquivo e argumentos seguem como argv (sem interpretação de shell).
 * Variáveis extras (ex.: token do git) vão pelo WSLENV, nunca pela linha de comando.
 */
export class WslCommandRunner implements CommandRunner {
  constructor(
    private readonly target: WslTarget,
    private readonly shellEnv: WslShellEnv
  ) {}

  private async invocation(file: string, args: string[], options: { cwd?: string; env?: Record<string, string> }) {
    const [distro, login] = await Promise.all([this.target.distro(), this.shellEnv.resolve()])
    // PATH não atravessa com esse nome (colidiria com o Path do Windows): vai como BERRANTE_PATH.
    const { PATH, ...extra } = options.env ?? {}
    return {
      args: buildWslArgs(distro, options.cwd, ['/bin/sh', '-c', RUN_SCRIPT, 'berrante', file, ...args]),
      env: buildWslEnv(process.env, { ...extra, BERRANTE_PATH: PATH ?? login.PATH })
    }
  }

  async run(file: string, args: string[], options: RunOptions = {}): Promise<CommandResult> {
    let inv: Awaited<ReturnType<WslCommandRunner['invocation']>>
    try {
      inv = await this.invocation(file, args, options)
    } catch (err) {
      return { stdout: '', stderr: (err as Error).message, code: 1 }
    }
    return new Promise((resolve) => {
      const child = execFile(
        this.target.exe,
        inv.args,
        { env: inv.env, timeout: options.timeoutMs ?? 30_000, maxBuffer: 32 * 1024 * 1024, windowsHide: true, encoding: 'buffer' },
        (error, stdout, stderr) => {
          const code = error ? (typeof (error as NodeJS.ErrnoException).code === 'number' ? Number((error as NodeJS.ErrnoException).code) : 1) : 0
          const err = decodeWslOutput(stderr ?? Buffer.alloc(0))
          resolve({ stdout: (stdout ?? Buffer.alloc(0)).toString('utf8'), stderr: err || (error && !err ? error.message : ''), code })
        }
      )
      if (options.input !== undefined) child.stdin?.end(options.input)
    })
  }

  stream(file: string, args: string[], options: Omit<RunOptions, 'input' | 'timeoutMs'>, onData: (data: string) => void): RunningCommand {
    let child: ReturnType<typeof spawn> | null = null
    let killed = false
    const done = this.invocation(file, args, options).then(
      (inv) =>
        new Promise<number | null>((resolve) => {
          if (killed) return resolve(null)
          child = spawn(this.target.exe, inv.args, { env: inv.env, windowsHide: true })
          child.stdout?.on('data', (d: Buffer) => onData(d.toString('utf8')))
          child.stderr?.on('data', (d: Buffer) => onData(decodeWslOutput(d)))
          child.once('error', (err) => {
            onData(`${err.message}\n`)
            resolve(null)
          })
          child.once('exit', (code) => resolve(code))
        }),
      (err: Error) => {
        onData(`${err.message}\n`)
        return null
      }
    )
    return {
      done,
      kill: () => {
        killed = true
        child?.kill()
      }
    }
  }

  async which(binary: string): Promise<string | null> {
    const { stdout, code } = binary.includes('/')
      ? await this.run('/bin/sh', ['-c', '[ -x "$1" ] && printf "%s" "$1"', 'sh', binary], { timeoutMs: 15_000 })
      : await this.run('/bin/sh', ['-c', 'command -v -- "$1"', 'sh', binary], { timeoutMs: 15_000 })
    const path = stdout.trim()
    return code === 0 && path.startsWith('/') ? path : null
  }
}
