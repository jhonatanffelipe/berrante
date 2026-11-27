import { describe, expect, it } from 'vitest'
import { buildProcessTable, parseNetstatListen, parseWindowsProcesses, shortName } from '@main/infra/ports/netstatParser'

// Saída real do `netstat -ano` num Windows em português (o estado vem traduzido).
const NETSTAT = [
  '',
  'Conexões ativas',
  '',
  '  Proto  Endereço local         Endereço externo       Estado         PID',
  '  TCP    0.0.0.0:135            0.0.0.0:0              ESCUTANDO       1172',
  '  TCP    0.0.0.0:5173           0.0.0.0:0              ESCUTANDO       9120',
  '  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       4410',
  '  TCP    127.0.0.1:3000         127.0.0.1:52311        ESTABELECIDA    4410',
  '  TCP    192.168.0.10:52000     140.82.112.4:443       ESTABELECIDA    7000',
  '  TCP    [::]:135               [::]:0                 ESCUTANDO       1172',
  '  TCP    [::1]:5173             [::]:0                 ESCUTANDO       9120',
  '  TCP    [fe80::1%12]:7680      [::]:0                 ESCUTANDO       5000',
  '  UDP    0.0.0.0:5353           *:*                                    2200',
  ''
].join('\r\n')

describe('parseNetstatListen', () => {
  const rows = parseNetstatListen(NETSTAT)

  it('pega só TCP em LISTEN, qualquer que seja o idioma, ordenado por porta', () => {
    expect(rows.map((r) => r.port)).toEqual([135, 3000, 5173, 7680])
    expect(rows.find((r) => r.port === 3000)).toEqual({ port: 3000, address: '127.0.0.1', pid: 4410 })
  })

  it('une IPv4 e IPv6 do mesmo pid/porta e usa "*" para o curinga, como o lsof', () => {
    expect(rows.filter((r) => r.port === 135)).toEqual([{ port: 135, address: '*', pid: 1172 }])
    expect(rows.find((r) => r.port === 5173)?.address).toBe('*, [::1]')
    expect(rows.find((r) => r.port === 7680)?.address).toBe('[fe80::1%12]')
  })
})

describe('processos do Windows', () => {
  const output = [
    '4\t0\t0\tSystem\t',
    '100\t4\t1000\texplorer.exe\tC:\\Windows\\explorer.exe',
    '200\t100\t2000\telectron.exe\t"C:\\Berrante\\Berrante.exe"',
    '300\t200\t3000\tbash.exe\t"C:\\Program Files\\Git\\bin\\bash.exe" -c "yarn dev"',
    '310\t300\t3100\tbash.exe\t/usr/bin/bash -c "yarn dev"',
    '320\t310\t3200\tnode.exe\tnode server.js',
    // PPID 999 morreu e o PID foi reaproveitado por um processo mais novo: não é o pai.
    '999\t100\t9000\tbash.exe\tbash -c outro',
    '400\t999\t4000\tnode.exe\tnode orfao.js',
    'lixo sem tabs'
  ].join('\r\n')
  const procs = parseWindowsProcesses(output)

  it('lê pid, ppid, criação, nome e linha de comando', () => {
    expect(procs).toHaveLength(8)
    expect(procs.find((p) => p.pid === 320)).toEqual({ pid: 320, ppid: 310, created: 3200, name: 'node.exe', command: 'node server.js' })
  })

  it('o grupo é o shell do serviço mais próximo acima do processo', () => {
    const table = buildProcessTable(procs, new Set([300, 999]))
    expect(table.get(320)?.pgid).toBe(300)
    expect(table.get(300)?.pgid).toBe(300)
    expect(table.get(200)?.pgid).toBe(200)
  })

  it('não sobe para um "pai" criado depois do filho (PID reaproveitado)', () => {
    expect(buildProcessTable(procs, new Set([999])).get(400)?.pgid).toBe(400)
  })

  it('tira o .exe do nome', () => {
    expect(shortName('node.exe')).toBe('node')
    expect(shortName('Code.EXE')).toBe('Code')
  })
})
