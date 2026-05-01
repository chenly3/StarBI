<script setup lang="ts">
import { computed, nextTick, ref, unref, watch } from 'vue'
import { ElMessage } from 'element-plus-secondary'
import { insertAIQueryChartIntoCanvas } from '@/api/aiQueryChartResource'
import { createAIQueryDatasetCombination } from '@/api/aiQueryDatasetCombination'
import { getExecutionDetails, type AIQueryExecutionDetails } from '@/api/aiQueryTheme'
import {
  createQueryLearningFeedbackEvent,
  type QueryLearningPatchType
} from '@/api/queryResourceLearning'
import { queryTreeApi } from '@/api/visualization/dataVisualization'
import router from '@/router'
import SqlbotNewConversationRecord from '@/views/sqlbot-new/components/SqlbotNewConversationRecord.vue'
import SqlbotInsertTargetDialog from '@/views/sqlbot-new/components/SqlbotInsertTargetDialog.vue'
import SqlbotNewContextSwitchCard from '@/views/sqlbot-new/components/SqlbotNewContextSwitchCard.vue'
import SqlbotNewDatasetCombinationDialog from '@/views/sqlbot-new/components/SqlbotNewDatasetCombinationDialog.vue'
import SqlbotNewDatasetDetailDialog from '@/views/sqlbot-new/components/SqlbotNewDatasetDetailDialog.vue'
import ExecutionDetailsDrawer from '@/views/sqlbot-new/components/ExecutionDetailsDrawer.vue'
import ScopeBar from '@/views/sqlbot-new/components/ScopeBar.vue'
import SqlbotNewFileDetailDialog from '@/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue'
import SqlbotNewFileUploadDialog from '@/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue'
import SqlbotNewLearningFixDialog, {
  type SqlbotNewLearningFixSubmitPayload
} from '@/views/sqlbot-new/components/SqlbotNewLearningFixDialog.vue'
import {
  adaptCombinationDatasetOptions,
  type DatasetCombinationConfirmPayload
} from './datasetCombinationAdapter'
import { buildSqlbotChartInsertRequest } from './sqlbotChartInsert'
import {
  useSqlbotNewConversation,
  type SqlbotNewConversationRecord as SqlbotNewConversationRecordItem
} from './useSqlbotNewConversation'
import { useSqlbotNewHistory } from './useSqlbotNewHistory'
import { useSqlbotNewSelection } from './useSqlbotNewSelection'
import type {
  SqlbotNewClarificationOption,
  SqlbotNewDatasetCombinationDraft,
  SqlbotNewExecutionContext,
  SqlbotNewSelectionChange,
  SqlbotNewSourceInsights
} from './types'

const {
  activeExecutionContext,
  pageMode,
  appendAssistantReply,
  appendLocalClarificationRecord,
  appendContextSwitchRecord,
  conversationLoading,
  conversationRecords,
  clearRestoredHistoryContext,
  deleteHistoryEntry,
  draftQuestion,
  fetchHistoryEntries,
  getCurrentConversationHistoryEntry,
  goHome,
  hasConversationRecords,
  primeFollowUpQuestion,
  recommendedQuestions,
  pageTitle,
  pageSubtitle,
  requestRecordAnalysis,
  requestRecordPredict,
  resetConversation,
  restoredHistoryContext,
  restoreHistorySession,
  submitQuestion
} = useSqlbotNewConversation()

const {
  activeTheme,
  activeThemeId,
  activeThemeRecommendedQuestions,
  datasetItems,
  fileItems,
  filteredDatasetCount,
  selectDialogVisible,
  uploadDialogVisible,
  fileDetailVisible,
  selectDialogTab,
  datasetKeyword,
  fileKeyword,
  selectedDatasetId,
  selectedFileId,
  detailFile,
  activeModelLabel,
  askFromDatasetCard,
  askFromDatasetDetail,
  clearCurrentSelection,
  closeDatasetDetail,
  closeSelectDialog,
  currentSelectionMeta,
  currentSelectionTitle,
  datasetDetailLookup,
  datasetDetailDatasourceName,
  datasetDetailItem,
  setSelectDialogTab,
  setSelectedDatasetId,
  setSelectedFileId,
  openSelectDialog,
  applyConfirmedSelection,
  openUploadDialog,
  handleUploadSave,
  handleUploadSaveAndUse,
  handleUploadDialogClose,
  openDatasetDetail,
  openFileDetail,
  askFromFileCard,
  askFromFileDetail,
  applyDatasetCombinationContext,
  handleFileDetailClose,
  applyRestoredSelection,
  forceCloseDialogs,
  executionContext,
  isSameExecutionSource,
  buildDatasetClarificationOptions,
  ensureDatasetDetailLoaded,
  ensureRuntimeModelReady,
  resolveDatasetClarificationContext,
  setDatasetKeyword,
  setFileKeyword,
  setActiveThemeId,
  selectedDatasetDatasourceName,
  selectedDatasetDatasourcePending,
  selectedDatasetTitle,
  selectedDimensionFields,
  selectedFileTitle,
  selectedMetricFields,
  selectedSourceKind,
  themeTabs,
  datasetDetailVisible
} = useSqlbotNewSelection()

const selectDialogVisibleState = computed(() => unref(selectDialogVisible))
const uploadDialogVisibleState = computed(() => unref(uploadDialogVisible))
const fileDetailVisibleState = computed(() => unref(fileDetailVisible))
const datasetDetailVisibleState = computed(() => unref(datasetDetailVisible))

const datasetCombinationDialogVisible = ref(false)
const learningFixDialogVisible = ref(false)
const learningFixSubmitting = ref(false)
const insertTargetDialogVisible = ref(false)
const insertTargetItems = ref<Array<{ id: string | number; name: string; canvasType: string }>>([])
const pendingInsertRecord = ref<SqlbotNewConversationRecordItem | null>(null)
const pendingLearningFixRecord = ref<SqlbotNewConversationRecordItem | null>(null)
const pendingCombinationDatasetIds = ref<string[]>([])
const pendingCombinationRecord = ref<SqlbotNewConversationRecordItem | null>(null)
const pendingCombinationClarificationOptions = ref<SqlbotNewClarificationOption[]>([])

const datasetCombinationDialogOptions = computed(() => {
  return adaptCombinationDatasetOptions({
    selectedIds: pendingCombinationDatasetIds.value,
    datasetItems: datasetItems.value,
    clarificationOptions: pendingCombinationClarificationOptions.value,
    allowFallback: false
  })
})

const datasetCombinationDialogDraft = computed<SqlbotNewDatasetCombinationDraft | null>(() => {
  return pendingCombinationRecord.value?.clarification?.combinationDraft || null
})

const normalizeOptionalId = (...values: unknown[]) => {
  for (const value of values) {
    const normalized = String(value ?? '').trim()
    if (normalized && normalized !== 'null' && normalized !== 'undefined') {
      return normalized
    }
  }
  return ''
}

const normalizeRelationType = (value: unknown) => {
  if (value === 'inner' || value === 'right' || value === 'full') {
    return value
  }
  return 'left' as const
}

const pickDatasetName = (datasetId: string, fallback = '') => {
  const detail = datasetDetailLookup.value[datasetId]
  return String(detail?.name || fallback || '').trim()
}

const pickFieldName = (field: Record<string, any> | null | undefined) => {
  return String(
    field?.name || field?.originName || field?.fieldShortName || field?.dataeaseName || ''
  ).trim()
}

const buildSourceInsightsFromUnion = (unionNodes: any[] = []): SqlbotNewSourceInsights | null => {
  const datasets = new Map<string, { id: string; name: string; role?: 'primary' | 'secondary' }>()
  const relations = new Map<
    string,
    {
      id: string
      leftDatasetId: string
      leftDatasetName: string
      leftField: string
      rightDatasetId: string
      rightDatasetName: string
      rightField: string
      relationType: 'left' | 'inner' | 'right' | 'full'
    }
  >()

  const visit = (node: Record<string, any> | null | undefined, role: 'primary' | 'secondary') => {
    if (!node || typeof node !== 'object') {
      return
    }

    const currentDatasetId = normalizeOptionalId(
      node.currentDs?.datasetGroupId,
      node.currentDs?.id,
      node.currentDs?.tableName,
      node.datasetGroupId,
      node.id
    )
    const currentDatasetName = String(
      node.currentDs?.name || node.currentDs?.tableName || node.name || ''
    ).trim()

    if (currentDatasetId || currentDatasetName) {
      datasets.set(currentDatasetId || currentDatasetName, {
        id: currentDatasetId,
        name: currentDatasetName || currentDatasetId,
        role
      })
    }

    const children = Array.isArray(node.childrenDs) ? node.childrenDs : []
    children.forEach((child: Record<string, any>) => {
      const childDatasetId = normalizeOptionalId(
        child.currentDs?.datasetGroupId,
        child.currentDs?.id,
        child.currentDs?.tableName,
        child.datasetGroupId,
        child.id
      )
      const childDatasetName = String(
        child.currentDs?.name || child.currentDs?.tableName || child.name || ''
      ).trim()

      if (childDatasetId || childDatasetName) {
        datasets.set(childDatasetId || childDatasetName, {
          id: childDatasetId,
          name: childDatasetName || childDatasetId,
          role: 'secondary'
        })
      }

      const unionToParent = child.unionToParent || {}
      const unionFields = Array.isArray(unionToParent.unionFields) ? unionToParent.unionFields : []
      const relationType = normalizeRelationType(unionToParent.unionType)

      unionFields.forEach((item: Record<string, any>, index: number) => {
        const leftField = pickFieldName(item.parentField)
        const rightField = pickFieldName(item.currentField)
        if (!leftField || !rightField) {
          return
        }

        const relationId = [
          currentDatasetId || currentDatasetName,
          childDatasetId || childDatasetName,
          leftField,
          rightField,
          relationType,
          index
        ].join(':')

        relations.set(relationId, {
          id: relationId,
          leftDatasetId: currentDatasetId,
          leftDatasetName: currentDatasetName || currentDatasetId,
          leftField,
          rightDatasetId: childDatasetId,
          rightDatasetName: childDatasetName || childDatasetId,
          rightField,
          relationType
        })
      })

      visit(child, 'secondary')
    })
  }

  unionNodes.forEach((node: Record<string, any>) => visit(node, 'primary'))

  if (datasets.size <= 1) {
    return null
  }

  return {
    datasets: [...datasets.values()],
    relations: [...relations.values()],
    relationWarning: relations.size ? '' : '涉及多个数据集，但当前无法确认可靠关联关系'
  }
}

const buildFallbackSourceInsights = (
  executionContext?: SqlbotNewExecutionContext
): SqlbotNewSourceInsights | null => {
  const sourceIds = [
    ...new Set(
      (executionContext?.sourceIds || []).map(item => normalizeOptionalId(item)).filter(Boolean)
    )
  ]
  if (sourceIds.length <= 1) {
    return null
  }

  sourceIds.forEach(id => {
    if (!datasetDetailLookup.value[id]) {
      void ensureDatasetDetailLoaded(id)
    }
  })

  return {
    datasets: sourceIds.map((id, index) => ({
      id,
      name: pickDatasetName(id, `数据集 ${index + 1}`),
      role: index === 0 ? 'primary' : 'secondary'
    })),
    relations: [],
    relationWarning: '涉及多个数据集，但当前无法确认可靠关联关系'
  }
}

