import { describe, expect, it } from 'vitest'
import { ACCENT_NAMES, deriveTheme, rgbToHue, hexToRgb, windowBackground } from '@shared/theme'

const lum = ([r, g, b]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

describe('deriveTheme', () => {
  it.each(ACCENT_NAMES)('%s: fundo escuro tingido com o matiz do destaque', (name) => {
    const t = deriveTheme(name, true)
    expect(lum(t.bg)).toBeLessThan(25)
    expect(lum(t.darker)).toBeLessThan(lum(t.bg))
    expect(lum(t.deep)).toBeGreaterThan(lum(t.bg))
    expect(lum(t.fg)).toBeGreaterThan(230)
    const accentHue = rgbToHue(t.accent)
    expect(Math.abs(rgbToHue(t.line) - accentHue) % 360).toBeLessThan(8)
  })

  it('sem tingir, o fundo é cinza neutro', () => {
    const [r, g, b] = deriveTheme('laranja', false).bg
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('azul gera um fundo azul-marinho quase preto', () => {
    const [r, g, b] = hexToRgb(windowBackground('azul', true))
    expect(b).toBeGreaterThan(r)
    expect(b).toBeLessThan(30)
  })
})
