<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CopyDocument, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus-secondary'
import Exceljs from 'exceljs'
import { saveAs } from 'file-saver'
import html2canvas from 'html2canvas'
import NativeChartPreview from '@/views/sqlbot/NativeChartPreview.vue'
import ReasoningPanel from '@/views/sqlbot/components/ReasoningPanel.vue'
import { explainSqlbotError } from '@/views/sqlbot/sqlbotErrorInfo'
import StarbiMarkdown from '@/views/sqlbot/StarbiMarkdown.vue'
import { canAttemptSqlbotChartInsert } from '@/views/sqlbot-new/sqlbotChartInsert'
import type { SqlbotNewSourceInsights } from '@/views/sqlbot-new/types'

type ChartType = 'table' | 'column' | 'bar' | 'line' | 'pie'

interface ChartAxis {
  name?: string
  value?: string
  type?: string
}

interface ChartConfig {
  type?: ChartType
  title?: string
  columns?: ChartAxis[]
  axis?: {
    x?: ChartAxis
    y?: ChartAxis | ChartAxis[]
    series?: ChartAxis
    'multi-quota'?: {
      name?: string
      value?: string[]
    }
  }
}

interface ChartDatasetField {
  name?: string
  value?: string
}

interface ChartDataset {
  fields?: Array<ChartDatasetField | string>
  data?: Record<string, any>[]
  limit?: number
  datasource?: number
  sql?: string
}

interface ReasoningFieldValue {
  field: string
  value: string
}

interface ReasoningData {
  time_range?: ReasoningFieldValue
  metrics?: ReasoningFieldValue[]
  dimensions?: ReasoningFieldValue[]
  filters?: ReasoningFieldValue[]
  datasource?: ReasoningFieldValue
}

interface SQLBotChatRecordLike {
  localId: string
  id?: number
  question: string
  sqlAnswer: string
  chartAnswer: string
  analysis?: string
  analysisThinking?: string
  analysisLoading?: boolean
  analysisError?: string
  analysisDuration?: number
  analysisTotalTokens?: number
  predict?: string
  predictThinking?: string
  predictLoading?: boolean
  predictError?: string
  reasoning?: Record<string, any>
  sql?: string
  chart?: string
  data?: ChartDataset | string
  error: string
  createTime: number
  finish: boolean
  finishTime?: string | number
  duration?: number
  totalTokens?: number
  recommendQuestions?: string[]
  display?: {
    chartType?: ChartType
    showChartSwitcher?: boolean
  }
}

interface InsightBlock {
  id: string
  title: string
  content: string
}

const props = withDefaults(
  defineProps<{
    record: SQLBotChatRecordLike
    sourceInsights?: SqlbotNewSourceInsights | null
    reasoningExpanded?: boolean
    showExecutionDetails?: boolean
    showPredictAction?: boolean
    showInsightActions?: boolean
    disableInlineInsights?: boolean
  }>(),
  {
    sourceInsights: undefined,
    reasoningExpanded: false,
    showExecutionDetails: false,
    showPredictAction: false,
    showInsightActions: true,
    disableInlineInsights: false
  }
)

const emit = defineEmits<{
  (event: 'toggle-reasoning'): void
  (event: 'interpret'): void
  (event: 'predict'): void
  (event: 'followup'): void
  (event: 'retry'): void
  (event: 'learning-fix', record: SQLBotChatRecordLike): void
  (event: 'recommend', question: string): void
  (event: 'change-chart-type', chartType: ChartType): void
  (event: 'view-execution-details', record: SQLBotChatRecordLike): void
  (event: 'insert-dashboard', record: SQLBotChatRecordLike): void
}>()

const chartCaptureRef = ref<HTMLDivElement | null>(null)
const fullscreenCaptureRef = ref<HTMLDivElement | null>(null)
const sqlDrawerVisible = ref(false)
const fullscreenVisible = ref(false)
const currentChartType = ref<ChartType>('table')
const showLabel = ref(true)
const analysisExpanded = ref(false)
const predictExpanded = ref(false)

const formatClock = (value?: string | number) => {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const chartConfig = computed<ChartConfig>(() => {
  if (!props.record.chart) {
    return {}
  }
  if (typeof props.record.chart === 'string') {
    try {
      return JSON.parse(props.record.chart)
    } catch (error) {
      console.error('parse SQLBot chart config failed', error)
      return {}
    }
  }
  return props.record.chart as unknown as ChartConfig
})

const datasetObject = computed<ChartDataset>(() => {
  if (!props.record.data) {
    return {}
  }
  if (typeof props.record.data === 'string') {
    try {
      return JSON.parse(props.record.data)
    } catch (error) {
      console.error('parse SQLBot chart data failed', error)
      return {}
    }
  }
  return props.record.data
})

const chartRows = computed<Record<string, any>[]>(() => {
  return Array.isArray(datasetObject.value?.data) ? datasetObject.value.data : []
})

const axisYList = computed(() => {
  const axis = chartConfig.value.axis || {}
  if (!axis.y) {
    return []
  }
  return Array.isArray(axis.y) ? axis.y : [axis.y]
})

const chartLoaded = computed(() => {
  return Boolean(datasetObject.value && Array.isArray(datasetObject.value.data))
})

const hasRows = computed(() => chartRows.value.length > 0)

const chartTypeOptions = computed<Array<{ value: ChartType; label: string }>>(() => {
  const axis = chartConfig.value.axis || {}
  const hasCartesian = Boolean(axis.x?.value) && axisYList.value.length > 0
  const hasPie = Boolean((axis.series?.value || axis.x?.value) && axisYList.value[0]?.value)
  const options: Array<{ value: ChartType; label: string }> = [{ value: 'table', label: '表格' }]

  if (hasCartesian) {
    options.push(
      { value: 'column', label: '柱图' },
      { value: 'bar', label: '条图' },
      { value: 'line', label: '线图' }
    )
  }
  if (hasPie) {
    options.push({ value: 'pie', label: '饼图' })
  }
  return options
})

watch(
  () => [props.record.display?.chartType, chartConfig.value.type, chartTypeOptions.value] as const,
  ([displayChartType, value, options]) => {
    const preferredType = (displayChartType as ChartType) || (value as ChartType) || 'table'
    currentChartType.value = options.some(item => item.value === preferredType)
      ? preferredType
      : options[0]?.value || 'table'
  },
  { immediate: true, deep: true }
)

watch(
  () => props.record.localId,
  () => {
    analysisExpanded.value = false
    predictExpanded.value = false
  },
  { immediate: true }
)

watch(
  () => props.record.predict,
  value => {
    if (String(value || '').trim()) {
      predictExpanded.value = true
    }
  }
)

watch(
  () => props.record.predictError,
  value => {
    if (String(value || '').trim()) {
      predictExpanded.value = true
    }
  }
)

const previewChartConfig = computed(() => {
  if (!chartConfig.value || !Object.keys(chartConfig.value).length) {
    return null
  }
  return {
    ...chartConfig.value,
    type: currentChartType.value
  }
})

const sanitizeNarrative = (value: string) => {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) {
        return false
      }
      if (
        (line.startsWith('{') && line.endsWith('}')) ||
        (line.startsWith('[') && line.endsWith(']'))
      ) {
        return false
      }
      return true
    })
    .join('\n')
    .trim()
}

