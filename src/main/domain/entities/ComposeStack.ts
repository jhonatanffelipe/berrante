import type { ContainerOwner, Project } from '@shared/types'
import { parseComposeUp } from '@shared/workflow'
import { orderServices } from './ServiceDefinition'

/** Uma stack compose que a tropa sobe: onde rodar, com quais argumentos globais e quais serviços. */
export interface ComposeStack {
  /** ID do passo do plano (o renderer só manda esse ID; cwd e argumentos saem do plano salvo). */
  id: string
  name: string
  cwd: string
  globalArgs: string[]
  /** Vazio = todos os serviços do compose. */
  services: string[]
}

/**
 * Stacks dos passos habilitados: `docker compose ... up` (um passo = uma stack) e, nos planos
 * antigos, os passos `compose` (um container por passo) agrupados por pasta + arquivo.
 */
export function stacksOf(project: Project): ComposeStack[] {
  const steps = orderServices((project.plan?.services ?? []).filter((s) => s.enabled))
  const stacks: ComposeStack[] = []
  const legacy = new Map<string, ComposeStack>()
  for (const s of steps) {
    if (s.kind === 'compose') {
      if (!s.composeFile) continue
      const key = `${s.cwd}\0${s.composeFile}`
      const found = legacy.get(key)
      if (found) {
        found.services.push(s.command)
        continue
      }
      const stack: ComposeStack = { id: s.id, name: s.composeFile, cwd: s.cwd, globalArgs: ['-f', s.composeFile], services: [s.command] }
      legacy.set(key, stack)
      stacks.push(stack)
      continue
    }
    const up = parseComposeUp(s.command)
    if (up) stacks.push({ id: s.id, name: s.name, cwd: s.cwd, globalArgs: up.globalArgs, services: up.services })
  }
  return stacks
}

/** Tropas donas de um container: a pasta do compose dele fica dentro de um repo da tropa. */
export function ownersOf(workingDir: string | null, projects: Project[], repoPaths: Map<string, string>): ContainerOwner[] {
  if (!workingDir) return []
  // No Windows o docker grava a pasta como C:\… e o caminho não diferencia maiúsculas.
  const windows = /^[a-zA-Z]:[\\/]/.test(workingDir)
  const norm = (p: string) => (windows ? p.replace(/\//g, '\\').toLowerCase() : p)
  const sep = windows ? '\\' : '/'
  const dir = norm(workingDir)
  const inside = (repoPath: string) => {
    const root = norm(repoPath)
    return dir === root || dir.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)
  }
  return projects
    .filter((p) => p.repositoryIds.some((id) => {
      const path = repoPaths.get(id)
      return path ? inside(path) : false
    }))
    .map((p) => ({ projectId: p.id, projectName: p.name }))
}
