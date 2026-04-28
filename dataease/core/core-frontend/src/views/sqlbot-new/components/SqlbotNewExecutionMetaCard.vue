<script setup lang="ts">
import { computed } from 'vue'
import type {
  SqlbotNewExecutionSummary,
  SqlbotNewInterpretationMeta
} from '@/views/sqlbot-new/types'
import type { SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

const props = defineProps<{
  record: SqlbotNewConversationRecord
  interpretation?: SqlbotNewInterpretationMeta
  executionSummary?: SqlbotNewExecutionSummary
}>()

const emit = defineEmits<{
  (event: 'choose-suggestion', question: string): void
}>()

const normalizeText = (value?: string) => String(value || '').trim()

const normalizeList = (values?: string[]) => {
  return Array.isArray(values) ? values.map(item => normalizeText(item)).filter(Boolean) : []
}

const splitParagraphs = (value?: string) => {
  return normalizeText(value)
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
}

const isPlaceholderValue = (value?: string) => {
  const normalized = normalizeText(value).toLowerCase()
  return (
    !normalized ||
    normalized === '未识别' ||
    normalized === '未指定' ||
    normalized === '当前问数范围' ||
    normalized === 'demo'
  )
}

const isGenericSummary = (value?: string) => {
  const normalized = normalizeText(value)
  if (!normalized) {
    return true
  }

  return (
    normalized.includes('按当前默认时间范围') ||
    normalized.includes('按当前默认维度') ||
    normalized.includes('分析核心指标')
  )
}

const stageLabelMap: Record<string, string> = {
  connection_failed: '连接数据源失败',
  execute_sql_failed: '执行 SQL 失败',
  system_failed: '系统执行异常'
}

const scopeValue = computed(() => {
  const scopeLabel = normalizeText(props.executionSummary?.scopeLabel)
  if (!isPlaceholderValue(scopeLabel)) {
    return scopeLabel
  }

  const datasourceLabel = normalizeText(props.executionSummary?.datasourceLabel)
  if (!isPlaceholderValue(datasourceLabel)) {
    return datasourceLabel
  }

  return ''
})

const metricValue = computed(() => {
  const metrics = normalizeList(props.interpretation?.metric)
  return metrics.length ? metrics.join(' / ') : ''
})

const dimensionValue = computed(() => {
  const dimensions = normalizeList(props.interpretation?.dimension)
  return dimensions.length ? dimensions.join(' / ') : ''
})

const timeRangeValue = computed(() => {
  const value = normalizeText(props.interpretation?.timeRange)
  return isPlaceholderValue(value) ? '' : value
})

const defaultedFieldsValue = computed(() => {
  return normalizeList(props.interpretation?.defaultedFields)
})

const summaryValue = computed(() => {
  const value = normalizeText(props.executionSummary?.summary)
  return isGenericSummary(value) ? '' : value
})

const failureStageValue = computed(() => {
  const value = normalizeText(props.executionSummary?.failureStage)
  if (!value) {
    return ''
  }
  return stageLabelMap[value] || value
})

const nextActionValue = computed(() => {
  return normalizeText(props.executionSummary?.nextAction)
})

const answerParagraphs = computed(() => {
  return splitParagraphs(props.record.chartAnswer || props.record.sqlAnswer)
})

const answerText = computed(() => answerParagraphs.value.join('\n'))

const datasetRows = computed(() => {
  const rawData = props.record.data
  if (!rawData || typeof rawData === 'string') {
    return []
  }
  return Array.isArray(rawData.data) ? rawData.data : []
})

const hasChartPayload = computed(() => Boolean(props.record.chart))
const isEmptyResult = computed(() => hasChartPayload.value && datasetRows.value.length === 0)
const isNarrativeOnlyFailure = computed(() => {
  if (props.record.error || isEmptyResult.value || hasChartPayload.value) {
    return false
  }

  const text = answerText.value
  if (!text || !props.record.finish) {
    return false
  }

  return (
    text.includes('不能直接生成数据图表') ||
    text.includes('不能可靠问数') ||
    text.includes('当前卡住的原因') ||
    text.includes('暂时不能发起真实问数') ||
    text.includes('数据源仍在准备中') ||
    text.includes('当前条件下没有返回可展示的数据结果')
  )
})

const isFailureLike = computed(() => {
  return Boolean(props.record.error) || isEmptyResult.value || isNarrativeOnlyFailure.value
})

const questionMetricValue = computed(() => {
  const question = questionText.value
  if (!question) {
    return ''
  }

  const knownMetrics = [
    '销售金额',
    '销售额',
    '金额',
    '销售数量',
    '销量',
    '订单数',
    '订单量',
    '用户数',
    '用户量',
    '利润',
    '成本'
  ]

  return knownMetrics.find(item => question.includes(item)) || ''
})

const questionDimensionValue = computed(() => {
  const question = questionText.value
  if (!question) {
    return ''
  }

  const knownDimensions = ['店铺', '门店', '品类', '品线', '地区', '城市', '日期', '月份', '时间']
  return knownDimensions.find(item => question.includes(item)) || ''
})

const preferredMetric = computed(() => {
  return metricValue.value || questionMetricValue.value || '核心指标'
})

const preferredDimension = computed(() => {
  return dimensionValue.value || questionDimensionValue.value || ''
})

const recognizedItems = computed(() => {
  const items = [
    scopeValue.value ? `范围：${scopeValue.value}` : '',
    metricValue.value
      ? `指标：${metricValue.value}`
      : questionMetricValue.value
      ? `指标：${questionMetricValue.value}`
      : '',
    dimensionValue.value
      ? `维度：${dimensionValue.value}`
      : questionDimensionValue.value
      ? `维度：${questionDimensionValue.value}`
      : '',
    timeRangeValue.value ? `时间：${timeRangeValue.value}` : '',
    questionText.value.includes('占比') ? '分析类型：占比' : ''
  ].filter(Boolean)

  return [...new Set(items)]
})

const missingItems = computed(() => {
  const items: string[] = []
  if (!metricValue.value && !questionMetricValue.value) {
    items.push('明确指标')
  }
  if (
    !dimensionValue.value &&
    !questionDimensionValue.value &&
    questionText.value.includes('占比')
  ) {
    items.push('明确占比的比较维度')
  } else if (!dimensionValue.value && !questionDimensionValue.value) {
    items.push('明确维度')
  }
  if (!timeRangeValue.value) {
    items.push('明确时间范围')
  }
  return items
})

const questionText = computed(() => normalizeText(props.record.question))

const nextQuestionSuggestions = computed(() => {
  const suggestions: string[] = []
  const normalizedQuestion = questionText.value
  const metric = preferredMetric.value
  const dimension = preferredDimension.value
  const baseDimension = dimension || '店铺'

  if (normalizedQuestion.includes('占比')) {
    suggestions.push(`按${baseDimension}统计${metric}占比`)
    suggestions.push(`按品类统计${metric}占比`)
    suggestions.push(`近30天按${baseDimension}统计${metric}占比`)
    suggestions.push(`本月按${baseDimension}统计${metric}占比`)
  } else {
    suggestions.push(`按${baseDimension}统计${metric}`)
    suggestions.push(`按品类统计${metric}`)
    suggestions.push(`近30天按${baseDimension}统计${metric}`)
    suggestions.push(`本月按${baseDimension}统计${metric}`)
  }

  normalizeList(props.record.recommendQuestions).forEach(item => {
    suggestions.push(item)
  })

  return [...new Set(suggestions)].filter(item => item && item !== normalizedQuestion).slice(0, 4)
})

const summaryLine = computed(() => {
  if (summaryValue.value) {
    return summaryValue.value
  }
  if (isNarrativeOnlyFailure.value) {
    return answerParagraphs.value[0] || ''
  }
  if (props.record.error) {
    return '这次问题没有顺利执行到结果返回，建议先按提示补充口径后再问。'
  }
  if (isEmptyResult.value) {
    return '这次查询已经执行，但当前条件下没有返回可展示的数据结果。'
  }
  return ''
})

const cardTitle = computed(() => {
  if (props.record.error) {
    return '为什么这次没成功'
  }
  if (isEmptyResult.value) {
    return '为什么这次没出结果'
  }
  if (isNarrativeOnlyFailure.value) {
    return '为什么这次还不能直接问数'
  }
  return ''
})

const shouldRender = computed(() => {
  return Boolean(
    isFailureLike.value &&
      (cardTitle.value ||
        recognizedItems.value.length ||
        missingItems.value.length ||
        summaryLine.value ||
        defaultedFieldsValue.value.length ||
        failureStageValue.value ||
        nextQuestionSuggestions.value.length)
  )
})
</script>

<template>
  <section v-if="shouldRender" class="execution-meta-card">
    <div class="meta-head">
      <div class="meta-kicker">失败解释</div>
      <div class="meta-title">{{ cardTitle }}</div>
    </div>

    <div v-if="summaryLine" class="meta-summary">
      {{ summaryLine }}
    </div>

    <div v-if="recognizedItems.length" class="meta-status-panel">
      <div class="meta-status-row">
        <span class="meta-label">已识别到</span>
        <span class="meta-value">{{ recognizedItems.join('；') }}</span>
      </div>
    </div>

    <div v-if="missingItems.length" class="meta-status-panel">
      <div class="meta-status-row">
        <span class="meta-label">还缺少</span>
        <span class="meta-value">{{ missingItems.join(' / ') }}</span>
      </div>
    </div>

    <div v-if="defaultedFieldsValue.length" class="meta-note">
      系统已自动补全：{{ defaultedFieldsValue.join(' / ') }}
    </div>

    <div v-if="failureStageValue" class="meta-status-panel">
      <div v-if="failureStageValue" class="meta-status-row">
        <span class="meta-label">失败阶段</span>
        <span class="meta-value">{{ failureStageValue }}</span>
      </div>
    </div>

    <div v-if="nextQuestionSuggestions.length" class="meta-status-panel">
      <div class="meta-status-row">
        <span class="meta-label">建议你下一步这样问</span>
        <div class="meta-suggestion-list">
          <button
            v-for="item in nextQuestionSuggestions"
            :key="item"
            class="meta-suggestion-btn"
            type="button"
            @click="emit('choose-suggestion', item)"
          >
            {{ item }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
.execution-meta-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(126, 159, 231, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 248, 255, 0.98) 100%);
}

.meta-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-kicker {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #4a6ee0;
}

.meta-title {
  font-size: 16px;
  line-height: 1.5;
  color: #20315f;
  font-weight: 600;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(126, 159, 231, 0.14);
}

.meta-label {
  font-size: 12px;
  color: #6c7a9d;
}

.meta-value {
  font-size: 14px;
  line-height: 1.5;
  color: #1f3161;
  font-weight: 600;
}

.meta-note,
.meta-summary {
  font-size: 14px;
  line-height: 1.7;
  color: #30436f;
}

.meta-summary {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
}

.meta-status-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(242, 246, 255, 0.96);
  border: 1px dashed rgba(126, 159, 231, 0.3);
}

.meta-status-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-suggestion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-suggestion-btn {
  appearance: none;
  border: 1px solid rgba(126, 159, 231, 0.24);
  background: rgba(255, 255, 255, 0.92);
  color: #3153a4;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.meta-suggestion-btn:hover {
  border-color: rgba(51, 112, 255, 0.36);
  background: rgba(238, 244, 255, 0.96);
  color: #1d4fd7;
}
</style>
