import router from './router'
import { useUserStoreWithOut } from '@/store/modules/user'
import { useAppStoreWithOut } from '@/store/modules/app'
import type { RouteRecordRaw } from 'vue-router_2'
import { getDefaultSettings } from '@/api/common'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePermissionStoreWithOut, pathValid, getFirstAuthMenu } from '@/store/modules/permission'
import { usePageLoading } from '@/hooks/web/usePageLoading'
import { getRoleRouters } from '@/api/common'
import { useCache } from '@/hooks/web/useCache'
import { isMobile, checkPlatform, isLarkPlatform, isPlatformClient } from '@/utils/utils'
import { interactiveStoreWithOut } from '@/store/modules/interactive'
import { useAppearanceStoreWithOut } from '@/store/modules/appearance'
import { useEmbedded } from '@/store/modules/embedded'
import { useLoading } from '@/hooks/web/useLoading'
import { ElMessageBox } from 'element-plus-secondary'
const appearanceStore = useAppearanceStoreWithOut()
const { wsCache } = useCache()
const { wsCache: sessionCache } = useCache('sessionStorage')
const permissionStore = usePermissionStoreWithOut()
const interactiveStore = interactiveStoreWithOut()
const userStore = useUserStoreWithOut()
const appStore = useAppStoreWithOut()

const { start, done } = useNProgress()
const { open } = useLoading()
const { loadStart, loadDone } = usePageLoading()

const whiteList = [
  '/login',
  '/de-link',
  '/chart-view',
  '/admin-login',
  '/401',
  '/query-config-prototype',
  '/sys-setting/query-config'
] // 不重定向白名单
const embeddedWindowWhiteList = ['/dvCanvas', '/dashboard', '/preview', '/dataset-embedded-form']
const embeddedRouteWhiteList = ['/dataset-embedded', '/dataset-form', '/dataset-embedded-form']
const hiddenRouteWhiteList = [
  '/dashboard',
  '/dvCanvas',
  '/chart',
  '/previewShow',
  '/dashboardPreview',
  '/preview'
]
const LOGIN_REDIRECT_GUARD_KEY = 'starbi-login-redirect-guard'
const LOGIN_REDIRECT_GUARD_TTL = 15 * 1000

type LoginRedirectGuard = {
  path: string
  createdAt: number
}

const parseRedirectQuery = (search: string) => {
  const params = new URLSearchParams(search)
  const query: Record<string, string | string[]> = {}
  params.forEach((value, key) => {
    const current = query[key]
    if (current === undefined) {
      query[key] = value
      return
    }
    if (Array.isArray(current)) {
      current.push(value)
      return
    }
    query[key] = [current, value]
  })
  return query
}

const normalizeRedirectPath = (target: unknown, fallback = '/workbranch/index') => {
  if (typeof target !== 'string' || !target) {
    return fallback
  }
  try {
    return decodeURIComponent(target)
  } catch {
    return target
  }
}

const buildLoginRedirectPath = (target: string) => {
  return `/login?redirect=${encodeURIComponent(target)}`
}

const toRedirectLocation = (target: unknown, fallback = '/workbranch/index') => {
  const normalized = normalizeRedirectPath(target, fallback)
  const [rawPath, rawSearch = ''] = normalized.split('?')
  return {
    path: rawPath || fallback,
    query: parseRedirectQuery(rawSearch)
  }
}

const readLoginRedirectGuard = (): LoginRedirectGuard | null => {
  const guard = sessionCache.get(LOGIN_REDIRECT_GUARD_KEY) as LoginRedirectGuard | null
  if (!guard?.path || !guard?.createdAt) {
    sessionCache.delete(LOGIN_REDIRECT_GUARD_KEY)
    return null
  }
  if (Date.now() - guard.createdAt > LOGIN_REDIRECT_GUARD_TTL) {
    sessionCache.delete(LOGIN_REDIRECT_GUARD_KEY)
    return null
  }
  return guard
}

const clearLoginRedirectGuard = () => {
  sessionCache.delete(LOGIN_REDIRECT_GUARD_KEY)
}

