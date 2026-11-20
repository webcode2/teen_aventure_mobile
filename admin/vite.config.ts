import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// Node 25+ ships a global `localStorage` that hides jsdom's in tests. Turn it off where Node knows the flag.
const NO_NODE_WEBSTORAGE = '--no-experimental-webstorage'
const testExecArgv = process.allowedNodeEnvironmentFlags.has(NO_NODE_WEBSTORAGE) ? [NO_NODE_WEBSTORAGE] : []

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Admin SPA calls `/api/*` same-origin; forward to Fastify in dev.
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    execArgv: testExecArgv,
  },
})
