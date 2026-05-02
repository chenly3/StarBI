<script setup lang="ts">
import { computed } from 'vue'
import { type SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

const props = defineProps<{
  record: SqlbotNewConversationRecord
}>()

const questionText = computed(() => {
  return String(props.record.derivedQuestion || props.record.question || '').trim()
})
</script>

<template>
  <div class="derived-question-message" data-testid="sqlbot-derived-question">
    <div class="derived-question-bubble">
      <span class="derived-question-label">系统根据你的操作自动提问</span>
      <span class="derived-question-text">{{ questionText }}</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.derived-question-message {
  width: min(var(--sqlbot-column-width), 100%);
  display: flex;
  justify-content: flex-end;
  margin: -4px 0 18px;
}

.derived-question-bubble {
  max-width: min(640px, 86%);
  padding: 13px 18px;
  border-radius: 22px 22px 6px 22px;
  color: #f8fbff;
  font-size: 15px;
  line-height: 1.7;
  font-weight: 650;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 48%, #1e40af 100%);
  box-shadow: 0 16px 32px rgba(37, 99, 235, 0.22);
}

.derived-question-label {
  display: block;
  margin-bottom: 4px;
  color: rgba(248, 251, 255, 0.76);
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
}

.derived-question-text {
  display: block;
}
</style>
