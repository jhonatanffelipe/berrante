import type { DetectionResult, RepoDetection } from '@shared/types'
import type { LocalRepositoryRepository, ProjectRepository } from '@main/domain/repositories'
import type { Clock, Logger, RepoInspectorGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { detectRepo } from './detectors/repoDetector'
import { buildPlan, mergePlans } from './detectors/planBuilder'

/** Detecta (sem salvar) o plano de subida da tropa, preservando edições já feitas. */
export class DetectStartupPlanUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly repos: LocalRepositoryRepository,
    private readonly inspector: RepoInspectorGateway,
    private readonly clock: Clock,
    private readonly logger: Logger
  ) {}

  async detections(projectId: string): Promise<RepoDetection[]> {
    const project = await this.projects.findById(projectId)
    if (!project) throw AppError.notFound('Tropa')
    const repos = await Promise.all(project.repositoryIds.map((id) => this.repos.findById(id)))
    return Promise.all(
      repos
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((repo) =>
          detectRepo(repo, this.inspector.files(repo.path), (file) => this.inspector.composeConfig(repo.path, file))
        )
    )
  }

  async execute(projectId: string): Promise<DetectionResult> {
    const started = Date.now()
    const project = await this.projects.findById(projectId)
    if (!project) throw AppError.notFound('Tropa')
    const detections = await this.detections(projectId)
    const plan = mergePlans(project.plan, buildPlan(detections, this.clock.now()))
    this.logger.info('startup.detected', { projectId, repos: detections.length, services: plan.services.length, durationMs: Date.now() - started })
    return { plan, detections }
  }
}
