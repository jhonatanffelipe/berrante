import type { EnvIssue } from '@shared/types'
import { applyProfile } from '@shared/workflow'
import type { DetectStartupPlanUseCase } from '../startup/DetectStartupPlanUseCase'
import type { GetProjectUseCase } from '../projects/GetProjectUseCase'

/** `.env` ausente ou incompleto nos repositórios que vão subir (só nomes de chave, nunca valores). */
export class CheckEnvUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly detect: DetectStartupPlanUseCase
  ) {}

  async execute(projectId: string, profileId?: string | null): Promise<EnvIssue[]> {
    const project = await this.getProject.execute(projectId)
    const plan = project.plan ? applyProfile(project.plan, profileId) : null
    const used = plan ? new Set(plan.services.filter((s) => s.enabled).map((s) => s.repoId)) : null
    const detections = await this.detect.detections(projectId)
    return detections
      .filter((d) => d.env && (!d.env.envExists || d.env.missingKeys.length > 0) && (!used || used.has(d.repoId)))
      .map((d) => ({ repoId: d.repoId, repoName: d.repoName, exampleFile: d.env!.exampleFile, envExists: d.env!.envExists, missingKeys: d.env!.missingKeys }))
  }
}
