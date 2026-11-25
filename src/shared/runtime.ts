/** Chave única de um processo em execução: o mesmo repo pode estar em duas tropas. */
export const runtimeKey = (projectId: string, serviceId: string): string => `${projectId}::${serviceId}`

export const actionServiceId = (repoId: string, name: string): string => `action:${repoId}:${name}`
