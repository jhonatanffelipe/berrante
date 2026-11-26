import { dirname, relative, resolve } from 'node:path/posix'
import { z } from 'zod'
import type { AiPlanSuggestion, LocalRepository, ServiceDefinition, StartupPlan } from '@shared/types'
import type { LocalRepositoryRepository, ProjectRepository, SettingsRepository } from '@main/domain/repositories'
import type { AiCliGateway, Clock, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { diffPlans, orderServices } from '@main/domain/entities/ServiceDefinition'
import type { TotpGuard } from '../security/TotpGuard'
import type { DetectStartupPlanUseCase } from './DetectStartupPlanUseCase'
import { isInside } from './pathGuard'

export const AI_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['services', 'notes'],
  properties: {
    notes: { type: 'string', description: 'Observações curtas em português' },
    services: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['repo', 'name', 'kind', 'command', 'enabled', 'dependsOn'],
        properties: {
          repo: { type: 'string', description: 'Nome do repositório (pasta)' },
          name: { type: 'string' },
          kind: { type: 'string', enum: ['setup', 'compose', 'script', 'command'] },
          command: { type: 'string', description: 'Comando de shell; para kind=compose, o nome do serviço do compose' },
          composeFile: { type: 'string' },
          cwd: { type: 'string', description: 'Relativo à raiz do repo' },
          env: { type: 'object', additionalProperties: { type: 'string' } },
          enabled: { type: 'boolean' },
          dependsOn: { type: 'array', items: { type: 'string', description: 'repo/name' } }
        }
      }
    }
  }
} as const

const aiResponse = z.object({
  notes: z.string().max(4000).optional().default(''),
  services: z
    .array(
      z.object({
        repo: z.string().min(1).max(200),
        name: z.string().min(1).max(120),
        kind: z.enum(['setup', 'compose', 'script', 'command']),
        command: z.string().min(1).max(2000),
        composeFile: z.string().max(300).optional(),
        cwd: z.string().max(500).optional(),
        env: z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.string().max(2000)).optional(),
        enabled: z.boolean(),
        dependsOn: z.array(z.string().max(300)).max(50)
      })
    )
    .max(100)
})

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'svc'

function commonDir(paths: string[]): string {
  if (paths.length === 0) return process.cwd()
  let base = resolve(paths[0]!)
  while (!paths.every((p) => isInside(base, p))) {
    const parent = dirname(base)
    if (parent === base) break
    base = parent
  }
  return base
}

/**
 * Fallback com IA: a CLI local lê os repos (somente leitura) e devolve um plano JSON.
 * Nada é executado nem salvo aqui — o renderer mostra o diff e o usuário confirma.
 */
