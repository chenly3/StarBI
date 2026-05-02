<script setup lang="ts">
import { computed } from 'vue'
import RecommendQuestions from '@/views/sqlbot-new/components/RecommendQuestions.vue'
import { type SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

const props = withDefaults(
  defineProps<{
    record: SqlbotNewConversationRecord
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  (event: 'interpret', record: SqlbotNewConversationRecord): void
  (event: 'predict', record: SqlbotNewConversationRecord): void
  (event: 'prefill-question', question: string): void
}>()

const questions = computed(() => props.record.recommendQuestions || [])
</script>

<template>
  <section class="action-suggestions-message" data-testid="sqlbot-action-suggestions">
    <div class="action-suggestions-card">
      <div class="action-suggestions-head">
        <span class="action-suggestions-kicker">下一步可以这样分析</span>
        <span class="action-suggestions-note">点击后会生成新的问题消息</span>
      </div>

      <div class="action-suggestions-actions">
        <button
          class="action-suggestion-button primary"
          type="button"
          :disabled="loading || !record.id"
          data-testid="sqlbot-action-analysis"
          @click="emit('interpret', record)"
        >
          做数据解读
        </button>
        <button
          class="action-suggestion-button"
          type="button"
          :disabled="loading || !record.id"
          data-testid="sqlbot-action-predict"
          @click="emit('predict', record)"
        >
          看趋势预测
        </button>
      </div>

      <RecommendQuestions
        v-if="questions.length"
        :questions="questions"
        :loading="loading"
        title="推荐追问"
        @select="question => emit('prefill-question', question)"
      />
    </div>
  </section>
</template>

<style scoped lang="less">
.action-suggestions-message {
  margin-top: 12px;
}

.action-suggestions-card {
  padding: 14px;
  background: linear-gradient(135deg, rgb(239 246 255 / 92%), rgb(255 255 255 / 96%));
  border: 1px solid rgb(30 64 175 / 10%);
  border-radius: 12px;
  box-shadow: 0 10px 24px rgb(15 23 42 / 5%);
}

.action-suggestions-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.action-suggestions-kicker {
  font-size: 13px;
  font-weight: 600;
  color: #1e3a8a;
}

.action-suggestions-note {
  font-size: 12px;
  color: #64748b;
}

.action-suggestions-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-suggestion-button {
  padding: 8px 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: #1e40af;
  cursor: pointer;
  background: #fff;
  border: 1px solid rgb(30 64 175 / 18%);
  border-radius: 999px;
  transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease,
    color 160ms ease, transform 160ms ease;

  &:hover:not(:disabled) {
    color: #1d4ed8;
    background: rgb(30 64 175 / 6%);
    border-color: rgb(30 64 175 / 30%);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &.primary {
    color: #fff;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    border-color: transparent;
    box-shadow: 0 8px 18px rgb(37 99 235 / 18%);

    &:hover:not(:disabled) {
      color: #fff;
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      box-shadow: 0 10px 22px rgb(37 99 235 / 22%);
    }
  }
}
</style>
