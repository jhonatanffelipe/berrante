import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron'
import type { Project } from '@shared/types'
import type { MenuCommand } from '@shared/menu'

export interface AppMenuDeps {
  /** Envia um comando para a janela principal (abre/foca a janela se preciso). */
  send: (command: MenuCommand) => void
  /** Recolhe a boiada de todas as tropas. */
  stopEverything: () => void
  dataDir: string
  logFile: string
  isDev: boolean
}

const GITHUB_OAUTH_APPS = 'https://github.com/settings/developers'

/**
 * Menu nativo do Berrante. É reconstruído quando as tropas mudam,
 * para listar cada uma com atalho ⌘1…⌘9 (Ctrl+1…Ctrl+9 no Windows).
 */
export function buildAppMenu(deps: AppMenuDeps, projects: Project[]): Menu {
  const { send } = deps
  const tropas: MenuItemConstructorOptions[] = projects.length
    ? projects.map((p, i) => ({
        label: p.name,
        accelerator: i < 9 ? `CmdOrCtrl+${i + 1}` : undefined,
        click: () => send({ type: 'project', id: p.id })
      }))
    : [{ label: 'Nenhuma tropa ainda', enabled: false }]

  const isMac = process.platform === 'darwin'
  const settings: MenuItemConstructorOptions = { label: 'Configurações…', accelerator: 'CmdOrCtrl+,', click: () => send({ type: 'go', view: 'settings' }) }

  // macOS: menu do app (Sobre, Serviços, Ocultar…). Windows: não existe menu do app; Configurações e Sair vão para
  // "Arquivo" e o Sobre para "Ajuda".
  const appMenu: MenuItemConstructorOptions = isMac
      ? {
        label: 'Berrante',
        submenu: [
          { label: 'Sobre o Berrante', role: 'about' },
          { type: 'separator' },
          settings,
          { type: 'separator' },
          { label: 'Serviços', role: 'services' },
          { type: 'separator' },
          { label: 'Ocultar o Berrante', role: 'hide' },
          { label: 'Ocultar outros', role: 'hideOthers' },
          { label: 'Mostrar tudo', role: 'unhide' },
          { type: 'separator' },
          { label: 'Sair do Berrante', role: 'quit' }
        ]
      }
    : {
        label: 'Arquivo',
        submenu: [settings, { type: 'separator' }, { label: 'Sair do Berrante', role: 'quit' }]
      }

  const template: MenuItemConstructorOptions[] = [
    appMenu,
    {
      label: 'Tropa',
      submenu: [
        { label: 'Nova tropa…', accelerator: 'CmdOrCtrl+N', click: () => send({ type: 'newProject' }) },
        { label: 'Editar tropa…', accelerator: 'CmdOrCtrl+E', click: () => send({ type: 'editProject' }) },
        { label: 'Abrir no VS Code', accelerator: 'CmdOrCtrl+O', click: () => send({ type: 'openWorkspace' }) },
        { type: 'separator' },
        { label: 'Tocar o berrante', accelerator: 'CmdOrCtrl+Enter', click: () => send({ type: 'play' }) },
        { label: 'Recolher a boiada', accelerator: 'CmdOrCtrl+Shift+Enter', click: () => send({ type: 'stop' }) },
        { label: 'Recolher todas as tropas', click: deps.stopEverything },
        { type: 'separator' },
        { label: 'Ver a boiada', accelerator: 'CmdOrCtrl+Alt+1', click: () => send({ type: 'tab', tab: 'boiada' }) },
        { label: 'Ver o plano de subida', accelerator: 'CmdOrCtrl+Alt+2', click: () => send({ type: 'tab', tab: 'plano' }) },
        { label: 'Ver os containers da tropa', accelerator: 'CmdOrCtrl+Alt+3', click: () => send({ type: 'tab', tab: 'containers' }) },
        { type: 'separator' },
        { label: 'Tropas', enabled: false },
        ...tropas
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', role: 'undo' },
        { label: 'Refazer', role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Colar', role: 'paste' },
        { label: 'Selecionar tudo', role: 'selectAll' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Repositórios', accelerator: 'CmdOrCtrl+Shift+R', click: () => send({ type: 'go', view: 'repos' }) },
        { label: 'Contar a boiada', accelerator: 'CmdOrCtrl+Shift+P', click: () => send({ type: 'go', view: 'ports' }) },
        { label: 'Curral (containers)', accelerator: 'CmdOrCtrl+Shift+D', click: () => send({ type: 'go', view: 'containers' }) },
        { type: 'separator' },
        { label: 'Tamanho real', role: 'resetZoom' },
        { label: 'Aumentar', role: 'zoomIn' },
        { label: 'Diminuir', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Tela cheia', role: 'togglefullscreen' },
        ...(deps.isDev
          ? ([
              { type: 'separator' },
              { label: 'Recarregar', role: 'reload' },
              { label: 'Ferramentas do desenvolvedor', role: 'toggleDevTools' }
            ] satisfies MenuItemConstructorOptions[])
          : [])
      ]
    },
    {
      label: 'Janela',
      role: 'windowMenu',
      submenu: isMac
        ? [
            { label: 'Minimizar', role: 'minimize' },
            { label: 'Zoom', role: 'zoom' },
            { label: 'Fechar janela', role: 'close' },
            { type: 'separator' },
            { label: 'Trazer tudo para a frente', role: 'front' }
          ]
        : [
            { label: 'Minimizar', role: 'minimize' },
            { label: 'Fechar janela', role: 'close' }
          ]
    },
    {
      label: 'Ajuda',
      role: 'help',
      submenu: [
        { label: 'Abrir pasta de dados', click: () => void shell.openPath(deps.dataDir) },
        { label: 'Abrir log do Berrante', click: () => void shell.openPath(deps.logFile) },
        { type: 'separator' },
        { label: 'Criar OAuth App no GitHub…', click: () => void shell.openExternal(GITHUB_OAUTH_APPS) },
        ...(isMac ? [] : ([{ type: 'separator' }, { label: 'Sobre o Berrante', role: 'about' }] satisfies MenuItemConstructorOptions[]))
      ]
    }
  ]

  return Menu.buildFromTemplate(template)
}

export function installAboutPanel(iconPath?: string): void {
  app.setAboutPanelOptions({
    applicationName: 'Berrante',
    applicationVersion: app.getVersion(),
    version: '',
    credits: 'Um toque e a boiada vem junto.',
    ...(iconPath ? { iconPath } : {})
  })
}
