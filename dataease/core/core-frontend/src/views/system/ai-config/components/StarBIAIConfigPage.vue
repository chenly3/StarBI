<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from '@/hooks/web/useI18n'
import { useRoute, useRouter } from 'vue-router_2'
import SqlBotEmbedFrame from '@/views/system/ai-config/components/SqlBotEmbedFrame.vue'

const props = defineProps({
  pageKey: {
    type: String,
    required: true
  },
  titleKey: {
    type: String,
    required: true
  },
  descriptionKey: {
    type: String,
    required: true
  }
})

const { t } = useI18n()
const route = useRoute()
const { push } = useRouter()

const pageTitle = computed(() => t(props.titleKey))

const navItems = computed(() => [
  {
    key: 'model',
    title: t('starbi.ai_model_config')
  },
  {
    key: 'professional',
    title: t('starbi.term_config')
  },
  {
    key: 'training',
    title: t('starbi.sql_example_config')
  }
])

const resolveSiblingPath = (targetKey: string) => {
  const normalizedPath = route.path.replace(/\/+$/, '')
  if (normalizedPath.endsWith(`/${props.pageKey}`)) {
    return normalizedPath.replace(new RegExp(`/${props.pageKey}$`), `/${targetKey}`)
  }
  const segments = normalizedPath.split('/')
  if (segments.length > 1) {
    segments[segments.length - 1] = targetKey
    return segments.join('/')
  }
  return normalizedPath
}

const navigateToPage = (targetKey: string) => {
  if (targetKey === props.pageKey) {
    return
  }
  const targetPath = resolveSiblingPath(targetKey)
  if (targetPath && targetPath !== route.path) {
    push(targetPath)
  }
}
</script>

<template>
  <div class="starbi-ai-page">
    <div class="sheet-nav">
      <div class="sheet-nav-list">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="sheet-nav-item"
          :class="{ 'is-active': item.key === pageKey }"
          type="button"
          @click="navigateToPage(item.key)"
        >
          <span class="sheet-nav-item-title">{{ item.title }}</span>
        </button>
      </div>
    </div>
    <SqlBotEmbedFrame :page-key="pageKey" :page-title="pageTitle" />
  </div>
</template>

<style lang="less" scoped>
.starbi-ai-page {
  height: calc(100vh - 84px);
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;

  .sheet-nav {
    overflow-x: auto;
    flex-shrink: 0;
    padding-bottom: 0;
  }

  .sheet-nav-list {
    display: inline-flex;
    align-items: stretch;
    gap: 8px;
    min-width: max-content;
  }

  .sheet-nav-item {
    appearance: none;
    border: 1px solid rgba(31, 35, 41, 0.08);
    background: #fff;
    cursor: pointer;
    text-align: left;
    padding: 8px 14px;
    border-radius: 10px;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
      border-color: rgba(51, 112, 255, 0.18);
      color: #1f2329;
    }

    &.is-active {
      color: #1b5cff;
      background: #eef4ff;
      border-color: rgba(51, 112, 255, 0.24);
      box-shadow: inset 0 0 0 1px rgba(51, 112, 255, 0.08);
    }
  }

  .sheet-nav-item-title {
    display: block;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }

  :deep(.sqlbot-embed-shell) {
    flex: 1;
    min-height: 0;
  }
}

@media screen and (max-width: 1200px) {
  .starbi-ai-page {
    .sheet-nav {
      padding-bottom: 0;
    }
  }
}
</style>
