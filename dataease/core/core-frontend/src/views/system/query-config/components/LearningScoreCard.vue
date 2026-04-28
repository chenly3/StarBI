<template>
  <div class="learning-score-card" :class="{ 'is-compact': compact }">
    <template v-if="compact">
      <span class="learning-score-card__label">评分</span>
      <span class="learning-score-card__grade">{{ displayGrade }}</span>
    </template>
    <template v-else>
      <div class="learning-score-card__header">
        <span class="learning-score-card__title">学习评分</span>
        <span class="learning-score-card__grade">{{ displayGrade }}</span>
      </div>
      <div v-if="signals.length" class="learning-score-card__section">
        <span class="learning-score-card__section-title">质量信号</span>
        <div class="learning-score-card__chips">
          <span v-for="signal in signals" :key="signal" class="learning-score-card__chip">
            {{ signal }}
          </span>
        </div>
      </div>
      <div v-if="suggestions.length" class="learning-score-card__section">
        <span class="learning-score-card__section-title">优化建议</span>
        <ul class="learning-score-card__list">
          <li v-for="suggestion in suggestions" :key="suggestion">{{ suggestion }}</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    grade?: string
    compact?: boolean
    signals?: string[]
    suggestions?: string[]
  }>(),
  {
    grade: '',
    compact: false,
    signals: () => [],
    suggestions: () => []
  }
)

const displayGrade = computed(() => props.grade || '--')
</script>

<style lang="less" scoped>
.learning-score-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  background: #f8fbff;
}

.learning-score-card.is-compact {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef4ff;
  color: #2f6bff;
}

.learning-score-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.learning-score-card__title,
.learning-score-card__section-title,
.learning-score-card__label {
  color: #667085;
  font-size: 12px;
}

.learning-score-card__grade {
  color: #175cd3;
  font-size: 16px;
  font-weight: 700;
}

.learning-score-card__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.learning-score-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.learning-score-card__chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff;
  color: #344054;
  font-size: 12px;
}

.learning-score-card__list {
  margin: 0;
  padding-left: 18px;
  color: #475467;
  font-size: 13px;
}
</style>
