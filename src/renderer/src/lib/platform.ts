/** Sistema em que o Berrante roda (vem do preload; o renderer não tem acesso ao `process`). */
export const platform = window.berrante.platform
export const isMac = platform === 'darwin'
export const isWindows = platform === 'win32'

/** Tecla dos atalhos: ⌘ no macOS, Ctrl+ no Windows. */
export const MOD = isMac ? '⌘' : 'Ctrl+'
