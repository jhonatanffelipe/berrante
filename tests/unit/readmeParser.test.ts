import { describe, expect, it } from 'vitest'
import {
  cleanCommandLine,
  composeServicesFromReadme,
  isSetupSection,
  networksFromReadme,
  parseReadme
} from '@main/application/startup/detectors/readmeParser'
import { fixtureText } from '../helpers'

describe('parseReadme', () => {
  it('extrai os comandos do "Subir em desenvolvimento" do fazenda-api', () => {
    const result = parseReadme(fixtureText('repos/fazenda-api/README.md'))
    expect(result).toEqual([
      {
        section: 'Subir em desenvolvimento',
        commands: [
          'docker network create fazenda-network',
          'docker compose up -d db mailpit',
          'cp .env.example .env',
          'yarn install',
          'yarn migration:run && yarn seed:run && yarn seed:dev:run',
          'yarn dev'
        ]
      }
    ])
  })

  it('remove comentários de fim de linha (fazenda-web e fazenda-logs)', () => {
    expect(parseReadme(fixtureText('repos/fazenda-web/README.md'))[0]?.commands).toEqual(['cp .env.example .env', 'yarn install', 'yarn dev'])
    expect(parseReadme(fixtureText('repos/fazenda-logs/README.md'))[0]?.commands).toEqual([
      'cp .env.example .env',
      'docker network create fazenda-network',
      'docker compose up -d'
    ])
  })

  it('ignora blocos fora de seções de setup e linguagens que não são shell', () => {
    const md = [
      '# Projeto',
      '```bash',
      'rm -rf /',
      '```',
      '## Getting Started',
      '```ts',
      'const x = 1',
      '```',
      '### Backend',
      '```sh',
      '$ npm ci',
      'npm run start:dev \\',
      '  --port 3000',
      '```',
      '## License',
      '```bash',
      'echo nope',
      '```'
    ].join('\n')
    expect(parseReadme(md)).toEqual([{ section: 'Backend', commands: ['npm ci', 'npm run start:dev --port 3000'] }])
  })

  it('aceita fences com ~~~ e CRLF', () => {
    const md = '## Como rodar\r\n~~~shell\r\nyarn dev\r\n~~~\r\n'
    expect(parseReadme(md)).toEqual([{ section: 'Como rodar', commands: ['yarn dev'] }])
  })

  it('reconhece seções em pt-br sem acento ou com acento', () => {
    expect(isSetupSection('Instalação')).toBe(true)
    expect(isSetupSection('## `Executar` localmente')).toBe(true)
    expect(isSetupSection('Escopos da API')).toBe(false)
  })

  it('mantém # dentro de aspas', () => {
    expect(cleanCommandLine('echo "a # b" # comentário')).toBe('echo "a # b"')
  })
})

describe('composeServicesFromReadme / networksFromReadme', () => {
  it('lê serviços de docker compose up e redes criadas', () => {
    const s = parseReadme(fixtureText('repos/fazenda-api/README.md'))
    expect(composeServicesFromReadme(s)).toEqual(['db', 'mailpit'])
    expect(networksFromReadme(s)).toEqual(['fazenda-network'])
  })

  it('compose up sem serviços significa "todos"; sem compose up é null', () => {
    expect(composeServicesFromReadme(parseReadme(fixtureText('repos/fazenda-logs/README.md')))).toEqual([])
    expect(composeServicesFromReadme(parseReadme(fixtureText('repos/fazenda-web/README.md')))).toBeNull()
  })

  it('pula valores de flags', () => {
    const s = [{ section: 'x', commands: ['docker-compose up -d --scale worker=2 --timeout 30 api'] }]
    expect(composeServicesFromReadme(s)).toEqual(['api'])
  })
})
