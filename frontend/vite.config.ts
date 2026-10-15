import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
    // Bez tego nagłówka przycisk Google nie działa na http://localhost (dokumentacja Google).
    headers: { 'Referrer-Policy': 'no-referrer-when-downgrade' },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
