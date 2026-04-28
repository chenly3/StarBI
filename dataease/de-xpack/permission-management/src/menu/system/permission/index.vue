<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from './useHashRoute'
import MenuPermissionPanel from './MenuPermissionPanel.vue'
import ResourcePermissionPanel from './ResourcePermissionPanel.vue'
import { usePermissionShellStore } from './store'
import '@/views/system/shared/system-setting-page.less'

type PermissionSheet = 'user' | 'resource'

const route = useRoute()
const router = useRouter()
const shell = usePermissionShellStore()

const queryValue = (value: unknown) => (Array.isArray(value) ? value[0] : value)

const resolveSheet = (query: Record<string, unknown>): PermissionSheet => {
  const rawSheet = queryValue(query.sheet)
  if (rawSheet === 'resource') {
    return 'resource'
  }
  const rawMode = queryValue(query.mode)
  if (rawMode === 'by-resource') {
    return 'resource'
  }
  return 'user'
}

const currentSheet = computed<PermissionSheet>(() => resolveSheet(route.query as Record<string, unknown>))

watch(
  () => route.query,
  async query => {
    const normalizedQuery = query as Record<string, unknown>
    const sheet = resolveSheet(normalizedQuery)
    const rawSheet = queryValue(normalizedQuery.sheet)
    const needsSheetNormalization = rawSheet !== sheet

    const defaultMode = sheet === 'resource' ? 'by-resource' : 'by-user'
    const rawMode = queryValue(normalizedQuery.mode)
    const mode = rawMode === 'by-resource' || rawMode === 'by-user' ? rawMode : defaultMode
    const defaultTab = mode === 'by-resource' ? 'menu' : 'resource'
    const rawTab = queryValue(normalizedQuery.tab)
    const tab = rawTab === 'menu' || rawTab === 'resource' ? rawTab : defaultTab

    if (needsSheetNormalization || rawMode !== mode || rawTab !== tab) {
      await router.replace({
        query: {
          ...normalizedQuery,
          sheet,
          mode,
          tab
        }
      })
      return
    }

    await shell.setView(mode, tab)
  },
  { immediate: true }
)

const currentPanel = computed(() => {
  return shell.tab.value === 'menu' ? MenuPermissionPanel : ResourcePermissionPanel
})

const openSheet = async (sheet: PermissionSheet) => {
  const nextQuery: Record<string, unknown> = { ...route.query, sheet }
  delete nextQuery.dialog
  delete nextQuery.mask
  delete nextQuery.datasetId
  delete nextQuery.datasetName
  if (sheet === 'user') {
    nextQuery.mode = 'by-user'
    nextQuery.tab = 'resource'
  } else {
    nextQuery.mode = 'by-resource'
    nextQuery.tab = 'menu'
  }
  await router.replace({ query: nextQuery })
}
</script>

<template>
  <main class="system-setting-page system-setting-standard permission-shell">
    <section class="system-setting-page__content permission-shell__content">
      <header class="system-setting-page__title-row permission-shell__header">
        <h1 class="system-setting-page__title">权限配置</h1>
        <div class="system-setting-tab-nav permission-shell__tabs">
          <button
            type="button"
            class="system-setting-tab permission-shell__tab"
            :class="{ 'is-active': currentSheet === 'user' }"
            @click="openSheet('user')"
          >
            按用户配置
          </button>
          <button
            type="button"
            class="system-setting-tab permission-shell__tab"
            :class="{ 'is-active': currentSheet === 'resource' }"
            @click="openSheet('resource')"
          >
            按资源配置
          </button>
        </div>
      </header>

      <component :is="currentPanel" :show-primary-switch="false" />
    </section>
  </main>
</template>

<style scoped>
.permission-shell {
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
}

.permission-shell__content {
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.permission-shell__tabs {
  margin-left: 2px;
}

.permission-shell__tab {
  min-width: 112px;
}
</style>
