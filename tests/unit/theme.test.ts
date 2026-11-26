import { describe, expect, it } from 'vitest'
import { ACCENT_NAMES, deriveTheme, isPresetTheme, rgbToHue, hexToRgb, rgbToHex, windowBackground } from '@shared/theme'

const lum = ([r, g, b]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

describe('deriveTheme', () => {
  it.each(ACCENT_NAMES.filter((n) => !isPresetTheme(n)))('%s: fundo escuro tingido com o matiz do destaque', (name) => {
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

  it('Drácula usa a paleta oficial, com ou sem tingir', () => {
    for (const tint of [true, false]) {
      const t = deriveTheme('dracula', tint)
      expect(rgbToHex(t.bg)).toBe('#282a36')
      expect(rgbToHex(t.fg)).toBe('#f8f8f2')
      expect(rgbToHex(t.comment)).toBe('#6272a4')
      expect(rgbToHex(t.accent)).toBe('#bd93f9')
      expect(rgbToHex(t.pink)).toBe('#ff79c6')
      expect(lum(t.darker)).toBeLessThan(lum(t.bg))
      expect(lum(t.deep)).toBeGreaterThan(lum(t.bg))
    }
    expect(windowBackground('dracula', true)).toBe('#282a36')
  })
})
