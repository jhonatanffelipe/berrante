import type { PortBinding } from '@shared/types'
import type { PortScannerGateway } from '@main/domain/ports'
import type { ProjectRepository } from '@main/domain/repositories'
import { attachOwners, type ManagedProcessRef, type PublishedPortRef } from '@main/domain/entities/PortBinding'
import type { RuntimeService } from '../runtime/RuntimeService'

/** "Contar a boiada": portas em LISTEN + dono no Berrante. */
export class ListPortsUseCase {
  constructor(
    private readonly scanner: PortScannerGateway,
    private readonly runtime: RuntimeService,
    private readonly projects: ProjectRepository
  ) {}

  async execute(): Promise<PortBinding[]> {
    const [listening, table, projects] = await Promise.all([this.scanner.listListening(), this.scanner.processTable(), this.projects.list()])
    const names = new Map(projects.map((p) => [p.id, p]))
    const svcName = (projectId: string, serviceId: string) =>
      names.get(projectId)?.plan?.services.find((s) => s.id === serviceId)?.name ?? serviceId.replace(/^action:[^:]+:/, '')

    const managed: ManagedProcessRef[] = this.runtime.managedProcesses().map((m) => ({
      pid: m.pid,
      pgid: m.pgid,
      owner: { projectId: m.projectId, projectName: names.get(m.projectId)?.name ?? '?', serviceId: m.serviceId, serviceName: svcName(m.projectId, m.serviceId) }
    }))
    const published: PublishedPortRef[] = []
    for (const p of projects) {
      for (const s of this.runtime.snapshot(p).services) {
        for (const port of s.container ? s.ports : []) {
          published.push({ port, owner: { projectId: p.id, projectName: p.name, serviceId: s.serviceId, serviceName: svcName(p.id, s.serviceId) } })
        }
      }
    }
    const pgidOf = new Map([...table.values()].map((p) => [p.pid, p.pgid]))
    return attachOwners(listening, pgidOf, managed, published)
  }
}
