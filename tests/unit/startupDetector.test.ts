import { describe, expect, it } from 'vitest'
import { detectPackageManager, runScriptCommand } from '@main/application/startup/detectors/packageManager'
import { classifyScript, primaryServiceScript, classifyScripts } from '@main/application/startup/detectors/scriptClassifier'
import { hostPorts, normalizePort, parseComposeYaml } from '@main/application/startup/detectors/composeParser'
import { checkEnv, parseEnvKeys } from '@main/application/startup/detectors/envCheck'
import { detectRepo } from '@main/application/startup/detectors/repoDetector'
import { buildPlan, mergePlans, serviceIds } from '@main/application/startup/detectors/planBuilder'
import { diffPlans, orderServices, playableServices } from '@main/domain/entities/ServiceDefinition'
import type { RepoDetection } from '@shared/types'
import { fixtureRepo, fixtureText } from '../helpers'

const NOW = new Date('2026-11-25T12:00:00Z')
const noDocker = async () => null

async function detect(name: string): Promise<RepoDetection> {
  const repo = fixtureRepo(name)
  return detectRepo({ id: name, name, path: repo.path }, repo.files, noDocker)
}

describe('detectPackageManager', () => {
  it('prioriza o campo packageManager', () => {
    expect(detectPackageManager({ packageManager: 'pnpm@9.1.0+sha512.abc' }, ['yarn.lock'])).toEqual({
      name: 'pnpm',
      version: '9.1.0',
      source: 'packageManager',
      lockfile: 'yarn.lock'
    })
  })

  it.each([
    ['yarn.lock', 'yarn'],
    ['pnpm-lock.yaml', 'pnpm'],
    ['package-lock.json', 'npm'],
    ['bun.lockb', 'bun'],
    ['bun.lock', 'bun']
  ])('usa o lockfile %s → %s', (lock, pm) => {
    expect(detectPackageManager({}, [lock])).toMatchObject({ name: pm, source: 'lockfile' })
  })

  it('cai para npm sem lockfile e devolve null sem package.json', () => {
    expect(detectPackageManager({}, [])).toMatchObject({ name: 'npm', source: 'fallback' })
    expect(detectPackageManager(null, ['yarn.lock'])).toBeNull()
  })

  it('monta o comando de script por gerenciador', () => {
    expect(runScriptCommand('npm', 'dev')).toBe('npm run dev')
    expect(runScriptCommand('yarn', 'dev')).toBe('yarn dev')
    expect(runScriptCommand('bun', 'dev')).toBe('bun run dev')
  })
})

describe('classifyScript', () => {
  it.each([
    ['dev', 'vite', 'service'],
    ['start:dev', 'nest start --watch', 'service'],
    ['dev:worker', 'tsx watch src/worker.ts', 'service'],
    ['api:dev', 'node x', 'service'],
    ['worker', 'node dist/worker.js', 'service'],
    ['watch', 'tsc -w', 'service'],
    ['preview', 'vite preview', 'service'],
    ['custom', 'nodemon src/index.ts', 'service'],
    ['build', 'tsc && vite build', 'action'],
    ['test', 'vitest run', 'action'],
    ['test:watch', 'jest --watch', 'action'],
    ['lint:fix', 'eslint . --fix', 'action'],
    ['migration:run', 'typeorm migration:run', 'action'],
    ['seed:dev:run', 'typeorm ...', 'action'],
    ['prepare', 'husky', 'action'],
    ['postinstall', 'electron-builder install-app-deps', 'action'],
    ['typecheck', 'tsc --noEmit', 'action'],
    ['job:purge-versions', 'ts-node script.ts', 'action'],
    ['contracts:sync', 'node scripts/sync.mjs', 'action']
  ])('%s (%s) → %s', (name, cmd, expected) => {
    expect(classifyScript(name, cmd)).toBe(expected)
  })

  it('escolhe dev como serviço principal', () => {
    const scripts = classifyScripts({ start: 'node dist', dev: 'vite', 'dev:docs': 'vitepress dev' })
    expect(primaryServiceScript(scripts)?.name).toBe('dev')
  })
})