const narrativeBlocks = computed<InsightBlock[]>(() => {
  const chartSummary = sanitizeNarrative(String(props.record.chartAnswer || ''))
  const reasoningSummary = sanitizeNarrative(String(props.record.sqlAnswer || ''))
  const blocks: InsightBlock[] = []

  if (chartSummary) {
    blocks.push({
      id: 'chart',
      title: '分析报告',
      content: chartSummary
    })
  }

  if (reasoningSummary && reasoningSummary !== chartSummary) {
    blocks.push({
      id: 'reasoning',
      title: '分析思路',
      content: reasoningSummary
    })
  }

  return blocks
})

const displayTitle = computed(() => {
  return chartConfig.value.title || 'StarBI 智能分析结果'
})

const chartInnerSubtitle = computed(() => {
  const title = String(displayTitle.value || '').trim()
  const question = String(props.record.question || '').trim()
  if (!title || title === 'StarBI 智能分析结果') {
    return ''
  }
  if (!question || title === question) {
    return ''
  }
  return title
})

const summaryText = computed(() => {
  return narrativeBlocks.value[0]?.content || ''
})

const explanationOnlyFailure = computed(() => {
  if (props.record.error || showChartBlock.value || showEmptyBlock.value) {
    return false
  }

  const text = summaryText.value
  if (!text || !props.record.finish) {
    return false
  }

  return (
    text.includes('不能直接生成数据图表') ||
    text.includes('不能可靠问数') ||
    text.includes('当前卡住的原因') ||
    text.includes('数据源仍在准备中') ||
    text.includes('暂时不能发起真实问数')
  )
})

const summaryKicker = computed(() => {
  return narrativeBlocks.value[0]?.title || (props.record.chartAnswer ? '分析报告' : 'AI 解读')
})

const statusTone = computed(() => {
  if (props.record.error) {
    return 'error'
  }
  if (props.record.finish) {
    return 'success'
  }
  return 'pending'
})

const statusText = computed(() => {
  if (props.record.error) {
    return '已中断'
  }
  if (props.record.finish) {
    return '分析完成'
  }
  return '思考中'
})

const thinkingText = computed(() => {
  return sanitizeNarrative(String(props.record.chartAnswer || props.record.sqlAnswer || ''))
})

const readReasoningValue = (source: Record<string, any>, ...keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return undefined
}

const normalizeReasoningEntry = (
  value: unknown,
  fallbackField: string
): ReasoningFieldValue | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const item = value as Record<string, any>
    const field = String(item.field || item.name || item.label || fallbackField)
    const entryValue = readReasoningValue(item, 'value', 'text', 'target', 'fieldName')
    const renderedValue = entryValue === undefined ? '' : String(entryValue)
    if (!field && !renderedValue) {
      return undefined
    }
    return {
      field,
      value: renderedValue || field
    }
  }
  return {
    field: fallbackField,
    value: String(value)
  }
}

const normalizeReasoningList = (value: unknown, fallbackField: string) => {
  const rawItems = Array.isArray(value) ? value : value === undefined ? [] : [value]
  return rawItems
    .map(item => normalizeReasoningEntry(item, fallbackField))
    .filter((item): item is ReasoningFieldValue => Boolean(item))
}

const normalizeReasoningData = (value?: Record<string, any>): ReasoningData | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const normalized: ReasoningData = {
    time_range: normalizeReasoningEntry(
      readReasoningValue(value, 'time_range', 'timeRange'),
      '时间范围'
    ),
    metrics: normalizeReasoningList(readReasoningValue(value, 'metrics', 'metric'), '指标'),
    dimensions: normalizeReasoningList(
      readReasoningValue(value, 'dimensions', 'dimension'),
      '维度'
    ),
    filters: normalizeReasoningList(readReasoningValue(value, 'filters', 'filter'), '筛选条件'),
    datasource: normalizeReasoningEntry(
      readReasoningValue(value, 'datasource', 'dataSource'),
      '数据源'
    )
  }

  if (
    normalized.time_range ||
    normalized.metrics?.length ||
    normalized.dimensions?.length ||
    normalized.filters?.length ||
    normalized.datasource
  ) {
    return normalized
  }
  return undefined
}

const structuredReasoning = computed(() => {
  return normalizeReasoningData(props.record.reasoning)
})

const errorInfo = computed(() => {
  return explainSqlbotError(String(props.record.error || ''))
})

const errorHeadline = computed(() => {
  return '这次问数我没能顺利完成'
})

const errorLeadLine = computed(() => {
  return `这次失败更像是${errorInfo.value.title}，不是你的提问方式本身有问题。`
})

