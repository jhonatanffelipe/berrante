import type { Project, ServiceDefinition } from '@shared/types'
import { AppError } from '@main/domain/errors/AppError'

export function findService(project: Project, serviceId: string): ServiceDefinition {
  const svc = project.plan?.services.find((s) => s.id === serviceId)
  if (!svc) throw AppError.notFound('Serviço')
  return svc
}
