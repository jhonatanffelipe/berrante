export interface PortBinding {
  port: number
  address: string
  protocol: 'TCP'
  pid: number
  command: string
  user: string
  fullCommand: string | null
  cwd: string | null
  /** Serviço do Berrante dono da porta, se houver. */
  owner: PortOwner | null
}

export interface PortOwner {
  projectId: string
  projectName: string
  serviceId: string
  serviceName: string
  managed: boolean
}
