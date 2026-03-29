import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      manifest: false, // use public/manifest.json
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/node_modules/**'],
      },
      devOptions: {
        enabled: false,
      },
      workbox: {
        // fallback to generateSW-like caching via the injectManifest's swSrc
        // Runtime caching is handled in public/sw.js via self.addEventListener('fetch')
        // For API caching, add rules here when switching back to generateSW
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8004',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8004',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    include: ['@open-chat/chat-sdk', '@open-chat/chat-ui', '@open-chat/chat-plugins']
  }
})
