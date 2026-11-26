// Gera os prints do README com a tropa fictícia "Fazenda", montada a partir de tests/fixtures/repos.
//
//   node scripts/demo-shots.mjs [pasta-de-saída]   (padrão: .demo/)
//
// Cria <saída>/repos (cópias executáveis das fixtures: scripts viram servidores Node mínimos e o compose usa
// imagens leves em portas livres), <saída>/data (dados do Berrante com a tropa e o workflow) e roda
// `yarn dev` com BERRANTE_USER_DATA + BERRANTE_SHOTS. Os prints saem em <saída>/shots.
// No fim, derrube os containers com: node scripts/demo-shots.mjs --down
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const down = args.includes('--down')
const out = resolve(args.find((a) => !a.startsWith('--')) ?? join(root, '.demo'))
const repos = join(out, 'repos')
const data = join(out, 'data')
const shots = join(out, 'shots')
const fixtures = join(root, 'tests/fixtures/repos')
const NETWORK = 'fazenda-demo-network'

const PORTS = { api: 13333, web: 15173, db: 15433, smtp: 11025, mail: 18025, loki: 13101, grafana: 13001 }
const ENV_VALUES = {
  PORT: PORTS.api,
  API_URL: `http://localhost:${PORTS.api}`,
  WEB_URL: `http://localhost:${PORTS.web}`,
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: PORTS.db,
  SMTP_HOST: 'localhost',
  SMTP_PORT: PORTS.smtp,
  WEB_PORT: PORTS.web,
  VITE_API_BASE_URL: `http://localhost:${PORTS.api}/api`
}

if (down) {
  // Só derruba o que existe: rodar de novo, sem nada de pé, não gera aviso nem erro.
  const running = spawnSync('docker', ['compose', 'ls', '--all', '--format', 'json'], { encoding: 'utf8' })
  const projects = new Set((JSON.parse(running.stdout || '[]') ?? []).map((p) => p.Name))
  for (const [repo, project] of [['fazenda-api', 'fazenda-demo'], ['fazenda-logs', 'fazenda-demo-logs']]) {
    if (projects.has(project) && existsSync(join(repos, repo))) spawnSync('docker', ['compose', 'down', '-v'], { cwd: join(repos, repo), stdio: 'inherit' })
  }
  if (spawnSync('docker', ['network', 'inspect', NETWORK], { stdio: 'ignore' }).status === 0) spawnSync('docker', ['network', 'rm', NETWORK], { stdio: 'inherit' })
  console.log('demo derrubada (containers, volumes e rede)')
  process.exit(0)
}

rmSync(out, { recursive: true, force: true })
const write = (file, text) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
}

// Servidor HTTP mínimo que imita o log de um dev server.
const server = (name, port, lines) => `const http = require('node:http')
const port = Number(process.env.PORT || ${port})
${lines.map((l) => `console.log(${JSON.stringify(l)})`).join('\n')}
http.createServer((_req, res) => res.end('${name} ok')).listen(port, '127.0.0.1', () => console.log('${name} ouvindo em http://localhost:' + port))
setInterval(() => console.log('[' + new Date().toISOString() + '] GET /health 200 2ms'), 4000)
`

const worker = `console.log('[worker] conectando na fila de pedidos…')
console.log('[worker] pronto: 3 filas (pedidos, notificacoes, relatorios)')
let n = 0
setInterval(() => console.log('[worker] job pedidos#' + ++n + ' concluído em ' + (20 + (n % 7) * 9) + 'ms'), 3000)
`

for (const name of ['fazenda-api', 'fazenda-web', 'fazenda-logs']) {
  const dir = join(repos, name)
  mkdirSync(join(dir, 'node_modules'), { recursive: true })
  for (const f of ['README.md', '.env.example']) if (existsSync(join(fixtures, name, f))) copyFileSync(join(fixtures, name, f), join(dir, f))
  // .env com todas as chaves do exemplo: o print não mostra o aviso de chave faltando.
  // Portas e endereços com valores reais: o "Mudar porta" mostra a troca no .env da API e no do front.
  const keys = readFileSync(join(dir, '.env.example'), 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => l.split('=')[0])
  write(join(dir, '.env'), keys.map((k) => `${k}=${ENV_VALUES[k] ?? 'demo'}`).join('\n') + '\n')
}

