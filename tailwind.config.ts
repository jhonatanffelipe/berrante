import type { Config } from 'tailwindcss'

/** Cores vêm de variáveis CSS geradas por src/shared/theme.ts (destaque + fundo tingido). */
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
        accent: token('accent'),
        'on-accent': token('on-accent'),
        cyan: token('cyan'),
        green: token('green'),
        orange: token('orange'),
        pink: token('pink'),
        purple: token('purple'),
        red: token('red'),
        yellow: token('yellow')
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace']
      },
      borderRadius: { DEFAULT: '6px', sm: '3px', md: '8px', lg: '12px' },
      keyframes: {
        'line-clear': {
          '0%': { opacity: '0', transform: 'scaleX(0.2)' },
          '20%': { opacity: '1', transform: 'scaleX(1)' },
          '55%': { filter: 'brightness(2.2)' },
          '100%': { opacity: '0', transform: 'scaleY(0)' }
        },
        'block-drop': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        blink: { '0%, 49%': { opacity: '1' }, '50%, 100%': { opacity: '0.25' } }
      },
      animation: {
        'line-clear': 'line-clear 1.1s steps(8) forwards',
        'block-drop': 'block-drop 0.22s steps(4) both',
        blink: 'blink 1s steps(1) infinite'
      }
    }
  },
  plugins: []
} satisfies Config
