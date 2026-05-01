import fs from 'fs'
import path from 'path'
import { resolve } from 'path'
import Vue from '@vitejs/plugin-vue'
import eslintPlugin from 'vite-plugin-eslint'
import VueJsx from '@vitejs/plugin-vue-jsx'
import viteStylelint from 'vite-plugin-stylelint'
import {
  createStyleImportPlugin,
  ElementPlusSecondaryResolve
} from 'vite-plugin-style-import-secondary'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import svgLoader from 'vite-svg-loader'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components-secondary/vite'
import { ElementPlusResolver } from 'unplugin-vue-components-secondary/resolvers'
const root = process.cwd()
const enableBuildLint = process.env.STARBI_VITE_LINT !== 'false'
const elementPlusSecondaryTypesPath = 'element-plus-secondary/es/utils/types.mjs'
const elementPlusSecondaryTypesFilter = /element-plus-secondary\/es\/utils\/types\.mjs$/

export function pathResolve(dir: string) {
  return resolve(root, '.', dir)
}

const patchElementPlusSecondaryTypesCode = (code: string) =>
  code
    .replace("import { inject } from 'vue';\n", '')
    .replace('const customStyle = inject("$custom-style-filter", {});', 'const customStyle = {};')

const elementPlusSecondaryTypesPatch = () => ({
  name: 'patch-element-plus-secondary-types-inject',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.includes(elementPlusSecondaryTypesPath)) {
      return null
    }

    return patchElementPlusSecondaryTypesCode(code)
  }
})

export default {
  base: './',
  plugins: [
    elementPlusSecondaryTypesPatch(),
    Vue(),
    svgLoader({
      svgo: false,
      defaultImport: 'component' // or 'raw'
    }),
    VueJsx(),
    createStyleImportPlugin({
      resolves: [ElementPlusSecondaryResolve()],
      libs: [
        {
          libraryName: 'element-plus-secondary',
          esModule: true,
          resolveStyle: name => {
            return `element-plus-secondary/es/components/${name.substring(3)}/style/css`
          }
        }
      ]
    }),
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    }),
    VueI18nPlugin({
      runtimeOnly: false,
      compositionOnly: true,
      include: [resolve(__dirname, 'src/locales/**')]
    }),
    ...(enableBuildLint
      ? [
          eslintPlugin({
            cache: false,
            include: [
              'src/**/*.ts',
              'src/**/*.tsx',
              'src/**/*.js',
              'src/**/*.vue',
              'src/*.ts',
              'src/*.js',
              'src/*.vue'
            ]
          }),
          viteStylelint()
        ]
      : [])
  ],
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          hack: `true; @import (reference) "${path.resolve('src/style/variable.less')}";`
        },
        javascriptEnabled: true
      }
    }
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.less', '.css'],
    alias: [
      {
        find: '@',
        replacement: `${pathResolve('src')}`
      },
      {
        find: 'vue-router_2',
        replacement: path.resolve(root, 'node_modules/vue-router_2')
      },
      {
        find: 'web-storage-cache',
        replacement: path.resolve(root, 'node_modules/web-storage-cache')
      }
    ]
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: 'patch-element-plus-secondary-types-inject',
          setup(build) {
            build.onLoad({ filter: elementPlusSecondaryTypesFilter }, args => {
              return {
                contents: patchElementPlusSecondaryTypesCode(fs.readFileSync(args.path, 'utf8')),
                loader: 'js'
              }
            })
          }
        }
      ]
    },
    include: [
      'vue',
      'vue-router',
      'vue-router_2',
      'vue-types',
      'element-plus-secondary/es/locale/lang/zh-cn',
      'element-plus-secondary/es/locale/lang/en',
      '@vueuse/core',
      'axios'
    ]
  }
}
