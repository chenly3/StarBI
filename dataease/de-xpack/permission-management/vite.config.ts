import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = dirname(fileURLToPath(import.meta.url))
const coreFrontendSrcDir = resolve(rootDir, '../../core/core-frontend/src')
const coreVariableLessPath = resolve(coreFrontendSrcDir, 'style/variable.less')
const coreFrontendNodeModulesDir = resolve(rootDir, '../../core/core-frontend/node_modules')

export default defineConfig({
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          hack: `true; @import (reference) "${coreVariableLessPath}";`
        },
        javascriptEnabled: true
      }
    }
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: coreFrontendSrcDir
      },
      {
        find: 'web-storage-cache',
        replacement: resolve(coreFrontendNodeModulesDir, 'web-storage-cache')
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
