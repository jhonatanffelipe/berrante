// Depois do `yarn dist` / `yarn dist:win`: apaga as pastas descompactadas que o electron-builder deixa em
// release/<versão>/mac* (os .app) e release/<versão>/win-*unpacked (o app do Windows antes de virar instalador).
// Eles têm o mesmo bundle id do app instalado, e o Spotlight/Launchpad pode abrir a cópia errada
// (inclusive a Intel, que roda pelo Rosetta num Mac Apple Silicon). Os .dmg, .exe e .zip ficam.
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const dir = join(root, 'release', version)
for (const name of readdirSync(dir)) {
  const path = join(dir, name)
  if ((/^mac(-[a-z0-9]+)?$/.test(name) || /^win(-[a-z0-9]+)?-unpacked$/.test(name)) && statSync(path).isDirectory()) {
    rmSync(path, { recursive: true, force: true })
    console.log(`removido ${join('release', version, name)}`)
  }
}
