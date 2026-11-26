import { join } from 'node:path'
import type { Settings, WslStatus } from '@shared/types'
import type { CommandRunner, Logger, ProcessKiller, Workspace } from '@main/domain/ports'
import type { SettingsRepository } from '@main/domain/repositories'
import { ShellEnv } from './ShellEnv'
import { NodeCommandRunner } from './NodeCommandRunner'
import { PosixWorkspace } from './PosixWorkspace'
import { WslTarget, defaultWslExe } from './wsl/WslTarget'
import { WslShellEnv } from './wsl/WslShellEnv'
import { WslCommandRunner } from './wsl/WslCommandRunner'
import { WslWorkspace } from './wsl/WslWorkspace'
import type { ProcessHost } from '../process/ProcessHost'
import { PosixProcessHost } from '../process/PosixProcessHost'
import { WslProcessHost } from '../process/WslProcessHost'
import { PosixProcessKiller } from '../process/PosixProcessKiller'
import { WslProcessKiller } from '../process/WslProcessKiller'

/** Ferramentas que o Berrante usa dentro do workspace, com a dica de instalação. */
const TOOLS: { name: string; hint: string }[] = [
  { name: 'git', hint: 'sudo apt install git' },
  { name: 'docker', hint: 'Docker Desktop → Settings → Resources → WSL integration → ligue a distro' },
  { name: 'lsof', hint: 'sudo apt install lsof' },
  { name: 'ps', hint: 'sudo apt install procps' },
  { name: 'setsid', hint: 'sudo apt install util-linux' }
]

/**
 * Tudo que muda entre sistemas, montado num lugar só. macOS/Linux rodam direto; no Windows os repositórios,
 * comandos e serviços vivem numa distro WSL.
 */
export interface Platform {
  kind: 'posix' | 'wsl'
  runner: CommandRunner
  workspace: Workspace
  processHost: ProcessHost
  killer: ProcessKiller
  /** Pasta do script de askpass do git, no sistema onde o git roda. */
  askpassDir(): Promise<string>
  /** `~/.local/bin` onde ficam as CLIs de IA. */
  aiBinDir(): Promise<string>
  /** Carrega o que for preciso antes do primeiro uso (distro, ambiente) e ajusta padrões. */
  init(settings: SettingsRepository): Promise<void>
  onSettingsChanged(next: Settings, previous: Settings): void
  status(): Promise<WslStatus>
}

const UNSUPPORTED: WslStatus = { supported: false, installed: false, distros: [], current: null, home: null, tools: [], error: null }

export function createPlatform(dataDir: string, settings: SettingsRepository, logger: Logger, platform: NodeJS.Platform = process.platform): Platform {
  if (platform === 'win32') return createWslPlatform(settings, logger)

  const shellEnv = new ShellEnv(platform)
  const runner = new NodeCommandRunner(shellEnv)
  const workspace = new PosixWorkspace()
  return {
    kind: 'posix',
    runner,
    workspace,
    processHost: new PosixProcessHost(shellEnv),
    killer: new PosixProcessKiller(),
    askpassDir: async () => join(dataDir, 'bin'),
    aiBinDir: async () => join(await workspace.home(), '.local', 'bin'),
    init: async () => undefined,
    onSettingsChanged: () => undefined,
    status: async () => UNSUPPORTED
  }
}

function createWslPlatform(settings: SettingsRepository, logger: Logger): Platform {
  const target = new WslTarget(defaultWslExe(), settings)
  const shellEnv = new WslShellEnv(target)
  const runner = new WslCommandRunner(target, shellEnv)
  const workspace = new WslWorkspace(target, runner, shellEnv)

  const load = async (): Promise<void> => {
    const distro = await target.distro()
    const env = await shellEnv.resolve()
    logger.info('wsl.ready', { distro, home: env.HOME, shell: env.SHELL })
  }

  return {
    kind: 'wsl',
    runner,
    workspace,
    processHost: new WslProcessHost(target, shellEnv, runner),
    killer: new WslProcessKiller(runner),
    askpassDir: async () => `${await workspace.home()}/.cache/berrante`,
    aiBinDir: async () => `${await workspace.home()}/.local/bin`,

    async init(repo: SettingsRepository): Promise<void> {
      await load()
      // Primeira abertura no Windows: a pasta de clones padrão (~/www do Windows) vira ~/www dentro da distro.
      const current = await repo.get()
      if (!current.cloneRoot.startsWith('/')) {
        const cloneRoot = `${await workspace.home()}/www`
        await workspace.mkdirp(cloneRoot).catch(() => undefined)
        await repo.save({ ...current, cloneRoot })
        logger.info('wsl.cloneRoot.default', { cloneRoot })
      }
    },

    onSettingsChanged(next: Settings, previous: Settings): void {
      if (next.wslDistro === previous.wslDistro) return
      target.invalidate()
      shellEnv.invalidate()
      void load().catch((err) => logger.error('wsl.reload.failed', { error: (err as Error).message }))
    },

    async status(): Promise<WslStatus> {
      let distros: WslStatus['distros'] = []
      try {
        distros = await target.list(true)
      } catch (err) {
        return { ...UNSUPPORTED, supported: true, error: `WSL não encontrada: ${(err as Error).message}. Instale com \`wsl --install\`.` }
      }
      try {
        const current = await target.distro()
        const env = await shellEnv.resolve()
        const tools = await Promise.all(TOOLS.map(async (t) => ({ ...t, available: (await runner.which(t.name)) !== null })))
        return { supported: true, installed: true, distros, current, home: env.HOME, tools, error: null }
      } catch (err) {
        return { supported: true, installed: true, distros, current: null, home: null, tools: [], error: (err as Error).message }
      }
    }
  }
}
