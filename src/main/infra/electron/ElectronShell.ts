import { dialog, shell, type BrowserWindow } from 'electron'
import type { BrowserGateway, ShellGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com'])

export class ElectronShell implements ShellGateway, BrowserGateway {
  constructor(private readonly window: () => BrowserWindow | null) {}

  async openExternal(url: string): Promise<void> {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) throw AppError.validation('URL externa não permitida')
    await shell.openExternal(parsed.toString())
  }

  async openLocalPort(port: number): Promise<void> {
    if (!Number.isInteger(port) || port < 1 || port > 65_535) throw AppError.validation('Porta inválida')
    await shell.openExternal(`http://localhost:${port}/`)
  }

  reveal(path: string): void {
    shell.showItemInFolder(path)
  }

  async pickFolder(title: string, defaultPath?: string): Promise<string | null> {
    const win = this.window()
    const options: Electron.OpenDialogOptions = { title, defaultPath, properties: ['openDirectory', 'createDirectory'] }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  }

  async pickFolders(title: string, defaultPath?: string): Promise<string[]> {
    const win = this.window()
    const options: Electron.OpenDialogOptions = { title, defaultPath, properties: ['openDirectory', 'multiSelections', 'createDirectory'] }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    return result.canceled ? [] : result.filePaths
  }

  async pickFile(title: string, filter: { name: string; extensions: string[] }, defaultPath?: string): Promise<string | null> {
    const win = this.window()
    const options: Electron.OpenDialogOptions = { title, defaultPath, filters: [filter], properties: ['openFile'] }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  }
}