const errorSummaryLine = computed(() => {
  return errorInfo.value.summary
})

const errorReasonLine = computed(() => {
  if (!errorInfo.value.detail) {
    return ''
  }
  return `底层返回的信息是：${errorInfo.value.detail}`
})

const errorSuggestionLine = computed(() => {
  if (!errorInfo.value.suggestions.length) {
    return ''
  }
  return `你可以先这样处理：${errorInfo.value.suggestions.join('；')}`
})

const reasoningPanelTitle = computed(() => {
  return props.record.finish ? '分析过程' : '思考过程'
})

const pendingThinkingHint = computed(() => {
  if (thinkingText.value) {
    return ''
  }
  return '正在拆解问题、匹配数据集，并准备生成图表结果...'
})

const showReasoningBlock = computed(() => {
  if (!props.record.finish) {
    return true
  }
  return Boolean(
    props.reasoningExpanded && (thinkingText.value || structuredReasoning.value || props.record.sql)
  )
})

const reasoningDuration = computed(() => {
  const duration = props.record.duration
  return Number.isFinite(duration) ? `${duration} 秒` : undefined
})

const reasoningExecutionSteps = computed(() => {
  const steps: Array<{ key: string; label: string; value: string }> = []
  if (props.record.sql) {
    steps.push({
      key: 'sql',
      label: 'SQL 生成',
      value: '已生成查询语句'
    })
  }
  if (chartLoaded.value) {
    steps.push({
      key: 'data',
      label: '数据加载',
      value: hasRows.value ? `已返回 ${chartRows.value.length} 行数据` : '已完成查询，暂无数据'
    })
  }
  if (props.record.chart) {
    steps.push({
      key: 'chart',
      label: '图表渲染',
      value: showChartBlock.value ? '已生成可视化图表' : '已生成图表配置'
    })
  }
  return steps
})

const showChartBlock = computed(() => {
  return Boolean(props.record.chart) && hasRows.value
})

const showEmptyBlock = computed(() => {
  return Boolean(props.record.chart) && chartLoaded.value && !hasRows.value
})

const chartLoading = computed(() => {
  return Boolean(props.record.chart) && !props.record.error && !chartLoaded.value
})

const exportColumns = computed(() => {
  const configColumns = chartConfig.value.columns || []
  if (configColumns.length) {
    return configColumns
      .map(item => ({
        key: item.value || item.name || '',
        label: item.name || item.value || ''
      }))
      .filter(item => item.key)
  }

  const fields = datasetObject.value.fields || []
  return fields
    .map(item => {
      if (typeof item === 'string') {
        return { key: item, label: item }
      }
      return {
        key: item.value || item.name || '',
        label: item.name || item.value || ''
      }
    })
    .filter(item => item.key)
})

const canExportExcel = computed(() => hasRows.value && exportColumns.value.length > 0)
const canExportImage = computed(() => showChartBlock.value && currentChartType.value !== 'table')

const currentChartTypeLabel = computed(() => {
  return chartTypeOptions.value.find(item => item.value === currentChartType.value)?.label || '表格'
})

const resultMetricChips = computed(() => {
  const chips: string[] = []
  if (chartRows.value.length) {
    chips.push(`${chartRows.value.length} 行结果`)
  }
  if (exportColumns.value.length) {
    chips.push(`${exportColumns.value.length} 个字段`)
  }
  if (showChartBlock.value) {
    chips.push(currentChartTypeLabel.value)
  }
  return chips
})

const analysisContent = computed(() => String(props.record.analysis || '').trim())
const analysisAvailable = computed(() => Boolean(analysisContent.value))
const analysisLoading = computed(() => Boolean(props.record.analysisLoading))
const analysisStatusText = computed(() => {
  if (props.record.analysisError) {
    return '解读失败'
  }
  if (analysisLoading.value) {
    return '生成中'
  }
  if (analysisAvailable.value) {
    return '已完成'
  }
  return ''
})

const analysisActionText = computed(() => {
  if (analysisLoading.value) {
    return '数据解读中...'
  }
  return '数据解读'
})

const predictContent = computed(() => String(props.record.predict || '').trim())
const predictAvailable = computed(() => Boolean(predictContent.value))
const predictLoading = computed(() => Boolean(props.record.predictLoading))
const predictStatusText = computed(() => {
  if (props.record.predictError) {
    return '预测失败'
  }
  if (predictLoading.value) {
    return '生成中'
  }
  if (predictAvailable.value) {
    return '已完成'
  }
  return ''
})

const predictActionText = computed(() => {
  if (predictLoading.value) {
    return '趋势预测中...'
  }
  return predictAvailable.value ? '查看预测' : '趋势预测'
})

const sourceInsightsValue = computed(() => props.sourceInsights || null)
const sourceInsightDatasets = computed(() => sourceInsightsValue.value?.datasets || [])
const sourceInsightRelations = computed(() => sourceInsightsValue.value?.relations || [])
const sourceInsightWarning = computed(() =>
  String(sourceInsightsValue.value?.relationWarning || '')
)
const formatRelationType = (value?: string) => {
  switch (value) {
    case 'inner':
      return '内'
    case 'right':
      return '右'
    case 'full':
      return '全'
    default:
      return '左'
  }
}
const showSourceInsights = computed(() => {
  return Boolean(
    sourceInsightDatasets.value.length > 1 &&
      (sourceInsightRelations.value.length || sourceInsightWarning.value)
  )
})

const showAnalysisPanel = computed(() => {
  return Boolean(
    !props.disableInlineInsights &&
      analysisExpanded.value &&
      (analysisLoading.value || analysisAvailable.value || props.record.analysisError)
  )
})

const showPredictPanel = computed(() => {
  return Boolean(
    !props.disableInlineInsights &&
      predictExpanded.value &&
      (predictLoading.value || predictAvailable.value || props.record.predictError)
  )
})

