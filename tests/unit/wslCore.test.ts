import { describe, expect, it } from 'vitest'
import {
  buildWslArgs,
  buildWslEnv,
  decodeWslOutput,
  ENV_DELIMITER,
  hostToWslPath,
  parseLoginEnv,
  parseWslListVerbose,
  wslToHostPath
} from '@main/infra/platform/wsl/wslCore'

describe('buildWslArgs', () => {
  it('monta distro, pasta e argv sem passar por shell do Windows', () => {
    expect(buildWslArgs('Ubuntu', '/home/ana/app', ['git', 'pull', '--ff-only'])).toEqual([
      '-d',
      'Ubuntu',
      '--cd',
      '/home/ana/app',
      '--exec',
      'git',
      'pull',
      '--ff-only'
    ])
  })

  it('sem distro usa a padrão e sem pasta não manda --cd', () => {
    expect(buildWslArgs(null, undefined, ['ps'])).toEqual(['--exec', 'ps'])
  })
})

describe('buildWslEnv', () => {
  it('lista as variáveis extras no WSLENV e liga o WSL_UTF8', () => {
    const env = buildWslEnv({ Path: 'C:\\Windows', USERPROFILE: 'C:\\Users\\ana' }, { BERRANTE_GIT_TOKEN: 'tok', FORCE_COLOR: '1' })
    expect(env.BERRANTE_GIT_TOKEN).toBe('tok')
    expect(env.WSLENV).toBe('BERRANTE_GIT_TOKEN:FORCE_COLOR')
    expect(env.WSL_UTF8).toBe('1')
    expect(env.Path).toBe('C:\\Windows')
  })

  it('preserva o WSLENV existente (com flags) e não duplica', () => {
    const env = buildWslEnv({ WslEnv: 'USERPROFILE/p:FORCE_COLOR' }, { FORCE_COLOR: '1', NODE_ENV: 'development' })
    expect(env.WSLENV).toBe('USERPROFILE/p:FORCE_COLOR:NODE_ENV')
    expect(env.WslEnv).toBeUndefined()
  })

  it('descarta nomes que quebrariam o WSLENV', () => {
    const env = buildWslEnv({}, { 'A:B': 'x', 'C/D': 'y', OK_1: 'z' })
    expect(env.WSLENV).toBe('OK_1')
    expect(env['A:B']).toBeUndefined()
  })
})

describe('parseWslListVerbose', () => {
  it('lê a distro padrão, versões e ignora as internas do Docker', () => {
    const out = '  NAME                   STATE           VERSION\r\n* Ubuntu-24.04           Running         2\r\n  docker-desktop         Stopped         2\r\n  Debian                 Stopped         1\r\n'
    expect(parseWslListVerbose(out)).toEqual([
      { name: 'Ubuntu-24.04', isDefault: true, version: 2 },
      { name: 'Debian', isDefault: false, version: 1 }
    ])
  })

  it('aceita cabeçalho e estado traduzidos (com espaço) e lista vazia', () => {
    expect(parseWslListVerbose('  NOME      ESTADO          VERSÃO\n* Ubuntu    Em execução     2\n  Debian    Parado          2\n')).toEqual([
      { name: 'Ubuntu', isDefault: true, version: 2 },
      { name: 'Debian', isDefault: false, version: 2 }
    ])
    expect(parseWslListVerbose('')).toEqual([])
  })
})

describe('decodeWslOutput', () => {
  it('decodifica UTF-16LE com BOM (saída padrão do wsl.exe -l)', () => {
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('* Ubuntu  Running  2\r\n', 'utf16le')])
    expect(decodeWslOutput(buf)).toBe('* Ubuntu  Running  2\r\n')
  })

  it('mantém UTF-8 quando o WSL_UTF8 funcionou', () => {
    expect(decodeWslOutput(Buffer.from('olá', 'utf8'))).toBe('olá')
  })
})

describe('caminhos', () => {
  it('Linux → UNC da distro e /mnt/<unidade> → unidade do Windows', () => {
    expect(wslToHostPath('/home/ana/www/api', 'Ubuntu')).toBe('\\\\wsl.localhost\\Ubuntu\\home\\ana\\www\\api')
    expect(wslToHostPath('/home/ana/', 'Ubuntu')).toBe('\\\\wsl.localhost\\Ubuntu\\home\\ana')
    expect(wslToHostPath('/', 'Ubuntu')).toBe('\\\\wsl.localhost\\Ubuntu\\')
    expect(wslToHostPath('/mnt/c/Users/ana', 'Ubuntu')).toBe('C:\\Users\\ana')
  })

  it('UNC (wsl.localhost ou wsl$) da distro em uso → Linux', () => {
    expect(hostToWslPath('\\\\wsl.localhost\\Ubuntu\\home\\ana\\www', 'Ubuntu')).toBe('/home/ana/www')
    expect(hostToWslPath('\\\\wsl$\\ubuntu\\home\\ana\\', 'Ubuntu')).toBe('/home/ana')
    expect(hostToWslPath('\\\\wsl.localhost\\Ubuntu', 'Ubuntu')).toBe('/')
  })

  it('outra distro ou caminho de rede não viram caminho Linux', () => {
    expect(hostToWslPath('\\\\wsl.localhost\\Debian\\home', 'Ubuntu')).toBeNull()
    expect(hostToWslPath('\\\\servidor\\share', 'Ubuntu')).toBeNull()
  })

  it('disco do Windows vira /mnt/<unidade>', () => {
    expect(hostToWslPath('D:\\projetos\\api', 'Ubuntu')).toBe('/mnt/d/projetos/api')
    expect(hostToWslPath('C:\\', 'Ubuntu')).toBe('/mnt/c')
  })

  it('ida e volta preserva o caminho', () => {
    for (const p of ['/home/ana/www/api', '/mnt/c/Users/ana']) expect(hostToWslPath(wslToHostPath(p, 'Ubuntu'), 'Ubuntu')).toBe(p)
  })
})

describe('parseLoginEnv', () => {
  it('ignora o que o shell imprime antes (motd) e lê só entre os delimitadores', () => {
    const out = `Bem-vindo ao Ubuntu\n${ENV_DELIMITER}PATH=/home/ana/.nvm/versions/node/v24/bin:/usr/bin\nHOME=/home/ana\nSHELL=/usr/bin/zsh\r\n${ENV_DELIMITER}`
    expect(parseLoginEnv(out)).toEqual({ PATH: '/home/ana/.nvm/versions/node/v24/bin:/usr/bin', HOME: '/home/ana', SHELL: '/usr/bin/zsh' })
  })
})
