<script setup lang="ts">
import { ref, watch } from 'vue'
import StarbiResultCard from '@/views/sqlbot/StarbiResultCard.vue'
import { type SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'
import SqlbotNewClarificationCard from '@/views/sqlbot-new/components/SqlbotNewClarificationCard.vue'
import SqlbotNewExecutionMetaCard from '@/views/sqlbot-new/components/SqlbotNewExecutionMetaCard.vue'
import type { SqlbotNewSourceInsights } from '@/views/sqlbot-new/types'

const props = withDefaults(
  defineProps<{
    record: SqlbotNewConversationRecord
    sourceInsights?: SqlbotNewSourceInsights | null
    conversationLoading?: boolean
  }>(),
  {
    sourceInsights: undefined,
    conversationLoading: false
  }
)

const emit = defineEmits<{
  (event: 'interpret', record: SqlbotNewConversationRecord): void
  (event: 'predict', record: SqlbotNewConversationRecord): void
  (event: 'followup', record: SqlbotNewConversationRecord): void
  (event: 'retry', record: SqlbotNewConversationRecord): void
  (event: 'learning-fix', record: SqlbotNewConversationRecord): void
  (event: 'prefill-question', question: string): void
  (event: 'view-execution-details', record: SqlbotNewConversationRecord): void
  (event: 'insert-dashboard', record: SqlbotNewConversationRecord): void
  (event: 'clarify-record', record: SqlbotNewConversationRecord, value: string | string[]): void
  (
    event: 'clarification-selection-change',
    record: SqlbotNewConversationRecord,
    value: string[]
  ): void
}>()

const reasoningExpanded = ref(false)

watch(
  () => props.record.localId,
  () => {
    reasoningExpanded.value = false
  },
  { immediate: true }
)
</script>

<template>
  <div class="sqlbot-new-record-stack">
    <SqlbotNewClarificationCard
      v-if="record.clarification"
      :clarification="record.clarification"
      @choose="value => emit('clarify-record', record, value)"
      @selection-change="value => emit('clarification-selection-change', record, value)"
    />

    <SqlbotNewExecutionMetaCard
      v-if="!record.clarification"
      :record="record"
      :interpretation="record.interpretation"
      :execution-summary="record.executionSummary"
      @choose-suggestion="question => emit('prefill-question', question)"
    />

    <StarbiResultCard
      v-if="!record.clarification"
      :record="record"
      :source-insights="sourceInsights"
      :reasoning-expanded="reasoningExpanded"
      :show-execution-details="true"
      :show-predict-action="true"
      :disable-inline-insights="true"
      @toggle-reasoning="reasoningExpanded = !reasoningExpanded"
      @interpret="emit('interpret', record)"
      @predict="emit('predict', record)"
      @followup="emit('followup', record)"
      @retry="emit('retry', record)"
      @learning-fix="emit('learning-fix', record)"
      @insert-dashboard="emit('insert-dashboard', record)"
      @view-execution-details="emit('view-execution-details', record)"
    />
  </div>
</template>

<style scoped lang="less">
.sqlbot-new-record-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