const matchesLoginRedirectGuard = (targetPath: string, currentPath: string) => {
  if (currentPath === targetPath) {
    return true
  }
  if (
    targetPath === '/sys-setting/query-config' &&
    currentPath.startsWith('/sys-setting/query-config/')
  ) {
    return true
  }
  return false
}

const ensureQueryConfigRoute = () => {
  const sysSettingRoute = router.getRoutes().find(route => route.path === '/sys-setting')
  if (!sysSettingRoute?.name) {
    return
  }

  const exists = router.getRoutes().some(route => route.path === '/sys-setting/query-config')
  if (exists) {
    return
  }

  router.addRoute(String(sysSettingRoute.name), {
    path: 'query-config',
    name: 'query-config',
    hidden: false,
    meta: {
      title: '问数配置',
      icon: 'sys-parameter'
    },
    component: () => import('@/views/system/query-config/index.vue')
  } as unknown as RouteRecordRaw)
}

router.beforeEach(async (to, from, next) => {
  if (to.path === '/query-config') {
    next({
      path: '/sys-setting/query-config',
      query: to.query,
      replace: true
    })
    return
  }
  if (['/chart-view'].includes(to.path) || to.path.startsWith('/de-link/')) {
    open()
  }
  start()
  loadStart()
  const platform = checkPlatform()
  let isDesktop = wsCache.get('app.desktop')
  if (isDesktop === null) {
    await appStore.setAppModel()
    isDesktop = appStore.getDesktop
  }
  if (isMobile() && !['/chart-view'].includes(to.path)) {
    done()
    loadDone()
    if (to.name === 'link') {
      let linkQuery = ''
      if (Object.keys(to.query)) {
        const tempQuery = Object.keys(to.query)
          .map(key => key + '=' + to.query[key])
          .join('&')
        if (tempQuery) {
          linkQuery = '?' + tempQuery
        }
      }
      let pathname = window.location.pathname
      pathname = pathname.replace('casbi/', '')
      pathname = pathname.replace('oidc/', '')
      pathname = pathname.substring(0, pathname.length - 1)
      const prefix = window.origin + pathname
      let toPath = to.fullPath
      if (toPath.includes('?')) {
        toPath = to.fullPath.substring(0, to.fullPath.lastIndexOf('?'))
      }
      window.location.href = (prefix + '/mobile.html#' + toPath + linkQuery).replace(/\+/g, '%2B')
    } else if (
      wsCache.get('user.token') ||
      isDesktop ||
      (!isPlatformClient() && !isLarkPlatform())
    ) {
      let pathname = window.location.pathname
      pathname = pathname.substring(0, pathname.length - 1)
      let url = window.origin + pathname + '/mobile.html#/index'
      if (location.hash?.startsWith('#/preview')) {
        url = window.origin + pathname + '/mobile.html' + location.hash
      }
      if (window.location.search) {
        url += window.location.search
      }
      window.location.href = url
    }
  }
  await appearanceStore.setAppearance()
  await appearanceStore.setFontList()
  const defaultSort = await getDefaultSettings()
  wsCache.set('TreeSort-backend', defaultSort['basic.defaultSort'] ?? '1')
  wsCache.set('open-backend', defaultSort['basic.defaultOpen'] ?? '0')
  if ((wsCache.get('user.token') || isDesktop) && !to.path.startsWith('/de-link/')) {
    if (!userStore.getUid) {
      await userStore.setUser()
    }
    const loginRedirectGuard = readLoginRedirectGuard()
    if (
      loginRedirectGuard &&
      to.path === '/sqlbotnew' &&
      from.path &&
      matchesLoginRedirectGuard(loginRedirectGuard.path, from.path)
    ) {
      next({
        path: loginRedirectGuard.path,
        replace: true
      })
      return
    }
    if (loginRedirectGuard && !matchesLoginRedirectGuard(loginRedirectGuard.path, to.path)) {
      clearLoginRedirectGuard()
    }
    if (to.path === '/login') {
      next({ path: '/workbranch/index' })
    } else {
      permissionStore.setCurrentPath(to.path)
      if (permissionStore.getIsAddRouters) {
        let str = ''
        const hasCurrentQuery = to.fullPath.includes('?') || Object.keys(to.query || {}).length > 0
        if (
          !hasCurrentQuery &&
          ((from.query.redirect as string) || '?').split('?')[0] === to.path
        ) {
          str = ((window.location.hash as string) || '?').split('?').reverse()[0]
          if (!str.includes('=') || str.includes('redirect=') || str.includes('#/')) {
            str = ''
          }
        }
        if (str) {
          to.fullPath += '?' + str
          to.query = str.split('&').reduce((pre, itx) => {
            const [key, val] = itx.split('=')
            pre[key] = val
            return pre
          }, {})
        }
        if (
          !hiddenRouteWhiteList.includes(to.path) &&
          !pathValid(to.path) &&
          to.path !== '/404' &&
          !to.path.startsWith('/de-link')
        ) {
          if (to.path.startsWith('/sys-setting')) {
            await noAdminPermission()
          }
          const firstPath = getFirstAuthMenu()
          next({ path: firstPath || '/404' })
          return
        }
        next()
        return
      }

      let roleRouters = (await getRoleRouters()) || []
      if (isDesktop) {
        roleRouters = roleRouters.filter(item => item.name !== 'system')
      }
      const routers: any[] = roleRouters as AppCustomRouteRecordRaw[]
      routers.forEach(item => (item['top'] = true))
      await permissionStore.generateRoutes(routers as AppCustomRouteRecordRaw[])

      permissionStore.getAddRouters.forEach(route => {
        router.addRoute(route as unknown as RouteRecordRaw) // 动态添加可访问路由表
      })
      ensureQueryConfigRoute()

      const redirect = normalizeRedirectPath(from.query.redirect || to.fullPath || to.path)
      const nextData =
        to.fullPath === redirect ? { ...to, replace: true } : toRedirectLocation(redirect)

      permissionStore.setIsAddRouters(true)
      await interactiveStore.initInteractive(true)

      if (
        !hiddenRouteWhiteList.includes(to.path) &&
        !pathValid(to.path) &&
        to.path !== '/404' &&
        !to.path.startsWith('/de-link')
      ) {
        if (to.path.startsWith('/sys-setting')) {
          await noAdminPermission()
        }
        const firstPath = getFirstAuthMenu()
        next({ path: firstPath || '/404' })
        return
      }
      next(nextData)
    }
  } else {
    const embeddedStore = useEmbedded()
    if (
      embeddedStore.getToken &&
      appStore.getIsIframe &&
      embeddedRouteWhiteList.includes(to.path)
    ) {
      if (to.path.includes('/dataset-form')) {
        next({ path: '/dataset-embedded-form', query: to.query })
        return
      }
      permissionStore.setCurrentPath(to.path)
      next()
    } else if (
      (!platform && embeddedWindowWhiteList.includes(to.path)) ||
      whiteList.includes(to.path) ||
      to.path.startsWith('/de-link/')
    ) {
      await appearanceStore.setFontList()
      permissionStore.setCurrentPath(to.path)
      next()
    } else {
      next(buildLoginRedirectPath(to.fullPath || to.path)) // 否则全部重定向到登录页
    }
  }
})
const noAdminPermission = async () => {
  const promise = new Promise<void>((resolve, reject) => {
    ElMessageBox.confirm('当前页面仅对 admin 开放, 即将跳转首页', {
      confirmButtonType: 'primary',
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '',
      autofocus: false,
      showCancelButton: false,
      showClose: false
    })
      .then(() => {
        resolve()
      })
      .catch(() => {
        reject()
      })
  })
  return Promise.race([
    promise,
    new Promise<void>(resolve => {
      setTimeout(() => {
        ElMessageBox.close()
        resolve()
      }, 3000)
    })
  ])
}
router.afterEach(() => {
  done()
  loadDone()
})
