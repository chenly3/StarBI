import PermissionPage from './menu/system/permission/index.vue'

export const mapping = {
  'L21lbnUvc3lzdGVtL3Blcm1pc3Npb24vaW5kZXg=': {
    default: PermissionPage
  }
}

const globalWindow = window as Window & {
  DEXPack?: {
    mapping?: Record<string, unknown>
  }
}

globalWindow.DEXPack = {
  ...(globalWindow.DEXPack || {}),
  mapping: {
    ...(globalWindow.DEXPack?.mapping || {}),
    ...mapping
  }
}