const resolveRecordSourceInsights = (
  record: SqlbotNewConversationRecordItem
): SqlbotNewSourceInsights | null => {
  const executionContext = record.executionContext
  if (!executionContext) {
    return null
  }

  const detailDatasetId = normalizeOptionalId(
    executionContext.combinationId,
    executionContext.sourceId
  )

  if (detailDatasetId && !datasetDetailLookup.value[detailDatasetId]) {
    void ensureDatasetDetailLoaded(detailDatasetId)
  }

  const detail = detailDatasetId ? datasetDetailLookup.value[detailDatasetId] : null
  const union = Array.isArray(detail?.union) ? detail.union : []
  const sqlText = String(record.sql || '')
    .trim()
    .toLowerCase()
  const detailName = String(detail?.name || '').trim()
  const usesCurrentCombinationSql = Boolean(
    sqlText &&
      [detailName, executionContext.combinationName]
        .map(item =>
          String(item || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
        .some(item => sqlText.includes(item))
  )
  const isCombinationScopedRecord =
    executionContext.queryMode === 'dataset-combination' || Boolean(executionContext.combinationId)
  const unionInsights = union.length ? buildSourceInsightsFromUnion(union) : null

  if (unionInsights && (usesCurrentCombinationSql || isCombinationScopedRecord)) {
    return {
      datasets: unionInsights.datasets,
      relations: unionInsights.relations.map(item => ({
        ...item,
        relationType: normalizeRelationType(item.relationType)
      })),
      relationWarning: unionInsights.relationWarning
    }
  }

  if (isCombinationScopedRecord) {
    return buildFallbackSourceInsights(executionContext)
  }

  return null
}

const clearDatasetCombinationDialogState = () => {
  datasetCombinationDialogVisible.value = false
  pendingCombinationDatasetIds.value = []
  pendingCombinationRecord.value = null
  pendingCombinationClarificationOptions.value = []
}

const openDatasetCombinationDialog = async (
  record: SqlbotNewConversationRecordItem,
  selectedValues: string[]
) => {
  pendingCombinationRecord.value = record
  pendingCombinationDatasetIds.value = [...new Set(selectedValues.filter(Boolean))].slice(0, 6)
  pendingCombinationClarificationOptions.value = Array.isArray(record.clarification?.options)
    ? record.clarification.options
    : []

  if (pendingCombinationDatasetIds.value.length < 2) {
    ElMessage.warning('请至少选择 2 个数据集后再配置组合关系')
    clearDatasetCombinationDialogState()
    return
  }

  await Promise.all(
    pendingCombinationDatasetIds.value.map(datasetId => ensureDatasetDetailLoaded(datasetId))
  )

  if (datasetCombinationDialogOptions.value.length !== pendingCombinationDatasetIds.value.length) {
    ElMessage.warning('当前数据集字段信息尚未准备完成，请稍后重试')
    clearDatasetCombinationDialogState()
    return
  }

  datasetCombinationDialogVisible.value = true
}

const handleDatasetCombinationDialogClose = () => {
  clearDatasetCombinationDialogState()
}

const handleDatasetCombinationDialogConfirm = async (payload: DatasetCombinationConfirmPayload) => {
  const record = pendingCombinationRecord.value
  const clarification = record?.clarification

  if (!record || !clarification) {
    clearDatasetCombinationDialogState()
    return
  }

  const selectedValues = [payload.primaryDatasetId, ...payload.secondaryDatasetIds]
  const combinationDraft = {
    name: payload.name,
    primaryDatasetId: payload.primaryDatasetId,
    secondaryDatasetIds: [...payload.secondaryDatasetIds],
    relations: payload.relations.map(item => ({
      leftDatasetId: item.leftDatasetId,
      leftField: item.leftField,
      rightDatasetId: item.rightDatasetId,
      rightField: item.rightField,
      relationType: item.relationType
    }))
  }

  try {
    const createdCombination = await createAIQueryDatasetCombination({
      name: payload.name,
      primaryDatasetId: payload.primaryDatasetId,
      secondaryDatasetIds: [...payload.secondaryDatasetIds],
      relations: payload.relations.map(item => ({
        leftDatasetId: item.leftDatasetId,
        leftField: item.leftField,
        rightDatasetId: item.rightDatasetId,
        rightField: item.rightField,
        relationType: item.relationType
      }))
    })

    const resolvedCombinationContext = await applyDatasetCombinationContext({
      sourceIds: selectedValues,
      combinationId: createdCombination.combinationId,
      combinationName: createdCombination.combinationName,
      datasourceId: createdCombination.datasourceId,
      datasourcePending: createdCombination.datasourcePending
    })

    if (!resolvedCombinationContext) {
      throw new Error('组合数据集上下文创建失败')
    }

    record.clarification = {
      ...clarification,
      pending: false,
      selectedValues,
      combinationDraft
    }

    const previousExecutionContext = effectiveExecutionContext.value || executionContext.value
    if (
      pageMode.value === 'result' &&
      hasConversationRecords.value &&
      !isSameExecutionSource(previousExecutionContext, resolvedCombinationContext.executionContext)
    ) {
      await appendContextSwitchRecord(
        resolvedCombinationContext.executionContext,
        resolvedCombinationContext.selectionTitle,
        resolvedCombinationContext.selectionMeta
      )
    }

    const success = await submitQuestion({
      executionContext: resolvedCombinationContext.executionContext,
      question: record.question,
      reason: 'submit',
      selectionTitle: resolvedCombinationContext.selectionTitle,
      selectionMeta: resolvedCombinationContext.selectionMeta
    })

    if (success) {
      await refreshHistory()
    }
  } catch (error) {
    console.error('create dataset combination and continue sqlbot question failed', error)
    ElMessage.error(error instanceof Error ? error.message : '组合数据集创建失败，请稍后重试')
  } finally {
    clearDatasetCombinationDialogState()
  }
}

const METRIC_FIELD_PATTERNS = [
  '金额',
  '收入',
  '利润',
  '成本',
  '单价',
  '数量',
  '次数',
  'count',
  'amount',
  'price',
  'profit',
  'cost',
  'sales'
]

const DIMENSION_FIELD_PATTERNS = [
  '日期',
  '时间',
  '地区',
  '区域',
  '省份',
  '城市',
  '客户',
  '用户',
  '名称',
  '类型',
  '编号',
  'id',
  'date',
  'time',
  'name',
  'region',
  'city',
  'customer'
]

const inferDialogMetricFields = (fields: string[] = []) => {
  return fields.filter(field =>
    METRIC_FIELD_PATTERNS.some(pattern => field.toLowerCase().includes(pattern.toLowerCase()))
  )
}

const inferDialogDimensionFields = (fields: string[] = []) => {
  return fields.filter(field =>
    DIMENSION_FIELD_PATTERNS.some(pattern => field.toLowerCase().includes(pattern.toLowerCase()))
  )
}

const getDialogMetricFields = (fields: string[] = []) => {
  const inferred = inferDialogMetricFields(fields)
  return inferred.length ? inferred : fields
}

const getDialogDimensionFields = (fields: string[] = []) => {
  const inferred = inferDialogDimensionFields(fields)
  const fallback = fields.filter(field => !getDialogMetricFields(fields).includes(field))
  return inferred.length ? inferred : fallback
}

const getDialogDatasetMetricFields = (item: any) => {
  const explicit = Array.isArray(item?.metricFields) ? item.metricFields.filter(Boolean) : []
  if (explicit.length) {
    return explicit
  }
  return getDialogMetricFields(Array.isArray(item?.fields) ? item.fields : [])
}

const getDialogDatasetDimensionFields = (item: any) => {
  const explicit = Array.isArray(item?.dimensionFields) ? item.dimensionFields.filter(Boolean) : []
  if (explicit.length) {
    return explicit
  }
  return getDialogDimensionFields(Array.isArray(item?.fields) ? item.fields : [])
}

const getDialogFileMetricFields = (item: any) => {
  const explicit = Array.isArray(item?.metricFields) ? item.metricFields.filter(Boolean) : []
  if (explicit.length) {
    return explicit
  }
  if (item?.fieldsLoaded) {
    return []
  }
  return getDialogMetricFields(Array.isArray(item?.fields) ? item.fields : [])
}

const getDialogFileDimensionFields = (item: any) => {
  const explicit = Array.isArray(item?.dimensionFields) ? item.dimensionFields.filter(Boolean) : []
  if (explicit.length) {
    return explicit
  }
  if (item?.fieldsLoaded) {
    return []
  }
  return getDialogDimensionFields(Array.isArray(item?.fields) ? item.fields : [])
}

const {
  historyTreeExpanded,
  archivedGroupExpanded,
  activeHistoryId,
  clearHistoryItems,
  deleteHistoryItem,
  historyDeleting,
  archivedHistoryItems,
  refreshHistory,
  openHistoryItem,
  toggleHistoryTree,
  toggleArchivedGroup
} = useSqlbotNewHistory({
  pageMode,
  fetchHistoryEntries,
  getCurrentConversationHistoryEntry,
  deleteHistoryEntry,
  applyRestoredSelection,
  restoreHistorySession
})

const displaySelectionTitle = computed(() => {
  return currentSelectionTitle.value || restoredHistoryContext.value?.selectionTitle || ''
})

const displaySelectionMeta = computed(() => {
  return currentSelectionMeta.value || restoredHistoryContext.value?.selectionMeta || ''
})

const hasDisplaySelection = computed(() => {
  return Boolean(displaySelectionTitle.value)
})

const displayThemeName = computed(() => {
  return activeTheme.value?.name || '全部'
})

const selectDialogSummary = computed(() => {
  if (selectDialogTab.value === 'dataset') {
    if (!selectedDatasetTitle.value) {
      return ''
    }
    if (selectedDatasetDatasourceName.value) {
      return `已选：${selectedDatasetTitle.value} / 数据源：${selectedDatasetDatasourceName.value}`
    }
    if (selectedDatasetDatasourcePending.value) {
      return `已选：${selectedDatasetTitle.value} / 数据源：待确认`
    }
    return `已选：${selectedDatasetTitle.value}`
  }

  return selectedFileTitle.value ? `已选：${selectedFileTitle.value}` : ''
})

const effectiveExecutionContext = computed(() => {
  if (pageMode.value === 'home') {
    return executionContext.value
  }
  return activeExecutionContext.value || executionContext.value
})

const buildSelectionChange = (
  previousExecutionContext: SqlbotNewExecutionContext
): SqlbotNewSelectionChange => ({
  confirmed: true,
  changed: !isSameExecutionSource(previousExecutionContext, executionContext.value),
  executionContext: executionContext.value,
  selectionTitle: currentSelectionTitle.value || displaySelectionTitle.value,
  selectionMeta: currentSelectionMeta.value || displaySelectionMeta.value
})

const syncSelectionChangeToConversation = async (change: SqlbotNewSelectionChange) => {
  if (
    !change.confirmed ||
    !change.changed ||
    pageMode.value !== 'result' ||
    !hasConversationRecords.value
  ) {
    return
  }

  await appendContextSwitchRecord(
    change.executionContext,
    change.selectionTitle,
    change.selectionMeta
  )
  await refreshHistory()
}

const selectionActionInFlight = ref(false)

const applySelectionAction = async (action: () => Promise<void>) => {
  if (selectionActionInFlight.value) {
    return
  }
  selectionActionInFlight.value = true
  const previousExecutionContext = effectiveExecutionContext.value || executionContext.value
  try {
    await action()
    await syncSelectionChangeToConversation(buildSelectionChange(previousExecutionContext))
  } finally {
    selectionActionInFlight.value = false
  }
}

const handleConfirmSelectDialog = async () => {
  if (selectionActionInFlight.value) {
    return
  }
  selectionActionInFlight.value = true
  try {
    await syncSelectionChangeToConversation(await applyConfirmedSelection())
  } finally {
    selectionActionInFlight.value = false
  }
}

const handleAskFromDatasetCard = async (id: string) => {
  await applySelectionAction(() => askFromDatasetCard(id))
}

const handleAskFromDatasetDetail = async () => {
  await applySelectionAction(() => askFromDatasetDetail())
}

const handleAskFromFileCard = async (id: string) => {
  await applySelectionAction(() => askFromFileCard(id))
}

const handleAskFromFileDetail = async () => {
  await applySelectionAction(() => askFromFileDetail())
}

const visibleThemeTabs = computed(() => {
  return themeTabs.value.filter(item => !item.id || item.datasetCount > 0)
})

type SqlbotHomeNavKey = 'qa' | 'history'
type SqlbotHomeChooserTab = 'dataset' | 'file'

const homeNavItems: Array<{
  key: SqlbotHomeNavKey
  label: string
  interactive: boolean
  icon: SqlbotHomeNavKey
}> = [
  { key: 'qa', label: '小星问数', interactive: true, icon: 'qa' },
  { key: 'history', label: '历史对话', interactive: true, icon: 'history' }
]

const homeNavVisualKey = ref<SqlbotHomeNavKey>('qa')
const homeChooserTab = ref<SqlbotHomeChooserTab>('dataset')

const homeDatasetCards = computed(() => datasetItems.value.slice(0, 5))
const homeFileCards = computed(() => fileItems.value.slice(0, 5))

type HomeDataTagType = 'metric' | 'dimension' | 'field'
type HomeDataTag = {
  label: string
  type: HomeDataTagType
}

const pushHomeDataTags = (
  target: HomeDataTag[],
  values: string[] | undefined,
  type: HomeDataTagType,
  limit: number
) => {
  for (const value of values || []) {
    const label = String(value || '').trim()
    if (!label || target.some(item => item.label === label)) {
      continue
    }
    target.push({ label, type })
    if (target.length >= limit) {
      return
    }
  }
}

const getHomeDatasetTags = (item: {
  fields?: string[]
  metricFields?: string[]
  dimensionFields?: string[]
  fieldsLoaded?: boolean
}) => {
  if (item.fieldsLoaded === false) {
    return []
  }

  const tags: HomeDataTag[] = []
  pushHomeDataTags(tags, item.metricFields, 'metric', 4)
  pushHomeDataTags(tags, item.dimensionFields, 'dimension', 4)
  pushHomeDataTags(tags, item.fields, 'field', 4)
  return tags
}

const getHomeFileTags = (item: { fields?: string[] }) => {
  const tags: HomeDataTag[] = []
  pushHomeDataTags(tags, item.fields, 'field', 4)
  return tags
}

const compactFieldList = (fields: string[] | undefined, limit = 5) => {
  const normalized = [
    ...new Set((fields || []).map(item => String(item || '').trim()).filter(Boolean))
  ]
  return normalized.slice(0, limit)
}

const hiddenFieldCount = (fields: string[] | undefined, limit = 5) => {
  const normalized = [
    ...new Set((fields || []).map(item => String(item || '').trim()).filter(Boolean))
  ]
  return Math.max(0, normalized.length - limit)
}

const handleHomeChooserTabChange = (tab: SqlbotHomeChooserTab) => {
  homeChooserTab.value = tab
}

const handleHomeViewAll = () => {
  void openSelectDialog(homeChooserTab.value === 'file' ? 'file' : 'dataset')
}

const handleHomeNavClick = (key: SqlbotHomeNavKey) => {
  if (key === 'history') {
    if (historyTreeExpanded.value) {
      toggleHistoryTree()
      return
    }
    homeNavVisualKey.value = 'history'
    toggleHistoryTree()
    return
  }

  homeNavVisualKey.value = key

  if (key === 'qa') {
    if (pageMode.value === 'result') {
      goHome()
      return
    }
    if (historyTreeExpanded.value) {
      toggleHistoryTree()
    }
  }
}

const displayRecommendedQuestions = computed(() => {
  if (recommendedQuestions.value.length) {
    return recommendedQuestions.value
  }

  return activeThemeRecommendedQuestions.value.slice(0, 4).map((label, index) => ({
    id: `theme-recommend-${activeThemeId.value || 'all'}-${index}`,
    label
  }))
})

const conversationScrollRef = ref<HTMLElement | null>(null)
const executionDetailsVisible = ref(false)
const executionDetailsLoading = ref(false)
const executionDetailsError = ref('')
const selectedExecutionRecordId = ref<number | null>(null)
const executionDetails = ref<AIQueryExecutionDetails | null>(null)
const executionDetailsCache = ref<Record<number, AIQueryExecutionDetails>>({})

const isConceptualQuestion = (question: string) => {
  const normalized = String(question || '').trim()
  if (!normalized) {
    return false
  }
  return (
    /^(什么是|啥是|解释|解释一下|介绍一下|定义|含义|如何理解|怎么理解)/.test(normalized) ||
    /是什么意思|有什么区别|区别是什么|怎么看|适合看|怎么分析|分析思路/.test(normalized)
  )
}

const buildConceptualAnswer = (question: string) => {
  const normalized = String(question || '').trim()
  const lower = normalized.toLowerCase()

  if (normalized.includes('毛利')) {
    return [
      '毛利通常指收入扣除直接成本后的剩余收益，用来观察业务本身的盈利空间。',
      '',
      '常见口径是：`毛利 = 销售收入 - 直接成本`，如果要看比例，则是：`毛利率 = 毛利 / 销售收入`。',
      '',
      '如果要继续做数据分析，可以这样问：',
      '- 按门店统计销售额、原料成本和毛利',
      '- 最近 30 天各门店毛利率排名',
      '- 哪些品类毛利最高，哪些品类拖累毛利'
    ].join('\n')
  }

  if (normalized.includes('同比') || normalized.includes('环比')) {
    return [
      '同比和环比都是看变化，但参照对象不同。',
      '',
      '- 同比：和上一年同一周期比较，更适合看季节性业务的增长变化。',
      '- 环比：和上一个连续周期比较，更适合看短期趋势和近期波动。',
      '',
      '如果要继续问数，可以这样问：',
      '- 本月销售额同比和环比是多少',
      '- 按门店展示最近 12 个月销售额同比趋势',
      '- 哪些门店本月环比下降最多'
    ].join('\n')
  }

  if (lower.includes('top') || normalized.includes('排名')) {
    return [
      '排名类问题适合先明确三件事：看哪个指标、按哪个维度排名、取前几名或后几名。',
      '',
      '比如可以把问题改成：`按门店统计销售金额前 10 名`，或者 `按品类统计毛利率后 5 名`。',
      '',
      '如果你已经选好数据集，我可以继续帮你生成图表；如果还没选数据，可以先选一个数据集再问。'
    ].join('\n')
  }

  return [
    '我先按分析助手的方式回答这个问题。',
    '',
    '这类问题更像是业务口径、分析方法或指标解释，不一定需要马上查数。建议先明确：',
    '- 你关心的指标是什么',
    '- 想按哪个维度拆解',
    '- 是否需要限定时间范围',
    '',
    '如果你要继续落到数据分析，可以把问题改成类似：`按门店统计本月销售额趋势`、`按品类分析毛利率排名`，我就可以继续生成图表和数据解读。'
  ].join('\n')
}

const buildAssistantFallbackQuestions = (question: string) => {
  const themeQuestions = activeThemeRecommendedQuestions.value.slice(0, 3)
  return [
    ...themeQuestions,
    '帮我把这个问题改写成可问数的问题',
    '我应该选择哪个数据集来分析这个问题'
  ]
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index && item !== question)
    .slice(0, 4)
}

const USER_FIELD_PATTERNS = ['用户', '会员', '客户', 'user', 'member', 'customer']
const GENDER_VALUE_PATTERNS = [
  '男用户',
  '男性用户',
  '男性会员',
  '男会员',
  '女用户',
  '女性用户',
  '女性会员',
  '女会员',
  'male',
  'female'
]
const GENDER_FIELD_PATTERNS = [
  '性别',
  '性别属性',
  '用户性别',
  '会员性别',
  '客户性别',
  'gender',
  'sex'
]

const includesAnyPattern = (value: string, patterns: string[]) => {
  const normalized = value.toLowerCase()
  return patterns.some(pattern => normalized.includes(pattern.toLowerCase()))
}

const hasGenderValueQuestion = (question: string) => {
  return includesAnyPattern(question, GENDER_VALUE_PATTERNS)
}

const hasUserMetricContext = () => {
  return [...selectedMetricFields.value, ...selectedDimensionFields.value].some(field =>
    includesAnyPattern(field, USER_FIELD_PATTERNS)
  )
}

const hasGenderDimensionContext = () => {
  return selectedDimensionFields.value.some(field =>
    includesAnyPattern(field, GENDER_FIELD_PATTERNS)
  )
}

const maybeResolveSemanticClarification = (question: string) => {
  const normalizedQuestion = String(question || '').trim()
  if (!normalizedQuestion || !hasGenderValueQuestion(normalizedQuestion)) {
    return false
  }

  if (hasGenderDimensionContext()) {
    return false
  }

  appendLocalClarificationRecord({
    executionContext: effectiveExecutionContext.value,
    question: normalizedQuestion,
    clarification: {
      reasonCode: 'missing_attribute_field',
      prompt: hasUserMetricContext()
        ? '我理解你想按“性别”筛选用户，但当前数据只看到用户相关指标，没找到可确认的性别维度或枚举值。要怎么继续？'
        : '我理解你想看“男/女用户”，但当前数据没有可确认的性别维度或枚举值。要怎么继续？',
      options: [
        {
          label: '重新选择数据集',
          value: 'choose_dataset',
          description: '选择包含性别、用户性别、gender 等字段的数据集'
        },
        {
          label: '改问总用户',
          value: 'rewrite_total_user',
          description: '先去掉男/女筛选，只分析用户总量或占比'
        },
        {
          label: '先解释原因',
          value: 'explain_semantic_gap',
          description: '说明为什么当前数据不能可靠计算这个问题'
        }
      ],
      pending: true,
      selectionMode: 'single',
      confirmLabel: '继续'
    },
    selectionTitle: displaySelectionTitle.value,
    selectionMeta: displaySelectionMeta.value
  })
  return true
}

const rewriteGenderQuestionToTotalUser = (question: string) => {
  return String(question || '')
    .replace(/男用户|男性用户|男性会员|男会员|女用户|女性用户|女性会员|女会员/gi, '用户')
    .replace(/\bmale\b|\bfemale\b/gi, 'user')
}

const maybeResolveDatasetClarification = async (question: string) => {
  const normalizedQuestion = String(question || '').trim()
  const context = effectiveExecutionContext.value

  if (!normalizedQuestion || context.queryMode !== 'dataset' || context.sourceId) {
    return {
      handled: false,
      executionContext: context,
      selectionTitle: displaySelectionTitle.value,
      selectionMeta: displaySelectionMeta.value
    }
  }

  if (!filteredDatasetCount.value) {
    appendAssistantReply({
      executionContext: context,
      question: normalizedQuestion,
      answer: [
        '我理解你的问题，但当前还没有可用于问数的数据集。',
        '',
        activeThemeId.value
          ? '当前主题下暂无可用数据集。你可以切换主题、导入数据，或先选择一个已有数据集。'
          : '你可以先选择一个数据集或数据文件，我会继续帮你生成图表和数据解读。',
        '',
        '如果这是指标口径或分析方法问题，也可以直接继续问，我会先用业务解释的方式回答。'
      ].join('\n'),
      selectionTitle: displaySelectionTitle.value,
      selectionMeta: displaySelectionMeta.value,
      recommendQuestions: buildAssistantFallbackQuestions(normalizedQuestion)
    })
    return { handled: true }
  }

  const candidates = buildDatasetClarificationOptions(normalizedQuestion)
  if (!candidates.length) {
    appendAssistantReply({
      executionContext: context,
      question: normalizedQuestion,
      answer: [
        '我先接住这个问题，但暂时没有在当前主题里匹配到足够合适的数据集。',
        '',
        '你可以直接选择一个数据集继续问数；如果你只是想了解指标含义、分析方法或业务口径，也可以继续追问，我会先用解释型回答帮你梳理。',
        '',
        '为了更容易生成图表，可以把问题补充成“按什么维度、看什么指标、什么时间范围”。'
      ].join('\n'),
      selectionTitle: displaySelectionTitle.value,
      selectionMeta: displaySelectionMeta.value,
      recommendQuestions: buildAssistantFallbackQuestions(normalizedQuestion)
    })
    return { handled: true }
  }

  if (filteredDatasetCount.value === 1 && candidates.length === 1) {
    const resolved = await resolveDatasetClarificationContext(candidates[0].value)
    if (!resolved) {
      appendAssistantReply({
        executionContext: context,
        question: normalizedQuestion,
        answer: [
          '我找到了一个可能适合的数据集，但它的上下文还没有准备完成。',
          '',
          '你可以稍后再试，或者先换一个数据集继续分析。'
        ].join('\n'),
        selectionTitle: displaySelectionTitle.value,
        selectionMeta: displaySelectionMeta.value,
        recommendQuestions: buildAssistantFallbackQuestions(normalizedQuestion)
      })
      return { handled: true }
    }
    return {
      handled: false,
      executionContext: resolved.executionContext,
      selectionTitle: resolved.selectionTitle,
      selectionMeta: resolved.selectionMeta
    }
  }

  appendLocalClarificationRecord({
    executionContext: context,
    question: normalizedQuestion,
    clarification: {
      reasonCode: 'ambiguous_dataset',
      prompt: '这次问题要基于哪个数据集分析？',
      options: candidates,
      pending: true,
      selectionMode: 'multiple',
      confirmLabel: '按所选数据集继续',
      selectedValues: []
    },
    selectionTitle: displaySelectionTitle.value,
    selectionMeta: displaySelectionMeta.value
  })
  return { handled: true }
}

const submitWithDatasetClarification = async (
  question: string,
  reason: 'submit' | 'recommend' = 'submit'
) => {
  const scopeReady = await ensureActiveThemeSelectionReady()
  if (!scopeReady) {
    return false
  }

  await ensureRuntimeModelReady()
  const normalizedQuestion = String(question || '').trim()

  if (isConceptualQuestion(normalizedQuestion)) {
    appendAssistantReply({
      executionContext: effectiveExecutionContext.value,
      question: normalizedQuestion,
      answer: buildConceptualAnswer(normalizedQuestion),
      selectionTitle: displaySelectionTitle.value,
      selectionMeta: displaySelectionMeta.value,
      recommendQuestions: buildAssistantFallbackQuestions(normalizedQuestion)
    })
    return false
  }

  if (maybeResolveSemanticClarification(normalizedQuestion)) {
    return false
  }

  const resolved = await maybeResolveDatasetClarification(question)
  if (resolved.handled) {
    return false
  }

  const success = await submitQuestion({
    executionContext: resolved.executionContext,
    question,
    reason,
    selectionTitle: resolved.selectionTitle,
    selectionMeta: resolved.selectionMeta
  })

  if (success) {
    await refreshHistory()
  }

  return success
}

const handleSubmitFromHome = async () => {
  await submitWithDatasetClarification(draftQuestion.value, 'submit')
}

const handleSubmitFromResult = async () => {
  await submitWithDatasetClarification(draftQuestion.value, 'submit')
}

const ensureActiveThemeSelectionReady = async () => {
  if (!activeThemeId.value) {
    return true
  }
  if (selectionActionInFlight.value) {
    ElMessage.info('正在切换问数范围，请稍后再提交')
    return false
  }

  const scopedDatasetIds = (activeTheme.value?.datasetIds || [])
    .map(item => String(item))
    .filter(Boolean)
  if (!scopedDatasetIds.length) {
    ElMessage.warning('当前分析主题未绑定数据集，请先切换主题或绑定数据集')
    return false
  }

  const scopedDatasetSet = new Set(scopedDatasetIds)
  const currentContext = effectiveExecutionContext.value
  const currentSourceIds =
    currentContext.queryMode === 'dataset-combination'
      ? (currentContext.sourceIds || []).map(item => String(item)).filter(Boolean)
      : [String(selectedDatasetId.value || currentContext.sourceId || '').trim()].filter(Boolean)
  if (
    currentSourceIds.length &&
    currentSourceIds.every(datasetId => scopedDatasetSet.has(datasetId))
  ) {
    return true
  }

  const fallbackDatasetId =
    (activeTheme.value?.defaultDatasetIds || []).find(item => scopedDatasetIds.includes(item)) ||
    scopedDatasetIds[0] ||
    ''
  if (!fallbackDatasetId) {
    ElMessage.warning('当前分析主题未绑定数据集，请先切换主题或绑定数据集')
    return false
  }

  await handleAskFromDatasetCard(fallbackDatasetId)
  return true
}

const handleRecommendedQuestion = async (question: string) => {
  await submitWithDatasetClarification(question, 'recommend')
}

const handleRetryQuestion = (question: string) => {
  void submitWithDatasetClarification(question, 'submit')
}

const handlePrefillQuestion = (question: string) => {
  const normalized = String(question || '').trim()
  if (!normalized) {
    return
  }
  draftQuestion.value = normalized
  pageMode.value = 'result'
  scheduleScrollConversationToBottom('smooth')
}

const handleInsertDashboardRecord = (record: SqlbotNewConversationRecordItem) => {
  insertTargetItems.value = []
  insertTargetDialogVisible.value = true
  pendingInsertRecord.value = record
  Promise.all([
    queryTreeApi({ busiFlag: 'dashboard', resourceTable: 'core', leaf: true } as any),
    queryTreeApi({ busiFlag: 'dataV', resourceTable: 'core', leaf: true } as any)
  ])
    .then(([dashboards, dataVs]) => {
      const dashboardItems = Array.isArray(dashboards)
        ? dashboards.map((item: any) => ({
            id: item.id,
            name: item.name,
            canvasType: 'dashboard'
          }))
        : []
      const dataVItems = Array.isArray(dataVs)
        ? dataVs.map((item: any) => ({
            id: item.id,
            name: item.name,
            canvasType: 'dataV'
          }))
        : []
      insertTargetItems.value = [...dashboardItems, ...dataVItems]
    })
    .catch(error => {
      console.error('load sqlbot insert targets failed', error)
      ElMessage.error(error instanceof Error ? error.message : '插入目标加载失败')
    })
}

const handleChooseInsertTarget = async (target: {
  id: string | number
  name: string
  canvasType: string
}) => {
  const record = pendingInsertRecord.value
  if (!record) {
    insertTargetDialogVisible.value = false
    return
  }
  try {
    const insertedViewId = await insertAIQueryChartIntoCanvas(
      buildSqlbotChartInsertRequest(record, target, {
        sourceInsights: resolveRecordSourceInsights(record)
      })
    )
    insertTargetDialogVisible.value = false
    pendingInsertRecord.value = null
    ElMessage.success(`已插入到${target.name}`)
    const targetRoute =
      target.canvasType === 'dashboard'
        ? {
            path: '/dashboard',
            query: {
              resourceId: String(target.id),
              insertedViewId: String(insertedViewId)
            }
          }
        : {
            path: '/dvCanvas',
            query: {
              dvId: String(target.id),
              insertedViewId: String(insertedViewId)
            }
          }
    await router.push(targetRoute)
  } catch (error) {
    console.error('insert sqlbot chart into canvas failed', error)
    ElMessage.error(error instanceof Error ? error.message : '插入图表失败')
  }
}

const handleInterpretRecord = (record: SqlbotNewConversationRecordItem) => {
  void requestRecordAnalysis(record, effectiveExecutionContext.value)
}

const handlePredictRecord = (record: SqlbotNewConversationRecordItem) => {
  void requestRecordPredict(record, effectiveExecutionContext.value)
}

const handleFollowUpRecord = (record: SqlbotNewConversationRecordItem) => {
  primeFollowUpQuestion(record)
}

const resolveLearningResourceId = (record: SqlbotNewConversationRecordItem) => {
  const datasourceId = normalizeOptionalId(
    record.executionContext?.datasourceId,
    record.datasource,
    effectiveExecutionContext.value?.datasourceId
  )
  if (!datasourceId) {
    return ''
  }
  return datasourceId.startsWith('datasource:') ? datasourceId : `datasource:${datasourceId}`
}

const openLearningFixDialog = (record: SqlbotNewConversationRecordItem) => {
  pendingLearningFixRecord.value = record
  learningFixDialogVisible.value = true
}

const handleLearningFixDialogVisibleChange = (value: boolean) => {
  learningFixDialogVisible.value = value
  if (!value && !learningFixSubmitting.value) {
    pendingLearningFixRecord.value = null
  }
}

const normalizeLearningPatchTypes = (patchTypes: QueryLearningPatchType[]) => {
  const accepted: QueryLearningPatchType[] = []
  patchTypes.forEach(item => {
    if (item === 'sql_override' || item === 'field_mapping_fix' || item === 'value_mapping_fix') {
      accepted.push(item)
    }
  })
  return [...new Set(accepted)]
}

const handleSubmitLearningFix = async (payload: SqlbotNewLearningFixSubmitPayload) => {
  const record = pendingLearningFixRecord.value
  if (!record) {
    ElMessage.warning('未找到待提交的问数记录，请重新打开学习修正')
    return
  }

  const resourceId = resolveLearningResourceId(record)
  if (!resourceId) {
    ElMessage.warning('当前记录缺少数据源上下文，暂时不能提交学习修正')
    return
  }

  const patchTypes = normalizeLearningPatchTypes(payload.patchTypes || [])
  if (!patchTypes.length) {
    ElMessage.warning('请至少选择一种学习修正类型')
    return
  }

  learningFixSubmitting.value = true
  try {
    const feedbackResult = await createQueryLearningFeedbackEvent(resourceId, {
      eventType: 'manual_fix_submit',
      sourceChatId: record.chatId,
      sourceChatRecordId: record.id,
      questionText: payload.questionText || record.question,
      matchedSql: payload.matchedSql || String(record.sql || ''),
      beforeSnapshot: payload.beforeSnapshot,
      afterSnapshot: payload.afterSnapshot,
      patchTypes
    })

    if (!feedbackResult.accepted) {
      ElMessage.error('学习修正提交失败，请稍后重试')
      return
    }

    ElMessage.success('已生效（仅当前资源）')
    if (feedbackResult.metric?.relearningSuggested && feedbackResult.metric.relearningAdvice) {
      ElMessage.info(feedbackResult.metric.relearningAdvice)
    }
    learningFixDialogVisible.value = false
    pendingLearningFixRecord.value = null
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '学习修正提交失败')
  } finally {
    learningFixSubmitting.value = false
  }
}

