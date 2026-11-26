import { app, type BrowserWindow } from 'electron'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MenuCommand } from '@shared/menu'

/**
 * Só em dev: `BERRANTE_SHOTS=/pasta` percorre as telas principais e salva um print de cada uma
 * (usado nos prints do README, sempre com `BERRANTE_USER_DATA` apontando para dados de demonstração).
 * No fim confere o botão "Copiar" (escrita na área de transferência) e recolhe a boiada.
 */
export async function runDevShots(win: BrowserWindow, dir: string, send: (c: MenuCommand) => void, stopEverything: () => Promise<void>): Promise<void> {
  await mkdir(dir, { recursive: true })
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const js = <T>(code: string) => win.webContents.executeJavaScript(code, true) as Promise<T>
  const shot = async (name: string) => writeFile(join(dir, name), (await win.webContents.capturePage()).toPNG())
  const click = (text: string) =>
    js<boolean>(`(() => { const b = [...document.querySelectorAll('button')].find((el) => el.textContent?.trim().toLowerCase() === ${JSON.stringify(text.toLowerCase())}); b?.click(); return Boolean(b) })()`)
  const projectIds = await js<string[]>(`window.berrante.invoke('projects:list').then((r) => r.ok ? r.data.map((p) => p.id) : [])`)
  const first = projectIds[0]
  if (!first) throw new Error('sem tropas de demonstração')

  send({ type: 'project', id: first })
  await wait(1500)
  await shot('01-tropa-parada.png')
  send({ type: 'play' })
  await wait(Number(process.env.BERRANTE_SHOTS_PLAY_MS ?? 40000))
  await shot('02-tropa-boiada.png')
  send({ type: 'tab', tab: 'plano' })
  await wait(1200)
  await shot('03-plano-de-subida.png')
  send({ type: 'tab', tab: 'boiada' })

  send({ type: 'go', view: 'ports' })
  await wait(3500)
  // Filtro "Do Berrante": o print não mostra processos da máquina de quem gerou.
  await js(`(() => { const sel = document.querySelector('select'); if (!sel) return; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, 'berrante'); sel.dispatchEvent(new Event('change', { bubbles: true })) })()`)
  await wait(1500)
  await shot('04-contar-a-boiada.png')

  send({ type: 'go', view: 'repos' })
  await wait(2000)
  await shot('05-repositorios.png')

  send({ type: 'go', view: 'settings' })
  await wait(1500)
  await shot('06-configuracoes.png')

  for (const [label, file] of [['verde-limão', '07-destaque-limao.png'], ['laranja', '08-destaque-laranja.png'], ['rosa', '09-destaque-rosa.png'], ['drácula', '10-tema-dracula.png']] as const) {
    send({ type: 'go', view: 'settings' })
    await wait(800)
    await click(label)
    await wait(800)
    send({ type: 'project', id: first })
    await wait(1500)
    await shot(file)
  }
  await shot('11-tema-dracula-tropa.png')
  send({ type: 'go', view: 'settings' })
  await wait(1200)
  await shot('12-tema-dracula-configuracoes.png')
  await click('azul')

  // Botão "Copiar": a escrita na área de transferência precisa ser permitida pelo processo principal.
  // Conferência pelo pbpaste/pbcopy (macOS): a leitura do clipboard pelo processo principal não é confiável aqui.
  const previous = execFileSync('pbpaste').toString()
  win.focus()
  const probe = `berrante-clipboard-${Date.now()}`
  const error = await js<string | null>(`navigator.clipboard.writeText(${JSON.stringify(probe)}).then(() => null, (e) => String(e))`)
  await wait(300)
  const copied = execFileSync('pbpaste').toString() === probe
  execFileSync('pbcopy', { input: previous })
  await writeFile(join(dir, 'clipboard.json'), JSON.stringify({ copied, error }, null, 2))

  await stopEverything()
  await wait(2000)
  app.quit()
}
