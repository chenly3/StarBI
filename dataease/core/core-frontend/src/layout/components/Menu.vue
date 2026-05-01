<script lang="ts" setup>
import { computed } from 'vue'
import { ElMenu } from 'element-plus-secondary'
import { getCSSVariable } from '@/utils/color'
import router from '@/router'
import { useRoute, useRouter } from 'vue-router_2'
import { isExternal } from '@/utils/validate'
import { useCache } from '@/hooks/web/useCache'
import MenuItem from './MenuItem.vue'
import { useAppearanceStoreWithOut } from '@/store/modules/appearance'
import { resolvePath } from '@/router/establish'
const appearanceStore = useAppearanceStoreWithOut()
const SETTING_MENU_WHITELIST = new Set([
  'parameter',
  'font',
  'user',
  'org',
  'permission',
  'query-config',
  'row-column-permission'
])
type MenuRouteRecord = {
  path: string
  children?: MenuRouteRecord[]
  __resolvedPath?: string
  [key: string]: any
}

const resolveSettingMenuKey = (menuPath: string): string | null => {
  const normalized = menuPath.replace(/^\/+|\/+$/g, '')
  if (!normalized) {
    return null
  }
  const segments = normalized.split('/').filter(Boolean)
  const candidates = segments[0] === 'sys-setting' ? segments.slice(1) : segments
  const firstSegment = candidates[0]
  return firstSegment && SETTING_MENU_WHITELIST.has(firstSegment) ? firstSegment : null
}
const isMenuRouteRecord = (item: MenuRouteRecord | null): item is MenuRouteRecord => item !== null
const joinRoutePath = (basePath: string, targetPath: string) => {
  const normalizedBase = basePath === '/' ? '' : basePath.replace(/\/+$/g, '')
  const normalizedTarget = targetPath.replace(/^\/+/g, '')
  return `${normalizedBase}/${normalizedTarget}` || '/'
}

const SYSTEM_SETTING_TARGET_PATHS: Record<string, string> = {
  parameter: '/sys-setting/parameter',
  font: '/sys-setting/font',
  user: '/sys-setting/user',
  org: '/sys-setting/org',
  permission: '/sys-setting/permission',
  'query-config': '/sys-setting/query-config',
  'row-column-permission': '/sys-setting/row-column-permission'
}

const tempColor = computed(() => {
  return {
    '--temp-color':
      (appearanceStore.themeColor === 'custom' ? appearanceStore.customColor : getCSSVariable()) +
      '1A'
  }
})
defineProps({
  collapse: Boolean
})

const route = useRoute()
const { wsCache } = useCache('localStorage')
const routeRouter = useRouter()
const isSystemSettingRoute = computed(
  () =>
    route.path === '/sys-setting' ||
    route.path.startsWith('/sys-setting/') ||
    route.path === '/starbi/query-config' ||
    route.path.startsWith('/starbi/query-config/')
)
const path = computed(() => route.matched[0]?.path)
const rawMenuList = computed<MenuRouteRecord[]>(() => {
  if (isSystemSettingRoute.value) {
    const menuMap = new Map<string, MenuRouteRecord>()
    router
      .getRoutes()
      .filter(item => item.path.startsWith('/sys-setting/'))
      .forEach(item => {
        const menuKey = resolveSettingMenuKey(item.path)
        if (!menuKey || menuMap.has(menuKey)) {
          return
        }
        menuMap.set(menuKey, {
          ...(item as unknown as MenuRouteRecord),
          path: menuKey,
          __resolvedPath: SYSTEM_SETTING_TARGET_PATHS[menuKey] || item.path,
          children: []
        })
      })
    return Array.from(menuMap.values())
  }
  return (route.matched[0]?.children || []) as MenuRouteRecord[]
})
const systemSettingMenuTargets = computed(() => {
  const result = new Map<string, MenuRouteRecord>()
  rawMenuList.value.forEach(item => {
    const menuKey = resolveSettingMenuKey(String(item?.path || ''))
    if (menuKey && !result.has(menuKey)) {
      result.set(menuKey, {
        ...item,
        path: menuKey,
        __resolvedPath: SYSTEM_SETTING_TARGET_PATHS[menuKey] || item.__resolvedPath
      })
    }
  })
  return result
})
const menuList = computed(() => {
  if (!isSystemSettingRoute.value) {
    return rawMenuList.value
  }
  const items = rawMenuList.value
    .map(item => {
      const menuKey = resolveSettingMenuKey(String(item?.path || ''))
      if (!menuKey) {
        return null
      }
      return {
        ...item,
        path: menuKey,
        __resolvedPath: SYSTEM_SETTING_TARGET_PATHS[menuKey] || item.__resolvedPath,
        children: []
      }
    })
    .filter(isMenuRouteRecord)

  return items
})

