import UserManagementPage from './menu/system/user/index.vue'

export const mapping = {
  'L21lbnUvc3lzdGVtL3VzZXIvaW5kZXg=': {
    default: UserManagementPage
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
