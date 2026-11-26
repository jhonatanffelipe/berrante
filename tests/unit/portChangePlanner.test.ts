import { describe, expect, it } from 'vitest'
import type { LocalRepository, Project, ServiceDefinition } from '@shared/types'
import { PortChangePlanner } from '@main/application/ports/PortChangePlanner'
import type { EnvFileGateway, Logger, PortScannerGateway, RepoInspectorGateway } from '@main/domain/ports'
import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'

const now = '2026-11-26T12:00:00.000Z'
const repo = (id: string): LocalRepository => ({ id, name: id, path: `/w/${id}`, githubFullName: null, remoteUrl: null, addedAt: now })
const step = (repoId: string, id: string, patch: Partial<ServiceDefinition> = {}): ServiceDefinition => ({
  id, repoId, name: id, kind: 'script', command: 'yarn dev', composeFile: null, cwd: `/w/${repoId}`, env: {}, enabled: true, order: 0, waitFor: 'port', dependsOn: [], color: 'green', origin: 'detected', ...patch
})
const project = (id: string, repositoryIds: string[], services: ServiceDefinition[]): Project => ({
  id, name: id, color: 'green', icon: 'tee', repositoryIds, plan: { services, actions: [], detectedAt: now, updatedAt: now }, createdAt: now, updatedAt: now
})

function setup(files: Record<string, string>, projects: Project[], listening: number[], compose: Record<string, string> = {}) {
  const repos = [...new Set(projects.flatMap((p) => p.repositoryIds))].map(repo)
  const written: Record<string, string> = {}
  const envFiles: EnvFileGateway = {
    read: async (dir, file) => written[`${dir}/${file}`] ?? files[`${dir}/${file}`] ?? null,
    create: async (dir, file, content) => void (written[`${dir}/${file}`] = content),
    append: async () => undefined,
    write: async (dir, file, content) => void (written[`${dir}/${file}`] = content)
  }
  const projectRepo: ProjectRepository = { list: async () => projects, findById: async (id) => projects.find((p) => p.id === id) ?? null, save: async () => undefined, delete: async () => undefined }
  const repoRepo: LocalRepositoryRepository = { list: async () => repos, findById: async (id) => repos.find((r) => r.id === id) ?? null, findByPath: async () => null, save: async () => undefined, delete: async () => undefined }
  const inspector: RepoInspectorGateway = {
    files: (cwd) => ({ readText: async (rel) => compose[`${cwd}/${rel}`] ?? null, exists: async () => false, list: async () => [] }),
    composeConfig: async () => null
  }
  const scanner: PortScannerGateway = { listListening: async () => listening.map((port) => ({ port, pid: 99, command: 'node', protocol: 'tcp', address: '127.0.0.1' }) as never), processTable: async () => new Map() }
  const logger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined }
  const planner = new PortChangePlanner(projectRepo, repoRepo, envFiles, inspector, scanner, async () => new Map(), logger)
  return { planner, written }
}

describe('troca de porta pelo .env', () => {
  const fazenda = project('fazenda', ['api', 'web'], [step('api', 'api:dev'), step('web', 'web:dev')])
  // Outra tropa com um passo DESLIGADO na 3334: não pode ser sugerida.
  const outra = project('outra', ['loja'], [step('loja', 'loja:dev', { enabled: false, env: { PORT: '3334' } })])
  const files = { '/w/api/.env': 'PORT=3333\nDB_PORT=5432\n', '/w/web/.env': 'VITE_API_URL=http://localhost:3333/api\n' }

  it('sugere porta livre na máquina e em todas as tropas e mostra o que muda', async () => {
    const { planner } = setup(files, [fazenda, outra], [3333, 3335])
    const { plan } = await planner.plan('fazenda', 'api:dev', 3333)
    expect(plan.newPort).toBe(3336)
    expect(plan.canApply).toBe(true)
    expect(plan.edits.map((e) => [e.repoName, e.key, e.after])).toEqual([
      ['api', 'PORT', 'PORT=3336'],
      ['web', 'VITE_API_URL', 'VITE_API_URL=http://localhost:3336/api']
    ])
  })

  it('aplica nos dois .env e recusa porta já usada por outra tropa', async () => {
    const { planner, written } = setup(files, [fazenda, outra], [3333])
    await expect(planner.apply('fazenda', 'api:dev', 3333, 3334)).rejects.toThrow('já está em uso')
    await planner.apply('fazenda', 'api:dev', 3333, 4000)
    expect(written['/w/api/.env']).toBe('PORT=4000\nDB_PORT=5432\n')
    expect(written['/w/web/.env']).toBe('VITE_API_URL=http://localhost:4000/api\n')
  })

  it('avisa quando a porta não está no .env ou está no env do passo', async () => {
    const semEnv = setup({}, [fazenda], [3333])
    const a = (await semEnv.planner.plan('fazenda', 'api:dev', 3333)).plan
    expect(a.canApply).toBe(false)
    expect(a.warnings[0]).toContain('O correto é a porta vir do .env')

    const noPlano = project('fazenda', ['api'], [step('api', 'api:dev', { env: { PORT: '3333' } })])
    const b = (await setup(files, [noPlano], [3333]).planner.plan('fazenda', 'api:dev', 3333)).plan
    expect(b.canApply).toBe(false)
    expect(b.warnings.join(' ')).toContain('mover para o .env')
  })

  it('compose com ${VAR:-porta} vira variável no .env, e porta fixa só avisa', async () => {
    const db = project('fazenda', ['api'], [step('api', 'api:compose', { command: 'docker compose up -d db', waitFor: 'exit', kind: 'setup' })])
    const comVar = setup({}, [db], [5432], { '/w/api/docker-compose.yml': 'services:\n  db:\n    ports:\n      - "${DB_PORT:-5432}:5432"\n' })
    const plan = (await comVar.planner.plan('fazenda', 'api:compose', 5432)).plan
    expect(plan.canApply).toBe(true)
    expect(plan.edits).toEqual([expect.objectContaining({ key: 'DB_PORT', kind: 'add', after: 'DB_PORT=5433' })])
    await comVar.planner.apply('fazenda', 'api:compose', 5432, 5433)
    expect(comVar.written['/w/api/.env']).toBe('DB_PORT=5433\n')

    const fixa = setup({}, [db], [5432], { '/w/api/docker-compose.yml': 'services:\n  db:\n    ports:\n      - "5432:5432"\n' })
    const p2 = (await fixa.planner.plan('fazenda', 'api:compose', 5432)).plan
    expect(p2.canApply).toBe(false)
    expect(p2.warnings[0]).toContain('fixa no docker-compose')
  })

  it('mascara credencial nas linhas mostradas', async () => {
    const { planner } = setup({ '/w/api/.env': 'PORT=5432\nDATABASE_URL=postgres://user:senha@localhost:5432/app\n' }, [fazenda], [5432])
    const { plan } = await planner.plan('fazenda', 'api:dev', 5432)
    const url = plan.edits.find((e) => e.key === 'DATABASE_URL')!
    expect(url.before).toBe('DATABASE_URL=postgres://***@localhost:5432/app')
    expect(url.after).not.toContain('senha')
  })
})
