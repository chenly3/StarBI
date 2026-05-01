<script setup lang="ts">
import { computed } from 'vue'
import StarbiMarkdown from '@/views/sqlbot/StarbiMarkdown.vue'
import { type SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

const props = defineProps<{
  record: SqlbotNewConversationRecord
}>()

const title = computed(() => {
  return props.record.derivedAction === 'predict' ? '趋势预测' : '数据解读'
})

const content = computed(() => {
  return props.record.derivedAction === 'predict'
    ? String(props.record.predict || '').trim()
    : String(props.record.analysis || '').trim()
})

const loading = computed(() => {
  return props.record.derivedAction === 'predict'
    ? Boolean(props.record.predictLoading)
    : Boolean(props.record.analysisLoading)
})

const errorText = computed(() => {
  return props.record.derivedAction === 'predict'
    ? String(props.record.predictError || '').trim()
    : String(props.record.analysisError || '').trim()
})

const usageText = computed(() => {
  const duration =
    props.record.derivedAction === 'predict'
      ? props.record.predictDuration
      : props.record.analysisDuration
  const totalTokens =
    props.record.derivedAction === 'predict'
      ? props.record.predictTotalTokens
      : props.record.analysisTotalTokens
  const parts = []
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    parts.push(`${duration.toFixed(2)} s`)
  }
  if (totalTokens) {
    parts.push(`${totalTokens} tokens`)
  }
  return parts.join(' / ')
})
</script>

<template>
  <section class="derived-answer-message">
    <div class="derived-answer-card" :class="{ loading, error: !!errorText }">
      <div class="derived-answer-head">
        <div>
          <div class="derived-answer-kicker">StarBI</div>
          <div class="derived-answer-title">{{ title }}</div>
        </div>
        <span v-if="usageText" class="derived-answer-usage">{{ usageText }}</span>
      </div>

      <div v-if="loading && !content" class="derived-answer-loading">
        <span class="derived-answer-dot"></span>
        <span class="derived-answer-dot"></span>
        <span class="derived-answer-dot"></span>
        <span>正在生成{{ title }}，请稍候</span>
      </div>

      <StarbiMarkdown v-if="content" :message="content" />

      <div v-if="errorText" class="derived-answer-error">
        {{ errorText }}
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
.derived-answer-message {
  width: min(var(--sqlbot-column-width), 100%);
  margin: 0 0 28px;
}

.derived-answer-card {
  padding: 20px 22px;
  border-radius: 24px;
  border: 1px solid rgba(121, 155, 219, 0.28);
  color: #24314f;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.96));
  box-shadow: 0 16px 34px rgba(30, 64, 175, 0.1);
}

.derived-answer-card.loading {
  border-color: rgba(59, 130, 246, 0.36);
}

.derived-answer-card.error {
  border-color: rgba(239, 68, 68, 0.3);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 247, 0.96));
}

.derived-answer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.derived-answer-kicker {
  margin-bottom: 4px;
  color: #2563eb;
  font-size: 12px;
  line-height: 18px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.derived-answer-title {
  color: #172554;
  font-size: 17px;
  line-height: 1.45;
  font-weight: 800;
}

.derived-answer-usage {
  flex: 0 0 auto;
  padding: 4px 10px;
  border-radius: 999px;
  color: #4966b9;
  font-size: 12px;
  line-height: 18px;
  font-weight: 700;
  background: rgba(226, 236, 255, 0.86);
}

.derived-answer-loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4966b9;
  font-size: 14px;
  line-height: 22px;
}

.derived-answer-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3b82f6;
  animation: derived-answer-pulse 1s infinite ease-in-out;
}

.derived-answer-dot:nth-child(2) {
  animation-delay: 0.14s;
}

.derived-answer-dot:nth-child(3) {
  animation-delay: 0.28s;
}

.derived-answer-error {
  color: #b42318;
  font-size: 14px;
  line-height: 1.7;
}

@keyframes derived-answer-pulse {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}
</style>
