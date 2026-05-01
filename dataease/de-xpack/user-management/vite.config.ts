import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = dirname(fileURLToPath(import.meta.url))
const coreFrontendSrcDir = resolve(rootDir, '../../core/core-frontend/src')

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: coreFrontendSrcDir
      }
    ]
  },
  build: {
    lib: {
      entry: resolve(rootDir, 'src/index.ts'),
      name: 'DEXPack',
      formats: ['umd'],
      fileName: () => 'DEXPack.umd.js'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})