const activeIndex = computed(() => {
  if (
    route.path === '/starbi/query-config' ||
    route.path.startsWith('/starbi/query-config/') ||
    route.path === '/sys-setting/query-config' ||
    route.path.startsWith('/sys-setting/query-config/')
  ) {
    return 'query-config'
  }
  if (
    route.path === '/sys-setting/row-column-permission' ||
    route.path.startsWith('/sys-setting/row-column-permission/')
  ) {
    return 'row-column-permission'
  }
  return resolveSettingMenuKey(route.path) || route.path.split('/').pop() || ''
})
const menuSelect = (index: string, indexPath: string[]) => {
  if (index.startsWith('/')) {
    routeRouter.push(index)
    return
  }
  if (isSystemSettingRoute.value && SYSTEM_SETTING_TARGET_PATHS[index]) {
    routeRouter.push({ path: SYSTEM_SETTING_TARGET_PATHS[index], query: {} })
    return
  }

  const targetMenu = isSystemSettingRoute.value
    ? systemSettingMenuTargets.value.get(index)
    : (menuList.value as MenuRouteRecord[]).find(
        item => item.path === indexPath[0] || item.path === index
      )
  const resolved =
    targetMenu?.__resolvedPath ||
    (targetMenu ? resolvePath(targetMenu as any) : indexPath.join('/'))

  if (isExternal(resolved)) {
    const openType = wsCache.get('open-backend') === '1' ? '_self' : '_blank'
    window.open(resolved, openType)
  } else {
    if (resolved.startsWith('/')) {
      routeRouter.push(resolved)
      return
    }
    const basePath = isSystemSettingRoute.value ? '/sys-setting' : path.value || ''
    routeRouter.push(joinRoutePath(basePath, resolved))
  }
}
</script>

<template>
  <el-menu
    :style="tempColor"
    @select="menuSelect"
    :default-active="activeIndex"
    class="el-menu-vertical"
    :collapse="collapse"
  >
    <MenuItem v-for="menu in menuList" :key="menu.path" :menu="menu"></MenuItem>
  </el-menu>
</template>

<style lang="less" scoped>
.ed-menu-vertical:not(.ed-menu--collapse) {
  width: 100%;
  min-height: 400px;
}

.ed-menu {
  border: none;
  padding: 12px 10px;
  background: #fff;
  :deep(.ed-menu-item),
  :deep(.ed-sub-menu__title) {
    height: 44px;
    margin-bottom: 5px;
    border-radius: 11px;
    font-size: 15px;
    font-weight: 600;
    color: #27364f;
    transition: background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
  }
  :deep(.ed-menu-item:not(.is-active):hover),
  :deep(.ed-sub-menu__title:hover) {
    background-color: #f1f6ff !important;
  }
  :deep(.ed-menu-item .ed-icon),
  :deep(.ed-sub-menu__title .ed-icon) {
    margin-right: 12px;
    font-size: 17px;
    color: #566780;
  }
  :deep(.ed-menu-item.is-active) {
    background: #eaf2ff;
    color: #155eef;
    box-shadow: inset 3px 0 0 #2f6bff, 0 1px 3px rgba(47, 107, 255, 0.08);
  }
  :deep(.ed-menu-item.is-active .ed-icon) {
    color: #155eef;
  }
  :deep(.ed-sub-menu.is-active .ed-sub-menu__title) {
    background: #edf4ff;
    color: #155eef;
    box-shadow: inset 3px 0 0 #2f6bff;
  }
  :deep(.ed-sub-menu.is-active .ed-sub-menu__title .ed-icon) {
    color: #155eef;
  }
  :deep(.ed-sub-menu) {
    margin: 0;
  }
}
</style>
