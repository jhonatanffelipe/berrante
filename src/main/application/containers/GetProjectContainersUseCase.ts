import type { ContainerState, ProjectContainers, ProjectStack } from '@shared/types'
import type { DockerGateway } from '@main/domain/ports'
import { stacksOf, type ComposeStack } from '@main/domain/entities/ComposeStack'
import type { GetProjectUseCase } from '../projects/GetProjectUseCase'

/** Containers que a tropa sobe (passos `docker compose ... up`), com o estado de cada um. */
export class GetProjectContainersUseCase {
  constructor(
    private readonly getProject: GetProjectUseCase,
    private readonly docker: DockerGateway
  ) {}

  async execute(projectId: string): Promise<ProjectContainers> {
    const project = await this.getProject.execute(projectId)
    const stacks = stacksOf(project)
    if (!stacks.length) return { available: true, stacks: [] }
    if (!(await this.docker.available())) return { available: false, stacks: stacks.map((s) => this.view(s, s.services, new Map(), null)) }
    return { available: true, stacks: await Promise.all(stacks.map((s) => this.load(s))) }
  }

  private async load(stack: ComposeStack): Promise<ProjectStack> {
    const [services, ps] = await Promise.all([
      stack.services.length ? Promise.resolve({ list: stack.services, error: null }) : this.docker.stackServices(stack.cwd, stack.globalArgs).then(
        (list) => ({ list, error: null as string | null }),
        (err: Error & { details?: { output?: string } }) => ({ list: [] as string[], error: err.details?.output?.trim() || err.message })
      ),
      this.docker.stackPs(stack.cwd, stack.globalArgs)
    ])
    // Sem serviços explícitos no passo, entram também os que estão de pé por outro profile.
    const names = stack.services.length ? services.list : [...new Set([...services.list, ...ps.keys()])]
    return this.view(stack, names, ps, services.error)
  }

  private view(stack: ComposeStack, names: string[], ps: Map<string, ContainerState>, error: string | null): ProjectStack {
    return {
      id: stack.id,
      name: stack.name,
      cwd: stack.cwd,
      compose: ['docker compose', ...stack.globalArgs].join(' '),
      services: names.map((service) => ({ service, container: ps.get(service) ?? null })),
      error
    }
  }
}
