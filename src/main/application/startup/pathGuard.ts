import { resolve, sep } from 'node:path'

export function isInside(root: string, candidate: string): boolean {
  const r = resolve(root)
  const c = resolve(r, candidate)
  return c === r || c.startsWith(r + sep)
}
