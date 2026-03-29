import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ChatCore',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', '@open-chat/chat-utils'],
      output: {
        globals: {
          vue: 'Vue',
          '@open-chat/chat-utils': 'ChatUtils'
        }
      }
    }
  }
})
