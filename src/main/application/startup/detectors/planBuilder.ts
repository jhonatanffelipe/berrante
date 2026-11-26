import { DRACULA_ACCENTS, type ComposeInfo, type DraculaAccent, type RepoAction, type RepoDetection, type ServiceDefinition, type StartupPlan, type WaitFor } from '@shared/types'
import { installCommand, runScriptCommand } from './packageManager'
import { primaryServiceScript } from './scriptClassifier'
import { composeServicesFromReadme, networksFromReadme } from './readmeParser'
import { flattenWorkflow } from '@main/domain/entities/ServiceDefinition'

/** Fases de subida: rede → containers → install → scripts de back-end → scripts de front-end. */
const PHASE = { network: 0, compose: 100, install: 200, script: 300, frontend: 600 } as const

/** Dev servers de front-end: sobem por último, depois da API e dos workers. */
const FRONTEND_COMMAND =
  /\b(vite|next\s+dev|nuxt\s+dev|astro\s+dev|remix\s+dev|react-router\s+dev|svelte-kit\s+dev|react-scripts\s+start|expo\s+start|ng\s+serve|vue-cli-service\s+serve|webpack\s+serve|webpack-dev-server)\b/i
const FRONTEND_REPO = /(^|[-_.])(web|front|frontend|ui|webapp|client)$/i

export function isFrontendRepo(det: RepoDetection): boolean {
  const primary = primaryServiceScript(det.scripts)
  if (!primary) return false
  return FRONTEND_COMMAND.test(primary.command) || FRONTEND_REPO.test(det.repoName)
}

/** Vermelho fica reservado para erro/crash. */
const SERVICE_COLORS: DraculaAccent[] = DRACULA_ACCENTS.filter((c) => c !== 'red' && c !== 'yellow')

export const serviceIds = {
  network: (name: string) => `net:${name}`,
  compose: (repoId: string) => `${repoId}:compose`,
  install: (repoId: string) => `${repoId}:setup:install`,
  script: (repoId: string, name: string) => `${repoId}:script:${name}`
}

export function networkCommand(name: string): string {
  return `docker network inspect ${name} >/dev/null 2>&1 || docker network create ${name}`
}

const DEFAULT_COMPOSE_FILES = new Set(['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'])

/** `docker compose up -d` do repo inteiro (ou só dos serviços que o README sobe). Termina rápido: não espera healthcheck. */
export function composeUpCommand(compose: ComposeInfo, services: string[] | null): string {
  const file = DEFAULT_COMPOSE_FILES.has(compose.file) ? '' : ` -f ${compose.file}`
  const only = services?.filter((s) => compose.services.some((c) => c.name === s)) ?? []
  return `docker compose${file} up -d${only.length ? ` ${only.join(' ')}` : ''}`
}

/** Workers e filas não abrem porta: seguem quando iniciam. */
const BACKGROUND_SCRIPT = /(^|[:\-_])(worker|workers|queue|consumer|scheduler|cron|jobs?)($|[:\-_])/i

export function scriptWaitFor(name: string): WaitFor {
  return BACKGROUND_SCRIPT.test(name) ? 'start' : 'port'
}

/** Comandos do README que já viram serviço/etapa no plano e não precisam de botão de ação. */
function coveredByPlan(cmd: string): boolean {
  return (
    /^(docker\s+compose|docker-compose)\s+(.*\s)?up\b/.test(cmd) ||
    /^docker\s+network\s+create\b/.test(cmd) ||
    /^(yarn|pnpm|npm|bun)(\s+install)?\s*$/.test(cmd) ||
    /^(yarn|pnpm|bun)\s+(dev|start)\s*$/.test(cmd) ||
    /^npm\s+run\s+(dev|start)\s*$/.test(cmd) ||
    /^npm\s+(ci|start)\s*$/.test(cmd)
  )
}

/**
 * Monta o plano padrão a partir das detecções (na ordem dos repos da tropa).
 * Determinístico: mesmas entradas → mesmos ids, ordem e cores.
 */
