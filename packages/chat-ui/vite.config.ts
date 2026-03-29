import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ChatUI',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', '@open-chat/chat-sdk'],
      output: {
        globals: {
          vue: 'Vue',
          '@open-chat/chat-sdk': 'ChatSDK'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