const handleEditQuestion = (record: SqlbotNewConversationRecordItem) => {
  primeFollowUpQuestion(record, 'retry')
}

const handleClarifyRecord = async (
  record: SqlbotNewConversationRecordItem,
  value: string | string[]
) => {
  const executionContext = record.executionContext || effectiveExecutionContext.value
  if (!executionContext) {
    ElMessage.warning('当前记录缺少执行上下文，暂时不能继续澄清')
    return
  }
  if (!record.clarification?.pending) {
    return
  }

  const reasonCode = record.clarification?.reasonCode || ''
  const selectedValues = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []
  const resolvedValue = selectedValues[0] || ''

  const resolveClarificationRecord = () => {
    if (!record.clarification) {
      return
    }
    record.clarification = {
      ...record.clarification,
      pending: false,
      selectedValues: [...selectedValues]
    }
  }

  const nextQuestion =
    reasonCode === 'missing_time_range'
      ? `${record.question}，时间范围改为${resolvedValue}，请继续分析。`
      : reasonCode === 'ambiguous_metric'
      ? `${record.question}，这次指标改为${resolvedValue}，请继续分析。`
      : reasonCode === 'ambiguous_dimension'
      ? `${record.question}，这次维度改为${resolvedValue}，请继续分析。`
      : reasonCode === 'ambiguous_dataset'
      ? record.question
      : `${record.question}，请按“${resolvedValue}”继续分析。`

  if (reasonCode === 'missing_attribute_field') {
    if (resolvedValue === 'choose_dataset') {
      resolveClarificationRecord()
      await refreshHistory()
      await openSelectDialog('dataset')
      return
    }

    if (resolvedValue === 'rewrite_total_user') {
      const success = await submitQuestion({
        executionContext,
        question: rewriteGenderQuestionToTotalUser(record.question),
        reason: 'submit',
        selectionTitle: displaySelectionTitle.value,
        selectionMeta: displaySelectionMeta.value
      })

      if (success) {
        resolveClarificationRecord()
        await refreshHistory()
      }
      return
    }

    appendAssistantReply({
      executionContext,
      question: record.question,
      answer: [
        '这个问题暂时不能可靠问数，因为“男/女用户”不是一个可直接计算的指标，它需要数据里存在可筛选的性别维度或明确枚举值。',
        '',
        '当前只看到用户相关指标时，我不能猜测 `男` 对应哪个字段、哪个取值，也不能凭空生成 `gender = 男` 这类 SQL。',
        '',
        '你可以选择包含“性别/用户性别/gender”的数据集，或者在业务逻辑里补充枚举映射后再问。'
      ].join('\n'),
      selectionTitle: displaySelectionTitle.value,
      selectionMeta: displaySelectionMeta.value,
      recommendQuestions: [
        '重新选择包含性别字段的数据集',
        '只看用户总量是多少',
        '按已有维度分析用户占比',
        '帮我说明当前数据缺少什么字段'
      ]
    })
    resolveClarificationRecord()
    await refreshHistory()
    return
  }

  if (reasonCode === 'ambiguous_dataset') {
    if (!selectedValues.length) {
      ElMessage.warning('请至少选择 1 个数据集后继续')
      return
    }

    if (selectedValues.length > 1) {
      handleClarificationSelectionChange(record, selectedValues)
      await openDatasetCombinationDialog(record, selectedValues)
      return
    }

    const resolved = await resolveDatasetClarificationContext(selectedValues[0])
    if (!resolved) {
      ElMessage.warning('当前数据集上下文还未准备完成，请稍后重试')
      return
    }
    const success = await submitQuestion({
      executionContext: resolved.executionContext,
      question: nextQuestion,
      reason: 'submit',
      selectionTitle: resolved.selectionTitle,
      selectionMeta: resolved.selectionMeta
    })

    if (success) {
      resolveClarificationRecord()
      await refreshHistory()
    }
    return
  }

  const success = await submitQuestion({
    executionContext,
    question: nextQuestion,
    reason: 'submit',
    selectionTitle: displaySelectionTitle.value,
    selectionMeta: displaySelectionMeta.value
  })

  if (success) {
    resolveClarificationRecord()
    await refreshHistory()
  }
}

