import { describe, expect, it } from 'vitest'
import { parseLsofCwd, parseLsofListen, parsePs, splitAddress } from '@main/infra/ports/lsofParser'
import { fixtureText } from '../helpers'

describe('parseLsofListen', () => {
  const rows = parseLsofListen(fixtureText('lsof-listen.txt'))

  it('ignora o cabeçalho e devolve as portas ordenadas', () => {
    expect(rows.map((r) => r.port)).toEqual([3010, 5432, 5433, 7000, 8090, 49152, 61234])
  })

  it('une IPv4 e IPv6 do mesmo pid/porta', () => {
    const web = rows.find((r) => r.port === 8090)!
    expect(web).toMatchObject({ pid: 12345, command: 'node', user: 'jhonatan', protocol: 'TCP' })
    expect(web.address).toBe('[::1], 127.0.0.1')
    expect(rows.filter((r) => r.port === 7000)).toHaveLength(1)
  })

  it('aceita usuário com underscore e desescapa \\x20 no COMMAND', () => {
    expect(rows.find((r) => r.port === 5432)?.user).toBe('_postgres')
    expect(rows.find((r) => r.port === 61234)?.command).toBe('Code H')
  })

  it('ignora linhas que não são LISTEN TCP', () => {
    const out = parseLsofListen(
      ['COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME', 'node 1 me 1u IPv4 0x1 0t0 TCP 127.0.0.1:3000->127.0.0.1:5000 (ESTABLISHED)', 'garbage'].join('\n')
    )
    expect(out).toEqual([])
  })

  it('splitAddress trata IPv6 entre colchetes e portas inválidas', () => {
    expect(splitAddress('[fe80:1::1]:5173')).toEqual({ address: '[fe80:1::1]', port: 5173 })
    expect(splitAddress('*:http')).toBeNull()
    expect(splitAddress('*:70000')).toBeNull()
  })
})

describe('parsePs / parseLsofCwd', () => {
  it('lê pid, ppid, pgid, usuário e comando completo', () => {
    const table = parsePs('  123     1   123 jhonatan /bin/zsh -c yarn dev\n  456   123   123 jhonatan node /x/vite.js --port 8090\n')
    expect(table.get(456)).toEqual({ pid: 456, ppid: 123, pgid: 123, user: 'jhonatan', command: 'node /x/vite.js --port 8090' })
  })

  it('associa cwd por pid no formato de campos', () => {
    const map = parseLsofCwd('p123\nfcwd\nn/Users/me/www/a\np456\nfcwd\nn/Users/me/www/b c\n')
    expect(map.get(123)).toBe('/Users/me/www/a')
    expect(map.get(456)).toBe('/Users/me/www/b c')
  })
})
