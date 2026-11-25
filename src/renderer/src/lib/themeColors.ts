/** Lê as cores do tema (variáveis CSS) para bibliotecas que exigem string de cor, como o xterm. */
export function themeColor(name: string, alpha = 1): string {
  const triplet = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim()
  const [r, g, b] = triplet.split(/\s+/)
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`
}