const handleClarificationSelectionChange = (
  record: SqlbotNewConversationRecordItem,
  value: string[]
) => {
  if (!record.clarification) {
    return
  }
  const normalizedValues = [...new Set(value.filter(Boolean))]
  const currentDraft = record.clarification.combinationDraft
  const currentDraftDatasetIds = currentDraft
    ? [currentDraft.primaryDatasetId, ...currentDraft.secondaryDatasetIds].filter(Boolean)
    : []
  const keepCurrentDraft =
    Boolean(currentDraft) &&
    currentDraftDatasetIds.length === normalizedValues.length &&
    currentDraftDatasetIds.every(id => normalizedValues.includes(id))
  record.clarification = {
    ...record.clarification,
    selectedValues: normalizedValues,
    combinationDraft: keepCurrentDraft ? currentDraft : undefined
  }
}

const handleThemeChange = async (themeId: string) => {
  if (themeId === activeThemeId.value) {
    return
  }

  const previousExecutionContext = effectiveExecutionContext.value || executionContext.value
  const keepCurrentConversation = pageMode.value === 'result' && hasConversationRecords.value

  setActiveThemeId(themeId)
  await nextTick()

  const targetTheme = themeTabs.value.find(item => item.id === themeId)
  const fallbackDatasetId =
    selectedDatasetId.value ||
    targetTheme?.defaultDatasetIds?.[0] ||
    targetTheme?.datasetIds?.[0] ||
    ''

  if (!selectedDatasetId.value && fallbackDatasetId) {
    await askFromDatasetCard(fallbackDatasetId)
  }

  if (keepCurrentConversation) {
    await syncSelectionChangeToConversation(buildSelectionChange(previousExecutionContext))
    ElMessage.info('已切换分析主题，当前会话将继续沿用新的主题上下文')
    return
  }

  if (pageMode.value === 'result') {
    clearRestoredHistoryContext()
    resetConversation()
  }
}

const handleDialogThemeChange = (themeId: string) => {
  if (themeId === activeThemeId.value) {
    return
  }
  setActiveThemeId(themeId)
}

const openExecutionDetails = async (record: SqlbotNewConversationRecordItem) => {
  if (!record.id) {
    ElMessage.info('当前记录暂无执行详情')
    return
  }

  const recordId = Number(record.id)
  selectedExecutionRecordId.value = recordId
  executionDetailsVisible.value = true
  executionDetailsError.value = ''

  const cached = executionDetailsCache.value[recordId]
  if (cached) {
    executionDetails.value = cached
    executionDetailsLoading.value = false
    return
  }

  executionDetailsLoading.value = true
  executionDetails.value = null
  try {
    const details = await getExecutionDetails(recordId)
    executionDetailsCache.value = {
      ...executionDetailsCache.value,
      [recordId]: details
    }
    executionDetails.value = details
  } catch (error) {
    executionDetailsError.value =
      error instanceof Error ? error.message : '执行详情加载失败，请稍后重试'
  } finally {
    executionDetailsLoading.value = false
  }
}

const retryExecutionDetails = async (recordId: number) => {
  executionDetailsError.value = ''
  executionDetailsLoading.value = true
  executionDetails.value = null
  try {
    const details = await getExecutionDetails(recordId)
    executionDetailsCache.value = {
      ...executionDetailsCache.value,
      [recordId]: details
    }
    executionDetails.value = details
  } catch (error) {
    executionDetailsError.value =
      error instanceof Error ? error.message : '执行详情加载失败，请稍后重试'
  } finally {
    executionDetailsLoading.value = false
  }
}

const scrollConversationToBottom = async (behavior: ScrollBehavior = 'auto') => {
  await nextTick()
  const container = conversationScrollRef.value
  if (!container) {
    return
  }
  container.scrollTo({
    top: container.scrollHeight,
    behavior
  })
}

const scheduleScrollConversationToBottom = (behavior: ScrollBehavior = 'auto') => {
  void scrollConversationToBottom(behavior)
  window.setTimeout(() => {
    void scrollConversationToBottom(behavior)
  }, 120)
  window.setTimeout(() => {
    void scrollConversationToBottom('auto')
  }, 360)
}

watch(
  () => pageMode.value,
  mode => {
    if (mode === 'home') {
      homeNavVisualKey.value = historyTreeExpanded.value ? 'history' : 'qa'
    }
    if (mode === 'result') {
      forceCloseDialogs()
    }
    if (mode !== 'result') {
      return
    }
    scheduleScrollConversationToBottom('auto')
  },
  { immediate: true }
)

watch(
  () => historyTreeExpanded.value,
  expanded => {
    if (pageMode.value !== 'home') {
      return
    }
    if (!expanded && homeNavVisualKey.value === 'history') {
      homeNavVisualKey.value = 'qa'
    }
  }
)

watch(
  () => [pageMode.value, selectedSourceKind.value] as const,
  ([mode, sourceKind]) => {
    if (mode !== 'home') {
      return
    }
    if (sourceKind === 'file') {
      homeChooserTab.value = 'file'
      return
    }
    homeChooserTab.value = 'dataset'
  },
  { immediate: true }
)

watch(
  () => conversationRecords.value.map(item => item.localId).join('|'),
  (next, prev) => {
    if (pageMode.value !== 'result' || next === prev) {
      return
    }
    scheduleScrollConversationToBottom('smooth')
  }
)

watch(
  () => conversationLoading.value,
  loading => {
    if (loading || pageMode.value !== 'result') {
      return
    }
    scheduleScrollConversationToBottom('smooth')
  }
)

watch(
  () => activeHistoryId.value,
  (next, prev) => {
    if (!next || next === prev || pageMode.value !== 'result') {
      return
    }
    scheduleScrollConversationToBottom('auto')
  }
)

const handleDeleteHistory = (id: string) => {
  void deleteHistoryItem(id)
}

const handleClearHistory = () => {
  void clearHistoryItems('all')
}

const handleClearSelection = () => {
  clearRestoredHistoryContext()
  clearCurrentSelection()
}

const isContextSwitchRecord = (record: SqlbotNewConversationRecordItem) => {
  if (record.kind === 'context-switch') {
    return true
  }

  return (
    Boolean(record.contextSwitch) &&
    !String(record.question || '').trim() &&
    !String(record.sqlAnswer || '').trim() &&
    !String(record.chartAnswer || '').trim() &&
    !record.clarification
  )
}

const hasRenderableQuestion = (record: SqlbotNewConversationRecordItem) => {
  return Boolean(String(record.question || '').trim())
}

const conversationAnswerTurnMap = computed(() => {
  let turn = 0
  return conversationRecords.value.reduce((result, record) => {
    if (!isContextSwitchRecord(record)) {
      turn += 1
      result[record.localId] = turn
    }
    return result
  }, {} as Record<string, number>)
})
</script>

