import { execFile } from 'node:child_process'
import { buildWslArgs, buildWslEnv, decodeWslOutput, LOGIN_ENV_SCRIPT, parseLoginEnv } from './wslCore'
import type { WslTarget } from './WslTarget'

const DEFAULT_PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'

export interface WslLoginEnv {
  PATH: string
  HOME: string
  SHELL: string
}

/**
 * Ambiente do shell de login dentro da distro (nvm, asdf, ~/.local/bin…), resolvido uma vez por distro.
 * Só PATH, HOME e SHELL atravessam para os comandos; o resto do ambiente é o da própria distro.
 */
export class WslShellEnv {
  private cache = new Map<string, Promise<WslLoginEnv>>()

  constructor(private readonly target: WslTarget) {}

  async resolve(): Promise<WslLoginEnv> {
    const distro = await this.target.distro()
    let pending = this.cache.get(distro)
    if (!pending) {
      pending = this.load(distro)
      this.cache.set(distro, pending)
      pending.catch(() => this.cache.delete(distro))
    }
    return pending
  }

  private load(distro: string): Promise<WslLoginEnv> {
    return new Promise((resolve) => {
      execFile(
        this.target.exe,
        buildWslArgs(distro, '~', ['/bin/sh', '-c', LOGIN_ENV_SCRIPT]),
        { encoding: 'buffer', windowsHide: true, timeout: 20_000, maxBuffer: 4 * 1024 * 1024, env: buildWslEnv(process.env, {}) },
        (_err, stdout) => {
          const env = parseLoginEnv(decodeWslOutput(stdout ?? Buffer.alloc(0)))
          resolve({ PATH: env.PATH || DEFAULT_PATH, HOME: env.HOME || '/root', SHELL: env.SHELL || '/bin/sh' })
        }
      )
    })
  }

  invalidate(): void {
    this.cache.clear()
  }
}