const hasMoreActions = computed(() => {
  return Boolean(
    (showChartBlock.value && currentChartType.value !== 'table') ||
      props.record.sql ||
      canExportExcel.value ||
      canExportImage.value ||
      showChartBlock.value
  )
})

const canInsertDashboard = computed(() => canAttemptSqlbotChartInsert(props.record))

const resolveCaptureTarget = () => {
  return fullscreenVisible.value ? fullscreenCaptureRef.value : chartCaptureRef.value
}

const copySql = async () => {
  const sql = String(props.record.sql || '').trim()
  if (!sql) {
    return
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(sql)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = sql
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('SQL 已复制')
  } catch (error) {
    console.error('copy sql failed', error)
    ElMessage.error('SQL 复制失败')
  }
}

const exportExcel = async () => {
  if (!canExportExcel.value) {
    ElMessage.warning('当前没有可导出的结果数据')
    return
  }

  const workbook = new Exceljs.Workbook()
  const worksheet = workbook.addWorksheet('StarBI Result')
  worksheet.columns = exportColumns.value.map(item => ({
    header: item.label,
    key: item.key,
    width: Math.min(Math.max(item.label.length + 8, 14), 28)
  }))

  chartRows.value.forEach(row => {
    const normalizedRow: Record<string, any> = {}
    exportColumns.value.forEach(column => {
      normalizedRow[column.key] = row?.[column.key] ?? ''
    })
    worksheet.addRow(normalizedRow)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const dataBlob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  })
  saveAs(dataBlob, `${displayTitle.value || 'StarBI结果'}.xlsx`)
}

const exportImage = async () => {
  if (!canExportImage.value) {
    ElMessage.warning('当前图表不支持导出图片')
    return
  }
  const target = resolveCaptureTarget()
  if (!target) {
    ElMessage.warning('图表尚未完成渲染')
    return
  }
  try {
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    })
    canvas.toBlob(blob => {
      if (!blob) {
        ElMessage.error('图片导出失败')
        return
      }
      saveAs(blob, `${displayTitle.value || 'StarBI图表'}.png`)
    }, 'image/png')
  } catch (error) {
    console.error('export chart image failed', error)
    ElMessage.error('图片导出失败')
  }
}

const handleInterpretAction = () => {
  if (!analysisAvailable.value && !analysisLoading.value) {
    analysisExpanded.value = true
    emit('interpret')
    return
  }
  analysisExpanded.value = !analysisExpanded.value
}

const handlePredictAction = () => {
  if (!predictAvailable.value && !predictLoading.value) {
    predictExpanded.value = true
    emit('predict')
    return
  }
  predictExpanded.value = !predictExpanded.value
}
</script>

