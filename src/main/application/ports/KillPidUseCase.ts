import type { PortScannerGateway, ProcessKiller, Logger } from '@main/domain/ports'
import type { ProjectRepository, SettingsRepository } from '@main/domain/repositories'
import { AppError } from '@main/domain/errors/AppError'
import type { RuntimeService } from '../runtime/RuntimeService'
import type { TotpGuard } from '../security/TotpGuard'

/**
 * Processo do Berrante → para pelo próprio runtime (grupo inteiro).
 * Processo de fora → exige 2FA e manda SIGTERM/SIGKILL no PID.
 */
export class KillPidUseCase {
  constructor(
    private readonly runtime: RuntimeService,
    private readonly scanner: PortScannerGateway,
    private readonly killer: ProcessKiller,
    private readonly guard: TotpGuard,
    private readonly projects: ProjectRepository,
    private readonly settings: SettingsRepository,
    private readonly logger: Logger
  ) {}

  async execute(pid: number, totpCode?: string): Promise<void> {
    if (!(await this.killer.isAlive(pid))) throw AppError.notFound('Processo')
    const table = await this.scanner.processTable()
    const pgid = table.get(pid)?.pgid
    const owned = this.runtime.managedProcesses().find((m) => m.pid === pid || m.pgid === pgid)
    if (owned) {
      const project = await this.projects.findById(owned.projectId)
      if (project) {
        await this.runtime.stopService(project, project.plan?.services.find((s) => s.id === owned.serviceId) ?? { id: owned.serviceId, kind: 'command' })
        this.logger.info('ports.kill.managed', { pid, serviceId: owned.serviceId })
        return
      }
    }
    await this.guard.require('kill', totpCode)
    await this.killer.kill(pid, (await this.settings.get()).stopTimeoutMs)
    this.logger.warn('ports.kill.foreign', { pid, command: table.get(pid)?.command })
  }
}
