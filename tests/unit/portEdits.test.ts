import { describe, expect, it } from 'vitest'
import { applyEnvLines, composeHasLiteralPort, composePortVar, envPortLines, envPorts, envValue, suggestPort } from '@main/application/ports/portEdits'
import { ipcSchemas } from '@shared/ipc/schemas'

const env = [
  '# api',
  'PORT=3333',
  'DB_PORT=5432',
  'export WS_PORT="3333" # websocket',
  'API_URL=http://localhost:3333/api',
  'OTHER_URL=http://localhost:33330/x',
  'DATABASE_URL=postgres://user:senha@localhost:5432/app',
  'NAME=3333',
  ''
].join('\n')

describe('linhas do .env que apontam para a porta', () => {
  it('pega chaves com PORT de valor exato e endereços locais, nada além', () => {
    const lines = envPortLines(env, 3333, 3334)
    expect(lines.map((l) => [l.key, l.kind, l.after])).toEqual([
      ['PORT', 'port', 'PORT=3334'],
      ['WS_PORT', 'port', 'export WS_PORT="3334" # websocket'],
      ['API_URL', 'url', 'API_URL=http://localhost:3334/api']
    ])
  })

  it('troca só as linhas escolhidas e preserva o resto, inclusive \\r\\n', () => {
    const crlf = 'A=1\r\nPORT=3333\r\nB=2\r\n'
    expect(applyEnvLines(crlf, envPortLines(crlf, 3333, 4000))).toBe('A=1\r\nPORT=4000\r\nB=2\r\n')
    expect(applyEnvLines(env, envPortLines(env, 3333, 3334))).toContain('DB_PORT=5432')
  })

  it('cita a porta de banco também pela URL com credencial', () => {
    expect(envPortLines(env, 5432, 5433).map((l) => l.key)).toEqual(['DB_PORT', 'DATABASE_URL'])
  })

  it('lista as portas citadas e lê valores', () => {
    expect(envPorts(env).sort((a, b) => a - b)).toEqual([3333, 5432, 33330])
    expect(envValue(env, 'WS_PORT')).toBe('3333')
    expect(envValue(env, 'NADA')).toBeNull()
  })
})

describe('compose', () => {
  it('acha a variável do .env que publica a porta', () => {
    expect(composePortVar('ports:\n  - "${API_PORT:-3333}:3333"\n', 3333)).toBe('API_PORT')
    expect(composePortVar('ports:\n  - "${API_PORT-3333}:3333"\n', 3333)).toBe('API_PORT')
    expect(composePortVar('ports:\n  - "3333:3333"\n', 3333)).toBeNull()
  })

  it('reconhece porta fixa no YAML', () => {
    expect(composeHasLiteralPort('ports:\n  - "3333:3333"\n', 3333)).toBe(true)
    expect(composeHasLiteralPort("ports: ['127.0.0.1:5433:5432']", 5433)).toBe(true)
    expect(composeHasLiteralPort('ports:\n  - "13333:3333"\n', 3333)).toBe(false)
  })
})

describe('sugestão de porta', () => {
  it('pula as ocupadas e as citadas em tropas', () => {
    expect(suggestPort(3333, new Set([3334, 3335]))).toBe(3336)
    expect(suggestPort(80, new Set())).toBe(1024)
  })

  it('schema exige porta válida', () => {
    const schema = ipcSchemas['runtime:applyPortChange']
    expect(schema.safeParse({ projectId: 'p', serviceId: 's', port: 3333, newPort: 3334 }).success).toBe(true)
    expect(schema.safeParse({ projectId: 'p', serviceId: 's', port: 3333, newPort: 0 }).success).toBe(false)
  })
})