<template>
  <div class="starbi-result-card" :class="statusTone">
    <div class="starbi-result-head">
      <div class="starbi-result-head-main">
        <span v-if="!record.error" class="starbi-result-status" :class="statusTone">
          {{ statusText }}
        </span>
      </div>
      <div class="starbi-result-head-side">
        <button
          v-if="thinkingText || structuredReasoning || record.sql"
          class="starbi-result-link"
          type="button"
          @click="emit('toggle-reasoning')"
        >
          {{ record.finish ? (reasoningExpanded ? '收起分析过程' : '展开分析过程') : '思考中...' }}
        </button>
        <el-dropdown v-if="hasMoreActions" trigger="click">
          <button class="starbi-result-more-btn" type="button">更多</button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-if="showChartBlock && currentChartType !== 'table'"
                @click="showLabel = !showLabel"
              >
                {{ showLabel ? '隐藏标签' : '显示标签' }}
              </el-dropdown-item>
              <el-dropdown-item v-if="record.sql" @click="sqlDrawerVisible = true">
                查看 SQL
              </el-dropdown-item>
              <el-dropdown-item :disabled="!canExportExcel" @click="exportExcel">
                导出 Excel
              </el-dropdown-item>
              <el-dropdown-item :disabled="!canExportImage" @click="exportImage">
                导出图片
              </el-dropdown-item>
              <el-dropdown-item v-if="showChartBlock" @click="fullscreenVisible = true">
                全屏查看
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <span class="starbi-result-time">
          {{ formatClock(record.finishTime || record.createTime) }}
        </span>
      </div>
    </div>

    <div
      v-if="summaryText && !showChartBlock && !explanationOnlyFailure"
      class="starbi-summary-panel"
    >
      <div v-if="record.question" class="starbi-summary-question">{{ record.question }}</div>
      <div class="starbi-summary-kicker">{{ summaryKicker }}</div>
      <div class="starbi-summary-text">{{ summaryText }}</div>
      <div v-if="narrativeBlocks.length > 1" class="starbi-summary-grid">
        <div
          v-for="block in narrativeBlocks.slice(1)"
          :key="block.id"
          class="starbi-summary-mini-card"
        >
          <div class="starbi-summary-mini-title">{{ block.title }}</div>
          <div class="starbi-summary-mini-text">{{ block.content }}</div>
        </div>
      </div>
    </div>

    <div v-if="showChartBlock || chartLoading || showEmptyBlock" class="starbi-chart-shell">
      <div class="starbi-chart-shell-head">
        <div class="starbi-chart-title-wrap">
          <div v-if="record.question" class="starbi-chart-title">{{ record.question }}</div>
          <div v-if="chartInnerSubtitle" class="starbi-chart-subtitle">
            {{ chartInnerSubtitle }}
          </div>
          <div v-if="resultMetricChips.length" class="starbi-chart-metrics">
            <span v-for="item in resultMetricChips" :key="item" class="starbi-chart-metric-chip">
              {{ item }}
            </span>
          </div>
        </div>
      </div>

      <div
        ref="chartCaptureRef"
        v-loading="chartLoading"
        class="starbi-chart-surface"
        :class="{ empty: showEmptyBlock }"
      >
        <NativeChartPreview
          v-if="showChartBlock && previewChartConfig"
          :chart="previewChartConfig"
          :dataset="datasetObject"
          :height="336"
          :show-label="showLabel"
        />

        <div v-else-if="showEmptyBlock" class="starbi-empty-panel">
          <div class="starbi-empty-title">当前条件下暂无结果</div>
          <div class="starbi-empty-copy">可放宽时间范围或筛选条件后继续追问。</div>
        </div>
      </div>

      <div v-if="datasetObject.limit" class="starbi-chart-limit">
        当前结果仅展示前 {{ datasetObject.limit }} 行
      </div>
    </div>

    <div v-if="showReasoningBlock" class="starbi-detail-grid">
      <ReasoningPanel
        v-if="structuredReasoning"
        :reasoning="structuredReasoning"
        :row-count="chartLoaded ? chartRows.length : undefined"
        :duration="reasoningDuration"
        :token-count="record.totalTokens"
        :execution-sql="record.sql"
        :execution-steps="reasoningExecutionSteps"
        :record-id="record.id"
      />

      <div v-if="thinkingText" class="starbi-detail-panel" :class="{ live: !record.finish }">
        <div class="starbi-detail-title">{{ reasoningPanelTitle }}</div>
        <div class="starbi-detail-copy">{{ thinkingText }}</div>
      </div>

      <div v-else-if="!record.finish" class="starbi-detail-panel live placeholder">
        <div class="starbi-detail-title">{{ reasoningPanelTitle }}</div>
        <div class="starbi-thinking-loading">
          <span class="starbi-thinking-dot"></span>
          <span class="starbi-thinking-dot"></span>
          <span class="starbi-thinking-dot"></span>
          <span>{{ pendingThinkingHint }}</span>
        </div>
      </div>

      <div v-if="record.finish && record.sql" class="starbi-detail-panel sql">
        <div class="starbi-detail-title">
          <span>生成 SQL</span>
          <button class="starbi-inline-icon" type="button" @click="copySql">
            <el-icon><CopyDocument /></el-icon>
          </button>
        </div>
        <pre class="starbi-sql-block">{{ record.sql }}</pre>
      </div>
    </div>

    <div
      v-if="showAnalysisPanel"
      class="starbi-analysis-panel"
      :class="{ loading: analysisLoading, error: !!record.analysisError }"
    >
      <div class="starbi-analysis-head">
        <div class="starbi-analysis-head-main">
          <div class="starbi-analysis-kicker">数据解读</div>
          <div class="starbi-analysis-title">
            {{ analysisAvailable ? '业务结论与建议' : 'StarBI 正在生成业务解读' }}
          </div>
        </div>
        <span v-if="analysisStatusText" class="starbi-analysis-status">
          {{ analysisStatusText }}
        </span>
      </div>

      <div v-if="analysisLoading && !analysisAvailable" class="starbi-analysis-loading">
        <span class="starbi-analysis-dot"></span>
        <span class="starbi-analysis-dot"></span>
        <span class="starbi-analysis-dot"></span>
        <span>正在结合当前图表结果生成结论，请稍候</span>
      </div>

      <StarbiMarkdown v-if="analysisAvailable" :message="record.analysis" />

      <div v-if="record.analysisError" class="starbi-analysis-error">
        {{ record.analysisError }}
      </div>
    </div>

    <div
      v-if="showPredictPanel"
      class="starbi-analysis-panel"
      :class="{ loading: predictLoading, error: !!record.predictError }"
    >
      <div class="starbi-analysis-head">
        <div class="starbi-analysis-head-main">
          <div class="starbi-analysis-kicker">趋势预测</div>
          <div class="starbi-analysis-title">
            {{ predictAvailable ? '预测结果与风险提示' : 'StarBI 正在生成趋势预测' }}
          </div>
        </div>
        <span v-if="predictStatusText" class="starbi-analysis-status">
          {{ predictStatusText }}
        </span>
      </div>

      <div v-if="predictLoading && !predictAvailable" class="starbi-analysis-loading">
        <span class="starbi-analysis-dot"></span>
        <span class="starbi-analysis-dot"></span>
        <span class="starbi-analysis-dot"></span>
        <span>正在基于当前结果生成预测，请稍候</span>
      </div>

      <StarbiMarkdown v-if="predictAvailable" :message="record.predict || ''" />

      <div v-if="record.predictError" class="starbi-analysis-error">
        {{ record.predictError }}
      </div>
    </div>

    <div v-if="showSourceInsights" class="starbi-analysis-source-card">
      <div class="starbi-analysis-source-head">
        <div class="starbi-analysis-source-title">数据来源与关联关系</div>
        <div class="starbi-analysis-source-subtitle">仅在本次结果真实涉及多个数据集时展示</div>
      </div>

      <div class="starbi-analysis-source-datasets">
        <span
          v-for="dataset in sourceInsightDatasets"
          :key="dataset.id || dataset.name"
          class="starbi-analysis-source-chip"
        >
          {{ dataset.name }}
        </span>
      </div>

      <div v-if="sourceInsightRelations.length" class="starbi-analysis-source-relations">
        <div
          v-for="relation in sourceInsightRelations"
          :key="relation.id"
          class="starbi-analysis-source-relation"
        >
          {{ relation.leftDatasetName }}.{{ relation.leftField }} =
          {{ relation.rightDatasetName }}.{{ relation.rightField }}
          <span class="starbi-analysis-source-relation-type">
            （{{ formatRelationType(relation.relationType) }}连接）
          </span>
        </div>
      </div>

      <div v-else-if="sourceInsightWarning" class="starbi-analysis-source-warning">
        {{ sourceInsightWarning }}
      </div>
    </div>

    <div v-if="record.error" class="starbi-summary-panel error-message">
      <div class="starbi-analysis-kicker">StarBI</div>
      <div class="starbi-error-title">{{ errorHeadline }}</div>
      <div class="starbi-summary-text">{{ errorLeadLine }}</div>
      <div class="starbi-error-detail strong">{{ errorSummaryLine }}</div>
      <div v-if="errorReasonLine" class="starbi-error-detail">{{ errorReasonLine }}</div>
      <div v-if="errorSuggestionLine" class="starbi-error-detail">{{ errorSuggestionLine }}</div>
    </div>

    <div class="starbi-result-foot">
      <div class="starbi-result-actions">
        <button
          v-if="showExecutionDetails && record.id"
          class="starbi-foot-btn ghost"
          type="button"
          @pointerdown.stop
          @mousedown.stop
          @click.stop="emit('view-execution-details', record)"
        >
          执行详情
        </button>
        <button
          v-if="record.error"
          class="starbi-foot-btn"
          type="button"
          @pointerdown.stop
          @mousedown.stop
          @click.stop="emit('retry')"
        >
          重试
        </button>
        <button
          v-if="showInsightActions && record.finish && !record.error && record.id"
          class="starbi-foot-btn"
          :class="{ disabled: analysisLoading }"
          type="button"
          :disabled="analysisLoading"
          @pointerdown.stop
          @mousedown.stop
          @click.stop="handleInterpretAction"
        >
          {{ analysisActionText }}
        </button>
        <button
          v-if="
            showInsightActions && showPredictAction && record.finish && !record.error && record.id
          "
          class="starbi-foot-btn ghost"
          :class="{ disabled: predictLoading }"
          type="button"
          :disabled="predictLoading"
          @pointerdown.stop
          @mousedown.stop
          @click.stop="handlePredictAction"
        >
          {{ predictActionText }}
        </button>
        <button
          v-if="record.finish && !record.error && record.sql"
          class="starbi-foot-btn ghost"
          type="button"
          @pointerdown.stop
          @mousedown.stop
          @click.stop="emit('learning-fix', record)"
        >
          学习修正
        </button>
        <button
          v-if="record.finish && !record.error"
          class="starbi-foot-btn ghost"
          type="button"
          :disabled="!canInsertDashboard"
          @pointerdown.stop
          @mousedown.stop
          @click.stop="emit('insert-dashboard', record)"
        >
          插入仪表板/大屏
        </button>
        <button
          v-if="record.finish && !record.error"
          class="starbi-foot-btn ghost"
          type="button"
          @pointerdown.stop
          @mousedown.stop
          @click.stop="emit('followup')"
        >
          追加追问
        </button>
      </div>

      <div class="starbi-result-meta">
        <span class="starbi-meta-tag">StarBI</span>
        <span v-if="record.totalTokens" class="starbi-meta-item">
          Tokens {{ record.totalTokens }}
        </span>
        <span v-if="record.duration" class="starbi-meta-item">耗时 {{ record.duration }} s</span>
      </div>
    </div>

    <el-drawer v-model="sqlDrawerVisible" :size="520" title="查看 SQL" direction="rtl">
      <div class="starbi-sql-drawer">
        <div class="starbi-sql-drawer-toolbar">
          <button class="starbi-chart-icon-btn" type="button" @click="copySql">
            <el-icon><CopyDocument /></el-icon>
            <span>复制 SQL</span>
          </button>
        </div>
        <pre class="starbi-sql-block drawer">{{ record.sql }}</pre>
      </div>
    </el-drawer>

    <el-dialog
      v-model="fullscreenVisible"
      fullscreen
      :show-close="false"
      class="starbi-result-fullscreen-dialog"
    >
      <div class="starbi-fullscreen-shell">
        <div class="starbi-fullscreen-head">
          <div class="starbi-fullscreen-copy">
            <div class="starbi-fullscreen-title">{{ displayTitle }}</div>
            <div class="starbi-fullscreen-subtitle">{{ record.question }}</div>
          </div>
          <div class="starbi-fullscreen-actions">
            <button
              v-if="showChartBlock && currentChartType !== 'table'"
              class="starbi-chart-icon-btn"
              :class="{ active: showLabel }"
              type="button"
              @click="showLabel = !showLabel"
            >
              <span>{{ showLabel ? '隐藏标签' : '显示标签' }}</span>
            </button>
            <button
              v-if="record.sql"
              class="starbi-chart-icon-btn"
              type="button"
              @click="sqlDrawerVisible = true"
            >
              SQL
            </button>
            <button class="starbi-chart-icon-btn" type="button" @click="exportImage">
              <el-icon><Download /></el-icon>
              <span>导出图片</span>
            </button>
            <button
              class="starbi-chart-icon-btn strong"
              type="button"
              @click="fullscreenVisible = false"
            >
              退出全屏
            </button>
          </div>
        </div>

        <div ref="fullscreenCaptureRef" class="starbi-fullscreen-stage">
          <NativeChartPreview
            v-if="previewChartConfig"
            :chart="previewChartConfig"
            :dataset="datasetObject"
            :height="640"
            :show-label="showLabel"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="less">
