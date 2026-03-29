import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
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