<template>
  <div class="sqlbot-new-page">
    <div class="sqlbot-new-shell" :class="{ 'sqlbot-home-shell': pageMode === 'home' }">
      <aside class="sqlbot-left-sidebar sqlbot-home-side">
        <div class="sqlbot-product-card sqlbot-home-product-card">
          <div class="product-card-icon sqlbot-home-product-icon">
            <span class="home-product-bot-icon" aria-hidden="true"></span>
          </div>
          <div class="product-card-copy">
            <div class="product-card-title">智能问数</div>
            <div class="product-card-subtitle">数据分析助手</div>
          </div>
        </div>

        <div class="sqlbot-side-nav sqlbot-home-nav">
          <button
            v-for="item in homeNavItems"
            :key="item.key"
            class="side-nav-item home-nav-item"
            :class="{
              active: homeNavVisualKey === item.key,
              'is-visual-only': !item.interactive
            }"
            type="button"
            @click="handleHomeNavClick(item.key)"
          >
            <span
              class="side-nav-icon home-nav-icon"
              :class="`home-nav-icon--${item.icon}`"
              aria-hidden="true"
            ></span>
            <span class="home-nav-label">{{ item.label }}</span>
          </button>
        </div>

        <div v-if="historyTreeExpanded" class="sqlbot-history-tree sqlbot-home-history-tree">
          <div class="history-tree-group">
            <div class="history-tree-group-head">
              <button class="history-tree-group-label" type="button" @click="toggleArchivedGroup">
                <span class="history-tree-folder">{{ archivedGroupExpanded ? '▾' : '▸' }}</span>
                <span>历史对话</span>
              </button>
              <button
                class="history-tree-clear"
                type="button"
                :disabled="historyDeleting || !archivedHistoryItems.length"
                @click="handleClearHistory"
              >
                清空
              </button>
            </div>
            <div v-if="archivedGroupExpanded" class="history-tree-list">
              <div
                v-for="item in archivedHistoryItems"
                :key="item.id"
                class="history-tree-item"
                :class="{ active: activeHistoryId === item.id }"
              >
                <button
                  class="history-tree-item-main"
                  type="button"
                  @click="openHistoryItem(item.id)"
                >
                  <div class="history-tree-item-title">{{ item.title }}</div>
                  <div class="history-tree-item-subtitle">{{ item.subtitle }}</div>
                  <div class="history-tree-item-time">{{ item.time }}</div>
                </button>
                <button
                  class="history-tree-item-delete"
                  type="button"
                  :disabled="historyDeleting"
                  @click.stop="handleDeleteHistory(item.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main
        class="sqlbot-new-main"
        :class="{ 'is-result': pageMode === 'result', 'sqlbot-home-main': pageMode === 'home' }"
      >
        <template v-if="pageMode === 'home'">
          <div class="sqlbot-home-stage">
            <section class="sqlbot-home-chooser">
              <div class="sqlbot-hero">
                <div class="sqlbot-hero-icon">
                  <span class="sqlbot-hero-bulb" aria-hidden="true"></span>
                </div>
                <div class="sqlbot-hero-copy">
                  <div class="sqlbot-hero-title">{{ pageTitle }}</div>
                  <div v-if="pageSubtitle" class="sqlbot-hero-subtitle">{{ pageSubtitle }}</div>
                </div>
              </div>

              <div class="sqlbot-home-chooser-shell">
                <section class="dataset-section">
                  <div class="dataset-header-row">
                    <div class="source-tabs">
                      <button
                        class="source-tab"
                        :class="{ 'is-active': homeChooserTab === 'dataset' }"
                        type="button"
                        @click="handleHomeChooserTabChange('dataset')"
                      >
                        数据集
                      </button>
                      <button
                        class="source-tab"
                        :class="{ 'is-active': homeChooserTab === 'file' }"
                        type="button"
                        @click="handleHomeChooserTabChange('file')"
                      >
                        数据文件
                      </button>
                    </div>

                    <div class="theme-tabs-scroll">
                      <button
                        v-for="item in visibleThemeTabs"
                        :key="`home-theme-${item.id || 'all'}`"
                        class="theme-tab"
                        :class="{ 'is-active': activeThemeId === item.id }"
                        type="button"
                        @click="handleThemeChange(item.id)"
                      >
                        {{ item.name }}
                      </button>
                    </div>
                  </div>

                  <div class="dataset-grid">
                    <template v-if="homeChooserTab === 'file'">
                      <button
                        v-for="item in homeFileCards"
                        :key="`home-file-${item.id}`"
                        class="dataset-card"
                        type="button"
                        @click="handleAskFromFileCard(item.id)"
                      >
                        <h3>{{ item.title }}</h3>
                        <div class="dataset-tags">
                          <span
                            v-for="tag in getHomeFileTags(item)"
                            :key="`home-file-tag-${item.id}-${tag.type}-${tag.label}`"
                            class="dataset-tag"
                            :class="`dataset-tag--${tag.type}`"
                          >
                            {{ tag.label }}
                          </span>
                        </div>
                      </button>
                      <button
                        class="dataset-card dataset-card-more"
                        type="button"
                        @click="handleHomeViewAll"
                      >
                        <span class="dataset-card-more-icon">＋</span>
                        <h3>全部数据</h3>
                        <p>查看更多数据文件</p>
                      </button>
                    </template>

                    <template v-else>
                      <button
                        v-for="item in homeDatasetCards"
                        :key="`home-dataset-${item.id}`"
                        class="dataset-card"
                        type="button"
                        @click="handleAskFromDatasetCard(item.id)"
                      >
                        <h3>{{ item.title }}</h3>
                        <div class="dataset-tags">
                          <span
                            v-for="tag in getHomeDatasetTags(item)"
                            :key="`home-dataset-tag-${item.id}-${tag.type}-${tag.label}`"
                            class="dataset-tag"
                            :class="`dataset-tag--${tag.type}`"
                          >
                            {{ tag.label }}
                          </span>
                        </div>
                      </button>
                      <button
                        class="dataset-card dataset-card-more"
                        type="button"
                        @click="handleHomeViewAll"
                      >
                        <span class="dataset-card-more-icon">＋</span>
                        <h3>全部数据</h3>
                        <p>查看更多数据集</p>
                      </button>
                    </template>
                  </div>
                </section>
              </div>
            </section>

            <section class="sqlbot-home-chat-entry">
              <section class="sqlbot-home-card">
                <div class="sqlbot-home-card-head">
                  <div class="home-card-selection-bar">
                    <div class="home-card-selection-main">
                      <span class="select-data-link is-placeholder">选择数据</span>
                      <button
                        v-if="hasDisplaySelection"
                        class="selected-dataset-chip home is-placeholder"
                        type="button"
                        :title="
                          displaySelectionMeta
                            ? `${displaySelectionTitle} / ${displaySelectionMeta}`
                            : displaySelectionTitle
                        "
                      >
                        <span>{{ displaySelectionTitle }}</span>
                        <span class="chip-close">×</span>
                      </button>
                    </div>
                    <div class="home-card-head-actions">
                      <button class="dataset-chip" type="button">{{ activeModelLabel }} ▾</button>
                    </div>
                  </div>
                </div>

                <section
                  v-if="
                    hasDisplaySelection &&
                    (selectedMetricFields.length || selectedDimensionFields.length)
                  "
                  class="selection-insight-panel"
                >
                  <div v-if="selectedMetricFields.length" class="insight-row">
                    <span class="insight-label">指标</span>
                    <span
                      v-for="item in selectedMetricFields"
                      :key="`home-metric-${item}`"
                      class="insight-chip metric"
                    >
                      {{ item }}
                    </span>
                  </div>
                  <div v-if="selectedDimensionFields.length" class="insight-row">
                    <span class="insight-label">维度</span>
                    <span
                      v-for="item in selectedDimensionFields"
                      :key="`home-dimension-${item}`"
                      class="insight-chip dimension"
                    >
                      {{ item }}
                    </span>
                  </div>
                </section>

                <div class="home-card-input">
                  <textarea
                    v-model="draftQuestion"
                    class="composer-textarea"
                    placeholder="输入你的问题"
                  ></textarea>
                </div>

                <div class="home-card-footer">
                  <div class="home-card-footer-left"></div>
                  <button
                    class="send-button"
                    type="button"
                    :disabled="conversationLoading"
                    @click="handleSubmitFromHome"
                  >
                    ➚
                  </button>
                </div>
              </section>
            </section>

            <section v-if="displayRecommendedQuestions.length" class="sqlbot-home-recommendations">
              <section class="conversation-recommend-panel home">
                <div class="conversation-recommend-row">
                  <div class="recommend-panel-list">
                    <button
                      v-for="item in displayRecommendedQuestions"
                      :key="item.id"
                      class="recommend-panel-item"
                      type="button"
                      :disabled="conversationLoading"
                      @click="handleRecommendedQuestion(item.label)"
                    >
                      {{ item.label }}
                    </button>
                  </div>
                </div>
              </section>
            </section>
          </div>
        </template>

        <template v-else>
          <section class="sqlbot-conversation-shell">
            <ScopeBar
              :theme-name="displayThemeName"
              :dataset-name="displaySelectionTitle"
              @switch="openSelectDialog()"
            />
            <div ref="conversationScrollRef" class="sqlbot-conversation-scroll">
              <section class="sqlbot-conversation">
                <template v-if="hasConversationRecords">
                  <template v-for="record in conversationRecords" :key="record.localId">
                    <SqlbotNewContextSwitchCard
                      v-if="isContextSwitchRecord(record)"
                      :record="record"
                    />

                    <article v-else class="conversation-turn">
                      <div class="conversation-turn-label">
                        第 {{ conversationAnswerTurnMap[record.localId] || 1 }} 轮问答
                      </div>
                      <div v-if="hasRenderableQuestion(record)" class="conversation-turn-question">
                        <div class="question-card-copy">
                          {{ record.question }}
                        </div>
                      </div>

                      <div class="conversation-turn-answer">
                        <SqlbotNewConversationRecord
                          :record="record"
                          :source-insights="resolveRecordSourceInsights(record)"
                          :conversation-loading="conversationLoading"
                          @clarify-record="handleClarifyRecord"
                          @clarification-selection-change="handleClarificationSelectionChange"
                          @prefill-question="handlePrefillQuestion"
                          @interpret="handleInterpretRecord"
                          @predict="handlePredictRecord"
                          @followup="handleFollowUpRecord"
                          @learning-fix="openLearningFixDialog"
                          @insert-dashboard="handleInsertDashboardRecord"
                          @retry="handleRetryQuestion($event.question)"
                          @edit-question="handleEditQuestion"
                          @select-data="openSelectDialog()"
                          @view-execution-details="openExecutionDetails"
                        />
                      </div>
                    </article>
                  </template>
                </template>
              </section>
            </div>

            <section v-if="displayRecommendedQuestions.length" class="conversation-recommend-panel">
              <div class="conversation-recommend-row">
                <div class="recommend-panel-list">
                  <button
                    v-for="item in displayRecommendedQuestions"
                    :key="item.id"
                    class="recommend-panel-item"
                    type="button"
                    :disabled="conversationLoading"
                    @click="handleRecommendedQuestion(item.label)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </section>

            <section class="bottom-composer">
              <div class="bottom-composer-head">
                <div class="bottom-composer-dataset">
                  <button class="select-data-button" type="button" @click="openSelectDialog()">
                    选择数据
                  </button>
                  <button
                    v-if="hasDisplaySelection"
                    class="selected-dataset-chip"
                    type="button"
                    :title="
                      displaySelectionMeta
                        ? `${displaySelectionTitle} / ${displaySelectionMeta}`
                        : displaySelectionTitle
                    "
                    @click="handleClearSelection"
                  >
                    <span>{{ displaySelectionTitle }}</span>
                    <span class="chip-close">×</span>
                  </button>
                </div>
                <div class="bottom-composer-actions">
                  <button class="dataset-chip" type="button">{{ activeModelLabel }} ▾</button>
                </div>
              </div>

              <section
                v-if="
                  hasDisplaySelection &&
                  (selectedMetricFields.length || selectedDimensionFields.length)
                "
                class="selection-insight-panel compact"
              >
                <div v-if="selectedMetricFields.length" class="insight-row">
                  <span class="insight-label">指标</span>
                  <span
                    v-for="item in selectedMetricFields"
                    :key="`result-metric-${item}`"
                    class="insight-chip metric"
                  >
                    {{ item }}
                  </span>
                </div>
                <div v-if="selectedDimensionFields.length" class="insight-row">
                  <span class="insight-label">维度</span>
                  <span
                    v-for="item in selectedDimensionFields"
                    :key="`result-dimension-${item}`"
                    class="insight-chip dimension"
                  >
                    {{ item }}
                  </span>
                </div>
              </section>

              <div class="bottom-composer-input">
                <textarea
                  v-model="draftQuestion"
                  class="composer-textarea large"
                  placeholder="直接提问，或点击「选择数据」后开始分析"
                ></textarea>
                <button
                  class="send-button inside-input"
                  type="button"
                  :disabled="conversationLoading"
                  @click="handleSubmitFromResult"
                >
                  ➚
                </button>
              </div>
            </section>
          </section>
        </template>
      </main>

      <div v-if="selectDialogVisibleState" class="selection-modal-mask">
        <section class="selection-modal" :class="{ 'is-file': selectDialogTab === 'file' }">
          <header class="selection-modal-head">
            <div class="selection-modal-tabs">
              <button
                class="selection-modal-tab"
                :class="{ active: selectDialogTab === 'dataset' }"
                type="button"
                @click="setSelectDialogTab('dataset')"
              >
                数据集
              </button>
              <button
                class="selection-modal-tab"
                :class="{ active: selectDialogTab === 'file' }"
                type="button"
                @click="setSelectDialogTab('file')"
              >
                数据文件
              </button>
            </div>
            <button class="selection-modal-close" type="button" @click="closeSelectDialog">
              ×
            </button>
          </header>

          <div class="selection-modal-body">
            <template v-if="selectDialogTab === 'dataset'">
              <div class="selection-theme-filter">
                <span class="selection-theme-filter-label">分析主题</span>
                <div class="selection-theme-filter-tabs">
                  <button
                    v-for="item in visibleThemeTabs"
                    :key="`dialog-theme-${item.id || 'all'}`"
                    class="selection-theme-filter-tab"
                    :class="{ active: activeThemeId === item.id }"
                    type="button"
                    @click="handleDialogThemeChange(item.id)"
                  >
                    {{ item.name }}
                  </button>
                </div>
                <span class="selection-theme-filter-count">{{ filteredDatasetCount }} 个资源</span>
              </div>

              <div class="selection-modal-search">
                <span class="selection-search-icon">⌕</span>
                <input
                  class="selection-search-input"
                  :value="datasetKeyword"
                  type="text"
                  placeholder="搜索数据集名称、字段、标签"
                  @input="setDatasetKeyword(($event.target as HTMLInputElement).value)"
                />
              </div>

              <div class="selection-modal-grid">
                <article
                  v-for="item in datasetItems"
                  :key="item.id"
                  class="selection-card"
                  :class="{ selected: selectedDatasetId === item.id }"
                  @click="setSelectedDatasetId(item.id)"
                >
                  <div class="selection-card-head">
                    <span class="selection-card-badge" :class="`tone-${item.tone}`">
                      {{ item.badge }}
                    </span>
                    <span class="selection-card-title">{{ item.title }}</span>
                  </div>

                  <div class="selection-card-groups">
                    <div class="selection-card-group">
                      <span class="selection-group-label">指标</span>
                      <span
                        v-for="field in compactFieldList(getDialogDatasetMetricFields(item), 4)"
                        :key="`dialog-dataset-metric-${item.id}-${field}`"
                        class="selection-pill metric"
                      >
                        {{ field }}
                      </span>
                      <span
                        v-if="hiddenFieldCount(getDialogDatasetMetricFields(item), 4)"
                        class="selection-pill more"
                      >
                        +{{ hiddenFieldCount(getDialogDatasetMetricFields(item), 4) }}
                      </span>
                    </div>
                    <div class="selection-card-group">
                      <span class="selection-group-label">维度</span>
                      <span
                        v-for="field in compactFieldList(getDialogDatasetDimensionFields(item), 5)"
                        :key="`dialog-dataset-dimension-${item.id}-${field}`"
                        class="selection-pill dimension"
                      >
                        {{ field }}
                      </span>
                      <span
                        v-if="hiddenFieldCount(getDialogDatasetDimensionFields(item), 5)"
                        class="selection-pill more"
                      >
                        +{{ hiddenFieldCount(getDialogDatasetDimensionFields(item), 5) }}
                      </span>
                    </div>
                  </div>

                  <div class="selection-card-actions">
                    <button
                      class="selection-action ghost"
                      type="button"
                      @click.stop="openDatasetDetail(item.id)"
                    >
                      预览数据
                    </button>
                    <button
                      class="selection-action primary"
                      type="button"
                      @click.stop="handleAskFromDatasetCard(item.id)"
                    >
                      开始提问
                    </button>
                  </div>
                  <span v-if="selectedDatasetId === item.id" class="selection-card-check">
                    ✓ 已选
                  </span>
                </article>
              </div>
            </template>

            <template v-else>
              <div class="selection-file-toolbar">
                <div class="selection-modal-search compact">
                  <span class="selection-search-icon">⌕</span>
                  <input
                    class="selection-search-input"
                    :value="fileKeyword"
                    type="text"
                    placeholder="搜索文件名称、格式、上传时间"
                    @input="setFileKeyword(($event.target as HTMLInputElement).value)"
                  />
                </div>
                <button class="selection-upload-button" type="button" @click="openUploadDialog">
                  ＋ 上传文件
                </button>
              </div>

              <div v-if="fileItems.length" class="selection-modal-grid is-file">
                <article
                  v-for="item in fileItems"
                  :key="item.id"
                  class="selection-card file"
                  :class="{ selected: selectedFileId === item.id }"
                  @click="setSelectedFileId(item.id)"
                >
                  <div class="selection-card-head">
                    <span class="selection-card-title">{{ item.title }}</span>
                    <span class="selection-card-meta">{{ item.format }}</span>
                  </div>

                  <div class="selection-card-groups">
                    <div class="selection-card-group">
                      <span class="selection-group-label">指标</span>
                      <span
                        v-for="field in compactFieldList(getDialogFileMetricFields(item), 4)"
                        :key="`dialog-file-metric-${item.id}-${field}`"
                        class="selection-pill metric"
                      >
                        {{ field }}
                      </span>
                      <span
                        v-if="hiddenFieldCount(getDialogFileMetricFields(item), 4)"
                        class="selection-pill more"
                      >
                        +{{ hiddenFieldCount(getDialogFileMetricFields(item), 4) }}
                      </span>
                    </div>
                    <div class="selection-card-group">
                      <span class="selection-group-label">维度</span>
                      <span
                        v-for="field in compactFieldList(getDialogFileDimensionFields(item), 5)"
                        :key="`dialog-file-dimension-${item.id}-${field}`"
                        class="selection-pill dimension"
                      >
                        {{ field }}
                      </span>
                      <span
                        v-if="hiddenFieldCount(getDialogFileDimensionFields(item), 5)"
                        class="selection-pill more"
                      >
                        +{{ hiddenFieldCount(getDialogFileDimensionFields(item), 5) }}
                      </span>
                    </div>
                  </div>

                  <div class="selection-card-actions">
                    <button
                      class="selection-action ghost"
                      type="button"
                      @click.stop="openFileDetail(item.id)"
                    >
                      预览数据
                    </button>
                    <button
                      class="selection-action primary"
                      type="button"
                      @click.stop="handleAskFromFileCard(item.id)"
                    >
                      开始提问
                    </button>
                  </div>
                  <span v-if="selectedFileId === item.id" class="selection-card-check">
                    ✓ 已选
                  </span>
                </article>
              </div>

              <div v-else class="selection-empty-state">
                <div class="selection-empty-title">暂无上传的数据文件</div>
                <div class="selection-empty-copy">点击右上角上传文件后即可开始文件问数</div>
              </div>
            </template>
          </div>

          <footer class="selection-modal-foot">
            <div class="selection-summary">
              <span v-if="selectDialogSummary">{{ selectDialogSummary }}</span>
              <span v-else class="selection-summary-muted">请选择一个数据源</span>
            </div>
            <div class="selection-foot-actions">
              <button class="selection-action ghost large" type="button" @click="closeSelectDialog">
                取消
              </button>
              <button
                class="selection-action primary large"
                type="button"
                :disabled="selectDialogTab === 'dataset' ? !selectedDatasetId : !selectedFileId"
                @click="handleConfirmSelectDialog"
              >
                确认选择
              </button>
            </div>
          </footer>
        </section>
      </div>

      <SqlbotNewDatasetDetailDialog
        :visible="datasetDetailVisibleState"
        :dataset-id="datasetDetailItem?.id"
        :title="datasetDetailItem?.title || ''"
        :datasource-name="datasetDetailDatasourceName"
        @close="closeDatasetDetail"
        @ask="handleAskFromDatasetDetail"
      />

      <SqlbotNewDatasetCombinationDialog
        :visible="datasetCombinationDialogVisible"
        :dataset-options="datasetCombinationDialogOptions"
        :draft="datasetCombinationDialogDraft"
        @close="handleDatasetCombinationDialogClose"
        @confirm="handleDatasetCombinationDialogConfirm"
      />

      <SqlbotNewLearningFixDialog
        :visible="learningFixDialogVisible"
        :record="pendingLearningFixRecord"
        :submitting="learningFixSubmitting"
        @update:visible="handleLearningFixDialogVisibleChange"
        @submit="handleSubmitLearningFix"
      />

      <SqlbotInsertTargetDialog
        :visible="insertTargetDialogVisible"
        :targets="insertTargetItems"
        @update:visible="value => (insertTargetDialogVisible = value)"
        @choose="handleChooseInsertTarget"
      />

      <SqlbotNewFileUploadDialog
        :visible="uploadDialogVisibleState"
        @close="handleUploadDialogClose"
        @save="handleUploadSave"
        @save-and-use="handleUploadSaveAndUse"
      />

      <SqlbotNewFileDetailDialog
        :visible="fileDetailVisibleState"
        :file="detailFile"
        @close="handleFileDetailClose"
        @ask="handleAskFromFileDetail"
      />

      <ExecutionDetailsDrawer
        :visible="executionDetailsVisible"
        :loading="executionDetailsLoading"
        :error="executionDetailsError"
        :details="executionDetails"
        :record-id="selectedExecutionRecordId || undefined"
        @close="executionDetailsVisible = false"
        @retry="retryExecutionDetails"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