.starbi-result-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-radius: 32px;
  padding: 24px 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(243, 248, 255, 0.97) 100%),
    #ffffff;
  border: 1px solid rgba(190, 214, 250, 0.92);
  box-shadow: 0 20px 40px rgba(35, 76, 170, 0.1);
}

.starbi-result-card.pending {
  border-color: rgba(126, 159, 231, 0.82);
}

.starbi-result-card.error {
  border-color: rgba(190, 214, 250, 0.92);
  box-shadow: 0 20px 40px rgba(35, 76, 170, 0.1);
}

.starbi-result-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.starbi-result-head-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.starbi-result-status {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.starbi-result-status.pending {
  color: #1d5eff;
  background: rgba(29, 94, 255, 0.1);
}

.starbi-result-status.success {
  color: #14684f;
  background: rgba(20, 104, 79, 0.1);
}

.starbi-result-status.error {
  color: #c23939;
  background: rgba(194, 57, 57, 0.1);
}

.starbi-result-question {
  color: #1d2a52;
  font-size: clamp(16px, 0.88vw, 18px);
  line-height: 1.6;
  font-weight: 600;
}

.starbi-result-head-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.starbi-result-link {
  border: none;
  background: transparent;
  color: #2c63ff;
  font-size: 15px;
  cursor: pointer;
  padding: 0;
}

.starbi-result-more-btn {
  border: 1px solid rgba(214, 224, 244, 0.92);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #344a6f;
  font-size: 14px;
  font-weight: 600;
  padding: 5px 12px;
  cursor: pointer;
}

.starbi-result-time {
  color: #667b9f;
  font-size: 13px;
  line-height: 20px;
}

.starbi-summary-panel {
  border-radius: 26px;
  padding: 22px 22px 20px;
  background: linear-gradient(135deg, rgba(235, 244, 255, 0.95) 0%, rgba(245, 249, 255, 0.88) 100%);
  border: 1px solid rgba(149, 184, 255, 0.28);
}

.starbi-summary-question {
  color: #1c2f56;
  font-size: clamp(18px, 1vw, 20px);
  font-weight: 600;
  line-height: 1.6;
  margin-bottom: 8px;
}

.starbi-summary-kicker {
  color: #2d66ff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.starbi-summary-text,
.starbi-detail-copy,
.starbi-empty-copy {
  color: #233a62;
  font-size: clamp(16px, 0.92vw, 18px);
  line-height: 1.8;
  white-space: pre-wrap;
}

.starbi-summary-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.starbi-summary-mini-card {
  border-radius: 18px;
  padding: 14px 15px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(149, 184, 255, 0.2);
}

.starbi-summary-mini-title {
  color: #2857cf;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
}

.starbi-summary-mini-text {
  color: #304a73;
  font-size: 15px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.starbi-chart-shell {
  border-radius: 24px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(246, 250, 255, 0.96), rgba(241, 247, 255, 0.92));
  border: 1px solid rgba(203, 221, 248, 0.9);
}

.starbi-chart-shell-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.starbi-chart-title-wrap {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.starbi-chart-title {
  color: #1d335e;
  font-size: clamp(18px, 0.95vw, 20px);
  line-height: 1.55;
  font-weight: 700;
}

.starbi-chart-subtitle {
  color: #4f6488;
  font-size: 14px;
  line-height: 1.45;
}

.starbi-chart-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.starbi-chart-metric-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #405a85;
  font-size: 13px;
  box-shadow: inset 0 0 0 1px rgba(141, 177, 255, 0.22);
}

.starbi-fullscreen-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.starbi-chart-type-switch {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 999px;
  background: rgba(218, 230, 255, 0.68);
  gap: 4px;
}

.starbi-chart-type-btn,
.starbi-chart-icon-btn,
.starbi-foot-btn,
.starbi-inline-icon {
  border: none;
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.18s ease, color 0.18s ease,
    box-shadow 0.18s ease;
}

.starbi-chart-type-btn {
  min-width: 44px;
  padding: 4px 8px;
  border-radius: 999px;
  background: transparent;
  color: #4b628d;
  font-size: 10px;
  font-weight: 600;
}

.starbi-chart-type-btn.active {
  color: #ffffff;
  background: linear-gradient(135deg, #2a66ff 0%, #4c86ff 100%);
  box-shadow: 0 8px 18px rgba(42, 102, 255, 0.24);
}

.starbi-chart-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 7px;
  border-radius: 10px;
  background: #ffffff;
  color: #36558f;
  font-size: 10px;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(141, 177, 255, 0.26);
}

.starbi-chart-icon-btn.active {
  color: #ffffff;
  background: linear-gradient(135deg, #2a66ff 0%, #4c86ff 100%);
  box-shadow: 0 10px 22px rgba(42, 102, 255, 0.22);
}

.starbi-chart-icon-btn.strong {
  background: linear-gradient(135deg, #2b67ff 0%, #4b88ff 100%);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(43, 103, 255, 0.24);
}

.starbi-chart-surface {
  min-height: 376px;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: inset 0 0 0 1px rgba(199, 216, 245, 0.9), 0 8px 18px rgba(29, 78, 216, 0.04);
}

.starbi-chart-surface.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.starbi-empty-panel {
  max-width: 420px;
  text-align: center;
  padding: 40px 24px;
}

.starbi-empty-title {
  color: #22345b;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 10px;
}

.starbi-chart-limit {
  margin-top: 12px;
  color: #8590ad;
  font-size: 13px;
}

.starbi-analysis-panel {
  border-radius: 24px;
  padding: 20px 20px 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 248, 255, 0.94) 100%);
  border: 1px solid rgba(210, 222, 245, 0.9);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.76);
}

.starbi-analysis-panel.loading {
  border-color: rgba(75, 136, 255, 0.26);
}

.starbi-analysis-panel.error {
  border-color: rgba(234, 125, 125, 0.28);
}

.starbi-analysis-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.starbi-analysis-head-main {
  min-width: 0;
}

.starbi-analysis-kicker {
  color: #2d66ff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.starbi-analysis-title {
  color: #1d2b4f;
  font-size: 18px;
  line-height: 1.55;
  font-weight: 700;
}

.starbi-analysis-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(42, 102, 255, 0.1);
  color: #2a66ff;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.starbi-analysis-loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 2px;
  color: #5c6f95;
  font-size: 14px;
}

