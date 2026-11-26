import { app, BrowserWindow, dialog, Menu, session, shell } from 'electron'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import type { LogChunk, Settings } from '@shared/types'
import { windowBackground } from '@shared/theme'
import { buildContainer, type Container } from './container'
import { registerIpc } from './ipc/registerIpc'
import { buildHandlers } from './ipc/controllers'
import { buildAppMenu, installAboutPanel } from './ui/appMenu'
import type { MenuCommand } from '@shared/menu'

const DEV_URL = process.env.ELECTRON_RENDERER_URL

let mainWindow: BrowserWindow | null = null
let container: Container | null = null
let quitting = false

const CSP = [
  "default-src 'self'",
  `script-src 'self'${DEV_URL ? " 'unsafe-inline'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self'${DEV_URL ? ' ws://localhost:* http://localhost:*' : ''}`,
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'"
].join('; ')

function createWindow(settings: Settings): BrowserWindow {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: 'Berrante',
    // Cor nativa antes do CSS carregar: o mesmo fundo tingido do tema.
    backgroundColor: windowBackground(settings.accent, settings.tintBackground),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 14 },
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    }
  })

  win.once('ready-to-show', () => win.show())
  // Nada de navegação nem janelas novas: links externos vão para o navegador (só https).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!(DEV_URL && url.startsWith(DEV_URL))) event.preventDefault()
  })

  // Só em dev: BERRANTE_CAPTURE=/caminho.png salva um print da janela depois de carregar (verificação visual).
  const capture = !app.isPackaged ? process.env.BERRANTE_CAPTURE : undefined
  if (capture) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        void win.webContents.capturePage().then((img) => writeFile(capture, img.toPNG()))
      }, Number(process.env.BERRANTE_CAPTURE_DELAY ?? 3500))
    })
  }

  if (DEV_URL) void win.loadURL(DEV_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

function wireEvents(c: Container): void {
  // Logs em lote (~60ms) para não inundar o IPC com processos verborrágicos.
  let buffer: LogChunk[] = []
  let timer: NodeJS.Timeout | null = null
  c.pm.onLog((serviceId, data) => {
    const last = buffer[buffer.length - 1]
    if (last && last.serviceId === serviceId) last.data += data
    else buffer.push({ serviceId, data })
    if (!timer) {
      timer = setTimeout(() => {
        mainWindow?.webContents.send('runtime:logs', buffer)
        buffer = []
        timer = null
      }, 60)
    }
  })
  c.runtime.onStatus((rt) => mainWindow?.webContents.send('runtime:status', rt))
}

/** Comando do menu: garante a janela aberta e em foco antes de repassar ao renderer. */
function sendMenuCommand(command: MenuCommand): void {
  const deliver = (win: BrowserWindow) => {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    win.webContents.send('menu:command', command)
  }
  if (mainWindow) return deliver(mainWindow)
  void container?.useCases.getSettings.execute().then((s) => {
    mainWindow = createWindow(s)
    mainWindow.on('closed', () => (mainWindow = null))
    mainWindow.webContents.once('did-finish-load', () => mainWindow && deliver(mainWindow))
  })
}

async function refreshMenu(c: Container): Promise<void> {
  const projects = await c.useCases.listProjects.execute().catch(() => [])
  const dataDir = app.getPath('userData')
  Menu.setApplicationMenu(
    buildAppMenu(
      {
        send: sendMenuCommand,
        stopEverything: () => void c.runtime.stopEverything().catch((err) => c.logger.error('menu.stopEverything.failed', { error: (err as Error).message })),
        dataDir,
        logFile: join(dataDir, 'logs', 'berrante.log'),
        isDev: !app.isPackaged
      },
      projects
    )
  )
}

async function confirmQuit(c: Container): Promise<'keep' | 'stop' | 'cancel'> {
  if (!c.runtime.anyActive()) return 'stop'
  const { response } = await dialog.showMessageBox(mainWindow ?? undefined!, {
    type: 'question',
    buttons: ['Recolher a boiada', 'Manter rodando', 'Cancelar'],
    defaultId: 0,
    cancelId: 2,
    title: 'A boiada ainda está no pasto',
    message: 'Há serviços rodando.',
    detail: 'Recolher a boiada para todos os processos e containers. Manter rodando deixa tudo de pé; o Berrante re-adota os processos na próxima abertura.'
  })
  return response === 0 ? 'stop' : response === 1 ? 'keep' : 'cancel'
}

app.setName('Berrante')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(async () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CSP] } })
  })
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))

  // Em dev o Electron mostra o ícone genérico no Dock: usa o do Berrante.
  if (!app.isPackaged && process.platform === 'darwin') app.dock?.setIcon(join(__dirname, '../../build/icon.png'))

  container = buildContainer(() => mainWindow)
  const c = container
  const handlers = buildHandlers(c.useCases)
  // O menu lista as tropas: reconstrói sempre que elas mudam.
  for (const channel of ['projects:create', 'projects:update', 'projects:delete'] as const) {
    const original = handlers[channel] as (input: never) => Promise<unknown>
    ;(handlers as Record<string, unknown>)[channel] = async (input: never) => {
      const result = await original(input)
      void refreshMenu(c)
      return result
    }
  }
  registerIpc(handlers, c.logger, DEV_URL)
  // Empacotado, o painel Sobre usa o ícone do próprio .app.
  installAboutPanel(app.isPackaged ? undefined : join(__dirname, '../../build/icon.png'))
  await refreshMenu(c)
  wireEvents(container)
  await container.runtime.init().catch((err) => container?.logger.error('runtime.init.failed', { error: (err as Error).message }))
  container.logger.info('app.ready', { version: app.getVersion(), platform: process.platform })

  mainWindow = createWindow(await container.useCases.getSettings.execute())
  mainWindow.on('closed', () => (mainWindow = null))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void container?.useCases.getSettings.execute().then((s) => {
        mainWindow = createWindow(s)
        mainWindow.on('closed', () => (mainWindow = null))
      })
    }
  })
})

app.on('before-quit', (event) => {
  if (quitting || !container) return
  event.preventDefault()
  const c = container
  void (async () => {
    const choice = await confirmQuit(c)
    if (choice === 'cancel') return
    quitting = true
    if (choice === 'stop') await c.runtime.stopEverything().catch(() => undefined)
    c.runtime.detach()
    c.logger.info('app.quit', { choice })
    app.quit()
  })()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
