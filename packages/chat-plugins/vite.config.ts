import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ChatPlugins',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['@open-chat/chat-core'],
      output: {
        globals: {
          '@open-chat/chat-core': 'ChatCore'
        }
      }
    }
  }
})
