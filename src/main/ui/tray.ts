import { Menu, nativeImage, Tray, type MenuItemConstructorOptions, type NativeImage } from 'electron'
import type { Project } from '@shared/types'

export interface TrayProject {
  project: Project
  running: number
  total: number
  playing: boolean
  active: boolean
}

export interface TrayDeps {
  play: (projectId: string) => void
  stop: (projectId: string) => void
  open: (projectId?: string) => void
  stopEverything: () => void
  quit: () => void
}

/**
 * A peça Z do Berrante.
 * - macOS: ícone "template" (preto + alfa; o sistema pinta claro/escuro).
 * - Windows: a área de notificação não pinta template; a peça vai na cor de destaque (azul), visível no claro e no escuro.
 */
function trayIcon(): NativeImage {
  const template = process.platform === 'darwin'
  const size = 36 // 18pt @2x
  const cell = 10
  const piece = [[0, 0], [1, 0], [1, 1], [2, 1]]
  const ox = 3
  const oy = 8
  const buf = Buffer.alloc(size * size * 4)
  for (const [cx, cy] of piece) {
    for (let y = 1; y < cell; y++) {
      for (let x = 1; x < cell; x++) {
        const i = ((oy + cy! * cell + y) * size + (ox + cx! * cell + x)) * 4
        if (!template) {
          // BGRA: #2f8cff
          buf[i] = 0xff
          buf[i + 1] = 0x8c
          buf[i + 2] = 0x2f
        }
        buf[i + 3] = 255 // num template só o alfa importa
      }
    }
  }
  const img = nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 2 })
  if (template) img.setTemplateImage(true)
  return img
}

/** Berrante na barra de menus (macOS) ou na área de notificação (Windows): tocar e recolher cada tropa sem abrir a janela. */
export class BerranteTray {
  private tray: Tray | null = null

  constructor(private readonly deps: TrayDeps) {}

  update(items: TrayProject[]): void {
    if (!this.tray) {
      this.tray = new Tray(trayIcon())
      // Windows: o clique esquerdo não abre o menu sozinho (só o direito); abre nos dois, como no macOS.
      if (process.platform !== 'darwin') this.tray.on('click', () => this.tray?.popUpContextMenu())
    }
    const running = items.reduce((n, i) => n + i.running, 0)
    this.tray.setTitle(running ? ` ${running}` : '')
    this.tray.setToolTip(running ? `Berrante · ${running} processo(s) de pé` : 'Berrante')

    const projects: MenuItemConstructorOptions[] = items.length
      ? items.map(({ project, running: r, total, playing, active }) => ({
          label: `${active ? '●' : '○'}  ${project.name}  ·  ${playing ? 'tocando…' : `${r}/${total} de pé`}`,
          submenu: [
            { label: 'Tocar o berrante', enabled: Boolean(project.plan) && !playing, click: () => this.deps.play(project.id) },
            { label: 'Recolher a boiada', enabled: active, click: () => this.deps.stop(project.id) },
            { type: 'separator' },
            { label: 'Abrir a tropa', click: () => this.deps.open(project.id) }
          ]
        }))
      : [{ label: 'Nenhuma tropa ainda', enabled: false }]

    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Tropas', enabled: false },
        ...projects,
        { type: 'separator' },
        { label: 'Abrir o Berrante', click: () => this.deps.open() },
        { label: 'Recolher todas as tropas', enabled: items.some((i) => i.active), click: this.deps.stopEverything },
        { type: 'separator' },
        { label: 'Sair do Berrante', click: this.deps.quit }
      ])
    )
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
