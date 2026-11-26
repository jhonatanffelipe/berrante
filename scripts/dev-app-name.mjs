// Só macOS, só dev: o `yarn dev` roda o Electron.app genérico de node_modules, e o macOS mostra o nome do bundle
// ("Electron") na barra de menus e no Dock. Renomeia o bundle de dev para "Berrante".
// O app empacotado não depende disso: o electron-builder já grava productName no Info.plist.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform === 'darwin') {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const plist = join(root, 'node_modules/electron/dist/Electron.app/Contents/Info.plist')
  if (existsSync(plist)) {
    for (const key of ['CFBundleName', 'CFBundleDisplayName']) execFileSync('plutil', ['-replace', key, '-string', 'Berrante', plist])
  }
}
