import { defineStore } from 'pinia'
import { routes } from '@/router'

import { generateRoutesFn2 } from '@/router/establish'
import { store } from '../index'
import { cloneDeep } from 'lodash-es'
import NotFoundPage from '@/views/404/index.vue'

export interface PermissionState {
  routers: AppRouteRecordRaw[]
  addRouters: AppRouteRecordRaw[]
  isAddRouters: boolean
  currentPath: string
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    routers: [],
    addRouters: [],
    isAddRouters: false,
    currentPath: ''
  }),
  getters: {
    getRouters(): AppRouteRecordRaw[] {
      return this.routers
    },
    getRoutersNotHidden(): AppRouteRecordRaw[] {
      return this.routers.filter(ele => !ele.hidden)
    },
    getAddRouters(): AppRouteRecordRaw[] {
      return cloneDeep(this.addRouters)
    },
    getIsAddRouters(): boolean {
      return this.isAddRouters
    },
    getCurrentPath(): boolean {
      return this.currentPath
    }
  },
  actions: {
    clear() {
      this.routers = cloneDeep(routes)
      this.addRouters = []
      this.isAddRouters = false
      this.currentPath = ''
    },
    generateRoutes(routers?: AppCustomRouteRecordRaw[] | string[]): Promise<unknown> {
      return new Promise<void>(resolve => {
        let routerMap: AppRouteRecordRaw[] = []
        routerMap = generateRoutesFn2(routers as AppCustomRouteRecordRaw[]) || []

        this.addRouters = routerMap.concat([
          {
            path: '/:catchAll(.*)',
            component: NotFoundPage,
            meta: {
              hidden: true
            }
          }
        ])
        // 渲染菜单的所有路由
        this.routers = cloneDeep(routes).concat(routerMap)
        resolve()
      })
    },
    setCurrentPath(currentPath: string): void {
      this.currentPath = currentPath
    },
    setIsAddRouters(state: boolean): void {
      this.isAddRouters = state
    }
  }
})

export const usePermissionStoreWithOut = () => {
  return usePermissionStore(store)
}

const SYSTEM_ADMIN_SETTING_PATHS = [
  '/sys-setting/parameter',
  '/sys-setting/font',
  '/sys-setting/user',
  '/sys-setting/org',
  '/sys-setting/permission',
  '/sys-setting/row-column-permission'
]

const isAdminUser = () => {
  try {
    const raw = window.localStorage.getItem('user.uid')
    if (!raw) {
      return false
    }
    const outer = JSON.parse(raw) as { v?: string }
    const uid = typeof outer?.v === 'string' ? JSON.parse(outer.v) : outer?.v
    return String(uid) === '1'
  } catch {
    return false
  }
}

export const pathValid = path => {
  if (
    path?.startsWith('/prototype/permission') ||
    path?.startsWith('/sqlbotnew') ||
    path?.startsWith('/sqlbot') ||
    path?.startsWith('/dashboard') ||
    path?.startsWith('/dvCanvas') ||
    path?.startsWith('/preview') ||
    path?.startsWith('/previewShow') ||
    path?.startsWith('/dashboardPreview') ||
    path?.startsWith('/chart') ||
    path?.startsWith('/query-config-prototype') ||
    path?.startsWith('/starbi/query-config') ||
    path?.startsWith('/sys-setting/query-config') ||
    path?.startsWith('/menu/system/user') ||
    path?.startsWith('/starbi/system-user')
  ) {
    return true
  }
  if (SYSTEM_ADMIN_SETTING_PATHS.some(item => path === item || path?.startsWith(`${item}/`))) {
    return isAdminUser()
  }
  if (path?.startsWith('/dataset-form')) {
    path = '/data/dataset'
  }
  const permissionStore = usePermissionStore(store)
  const routers = permissionStore.getRouters
  const temp = path.startsWith('/') ? path.substr(1) : path
  const locations = temp.split('/')
  if (locations.length === 0) {
    return false
  }

  return hasCurrentRouter(locations, routers, 0)
}
/**
 * 递归验证every level
 * @param {*} locations
 * @param {*} routers
 * @param {*} index
 * @returns
 */
const hasCurrentRouter = (locations, routers, index) => {
  if (!routers?.length) {
    return false
  }
  const location = locations[index]
  let kids = []
  const isvalid = routers.some(router => {
    kids = router.children
    return router.path === location || '/' + location === router.path
  })

  if (isvalid && index < locations.length - 1) {
    return hasCurrentRouter(locations, kids, index + 1)
  }
  return isvalid
}

export const getFirstAuthMenu = () => {
  const permissionStore = usePermissionStore(store)
  const routers = permissionStore.getRouters
  const nodePathArray = []
  getPathway(routers, nodePathArray)
  if (nodePathArray.length) {
    nodePathArray.reverse()
    return nodePathArray.join('/')
  }
  return null
}

const getPathway = (tree, nodePathArray) => {
  for (let index = 0; index < tree.length; index++) {
    if (tree[index].children) {
      const endRecursiveLoop = getPathway(tree[index].children, nodePathArray)
      if (endRecursiveLoop) {
        nodePathArray.push(tree[index].path)
        return true
      }
    }
    if (!tree[index].children?.length && !tree[index].hidden) {
      nodePathArray.push(tree[index].path)
      return true
    }
  }
}
