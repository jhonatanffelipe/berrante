import type { PackageManagerInfo, PackageManagerName } from '@shared/types'

const LOCKFILES: [string, PackageManagerName][] = [
  ['yarn.lock', 'yarn'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'],
  ['npm-shrinkwrap.json', 'npm']
]

const KNOWN: PackageManagerName[] = ['yarn', 'pnpm', 'npm', 'bun']

/**
 * Decide o gerenciador: o campo `packageManager` (Corepack) vence; depois o lockfile; fallback npm.
 * `files` são os nomes na raiz do repo.
 */
export function detectPackageManager(packageJson: Record<string, unknown> | null, files: string[]): PackageManagerInfo | null {
  if (!packageJson) return null
  const present = new Set(files)
  const lock = LOCKFILES.find(([file]) => present.has(file))

  const field = typeof packageJson.packageManager === 'string' ? packageJson.packageManager : null
  if (field) {
    const m = field.match(/^(yarn|pnpm|npm|bun)@([^+\s]+)/)
    if (m && KNOWN.includes(m[1] as PackageManagerName)) {
      return { name: m[1] as PackageManagerName, version: m[2] ?? null, source: 'packageManager', lockfile: lock?.[0] ?? null }
    }
  }
  if (lock) return { name: lock[1], version: null, source: 'lockfile', lockfile: lock[0] }
  return { name: 'npm', version: null, source: 'fallback', lockfile: null }
}

export function runScriptCommand(pm: PackageManagerName, script: string): string {
  switch (pm) {
    case 'yarn':
      return `yarn ${script}`
    case 'pnpm':
      return `pnpm ${script}`
    case 'bun':
      return `bun run ${script}`
    case 'npm':
      return `npm run ${script}`
  }
}

export function installCommand(pm: PackageManagerName): string {
  return pm === 'npm' ? 'npm install' : `${pm} install`
}
