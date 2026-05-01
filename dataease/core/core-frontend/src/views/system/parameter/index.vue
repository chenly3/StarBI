<template>
  <main class="system-setting-page system-setting-standard parameter-config-page">
    <section class="system-setting-page__content parameter-config-page__content">
      <header class="system-setting-page__title-row">
        <h1 class="system-setting-page__title">{{ t('starbi.ai_config_group') }}</h1>
        <div
          class="system-setting-tab-nav parameter-config-nav"
          role="tablist"
          :aria-label="t('starbi.ai_config_group')"
        >
          <button
            v-for="item in tabArray"
            :key="item.name"
            class="system-setting-tab parameter-config-tab"
            :class="{ 'is-active': item.name === currentTab.name }"
            type="button"
            role="tab"
            :aria-selected="item.name === currentTab.name"
            @click="setCurrentTab(item.name)"
          >
            {{ item.label }}
          </button>
        </div>
      </header>

      <section class="system-setting-workspace parameter-config-content">
        <ai-model-config v-if="currentTab.name === 'ai_model'" />
        <terminology-config v-else-if="currentTab.name === 'ai_term'" />
        <sql-example-config v-else-if="currentTab.name === 'ai_sql'" />
      </section>
    </section>
  </main>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router_2'
import { useI18n } from '@/hooks/web/useI18n'
import '@/views/system/shared/system-setting-page.less'

type ParameterTabName = 'ai_model' | 'ai_term' | 'ai_sql'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const AiModelConfig = defineAsyncComponent(
  () => import('@/views/system/query-config/AiModelConfig.vue')
)
const TerminologyConfig = defineAsyncComponent(
  () => import('@/views/system/query-config/TerminologyConfig.vue')
)
const SqlExampleConfig = defineAsyncComponent(
  () => import('@/views/system/query-config/SqlExampleConfig.vue')
)

const tabArray = computed(() => [
  {
    label: t('starbi.ai_model_config'),
    name: 'ai_model' as ParameterTabName,
    pageKey: 'model'
  },
  {
    label: t('starbi.term_config'),
    name: 'ai_term' as ParameterTabName,
    pageKey: 'professional'
  },
  {
    label: t('starbi.sql_example_config'),
    name: 'ai_sql' as ParameterTabName,
    pageKey: 'training'
  }
])

const currentTab = computed(() => {
  const tabName = String(route.query.tab || '')
  return tabArray.value.find(item => item.name === tabName) || tabArray.value[0]
})

const setCurrentTab = (tabName: ParameterTabName) => {
  if (tabName === currentTab.value.name) {
    return
  }

  router.replace({
    path: route.path,
    query: {
      ...route.query,
      tab: tabName
    }
  })
}
</script>

<style lang="less" scoped>
.parameter-config-page {
  width: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  --system-card-border: #d9e5f4;
  --system-header-bg: #ffffff;
  --system-shadow-soft: 0 10px 24px rgba(32, 73, 137, 0.055);
}

.parameter-config-page__content {
  min-height: 0;
  flex: 1;
  overflow: hidden;
  gap: 10px;
}

.parameter-config-page__content > .system-setting-page__title-row {
  min-height: 54px;
  padding: 9px 10px 9px 18px;
  background: #ffffff;
  border-color: #d9e5f4;
}

.parameter-config-nav {
  margin-left: 2px;
  padding: 4px;
  background: #eef4ff;
  border-color: #d8e5fa;
  box-shadow: inset 0 1px 2px rgba(31, 94, 255, 0.04);
}

.parameter-config-tab {
  height: 34px;
  padding: 0 16px;
  color: #45536a;
}

.parameter-config-tab.is-active {
  color: #1f5eff;
  box-shadow: 0 3px 10px rgba(31, 94, 255, 0.1);
}

.parameter-config-content {
  display: flex;
  flex: 1;
  min-height: 0;
  height: auto;
  overflow: hidden;
  padding: 16px 24px;
  box-sizing: border-box;
  border: none;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 4px 0 #1f23291f;
}

.parameter-config-content:has(.no-padding) {
  padding: 0;
}

.parameter-config-content :deep(.model-config),
.parameter-config-content :deep(.professional),
.parameter-config-content :deep(.training) {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.parameter-config-content :deep(.ed-button) {
  min-height: var(--system-control-height);
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
}

.parameter-config-content :deep(.ed-input__wrapper) {
  min-height: var(--system-control-height);
  border-radius: 8px;
  font-size: 15px;
}

.parameter-config-content :deep(.ed-input__inner),
.parameter-config-content :deep(.ed-select__input),
.parameter-config-content :deep(.ed-textarea__inner),
.parameter-config-content :deep(.ed-select__wrapper),
.parameter-config-content :deep(.ed-select__placeholder) {
  font-size: 15px;
  line-height: 24px;
}

.parameter-config-content :deep(.ed-table) {
  font-size: 15px;
}

.parameter-config-content :deep(.ed-table th.ed-table__cell),
.parameter-config-content :deep(.ed-table td.ed-table__cell) {
  font-size: 15px;
}

.parameter-config-content :deep(.ed-table .cell) {
  line-height: 24px;
}

@media (max-width: 1440px) {
  .parameter-config-content {
    padding: 16px 24px;
  }

  .parameter-config-content:has(.no-padding) {
    padding: 0;
  }
}
</style>
