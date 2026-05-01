<template>
  <el-drawer
    v-model="drawerVisible"
    title="学习任务详情"
    size="560px"
    direction="rtl"
    modal-class="learning-task-drawer"
  >
    <div class="learning-task-drawer__body">
      <div class="learning-task-drawer__summary">
        <div>
          <span class="learning-task-drawer__label">资源名称</span>
          <div class="learning-task-drawer__value">{{ resourceName || '--' }}</div>
        </div>
        <div>
          <span class="learning-task-drawer__label">任务编号</span>
          <div class="learning-task-drawer__value">{{ taskId || '--' }}</div>
        </div>
        <LearningStatusTag :status="status" />
      </div>

      <LearningScoreCard
        v-if="showScoreCard"
        :grade="qualityGrade"
        :signals="signals"
        :suggestions="suggestions"
      />

      <LearningFeedbackSummaryCard v-if="feedbackSummary" :summary="feedbackSummary" />

      <div v-if="showFailurePanel" class="learning-task-drawer__failure">
        <div class="learning-task-drawer__failure-header">
          <span class="learning-task-drawer__section-title">失败原因</span>
          <button class="learning-task-drawer__retry" type="button" @click="emitRetry">
            重新学习
          </button>
        </div>
        <div class="learning-task-drawer__failure-copy">{{ failureCopy }}</div>
      </div>

      <div class="learning-task-drawer__timeline">
        <div
          v-for="item in timelineItems"
          :key="item.label"
          class="learning-task-drawer__timeline-item"
        >
          <span class="learning-task-drawer__timeline-dot"></span>
          <div>
            <div class="learning-task-drawer__timeline-label">{{ item.label }}</div>
            <div class="learning-task-drawer__timeline-copy">{{ item.copy }}</div>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { QueryLearningFeedbackSummary } from '@/api/queryResourceLearning'
import LearningFeedbackSummaryCard from './LearningFeedbackSummaryCard.vue'
import LearningScoreCard from './LearningScoreCard.vue'
import LearningStatusTag from './LearningStatusTag.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    taskId?: string | null
    resourceName?: string
    status?: string
    qualityGrade?: string
    signals?: string[]
    suggestions?: string[]
    failureReason?: string
    feedbackSummary?: QueryLearningFeedbackSummary | null
  }>(),
  {
    taskId: null,
    resourceName: '',
    status: '待学习',
    qualityGrade: '',
    signals: () => [],
    suggestions: () => [],
    failureReason: '',
    feedbackSummary: null
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'retry'): void
}>()

const drawerVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const isFailed = computed(() => props.status.includes('失败'))
const isProcessing = computed(
  () => props.status.includes('学习中') || props.status.includes('执行中')
)
const showFailurePanel = computed(() => isFailed.value)
const showScoreCard = computed(() =>
  Boolean(props.qualityGrade || props.signals.length || props.suggestions.length)
)

const failureCopy = computed(() => {
  return props.failureReason.trim() || '系统暂未返回失败详情，请重新学习后再次查看。'
})

const emitRetry = () => {
  emit('retry')
}

const timelineItems = computed(() => [
  { label: '元数据采集', copy: '完成数据集字段与主题上下文整理。' },
  { label: '语义学习', copy: '生成资源语义标签与推荐问法。' },
  {
    label: isFailed.value ? '任务结果' : isProcessing.value ? '执行进度' : '评分结果',
    copy: isFailed.value
      ? failureCopy.value
      : isProcessing.value
      ? '学习任务正在执行，完成后会更新评分与优化建议。'
      : '当前学习任务已完成，可继续查看评分与优化建议。'
  }
])
</script>

<style lang="less" scoped>
.learning-task-drawer__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 4px 10px;
}

.learning-task-drawer__summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid #e4e7ec;
  border-radius: 16px;
  background: #fff;
}

.learning-task-drawer__label {
  display: block;
  margin-bottom: 4px;
  color: #667085;
  font-size: 15px;
  line-height: 23px;
}

.learning-task-drawer__value {
  color: #101828;
  font-size: 17px;
  line-height: 25px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.learning-task-drawer__timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid #e4e7ec;
  border-radius: 16px;
  background: #fff;
}

.learning-task-drawer__failure {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid #f3d0cd;
  border-radius: 16px;
  background: #fff7f6;
}

.learning-task-drawer__failure-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.learning-task-drawer__section-title {
  color: #b42318;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.learning-task-drawer__failure-copy {
  color: #912018;
  font-size: 16px;
  line-height: 1.6;
}

.learning-task-drawer__retry {
  height: 34px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: #d92d20;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.learning-task-drawer__timeline-item {
  display: flex;
  gap: 12px;
}

.learning-task-drawer__timeline-dot {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 999px;
  background: #2f6bff;
}

.learning-task-drawer__timeline-label {
  color: #344054;
  font-size: 17px;
  line-height: 25px;
  font-weight: 600;
}

.learning-task-drawer__timeline-copy {
  margin-top: 4px;
  color: #667085;
  font-size: 16px;
  line-height: 1.5;
}
</style>
