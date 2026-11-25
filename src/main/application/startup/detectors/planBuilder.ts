import { DRACULA_ACCENTS, type DraculaAccent, type RepoAction, type RepoDetection, type ServiceDefinition, type StartupPlan } from '@shared/types'
import { installCommand, runScriptCommand } from './packageManager'
import { primaryServiceScript } from './scriptClassifier'
import { composeServicesFromReadme, networksFromReadme } from './readmeParser'

/** Fases de subida: rede → containers → install → scripts. */
const PHASE = { network: 0, compose: 100, install: 200, script: 300 } as const

/** Vermelho fica reservado para erro/crash. */
const SERVICE_COLORS: DraculaAccent[] = DRACULA_ACCENTS.filter((c) => c !== 'red' && c !== 'yellow')

export const serviceIds = {
  network: (name: string) => `net:${name}`,
  compose: (repoId: string, svc: string) => `${repoId}:compose:${svc}`,
  install: (repoId: string) => `${repoId}:setup:install`,
  script: (repoId: string, name: string) => `${repoId}:script:${name}`
}

export function networkCommand(name: string): string {
  return `docker network inspect ${name} >/dev/null 2>&1 || docker network create ${name}`
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
  const counters = { network: 0, compose: 0, install: 0, script: 0 }
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
      dependsOn: [],
      color: 'yellow',
      origin: 'detected'
    })
    return id
  }

  for (const det of detections) {
    const repoServices: string[] = []
    const readmeUp = composeServicesFromReadme(det.readme)
    const readmeNetworks = networksFromReadme(det.readme)

    // ---- docker compose
    if (det.compose) {
      const netIds = [...new Set([...det.compose.externalNetworks, ...readmeNetworks])].map((n) => ensureNetwork(n, det))
      const composeIds = new Map(det.compose.services.map((s) => [s.name, serviceIds.compose(det.repoId, s.name)]))
      for (const svc of det.compose.services) {
        const inReadme = readmeUp === null || readmeUp.length === 0 || readmeUp.includes(svc.name)
        const enabled = svc.profiles.length === 0 && inReadme
        const id = composeIds.get(svc.name)!
        services.push({
          id,
          repoId: det.repoId,
          name: svc.name,
          kind: 'compose',
          command: svc.name,
          composeFile: det.compose.file,
          cwd: det.repoPath,
          env: {},
          enabled,
          order: PHASE.compose + counters.compose++,
          dependsOn: [...netIds, ...svc.dependsOn.map((d) => composeIds.get(d)).filter((d): d is string => Boolean(d))],
          color: 'cyan',
          origin: 'detected'
        })
        if (enabled) repoServices.push(id)
      }
    } else {
      for (const n of readmeNetworks) ensureNetwork(n, det)
    }

    // ---- install
    let installId: string | null = null
    if (det.packageJson && det.packageManager && !det.nodeModulesInstalled) {
      installId = serviceIds.install(det.repoId)
      services.push({
        id: installId,
        repoId: det.repoId,
        name: 'install',
        kind: 'setup',
        command: installCommand(det.packageManager.name),
        composeFile: null,
        cwd: det.repoPath,
        env: {},
        enabled: true,
        order: PHASE.install + counters.install++,
        dependsOn: [],
        color: 'yellow',
        origin: 'detected'
      })
    }

    // ---- scripts
    if (det.packageManager) {
      const pm = det.packageManager.name
      const primary = primaryServiceScript(det.scripts)
      for (const script of det.scripts) {
        const command = runScriptCommand(pm, script.name)
        if (script.category === 'action') {
          actions.push({ repoId: det.repoId, name: script.name, command })
          continue
        }
        services.push({
          id: serviceIds.script(det.repoId, script.name),
          repoId: det.repoId,
          name: script.name,
          kind: 'script',
          command,
          composeFile: null,
          cwd: det.repoPath,
          env: {},
          enabled: primary?.name === script.name,
          order: PHASE.script + counters.script++,
          dependsOn: [...(installId ? [installId] : []), ...repoServices],
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
const USER_FIELDS = ['enabled', 'order', 'env', 'cwd', 'dependsOn', 'color', 'command', 'name'] as const

/**
 * Re-detecção preservando edições: serviços que continuam existindo mantêm os campos do usuário;
 * serviços manuais (user/ai/readme) nunca somem; detectados que deixaram de existir saem.
 */
export function mergePlans(existing: StartupPlan | null, detected: StartupPlan): StartupPlan {
  if (!existing) return detected
  const prev = new Map(existing.services.map((s) => [s.id, s]))
  const merged: ServiceDefinition[] = detected.services.map((svc) => {
    const old = prev.get(svc.id)
    if (!old) return svc
    const keep: Partial<ServiceDefinition> = {}
    for (const f of USER_FIELDS) (keep as Record<string, unknown>)[f] = old[f]
    return { ...svc, ...keep }
  })
  const detectedIds = new Set(detected.services.map((s) => s.id))
  for (const old of existing.services) {
    if (!detectedIds.has(old.id) && old.origin !== 'detected') merged.push(old)
  }
  const ids = new Set(merged.map((s) => s.id))
  return {
    services: merged.map((s) => ({ ...s, dependsOn: s.dependsOn.filter((d) => ids.has(d)) })),
    actions: detected.actions,
    detectedAt: detected.detectedAt,
    updatedAt: existing.updatedAt
  }
}
