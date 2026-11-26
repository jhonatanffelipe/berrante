import { dialog, shell, type BrowserWindow } from 'electron'
import type { ShellGateway, Workspace } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com'])

export class ElectronShell implements ShellGateway {
  constructor(
    private readonly window: () => BrowserWindow | null,
    private readonly workspace: Workspace
  ) {}

  async openExternal(url: string): Promise<void> {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) throw AppError.validation('URL externa não permitida')
    await shell.openExternal(parsed.toString())
  }

  reveal(path: string): void {
    shell.showItemInFolder(this.workspace.toHost(path))
  }

  async pickFolder(title: string, defaultPath?: string): Promise<string | null> {
    const win = this.window()
    const hostDefault = defaultPath ? this.workspace.toHost(defaultPath) : undefined
    const options: Electron.OpenDialogOptions = { title, defaultPath: hostDefault, properties: ['openDirectory', 'createDirectory'] }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    const picked = result.canceled ? null : (result.filePaths[0] ?? null)
    if (!picked) return null
    const path = this.workspace.fromHost(picked)
    if (!path) throw AppError.validation('Escolha uma pasta dentro da distro WSL (em \\\\wsl.localhost\\<distro>\\…) ou num disco do Windows')
    return path
  }
}