.sqlbot-new-page {
  min-height: 100%;
  --sqlbot-sidebar-width: clamp(256px, 18.5vw, 308px);
  --sqlbot-column-width: min(1120px, calc(100vw - var(--sqlbot-sidebar-width) - 64px));
  --sqlbot-page-inline-padding: clamp(16px, 1.8vw, 26px);
  --sqlbot-card-radius: 26px;
  --sqlbot-body-font: 16px;
  --sqlbot-meta-font: 14px;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.sqlbot-new-shell {
  display: grid;
  grid-template-columns: var(--sqlbot-sidebar-width) minmax(0, 1fr);
  min-height: calc(100vh - 64px);
}

.sqlbot-home-shell {
  grid-template-columns: 280px minmax(0, 1fr);
}

.sqlbot-left-sidebar {
  background: #ffffff;
  border-right: 1px solid rgba(226, 232, 240, 0.9);
  padding: 18px 0 22px;
  height: calc(100vh - 64px);
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.sqlbot-home-side {
  padding: 16px 8px 20px 16px;
}

.sqlbot-product-card {
  margin: 0 18px;
  padding: 16px 14px;
  border-radius: 18px;
  background: #eff6ff;
  display: flex;
  gap: 14px;
}

.product-card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #1e5af2;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex: 0 0 52px;
}

.product-card-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.product-card-title {
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
  color: #1e293b;
}

.product-card-subtitle {
  font-size: 15px;
  line-height: 22px;
  color: #64748b;
}

.sqlbot-home-product-card {
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  gap: 12px;
}

.sqlbot-home-product-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 8px;
  font-size: 0;
  position: relative;
}

.home-product-bot-icon,
.sqlbot-hero-bulb {
  position: relative;
  display: inline-block;
}

.home-product-bot-icon {
  width: 18px;
  height: 14px;
}

.home-product-bot-icon::before,
.home-product-bot-icon::after,
.sqlbot-hero-bulb::before,
.sqlbot-hero-bulb::after,
.home-nav-icon::before,
.home-nav-icon::after {
  content: '';
  position: absolute;
  box-sizing: border-box;
}

.home-product-bot-icon::before {
  left: 0;
  top: 2px;
  width: 18px;
  height: 14px;
  border: 2px solid #fff;
  border-radius: 4px;
}

.home-product-bot-icon::after {
  left: 4px;
  top: -3px;
  width: 10px;
  height: 5px;
  border: 2px solid #fff;
  border-bottom: 0;
  border-radius: 3px 3px 0 0;
  box-shadow: -2px 8px 0 -1px #fff, 4px 8px 0 -1px #fff;
}

.sqlbot-side-nav {
  padding: 12px 10px 10px;
}

