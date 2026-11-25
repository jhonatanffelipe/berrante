import type { ClassifiedScript, ScriptCategory } from '@shared/types'

/** Hooks de ciclo de vida do npm: nunca são serviço. */
const LIFECYCLE = /^(pre|post)?(install|uninstall|publish|publishOnly|pack|version|prepare|shrinkwrap)$|^(pre|post)(build|test|lint|start|dev)$/

/** Prefixos que denunciam "ação" (rodam e terminam), mesmo com watch (ex: test:watch). */
const ACTION_NAME =
  /^(build|test|tests|e2e|coverage|lint|typecheck|type-check|tsc|format|prettier|fmt|migration|migrations|migrate|seed|seeds|db|typeorm|prisma|knex|sequelize|audit|clean|release|deploy|publish|job|jobs|contracts|codegen|generate|gen|icon|icons|analyze|check|ci|docs|storybook:build|cy|cypress|playwright)(?=$|[:\-_])/i

/** Nomes que, por convenção, são processos longos. */
const SERVICE_NAME =
  /^(dev|develop|start|serve|server|watch|worker|workers|preview|storybook|queue|consumer|scheduler|cron)$|^(dev|start|serve|watch|worker|queue)[:\-_].+|.+[:\-_](dev|watch|worker|serve|server)$/i

/** Ferramentas que indicam processo longo dentro do comando. */
const SERVICE_COMMAND =
  /\b(nodemon|ts-node-dev|tsx\s+watch|node\s+--watch|--watch\b|nest\s+start|next\s+dev|nuxt\s+dev|astro\s+dev|remix\s+dev|webpack\s+serve|webpack-dev-server|electron-vite\s+dev|expo\s+start|react-scripts\s+start|vite(?!\s+(build|preview\s+--help))(\s|$)|http-server|live-server|concurrently)\b/i

export function classifyScript(name: string, command: string): ScriptCategory {
  if (LIFECYCLE.test(name)) return 'action'
  if (ACTION_NAME.test(name)) return 'action'
  if (SERVICE_NAME.test(name)) return 'service'
  if (SERVICE_COMMAND.test(command)) return 'service'
  return 'action'
}

export function classifyScripts(scripts: Record<string, unknown> | undefined): ClassifiedScript[] {
  if (!scripts || typeof scripts !== 'object') return []
  return Object.entries(scripts)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([name, command]) => ({ name, command, category: classifyScript(name, command) }))
}

const PRIMARY_ORDER = ['dev', 'start:dev', 'develop', 'serve', 'start']

/** O serviço principal entra habilitado no play; os demais ficam disponíveis mas desligados. */
export function primaryServiceScript(scripts: ClassifiedScript[]): ClassifiedScript | null {
  const services = scripts.filter((s) => s.category === 'service')
  for (const name of PRIMARY_ORDER) {
    const found = services.find((s) => s.name === name)
    if (found) return found
  }
  return services[0] ?? null
}
