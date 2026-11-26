import { describe, expect, it } from 'vitest'
import { parseBranchRefs, parseGitStatus } from '@main/infra/github/gitStatusParser'
import { checkEnv, missingEnvLines } from '@main/application/startup/detectors/envCheck'
import { applyProfile, isLocalHealthUrl } from '@shared/workflow'
import { ipcSchemas } from '@shared/ipc/schemas'

describe('status do git', () => {
  it('lê branch, upstream, à frente/atrás e alterações', () => {
    const out = [
      '# branch.oid 1234abcd',
      '# branch.head feature/curral',
      '# branch.upstream origin/feature/curral',
      '# branch.ab +2 -5',
      '1 .M N... 100644 100644 100644 aaa bbb src/a.ts',
      '? novo.txt'
    ].join('\n')
    expect(parseGitStatus(out)).toEqual({ branch: 'feature/curral', upstream: 'origin/feature/curral', ahead: 2, behind: 5, changes: 2 })
  })

  it('HEAD destacado e sem upstream', () => {
    expect(parseGitStatus('# branch.oid abc\n# branch.head (detached)')).toEqual({ branch: null, upstream: null, ahead: 0, behind: 0, changes: 0 })
  })

  it('junta branches locais e de origin sem repetir', () => {
    expect(parseBranchRefs('main\nfeature/x\norigin\norigin/HEAD\norigin/main\norigin/release/1.0\n')).toEqual(['feature/x', 'main', 'release/1.0'])
  })
})

describe('.env', () => {
  const example = '# banco\nDB_HOST=localhost\nexport DB_PORT=5432\nAPI_KEY=\n'

  it('pega do exemplo só as linhas que faltam', () => {
    const { missingKeys } = checkEnv('.env.example', example, 'DB_HOST=db\n')
    expect(missingKeys).toEqual(['DB_PORT', 'API_KEY'])
    expect(missingEnvLines(example, missingKeys)).toEqual(['export DB_PORT=5432', 'API_KEY='])
  })
})

describe('perfis', () => {
  const plan = {
    services: [
      { id: 'db', enabled: true },
      { id: 'api', enabled: true },
      { id: 'web', enabled: false }
    ],
    profiles: [{ id: 'p1', name: 'só a API', serviceIds: ['api', 'web'] }]
  }

  it('liga só os passos do perfil que já estavam ligados', () => {
    expect(applyProfile(plan, 'p1').services.map((s) => [s.id, s.enabled])).toEqual([['db', false], ['api', true], ['web', false]])
  })

  it('sem perfil (ou perfil apagado) toca o plano inteiro', () => {
    expect(applyProfile(plan, null)).toBe(plan)
    expect(applyProfile(plan, 'sumiu')).toBe(plan)
  })
})

describe('validações', () => {
  it('healthcheck só em localhost', () => {
    expect(isLocalHealthUrl('http://localhost:3000/health')).toBe(true)
    expect(isLocalHealthUrl('http://127.0.0.1:8080/')).toBe(true)
    expect(isLocalHealthUrl('https://api.exemplo.com/health')).toBe(false)
    expect(isLocalHealthUrl('http://user:pw@localhost/')).toBe(false)
    expect(isLocalHealthUrl('file:///etc/passwd')).toBe(false)
  })

  it('nome de branch não vira opção do git', () => {
    const schema = ipcSchemas['projects:checkout']
    expect(schema.safeParse({ projectId: 'p', branch: 'feature/curral-1.2' }).success).toBe(true)
    expect(schema.safeParse({ projectId: 'p', branch: '--orphan' }).success).toBe(false)
    expect(schema.safeParse({ projectId: 'p', branch: 'a..b' }).success).toBe(false)
    expect(schema.safeParse({ projectId: 'p', branch: 'x y' }).success).toBe(false)
  })

  it('porta para abrir no navegador', () => {
    expect(ipcSchemas['ports:open'].safeParse({ port: 3000 }).success).toBe(true)
    expect(ipcSchemas['ports:open'].safeParse({ port: 70000 }).success).toBe(false)
  })
})
