import OrganizationManagementPage from './menu/system/org/index.vue'

export const mapping = {
  'L21lbnUvc3lzdGVtL29yZy9pbmRleA==': {
    default: OrganizationManagementPage
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
