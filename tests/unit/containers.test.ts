import { describe, expect, it } from 'vitest'
import type { Project, ServiceDefinition } from '@shared/types'
import { parseComposeUp } from '@shared/workflow'
import { ownersOf, stacksOf } from '@main/domain/entities/ComposeStack'
import { parseDockerPs, parseLabels, parsePsPorts } from '@main/infra/docker/DockerCliAdapter'

const step = (over: Partial<ServiceDefinition>): ServiceDefinition => ({
  id: 's1',
  repoId: 'api',
  name: 'containers',
  kind: 'setup',
  command: 'docker compose up -d',
  composeFile: null,
  cwd: '/repos/api',
  env: {},
  enabled: true,
  order: 10,
  waitFor: 'exit',
  dependsOn: [],
  color: 'cyan',
  origin: 'detected',
  ...over
})

const project = (services: ServiceDefinition[], repositoryIds = ['api']): Project => ({
  id: 'p1',
  name: 'Fazenda',
  color: 'green',
  icon: 'tee',
  repositoryIds,
  plan: { services, actions: [], detectedAt: '', updatedAt: '' },
  createdAt: '',
  updatedAt: ''
})

describe('parseComposeUp', () => {
  it('separa argumentos globais e serviços', () => {
    expect(parseComposeUp('docker compose -f docker-compose.dev.yml -p fazenda up -d postgres redis')).toEqual({
      globalArgs: ['-f', 'docker-compose.dev.yml', '-p', 'fazenda'],
      services: ['postgres', 'redis']
    })
  })

  it('aceita docker-compose v1 e ignora valores de flags do up', () => {
    expect(parseComposeUp('docker-compose up -d --wait-timeout 30 db')).toEqual({ globalArgs: [], services: ['db'] })
  })

  it('recusa comandos com shell e o que não é up', () => {
    expect(parseComposeUp('docker compose up -d && yarn dev')).toBeNull()
    expect(parseComposeUp('docker compose -f "$FILE" up -d')).toBeNull()
    expect(parseComposeUp('docker compose stop')).toBeNull()
    expect(parseComposeUp('yarn dev')).toBeNull()
  })
})

describe('stacksOf', () => {
  it('um passo compose up vira uma stack; passos desabilitados e scripts ficam de fora', () => {
    const p = project([
      step({ id: 'a', command: 'docker compose -f infra.yml up -d db' }),
      step({ id: 'b', kind: 'script', command: 'yarn dev', waitFor: 'port' }),
      step({ id: 'c', enabled: false, command: 'docker compose up -d' })
    ])
    expect(stacksOf(p)).toEqual([{ id: 'a', name: 'containers', cwd: '/repos/api', globalArgs: ['-f', 'infra.yml'], services: ['db'] }])
  })

  it('agrupa passos compose legados por pasta + arquivo', () => {
    const p = project([
      step({ id: 'db', kind: 'compose', command: 'db', composeFile: 'docker-compose.yml', order: 1 }),
      step({ id: 'redis', kind: 'compose', command: 'redis', composeFile: 'docker-compose.yml', order: 2 })
    ])
    expect(stacksOf(p)).toEqual([{ id: 'db', name: 'docker-compose.yml', cwd: '/repos/api', globalArgs: ['-f', 'docker-compose.yml'], services: ['db', 'redis'] }])
  })
})

describe('ownersOf', () => {
  const repos = new Map([['api', '/repos/api']])
  it('é dono quando o working_dir do compose fica no repo da tropa', () => {
    expect(ownersOf('/repos/api/infra', [project([])], repos)).toEqual([{ projectId: 'p1', projectName: 'Fazenda' }])
    expect(ownersOf('/repos/api', [project([])], repos)).toHaveLength(1)
  })
  it('não confunde prefixo de nome de pasta', () => {
    expect(ownersOf('/repos/api-old', [project([])], repos)).toEqual([])
    expect(ownersOf(null, [project([])], repos)).toEqual([])
  })
  it('no Windows compara sem diferenciar maiúsculas e aceita / ou \\', () => {
    const win = new Map([['api', 'C:\\Users\\dev\\www\\api']])
    expect(ownersOf('c:\\users\\dev\\www\\api\\infra', [project([])], win)).toHaveLength(1)
    expect(ownersOf('C:/Users/dev/www/api', [project([])], win)).toHaveLength(1)
    expect(ownersOf('C:\\Users\\dev\\www\\api-old', [project([])], win)).toEqual([])
  })
})

describe('docker ps', () => {
  it('lê labels com vírgula no valor', () => {
    expect(parseLabels('com.docker.compose.project=fazenda,com.docker.compose.project.config_files=/a/x.yml,/a/y.yml,com.docker.compose.service=db')).toEqual({
      'com.docker.compose.project': 'fazenda',
      'com.docker.compose.project.config_files': '/a/x.yml,/a/y.yml',
      'com.docker.compose.service': 'db'
    })
  })

  it('só portas publicadas, sem repetir IPv4/IPv6', () => {
    expect(parsePsPorts('0.0.0.0:5433->5432/tcp, [::]:5433->5432/tcp, 6379/tcp, 0.0.0.0:53->53/udp')).toEqual(['5433:5432', '53:53/udp'])
  })

  it('lê o NDJSON do docker ps', () => {
    const out = [
      JSON.stringify({ ID: 'abc123def456', Names: 'fazenda-db-1', Image: 'postgres:16', State: 'running', Status: 'Up 2 minutes (healthy)', Ports: '0.0.0.0:5433->5432/tcp', Labels: 'com.docker.compose.project=fazenda,com.docker.compose.service=db,com.docker.compose.project.working_dir=/repos/api' }),
      JSON.stringify({ ID: 'fff000fff000', Names: 'solto', Image: 'redis', Status: 'Exited (0) 3 hours ago', Ports: '', Labels: '' }),
      'lixo'
    ].join('\n')
    expect(parseDockerPs(out)).toEqual([
      { id: 'abc123def456', name: 'fazenda-db-1', image: 'postgres:16', state: 'running', status: 'Up 2 minutes (healthy)', ports: ['5433:5432'], composeProject: 'fazenda', composeService: 'db', workingDir: '/repos/api' },
      { id: 'fff000fff000', name: 'solto', image: 'redis', state: 'exited', status: 'Exited (0) 3 hours ago', ports: [], composeProject: null, composeService: null, workingDir: null }
    ])
  })
})