export function buildPlan(detections: RepoDetection[], now: Date): StartupPlan {
  const services: ServiceDefinition[] = []
  const actions: RepoAction[] = []
  const counters = { network: 0, compose: 0, install: 0, script: 0, frontend: 0 }
  let colorIdx = 0
  const nextColor = (): DraculaAccent => SERVICE_COLORS[colorIdx++ % SERVICE_COLORS.length] ?? 'purple'

  const firstRepo = detections[0]
  const networkIds = new Map<string, string>()
  const ensureNetwork = (name: string, owner: RepoDetection): string => {
    const existing = networkIds.get(name)
    if (existing) return existing
    const id = serviceIds.network(name)
    networkIds.set(name, id)
    services.push({
      id,
      repoId: (owner ?? firstRepo)!.repoId,
      name: `rede ${name}`,
      kind: 'setup',
      command: networkCommand(name),
      composeFile: null,
      cwd: owner.repoPath,
      env: {},
      enabled: true,
      order: PHASE.network + counters.network++,
      waitFor: 'exit',
      dependsOn: [],
      color: 'yellow',
      origin: 'detected'
    })
    return id
  }

  for (const det of detections) {
    const readmeUp = composeServicesFromReadme(det.readme)
    const readmeNetworks = networksFromReadme(det.readme)

    // ---- docker compose: um passo por repo, que termina assim que os containers são criados
    if (det.compose) {
      for (const n of [...new Set([...det.compose.externalNetworks, ...readmeNetworks])]) ensureNetwork(n, det)
      services.push({
        id: serviceIds.compose(det.repoId),
        repoId: det.repoId,
        name: 'containers',
        kind: 'setup',
        command: composeUpCommand(det.compose, readmeUp),
        composeFile: null,
        cwd: det.repoPath,
        env: {},
        enabled: true,
        order: PHASE.compose + counters.compose++,
        waitFor: 'exit',
        dependsOn: [],
        color: 'cyan',
        origin: 'detected'
      })
    } else {
      for (const n of readmeNetworks) ensureNetwork(n, det)
    }

    // ---- install
    if (det.packageJson && det.packageManager && !det.nodeModulesInstalled) {
      services.push({
        id: serviceIds.install(det.repoId),
        repoId: det.repoId,
        name: 'install',
        kind: 'setup',
        command: installCommand(det.packageManager.name),
        composeFile: null,
        cwd: det.repoPath,
        env: {},
        enabled: true,
        order: PHASE.install + counters.install++,
        waitFor: 'exit',
        dependsOn: [],
        color: 'yellow',
        origin: 'detected'
      })
    }

    // ---- scripts: o principal primeiro, workers logo depois (habilitados), o resto desligado
    if (det.packageManager) {
      const pm = det.packageManager.name
      const primary = primaryServiceScript(det.scripts)
      const longScripts = det.scripts.filter((s) => s.category === 'service')
      const rank = (name: string) => (name === primary?.name ? 0 : scriptWaitFor(name) === 'start' ? 1 : 2)
      const frontend = isFrontendRepo(det)
      for (const script of det.scripts) {
        if (script.category === 'action') actions.push({ repoId: det.repoId, name: script.name, command: runScriptCommand(pm, script.name) })
      }
      for (const script of [...longScripts].sort((a, b) => rank(a.name) - rank(b.name))) {
        services.push({
          id: serviceIds.script(det.repoId, script.name),
          repoId: det.repoId,
          name: script.name,
          kind: 'script',
          command: runScriptCommand(pm, script.name),
          composeFile: null,
          cwd: det.repoPath,
          env: {},
          enabled: rank(script.name) < 2,
          order: frontend ? PHASE.frontend + counters.frontend++ : PHASE.script + counters.script++,
          waitFor: scriptWaitFor(script.name),
          dependsOn: [],
          color: nextColor(),
          origin: 'detected'
        })
      }
    }

    // ---- README: comandos restantes viram ações sob demanda
    const known = new Set(actions.filter((a) => a.repoId === det.repoId).map((a) => a.command))
    for (const cmd of det.readme.flatMap((s) => s.commands)) {
      if (coveredByPlan(cmd) || known.has(cmd)) continue
      known.add(cmd)
      actions.push({ repoId: det.repoId, name: cmd.length > 48 ? `${cmd.slice(0, 45)}…` : cmd, command: cmd })
    }
  }

  const iso = now.toISOString()
  return { services, actions, detectedAt: iso, updatedAt: iso }
}

/** Campos que o usuário edita e que uma nova detecção não deve sobrescrever. */
const USER_FIELDS = ['enabled', 'order', 'env', 'cwd', 'color', 'command', 'name', 'waitFor'] as const

/**
 * Re-detecção preservando edições: passos que continuam existindo mantêm os campos do usuário;
 * passos manuais (user/ai/readme) nunca somem; detectados que deixaram de existir saem
 * (inclusive as linhas antigas de um container por serviço do compose).
 */
export function mergePlans(existing: StartupPlan | null, detected: StartupPlan): StartupPlan {
  if (!existing) return detected
  const prev = new Map(existing.services.map((s) => [s.id, s]))
  // Plano salvo antes do workflow (sem `waitFor`): a ordem e o "segue ao" vêm da detecção nova.
  const legacy = !existing.services.some((s) => s.waitFor)
  const fields = legacy ? USER_FIELDS.filter((f) => f !== 'order' && f !== 'waitFor') : USER_FIELDS
  const merged: ServiceDefinition[] = detected.services.map((svc) => {
    const old = prev.get(svc.id)
    if (!old) return svc
    const keep: Partial<ServiceDefinition> = {}
    for (const f of fields) if (old[f] !== undefined) (keep as Record<string, unknown>)[f] = old[f]
    return { ...svc, ...keep }
  })
  const detectedIds = new Set(detected.services.map((s) => s.id))
  for (const old of existing.services) {
    if (!detectedIds.has(old.id) && old.origin !== 'detected') merged.push(old)
  }
  return {
    services: flattenWorkflow(merged),
    actions: detected.actions,
    detectedAt: detected.detectedAt,
    updatedAt: existing.updatedAt
  }
}