.side-nav-item {
  width: calc(100% - 0px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #334155;
  font-size: 16px;
  line-height: 24px;
  cursor: pointer;
}

.side-nav-item.active {
  background: #eff6ff;
  color: #1e5af2;
  font-weight: 600;
}

.side-nav-icon {
  width: 22px;
  text-align: center;
  color: inherit;
}

.side-nav-caret {
  margin-left: auto;
  color: inherit;
  font-size: 12px;
}

.sqlbot-home-nav {
  padding: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.home-nav-item {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
  transition: background 0.2s ease, color 0.2s ease;
}

.home-nav-item:hover {
  background: #f8fbff;
}

.home-nav-item.active {
  background: #eff6ff;
  box-shadow: none;
  color: #1e5af2;
  font-weight: 600;
}

.home-nav-item.is-visual-only {
  cursor: default;
}

.home-nav-icon {
  width: 20px;
  height: 20px;
  position: relative;
  display: inline-flex;
  flex: 0 0 20px;
  align-items: center;
  justify-content: center;
  color: #334155;
}

.home-nav-item.active .home-nav-icon {
  color: #1e5af2;
}

.home-nav-label {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.home-nav-icon--qa::before {
  left: 3px;
  top: 8px;
  width: 14px;
  height: 10px;
  border: 2px solid currentColor;
  border-top: 0;
  border-radius: 0 0 2px 2px;
}

.home-nav-icon--qa::after {
  left: 5px;
  top: 2px;
  width: 10px;
  height: 10px;
  border-left: 2px solid currentColor;
  border-top: 2px solid currentColor;
  transform: rotate(45deg);
}

.home-nav-icon--report::before {
  left: 5px;
  top: 2px;
  width: 10px;
  height: 14px;
  border: 2px solid currentColor;
  border-radius: 2px;
}

.home-nav-icon--report::after {
  left: 8px;
  top: 6px;
  width: 4px;
  height: 1.5px;
  background: currentColor;
  box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
}

.home-nav-icon--build::before {
  left: 4px;
  top: 3px;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-radius: 1px;
}

.home-nav-icon--build::after {
  left: 10px;
  top: 3px;
  width: 2px;
  height: 12px;
  background: currentColor;
  box-shadow: -6px 6px 0 currentColor;
}

.home-nav-icon--history::before {
  left: 3px;
  top: 3px;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.home-nav-icon--history::after {
  left: 10px;
  top: 7px;
  width: 2px;
  height: 5px;
  background: currentColor;
  box-shadow: 3px 3px 0 -1px currentColor;
}

.sqlbot-history-tree {
  min-width: 0;
  flex: 1 1 auto;
  min-height: 0;
  padding: 10px 12px 0 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
}

.sqlbot-history-tree::-webkit-scrollbar {
  width: 6px;
}

.sqlbot-history-tree::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
}

.sqlbot-history-tree::-webkit-scrollbar-track {
  background: transparent;
}

.sqlbot-home-history-tree {
  padding-top: 8px;
  padding-right: 14px;
}

.history-tree-group {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-tree-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-tree-group-label {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  padding-left: 8px;
  color: #64748b;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease;
}

.history-tree-clear {
  min-width: 54px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.92);
  color: #5f7aa6;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-tree-clear:hover,
.history-tree-item-delete:hover {
  color: #1e5af2;
  border-color: rgba(30, 90, 242, 0.24);
  background: rgba(239, 246, 255, 0.88);
}

.history-tree-clear:disabled,
.history-tree-item-delete:disabled {
  cursor: not-allowed;
  opacity: 0.46;
}

.history-tree-group-label:hover {
  color: #1e5af2;
}

.history-tree-group-label.static,
.history-tree-clear.static {
  cursor: default;
}

.history-tree-clear.static {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.history-tree-folder {
  width: 14px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

.history-tree-list {
  position: relative;
  min-width: 0;
  max-width: 100%;
  margin-left: 15px;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
}

.history-tree-list::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: rgba(191, 219, 254, 0.9);
}

.history-tree-item {
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  border: none;
  border-radius: 12px;
  background: transparent;
  transition: all 0.2s ease;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  box-sizing: border-box;
}

.history-tree-item::before {
  content: '';
  position: absolute;
  left: -18px;
  top: 14px;
  width: 12px;
  height: 1px;
  background: rgba(191, 219, 254, 0.9);
}

.history-tree-item:hover {
  background: rgba(239, 246, 255, 0.72);
}

.history-tree-item.active {
  background: #eff6ff;
  box-shadow: inset 2px 0 0 #1e5af2;
}

.history-tree-item-main {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  display: block;
  box-sizing: border-box;
  text-align: left;
  padding: 12px 12px 12px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.history-tree-item-delete {
  margin: 10px 10px 0 0;
  min-width: 44px;
  flex: 0 0 auto;
  height: 26px;
  padding: 0 8px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #8aa0c2;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-tree-item-title {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 21px;
  color: #1e293b;
  font-weight: 600;
  white-space: nowrap;
}

.history-tree-item-subtitle,
.history-tree-item-time {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 3px;
  font-size: 12px;
  line-height: 18px;
  color: #94a3b8;
  white-space: nowrap;
}

.sqlbot-new-main {
  padding: clamp(20px, 2.2vw, 36px) var(--sqlbot-page-inline-padding) clamp(24px, 3.2vw, 52px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sqlbot-home-main {
  position: relative;
  width: 100%;
  padding: clamp(16px, 1.8vw, 26px) clamp(18px, 2.4vw, 34px) clamp(22px, 2.6vw, 40px);
  align-items: stretch;
  overflow: hidden;
}

.sqlbot-home-main::before,
.sqlbot-home-main::after {
  content: '';
  position: absolute;
  inset: auto;
  border-radius: 50%;
  pointer-events: none;
}

.sqlbot-home-main::before {
  width: 520px;
  height: 520px;
  left: max(220px, 8vw);
  bottom: -160px;
  background: radial-gradient(circle, rgba(30, 90, 242, 0.08) 0%, rgba(30, 90, 242, 0) 72%);
}

.sqlbot-home-main::after {
  width: 420px;
  height: 420px;
  right: 4%;
  top: 18%;
  background: radial-gradient(circle, rgba(147, 197, 253, 0.12) 0%, rgba(147, 197, 253, 0) 70%);
}

.sqlbot-home-stage {
  position: relative;
  z-index: 1;
  width: min(920px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.sqlbot-new-main.is-result {
  align-items: center;
  height: calc(100vh - 64px);
  box-sizing: border-box;
  padding: clamp(16px, 2vw, 26px) var(--sqlbot-page-inline-padding) clamp(14px, 2.2vw, 24px);
  overflow: hidden;
}

.sqlbot-home-chooser {
  width: 100%;
  margin: 0;
}

.sqlbot-home-chat-entry,
.sqlbot-home-recommendations {
  width: 100%;
  margin: 0;
}

.sqlbot-home-chooser-shell {
  margin-top: 14px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.sqlbot-hero {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.sqlbot-hero-icon {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: #1e5af2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sqlbot-hero-bulb {
  width: 20px;
  height: 24px;
}

.sqlbot-hero-bulb::before {
  left: 4px;
  top: 1px;
  width: 12px;
  height: 14px;
  border: 2px solid #fff;
  border-radius: 8px;
}

.sqlbot-hero-bulb::after {
  left: 8px;
  top: 16px;
  width: 4px;
  height: 6px;
  background: #fff;
  box-shadow: -2px 6px 0 0 #fff, 2px 6px 0 0 #fff;
}

.sqlbot-hero-copy {
  margin-top: 0;
  margin-left: 12px;
  text-align: left;
  min-width: 0;
}

.sqlbot-hero-title {
  font-size: 28px;
  line-height: 36px;
  color: #172033;
  font-weight: 700;
  white-space: nowrap;
}

.sqlbot-hero-subtitle {
  margin-top: 12px;
  font-size: 15px;
  line-height: 22px;
  color: #51627d;
  font-weight: 500;
}

.dataset-section {
  width: 100%;
  margin-top: clamp(12px, 1.4vw, 18px);
}

.dataset-header-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.theme-tabs-scroll,
.source-tabs {
  display: flex;
  align-items: center;
}

.theme-tabs-scroll {
  flex: 1 1 auto;
  min-width: 0;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x proximity;
}

.theme-tabs-scroll::-webkit-scrollbar {
  display: none;
}

.source-tabs {
  gap: 4px;
  flex: 0 0 auto;
}

.theme-tab,
.source-tab {
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #4a5b76;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  cursor: pointer;
}

.theme-tab {
  flex: 0 0 auto;
  scroll-snap-align: start;
}

.theme-tab.is-active {
  background: #eaf1ff;
  color: #1d4ed8;
  font-weight: 600;
}

.source-tab.is-active {
  background: #1d4ed8;
  color: #fff;
  font-weight: 600;
}

.dataset-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.dataset-card {
  display: block;
  width: auto;
  min-height: 72px;
  padding: 11px 14px;
  border: 1px solid #e6edf7;
  border-radius: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.dataset-card:hover {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 8px 18px rgba(30, 90, 242, 0.08);
  transform: translateY(-1px);
}

.dataset-card h3 {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: #182235;
}

.dataset-tags {
  margin-top: 7px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.dataset-card-more {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  border-color: rgba(96, 165, 250, 0.55);
  background: linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%);
}

.dataset-card-more-icon {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #1d4ed8;
  color: #fff;
  font-size: 16px;
  line-height: 20px;
  font-weight: 700;
}

.dataset-card-more p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.dataset-tag {
  height: 18px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
}

.dataset-tag--metric {
  background: #dcfce7;
  color: #15803d;
}

.dataset-tag--dimension {
  background: #dbeafe;
  color: #2563eb;
}

.dataset-tag--field {
  background: #e0f2fe;
  color: #0369a1;
}

.sqlbot-mode-tabs {
  margin-top: 32px;
  width: min(1180px, 100%);
  height: clamp(66px, 6.8vw, 78px);
  padding: 6px;
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.sqlbot-theme-tabs-wrap {
  width: min(1180px, 100%);
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sqlbot-theme-tabs-wrap.home {
  width: 100%;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(191, 219, 254, 0.64);
}

.sqlbot-theme-tabs-wrap.result {
  width: min(var(--sqlbot-column-width), 100%);
  margin-top: 0;
  margin-bottom: 8px;
  overflow: hidden;
}

.sqlbot-theme-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sqlbot-theme-tabs-wrap.result .sqlbot-theme-tabs {
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.sqlbot-theme-tabs-wrap.result .sqlbot-theme-tabs::-webkit-scrollbar {
  display: none;
}

.sqlbot-theme-tabs-wrap.result .sqlbot-theme-tab {
  flex: 0 0 auto;
}

.sqlbot-theme-tabs-placeholder {
  gap: 12px;
}

.sqlbot-theme-tab {
  border: 1px solid rgba(191, 219, 254, 0.9);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #475569;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sqlbot-theme-tab.active {
  background: #eff6ff;
  border-color: rgba(96, 165, 250, 0.86);
  color: #1e5af2;
  box-shadow: 0 8px 16px rgba(30, 90, 242, 0.08);
}

.mode-tab {
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #334155;
  font-size: 18px;
  line-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.mode-tab.active {
  background: #eff6ff;
  color: #1e5af2;
  font-weight: 600;
}

.sqlbot-home-card {
  position: relative;
  width: 100%;
  margin-top: 0;
  padding: 14px 22px 16px;
  border: 1px solid #f3f4f6;
  border-radius: var(--sqlbot-card-radius);
  background: #fff;
  box-shadow: 0 10px 24px rgba(30, 90, 242, 0.07), 0 4px 10px rgba(15, 23, 42, 0.05);
}

.sqlbot-home-card-head,
.bottom-composer-head,
.result-card-head,
.error-card-head,
.result-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.home-card-selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.home-card-selection-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1 1 auto;
  justify-content: flex-start;
}

.home-card-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex: 0 0 auto;
  margin-left: auto;
}

.select-data-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(191, 219, 254, 0.9);
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.96);
  color: #1e5af2;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 16px;
  margin-top: -6px;
}

.status-pill,
.status-pill-icon,
.select-data-button,
.selected-dataset-chip,
.dataset-chip,
.mode-chip,
.metric-chip,
.tiny-ghost,
.primary-action,
.secondary-action,
.danger-outline,
.ghost-link,
.more-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-pill {
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1e5af2;
  font-size: 16px;
  font-weight: 700;
  line-height: 22px;
}

.home-card-input {
  margin-top: 12px;
  padding-right: 72px;
  color: #334155;
}

.home-card-input .composer-textarea {
  min-height: 112px;
}

.selection-insight-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(248, 250, 255, 0.98) 0%, rgba(243, 247, 255, 0.94) 100%);
  border: 1px solid rgba(208, 220, 245, 0.9);
}

.selection-insight-panel.compact {
  margin-top: 0;
  margin-bottom: 12px;
}

.insight-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.insight-label {
  flex: 0 0 auto;
  min-width: 28px;
  padding-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
}

.insight-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
}

.insight-chip.metric {
  background: rgba(220, 252, 231, 0.96);
  color: #16a34a;
}

.insight-chip.dimension {
  background: rgba(219, 234, 254, 0.96);
  color: #2563eb;
}

.home-card-footer,
.bottom-composer-head {
  margin-top: 20px;
}

.bottom-composer-head {
  margin-top: 0;
  margin-bottom: 12px;
}

.home-card-footer {
  position: absolute;
  right: 22px;
  bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 0;
  padding-top: 0;
}

.home-card-footer-left {
  display: none;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  min-width: 0;
  align-self: flex-end;
}

.bottom-composer-dataset,
.bottom-composer-actions,
.result-actions,
.result-meta,
.result-card-head-left,
.result-card-head-right,
.result-metrics,
.error-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dataset-chip {
  height: 40px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  color: #1e293b;
  font-size: 15px;
  font-weight: 600;
}

.mode-chip {
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e5af2;
  font-size: 14px;
}

.binding-chip {
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 14px;
}

.send-button {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 999px;
  background: #1e5af2;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  flex: 0 0 56px;
  box-shadow: 0 12px 22px rgba(30, 90, 242, 0.24);
}

.sqlbot-home-card .send-button {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  font-size: 16px;
}

.select-data-link {
  font-size: 16px;
  line-height: 22px;
  font-weight: 700;
  color: #1e5af2;
}

.is-placeholder {
  pointer-events: none;
  cursor: default !important;
}

.send-button:disabled,
.recommend-panel-item:disabled,
.primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.recommend-panel-list {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-gutter: stable;
  padding-bottom: 0;
}

.recommend-panel-list::-webkit-scrollbar {
  height: 2px;
}

.recommend-panel-list::-webkit-scrollbar-track {
  background: transparent;
}

.recommend-panel-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
}

.recommend-panel-item {
  flex: 0 0 auto;
  padding: 5px 10px;
  border: 1px solid rgba(226, 232, 240, 0.82);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  color: #475569;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  white-space: nowrap;
}

.sqlbot-conversation {
  width: min(var(--sqlbot-column-width), 100%);
  margin-top: 0;
}

.sqlbot-conversation-shell {
  width: min(var(--sqlbot-column-width), 100%);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.sqlbot-conversation-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overflow-x: hidden;
  padding: 14px 0 12px;
}

.conversation-recommend-panel {
  width: min(var(--sqlbot-column-width), 100%);
  margin: 0 0 10px;
  padding: 0;
  background: transparent;
}

.conversation-recommend-panel.home {
  width: 100%;
  margin: 0;
}

.conversation-recommend-row {
  min-width: 0;
}

.conversation-turn {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 26px;
  padding: 18px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.68) 0%, rgba(241, 247, 255, 0.58) 100%);
  border: 1px solid rgba(209, 223, 246, 0.78);
  box-shadow: 0 14px 32px rgba(30, 64, 175, 0.06);
}

.conversation-turn-question,
.conversation-turn-answer {
  width: min(var(--sqlbot-column-width), 100%);
}

.conversation-turn-label {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(219, 234, 254, 0.78);
  color: #1d4ed8;
  font-size: 12px;
  line-height: 18px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.conversation-turn-question {
  margin-left: auto;
  max-width: min(820px, calc(100% - 32px));
  padding: 18px 20px;
  border-radius: 24px 24px 8px 24px;
  background: linear-gradient(135deg, #1e5af2 0%, #4b86ff 100%);
  box-shadow: 0 16px 30px rgba(30, 90, 242, 0.18);
  color: #fff;
}

.question-card-copy {
  font-size: 18px;
  line-height: 28px;
  font-weight: 600;
  white-space: pre-wrap;
}

.assistant-result-card,
.assistant-error-card,
.conversation-empty-card,
.bottom-composer {
  width: min(var(--sqlbot-column-width), 100%);
  border: 1px solid #f3f4f6;
  border-radius: var(--sqlbot-card-radius);
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.1);
}

.assistant-result-card,
.assistant-error-card {
  margin-bottom: 12px;
  overflow: hidden;
}

.result-card-head,
.error-card-head,
.result-card-foot {
  padding: 14px;
}

.result-card-head {
  min-height: 61px;
}

.result-card-body,
.error-card-body {
  padding: 18px;
}

.result-status {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
}

.result-status.success {
  background: #dcfce7;
  color: #15803d;
}

.result-status.pending {
  background: #dbeafe;
  color: #1d4ed8;
}

.result-status.error {
  background: #fee2e2;
  color: #dc2626;
}

.result-duration,
.error-duration,
.result-time,
.meta-time {
  font-size: 12px;
  color: #94a3b8;
}

.more-button {
  padding: 5px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #334155;
  font-size: 12px;
}

.result-title {
  font-size: 18px;
  line-height: 24px;
  color: #1e293b;
  font-weight: 600;
}

.result-metrics {
  margin-top: 8px;
}

.result-answer {
  margin-top: 12px;
  color: #334155;
  font-size: 14px;
  line-height: 22px;
  white-space: pre-wrap;
}

.metric-chip {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
}

.result-chart {
  margin-top: 16px;
  width: min(600px, 100%);
}

.primary-action {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: #1e5af2;
  color: #fff;
  font-size: 13px;
}

.secondary-action,
.danger-outline,
.ghost-link,
.tiny-ghost {
  padding: 5px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 12px;
}

.error-card-head {
  background: #fef2f2;
}

.error-card-body {
  background: #fff;
}

.error-title {
  font-size: 14px;
  line-height: 20px;
  color: #dc2626;
  font-weight: 600;
}

.error-copy {
  margin-top: 8px;
  font-size: 13px;
  line-height: 18px;
  color: #b91c1c;
}

.error-actions {
  margin-top: 12px;
}

.danger-outline {
  border-color: #fecaca;
  color: #dc2626;
}

.ghost-link {
  color: #64748b;
}

.meta-brand {
  font-size: 12px;
  font-weight: 500;
  color: #1e5af2;
}

.conversation-empty-card {
  padding: 32px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.conversation-empty-title {
  color: #0f172a;
  font-size: 18px;
  line-height: 28px;
  font-weight: 600;
}

.conversation-empty-copy {
  margin-top: 8px;
  color: #64748b;
  font-size: 15px;
  line-height: 24px;
}

.bottom-composer {
  padding: 24px 26px 24px;
  flex-shrink: 0;
  margin-top: 0;
  border-color: rgba(191, 219, 254, 0.88);
  box-shadow: 0 18px 34px rgba(30, 90, 242, 0.08), 0 8px 18px rgba(15, 23, 42, 0.06);
}

.select-data-button,
.selected-dataset-chip {
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 14px;
}

.select-data-button {
  border: none;
  background: #eff6ff;
  color: #1e5af2;
}

.selected-dataset-chip {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e5af2;
  gap: 8px;
}

.selected-dataset-chip.home {
  max-width: min(460px, 100%);
}

.chip-close {
  font-size: 15px;
  line-height: 1;
  opacity: 0.78;
}

.tiny-ghost {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  line-height: 20px;
}

.tiny-ghost:hover {
  color: #1e5af2;
}

.bottom-composer-input {
  position: relative;
  margin-top: 12px;
  padding: 22px 88px 22px 24px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  min-height: 154px;
}

.composer-textarea {
  width: 100%;
  min-height: 102px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: #334155;
  font-size: 17px;
  line-height: 28px;
  font-family: inherit;
}

.composer-textarea.large {
  min-height: 118px;
}

.composer-textarea::placeholder {
  color: #51627d;
  font-size: 17px;
  line-height: 26px;
  font-weight: 500;
}

.send-button.inside-input {
  position: absolute;
  right: 20px;
  bottom: 20px;
}

.bottom-composer-dataset {
  gap: 5px;
}

.bottom-composer-actions {
  gap: 4px;
  flex-wrap: nowrap;
}

.selection-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 2400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(6px);
}

.sqlbot-home-chat-entry {
  margin-top: 12px;
}

.sqlbot-home-recommendations {
  margin-top: 16px;
}

@media (min-width: 1600px) and (min-height: 900px) {
  .sqlbot-home-main {
    justify-content: center;
  }

  .sqlbot-home-stage {
    width: min(960px, 100%);
    min-height: calc(100vh - 156px);
    justify-content: center;
    transform: translateY(0);
  }

  .dataset-section {
    width: 100%;
  }

  .dataset-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px 12px;
  }

  .dataset-card {
    width: auto;
  }
}

@media (max-width: 1536px) {
  .sqlbot-new-page {
    --sqlbot-sidebar-width: 276px;
    --sqlbot-column-width: min(980px, calc(100vw - var(--sqlbot-sidebar-width) - 48px));
  }

  .sqlbot-home-stage {
    width: min(860px, 100%);
  }

  .sqlbot-home-card {
    padding: 14px 20px 16px;
  }

  .sqlbot-hero-title {
    font-size: clamp(26px, 2.2vw, 28px);
    line-height: clamp(32px, 2.6vw, 36px);
  }

  .theme-tab {
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dataset-grid {
    gap: 10px 12px;
  }

  .dataset-card {
    min-height: 68px;
    padding: 10px 14px;
  }

  .sqlbot-home-history-tree {
    padding-left: 12px;
    padding-right: 10px;
  }

  .history-tree-list {
    margin-left: 10px;
    padding-left: 12px;
  }

  .history-tree-item {
    gap: 6px;
  }

  .history-tree-item-main {
    padding: 10px 8px 10px 12px;
  }

  .history-tree-item-delete {
    min-width: 38px;
    margin-right: 6px;
    padding: 0 6px;
  }

  .home-card-input {
    margin-top: 10px;
    padding-right: 66px;
  }

  .home-card-input .composer-textarea {
    min-height: 104px;
  }

  .home-card-footer {
    right: 20px;
    bottom: 16px;
  }

  .selection-insight-panel {
    gap: 6px;
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 14px;
  }

  .selection-insight-panel.compact {
    margin-bottom: 8px;
  }

  .insight-chip {
    padding: 4px 9px;
  }

  .dataset-chip {
    height: 36px;
    padding: 0 14px;
  }

  .select-data-link {
    padding: 6px 14px;
    margin-top: -4px;
  }

  .select-data-button,
  .selected-dataset-chip {
    padding: 5px 12px;
  }

  .send-button {
    width: 48px;
    height: 48px;
    flex-basis: 48px;
    font-size: 18px;
  }

  .selected-dataset-chip.home {
    max-width: min(360px, 100%);
  }

  .bottom-composer {
    padding: 12px 14px;
    border-radius: 20px;
  }

  .bottom-composer-head {
    margin-bottom: 8px;
  }

  .bottom-composer-input {
    margin-top: 8px;
    padding: 10px 64px 10px 12px;
    min-height: 96px;
    border-radius: 14px;
  }

  .composer-textarea.large {
    min-height: 52px;
  }

  .send-button.inside-input {
    right: 14px;
    bottom: 14px;
  }
}

@media (max-width: 1366px) {
  .sqlbot-new-page {
    --sqlbot-sidebar-width: 252px;
    --sqlbot-column-width: min(900px, calc(100vw - var(--sqlbot-sidebar-width) - 36px));
    --sqlbot-card-radius: 22px;
  }

  .sqlbot-home-stage {
    width: min(820px, 100%);
  }

  .sqlbot-home-main::before {
    width: 420px;
    height: 420px;
    left: max(160px, 5vw);
  }

  .sqlbot-home-main::after {
    width: 320px;
    height: 320px;
  }

  .dataset-section {
    margin-top: 16px;
  }

  .dataset-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 10px;
    gap: 8px 10px;
  }

  .dataset-card {
    min-height: 64px;
    padding: 8px 12px;
  }

  .dataset-card h3 {
    font-size: 14px;
    line-height: 20px;
  }

  .dataset-tags {
    margin-top: 6px;
    gap: 4px;
  }

  .dataset-tag {
    height: 16px;
    font-size: 10px;
    line-height: 14px;
  }

  .sqlbot-home-card {
    padding: 14px 20px 12px;
  }

  .home-card-input {
    margin-top: 10px;
    padding-right: 62px;
  }

  .home-card-input .composer-textarea {
    min-height: 96px;
  }

  .home-card-footer {
    right: 20px;
    bottom: 14px;
  }

  .selection-insight-panel {
    gap: 4px;
    margin-top: 8px;
    padding: 6px 10px;
  }

  .insight-chip {
    padding: 3px 8px;
  }

  .sqlbot-theme-tab {
    padding: 7px 12px;
    font-size: 13px;
    line-height: 18px;
  }

  .conversation-turn {
    margin-bottom: 18px;
    padding: 14px;
    border-radius: 22px;
  }

  .conversation-turn-question {
    max-width: min(700px, calc(100% - 20px));
    padding: 14px 16px;
  }

  .bottom-composer {
    padding: 10px 12px;
    border-radius: 16px;
  }

  .bottom-composer-input {
    padding: 10px 62px 10px 12px;
    min-height: 92px;
    border-radius: 12px;
  }

  .composer-textarea,
  .composer-textarea::placeholder {
    font-size: 16px;
    line-height: 24px;
  }

  .composer-textarea.large {
    min-height: 52px;
  }

  .send-button {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
    font-size: 16px;
  }

  .send-button.inside-input {
    right: 12px;
    bottom: 12px;
  }
}

@media (max-width: 1240px) {
  .sqlbot-new-page {
    --sqlbot-sidebar-width: 228px;
    --sqlbot-column-width: min(820px, calc(100vw - var(--sqlbot-sidebar-width) - 24px));
  }

  .sqlbot-home-stage {
    width: min(760px, 100%);
  }

  .sqlbot-home-side {
    padding: 10px 6px 14px 10px;
  }

  .sqlbot-product-card {
    margin: 0 10px;
    padding: 12px 10px;
  }

  .sqlbot-home-card {
    padding: 16px 18px 14px;
  }

  .home-card-input .composer-textarea {
    min-height: 92px;
  }

  .home-card-footer {
    right: 18px;
    bottom: 14px;
  }

  .bottom-composer {
    padding: 9px 10px;
  }

  .bottom-composer-input {
    min-height: 82px;
    padding: 9px 54px 9px 10px;
  }

  .composer-textarea.large {
    min-height: 44px;
  }

  .dataset-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .dataset-card {
    min-height: 62px;
  }

  .theme-tab {
    max-width: 180px;
  }

  .sqlbot-mode-tabs {
    height: auto;
    padding: 8px;
    gap: 6px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mode-tab {
    min-height: 44px;
    font-size: 16px;
    line-height: 24px;
  }

  .sqlbot-theme-tabs-wrap.result,
  .sqlbot-conversation,
  .sqlbot-conversation-shell,
  .conversation-recommend-panel,
  .bottom-composer {
    width: 100%;
  }
}

.selection-modal {
  width: min(1320px, calc(100vw - 72px));
  max-height: calc(100vh - 48px);
  min-height: min(680px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 28px 48px rgba(15, 23, 42, 0.18), 0 12px 18px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.selection-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 22px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.92);
}

.selection-modal-tabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 12px;
  background: #f1f5f9;
}

.selection-modal-tab {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 15px;
  line-height: 22px;
  padding: 8px 16px;
  border-radius: 10px;
}

.selection-modal-tab.active {
  background: #ffffff;
  color: #1e5af2;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
}

.selection-modal-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 22px;
  line-height: 1;
}

.selection-modal-body {
  flex: 1;
  min-height: 0;
  padding: 16px 22px;
  overflow: auto;
}

.selection-theme-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  min-width: 0;
  overflow: hidden;
}

.selection-theme-filter-label {
  flex: 0 0 auto;
  color: #475569;
  font-size: 13px;
  line-height: 20px;
  font-weight: 700;
}

.selection-theme-filter-tabs {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  padding-bottom: 4px;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  scrollbar-color: rgba(37, 99, 235, 0.36) transparent;
  -ms-overflow-style: auto;
}

.selection-theme-filter-tabs::-webkit-scrollbar {
  display: block;
  height: 4px;
}

.selection-theme-filter-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.selection-theme-filter-tabs::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.28);
}

.selection-theme-filter-tab {
  flex: 0 0 auto;
  scroll-snap-align: start;
  max-width: 220px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(191, 219, 254, 0.82);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: #475569;
  font-size: 13px;
  line-height: 20px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selection-theme-filter-tab.active {
  color: #1d4ed8;
  border-color: rgba(96, 165, 250, 0.92);
  background: #eff6ff;
}

.selection-theme-filter-count {
  flex: 0 0 auto;
  margin-left: 2px;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.selection-modal-search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  border-radius: 12px;
  background: #f8fbff;
}

.selection-modal-search.compact {
  flex: 1;
}

.selection-search-icon {
  color: #94a3b8;
  font-size: 15px;
}

.selection-search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #334155;
  font-size: 15px;
}

.selection-modal-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.selection-modal-grid.is-file {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.selection-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 124px;
  padding: 14px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.selection-card.selected {
  border-color: #93c5fd;
  box-shadow: 0 18px 32px rgba(30, 90, 242, 0.12);
}

.selection-card-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
}

.selection-card.file .selection-card-head {
  justify-content: space-between;
}

.selection-card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
}

.selection-card-badge.tone-blue {
  background: #dbeafe;
  color: #1d4ed8;
}

.selection-card-badge.tone-green {
  background: #dcfce7;
  color: #15803d;
}

.selection-card-badge.tone-purple {
  background: #ede9fe;
  color: #6d28d9;
}

.selection-card-badge.tone-orange {
  background: #ffedd5;
  color: #c2410c;
}

.selection-card-title {
  min-width: 0;
  flex: 1 1 auto;
  color: #0f172a;
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-card-meta {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 13px;
  line-height: 20px;
}

.selection-card-groups {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.selection-card-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  max-height: 50px;
  overflow: hidden;
}

.selection-group-label {
  flex: 0 0 32px;
  color: #64748b;
  font-size: 13px;
  line-height: 20px;
  font-weight: 700;
}

.selection-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 96px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-pill.metric {
  background: #bbf7d0;
  color: #15803d;
}

.selection-pill.dimension {
  background: #bfdbfe;
  color: #1d4ed8;
}

.selection-pill.more {
  background: #e2e8f0;
  color: #475569;
}

.selection-card-actions {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-height: 64px;
  padding: 14px 16px 16px;
  border-radius: 0 0 14px 14px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.96) 38%,
    #ffffff 100%
  );
  box-shadow: inset 0 -1px 0 rgba(191, 219, 254, 0.8);
  opacity: 0;
  pointer-events: none;
  transform: translateY(12px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.selection-card:hover .selection-card-actions,
.selection-card:focus-within .selection-card-actions {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.selection-action {
  border: none;
  min-width: 88px;
  height: 38px;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.selection-action.primary {
  background: #1e5af2;
  color: #ffffff;
  box-shadow: 0 10px 20px rgba(30, 90, 242, 0.24);
}

.selection-action.primary:disabled {
  opacity: 0.45;
}

.selection-action.ghost {
  background: #eff6ff;
  color: #1e5af2;
}

.selection-action.large {
  min-width: 96px;
}

.selection-card-check {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 1;
  color: #1e5af2;
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  transition: opacity 0.18s ease;
}

.selection-card:hover .selection-card-check,
.selection-card:focus-within .selection-card-check {
  opacity: 0;
}

.selection-file-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-upload-button {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  background: #1e5af2;
  color: #ffffff;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
}

.selection-empty-state {
  margin-top: 20px;
  padding: 48px 24px;
  border: 1px dashed rgba(191, 219, 254, 0.95);
  border-radius: 20px;
  background: #f8fbff;
  text-align: center;
}

.selection-empty-title {
  color: #0f172a;
  font-size: 18px;
  line-height: 28px;
  font-weight: 600;
}

.selection-empty-copy {
  margin-top: 8px;
  color: #64748b;
  font-size: 14px;
  line-height: 22px;
}

.selection-modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 22px 16px;
  border-top: 1px solid rgba(226, 232, 240, 0.92);
}

.selection-summary {
  color: #475569;
  font-size: 14px;
  line-height: 22px;
}

.selection-summary-muted {
  color: #94a3b8;
}

.selection-foot-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
