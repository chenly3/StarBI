<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AIQueryExecutionDetails, AIQueryExecutionStep } from '@/api/aiQueryTheme'

const props = withDefaults(
  defineProps<{
    visible: boolean
    loading?: boolean
    error?: string
    details?: AIQueryExecutionDetails | null
    recordId?: number
  }>(),
  {
    loading: false,
    error: '',
    details: null
  }
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'retry', recordId: number): void
}>()

const expandedKeys = ref<string[]>([])
const drawerSize = ref('680px')

const syncDrawerSize = () => {
  const width = window.innerWidth
  drawerSize.value = width < 900 ? '92vw' : `${Math.min(Math.max(width * 0.42, 680), 860)}px`
}

onMounted(() => {
  syncDrawerSize()
  window.addEventListener('resize', syncDrawerSize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncDrawerSize)
})

const overview = computed(() => props.details?.overview || {})
const steps = computed(() => props.details?.steps || [])

const formatDuration = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--'
  }
  return `${value.toFixed(2)} s`
}

const formatTokens = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--'
  }
  return `${value}`
}

const formatTime = (value?: string) => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatMessage = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '暂无详情'
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const stepKey = (step: AIQueryExecutionStep, index: number) => {
  return `${step.operateKey || step.operateLabel || 'step'}-${index}`
}

const toggleStep = (key: string) => {
  if (expandedKeys.value.includes(key)) {
    expandedKeys.value = expandedKeys.value.filter(item => item !== key)
    return
  }
  expandedKeys.value = [...expandedKeys.value, key]
}

const isExpanded = (key: string) => expandedKeys.value.includes(key)
</script>

<template>
  <el-drawer
    :model-value="visible"
    :size="drawerSize"
    direction="rtl"
    title="执行详情"
    custom-class="sqlbot-new-execution-drawer"
    @close="emit('close')"
  >
    <div class="execution-drawer">
      <template v-if="loading">
        <div class="execution-loading">正在加载执行详情…</div>
      </template>

      <template v-else-if="error">
        <div class="execution-error">
          <div class="execution-error-title">执行详情加载失败</div>
          <div class="execution-error-copy">{{ error }}</div>
          <button
            v-if="recordId"
            class="execution-retry"
            type="button"
            @click="emit('retry', recordId)"
          >
            重试
          </button>
        </div>
      </template>

      <template v-else>
        <div class="execution-title">总览</div>
        <div class="execution-overview">
          <div class="overview-card">
            <div class="overview-name">消耗 Tokens</div>
            <div class="overview-value">{{ formatTokens(overview.totalTokens) }}</div>
          </div>
          <div class="overview-card">
            <div class="overview-name">耗时</div>
            <div class="overview-value">{{ formatDuration(overview.duration) }}</div>
          </div>
        </div>

        <div class="execution-meta">
          <span>开始时间 {{ formatTime(overview.startTime) }}</span>
          <span>结束时间 {{ formatTime(overview.finishTime) }}</span>
        </div>

        <div class="execution-title">步骤详情</div>
        <div v-if="steps.length" class="execution-steps">
          <div v-for="(step, index) in steps" :key="stepKey(step, index)" class="execution-step">
            <button class="step-head" type="button" @click="toggleStep(stepKey(step, index))">
              <div class="step-head-left">
                <span class="step-arrow" :class="{ expanded: isExpanded(stepKey(step, index)) }"
                  >▸</span
                >
                <span class="step-name">{{ step.operateLabel || step.operateKey || '步骤' }}</span>
              </div>
              <div class="step-head-right">
                <span v-if="step.totalTokens" class="step-meta">{{ step.totalTokens }} tokens</span>
                <span class="step-meta">{{ formatDuration(step.duration) }}</span>
                <span class="step-status" :class="{ error: step.error }">{{
                  step.error ? '失败' : '成功'
                }}</span>
              </div>
            </button>

            <div v-if="isExpanded(stepKey(step, index))" class="step-body">
              <div class="step-body-meta">
                <span>开始 {{ formatTime(step.startTime) }}</span>
                <span>结束 {{ formatTime(step.finishTime) }}</span>
                <span v-if="step.localOperation">本地操作</span>
              </div>
              <pre class="step-message">{{ formatMessage(step.message) }}</pre>
            </div>
          </div>
        </div>

        <div v-else class="execution-empty">当前记录暂无执行步骤</div>
      </template>
    </div>
  </el-drawer>
</template>

<style scoped lang="less">
.execution-drawer {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.execution-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  color: #1f2329;
}

.execution-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 18px 20px;
  border: 1px solid #dee0e3;
  border-radius: 12px;
  background: #fff;
}

.overview-name {
  color: #646a73;
  font-size: 14px;
  line-height: 22px;
}

.overview-value {
  margin-top: 6px;
  color: #1f2329;
  font-size: 22px;
  line-height: 30px;
  font-weight: 600;
}

.execution-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #646a73;
  font-size: 13px;
  line-height: 20px;
}

.execution-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.execution-step {
  border: 1px solid #dee0e3;
  border-radius: 12px;
  padding: 16px;
  background: #fff;
}

.step-head {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.step-head-left,
.step-head-right,
.step-body-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.step-arrow {
  transition: transform 0.16s ease;
}

.step-arrow.expanded {
  transform: rotate(90deg);
}

.step-name {
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
  color: #1f2329;
}

.step-meta {
  color: #646a73;
  font-size: 13px;
  line-height: 20px;
}

.step-status {
  color: #16a34a;
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
}

.step-status.error {
  color: #dc2626;
}

.step-body {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-body-meta {
  color: #646a73;
  font-size: 12px;
  line-height: 18px;
}

.step-message {
  margin: 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f5f6f7;
  color: #1f2329;
  font-size: 12px;
  line-height: 20px;
  white-space: pre-wrap;
  word-break: break-word;
}

.execution-loading,
.execution-empty {
  padding: 24px 0;
  color: #646a73;
  font-size: 14px;
  line-height: 22px;
}

.execution-error {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
}

.execution-error-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  color: #c23939;
}

.execution-error-copy {
  color: #646a73;
  font-size: 14px;
  line-height: 22px;
  white-space: pre-wrap;
}

.execution-retry {
  width: fit-content;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: #3370ff;
  color: #fff;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
</style>