const pkg = (name, scripts) => JSON.stringify({ name, private: true, scripts }, null, 2) + '\n'
const apiPkg = JSON.parse(readFileSync(join(fixtures, 'fazenda-api/package.json'), 'utf8'))
const webPkg = JSON.parse(readFileSync(join(fixtures, 'fazenda-web/package.json'), 'utf8'))
const stub = (scripts, real) => Object.fromEntries(Object.keys(scripts).map((k) => [k, real[k] ?? `node -e "console.log('${k}: ok')"`]))

write(join(repos, 'fazenda-api/package.json'), pkg('fazenda-api', stub(apiPkg.scripts, { dev: 'node server.js', start: 'node server.js', 'worker:start': 'node worker.js' })))
write(join(repos, 'fazenda-api/yarn.lock'), '')
write(join(repos, 'fazenda-api/server.js'), server('fazenda-api', PORTS.api, ['[nest] carregando módulos…', '[typeorm] conectado ao Postgres em localhost:' + PORTS.db, '[mail] SMTP pronto em localhost:' + PORTS.smtp]))
write(join(repos, 'fazenda-api/worker.js'), worker)
write(
  join(repos, 'fazenda-api/docker-compose.yml'),
  `# Cópia de demonstração do compose da fixture (imagens leves, portas livres).
name: fazenda-demo
services:
  db:
    image: postgres:17-alpine
    environment: { POSTGRES_PASSWORD: demo, POSTGRES_DB: fazenda }
    ports: ['127.0.0.1:${PORTS.db}:5432']
    networks: [${NETWORK}]
  mailpit:
    image: axllent/mailpit:v1.21
    ports: ['127.0.0.1:${PORTS.smtp}:1025', '127.0.0.1:${PORTS.mail}:8025']
    networks: [${NETWORK}]
networks:
  ${NETWORK}:
    external: true
`
)

write(join(repos, 'fazenda-web/package.json'), pkg('fazenda-web', stub(webPkg.scripts, { dev: 'node server.js', preview: 'node server.js' })))
write(join(repos, 'fazenda-web/yarn.lock'), '')
write(join(repos, 'fazenda-web/server.js'), server('fazenda-web', PORTS.web, ['  VITE v6.2.0  ready in 412 ms', '  ➜  Local:   http://localhost:' + PORTS.web + '/']))

write(
  join(repos, 'fazenda-logs/docker-compose.yml'),
  `# Cópia de demonstração do compose da fixture (Loki e Grafana, portas livres).
name: fazenda-demo-logs
services:
  loki:
    image: grafana/loki:3.4.2
    ports: ['127.0.0.1:${PORTS.loki}:3100']
    networks: [${NETWORK}]
  grafana:
    image: grafana/grafana:11.6.0
    environment: [GF_SECURITY_ADMIN_PASSWORD=demo, GF_ANALYTICS_REPORTING_ENABLED=false]
    ports: ['127.0.0.1:${PORTS.grafana}:3000']
    depends_on: [loki]
    networks: [${NETWORK}]
networks:
  ${NETWORK}:
    external: true
`
)

// Cada repo vira um git com um commit (autor fictício, nunca o de quem gera): o card mostra a branch.
// A API fica com uma alteração não salva para o print mostrar o contador de alterações.
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Berrante Demo', '-c', 'user.email=demo@berrante.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'ignore' })
for (const name of ['fazenda-api', 'fazenda-web', 'fazenda-logs']) {
  const dir = join(repos, name)
  write(join(dir, '.gitignore'), 'node_modules\n.env\n')
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'chore: projeto de demonstração')
}
write(join(repos, 'fazenda-api/README.md'), readFileSync(join(repos, 'fazenda-api/README.md'), 'utf8') + '\n<!-- ajuste local -->\n')

