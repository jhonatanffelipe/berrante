import type { Config } from 'tailwindcss'

/** Todas as cores vêm de variáveis CSS (styles/theme.css). Nenhum hex fora de lá. */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        deep: token('deep'),
        darker: token('darker'),
        line: token('line'),
        fg: token('fg'),
        comment: token('comment'),
        cyan: token('cyan'),
        green: token('green'),
        orange: token('orange'),
        pink: token('pink'),
        purple: token('purple'),
        red: token('red'),
        yellow: token('yellow')
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        terminal: ['VT323', 'monospace'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      fontSize: {
        pixel: ['10px', { lineHeight: '16px' }],
        'pixel-lg': ['14px', { lineHeight: '22px' }]
      },
      borderRadius: { none: '0', DEFAULT: '0' },
      spacing: { px2: '2px', px4: '4px' },
      keyframes: {
        'line-clear': {
          '0%': { opacity: '0', transform: 'scaleX(0.2)' },
          '20%': { opacity: '1', transform: 'scaleX(1)' },
          '55%': { filter: 'brightness(2.2)' },
          '100%': { opacity: '0', transform: 'scaleY(0)' }
        },
        'block-drop': {
          '0%': { transform: 'translateY(-12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        blink: { '0%, 49%': { opacity: '1' }, '50%, 100%': { opacity: '0.25' } }
      },
      animation: {
        'line-clear': 'line-clear 1.1s steps(8) forwards',
        'block-drop': 'block-drop 0.25s steps(4) both',
        blink: 'blink 1s steps(1) infinite'
      }
    }
  },
  plugins: []
} satisfies Config
