import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import type { ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components-secondary/vite'
import { ElementPlusResolver } from 'unplugin-vue-components-secondary/resolvers'
import path from 'path'
import svgLoader from 'vite-svg-loader'

const resolveLocalLicenseGenerator = () => {
  const directCandidates = [
    path.resolve(
      __dirname,
      '../backend/.venv/lib/python3.11/site-packages/sqlbot_xpack/static/license-generator.umd.js'
    ),
    path.resolve(
      __dirname,
      '../backend/.venv/lib/python3.12/site-packages/sqlbot_xpack/static/license-generator.umd.js'
    )
  ]
  for (const candidate of directCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  const venvLibDir = path.resolve(__dirname, '../backend/.venv/lib')
  if (!fs.existsSync(venvLibDir)) {
    return null
  }

  for (const entry of fs.readdirSync(venvLibDir)) {
    const candidate = path.join(
      venvLibDir,
      entry,
      'site-packages/sqlbot_xpack/static/license-generator.umd.js'
    )
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

const serveLocalLicenseGenerator = () => {
  return {
    name: 'serve-local-license-generator',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((
        req: IncomingMessage & { url?: string },
        res: ServerResponse,
        next: (err?: unknown) => void
      ) => {
        const requestPath = req.url?.split('?')[0]
        if (requestPath !== '/xpack_static/license-generator.umd.js') {
          next()
          return
        }

        const localScript = resolveLocalLicenseGenerator()
        if (!localScript) {
          res.statusCode = 404
          res.end('Not Found')
          return
        }

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        fs.createReadStream(localScript).pipe(res)
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  console.info(mode)
  console.info(env)
  return {
    base: './',
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        eslintrc: {
          enabled: false,
        },
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
      svgLoader({
        svgo: false,
        defaultImport: 'component', // or 'raw'
      }),
      serveLocalLicenseGenerator(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            'element-plus-secondary': ['element-plus-secondary'],
          },
        },
      },
    },
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  }
})
