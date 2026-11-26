import { execFileSync, spawn } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { Settings } from '@shared/types'
import type { SettingsRepository } from '@main/domain/repositories'
import type { Logger } from '@main/domain/ports'
import { WslTarget } from '@main/infra/platform/wsl/WslTarget'
import { WslShellEnv } from '@main/infra/platform/wsl/WslShellEnv'
import { WslCommandRunner } from '@main/infra/platform/wsl/WslCommandRunner'
import { WslWorkspace } from '@main/infra/platform/wsl/WslWorkspace'
import { WslProcessHost } from '@main/infra/process/WslProcessHost'
import { WslProcessKiller } from '@main/infra/process/WslProcessKiller'
import { ProcessManager } from '@main/infra/process/ProcessManager'
import { FIXTURES } from '../helpers'

/**
 * Exercita os adapters da WSL de ponta a ponta com um `wsl.exe` falso (tests/fixtures/wsl/fake-wsl.sh),
 * que imita o argv do real e só deixa atravessar as variáveis listadas no WSLENV. Roda no macOS/Linux.
 */
const FAKE_WSL = join(FIXTURES, 'wsl', 'fake-wsl.sh')
const hasPython = (() => {
  try {
    execFileSync('python3', ['-c', 'import os; os.setsid'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

const settingsRepo = (wslDistro: string | null): SettingsRepository =>
  ({ get: async () => ({ wslDistro }) as Settings, save: async () => undefined }) as SettingsRepository
const silent: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function build(distro: string | null = null) {
  const target = new WslTarget(FAKE_WSL, settingsRepo(distro))
  const shellEnv = new WslShellEnv(target)
  const runner = new WslCommandRunner(target, shellEnv)
  return { target, shellEnv, runner, workspace: new WslWorkspace(target, runner, shellEnv) }
}

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'berrante-wsl-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

describe.skipIf(process.platform === 'win32' || !hasPython)('adapters WSL (wsl.exe falso)', () => {
  it('resolve a distro padrão e respeita a escolhida', async () => {
    expect(await build().target.distro()).toBe('FakeDistro')
    await expect(build('NaoExiste').target.distro()).rejects.toThrow(/não existe/)
    const { target } = build()
    await target.distro()
    expect(target.current()).toBe('FakeDistro')
  })

  it('executa argv sem interpretação de shell, na pasta pedida e com stdin', async () => {
    const { runner } = build()
    expect((await runner.run('echo', ['a b', '$HOME', '; rm -rf /'])).stdout).toBe('a b $HOME ; rm -rf /\n')
    expect((await runner.run('pwd', [], { cwd: tmp })).stdout.trim()).toBe(tmp)
    expect((await runner.run('cat', [], { input: 'boiada' })).stdout).toBe('boiada')
    expect((await runner.run('/bin/sh', ['-c', 'exit 3'])).code).toBe(3)
  })

  it('variáveis extras atravessam pelo WSLENV e o PATH do login é aplicado', async () => {
    const { runner, shellEnv } = build()
    expect((await runner.run('/bin/sh', ['-c', 'printf %s "$BERRANTE_GIT_TOKEN"'], { env: { BERRANTE_GIT_TOKEN: 'segredo' } })).stdout).toBe('segredo')
    // Sem WSLENV a variável não chegaria: o fake (como o real) não repassa o ambiente do Windows.
    process.env.BERRANTE_SO_NO_WINDOWS = 'x'
    expect((await runner.run('/bin/sh', ['-c', 'printf %s "${BERRANTE_SO_NO_WINDOWS:-vazio}"'])).stdout).toBe('vazio')
    delete process.env.BERRANTE_SO_NO_WINDOWS
    const login = await shellEnv.resolve()
    expect((await runner.run('/bin/sh', ['-c', 'printf %s "$PATH"'])).stdout).toBe(login.PATH)
  })

  it('which encontra binários da distro', async () => {
    const { runner } = build()
    expect(await runner.which('sh')).toMatch(/\/sh$/)
    expect(await runner.which('nao-existe-berrante')).toBeNull()
    expect(await runner.which('/bin/sh')).toBe('/bin/sh')
  })

  it('stream entrega a saída aos poucos e o código de saída', async () => {
    const { runner } = build()
    let out = ''
    const code = await runner.stream('/bin/sh', ['-c', 'echo um; echo dois >&2; exit 0'], {}, (d) => (out += d)).done
    expect(code).toBe(0)
    expect(out).toContain('um')
    expect(out).toContain('dois')
  })

  it('workspace cria e testa pastas dentro da distro', async () => {
    const { workspace } = build()
    const dir = join(tmp, 'clones', 'fazenda')
    expect(await workspace.exists(dir)).toBe(false)
    await workspace.mkdirp(dir)
    expect(await workspace.isDirectory(dir)).toBe(true)
    expect(await workspace.home()).toBeTruthy()
  })

  it('host de processos: grupo próprio, PGID lido do pidfile e encerramento do grupo inteiro', async () => {
    const { target, shellEnv, runner } = build()
    const host = new WslProcessHost(target, shellEnv, runner)
    const log = join(tmp, 'svc.log')
    const fd = openSync(log, 'w')
    const spawned = await host.spawn('echo "porta $PORT"; sleep 30 & sleep 30', tmp, { PORT: '4100' }, fd)
    closeSync(fd)
    expect(spawned.pgid).toBeGreaterThan(1)
    expect(await host.isGroupAlive(spawned.pgid)).toBe(true)
    await sleep(300)
    expect(readFileSync(log, 'utf8')).toContain('porta 4100')
    await host.terminateGroup(spawned.pgid, 3000)
    expect(await host.isGroupAlive(spawned.pgid)).toBe(false)
  })

  it('ProcessManager sobre o host WSL: serviço curto termina e reporta o código', async () => {
    const { target, shellEnv, runner } = build()
    const pm = new ProcessManager(join(tmp, 'logs'), new WslProcessHost(target, shellEnv, runner), silent)
    const handle = await pm.spawn({ serviceId: 'p::install', projectId: 'p', command: 'echo instalando; exit 7', cwd: tmp, env: {} })
    expect(handle.pid).toBe(handle.pgid)
    const exit = await pm.waitForExit('p::install')
    expect(exit.code).toBe(7)
    expect(pm.isAlive('p::install')).toBe(false)
    expect(pm.logs('p::install')).toContain('instalando')
  })

  it('ProcessManager: parar e re-adotar um serviço longo', async () => {
    const { target, shellEnv, runner } = build()
    const host = new WslProcessHost(target, shellEnv, runner)
    const pm = new ProcessManager(join(tmp, 'logs'), host, silent)
    const handle = await pm.spawn({ serviceId: 'p::dev', projectId: 'p', command: 'sleep 30', cwd: tmp, env: {} })
    expect(pm.isAlive('p::dev')).toBe(true)

    // Outra sessão do app re-adota pelo PGID guardado.
    const pm2 = new ProcessManager(join(tmp, 'logs'), host, silent)
    expect((await pm2.adopt([handle])).map((h) => h.serviceId)).toEqual(['p::dev'])
    await pm2.stop('p::dev', 3000)
    expect(await host.isGroupAlive(handle.pgid)).toBe(false)
    expect(pm2.isAlive('p::dev')).toBe(false)
    await pm.waitForExit('p::dev')
    expect(pm.isAlive('p::dev')).toBe(false)
  })

  it('killer encerra um PID de dentro da distro', async () => {
    const { runner } = build()
    const child = spawn('sleep', ['30'], { stdio: 'ignore' })
    await new Promise((r) => child.once('spawn', r))
    const killer = new WslProcessKiller(runner)
    expect(await killer.isAlive(child.pid!)).toBe(true)
    await killer.kill(child.pid!, 2000)
    await sleep(100)
    expect(await killer.isAlive(child.pid!)).toBe(false)
    await expect(killer.kill(1, 1000)).rejects.toThrow(/não pode/)
  })
})
