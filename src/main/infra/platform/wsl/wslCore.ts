/**
 * Peças puras da integração com a WSL (sem spawn): argv do `wsl.exe`, ambiente via WSLENV,
 * tradução de caminhos e leitura da lista de distros. Testadas em `tests/unit/wslCore.test.ts`.
 */

/** Distros internas do Docker Desktop: não servem como workspace. */
const INTERNAL_DISTROS = new Set(['docker-desktop', 'docker-desktop-data'])

/** Nome de variável que dá para atravessar o WSLENV (lista separada por ":"). */
const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Script fixo (nunca recebe texto do usuário embutido) que aplica o PATH do shell de login da distro
 * e executa o binário pedido com os argumentos originais: `sh -c RUN_SCRIPT berrante <arquivo> <args…>`.
 */
export const RUN_SCRIPT = 'if [ -n "$BERRANTE_PATH" ]; then export PATH="$BERRANTE_PATH"; fi; exec "$@"'

/**
 * Script fixo dos serviços: roda sob `setsid` (grupo de processos próprio), grava o PGID no arquivo `$1`
 * e executa o comando `$2` no shell de login do usuário. `sh -c SERVICE_SCRIPT berrante <pidFile> <comando>`.
 */
export const SERVICE_SCRIPT =
  'echo $$ > "$1"; if [ -n "$BERRANTE_PATH" ]; then export PATH="$BERRANTE_PATH"; fi; exec "${BERRANTE_SHELL:-/bin/sh}" -c "$2"'

/** Script fixo que descobre o shell de login e imprime o ambiente dele entre delimitadores. */
export const ENV_DELIMITER = '__BERRANTE_ENV__'
export const LOGIN_ENV_SCRIPT = [
  'SH=$(getent passwd "$(id -un)" 2>/dev/null | cut -d: -f7)',
  '[ -x "$SH" ] || SH=/bin/sh',
  `exec "$SH" -ilc 'printf "${ENV_DELIMITER}"; env; printf "${ENV_DELIMITER}"'`
].join('; ')

export interface WslDistro {
  name: string
  isDefault: boolean
  version: number | null
}

/** Argumentos do `wsl.exe` para executar `exec` (argv, sem shell do Windows) numa distro e pasta. */
export function buildWslArgs(distro: string | null, cwd: string | undefined, exec: string[]): string[] {
  const args: string[] = []
  if (distro) args.push('-d', distro)
  if (cwd) args.push('--cd', cwd)
  args.push('--exec', ...exec)
  return args
}

/**
 * Ambiente do processo `wsl.exe`: as variáveis extras atravessam para o Linux listadas no WSLENV
 * (sem flags, ou seja, valor como está). Assim segredos como o token do git não vão para o argv.
 * `WSL_UTF8=1` faz as mensagens do próprio wsl.exe saírem em UTF-8.
 */
export function buildWslEnv(base: NodeJS.ProcessEnv, extra: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(base)) if (typeof v === 'string') env[k] = v
  const keys = Object.keys(extra).filter((k) => ENV_KEY.test(k) && k.toUpperCase() !== 'WSLENV')
  for (const k of keys) env[k] = extra[k]!
  const existingKey = Object.keys(env).find((k) => k.toUpperCase() === 'WSLENV')
  const existing = existingKey ? env[existingKey]!.split(':').filter(Boolean) : []
  if (existingKey) delete env[existingKey]
  const seen = new Set(existing.map((e) => e.split('/')[0]!.toUpperCase()))
  env.WSLENV = [...existing, ...keys.filter((k) => !seen.has(k.toUpperCase()))].join(':')
  env.WSL_UTF8 = '1'
  return env
}

/** Saída do `wsl.exe` pode vir em UTF-16LE (versões antigas ou sem WSL_UTF8). */
export function decodeWslOutput(buf: Buffer): string {
  const looksUtf16 = buf.length >= 2 && (buf[0] === 0xff && buf[1] === 0xfe ? true : buf.subarray(0, 64).filter((b) => b === 0).length > 8)
  const text = looksUtf16 ? buf.toString('utf16le') : buf.toString('utf8')
  return text.replace(/^\uFEFF/, '').replace(/\0/g, '')
}

/**
 * `wsl.exe -l -v`:
 *   NAME            STATE           VERSION
 * * Ubuntu          Running         2
 *   docker-desktop  Stopped         2
 * O cabeçalho pode vir traduzido, então é ignorado pela posição.
 */
export function parseWslListVerbose(output: string): WslDistro[] {
  const lines = output.split(/\r?\n/).filter((l) => l.trim())
  const distros: WslDistro[] = []
  for (const line of lines.slice(1)) {
    const isDefault = line.trimStart().startsWith('*')
    // Nome de distro não tem espaço; o estado pode ter quando traduzido ("Em execução"), então o nome é a
    // primeira palavra e a versão, a última.
    const parts = line.replace(/^\s*\*?\s*/, '').trim().split(/\s+/)
    if (parts.length < 2) continue
    const name = parts[0]!
    const last = parts[parts.length - 1]!
    const version = /^\d+$/.test(last) ? Number(last) : null
    if (INTERNAL_DISTROS.has(name.toLowerCase())) continue
    distros.push({ name, isDefault, version })
  }
  return distros
}

const UNC = /^\\\\(?:wsl\.localhost|wsl\$)\\([^\\]+)(\\.*)?$/i
const DRIVE = /^([a-zA-Z]):(?:\\(.*))?$/
const MNT = /^\/mnt\/([a-z])(?:\/(.*))?$/

/** Caminho Linux da distro → caminho que o Windows abre (UNC, ou unidade para `/mnt/c/…`). */
export function wslToHostPath(path: string, distro: string): string {
  const mnt = path.match(MNT)
  if (mnt) return `${mnt[1]!.toUpperCase()}:\\${(mnt[2] ?? '').replace(/\//g, '\\')}`
  const clean = path.replace(/\/+$/, '') || '/'
  return `\\\\wsl.localhost\\${distro}${clean === '/' ? '\\' : clean.replace(/\//g, '\\')}`
}

/**
 * Caminho do Windows → caminho Linux da distro. `\\wsl.localhost\<distro>\…` (ou `\\wsl$\…`) só vale para a
 * distro em uso; `C:\…` vira `/mnt/c/…`. Qualquer outra coisa (outra distro, rede) devolve null.
 */
export function hostToWslPath(hostPath: string, distro: string): string | null {
  const normalized = hostPath.replace(/\//g, '\\').replace(/\\+$/, '')
  const unc = normalized.match(UNC)
  if (unc) {
    if (unc[1]!.toLowerCase() !== distro.toLowerCase()) return null
    return (unc[2] ?? '').replace(/\\/g, '/') || '/'
  }
  const drive = normalized.match(DRIVE)
  if (drive) {
    const rest = (drive[2] ?? '').replace(/\\/g, '/')
    return `/mnt/${drive[1]!.toLowerCase()}${rest ? `/${rest}` : ''}`
  }
  return null
}

/** Extrai o ambiente impresso entre delimitadores pelo LOGIN_ENV_SCRIPT. */
export function parseLoginEnv(stdout: string): Record<string, string> {
  const body = stdout.split(ENV_DELIMITER)[1] ?? ''
  const env: Record<string, string> = {}
  for (const line of body.split('\n')) {
    const idx = line.indexOf('=')
    if (idx > 0) env[line.slice(0, idx)] = line.slice(idx + 1).replace(/\r$/, '')
  }
  return env
}