export class AnalyzeWithAiUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository,
    private readonly settings: SettingsRepository,
    private readonly detect: DetectStartupPlanUseCase,
    private readonly ai: AiCliGateway,
    private readonly guard: TotpGuard,
    private readonly clock: Clock,
    private readonly logger: Logger
  ) {}

  async execute(projectId: string, totpCode?: string): Promise<AiPlanSuggestion> {
    const settings = await this.settings.get()
    if (!settings.aiEnabled) throw new AppError('VALIDATION', 'Habilite a integração com IA nas configurações (exige 2FA)')
    await this.guard.require('ai', totpCode)

    const project = await this.projects.findById(projectId)
    if (!project) throw AppError.notFound('Tropa')
    const repos = (await Promise.all(project.repositoryIds.map((id) => this.repos.findById(id)))).filter((r): r is LocalRepository => r !== null)
    const { plan: baseline, detections } = await this.detect.execute(projectId)
    const current = project.plan ?? baseline

    const cwd = commonDir(repos.map((r) => r.path))
    const summary = detections.map((d) => ({
      repo: d.repoName,
      path: relative(cwd, d.repoPath) || '.',
      packageManager: d.packageManager?.name ?? null,
      scripts: d.scripts,
      compose: d.compose && { file: d.compose.file, services: d.compose.services.map((s) => ({ name: s.name, profiles: s.profiles, dependsOn: s.dependsOn })), externalNetworks: d.compose.externalNetworks },
      readme: d.readme,
      envMissing: d.env ? !d.env.envExists : false,
      warnings: d.warnings
    }))
    const prompt = [
      'Você está ajudando o app Berrante a montar o plano de subida LOCAL (desenvolvimento) de um projeto com vários repositórios.',
      'Leia README, package.json, docker-compose e arquivos de config dos repositórios abaixo (somente leitura; não execute nada).',
      'Devolva APENAS o JSON no schema pedido, com os serviços na ordem de subida.',
      'Regras: kind=compose usa o nome do serviço do compose em "command"; scripts longos (dev/watch/worker) são kind=script;',
      'etapas que terminam (redes, install, migrations obrigatórias) são kind=setup; dependsOn usa "repo/name".',
      'Não invente comandos que não estejam documentados ou implícitos nos arquivos.',
      '',
      `Detecção determinística atual: ${JSON.stringify(summary)}`,
      `Plano atual: ${JSON.stringify(current.services.map((s) => ({ repo: repos.find((r) => r.id === s.repoId)?.name, name: s.name, kind: s.kind, command: s.command, enabled: s.enabled })))}`
    ].join('\n')

    const started = Date.now()
    const raw = await this.ai.requestJson(settings.aiCli, prompt, AI_PLAN_SCHEMA, cwd)
    const parsed = aiResponse.safeParse(raw)
    if (!parsed.success) throw new AppError('AI', 'Resposta da IA fora do formato esperado', { issues: parsed.error.issues.slice(0, 5) })

    const plan = this.toPlan(parsed.data, repos, current)
    this.logger.info('startup.ai.suggested', { projectId, cli: settings.aiCli, services: plan.services.length, durationMs: Date.now() - started })
    return { cli: settings.aiCli, plan, diff: diffPlans(current, plan), notes: parsed.data.notes || null }
  }

  private toPlan(data: z.infer<typeof aiResponse>, repos: LocalRepository[], current: StartupPlan): StartupPlan {
    const byName = new Map(repos.map((r) => [r.name.toLowerCase(), r]))
    const keyToId = new Map<string, string>()
    const services: ServiceDefinition[] = []

    data.services.forEach((s, index) => {
      const repo = byName.get(s.repo.toLowerCase()) ?? byName.get(s.repo.split(/[\\/]/).pop()?.toLowerCase() ?? '')
      if (!repo) return
      const cwd = resolve(repo.path, s.cwd ?? '.')
      if (!isInside(repo.path, cwd)) return
      const match =
        current.services.find((c) => c.repoId === repo.id && c.kind === s.kind && c.command === s.command) ??
        current.services.find((c) => c.repoId === repo.id && c.name === s.name)
      let id = match?.id ?? `ai:${repo.id}:${slug(s.name)}`
      while (services.some((x) => x.id === id)) id = `${id}-${index}`
      keyToId.set(`${repo.name}/${s.name}`.toLowerCase(), id)
      services.push({
        id,
        repoId: repo.id,
        name: s.name,
        kind: s.kind,
        command: s.command,
        composeFile: s.kind === 'compose' ? (s.composeFile ?? match?.composeFile ?? 'docker-compose.yml') : null,
        cwd,
        env: s.env ?? match?.env ?? {},
        enabled: s.enabled,
        order: index * 10,
        dependsOn: s.dependsOn,
        color: match?.color ?? 'purple',
        origin: match?.origin ?? 'ai'
      })
    })

    for (const svc of services) {
      svc.dependsOn = svc.dependsOn
        .map((d) => keyToId.get(d.toLowerCase()) ?? keyToId.get(`${repos.find((r) => r.id === svc.repoId)?.name}/${d}`.toLowerCase()))
        .filter((d): d is string => Boolean(d) && d !== svc.id)
    }
    try {
      orderServices(services)
    } catch {
      services.forEach((s) => (s.dependsOn = []))
    }
    const now = this.clock.now().toISOString()
    return { services, actions: current.actions, detectedAt: current.detectedAt, updatedAt: now }
  }
}

