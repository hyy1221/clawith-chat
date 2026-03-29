import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ChatSDK',
      fileName: 'index',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['vue', '@open-chat/chat-core'],
      output: {
        globals: {
          vue: 'Vue',
          '@open-chat/chat-core': 'ChatCore'
        }
      }
    }
  }
})