.starbi-analysis-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a67ff 0%, #79a6ff 100%);
  animation: starbiAnalysisPulse 1.4s ease-in-out infinite;
}

.starbi-analysis-dot:nth-child(2) {
  animation-delay: 0.16s;
}

.starbi-analysis-dot:nth-child(3) {
  animation-delay: 0.32s;
}

.starbi-analysis-error {
  margin-top: 12px;
  border-radius: 16px;
  padding: 12px 14px;
  color: #b63a3a;
  background: rgba(255, 236, 236, 0.86);
  border: 1px solid rgba(238, 120, 120, 0.2);
  line-height: 1.8;
  white-space: pre-wrap;
}

.starbi-analysis-source-card {
  margin-top: 14px;
  border-radius: 18px;
  padding: 16px;
  background: rgba(245, 249, 255, 0.94);
  border: 1px solid rgba(190, 214, 250, 0.92);
}

.starbi-analysis-source-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.starbi-analysis-source-title {
  color: #1d2b4f;
  font-size: 15px;
  font-weight: 700;
}

.starbi-analysis-source-subtitle {
  color: #62779d;
  font-size: 13px;
  line-height: 1.5;
}

.starbi-analysis-source-datasets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.starbi-analysis-source-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: #ffffff;
  color: #36558f;
  font-size: 13px;
  box-shadow: inset 0 0 0 1px rgba(141, 177, 255, 0.26);
}

