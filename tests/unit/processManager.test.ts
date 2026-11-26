import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { Logger } from '@main/domain/ports'
import { ShellEnv } from '@main/infra/platform/ShellEnv'
import { PosixProcessHost } from '@main/infra/process/PosixProcessHost'
import { ProcessManager } from '@main/infra/process/ProcessManager'

const silent: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined }
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'berrante-pm-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

describe.skipIf(process.platform === 'win32')('ProcessManager (host nativo macOS/Linux)', () => {
  const host = new PosixProcessHost(new ShellEnv())

  it('serviço curto: log, código de saída e handle liberado', async () => {
    const pm = new ProcessManager(join(tmp, 'logs'), host, silent)
    const handle = await pm.spawn({ serviceId: 'p::setup', projectId: 'p', command: 'echo "porta $PORT"; exit 4', cwd: tmp, env: { PORT: '5180' } })
    expect(handle.pgid).toBe(handle.pid)
    expect((await pm.waitForExit('p::setup')).code).toBe(4)
    expect(pm.logs('p::setup')).toContain('porta 5180')
    expect(pm.handles()).toEqual([])
  })

  it('stop encerra o grupo inteiro (inclusive filhos em background) e re-adoção acha o grupo', async () => {
    const pm = new ProcessManager(join(tmp, 'logs'), host, silent)
    const handle = await pm.spawn({ serviceId: 'p::dev', projectId: 'p', command: 'sleep 30 & sleep 30', cwd: tmp, env: {} })
    expect(pm.isAlive('p::dev')).toBe(true)
    const other = new ProcessManager(join(tmp, 'logs'), host, silent)
    expect(await other.adopt([handle])).toHaveLength(1)
    await pm.stop('p::dev', 2000)
    expect(await host.isGroupAlive(handle.pgid)).toBe(false)
    expect(pm.isAlive('p::dev')).toBe(false)
  })
})
