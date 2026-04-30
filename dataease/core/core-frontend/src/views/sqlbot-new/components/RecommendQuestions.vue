<template>
  <div v-if="questions.length" class="recommend-questions">
    <div class="recommend-questions__header">
      <svg
        class="recommend-questions__icon"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="10" y1="11" x2="14" y2="11" />
      </svg>
      <span class="recommend-questions__label">{{ title }}</span>
    </div>
    <div class="recommend-questions__list">
      <button
        v-for="q in questions"
        :key="q"
        class="recommend-question-card"
        :class="{ 'recommend-question-card--loading': loading }"
        :disabled="loading"
        @click="$emit('select', q)"
      >
        <span class="recommend-question-card__text">{{ q }}</span>
        <svg
          class="recommend-question-card__arrow"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  questions: string[]
  loading?: boolean
  title?: string
}>()

defineEmits<{
  select: [question: string]
}>()
</script>

<style scoped>
.recommend-questions {
  margin-top: 16px;
}

.recommend-questions__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: #64748b;
}

.recommend-questions__icon {
  flex-shrink: 0;
}

.recommend-questions__label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.recommend-questions__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recommend-question-card {
  display: flex;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 14px;
  color: #1e3a8a;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 200ms ease-out;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.recommend-question-card:hover:not(:disabled) {
  background: rgb(30 64 175 / 4%);
  border-color: rgb(30 64 175 / 30%);
  transform: translateX(4px);
}

.recommend-question-card:active:not(:disabled) {
  transform: translateX(4px) scale(0.99);
}

.recommend-question-card--loading {
  cursor: wait;
  opacity: 0.5;
}

.recommend-question-card__text {
  flex: 1;
  line-height: 1.5;
}

.recommend-question-card__arrow {
  color: #1e40af;
  opacity: 0;
  transition: opacity 200ms ease-out;
  flex-shrink: 0;
}

.recommend-question-card:hover .recommend-question-card__arrow {
  opacity: 1;
}
</style>