// ---- dados do Berrante: 3 repositórios, 1 tropa e o workflow já salvo
const now = new Date().toISOString()
const repo = (id) => ({ id, name: id, path: join(repos, id), githubFullName: `fazenda/${id}`, remoteUrl: null, addedAt: now })
const step = (repoId, id, name, command, waitFor, extra = {}) => ({
  id,
  repoId,
  name,
  kind: waitFor === 'exit' ? 'setup' : 'script',
  command,
  composeFile: null,
  cwd: join(repos, repoId),
  env: {},
  enabled: true,
  order: 0,
  waitFor,
  dependsOn: [],
  color: 'cyan',
  origin: 'detected',
  ...extra
})
const services = [
  step('fazenda-logs', `net:${NETWORK}`, `rede ${NETWORK}`, `docker network inspect ${NETWORK} >/dev/null 2>&1 || docker network create ${NETWORK}`, 'exit', { color: 'yellow' }),
  step('fazenda-logs', 'fazenda-logs:compose', 'containers', 'docker compose up -d', 'exit'),
  step('fazenda-api', 'fazenda-api:compose', 'containers', 'docker compose up -d db mailpit', 'exit'),
  // A API mostra as opções novas: segue quando o /health responde e reinicia sozinha se cair.
  // A porta da API vem do .env (PORT=13333), como o Berrante recomenda: o "Mudar porta" consegue trocar.
  step('fazenda-api', 'fazenda-api:script:dev', 'dev', 'yarn dev', 'health', { color: 'green', healthUrl: `http://localhost:${PORTS.api}/health`, autoRestart: true }),
  step('fazenda-api', 'fazenda-api:script:worker:start', 'worker:start', 'yarn worker:start', 'start', { color: 'purple' }),
  step('fazenda-api', 'fazenda-api:script:start', 'start', 'yarn start', 'port', { color: 'orange', enabled: false }),
  step('fazenda-web', 'fazenda-web:script:dev', 'dev', 'yarn dev', 'port', { color: 'pink', env: { PORT: String(PORTS.web) } }),
  step('fazenda-web', 'fazenda-web:script:preview', 'preview', 'yarn preview', 'port', { color: 'orange', enabled: false })
].map((s, i) => ({ ...s, order: i * 10 }))
const actions = [
  ['fazenda-api', ['migration:run', 'seed:run', 'lint', 'typecheck', 'test', 'build']],
  ['fazenda-web', ['build', 'typecheck', 'lint', 'test']]
].flatMap(([repoId, names]) => names.map((n) => ({ repoId, name: n, command: `yarn ${n}` })))
const project = {
  id: 'demo-fazenda',
  name: 'Fazenda',
  color: 'green',
  icon: 'tee',
  repositoryIds: ['fazenda-api', 'fazenda-web', 'fazenda-logs'],
  plan: {
    services,
    actions,
    // Perfil para o seletor do cabeçalho (o print usa a tropa completa).
    profiles: [{ id: 'profile:so-api', name: 'só a API', serviceIds: services.filter((s) => s.repoId !== 'fazenda-web').map((s) => s.id) }],
    detectedAt: now,
    updatedAt: now
  },
  createdAt: now,
  updatedAt: now
}
write(join(data, 'repositories.json'), JSON.stringify(['fazenda-api', 'fazenda-web', 'fazenda-logs'].map(repo), null, 2))
write(join(data, 'projects.json'), JSON.stringify([project], null, 2))
// Avisos do macOS desligados: a geração dos prints não dispara notificações em quem roda.
write(join(data, 'settings.json'), JSON.stringify({ cloneRoot: repos, accent: 'azul', tintBackground: true, showGrid: true, notifications: false }, null, 2))

// "Outro projeto" que ocupa a porta da API: o roteiro abre a vistoria com ele de pé e o encerra antes do play.
write(join(out, 'outro-projeto/server.js'), `require('node:http').createServer((_q, r) => r.end('outro')).listen(${PORTS.api}, '127.0.0.1')\n`)

console.log(`demo pronta em ${out}; gerando prints em ${shots}…`)
execFileSync('yarn', ['dev'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    BERRANTE_USER_DATA: data,
    BERRANTE_SHOTS: shots,
    BERRANTE_SHOTS_PLAY_MS: process.env.BERRANTE_SHOTS_PLAY_MS ?? '25000',
    BERRANTE_SHOTS_BLOCKER: join(out, 'outro-projeto/server.js')
  }
})
console.log(`prints em ${shots}`)
