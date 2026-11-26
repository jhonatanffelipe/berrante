import type { StackAction } from '@shared/types'
import type { DockerGateway, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import { stacksOf } from '@main/domain/entities/ComposeStack'
import type { GetProjectUseCase } from '../projects/GetProjectUseCase'
import type { RuntimeService } from '../runtime/RuntimeService'

/**
 * Sobe, para ou reinicia containers de uma stack da tropa. O renderer só manda o ID do passo e o
 * nome do serviço: pasta e argumentos do compose vêm do plano salvo, nunca da UI.
 */
export class ProjectContainerActionUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly docker: DockerGateway,
    private readonly runtime: RuntimeService,
    private readonly logger: Logger
  ) {}

  async execute(projectId: string, stackId: string, action: StackAction, service?: string): Promise<void> {
    const project = await this.getProject.execute(projectId)
    const stack = stacksOf(project).find((s) => s.id === stackId)
    if (!stack) throw AppError.notFound('Stack compose')

    let services = stack.services
    if (service) {
      const known = stack.services.length ? stack.services : await this.knownServices(stack.cwd, stack.globalArgs)
      if (!known.includes(service)) throw AppError.validation(`O serviço "${service}" não é dessa stack`)
      services = [service]
    }

    const started = Date.now()
    await this.docker.stackAction(stack.cwd, stack.globalArgs, action, services)
    this.logger.info('containers.stack.action', { projectId, stackId, action, services, durationMs: Date.now() - started })
    // Passos `compose` legados acompanham o estado dos containers: atualiza o placar da tropa.
    await this.runtime.refresh(project).catch(() => undefined)
  }

  private async knownServices(cwd: string, globalArgs: string[]): Promise<string[]> {
    const [config, ps] = await Promise.all([this.docker.stackServices(cwd, globalArgs).catch(() => [] as string[]), this.docker.stackPs(cwd, globalArgs)])
    return [...new Set([...config, ...ps.keys()])]
  }
}
