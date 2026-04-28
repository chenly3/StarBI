<template>
  <div class="learning-feedback-summary-card">
    <div class="learning-feedback-summary-card__header">
      <span class="learning-feedback-summary-card__title">反馈摘要</span>
      <span
        class="learning-feedback-summary-card__tag"
        :class="{ 'is-warning': summary.relearningSuggested }"
      >
        {{ summary.relearningSuggested ? '建议重学' : '持续观察' }}
      </span>
    </div>

    <div class="learning-feedback-summary-card__metrics">
      <div class="learning-feedback-summary-card__metric">
        <span class="learning-feedback-summary-card__metric-label">反馈</span>
        <strong class="learning-feedback-summary-card__metric-value">
          {{ summary.totalFeedbackCount }}
        </strong>
      </div>
      <div class="learning-feedback-summary-card__metric">
        <span class="learning-feedback-summary-card__metric-label">点踩</span>
        <strong class="learning-feedback-summary-card__metric-value">
          {{ summary.downvoteCount }}
        </strong>
        <span class="learning-feedback-summary-card__metric-rate">
          点踩率 {{ formatRate(summary.downvoteRate) }}
        </span>
      </div>
      <div class="learning-feedback-summary-card__metric">
        <span class="learning-feedback-summary-card__metric-label">失败</span>
        <strong class="learning-feedback-summary-card__metric-value">
          {{ summary.failureCount }}
        </strong>
        <span class="learning-feedback-summary-card__metric-rate">
          失败率 {{ formatRate(summary.failureRate) }}
        </span>
      </div>
    </div>

    <div class="learning-feedback-summary-card__governance">
      <div class="learning-feedback-summary-card__section-title">治理建议</div>
      <div class="learning-feedback-summary-card__governance-copy">
        {{ summary.relearningAdvice }}
      </div>
    </div>

    <div v-if="summary.recentIssues.length" class="learning-feedback-summary-card__questions">
      <div class="learning-feedback-summary-card__section-title">近期问题</div>
      <ul class="learning-feedback-summary-card__list">
        <li v-for="issue in summary.recentIssues" :key="issue">{{ issue }}</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { QueryLearningFeedbackSummary } from '@/api/queryResourceLearning'

defineProps<{
  summary: QueryLearningFeedbackSummary
}>()

const formatRate = (value: number) => `${value || 0}%`
</script>

<style lang="less" scoped>
.learning-feedback-summary-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid #d5e3ff;
  border-radius: 16px;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

.learning-feedback-summary-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.learning-feedback-summary-card__title,
.learning-feedback-summary-card__section-title,
.learning-feedback-summary-card__metric-label {
  color: #667085;
  font-size: 12px;
}

.learning-feedback-summary-card__tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: #dfe9ff;
  color: #175cd3;
  font-size: 12px;
  font-weight: 600;
}

.learning-feedback-summary-card__tag.is-warning {
  background: #fef0c7;
  color: #b54708;
}

.learning-feedback-summary-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.learning-feedback-summary-card__metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
}

.learning-feedback-summary-card__metric-value {
  color: #101828;
  font-size: 18px;
  font-weight: 700;
}

.learning-feedback-summary-card__metric-rate {
  color: #667085;
  font-size: 12px;
}

.learning-feedback-summary-card__questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.learning-feedback-summary-card__governance {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
}

.learning-feedback-summary-card__governance-copy {
  color: #344054;
  font-size: 13px;
  line-height: 1.6;
}

.learning-feedback-summary-card__list {
  margin: 0;
  padding-left: 18px;
  color: #475467;
  font-size: 13px;
  line-height: 1.6;
}
</style>
