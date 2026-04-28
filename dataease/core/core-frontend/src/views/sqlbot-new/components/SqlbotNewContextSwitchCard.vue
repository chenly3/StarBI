<script setup lang="ts">
import { computed } from 'vue'
import { type SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

const props = defineProps<{
  record: SqlbotNewConversationRecord
}>()

const sourceKindLabelMap: Record<string, string> = {
  dataset: '数据集',
  file: '数据文件'
}

const contextSwitch = computed(() => props.record.contextSwitch)

const sourceKindLabel = computed(() => {
  const sourceKind =
    contextSwitch.value?.sourceKind || props.record.executionContext?.queryMode || ''
  return sourceKindLabelMap[sourceKind] || '数据源'
})

const sourceTitle = computed(() => {
  const title = String(contextSwitch.value?.sourceTitle || '').trim()
  if (title) {
    return title
  }

  const sourceId = String(
    contextSwitch.value?.sourceId || props.record.executionContext?.sourceId || ''
  ).trim()
  if (sourceId) {
    return sourceId
  }

  return `当前${sourceKindLabel.value}`
})

const sourceMeta = computed(() => {
  const meta = String(contextSwitch.value?.sourceMeta || '').trim()
  if (meta) {
    return meta
  }

  const datasourceId = String(
    contextSwitch.value?.datasourceId || props.record.executionContext?.datasourceId || ''
  ).trim()
  if (datasourceId) {
    return `数据源：${datasourceId}`
  }

  return ''
})

const datasourceBadge = computed(() => {
  const datasourceId = String(
    contextSwitch.value?.datasourceId || props.record.executionContext?.datasourceId || ''
  ).trim()
  return datasourceId ? `数据源 ${datasourceId}` : ''
})
</script>

<template>
  <section class="context-switch-card">
    <div class="context-switch-head">
      <span class="context-switch-kicker">上下文切换</span>
      <span class="context-switch-kind">{{ sourceKindLabel }}</span>
    </div>

    <div class="context-switch-title">已切换到{{ sourceKindLabel }}：{{ sourceTitle }}</div>

    <div v-if="sourceMeta" class="context-switch-meta">
      {{ sourceMeta }}
    </div>

    <div class="context-switch-note">后续问题将沿用这个上下文继续分析。</div>

    <div v-if="datasourceBadge" class="context-switch-badges">
      <span class="context-switch-badge">{{ datasourceBadge }}</span>
    </div>
  </section>
</template>

<style scoped lang="less">
.context-switch-card {
  width: min(var(--sqlbot-column-width), 100%);
  margin-bottom: 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(126, 159, 231, 0.28);
  background: radial-gradient(circle at top left, rgba(191, 219, 254, 0.34), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 246, 255, 0.98) 100%);
  box-shadow: 0 14px 28px rgba(30, 90, 242, 0.08);
}

.context-switch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.context-switch-kicker,
.context-switch-kind,
.context-switch-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 18px;
  font-weight: 700;
}

.context-switch-kicker {
  color: #1d4ed8;
  background: rgba(219, 234, 254, 0.9);
  letter-spacing: 0.06em;
}

.context-switch-kind {
  color: #3659b8;
  background: rgba(226, 236, 255, 0.92);
}

.context-switch-title {
  font-size: 16px;
  line-height: 1.6;
  color: #1f3161;
  font-weight: 700;
}

.context-switch-meta,
.context-switch-note {
  font-size: 14px;
  line-height: 1.6;
  color: #566684;
}

.context-switch-note {
  color: #30436f;
}

.context-switch-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.context-switch-badge {
  color: #4966b9;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(126, 159, 231, 0.22);
}
</style>
