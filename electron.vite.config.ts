import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/** Em dev o react-refresh injeta um script inline e usa WebSocket: relaxa a CSP só no `serve`. */
const devCsp = (): Plugin => ({
  name: 'berrante-dev-csp',
  apply: 'serve',
  transformIndexHtml: (html) =>
    html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'").replace("object-src 'none'", "connect-src 'self' ws://localhost:*; object-src 'none'")
})

const alias = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@main': resolve(__dirname, 'src/main'),
  '@renderer': resolve(__dirname, 'src/renderer/src')
}

export default defineConfig(({ mode }) => {
  // config/.env só fornece valores públicos (o client_id do Device Flow não é segredo).
  const env = loadEnv(mode, resolve(__dirname, 'config'), 'BERRANTE_')

  return {
    main: {
      resolve: { alias },
      define: {
        __GITHUB_CLIENT_ID__: JSON.stringify(env.BERRANTE_GITHUB_CLIENT_ID ?? '')
      }
    },
    preload: {
      resolve: { alias }
    },
    renderer: {
      resolve: { alias },
      plugins: [react(), devCsp()]
    }
  }
})
