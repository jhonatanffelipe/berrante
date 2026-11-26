import type { WslStatus } from '@shared/types'
import type { WslStatusGateway } from '@main/domain/ports'

/** Distros disponíveis, a distro em uso e quais ferramentas existem nela (git, docker, lsof…). */
export class GetWslStatusUseCase {
  constructor(private readonly wsl: WslStatusGateway) {}

  execute(): Promise<WslStatus> {
    return this.wsl.status()
  }
}
