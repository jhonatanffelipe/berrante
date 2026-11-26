import { dirname, relative, resolve } from 'node:path'
import { z } from 'zod'
import type { AiWorkflowStep, AiWorkflowSuggestion, LocalRepository, ServiceDefinition, StartupPlan } from '@shared/types'
import type { LocalRepositoryRepository, ProjectRepository, SettingsRepository } from '@main/domain/repositories'
import type { AiCliGateway, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { TotpGuard } from '../security/TotpGuard'
import type { DetectStartupPlanUseCase } from './DetectStartupPlanUseCase'
import { isInside } from './pathGuard'

const WAIT_FOR = ['exit', 'port', 'start'] as const

export const AI_WORKFLOW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['steps', 'notes'],
  properties: {
    notes: { type: 'string', description: 'Observações curtas em português (o que conferir antes de subir)' },
    steps: {
      type: 'array',
      description: 'Passos na ordem em que um dev roda no terminal',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['repo', 'name', 'command', 'waitFor', 'reason'],
        properties: {
          repo: { type: 'string', description: 'Nome do repositório (pasta)' },
          folder: { type: 'string', description: 'Subpasta relativa à raiz do repo; omita ou "." para a raiz' },
          name: { type: 'string', description: 'Nome curto do passo' },
          command: { type: 'string', description: 'Comando de shell exatamente como no terminal' },
          waitFor: { type: 'string', enum: WAIT_FOR, description: 'exit = espera terminar; port = espera abrir porta; start = segue após iniciar' },
          env: { type: 'object', additionalProperties: { type: 'string' } },
          reason: { type: 'string', description: 'Por que este passo, nesta posição (1 frase)' }
        }
      }
    }
  }
} as const

const aiResponse = z.object({
  notes: z.string().max(4000).optional().default(''),
  steps: z
    .array(
      z.object({
        repo: z.string().min(1).max(200),
        folder: z.string().max(500).optional(),
        name: z.string().min(1).max(120),
        command: z.string().min(1).max(2000),
        waitFor: z.enum(WAIT_FOR),
        env: z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.string().max(2000)).optional(),
        reason: z.string().max(500).optional().default('')
      })
    )
    .max(60)
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
 * IA como sugestão de workflow: a CLI local lê os repos (somente leitura) e propõe a sequência
 * de comandos que um dev rodaria no terminal. Nada é executado nem salvo aqui: o renderer mostra
 * a sugestão e o usuário escolhe o que entra no plano.
 */
export class AnalyzeWithAiUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository,
    private readonly settings: SettingsRepository,
    private readonly detect: DetectStartupPlanUseCase,
    private readonly ai: AiCliGateway,
    private readonly guard: TotpGuard,
    private readonly logger: Logger
  ) {}

  async execute(projectId: string, totpCode?: string): Promise<AiWorkflowSuggestion> {
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
      'Você está ajudando o app Berrante a sugerir o WORKFLOW de subida local (desenvolvimento) de um projeto com vários repositórios.',
      'Leia README, package.json, docker-compose, .env.example e configs dos repositórios abaixo (somente leitura; não execute nada).',
      'Pense como o dev faria à mão no terminal, um passo de cada vez, e devolva APENAS o JSON no schema pedido, na ordem de execução.',
      'Regras:',
      '- Containers: UM passo "docker compose up -d" por repositório que tiver compose (não um por container), com waitFor=exit.',
      '- Infra primeiro (redes, containers de banco/fila/logs), depois a API (dev server, waitFor=port),',
      '  depois workers/filas que dependem da API (waitFor=start) e por último o front-end (waitFor=port).',
      '- Preparos que terminam (install, migrations obrigatórias, docker network create) usam waitFor=exit; inclua só se forem necessários para subir.',
      '- Use os comandos exatamente como estão nos scripts/README, com o gerenciador de pacotes certo (yarn, pnpm, npm, bun).',
      '- Não invente comandos que não estejam documentados ou implícitos nos arquivos. Em "reason", explique em 1 frase o porquê da posição.',
      '',
      `Detecção automática: ${JSON.stringify(summary)}`,
      `Workflow atual do usuário: ${JSON.stringify([...current.services].sort((a, b) => a.order - b.order).map((s) => ({ repo: repos.find((r) => r.id === s.repoId)?.name, name: s.name, command: s.command, enabled: s.enabled })))}`
    ].join('\n')

    const started = Date.now()
    const raw = await this.ai.requestJson(settings.aiCli, prompt, AI_WORKFLOW_SCHEMA, cwd)
    const parsed = aiResponse.safeParse(raw)
    if (!parsed.success) throw new AppError('AI', 'Resposta da IA fora do formato esperado', { issues: parsed.error.issues.slice(0, 5) })

    const steps = this.toSteps(parsed.data, repos, current)
    this.logger.info('startup.ai.suggested', { projectId, cli: settings.aiCli, steps: steps.length, durationMs: Date.now() - started })
    return { cli: settings.aiCli, steps, notes: parsed.data.notes || null }
  }

  /** Converte a resposta em passos válidos: repo conhecido, pasta dentro dele; ids reaproveitados quando o passo já existe. */
  private toSteps(data: z.infer<typeof aiResponse>, repos: LocalRepository[], current: StartupPlan): AiWorkflowStep[] {
    const byName = new Map(repos.map((r) => [r.name.toLowerCase(), r]))
    const result: AiWorkflowStep[] = []
    data.steps.forEach((s, index) => {
      const repo = byName.get(s.repo.toLowerCase()) ?? byName.get(s.repo.split(/[\\/]/).pop()?.toLowerCase() ?? '')
      if (!repo) return
      const cwd = resolve(repo.path, s.folder ?? '.')
      if (!isInside(repo.path, cwd)) return
      const match = current.services.find((c) => c.cwd === cwd && c.command.trim() === s.command.trim())
      let id = match?.id ?? `ai:${repo.id}:${slug(s.name)}`
      while (result.some((x) => x.step.id === id)) id = `${id}-${index}`
      const step: ServiceDefinition = {
        id,
        repoId: repo.id,
        name: s.name,
        kind: s.waitFor === 'exit' ? 'setup' : 'command',
        command: s.command,
        composeFile: null,
        cwd,
        env: s.env ?? match?.env ?? {},
        enabled: true,
        order: index * 10,
        waitFor: s.waitFor,
        dependsOn: [],
        color: match?.color ?? 'purple',
        origin: match?.origin ?? 'ai'
      }
      result.push({ step, reason: s.reason })
    })
    return result
  }
}
