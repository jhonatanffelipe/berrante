import type { ContainerAction } from '@shared/types'
import type { DockerGateway, Logger } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

/** Parar, subir ou reiniciar um container avulso pelo ID (só IDs que o `docker ps` listou). */
export class ContainerActionUseCase {
  constructor(
    private readonly docker: DockerGateway,
    private readonly logger: Logger
  ) {}

  async execute(id: string, action: ContainerAction): Promise<void> {
    const listed = await this.docker.listContainers()
    if (!listed.ok) throw new AppError('DOCKER', 'Docker indisponível', { output: listed.error })
    const container = listed.containers.find((c) => c.id === id || c.id.startsWith(id))
    if (!container) throw AppError.notFound('Container')
    const started = Date.now()
    await this.docker.containerAction(container.id, action)
    this.logger.info('containers.action', { action, container: container.name, image: container.image, durationMs: Date.now() - started })
  }
}
