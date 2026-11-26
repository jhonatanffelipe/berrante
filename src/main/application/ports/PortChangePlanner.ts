import { join, relative } from 'node:path'
import type { LocalRepository, PortChangePlan, PortEdit, Project } from '@shared/types'
import { composeStopCommand } from '@shared/workflow'
import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'
import type { EnvFileGateway, Logger, PortScannerGateway, RepoInspectorGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { PortHints } from '../runtime/RuntimeService'
import { applyEnvLines, composeHasLiteralPort, composePortVar, envPortLines, envPorts, envValue, suggestPort, type EnvPortLine } from './portEdits'

const ENV_FILE = '.env'
const COMPOSE_FILES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml']

/** Escrita a fazer num `.env` (o conteúdo nunca vai para o renderer nem para o log). */
interface EnvWrite {
  dir: string
  content: string
  exists: boolean
}

interface Planned {
  plan: PortChangePlan
  writes: EnvWrite[]
}

/** Mascara credencial em URL (`postgres://user:senha@localhost:5432` → `postgres://***@localhost:5432`). */
const mask = (line: string) => line.replace(/\/\/[^/@\s]+@/g, '//***@')

/**
 * Planeja e aplica a troca de uma porta ocupada pelo `.env`.
 * A porta nova não pode estar em uso na máquina nem aparecer em nenhuma tropa (passos desligados inclusive).
 * O plano é sempre recalculado no main: o renderer só escolhe o número.
 */
export class PortChangePlanner {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository,
    private readonly envFiles: EnvFileGateway,
    private readonly inspector: RepoInspectorGateway,
    private readonly scanner: PortScannerGateway,
    private readonly portHints: PortHints,
    private readonly logger: Logger
  ) {}

  async plan(projectId: string, serviceId: string, port: number, wanted?: number): Promise<Planned> {
    const project = await this.projects.findById(projectId)
    if (!project) throw AppError.notFound('Tropa')
    const svc = project.plan?.services.find((s) => s.id === serviceId)
    if (!svc) throw AppError.notFound('Passo')
    const repos = await this.projectRepos(project)
    const repo = repos.find((r) => r.id === svc.repoId)
    if (!repo) throw AppError.notFound('Repositório do passo')

    const taken = await this.takenPorts()
    let newPort: number | null
    if (wanted !== undefined) {
      if (wanted === port) throw AppError.validation('Escolha uma porta diferente da atual')
      if (wanted < 1024 || wanted > 65_535) throw AppError.validation('Use uma porta entre 1024 e 65535')
      if (taken.has(wanted)) throw new AppError('CONFLICT', `A porta :${wanted} já está em uso na máquina ou em alguma tropa`)
      newPort = wanted
    } else {
      newPort = suggestPort(port, taken)
    }
    // Sem porta livre ainda dá para mostrar de onde a porta vem; o número é só ilustrativo.
    const target = newPort ?? port + 1

    const warnings: string[] = []
    const edits: PortEdit[] = []
    const writes = new Map<string, { text: string; exists: boolean; lines: EnvPortLine[]; add: string[] }>()
    const file = async (dir: string) => {
      if (!writes.has(dir)) {
        const text = await this.envFiles.read(dir, ENV_FILE)
        writes.set(dir, { text: text ?? '', exists: text !== null, lines: [], add: [] })
      }
      return writes.get(dir)!
    }
    const label = (r: LocalRepository, dir: string) => join(relative(r.path, dir), ENV_FILE)

    // 1. De onde o passo lê a porta: o .env da pasta do passo e o da raiz do repo.
    const ownDirs = [...new Set([svc.cwd, repo.path])]
    let source = false
    for (const dir of ownDirs) {
      const f = await file(dir)
      for (const line of envPortLines(f.text, port, target)) {
        if (f.lines.some((l) => l.index === line.index)) continue
        f.lines.push(line)
        if (line.kind === 'port') source = true
        edits.push({ repoId: repo.id, repoName: repo.name, file: label(repo, dir), key: line.key, before: mask(line.before), after: mask(line.after), kind: line.kind })
      }
    }

    // 2. Compose: porta vinda de `${VAR:-porta}` vira VAR no .env; porta fixa no YAML só dá aviso.
    if (svc.kind === 'compose' || composeStopCommand(svc.command)) {
      const compose = await this.composeText(svc.cwd)
      const variable = compose ? composePortVar(compose, port) : null
      const f = await file(svc.cwd)
      if (variable && !source) {
        const current = envValue(f.text, variable)
        if (current === null) {
          f.add.push(`${variable}=${target}`)
          edits.push({ repoId: repo.id, repoName: repo.name, file: label(repo, svc.cwd), key: variable, before: null, after: `${variable}=${target}`, kind: 'add' })
          source = true
        } else if (current === String(port)) {
          // Chave sem PORT no nome (o passo 1 não pega): troca a linha dela.
          const line = f.text.split('\n').findIndex((l) => new RegExp(`^\\s*(?:export\\s+)?${variable}\\s*=`).test(l))
          const before = f.text.split('\n')[line]!.replace(/\r$/, '')
          const after = before.replace(String(port), String(target))
          f.lines.push({ index: line, key: variable, before, after, kind: 'port' })
          edits.push({ repoId: repo.id, repoName: repo.name, file: label(repo, svc.cwd), key: variable, before: mask(before), after: mask(after), kind: 'port' })
          source = true
        }
      } else if (!source && compose && composeHasLiteralPort(compose, port)) {
        warnings.push(`A porta :${port} está fixa no docker-compose de ${repo.name}. Troque por \${NOME_PORT:-${port}} no compose e declare NOME_PORT no .env para o Berrante conseguir mudar.`)
      }
    }

    // 3. O env do passo no plano tem prioridade sobre o .env: trocar o .env não adiantaria.
    const stepKey = Object.entries(svc.env).find(([, v]) => v.trim() === String(port))?.[0]
    if (stepKey) {
      warnings.push(`O passo "${svc.name}" define ${stepKey}=${port} no env do plano, que vale mais que o .env. O correto é mover para o .env de ${repo.name} e tirar do plano.`)
    }
    if (!source && !stepKey) {
      warnings.push(`Não achei a porta :${port} no .env de ${repo.name}. O correto é a porta vir do .env (ex.: PORT=${port}) para o Berrante conseguir trocar sozinho.`)
    }

    // 4. Outros repos da tropa que apontam para essa porta (ex.: o front com API_URL=http://localhost:3333).
    for (const other of repos) {
      const dirs = [...new Set([other.path, ...(project.plan?.services ?? []).filter((s) => s.repoId === other.id).map((s) => s.cwd)])]
      for (const dir of dirs) {
        if (ownDirs.includes(dir)) continue
        const f = await file(dir)
        for (const line of envPortLines(f.text, port, target)) {
          f.lines.push(line)
          edits.push({ repoId: other.id, repoName: other.name, file: label(other, dir), key: line.key, before: mask(line.before), after: mask(line.after), kind: line.kind })
        }
      }
    }

    if (newPort === null) warnings.push('Não achei uma porta livre perto dessa; digite uma.')
    const canApply = source && !stepKey && newPort !== null
    const result: EnvWrite[] = []
    for (const [dir, f] of writes) {
      if (!f.lines.length && !f.add.length) continue
      let content = applyEnvLines(f.text, f.lines)
      if (f.add.length) content += `${content && !content.endsWith('\n') ? '\n' : ''}${f.add.join('\n')}\n`
      result.push({ dir, content, exists: f.exists })
    }
    return { plan: { serviceId: svc.id, serviceName: svc.name, port, newPort, edits, warnings, canApply }, writes: result }
  }

  async apply(projectId: string, serviceId: string, port: number, newPort: number): Promise<PortChangePlan> {
    const { plan, writes } = await this.plan(projectId, serviceId, port, newPort)
    if (!plan.canApply) throw AppError.validation(plan.warnings[0] ?? 'Não dá para trocar essa porta sozinho')
    for (const w of writes) {
      if (w.exists) await this.envFiles.write(w.dir, ENV_FILE, w.content)
      else await this.envFiles.create(w.dir, ENV_FILE, w.content)
    }
    this.logger.info('ports.changed', { projectId, serviceId, from: port, to: newPort, files: writes.length, keys: plan.edits.map((e) => e.key) })
    return plan
  }

  /** Portas em uso na máquina e citadas em qualquer tropa (passos desligados e `.env` inclusive). */
  private async takenPorts(): Promise<Set<number>> {
    const taken = new Set<number>((await this.scanner.listListening()).map((l) => l.port))
    for (const project of await this.projects.list()) {
      for (const list of (await this.portHints(project).catch(() => new Map<string, number[]>())).values()) for (const p of list) taken.add(p)
      const dirs = new Set<string>()
      for (const r of await this.projectRepos(project)) dirs.add(r.path)
      for (const s of project.plan?.services ?? []) {
        dirs.add(s.cwd)
        for (const v of Object.values(s.env)) if (/^\d{2,5}$/.test(v.trim())) taken.add(Number(v.trim()))
      }
      for (const dir of dirs) {
        const text = await this.envFiles.read(dir, ENV_FILE)
        if (text) for (const p of envPorts(text)) taken.add(p)
      }
    }
    return taken
  }

  private async projectRepos(project: Project): Promise<LocalRepository[]> {
    const found = await Promise.all(project.repositoryIds.map((id) => this.repos.findById(id)))
    return found.filter((r): r is LocalRepository => r !== null)
  }

  private async composeText(cwd: string): Promise<string | null> {
    const files = this.inspector.files(cwd)
    for (const name of COMPOSE_FILES) {
      const text = await files.readText(name)
      if (text !== null) return text
    }
    return null
  }
}
