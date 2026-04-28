import fs from 'fs'
import path from 'path'
import common from './config/common';
import base from './config/base';
import distributed from './config/distributed';
import dev from './config/dev';
import lib from './config/lib';
import pages from './config/pages';
import { defineConfig, mergeConfig } from 'vite'

const userManagementBundlePath = path.resolve(
  __dirname,
  '../../de-xpack/user-management/dist/DEXPack.umd.js'
)
const userManagementStylePath = path.resolve(
  __dirname,
  '../../de-xpack/user-management/dist/style.css'
)
const organizationManagementBundlePath = path.resolve(
  __dirname,
  '../../de-xpack/organization-management/dist/DEXPack.umd.js'
)
const organizationManagementStylePath = path.resolve(
  __dirname,
  '../../de-xpack/organization-management/dist/style.css'
)

const localDexPackPlugin = () => ({
  name: 'local-dexpack-bundles',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (
        req.url === '/DEXPack.umd.js' ||
        req.url === '/api/DEXPack.umd.js' ||
        req.url === '/de2api/DEXPack.umd.js'
      ) {
        const availableBundles: string[] = []
        const styleBootstrap: string[] = []
        if (fs.existsSync(userManagementBundlePath)) {
          availableBundles.push(fs.readFileSync(userManagementBundlePath, 'utf8'))
          if (fs.existsSync(userManagementStylePath)) {
            styleBootstrap.push(
              "(()=>{if(!document.querySelector('link[data-de-user-management-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/api/DEXPack.user-management.css';link.setAttribute('data-de-user-management-style','1');document.head.appendChild(link)}})();\n"
            )
          }
        }
        if (fs.existsSync(organizationManagementBundlePath)) {
          availableBundles.push(fs.readFileSync(organizationManagementBundlePath, 'utf8'))
          if (fs.existsSync(organizationManagementStylePath)) {
            styleBootstrap.push(
              "(()=>{if(!document.querySelector('link[data-de-organization-management-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/api/DEXPack.organization-management.css';link.setAttribute('data-de-organization-management-style','1');document.head.appendChild(link)}})();\n"
            )
          }
        }
        if (!availableBundles.length) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(
            'Local DEXPack bundle not found. Build de-xpack/user-management and/or de-xpack/organization-management first.'
          )
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.end(styleBootstrap.join('') + availableBundles.join('\n'))
        return
      }

      if (
        req.url === '/DEXPack.user-management.css' ||
        req.url === '/api/DEXPack.user-management.css' ||
        req.url === '/de2api/DEXPack.user-management.css'
      ) {
        if (!fs.existsSync(userManagementStylePath)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('Local DEXPack style not found. Build de-xpack/user-management first.')
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/css; charset=utf-8')
        res.end(fs.readFileSync(userManagementStylePath, 'utf8'))
        return
      }

      if (
        req.url === '/DEXPack.organization-management.css' ||
        req.url === '/api/DEXPack.organization-management.css' ||
        req.url === '/de2api/DEXPack.organization-management.css'
      ) {
        if (!fs.existsSync(organizationManagementStylePath)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(
            'Local DEXPack style not found. Build de-xpack/organization-management first.'
          )
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/css; charset=utf-8')
        res.end(fs.readFileSync(organizationManagementStylePath, 'utf8'))
        return
      }

      next()
    })
  }
})

export default defineConfig(({mode}) => {
  if (mode === 'dev') {
    const devConfig = mergeConfig(common , mergeConfig(dev, pages))
    const plugins = devConfig.plugins || []
    return {
      ...devConfig,
      plugins: [...plugins, localDexPackPlugin()]
    }
  }

  if (mode === 'lib') {
    return mergeConfig(common , lib)
  }
  if (mode === 'distributed') {
    return mergeConfig(common, mergeConfig(distributed, pages))
  }

  return mergeConfig(common, mergeConfig(base, pages))
})
