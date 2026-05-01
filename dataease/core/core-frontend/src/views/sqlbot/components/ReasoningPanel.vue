<template>
  <div v-if="hasContent" class="reasoning-panel">
    <!-- 问题理解摘要（默认展开） -->
    <div class="reasoning-section">
      <button class="reasoning-header" @click="toggleUnderstanding">
        <span class="reasoning-header__icon">💡</span>
        <span class="reasoning-header__title">问题理解</span>
        <span class="reasoning-header__toggle">{{ understandingExpanded ? '收起' : '展开' }}</span>
      </button>
      <div v-if="understandingExpanded" class="reasoning-body understanding-body">
        <div v-if="reasoning?.time_range" class="reasoning-row">
          <span class="reasoning-row__field">{{ reasoning.time_range.field }}</span>
          <span class="reasoning-row__value">{{ reasoning.time_range.value }}</span>
        </div>
        <div v-for="m in reasoning?.metrics || []" :key="m.field" class="reasoning-row">
          <span class="reasoning-row__field">{{ m.field }}</span>
          <span class="reasoning-row__value">{{ m.value }}</span>
        </div>
        <div v-for="d in reasoning?.dimensions || []" :key="d.field" class="reasoning-row">
          <span class="reasoning-row__field">{{ d.field }}</span>
          <span class="reasoning-row__value">{{ d.value }}</span>
        </div>
        <div v-for="f in reasoning?.filters || []" :key="f.field" class="reasoning-row">
          <span class="reasoning-row__field">{{ f.field }}</span>
          <span class="reasoning-row__value">{{ f.value }}</span>
        </div>
        <div v-if="reasoning?.datasource" class="reasoning-row">
          <span class="reasoning-row__field">{{ reasoning.datasource.field }}</span>
          <span class="reasoning-row__value">{{ reasoning.datasource.value }}</span>
        </div>
      </div>
    </div>

    <!-- 执行摘要（默认展开） -->
    <div class="reasoning-section">
      <button class="reasoning-header" @click="toggleSummary">
        <span class="reasoning-header__icon">📈</span>
        <span class="reasoning-header__title">执行摘要</span>
        <span class="reasoning-header__toggle">{{ summaryExpanded ? '收起' : '展开' }}</span>
      </button>
      <div v-if="summaryExpanded" class="reasoning-body summary-body">
        <div class="summary-metrics">
          <div v-if="rowCount !== undefined" class="summary-metric">
            <span class="summary-metric__value">{{ rowCount }}</span>
            <span class="summary-metric__label">返回行数</span>
          </div>
          <div v-if="duration" class="summary-metric">
            <span class="summary-metric__value">{{ duration }}</span>
            <span class="summary-metric__label">耗时</span>
          </div>
          <div v-if="tokenCount !== undefined" class="summary-metric">
            <span class="summary-metric__value">{{ tokenCount }}</span>
            <span class="summary-metric__label">Token</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 技术详情（默认折叠，记住展开状态） -->
    <div class="reasoning-section">
      <button class="reasoning-header" @click="toggleDetails">
        <span class="reasoning-header__icon">{{ detailsExpanded ? '🔧' : '🔧' }}</span>
        <span class="reasoning-header__title">技术详情</span>
        <span class="reasoning-header__toggle">{{ detailsExpanded ? '收起' : '展开' }}</span>
      </button>
      <div v-if="detailsExpanded" class="reasoning-body details-body">
        <div class="details-sql" v-if="executionSql">
          <div class="details-sql__label">SQL</div>
          <pre class="details-sql__code">{{ executionSql }}</pre>
        </div>
        <div class="details-steps">
          <div class="details-steps__label">执行步骤</div>
          <ul class="details-steps__timeline">
            <li v-for="step in executionSteps" :key="step.key" class="timeline-item">
              <span class="timeline-item__dot"></span>
              <span class="timeline-item__step">{{ step.label }}</span>
              <span class="timeline-item__detail">{{ step.value }}</span>
            </li>
          </ul>
        </div>
        <div class="details-meta" v-if="modelName">
          <span class="details-meta__item">
            <span class="details-meta__label">模型</span>
            {{ modelName }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface ReasoningData {
  time_range?: { field: string; value: string }
  metrics?: { field: string; value: string }[]
  dimensions?: { field: string; value: string }[]
  filters?: { field: string; value: string }[]
  datasource?: { field: string; value: string }
}

interface StepItem {
  key: string
  label: string
  value: string
}

const props = defineProps<{
  reasoning?: ReasoningData
  rowCount?: number
  duration?: string
  tokenCount?: number
  executionSql?: string
  executionSteps?: StepItem[]
  modelName?: string
  recordId?: number
}>()

const storageKey = computed(() =>
  props.recordId ? `reasoning-details-${props.recordId}` : 'reasoning-details-default'
)

const hasContent = computed(() => {
  const reasoning = props.reasoning
  return Boolean(
    reasoning?.time_range ||
      reasoning?.metrics?.length ||
      reasoning?.dimensions?.length ||
      reasoning?.filters?.length ||
      reasoning?.datasource ||
      props.rowCount !== undefined ||
      props.duration ||
      props.tokenCount !== undefined ||
      props.executionSql ||
      props.executionSteps?.length ||
      props.modelName
  )
})

const detailsExpanded = ref(false)
const understandingExpanded = ref(true)
const summaryExpanded = ref(true)

onMounted(() => {
  try {
    const saved = localStorage.getItem(`reasoning-details-${props.recordId || 'default'}`)
    detailsExpanded.value = saved === 'true'
    understandingExpanded.value =
      localStorage.getItem(`reasoning-understanding-${props.recordId || 'default'}`) !== 'false'
    summaryExpanded.value =
      localStorage.getItem(`reasoning-summary-${props.recordId || 'default'}`) !== 'false'
  } catch {
    detailsExpanded.value = false
  }
})

const toggleUnderstanding = () => {
  understandingExpanded.value = !understandingExpanded.value
  try {
    localStorage.setItem(
      `reasoning-understanding-${props.recordId || 'default'}`,
      String(understandingExpanded.value)
    )
  } catch {}
}
const toggleSummary = () => {
  summaryExpanded.value = !summaryExpanded.value
  try {
    localStorage.setItem(
      `reasoning-summary-${props.recordId || 'default'}`,
      String(summaryExpanded.value)
    )
  } catch {}
}
const toggleDetails = () => {
  detailsExpanded.value = !detailsExpanded.value
  try {
    localStorage.setItem(
      `reasoning-details-${props.recordId || 'default'}`,
      String(detailsExpanded.value)
    )
  } catch {}
}
</script>

<style scoped>
/* stylelint-disable selector-class-pattern */
@keyframes reasoning-expand {
  from {
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
  }

  to {
    max-height: 600px;
    opacity: 1;
  }
}

.reasoning-panel {
  margin-top: 12px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid var(--de-border-color, #dbeafe);
  border-radius: 8px;
}

.reasoning-section {
  border-bottom: 1px solid var(--de-border-color, #dbeafe);
}

.reasoning-section:last-child {
  border-bottom: none;
}

.reasoning-header {
  display: flex;
  width: 100%;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 13px;
  color: #1e3a8a;
  cursor: pointer;
  background: transparent;
  border: none;
  transition: background 200ms ease-out;
  align-items: center;
  gap: 8px;
}

.reasoning-header:hover {
  background: rgb(30 64 175 / 6%);
}

.reasoning-header__icon {
  font-size: 14px;
  flex-shrink: 0;
}

.reasoning-header__title {
  font-weight: 600;
  flex: 1;
  text-align: left;
}

.reasoning-header__toggle {
  font-size: 12px;
  color: #64748b;
  flex-shrink: 0;
}

.reasoning-body {
  padding: 8px 14px 14px;
  animation: reasoning-expand 200ms ease-out;
}

/* 问题理解行 */
.reasoning-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 4px 0;
}

.reasoning-row__field {
  min-width: 60px;
  font-size: 12px;
  color: #64748b;
  flex-shrink: 0;
}

.reasoning-row__value {
  font-size: 13px;
  font-weight: 500;
  color: #1e3a8a;
}

/* 执行摘要 */
.summary-metrics {
  display: flex;
  gap: 24px;
}

.summary-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-metric__value {
  font-size: 18px;
  font-weight: 700;
  color: #1e40af;
}

.summary-metric__label {
  font-size: 11px;
  color: #64748b;
}

/* 技术详情 */
.details-sql {
  margin-bottom: 14px;
}

.details-sql__label,
.details-steps__label {
  margin-bottom: 6px;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: #64748b;
  text-transform: uppercase;
}

.details-sql__code {
  padding: 12px 14px;
  overflow-x: auto;
  font-family: 'Fira Code', 'SF Mono', Monaco, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #e2e8f0;
  word-break: break-all;
  white-space: pre-wrap;
  background: #1e293b;
  border-radius: 6px;
}

/* 时间线步骤 */
.details-steps__timeline {
  padding: 0;
  margin: 0;
  list-style: none;
}

.timeline-item {
  position: relative;
  display: flex;
  padding: 6px 0;
  align-items: flex-start;
  gap: 10px;
}

.timeline-item::before {
  position: absolute;
  top: 24px;
  bottom: 0;
  left: 4px;
  width: 1px;
  background: #dbeafe;
  content: '';
}

.timeline-item:last-child::before {
  display: none;
}

.timeline-item__dot {
  width: 9px;
  height: 9px;
  margin-top: 4px;
  background: #1e40af;
  border-radius: 50%;
  flex-shrink: 0;
}

.timeline-item__step {
  min-width: 100px;
  font-size: 12px;
  font-weight: 500;
  color: #1e3a8a;
  flex-shrink: 0;
}

.timeline-item__detail {
  font-size: 12px;
  color: #475569;
}

/* 元数据 */
.details-meta {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #dbeafe;
}

.details-meta__item {
  font-size: 12px;
  color: #475569;
}

.details-meta__label {
  margin-right: 6px;
  color: #64748b;
}
</style>
