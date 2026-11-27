import { app, dialog, shell } from 'electron'

const RELEASES = 'https://github.com/jhonatanffelipe/berrante/releases/latest'

/**
 * Só no app empacotado. Avisa dos jeitos de abrir que deixam o Berrante lento:
 * - versão Intel (x64) num Mac Apple Silicon, rodando pelo Rosetta;
 * - versão x64 num Windows ARM, rodando pela emulação;
 * - macOS: aberto fora de Aplicativos (de dentro do .dmg, de Downloads ou de uma pasta de build).
 * Devolve true quando o app vai reiniciar (movido para Aplicativos) e o boot deve parar.
 */
export async function checkInstall(): Promise<boolean> {
  if (!app.isPackaged) return false

  const isMac = process.platform === 'darwin'
  if (app.runningUnderARM64Translation && !isMac) {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      message: 'Você está usando a versão x64 do Berrante',
      detail: 'Este Windows roda em ARM: a versão x64 funciona pela emulação e fica mais lenta. Baixe o instalador "win-arm64" e instale por cima.',
      buttons: ['Baixar a versão ARM64', 'Continuar assim'],
      defaultId: 0,
      cancelId: 1
    })
    if (response === 0) void shell.openExternal(RELEASES)
  }

  if (!isMac) return false

  if (app.runningUnderARM64Translation) {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      message: 'Você está usando a versão Intel do Berrante',
      detail: 'Este Mac é Apple Silicon: a versão Intel roda pelo Rosetta e fica bem mais lenta. Baixe o instalador "mac-arm64" e substitua o app em Aplicativos.',
      buttons: ['Baixar a versão Apple Silicon', 'Continuar assim'],
      defaultId: 0,
      cancelId: 1
    })
    if (response === 0) void shell.openExternal(RELEASES)
  }

  if (!app.isInApplicationsFolder()) {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      message: 'Mover o Berrante para Aplicativos?',
      detail: 'Aberto de fora de Aplicativos (de dentro do .dmg ou de Downloads), o macOS verifica o app a cada abertura e ele fica lento. O Berrante se move e abre de novo.',
      buttons: ['Mover para Aplicativos', 'Agora não'],
      defaultId: 0,
      cancelId: 1
    })
    if (response === 0) {
      try {
        return app.moveToApplicationsFolder()
      } catch (err) {
        dialog.showErrorBox('Berrante', `Não deu para mover: ${(err as Error).message}. Arraste o app para Aplicativos pelo Finder.`)
      }
    }
  }
  return false
}