describe('compose', () => {
  it('normaliza portas curtas e longas', () => {
    expect(normalizePort("'127.0.0.1:5433:5432'".replace(/'/g, ''))).toBe('5433:5432')
    expect(normalizePort('8080:80/tcp')).toBe('8080:80')
    expect(normalizePort({ target: 5432, published: '5433', host_ip: '127.0.0.1' })).toBe('5433:5432')
    expect(normalizePort(3000)).toBe('3000')
    expect(hostPorts(['5433:5432', '9000', '3000-3002:3000-3002'])).toEqual([5433, 3000, 3001, 3002])
  })

  it('lê serviços, profiles, healthcheck e rede externa do fazenda-api', () => {
    const info = parseComposeYaml(fixtureText('repos/fazenda-api/docker-compose.yml'), 'docker-compose.yml')
    expect(info.projectName).toBe('fazenda')
    expect(info.externalNetworks).toEqual(['fazenda-network'])
    expect(info.services.map((s) => [s.name, s.profiles, s.hasHealthcheck, s.ports])).toEqual([
      ['db', [], true, ['5433:5432']],
      ['mailpit', [], true, ['1025:1025', '8025:8025']],
      ['redis', ['full'], false, ['6380:6379']],
      ['mongo', ['full'], false, ['27018:27017']]
    ])
  })

  it('lê depends_on em formato de mapa (fazenda-logs)', () => {
    const info = parseComposeYaml(fixtureText('repos/fazenda-logs/docker-compose.yml'), 'docker-compose.yml')
    expect(info.services.find((s) => s.name === 'grafana')?.dependsOn).toEqual(['loki', 'prometheus'])
  })
})

describe('env', () => {
  it('compara só as chaves', () => {
    expect(parseEnvKeys('# c\nA=1\nexport B="x"\n  C = 2\nnot a var\n')).toEqual(['A', 'B', 'C'])
    expect(checkEnv('.env.example', 'A=\nB=\n', 'A=1')).toEqual({ exampleFile: '.env.example', envFile: '.env', envExists: true, missingKeys: ['B'] })
    expect(checkEnv('.env.example', 'A=\n', null).envExists).toBe(false)
  })
})

describe('detectRepo (fixtures fazenda)', () => {
  it('fazenda-api: yarn via packageManager, compose, README e scripts', async () => {
    const d = await detect('fazenda-api')
    expect(d.packageManager).toEqual({ name: 'yarn', version: '1.22.22', source: 'packageManager', lockfile: 'yarn.lock' })
    expect(d.nodeModulesInstalled).toBe(true)
    expect(d.compose?.services.map((s) => s.name)).toEqual(['db', 'mailpit', 'redis', 'mongo'])
    expect(d.scripts.filter((s) => s.category === 'service').map((s) => s.name)).toEqual(['dev', 'start'])
    expect(d.scripts.find((s) => s.name === 'test:integration')?.category).toBe('action')
    expect(d.env).toMatchObject({ envExists: true, missingKeys: [] })
    expect(d.warnings).toContain('Docker indisponível: compose lido direto do YAML (variáveis não interpoladas)')
  })

  it('fazenda-web: Vite com yarn, sem compose', async () => {
    const d = await detect('fazenda-web')
    expect(d.packageManager?.name).toBe('yarn')
    expect(d.compose).toBeNull()
    expect(primaryServiceScript(d.scripts)?.name).toBe('dev')
  })

  it('fazenda-logs: só compose', async () => {
    const d = await detect('fazenda-logs')
    expect(d.packageJson).toBe(false)
    expect(d.packageManager).toBeNull()
    expect(d.compose?.services.map((s) => s.name)).toEqual(['loki', 'prometheus', 'grafana'])
  })

  it('avisa quando o .env está faltando', async () => {
    const repo = fixtureRepo('fazenda-web')
    const files = { ...repo.files, list: async () => (await repo.files.list()).filter((f) => f !== '.env' && f !== 'node_modules') }
    const d = await detectRepo({ id: 'w', name: 'w', path: '/w' }, files, noDocker)
    expect(d.env?.envExists).toBe(false)
    expect(d.warnings.some((w) => w.startsWith('.env não encontrado'))).toBe(true)
    expect(d.warnings).toContain('Dependências não instaladas: rode `yarn install`')
  })
})

describe('buildPlan (tropa fazenda: backend + web + logs)', async () => {
  const detections = [await detect('fazenda-api'), await detect('fazenda-web'), await detect('fazenda-logs')]
  const plan = buildPlan(detections, NOW)
  const byId = new Map(plan.services.map((s) => [s.id, s]))

  it('cria a rede externa uma vez só, antes de tudo', () => {
    const nets = plan.services.filter((s) => s.id.startsWith('net:'))
    expect(nets).toHaveLength(1)
    expect(nets[0]).toMatchObject({ id: 'net:fazenda-network', kind: 'setup', enabled: true, order: 0 })
    expect(nets[0]!.command).toBe('docker network inspect fazenda-network >/dev/null 2>&1 || docker network create fazenda-network')
  })

  it('habilita só os containers do README (db, mailpit) e deixa profiles desligados', () => {
    const enabled = plan.services.filter((s) => s.kind === 'compose' && s.repoId === 'fazenda-api' && s.enabled).map((s) => s.name)
    expect(enabled).toEqual(['db', 'mailpit'])
    expect(byId.get(serviceIds.compose('fazenda-api', 'redis'))?.enabled).toBe(false)
    expect(plan.services.filter((s) => s.repoId === 'fazenda-logs' && s.enabled).map((s) => s.name)).toEqual(['loki', 'prometheus', 'grafana'])
  })

  it('yarn dev do backend depende dos containers habilitados', () => {
    const dev = byId.get(serviceIds.script('fazenda-api', 'dev'))!
    expect(dev).toMatchObject({ command: 'yarn dev', enabled: true, kind: 'script' })
    expect(dev.dependsOn).toEqual([serviceIds.compose('fazenda-api', 'db'), serviceIds.compose('fazenda-api', 'mailpit')])
    expect(byId.get(serviceIds.script('fazenda-api', 'start'))?.enabled).toBe(false)
  })

  it('grafana depende de loki/prometheus e da rede', () => {
    expect(byId.get(serviceIds.compose('fazenda-logs', 'grafana'))?.dependsOn).toEqual([
      'net:fazenda-network',
      serviceIds.compose('fazenda-logs', 'loki'),
      serviceIds.compose('fazenda-logs', 'prometheus')
    ])
  })

  it('scripts de ação e comandos extras do README viram botões', () => {
    const backend = plan.actions.filter((a) => a.repoId === 'fazenda-api').map((a) => a.command)
    expect(backend).toContain('yarn migration:run')
    expect(backend).toContain('yarn migration:run && yarn seed:run && yarn seed:dev:run')
    expect(backend).toContain('cp .env.example .env')
    expect(backend).not.toContain('yarn dev')
    expect(backend).not.toContain('docker compose up -d db mailpit')
  })

  it('a ordem de subida respeita rede → containers → scripts', () => {
    const order = playableServices(plan).map((s) => s.id)
    expect(order.indexOf('net:fazenda-network')).toBe(0)
    expect(order.indexOf(serviceIds.compose('fazenda-api', 'db'))).toBeLessThan(order.indexOf(serviceIds.script('fazenda-api', 'dev')))
    expect(order.indexOf(serviceIds.compose('fazenda-logs', 'loki'))).toBeLessThan(order.indexOf(serviceIds.compose('fazenda-logs', 'grafana')))
  })

  it('é determinístico', () => {
    expect(buildPlan(detections, NOW)).toEqual(plan)
  })

  it('mergePlans preserva edições do usuário e serviços manuais', () => {
    const edited = {
      ...plan,
      services: [
        ...plan.services.map((s) => (s.id === serviceIds.script('fazenda-web', 'dev') ? { ...s, env: { PORT: '8091' }, enabled: false } : s)),
        { ...plan.services[0]!, id: 'manual:1', name: 'tunnel', origin: 'user' as const, kind: 'command' as const, command: 'ngrok http 8090' }
      ]
    }
    const merged = mergePlans(edited, buildPlan(detections, NOW))
    const web = merged.services.find((s) => s.id === serviceIds.script('fazenda-web', 'dev'))!
    expect(web.env).toEqual({ PORT: '8091' })
    expect(web.enabled).toBe(false)
    expect(merged.services.some((s) => s.id === 'manual:1')).toBe(true)
  })

  it('diffPlans aponta adicionados, removidos e alterados', () => {
    const next = { ...plan, services: plan.services.slice(1).map((s, i) => (i === 0 ? { ...s, command: 'x' } : s)) }
    next.services.push({ ...plan.services[0]!, id: 'ai:1', name: 'novo', origin: 'ai' })
    const diff = diffPlans(plan, next)
    expect(diff.find((d) => d.type === 'removed')?.serviceId).toBe('net:fazenda-network')
    expect(diff.find((d) => d.type === 'added')?.serviceId).toBe('ai:1')
    expect(diff.find((d) => d.type === 'changed')?.fields).toEqual(['command'])
  })
})

describe('orderServices', () => {
  it('detecta ciclo', () => {
    const base = { repoId: 'r', kind: 'command' as const, composeFile: null, cwd: '/', env: {}, enabled: true, color: 'cyan' as const, origin: 'user' as const }
    const a = { ...base, id: 'a', name: 'a', command: 'a', order: 0, dependsOn: ['b'] }
    const b = { ...base, id: 'b', name: 'b', command: 'b', order: 1, dependsOn: ['a'] }
    expect(() => orderServices([a, b])).toThrow(/circular/)
  })
})
