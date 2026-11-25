import type { ShellGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { DeviceFlowState } from './DeviceFlowState'

/** Abre a URL de verificação recebida do GitHub (o renderer não escolhe a URL). */
export class OpenVerificationUriUseCase {
  constructor(
    private readonly state: DeviceFlowState,
    private readonly shell: ShellGateway
  ) {}

  async execute(): Promise<void> {
    const uri = this.state.current?.verificationUri
    if (!uri) throw new AppError('VALIDATION', 'Nenhum login em andamento')
    await this.shell.openExternal(uri)
  }
}
