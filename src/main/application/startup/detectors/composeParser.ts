import YAML from 'yaml'
import type { ComposeInfo, ComposeServiceInfo } from '@shared/types'

export const COMPOSE_FILES = ['compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml']

type Dict = Record<string, unknown>
const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Normaliza portas (string curta ou objeto longo do `docker compose config`) para "host:container". */
export function normalizePort(port: unknown): string | null {
  if (typeof port === 'number') return `${port}`
  if (typeof port === 'string') {
    const noProto = port.split('/')[0] ?? port
    const parts = noProto.split(':')
    if (parts.length === 3) return `${parts[1]}:${parts[2]}`
    return noProto
  }
  if (isDict(port)) {
    const target = port.target
    const published = port.published
    if (published !== undefined && published !== null && published !== '') return `${published}:${target}`
    return target !== undefined ? `${target}` : null
  }
  return null
}

/** Portas do host publicadas (ex: "5433:5432" → 5433). Ranges são expandidos. */
export function hostPorts(ports: string[]): number[] {
  const result: number[] = []
  for (const p of ports) {
    if (!p.includes(':')) continue
    const host = p.split(':')[0] ?? ''
    const range = host.match(/^(\d+)-(\d+)$/)
    if (range) {
      for (let n = Number(range[1]); n <= Number(range[2]) && result.length < 1000; n++) result.push(n)
    } else if (/^\d+$/.test(host)) {
      result.push(Number(host))
    }
  }
  return result
}

function parseServices(services: unknown): ComposeServiceInfo[] {
  if (!isDict(services)) return []
  return Object.entries(services).map(([name, raw]) => {
    const svc = isDict(raw) ? raw : {}
    const ports = Array.isArray(svc.ports) ? svc.ports.map(normalizePort).filter((p): p is string => Boolean(p)) : []
    const depends = Array.isArray(svc.depends_on)
      ? svc.depends_on.filter((d): d is string => typeof d === 'string')
      : isDict(svc.depends_on)
        ? Object.keys(svc.depends_on)
        : []
    const healthcheck = isDict(svc.healthcheck) && svc.healthcheck.disable !== true
    return {
      name,
      image: typeof svc.image === 'string' ? svc.image : null,
      containerName: typeof svc.container_name === 'string' ? svc.container_name : null,
      ports,
      profiles: Array.isArray(svc.profiles) ? svc.profiles.filter((p): p is string => typeof p === 'string') : [],
      hasHealthcheck: healthcheck,
      dependsOn: depends
    }
  })
}

function parseExternalNetworks(networks: unknown): string[] {
  if (!isDict(networks)) return []
  const result: string[] = []
  for (const [key, raw] of Object.entries(networks)) {
    if (!isDict(raw)) continue
    const external = raw.external
    if (external === true || isDict(external)) {
      const name = typeof raw.name === 'string' ? raw.name : isDict(external) && typeof external.name === 'string' ? external.name : key
      result.push(name)
    }
  }
  return result
}

function fromObject(doc: unknown, file: string, source: ComposeInfo['source']): ComposeInfo {
  const root = isDict(doc) ? doc : {}
  return {
    file,
    projectName: typeof root.name === 'string' ? root.name : null,
    services: parseServices(root.services),
    externalNetworks: parseExternalNetworks(root.networks),
    source
  }
}

/** Saída de `docker compose config --format json` (variáveis já interpoladas). */
export function parseComposeJson(json: string, file: string): ComposeInfo {
  return fromObject(JSON.parse(json), file, 'docker')
}

/** Fallback quando o docker não está disponível: lê o YAML cru (sem interpolar variáveis). */
export function parseComposeYaml(yamlText: string, file: string): ComposeInfo {
  return fromObject(YAML.parse(yamlText), file, 'yaml')
}

/** Junta a lista de serviços do docker (sem profiles inativos) com a do YAML (com profiles). */
export function mergeComposeSources(fromDocker: ComposeInfo, fromYaml: ComposeInfo | null): ComposeInfo {
  if (!fromYaml) return fromDocker
  const known = new Set(fromDocker.services.map((s) => s.name))
  const extra = fromYaml.services.filter((s) => !known.has(s.name))
  const services = fromDocker.services.map((s) => {
    const y = fromYaml.services.find((ys) => ys.name === s.name)
    return y && s.profiles.length === 0 && y.profiles.length ? { ...s, profiles: y.profiles } : s
  })
  return { ...fromDocker, services: [...services, ...extra] }
}
