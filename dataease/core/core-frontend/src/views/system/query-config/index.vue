<template>
  <main class="system-setting-page system-setting-standard general-config-page">
    <section class="system-setting-page__content general-config-page__content">
      <header class="system-setting-page__title-row">
        <h1 class="system-setting-page__title">{{ t('starbi.query_config_title') }}</h1>
        <div
          class="system-setting-tab-nav general-config-nav"
          role="tablist"
          :aria-label="t('starbi.query_config_title')"
        >
          <button
            v-for="tab in tabs"
            :key="tab.name"
            class="system-setting-tab general-config-tab"
            :class="{ 'is-active': tab.name === currentTab.name }"
            type="button"
            role="tab"
            :aria-selected="tab.name === currentTab.name"
            @click="setCurrentTab(tab.name)"
          >
            {{ tab.title }}
          </button>
        </div>
      </header>

      <section class="general-config-content">
        <query-resource-prototype v-if="currentTab.name === 'query_resources'" />
        <query-theme-page
          v-else
          :key="currentTab.name"
          :mode-locked="currentTab.mode"
          :show-mode-tabs="false"
        />
      </section>
    </section>
  </main>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router_2'
import type { LocationQueryRaw } from 'vue-router_2'
import { useI18n } from '@/hooks/web/useI18n'
import QueryThemePage from '@/views/visualized/data/query-theme/index.vue'
import QueryResourcePrototype from './QueryResourcePrototype.vue'
import '@/views/system/shared/system-setting-page.less'

type QueryConfigTabName = 'query_resources' | 'query_themes'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const tabs = computed(() => [
  {
    name: 'query_resources' as QueryConfigTabName,
    title: t('starbi.query_config_resource_manage'),
    mode: 'resources' as const
  },
  {
    name: 'query_themes' as QueryConfigTabName,
    title: t('starbi.query_config_theme_manage'),
    mode: 'themes' as const
  }
])

const currentTab = computed(() => {
  const selectedTabName = String(route.query.tab || '')
  return tabs.value.find(tab => tab.name === selectedTabName) || tabs.value[0]
})

const setCurrentTab = (tabName: QueryConfigTabName) => {
  const nextQuery: LocationQueryRaw = { ...route.query, tab: tabName }
  delete nextQuery.datasetId
  delete nextQuery.datasetName

  if (tabName === currentTab.value.name) {
    return
  }

  router.replace({
    path: route.path,
    query: nextQuery
  })
}
</script>

<style lang="less" scoped>
.general-config-page {
  width: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.general-config-page__content {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.general-config-nav {
  margin-left: 2px;
}

.general-config-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 0;
  background: transparent;
  border: none;
}

.general-config-content :deep(.query-theme-page) {
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  background: transparent;
  height: 100%;
}

.general-config-content :deep(.query-resource-prototype) {
  width: 100%;
  min-height: 0;
  height: auto;
  flex: 1 1 auto;
  border: 1px solid #e6ebf2;
  border-radius: 14px;
  padding: 12px 14px;
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
}

.general-config-content :deep(.query-theme-layout) {
  grid-template-columns: 292px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  min-height: 0;
  align-items: stretch;
}

.general-config-content :deep(.query-theme-panel) {
  border-radius: 12px;
  border-color: #e6ebf2;
  box-shadow: none;
  height: 100%;
  min-height: 0;
}

.general-config-content :deep(.resource-manage-card) {
  height: 100%;
  min-height: 0;
  box-shadow: none;
}

.general-config-content :deep(.query-theme-panel--sidebar) {
  padding: 14px 12px 12px;
}

.general-config-content :deep(.query-theme-panel--workspace),
.general-config-content :deep(.resource-manage-card) {
  padding: 14px 16px;
}

.general-config-content :deep(.theme-main-page-sidebar-title),
.general-config-content :deep(.theme-main-page-title),
.general-config-content :deep(.resource-manage-title) {
  font-size: 16px;
  line-height: 24px;
}

.general-config-content :deep(.theme-main-page-search),
.general-config-content :deep(.resource-manage-search-bar) {
  height: 40px;
  border-radius: 10px;
}

.general-config-content :deep(.theme-main-page-search-input),
.general-config-content :deep(.resource-manage-search-input) {
  font-size: 15px;
}

.general-config-content :deep(.theme-main-page-table-row) {
  min-height: 56px;
}

.general-config-content :deep(.theme-main-page-table-head) {
  min-height: 50px;
  font-size: 15px;
}

.general-config-content :deep(.theme-main-page-resource-name),
.general-config-content :deep(.resource-manage-name),
.general-config-content :deep(.resource-manage-tag) {
  font-size: 15px;
}

.general-config-content :deep(.theme-main-page-table-cell),
.general-config-content :deep(.resource-manage-cell) {
  font-size: 15px;
  line-height: 24px;
}

.general-config-content :deep(.resource-manage-table-head) {
  min-height: 50px;
  font-size: 15px;
}

.general-config-content :deep(.resource-manage-table-row) {
  min-height: 66px;
}

.general-config-content :deep(.resource-manage-subtitle),
.general-config-content :deep(.theme-name-list),
.general-config-content :deep(.preview-link) {
  font-size: 14px;
  line-height: 22px;
}

.general-config-content :deep(.theme-main-page-cta),
.general-config-content :deep(.theme-main-page-action-button) {
  font-size: 15px;
}

@media (max-width: 1440px) {
  .general-config-content {
    padding: 0;
  }

  .general-config-content :deep(.query-theme-layout) {
    grid-template-columns: 268px minmax(0, 1fr);
  }
}
</style>
