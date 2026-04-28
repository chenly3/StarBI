import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type SystemSettingWidthBucket = 'compact' | 'standard' | 'wide'
export type SystemSettingMenuMode = 'expanded' | 'floating'

const windowWidth = ref(typeof window === 'undefined' ? 1920 : window.innerWidth)

const onResize = () => {
  windowWidth.value = window.innerWidth
}

export const useSystemSettingAdaptive = () => {
  onMounted(() => window.addEventListener('resize', onResize))
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))

  const widthBucket = computed<SystemSettingWidthBucket>(() => {
    if (windowWidth.value >= 1920) return 'wide'
    if (windowWidth.value >= 1360) return 'standard'
    return 'compact'
  })

  const sidebarWidth = computed(() => {
    if (widthBucket.value === 'wide') return 228
    if (widthBucket.value === 'standard') return 220
    return 208
  })

  const menuMode = computed<SystemSettingMenuMode>(() => {
    return windowWidth.value - sidebarWidth.value < 1060 ? 'floating' : 'expanded'
  })

  const contentPaddingClass = computed(() => `system-setting-${widthBucket.value}`)

  return {
    widthBucket,
    menuMode,
    sidebarWidth,
    contentPaddingClass
  }
}