.starbi-analysis-source-relations {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.starbi-analysis-source-relation,
.starbi-analysis-source-warning {
  color: #233a62;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.starbi-analysis-source-relation-type {
  color: #5f7499;
}

.starbi-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.starbi-detail-panel {
  border-radius: 18px;
  padding: 16px;
  background: rgba(250, 252, 255, 0.96);
  border: 1px solid rgba(214, 225, 245, 0.9);
}

.starbi-detail-panel.live {
  background: linear-gradient(180deg, rgba(247, 250, 255, 0.98), rgba(238, 244, 255, 0.94));
  border-color: rgba(181, 202, 244, 0.96);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.76);
}

.starbi-detail-panel.placeholder {
  min-height: 118px;
}

.starbi-detail-panel.sql {
  background: linear-gradient(180deg, rgba(16, 25, 48, 0.98) 0%, rgba(19, 31, 61, 0.96) 100%);
  border-color: rgba(104, 137, 221, 0.26);
}

.starbi-detail-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #1d2b4f;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
}

.starbi-detail-panel.sql .starbi-detail-title {
  color: #dce6ff;
}

.starbi-thinking-loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  color: #5c6f95;
  font-size: 13px;
  line-height: 22px;
}

.starbi-thinking-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a67ff 0%, #79a6ff 100%);
  animation: starbiAnalysisPulse 1.4s ease-in-out infinite;
}

.starbi-thinking-dot:nth-child(2) {
  animation-delay: 0.16s;
}

.starbi-thinking-dot:nth-child(3) {
  animation-delay: 0.32s;
}

.starbi-inline-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.starbi-sql-block {
  margin: 0;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.7;
  color: #d8e4ff;
  font-family: Monaco, Menlo, Consolas, 'Liberation Mono', monospace;
}

.starbi-sql-block.drawer {
  color: #dbe7ff;
  background: linear-gradient(180deg, #111a32 0%, #162346 100%);
  border-radius: 20px;
  padding: 18px;
}

.starbi-error-panel {
  border-radius: 18px;
  padding: 14px 16px;
  color: #b63a3a;
  background: rgba(255, 235, 235, 0.86);
  border: 1px solid rgba(238, 120, 120, 0.24);
  line-height: 1.8;
  white-space: pre-wrap;
}

.starbi-summary-panel.error-message {
  background: linear-gradient(135deg, rgba(235, 244, 255, 0.95) 0%, rgba(245, 249, 255, 0.88) 100%);
  border: 1px solid rgba(149, 184, 255, 0.28);
}

.starbi-error-title {
  color: #1d2a52;
  font-size: clamp(18px, 1vw, 20px);
  font-weight: 600;
  line-height: 1.6;
  margin-bottom: 8px;
}

.starbi-error-detail {
  color: #4f6488;
  font-size: 14px;
  line-height: 1.7;
  margin-top: 10px;
  white-space: pre-wrap;
}

.starbi-error-detail.strong {
  color: #233a62;
  font-size: 15px;
}

.starbi-result-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 12px;
  border-top: 1px solid rgba(227, 233, 245, 0.9);
  position: relative;
  z-index: 2;
  pointer-events: auto;
}

.starbi-result-actions,
.starbi-result-meta,
.starbi-sql-drawer-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
  pointer-events: auto;
}

.starbi-foot-btn {
  padding: 9px 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, #2a67ff 0%, #4b88ff 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 10px 20px rgba(42, 103, 255, 0.16);
  position: relative;
  z-index: 3;
  pointer-events: auto;
}

.starbi-foot-btn.disabled {
  cursor: not-allowed;
  opacity: 0.74;
  box-shadow: none;
}

.starbi-foot-btn.ghost {
  background: rgba(234, 241, 255, 0.92);
  color: #2f62ea;
  box-shadow: none;
}

.starbi-meta-tag,
.starbi-meta-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(245, 247, 252, 0.96);
  color: #74809a;
  font-size: 13px;
}

.starbi-meta-tag {
  color: #2a66ff;
  background: rgba(232, 240, 255, 0.94);
  font-weight: 700;
}

.starbi-sql-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.starbi-fullscreen-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: linear-gradient(180deg, #f4f8ff 0%, #edf3ff 100%);
}

.starbi-fullscreen-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.starbi-fullscreen-copy {
  min-width: 0;
}

.starbi-fullscreen-title {
  color: #203058;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 6px;
}

.starbi-fullscreen-subtitle {
  color: #6b7797;
  font-size: 14px;
}

.starbi-fullscreen-stage {
  flex: 1;
  min-height: 0;
  border-radius: 26px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(145, 180, 255, 0.18);
}

:deep(.starbi-result-fullscreen-dialog .el-dialog__header) {
  display: none;
}

:deep(.starbi-result-fullscreen-dialog .el-dialog__body) {
  padding: 0;
  height: 100%;
}

@media (max-width: 960px) {
  .starbi-result-card {
    padding: 16px;
    border-radius: 20px;
  }

  .starbi-result-head,
  .starbi-chart-shell-head,
  .starbi-analysis-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .starbi-result-head-side {
    width: 100%;
    justify-content: space-between;
  }

  .starbi-chart-surface {
    min-height: 320px;
  }

  .starbi-fullscreen-shell {
    padding: 18px;
  }

  .starbi-fullscreen-title {
    font-size: 20px;
  }
}

@keyframes starbiAnalysisPulse {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
</style>
