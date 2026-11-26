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

/** Ícone "template" do macOS (preto + alfa; o sistema pinta claro/escuro): a peça Z do Berrante. */
function trayIcon(): NativeImage {
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
        buf[i + 3] = 255 // BGRA: só o alfa importa num template
      }
    }
  }
  const img = nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 2 })
  img.setTemplateImage(true)
  return img
}

/** Berrante na barra de menu: tocar e recolher cada tropa sem abrir a janela. */
export class BerranteTray {
  private tray: Tray | null = null

  constructor(private readonly deps: TrayDeps) {}

  update(items: TrayProject[]): void {
    this.tray ??= new Tray(trayIcon())
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
