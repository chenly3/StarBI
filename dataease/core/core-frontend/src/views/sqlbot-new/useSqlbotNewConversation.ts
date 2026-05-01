import { ElMessage } from 'element-plus-secondary'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { getSQLBotEmbedConfig } from '@/api/aiQueryTheme'
import { useCache } from '@/hooks/web/useCache'
import {
  explainSqlbotError,
  normalizeSqlbotErrorCopy,
  type SqlbotErrorInfo
} from '@/views/sqlbot/sqlbotErrorInfo'
import { buildSqlBotCertificate } from '@/views/sqlbot/queryContext'
import {
  createSQLBotNewContextSwitch,
  deleteSQLBotChat,
  getSQLBotChartData,
  getSQLBotChatWithData,
  getSQLBotNewHistory,
  getSQLBotNewHistoryContext,
  getSQLBotRecommendQuestions,
  getSQLBotRecordUsage,
  startSQLBotAssistantChat,
  streamSQLBotRecordAnalysis,
  streamSQLBotRecordPredict,
  streamSQLBotQuestion,
  upsertSQLBotNewSnapshot,
  validateSQLBotAssistant,
  fetchRuntimeModels,
  type SQLBotChatDetail,
  type SQLBotRequestContext,
  type SQLBotStreamEvent
} from '@/views/sqlbot/sqlbotDirect'
import type {
  SqlbotNewClarificationState,
  SqlbotNewContextSwitchMeta,
  SqlbotNewConversationRecordKind,
  SqlbotNewDatasetCombinationRelationType,
  SqlbotNewExecutionSummary,
  SqlbotNewInterpretationMeta,
  PageMode,
  RecommendItem,
  SQLBotNewPersistedContextEvent,
  SQLBotNewPersistedContextPayload,
  SQLBotNewPersistedSnapshot,
  SqlbotNewExecutionContext,
  SqlbotNewResultEntryPayload,
  SourceKind,
  TabKey
} from './types'

type SqlbotNewDerivedAction = 'analysis' | 'predict'

interface SqlbotNewEmbedState {
  domain: string
  id: string
  enabled: boolean
  valid: boolean
}

interface SqlbotNewConversationRecordDisplayState {
  chartType?: 'table' | 'column' | 'bar' | 'line' | 'pie'
  showChartSwitcher?: boolean
}

interface AppendAssistantReplyOptions {
  executionContext: SqlbotNewExecutionContext
  question: string
  answer: string
  selectionTitle?: string
  selectionMeta?: string
  recommendQuestions?: string[]
}

export interface SqlbotNewConversationRecord {
  kind?: SqlbotNewConversationRecordKind
  contextSwitch?: SqlbotNewContextSwitchMeta
  localId: string
  id?: number
  chatId?: number
  datasource?: number
  executionContext?: SqlbotNewExecutionContext
  sourceRecordId?: number
  sourceLocalId?: string
  derivedAction?: 'analysis' | 'predict'
  derivedQuestion?: string
  question: string
  sqlAnswer: string
  chartAnswer: string
  analysis?: string
  analysisThinking?: string
  analysisLoading?: boolean
  analysisError?: string
  analysisRecordId?: number
  analysisDuration?: number
  analysisTotalTokens?: number
  predict?: string
  predictThinking?: string
  predictLoading?: boolean
  predictError?: string
  predictRecordId?: number
  predictDuration?: number
  predictTotalTokens?: number
  clarification?: SqlbotNewClarificationState
  interpretation?: SqlbotNewInterpretationMeta
  executionSummary?: SqlbotNewExecutionSummary
  reasoning?: Record<string, any>
  sql?: string
  chart?: string
  data?: Record<string, any>
  error: string
  createTime: number
  finish: boolean
  finishTime?: string | number
  duration?: number
  totalTokens?: number
  recommendQuestions: string[]
  pendingChartHydration: boolean
  display?: SqlbotNewConversationRecordDisplayState
  assistantEventPersisted?: boolean
}

export type SqlbotNewErrorInfo = SqlbotErrorInfo

interface SqlbotNewConversationSession {
  id?: number
  localSessionId?: string
  brief: string
  datasource?: number
  records: SqlbotNewConversationRecord[]
}

export interface SqlbotNewHistoryEntry {
  id: string
  title: string
  subtitle: string
  time: string
  updatedAt: number
  backendChatId?: number
  themeId: string
  themeName: string
  queryMode: SourceKind
  sourceId: string
  sourceIds?: string[]
  combinationId?: string
  combinationName?: string
  datasourceId: string
  modelId: string
  datasourcePending: boolean
  selectionTitle: string
  selectionMeta: string
  lastQuestion: string
}

interface SqlbotNewRestoredContext {
  sessionId: string
  themeId: string
  themeName: string
  sourceKind: SourceKind
  sourceId: string
  sourceIds?: string[]
  combinationId?: string
  combinationName?: string
  datasourceId: string
  modelId: string
  datasourcePending: boolean
  selectionTitle: string
  selectionMeta: string
}

interface SubmitQuestionOptions {
  executionContext: SqlbotNewExecutionContext
  question?: string
  reason?: SqlbotNewResultEntryPayload['reason'] | 'recommend'
  silent?: boolean
  selectionTitle?: string
  selectionMeta?: string
}

const ACTIVE_SESSION_STORAGE_KEY = 'STARBI-AI-QUERY-ACTIVE-SESSION'
const MODEL_STORAGE_KEY = 'STARBI-QUERY-MODEL-ID'
const { wsCache: historyWsCache } = useCache('localStorage')
const DATASET_SOURCE_RESOLUTION_CACHE_KEY = 'STARBI-AI-QUERY-DATASET-SOURCE-RESOLUTION'
const LOCAL_SESSION_ID_PREFIX = 'local-sqlbot-'

const normalizeOptionalId = (value: unknown) => {
  const normalized = String(value ?? '').trim()
  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    return ''
  }
  return normalized
}

const normalizeOptionalIdList = (...values: unknown[]) => {
  for (const value of values) {
    if (!Array.isArray(value)) {
      continue
    }
    return [...new Set(value.map(item => normalizeOptionalId(item)).filter(Boolean))]
  }
  return [] as string[]
}

const hasSameOptionalIdList = (left: unknown, right: unknown) => {
  const leftIds = normalizeOptionalIdList(left)
  const rightIds = normalizeOptionalIdList(right)

  if (leftIds.length !== rightIds.length) {
    return false
  }

  return leftIds.every((id, index) => id === rightIds[index])
}

const normalizeSourceKind = (...values: unknown[]): SourceKind | undefined => {
  for (const value of values) {
    const normalized = String(value ?? '').trim()
    if (normalized === 'dataset' || normalized === 'file' || normalized === 'dataset-combination') {
      return normalized
    }
  }
  return undefined
}

const normalizeClarificationSelectionMode = (...values: unknown[]) => {
  for (const value of values) {
    if (value === 'multiple') {
      return 'multiple' as const
    }
    if (value === 'single') {
      return 'single' as const
    }
  }
  return 'single' as const
}

const normalizeClarificationSelectedValues = (...values: unknown[]) => {
  for (const value of values) {
    if (!Array.isArray(value)) {
      continue
    }
    return value.map(item => String(item)).filter(Boolean)
  }
  return [] as string[]
}

const normalizeCombinationRelationType = (
  ...values: unknown[]
): SqlbotNewDatasetCombinationRelationType => {
  for (const value of values) {
    if (value === 'left' || value === 'inner' || value === 'right' || value === 'full') {
      return value
    }
  }
  return 'left'
}

const createLocalSessionId = () =>
  `${LOCAL_SESSION_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const isLocalSessionId = (value: unknown) => {
  const normalized = normalizeOptionalId(value)
  return normalized.startsWith(LOCAL_SESSION_ID_PREFIX)
}

const normalizeNumericValue = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue
    }
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

const normalizeObjectValue = (...values: unknown[]) => {
  for (const value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>
    }
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, any>
        }
      } catch {
        /* ignore non-JSON object strings */
      }
    }
  }
  return undefined
}

const normalizeContextSwitchValue = (...values: unknown[]) => {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return String(value)
    }
  }
  return ''
}

const normalizeConversationContextSwitch = (
  record: Record<string, any>
): SqlbotNewContextSwitchMeta | undefined => {
  const contextSwitch = record?.contextSwitch || record?.context_switch
  if (!contextSwitch || typeof contextSwitch !== 'object') {
    return undefined
  }

  const sourceKind = normalizeSourceKind(contextSwitch.sourceKind, contextSwitch.source_kind)
  if (!sourceKind) {
    return undefined
  }

  return {
    sourceKind,
    sourceId: normalizeContextSwitchValue(contextSwitch.sourceId, contextSwitch.source_id),
    sourceIds: normalizeOptionalIdList(contextSwitch.sourceIds, contextSwitch.source_ids),
    combinationId: normalizeOptionalId(contextSwitch.combinationId || contextSwitch.combination_id),
    combinationName: String(contextSwitch.combinationName || contextSwitch.combination_name || ''),
    datasourceId: normalizeContextSwitchValue(
      contextSwitch.datasourceId,
      contextSwitch.datasource_id
    ),
    sourceTitle: normalizeContextSwitchValue(contextSwitch.sourceTitle, contextSwitch.source_title),
    sourceMeta: normalizeContextSwitchValue(contextSwitch.sourceMeta, contextSwitch.source_meta)
  }
}

export const explainSqlbotNewError = explainSqlbotError
export const normalizeSqlbotNewErrorCopy = normalizeSqlbotErrorCopy

const looksLikeNormalizedErrorSummary = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) {
    return false
  }

  if (raw.startsWith('{') || raw.startsWith('[')) {
    return false
  }

  return (
    raw.startsWith('当前') ||
    raw.startsWith('本轮') ||
    raw.startsWith('这轮') ||
    raw.startsWith('问数')
  )
}

const normalizeLocalRecordTimestamp = (value?: string | number | null) => {
  if (!value) {
    return Date.now()
  }
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Date.now() : timestamp
}

const sanitizeSnapshotRecordError = (record: Record<string, any>) => {
  const hasMaterializedResult =
    Boolean(record?.chart) ||
    Boolean(record?.sql) ||
    Boolean(record?.chartAnswer) ||
    Boolean(record?.sqlAnswer) ||
    (record?.data &&
      ((Array.isArray(record.data?.data) && record.data.data.length > 0) ||
        (Array.isArray(record.data) && record.data.length > 0)))

  if (!hasMaterializedResult) {
    return String(record?.error || '')
  }

  return looksLikeNormalizedErrorSummary(record?.error) ? '' : String(record?.error || '')
}

const createLocalRecord = (question: string) =>
  reactive({
    kind: 'fact-answer' as const,
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    question,
    sqlAnswer: '',
    chartAnswer: '',
    analysis: '',
    analysisThinking: '',
    analysisLoading: false,
    analysisError: '',
    predict: '',
    predictThinking: '',
    predictLoading: false,
    predictError: '',
    clarification: undefined,
    interpretation: undefined,
    executionSummary: undefined,
    reasoning: undefined,
    error: '',
    createTime: Date.now(),
    finish: false,
    recommendQuestions: [],
    pendingChartHydration: false
  }) as SqlbotNewConversationRecord

const isFactAnswerRecord = (record: SqlbotNewConversationRecord) =>
  !record.kind || record.kind === 'answer' || record.kind === 'fact-answer'

const isDerivedQuestionRecord = (record: SqlbotNewConversationRecord) =>
  record.kind === 'derived-question'

const isDerivedAnswerRecord = (record: SqlbotNewConversationRecord) =>
  record.kind === 'derived-answer'

const stripInlineInsightsFromFactRecord = (record: SqlbotNewConversationRecord) => {
  if (!isFactAnswerRecord(record)) {
    return record
  }

  record.analysis = ''
  record.analysisThinking = ''
  record.analysisLoading = false
  record.analysisError = ''
  record.predict = ''
  record.predictThinking = ''
  record.predictLoading = false
  record.predictError = ''
  return record
}

const createAssistantReplyRecord = ({
  question,
  answer,
  executionContext,
  recommendQuestions = [],
  createTime,
  localId,
  assistantEventPersisted
}: Pick<
  AppendAssistantReplyOptions,
  'question' | 'answer' | 'executionContext' | 'recommendQuestions'
> & {
  createTime?: string | number
  localId?: string
  assistantEventPersisted?: boolean
}) => {
  const record = createLocalRecord(question)
  if (localId) {
    record.localId = localId
  }
  record.executionContext = { ...executionContext }
  record.chartAnswer = answer
  record.createTime = normalizeLocalRecordTimestamp(createTime)
  record.finish = true
  record.recommendQuestions = recommendQuestions
  record.assistantEventPersisted = assistantEventPersisted
  return record
}

const HISTORY_INCOMPLETE_META = '历史上下文不完整，仅可查看结果'

const parseChartConfig = (chart?: string) => {
  if (!chart) {
    return {}
  }

  try {
    return JSON.parse(chart) as Record<string, any>
  } catch (error) {
    console.error('parse sqlbot-new chart config failed', error)
    return {}
  }
}

const formatClockTime = (value?: number) => {
  const date = new Date(value || Date.now())
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${hour}:${minute}`
}

const formatHistoryTime = (value?: string | number) => {
  const date = new Date(value || Date.now())
  if (Number.isNaN(date.getTime())) {
    return String(value || '')
  }
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const buildFallbackRecommendQuestions = (
  executionContext?: SqlbotNewExecutionContext,
  selectionTitle?: string
) => {
  const normalizedTitle = String(selectionTitle || '').trim() || '当前数据'
  if (executionContext?.queryMode === 'file') {
    return [
      `先概括「${normalizedTitle}」里有哪些字段和可分析内容`,
      `基于「${normalizedTitle}」给我推荐 3 个可以直接分析的问题`,
      `按时间维度分析「${normalizedTitle}」里的主要趋势`,
      `按类别统计「${normalizedTitle}」里的核心指标占比`
    ]
  }

  return [
    `先概括「${normalizedTitle}」数据集包含哪些字段和业务含义`,
    `按门店统计「${normalizedTitle}」里的销售金额占比`,
    `按日期查看「${normalizedTitle}」里的销售金额趋势`,
    `基于「${normalizedTitle}」推荐 3 个可以直接分析的问题`
  ]
}

const writeActiveSessionId = (sessionId: string) => {
  try {
    if (!sessionId) {
      historyWsCache.delete(ACTIVE_SESSION_STORAGE_KEY)
      window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
      return
    }
    historyWsCache.set(ACTIVE_SESSION_STORAGE_KEY, sessionId)
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId)
  } catch (error) {
    console.error('persist sqlbot-new active session id failed', error)
  }
}

const readDatasourceDatasetCache = () => {
  try {
    const cached = historyWsCache.get(DATASET_SOURCE_RESOLUTION_CACHE_KEY)
    if (cached && typeof cached === 'object') {
      return cached as Record<string, string>
    }
    const raw = window.localStorage.getItem(DATASET_SOURCE_RESOLUTION_CACHE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch (error) {
    console.error('read sqlbot-new datasource dataset cache failed', error)
    return {}
  }
}

export const useSqlbotNewConversation = () => {
  const { wsCache } = useCache('localStorage')

  const pageMode = ref<PageMode>('home')
  const activeTab = ref<TabKey>('query')
  const draftQuestion = ref('')
  const lastEntryPayload = ref<SqlbotNewResultEntryPayload | null>(null)
  const embedState = ref<SqlbotNewEmbedState>({
    domain: '',
    id: '',
    enabled: false,
    valid: false
  })
  const embedConfigLoaded = ref(false)
  const sqlbotAssistantToken = ref('')
  const conversationLoading = ref(false)
  const conversationSession = ref<SqlbotNewConversationSession | null>(null)
  const currentScopeKey = ref('')
  const restoredHistoryContext = ref<SqlbotNewRestoredContext | null>(null)
  const activeExecutionContextRef = ref<SqlbotNewExecutionContext | null>(null)
  const sqlbotAbortController = ref<AbortController | null>(null)
  const sqlbotAnalysisControllerMap = new Map<string, AbortController>()
  const sqlbotPredictControllerMap = new Map<string, AbortController>()
  const pendingDerivedActionKeys = new Set<string>()
  const runtimeModelIds = ref<string[]>([])
  const runtimeDefaultModelId = ref('')
  const datasourceDatasetIdCache = ref<Record<string, string>>(readDatasourceDatasetCache())

  const pageTitle = computed(() => {
    return activeTab.value === 'query' ? '今天想分析什么？' : '今天想生成什么内容？'
  })

  const pageSubtitle = computed(() => {
    switch (activeTab.value) {
      case 'report':
        return '快速生成结构化分析报告'
      case 'build':
        return '拖出你的分析页面蓝图'
      case 'search':
        return '搜业务问题、搜指标、搜资料'
      default:
        return ''
    }
  })

  const conversationRecords = computed(() => conversationSession.value?.records || [])

  const latestRecommendRecord = computed(() => {
    return (
      [...conversationRecords.value]
        .reverse()
        .find(record => record.finish && record.recommendQuestions.length > 0) || null
    )
  })

  const recommendedQuestions = computed<RecommendItem[]>(() => {
    return (latestRecommendRecord.value?.recommendQuestions || [])
      .slice(0, 4)
      .map((label, index) => {
        return {
          id: `${latestRecommendRecord.value?.localId || 'recommend'}-${index}`,
          label
        }
      })
  })

  const hasConversationRecords = computed(() => conversationRecords.value.length > 0)
  const conversationEmptyTitle = computed(() => {
    if (lastEntryPayload.value?.reason === 'history') {
      return conversationLoading.value ? '正在恢复历史问数' : '未找到可恢复的历史结果'
    }
    if (
      lastEntryPayload.value?.sourceKind === 'file' &&
      lastEntryPayload.value?.datasourcePending
    ) {
      return '文件数据源仍在准备中'
    }
    return '请输入问题开始真实问数'
  })
  const conversationEmptyCopy = computed(() => {
    if (lastEntryPayload.value?.reason === 'history') {
      return conversationLoading.value
        ? '正在从 SQLBot 加载历史问数详情，请稍候。'
        : '当前历史会话没有可展示的记录，你可以基于该上下文继续追问。'
    }
    if (
      lastEntryPayload.value?.sourceKind === 'file' &&
      lastEntryPayload.value?.datasourcePending
    ) {
      return 'Task 6 之前暂不创建真实文件 datasource，请等待文件接入完成后再提交。'
    }
    return '结果区会展示真实 SSE 返回的文本、图表与推荐问题。'
  })

  const embedAvailable = computed(() => {
    const state = embedState.value
    return Boolean(state.domain && state.id && state.enabled && state.valid)
  })

  const activeExecutionContext = computed<SqlbotNewExecutionContext | null>(() => {
    if (activeExecutionContextRef.value) {
      return {
        ...activeExecutionContextRef.value
      }
    }
    if (!restoredHistoryContext.value) {
      return null
    }
    return {
      themeId: restoredHistoryContext.value.themeId,
      themeName: restoredHistoryContext.value.themeName,
      queryMode: restoredHistoryContext.value.sourceKind,
      sourceId: restoredHistoryContext.value.sourceId,
      sourceIds: restoredHistoryContext.value.sourceIds || [],
      combinationId: restoredHistoryContext.value.combinationId,
      combinationName: restoredHistoryContext.value.combinationName,
      datasourceId: restoredHistoryContext.value.datasourceId,
      modelId: restoredHistoryContext.value.modelId,
      datasourcePending: restoredHistoryContext.value.datasourcePending
    }
  })

  const isAvailableRuntimeModelId = (modelId: unknown) => {
    const normalizedModelId = normalizeOptionalId(modelId)
    return Boolean(
      normalizedModelId && runtimeModelIds.value.some(item => item === normalizedModelId)
    )
  }

  const ensureRuntimeModelsLoaded = async () => {
    if (runtimeModelIds.value.length || runtimeDefaultModelId.value) {
      return
    }

    try {
      const runtimeModelResult = await fetchRuntimeModels()
      runtimeModelIds.value = runtimeModelResult.models
        .map(item => normalizeOptionalId(item.id))
        .filter(Boolean)
      runtimeDefaultModelId.value = normalizeOptionalId(runtimeModelResult.defaultModelId)
    } catch (error) {
      console.error('load sqlbot-new conversation runtime models failed', error)
      runtimeModelIds.value = []
      runtimeDefaultModelId.value = ''
    }
  }

  const persistDatasourceDatasetCache = () => {
    try {
      historyWsCache.set(DATASET_SOURCE_RESOLUTION_CACHE_KEY, datasourceDatasetIdCache.value)
      window.localStorage.setItem(
        DATASET_SOURCE_RESOLUTION_CACHE_KEY,
        JSON.stringify(datasourceDatasetIdCache.value)
      )
    } catch (error) {
      console.error('persist sqlbot-new datasource dataset cache failed', error)
    }
  }

  const resolveRestoredModelId = (modelId: unknown) => {
    if (isAvailableRuntimeModelId(modelId)) {
      return normalizeOptionalId(modelId)
    }

    const cachedModelId = normalizeOptionalId(wsCache.get(MODEL_STORAGE_KEY))
    if (isAvailableRuntimeModelId(cachedModelId)) {
      return cachedModelId
    }

    if (isAvailableRuntimeModelId(runtimeDefaultModelId.value)) {
      return normalizeOptionalId(runtimeDefaultModelId.value)
    }

    return normalizeOptionalId(runtimeModelIds.value[0])
  }

  const repairRestoredExecutionContext = (
    executionContext: SqlbotNewExecutionContext
  ): SqlbotNewExecutionContext => {
    return {
      ...executionContext,
      queryMode: normalizeSourceKind(executionContext.queryMode) || 'dataset',
      themeId: normalizeOptionalId(executionContext.themeId),
      themeName: String(executionContext.themeName || ''),
      sourceId: normalizeOptionalId(executionContext.sourceId),
      sourceIds: normalizeOptionalIdList(executionContext.sourceIds),
      combinationId: normalizeOptionalId(executionContext.combinationId),
      combinationName: String(executionContext.combinationName || ''),
      datasourceId: normalizeOptionalId(executionContext.datasourceId),
      modelId: resolveRestoredModelId(executionContext.modelId)
    }
  }

  const getScopeKey = (executionContext: SqlbotNewExecutionContext) => {
    return [
      executionContext.themeId || '',
      executionContext.queryMode,
      executionContext.combinationId || '',
      executionContext.sourceIds?.length
        ? executionContext.sourceIds.join(',')
        : executionContext.sourceId,
      executionContext.datasourceId,
      executionContext.modelId
    ].join('|')
  }

  const buildCertificate = (executionContext: SqlbotNewExecutionContext) => {
    if (executionContext.queryMode === 'file') {
      return buildSqlBotCertificate({
        datasetIds: [],
        datasourceId: normalizeOptionalId(executionContext.datasourceId) || undefined,
        entryScene: 'file_query'
      })
    }

    if (executionContext.queryMode === 'dataset-combination') {
      const combinationTarget =
        normalizeOptionalId(executionContext.combinationId) ||
        normalizeOptionalId(executionContext.sourceId)
      return buildSqlBotCertificate({
        datasetIds: combinationTarget ? [combinationTarget] : [],
        datasourceId: normalizeOptionalId(executionContext.datasourceId) || undefined,
        entryScene: 'dataset_combination_query'
      })
    }

    return buildSqlBotCertificate({
      datasetIds: executionContext.sourceIds?.length
        ? executionContext.sourceIds
        : executionContext.sourceId
        ? [executionContext.sourceId]
        : [],
      datasourceId: normalizeOptionalId(executionContext.datasourceId) || undefined,
      entryScene: 'dataset_query'
    })
  }

  const buildRequestContext = (
    executionContext: SqlbotNewExecutionContext,
    assistantToken: string
  ): SQLBotRequestContext => {
    return {
      domain: embedState.value.domain,
      assistantId: String(embedState.value.id),
      assistantToken,
      certificate: buildCertificate(executionContext),
      hostOrigin: window.location.origin,
      locale: String(wsCache.get('lang') || 'zh-CN')
    }
  }

  const buildHistoryRequestContext = (assistantToken: string): SQLBotRequestContext => {
    return {
      domain: embedState.value.domain,
      assistantId: String(embedState.value.id),
      assistantToken,
      certificate: buildSqlBotCertificate({
        datasetIds: [],
        entryScene: 'dataset_query',
        themeId: activeExecutionContext.value?.themeId,
        themeName: activeExecutionContext.value?.themeName
      }),
      hostOrigin: window.location.origin,
      locale: String(wsCache.get('lang') || 'zh-CN')
    }
  }

  const buildPersistedExecutionEventPayload = (executionContext: SqlbotNewExecutionContext) => {
    const sourceIds = normalizeOptionalIdList(executionContext.sourceIds)
    const combinationId = normalizeOptionalId(executionContext.combinationId)
    const combinationName = String(executionContext.combinationName || '')
    const payload: Record<string, any> = {}

    if (sourceIds.length) {
      payload.source_ids = sourceIds
    }
    if (combinationId) {
      payload.combination_id = combinationId
    }
    if (combinationName) {
      payload.combination_name = combinationName
    }

    return Object.keys(payload).length ? payload : undefined
  }

  const extractPersistedExecutionMetadata = (payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      return {
        sourceIds: [] as string[],
        combinationId: '',
        combinationName: ''
      }
    }

    const rawPayload = payload as Record<string, any>
    return {
      sourceIds: normalizeOptionalIdList(rawPayload.sourceIds, rawPayload.source_ids),
      combinationId: normalizeOptionalId(rawPayload.combinationId || rawPayload.combination_id),
      combinationName: String(rawPayload.combinationName || rawPayload.combination_name || '')
    }
  }

  const loadEmbedConfig = async () => {
    if (embedConfigLoaded.value) {
      return embedState.value
    }

    const embedConfig = await getSQLBotEmbedConfig()
    embedState.value = {
      domain: embedConfig?.domain || '',
      id: String(embedConfig?.id || ''),
      enabled: embedConfig?.enabled !== false,
      valid: embedConfig?.valid !== false
    }
    embedConfigLoaded.value = true
    return embedState.value
  }

  const ensureAssistantToken = async (executionContext: SqlbotNewExecutionContext) => {
    await loadEmbedConfig()
    if (!embedAvailable.value) {
      throw new Error('智能问数嵌入配置不可用')
    }

    const validator = await validateSQLBotAssistant(
      embedState.value.domain,
      String(embedState.value.id)
    )
    const nextToken = String(validator?.token || '')
    if (!nextToken) {
      throw new Error('SQLBot assistant token is empty')
    }

    sqlbotAssistantToken.value = nextToken
    return buildRequestContext(executionContext, nextToken).assistantToken
  }

  const normalizeRecommendedQuestions = (record: Record<string, any>) => {
    if (Array.isArray(record?.recommendQuestions)) {
      return record.recommendQuestions.map((item: string) => String(item))
    }
    if (Array.isArray(record?.recommended_question)) {
      return record.recommended_question.map((item: string) => String(item))
    }
    if (typeof record?.recommended_question === 'string' && record.recommended_question.trim()) {
      try {
        const parsed = JSON.parse(record.recommended_question)
        return Array.isArray(parsed) ? parsed.map((item: string) => String(item)) : []
      } catch (error) {
        console.error('parse sqlbot-new recommended questions failed', error)
      }
    }
    return []
  }

  const buildDerivedQuestionText = (
    action: SqlbotNewDerivedAction,
    sourceRecord: SqlbotNewConversationRecord
  ) => {
    const question = String(sourceRecord.question || '').trim()
    const target = question ? `“${question}”` : '上面的结果'
    return action === 'analysis' ? `对${target}做数据解读` : `对${target}做趋势预测`
  }

  const getDerivedActionKey = (
    sourceRecord: SqlbotNewConversationRecord,
    action: SqlbotNewDerivedAction
  ) => `${sourceRecord.id || sourceRecord.localId}:${action}`

  const isDerivedActionPending = (
    sourceRecord: SqlbotNewConversationRecord,
    action: SqlbotNewDerivedAction
  ) => pendingDerivedActionKeys.has(getDerivedActionKey(sourceRecord, action))

  const createDerivedQuestionMessage = ({
    action,
    sourceRecord,
    question,
    createTime,
    localId,
    assistantEventPersisted
  }: {
    action: SqlbotNewDerivedAction
    sourceRecord: SqlbotNewConversationRecord
    question: string
    createTime?: string | number
    localId?: string
    assistantEventPersisted?: boolean
  }): SqlbotNewConversationRecord =>
    reactive({
      kind: 'derived-question',
      localId:
        localId ||
        `derived-question-${sourceRecord.localId}-${action}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
      sourceRecordId: sourceRecord.id,
      sourceLocalId: sourceRecord.localId,
      derivedAction: action,
      derivedQuestion: question,
      executionContext: sourceRecord.executionContext
        ? {
            ...sourceRecord.executionContext
          }
        : undefined,
      question,
      sqlAnswer: '',
      chartAnswer: '',
      error: '',
      createTime: normalizeRecordTimestamp(createTime),
      finish: true,
      recommendQuestions: [],
      pendingChartHydration: false,
      assistantEventPersisted
    }) as SqlbotNewConversationRecord

  const createDerivedAnswerMessage = ({
    action,
    sourceRecord,
    question,
    createTime,
    localId,
    assistantEventPersisted
  }: {
    action: SqlbotNewDerivedAction
    sourceRecord: SqlbotNewConversationRecord
    question: string
    createTime?: string | number
    localId?: string
    assistantEventPersisted?: boolean
  }): SqlbotNewConversationRecord =>
    reactive({
      kind: 'derived-answer',
      localId:
        localId ||
        `derived-answer-${sourceRecord.localId}-${action}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
      sourceRecordId: sourceRecord.id,
      sourceLocalId: sourceRecord.localId,
      derivedAction: action,
      derivedQuestion: question,
      executionContext: sourceRecord.executionContext
        ? {
            ...sourceRecord.executionContext
          }
        : undefined,
      question,
      sqlAnswer: '',
      chartAnswer: '',
      analysis: '',
      analysisThinking: '',
      analysisLoading: action === 'analysis',
      analysisError: '',
      predict: '',
      predictThinking: '',
      predictLoading: action === 'predict',
      predictError: '',
      error: '',
      createTime: normalizeRecordTimestamp(createTime),
      finish: false,
      recommendQuestions: [],
      pendingChartHydration: false,
      assistantEventPersisted
    }) as SqlbotNewConversationRecord

  const createLegacyInsightDerivedMessages = (
    sourceRecord: SqlbotNewConversationRecord,
    coveredActions = new Set<string>()
  ): SqlbotNewConversationRecord[] => {
    const records: SqlbotNewConversationRecord[] = []
    const legacyAnalysis = String(sourceRecord.analysis || '').trim()
    const legacyPredict = String(sourceRecord.predict || '').trim()

    if (legacyAnalysis && !coveredActions.has(getDerivedActionKey(sourceRecord, 'analysis'))) {
      const question = buildDerivedQuestionText('analysis', sourceRecord)
      records.push(
        createDerivedQuestionMessage({
          action: 'analysis',
          sourceRecord,
          question,
          assistantEventPersisted: true
        })
      )
      const answer = createDerivedAnswerMessage({
        action: 'analysis',
        sourceRecord,
        question,
        assistantEventPersisted: true
      })
      answer.analysis = legacyAnalysis
      answer.analysisThinking = sourceRecord.analysisThinking || ''
      answer.analysisLoading = false
      answer.analysisRecordId = sourceRecord.analysisRecordId
      answer.finish = true
      records.push(answer)
    }

    if (legacyPredict && !coveredActions.has(getDerivedActionKey(sourceRecord, 'predict'))) {
      const question = buildDerivedQuestionText('predict', sourceRecord)
      records.push(
        createDerivedQuestionMessage({
          action: 'predict',
          sourceRecord,
          question,
          assistantEventPersisted: true
        })
      )
      const answer = createDerivedAnswerMessage({
        action: 'predict',
        sourceRecord,
        question,
        assistantEventPersisted: true
      })
      answer.predict = legacyPredict
      answer.predictThinking = sourceRecord.predictThinking || ''
      answer.predictLoading = false
      answer.predictRecordId = sourceRecord.predictRecordId
      answer.finish = true
      records.push(answer)
    }

    stripInlineInsightsFromFactRecord(sourceRecord)
    return records
  }

  const normalizeConversationRecord = (
    record: Record<string, any>,
    executionContext?: SqlbotNewExecutionContext
  ): SqlbotNewConversationRecord => {
    const sanitizedError = sanitizeSnapshotRecordError(record)
    const normalizedContextSwitch = normalizeConversationContextSwitch(record)
    const recordExecutionContext = record?.executionContext || record?.execution_context
    const storedExecutionContext =
      recordExecutionContext && typeof recordExecutionContext === 'object'
        ? repairRestoredExecutionContext({
            themeId:
              recordExecutionContext.themeId ||
              recordExecutionContext.theme_id ||
              executionContext?.themeId ||
              '',
            themeName:
              recordExecutionContext.themeName ||
              recordExecutionContext.theme_name ||
              executionContext?.themeName ||
              '',
            queryMode:
              normalizeSourceKind(
                recordExecutionContext.queryMode || recordExecutionContext.query_mode
              ) ||
              executionContext?.queryMode ||
              'dataset',
            sourceId: normalizeOptionalId(
              recordExecutionContext.sourceId ||
                recordExecutionContext.source_id ||
                executionContext?.sourceId
            ),
            sourceIds: Array.isArray(
              recordExecutionContext.sourceIds || recordExecutionContext.source_ids
            )
              ? (recordExecutionContext.sourceIds || recordExecutionContext.source_ids)
                  .map((item: unknown) => normalizeOptionalId(item))
                  .filter(Boolean)
              : executionContext?.sourceIds || [],
            combinationId: normalizeOptionalId(
              recordExecutionContext.combinationId ||
                recordExecutionContext.combination_id ||
                executionContext?.combinationId
            ),
            combinationName: String(
              recordExecutionContext.combinationName ||
                recordExecutionContext.combination_name ||
                executionContext?.combinationName ||
                ''
            ),
            datasourceId: normalizeOptionalId(
              recordExecutionContext.datasourceId ||
                recordExecutionContext.datasource_id ||
                executionContext?.datasourceId
            ),
            modelId: normalizeOptionalId(
              recordExecutionContext.modelId ||
                recordExecutionContext.model_id ||
                executionContext?.modelId
            ),
            datasourcePending:
              recordExecutionContext.datasourcePending !== undefined ||
              recordExecutionContext.datasource_pending !== undefined
                ? Boolean(
                    recordExecutionContext.datasourcePending ??
                      recordExecutionContext.datasource_pending
                  )
                : Boolean(executionContext?.datasourcePending)
          })
        : executionContext
        ? { ...executionContext }
        : undefined
    const rawKind = String(record?.kind || '').trim()
    const normalizedKind: SqlbotNewConversationRecordKind =
      record?.kind === 'context-switch' || normalizedContextSwitch
        ? 'context-switch'
        : rawKind === 'derived-question' ||
          rawKind === 'derived-answer' ||
          rawKind === 'fact-answer' ||
          rawKind === 'answer'
        ? rawKind
        : 'fact-answer'
    const derivedAction =
      record?.derivedAction === 'analysis' || record?.derivedAction === 'predict'
        ? record.derivedAction
        : record?.derived_action === 'analysis' || record?.derived_action === 'predict'
        ? record.derived_action
        : undefined
    return {
      kind: normalizedKind,
      contextSwitch: normalizedContextSwitch,
      localId: String(record?.localId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      id: normalizeNumericValue(record?.id),
      chatId: normalizeNumericValue(record?.chatId, record?.chat_id),
      datasource: normalizeNumericValue(record?.datasource),
      executionContext: storedExecutionContext,
      sourceRecordId: normalizeNumericValue(record?.sourceRecordId, record?.source_record_id),
      sourceLocalId: String(record?.sourceLocalId || record?.source_local_id || ''),
      derivedAction,
      derivedQuestion: String(record?.derivedQuestion || record?.derived_question || ''),
      question: String(record?.question || ''),
      sqlAnswer: String(record?.sqlAnswer || record?.sql_answer || ''),
      chartAnswer: String(record?.chartAnswer || record?.chart_answer || ''),
      analysis: String(record?.analysis || ''),
      analysisThinking: String(record?.analysisThinking || record?.analysis_thinking || ''),
      analysisLoading: false,
      analysisError: String(record?.analysisError || ''),
      analysisRecordId: normalizeNumericValue(record?.analysisRecordId, record?.analysis_record_id),
      analysisDuration: normalizeNumericValue(record?.analysisDuration),
      analysisTotalTokens: normalizeNumericValue(record?.analysisTotalTokens),
      predict: String(record?.predict || record?.predictContent || record?.predict_content || ''),
      predictThinking: String(record?.predictThinking || record?.predict_thinking || ''),
      predictLoading: false,
      predictError: String(record?.predictError || ''),
      predictRecordId: normalizeNumericValue(record?.predictRecordId, record?.predict_record_id),
      predictDuration: normalizeNumericValue(record?.predictDuration),
      predictTotalTokens: normalizeNumericValue(record?.predictTotalTokens),
      clarification: record?.clarification
        ? (() => {
            const combinationDraft =
              record.clarification.combinationDraft || record.clarification.combination_draft

            return {
              reasonCode: String(
                record.clarification.reasonCode || record.clarification.reason_code || ''
              ),
              prompt: String(record.clarification.prompt || ''),
              options: Array.isArray(record.clarification.options)
                ? record.clarification.options.map((item: Record<string, any>) => ({
                    label: String(item?.label || ''),
                    value: String(item?.value || ''),
                    description: item?.description ? String(item.description) : undefined,
                    chips: Array.isArray(item?.chips)
                      ? item.chips
                          .map((chip: unknown) => String(chip))
                          .filter(Boolean)
                          .slice(0, 3)
                      : undefined
                  }))
                : [],
              pending: record?.clarification?.pending !== false,
              selectionMode: normalizeClarificationSelectionMode(
                record.clarification.selectionMode,
                record.clarification.selection_mode
              ),
              confirmLabel: record.clarification.confirmLabel
                ? String(record.clarification.confirmLabel)
                : undefined,
              selectedValues: normalizeClarificationSelectedValues(
                record.clarification.selectedValues,
                record.clarification.selected_values
              ),
              combinationDraft: combinationDraft
                ? {
                    name: String(combinationDraft.name || ''),
                    primaryDatasetId: normalizeOptionalId(
                      combinationDraft.primaryDatasetId || combinationDraft.primary_dataset_id
                    ),
                    secondaryDatasetIds: normalizeOptionalIdList(
                      combinationDraft.secondaryDatasetIds,
                      combinationDraft.secondary_dataset_ids
                    ),
                    relations: Array.isArray(combinationDraft.relations)
                      ? combinationDraft.relations.map((item: Record<string, any>) => ({
                          leftDatasetId: normalizeOptionalId(
                            item.leftDatasetId || item.left_dataset_id
                          ),
                          leftField: String(item.leftField || item.left_field || ''),
                          rightDatasetId: normalizeOptionalId(
                            item.rightDatasetId || item.right_dataset_id
                          ),
                          rightField: String(item.rightField || item.right_field || ''),
                          relationType: normalizeCombinationRelationType(
                            item.relationType,
                            item.relation_type
                          )
                        }))
                      : []
                  }
                : undefined
            }
          })()
        : undefined,
      interpretation: record?.interpretation
        ? {
            metric: Array.isArray(record.interpretation.metric)
              ? record.interpretation.metric.map((item: string) => String(item))
              : [],
            dimension: Array.isArray(record.interpretation.dimension)
              ? record.interpretation.dimension.map((item: string) => String(item))
              : [],
            timeRange: String(
              record.interpretation.timeRange || record.interpretation.time_range || ''
            ),
            filters: Array.isArray(record.interpretation.filters)
              ? record.interpretation.filters.map((item: string) => String(item))
              : [],
            defaultedFields: Array.isArray(
              record.interpretation.defaultedFields || record.interpretation.defaulted_fields
            )
              ? (
                  record.interpretation.defaultedFields || record.interpretation.defaulted_fields
                ).map((item: string) => String(item))
              : []
          }
        : undefined,
      executionSummary: record?.executionSummary
        ? {
            scopeLabel: String(
              record.executionSummary.scopeLabel || record.executionSummary.scope_label || ''
            ),
            datasourceLabel: String(
              record.executionSummary.datasourceLabel ||
                record.executionSummary.datasource_label ||
                ''
            ),
            summary: String(record.executionSummary.summary || ''),
            failureStage: String(
              record.executionSummary.failureStage || record.executionSummary.failure_stage || ''
            ),
            nextAction: String(
              record.executionSummary.nextAction || record.executionSummary.next_action || ''
            )
          }
        : undefined,
      reasoning: normalizeObjectValue(record?.reasoning, record?.reasoning_content),
      sql: record?.sql ? String(record.sql) : undefined,
      chart: record?.chart ? String(record.chart) : undefined,
      data: record?.data || undefined,
      error: sanitizedError ? normalizeSqlbotNewErrorCopy(sanitizedError) : '',
      createTime: Number(
        record?.createTime || new Date(record?.create_time || Date.now()).getTime()
      ),
      finish: record?.finish !== false,
      finishTime: record?.finishTime || record?.finish_time,
      duration: normalizeNumericValue(record?.duration),
      totalTokens: normalizeNumericValue(record?.totalTokens),
      recommendQuestions: normalizeRecommendedQuestions(record),
      pendingChartHydration: false,
      display: {
        chartType: record?.display?.chartType,
        showChartSwitcher: record?.display?.showChartSwitcher === true
      }
    }
  }

  const normalizeConversationSession = (
    chat: SQLBotChatDetail | Record<string, any>,
    executionContext?: SqlbotNewExecutionContext
  ): SqlbotNewConversationSession => {
    const rawRecords = Array.isArray(chat?.records) ? chat.records : []
    return {
      id: normalizeNumericValue(chat?.id),
      brief: String(chat?.brief || restoredHistoryContext.value?.selectionTitle || ''),
      datasource: normalizeNumericValue(chat?.datasource),
      records: rawRecords
        .map(item => normalizeConversationRecord(item, executionContext))
        .filter(isMeaningfulConversationRecord)
    }
  }

  const isMeaningfulConversationRecord = (record: SqlbotNewConversationRecord) => {
    if (
      record.kind === 'context-switch' ||
      record.contextSwitch ||
      isDerivedQuestionRecord(record) ||
      isDerivedAnswerRecord(record)
    ) {
      return true
    }

    if (!record.finish) {
      return true
    }

    return Boolean(
      String(record.question || '').trim() ||
        String(record.sqlAnswer || '').trim() ||
        String(record.chartAnswer || '').trim() ||
        String(record.analysis || '').trim() ||
        String(record.error || '').trim() ||
        record.clarification ||
        record.interpretation ||
        record.executionSummary ||
        record.reasoning ||
        record.sql ||
        record.chart ||
        record.data
    )
  }

  const findLatestOriginalQuestionInRecords = (records: SqlbotNewConversationRecord[]) =>
    [...records]
      .reverse()
      .find(record => isFactAnswerRecord(record) && String(record.question || '').trim())
      ?.question || ''

  const normalizeRecordTimestamp = (value?: string | number | null) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    const parsed = new Date(String(value || '')).getTime()
    return Number.isFinite(parsed) ? parsed : Date.now()
  }

  const pickFirstNonEmptyString = (...values: unknown[]) => {
    for (const value of values) {
      const normalized = String(value || '').trim()
      if (normalized) {
        return normalized
      }
    }
    return ''
  }

  const findLatestPersistedContextEvent = (
    payload: SQLBotNewPersistedContextPayload,
    predicate: (event: SQLBotNewPersistedContextEvent) => boolean
  ) => {
    return [...(payload.events || [])].reverse().find(predicate)
  }

  const resolveHistoryRestoreExecutionContext = ({
    entry,
    snapshot,
    latestContextEvent,
    fallbackDatasourceId
  }: {
    entry: SqlbotNewHistoryEntry
    snapshot?: SQLBotNewPersistedSnapshot
    latestContextEvent?: SQLBotNewPersistedContextEvent
    fallbackDatasourceId?: unknown
  }) => {
    const latestEventMetadata = extractPersistedExecutionMetadata(latestContextEvent?.eventPayload)
    const queryMode =
      snapshot?.activeSourceKind || latestContextEvent?.sourceKind || entry.queryMode || 'dataset'
    const sourceId = normalizeOptionalId(
      snapshot?.activeSourceId || latestContextEvent?.sourceId || entry.sourceId
    )
    const sourceIds = normalizeOptionalIdList(
      snapshot?.activeSourceIds,
      latestContextEvent?.sourceIds,
      latestEventMetadata.sourceIds,
      entry.sourceIds
    )
    const combinationId = normalizeOptionalId(
      snapshot?.activeCombinationId ||
        latestContextEvent?.combinationId ||
        latestEventMetadata.combinationId ||
        entry.combinationId
    )
    const combinationName = pickFirstNonEmptyString(
      snapshot?.activeCombinationName,
      latestContextEvent?.combinationName,
      latestEventMetadata.combinationName,
      entry.combinationName
    )
    const datasourceId = normalizeOptionalId(
      snapshot?.activeDatasourceId ||
        latestContextEvent?.datasourceId ||
        entry.datasourceId ||
        fallbackDatasourceId
    )
    const effectiveDatasourceId =
      queryMode !== 'file' &&
      !sourceId &&
      !normalizeOptionalIdList(
        snapshot?.activeSourceIds,
        latestContextEvent?.sourceIds,
        entry.sourceIds
      ).length
        ? ''
        : datasourceId

    return repairRestoredExecutionContext({
      themeId: normalizeOptionalId(
        snapshot?.activeThemeId || latestContextEvent?.themeId || entry.themeId
      ),
      themeName: pickFirstNonEmptyString(
        snapshot?.activeThemeName,
        latestContextEvent?.themeName,
        entry.themeName
      ),
      queryMode,
      sourceId: queryMode === 'file' && !sourceId ? effectiveDatasourceId : sourceId,
      sourceIds,
      combinationId,
      combinationName,
      datasourceId: effectiveDatasourceId,
      modelId: normalizeOptionalId(
        snapshot?.activeModelId || latestContextEvent?.modelId || entry.modelId
      ),
      datasourcePending:
        snapshot?.datasourcePending ??
        latestContextEvent?.datasourcePending ??
        entry.datasourcePending
    })
  }

  const resolveHistoryRestoreSelection = ({
    entry,
    snapshot,
    latestContextEvent,
    executionContext,
    detail
  }: {
    entry: SqlbotNewHistoryEntry
    snapshot?: SQLBotNewPersistedSnapshot
    latestContextEvent?: SQLBotNewPersistedContextEvent
    executionContext: SqlbotNewExecutionContext
    detail?: SQLBotChatDetail | null
  }) => {
    const missingRequiredContext =
      executionContext.queryMode === 'file'
        ? !executionContext.datasourceId
        : !executionContext.sourceId

    const selectionTitle = buildHistoryEntryTitle({
      selectionTitle: pickFirstNonEmptyString(
        snapshot?.selectionTitle,
        latestContextEvent?.selectionTitle,
        entry.selectionTitle
      ),
      sourceTitle: pickFirstNonEmptyString(
        latestContextEvent?.selectionTitle,
        detail?.datasource_name
      ),
      brief: pickFirstNonEmptyString(detail?.brief, entry.title),
      lastQuestion: entry.lastQuestion,
      sessionId: entry.id
    })
    const selectionMeta = buildHistoryEntryMeta({
      selectionMeta: pickFirstNonEmptyString(
        snapshot?.selectionMeta,
        entry.selectionMeta,
        entry.subtitle
      ),
      sourceMeta: pickFirstNonEmptyString(
        latestContextEvent?.selectionMeta,
        executionContext.queryMode === 'file' ? detail?.datasource_name : ''
      ),
      missingRequiredContext
    })

    return {
      selectionTitle,
      selectionMeta
    }
  }

  const getCurrentConversationHistoryEntry = (): SqlbotNewHistoryEntry | null => {
    if (!conversationSession.value?.records.length) {
      return null
    }

    const latestRecord =
      conversationSession.value.records[conversationSession.value.records.length - 1]
    const lastQuestion = findLatestOriginalQuestionInRecords(conversationSession.value.records)
    if (!lastQuestion) {
      return null
    }
    const currentSessionId = normalizeOptionalId(
      conversationSession.value.id ||
        conversationSession.value.localSessionId ||
        latestRecord.chatId ||
        restoredHistoryContext.value?.sessionId
    )
    if (!currentSessionId) {
      return null
    }

    const effectiveExecutionContext =
      activeExecutionContextRef.value ||
      latestRecord.executionContext ||
      (restoredHistoryContext.value
        ? repairRestoredExecutionContext({
            themeId: restoredHistoryContext.value.themeId,
            themeName: restoredHistoryContext.value.themeName,
            queryMode: restoredHistoryContext.value.sourceKind,
            sourceId: restoredHistoryContext.value.sourceId,
            sourceIds: restoredHistoryContext.value.sourceIds,
            combinationId: restoredHistoryContext.value.combinationId,
            combinationName: restoredHistoryContext.value.combinationName,
            datasourceId: restoredHistoryContext.value.datasourceId,
            modelId: restoredHistoryContext.value.modelId,
            datasourcePending: restoredHistoryContext.value.datasourcePending
          })
        : null)

    if (!effectiveExecutionContext) {
      return null
    }

    const updatedAt = Number(latestRecord.createTime) || Date.now()
    const resourceTitle = buildHistoryEntryTitle({
      selectionTitle: pickFirstNonEmptyString(
        restoredHistoryContext.value?.selectionTitle,
        lastEntryPayload.value?.selectionTitle
      ),
      sourceTitle: pickFirstNonEmptyString(
        restoredHistoryContext.value?.selectionTitle,
        lastEntryPayload.value?.selectionTitle
      ),
      brief: pickFirstNonEmptyString(
        effectiveExecutionContext.combinationName,
        effectiveExecutionContext.sourceId,
        effectiveExecutionContext.datasourceId
      ),
      lastQuestion: '',
      sessionId: currentSessionId
    })
    const title = lastQuestion
    const selectionMeta = buildHistoryEntryMeta({
      selectionMeta: restoredHistoryContext.value?.selectionMeta,
      sourceMeta: restoredHistoryContext.value?.selectionMeta,
      missingRequiredContext:
        effectiveExecutionContext.queryMode === 'file'
          ? !effectiveExecutionContext.datasourceId
          : !effectiveExecutionContext.sourceId
    })

    return {
      id: currentSessionId,
      title,
      subtitle: [resourceTitle, selectionMeta].filter(Boolean).join(' / ') || title,
      time: formatHistoryTime(updatedAt),
      updatedAt,
      backendChatId: normalizeNumericValue(conversationSession.value.id, latestRecord.chatId),
      themeId: effectiveExecutionContext.themeId,
      themeName: effectiveExecutionContext.themeName,
      queryMode: effectiveExecutionContext.queryMode,
      sourceId: effectiveExecutionContext.sourceId,
      sourceIds: effectiveExecutionContext.sourceIds,
      combinationId: effectiveExecutionContext.combinationId,
      combinationName: effectiveExecutionContext.combinationName,
      datasourceId: effectiveExecutionContext.datasourceId,
      modelId: effectiveExecutionContext.modelId,
      datasourcePending: effectiveExecutionContext.datasourcePending,
      selectionTitle: resourceTitle,
      selectionMeta,
      lastQuestion
    }
  }

  const mergeConversationRecordsWithSnapshot = (
    records: SqlbotNewConversationRecord[],
    snapshotRecords: Array<Record<string, any> | SqlbotNewConversationRecord> = [],
    executionContext?: SqlbotNewExecutionContext
  ) => {
    const normalizedSnapshotRecords = snapshotRecords
      .map(item => normalizeConversationRecord(item as Record<string, any>, executionContext))
      .filter(isMeaningfulConversationRecord)

    return [
      ...normalizedSnapshotRecords,
      ...records.filter(
        record => record.kind !== 'context-switch' && isMeaningfulConversationRecord(record)
      )
    ].sort((left, right) => {
      const timestampDiff = left.createTime - right.createTime
      if (timestampDiff !== 0) {
        return timestampDiff
      }
      if ((left.kind || 'answer') !== (right.kind || 'answer')) {
        const order: Record<string, number> = {
          'context-switch': 0,
          answer: 1,
          'fact-answer': 1,
          'derived-question': 2,
          'derived-answer': 3
        }
        return (order[left.kind || 'answer'] ?? 9) - (order[right.kind || 'answer'] ?? 9)
      }
      if (left.id && right.id && left.id !== right.id) {
        return left.id - right.id
      }
      return left.localId.localeCompare(right.localId)
    })
  }

  const createHistoryContext = (
    executionContext: SqlbotNewExecutionContext,
    sessionId: string,
    selectionTitle?: string,
    selectionMeta?: string
  ): SqlbotNewRestoredContext => {
    const normalizedTitle =
      selectionTitle !== undefined
        ? String(selectionTitle)
        : String(restoredHistoryContext.value?.selectionTitle || '')
    const normalizedMeta =
      selectionMeta !== undefined
        ? String(selectionMeta)
        : String(restoredHistoryContext.value?.selectionMeta || '')
    return {
      sessionId,
      themeId: executionContext.themeId || '',
      themeName: executionContext.themeName || '',
      sourceKind: executionContext.queryMode,
      sourceId: executionContext.sourceId,
      sourceIds: normalizeOptionalIdList(executionContext.sourceIds),
      combinationId: normalizeOptionalId(executionContext.combinationId),
      combinationName: String(executionContext.combinationName || ''),
      datasourceId: executionContext.datasourceId,
      modelId: executionContext.modelId,
      datasourcePending: executionContext.datasourcePending,
      selectionTitle:
        normalizedTitle ||
        executionContext.combinationName ||
        executionContext.sourceId ||
        executionContext.datasourceId ||
        '历史问数恢复',
      selectionMeta:
        normalizedMeta ||
        (executionContext.datasourceId ? `数据源：${executionContext.datasourceId}` : '')
    }
  }

  const buildHistoryEntryTitle = ({
    selectionTitle,
    sourceTitle,
    brief,
    lastQuestion,
    sessionId
  }: {
    selectionTitle?: string
    sourceTitle?: string
    brief?: string
    lastQuestion?: string
    sessionId: string
  }) => {
    return String(selectionTitle || sourceTitle || brief || lastQuestion || `历史问数 ${sessionId}`)
  }

  const buildHistoryEntryMeta = ({
    selectionMeta,
    sourceMeta,
    missingRequiredContext
  }: {
    selectionMeta?: string
    sourceMeta?: string
    missingRequiredContext: boolean
  }) => {
    const normalizedSelectionMeta = String(selectionMeta || '')
    if (missingRequiredContext) {
      return normalizedSelectionMeta || HISTORY_INCOMPLETE_META
    }
    return (
      sourceMeta ||
      (normalizedSelectionMeta === HISTORY_INCOMPLETE_META ? '' : normalizedSelectionMeta)
    )
  }

  const createContextSwitchRecord = (
    executionContext: SqlbotNewExecutionContext,
    selectionTitle: string,
    selectionMeta: string,
    options: {
      createTime?: string | number
      localId?: string
    } = {}
  ): SqlbotNewConversationRecord => ({
    kind: 'context-switch',
    localId:
      options.localId ||
      `switch-${normalizeRecordTimestamp(options.createTime)}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
    question: '',
    sqlAnswer: '',
    chartAnswer: '',
    error: '',
    createTime: normalizeRecordTimestamp(options.createTime),
    finish: true,
    recommendQuestions: [],
    pendingChartHydration: false,
    executionContext: { ...executionContext },
    contextSwitch: {
      sourceKind: executionContext.queryMode,
      sourceId: executionContext.sourceId,
      sourceIds: normalizeOptionalIdList(executionContext.sourceIds),
      combinationId: normalizeOptionalId(executionContext.combinationId),
      combinationName: String(executionContext.combinationName || ''),
      datasourceId: executionContext.datasourceId,
      sourceTitle: selectionTitle,
      sourceMeta: selectionMeta
    }
  })

  const normalizePersistedRecommendQuestions = (payload: Record<string, any>) => {
    const rawQuestions = payload.recommendQuestions || payload.recommend_questions
    return Array.isArray(rawQuestions)
      ? rawQuestions.map((item: unknown) => String(item)).filter(Boolean)
      : []
  }

  const createPersistedAssistantReplyRecord = (
    event: SQLBotNewPersistedContextEvent,
    fallbackExecutionContext: SqlbotNewExecutionContext
  ) => {
    const eventPayload =
      event.eventPayload && typeof event.eventPayload === 'object' ? event.eventPayload : {}
    const answer = pickFirstNonEmptyString(
      eventPayload.answer,
      eventPayload.chartAnswer,
      eventPayload.chart_answer
    )
    if (!answer) {
      return null
    }

    const executionContext = repairRestoredExecutionContext({
      ...fallbackExecutionContext,
      ...extractPersistedExecutionMetadata(eventPayload),
      themeId: normalizeOptionalId(event.themeId || fallbackExecutionContext.themeId),
      themeName: pickFirstNonEmptyString(event.themeName, fallbackExecutionContext.themeName),
      queryMode: event.sourceKind || fallbackExecutionContext.queryMode,
      sourceId: normalizeOptionalId(
        event.sourceId ||
          (event.sourceKind === 'file' ? event.datasourceId : fallbackExecutionContext.sourceId)
      ),
      datasourceId: normalizeOptionalId(
        event.datasourceId || fallbackExecutionContext.datasourceId
      ),
      modelId: normalizeOptionalId(event.modelId || fallbackExecutionContext.modelId),
      datasourcePending: event.datasourcePending ?? fallbackExecutionContext.datasourcePending
    })

    return createAssistantReplyRecord({
      question: pickFirstNonEmptyString(eventPayload.question, '助手回复'),
      answer,
      executionContext,
      recommendQuestions: normalizePersistedRecommendQuestions(eventPayload),
      createTime: event.createTime,
      localId: `assistant-reply-${event.id}`,
      assistantEventPersisted: true
    })
  }

  const findSourceRecordForDerivedEvent = (
    records: SqlbotNewConversationRecord[],
    event: SQLBotNewPersistedContextEvent,
    payload: Record<string, any>
  ) => {
    const sourceRecordId = normalizeNumericValue(
      payload.sourceRecordId,
      payload.source_record_id,
      event.recordId
    )
    const sourceLocalId = String(payload.sourceLocalId || payload.source_local_id || '').trim()
    return (
      records.find(record => sourceRecordId && record.id === sourceRecordId) ||
      records.find(record => sourceLocalId && record.localId === sourceLocalId) ||
      records.find(record => isFactAnswerRecord(record)) ||
      null
    )
  }

  const createPersistedDerivedMessageRecord = (
    event: SQLBotNewPersistedContextEvent,
    fallbackExecutionContext: SqlbotNewExecutionContext,
    sourceRecords: SqlbotNewConversationRecord[]
  ) => {
    const eventPayload =
      event.eventPayload && typeof event.eventPayload === 'object' ? event.eventPayload : {}
    const action =
      eventPayload.derivedAction === 'analysis' || eventPayload.derived_action === 'analysis'
        ? 'analysis'
        : eventPayload.derivedAction === 'predict' || eventPayload.derived_action === 'predict'
        ? 'predict'
        : undefined
    if (!action) {
      return null
    }

    const sourceRecord = findSourceRecordForDerivedEvent(sourceRecords, event, eventPayload)
    if (!sourceRecord) {
      return null
    }

    const question = pickFirstNonEmptyString(
      eventPayload.derivedQuestion,
      eventPayload.derived_question,
      eventPayload.question,
      buildDerivedQuestionText(action, sourceRecord)
    )
    const localId = pickFirstNonEmptyString(
      eventPayload.localId,
      eventPayload.local_id,
      `${event.eventType}-${event.id}`
    )
    const executionContext = repairRestoredExecutionContext({
      ...fallbackExecutionContext,
      ...extractPersistedExecutionMetadata(eventPayload),
      themeId: normalizeOptionalId(event.themeId || fallbackExecutionContext.themeId),
      themeName: pickFirstNonEmptyString(event.themeName, fallbackExecutionContext.themeName),
      queryMode: event.sourceKind || fallbackExecutionContext.queryMode,
      sourceId: normalizeOptionalId(
        event.sourceId ||
          (event.sourceKind === 'file' ? event.datasourceId : fallbackExecutionContext.sourceId)
      ),
      datasourceId: normalizeOptionalId(
        event.datasourceId || fallbackExecutionContext.datasourceId
      ),
      modelId: normalizeOptionalId(event.modelId || fallbackExecutionContext.modelId),
      datasourcePending: event.datasourcePending ?? fallbackExecutionContext.datasourcePending
    })

    const record =
      event.eventType === 'derived_question'
        ? createDerivedQuestionMessage({
            action,
            sourceRecord,
            question,
            createTime: event.createTime,
            localId,
            assistantEventPersisted: true
          })
        : createDerivedAnswerMessage({
            action,
            sourceRecord,
            question,
            createTime: event.createTime,
            localId,
            assistantEventPersisted: true
          })
    record.executionContext = executionContext
    record.sourceRecordId = normalizeNumericValue(
      eventPayload.sourceRecordId,
      eventPayload.source_record_id,
      event.recordId,
      sourceRecord.id
    )
    record.sourceLocalId = pickFirstNonEmptyString(
      eventPayload.sourceLocalId,
      eventPayload.source_local_id,
      sourceRecord.localId
    )

    if (event.eventType === 'derived_answer') {
      record.analysis = String(eventPayload.analysis || '')
      record.analysisThinking = String(
        eventPayload.analysisThinking || eventPayload.analysis_thinking || ''
      )
      record.analysisLoading = Boolean(
        eventPayload.analysisLoading ?? eventPayload.analysis_loading ?? false
      )
      record.analysisError = String(eventPayload.analysisError || eventPayload.analysis_error || '')
      record.analysisRecordId = normalizeNumericValue(
        eventPayload.analysisRecordId,
        eventPayload.analysis_record_id
      )
      record.analysisDuration = normalizeNumericValue(
        eventPayload.analysisDuration,
        eventPayload.analysis_duration
      )
      record.analysisTotalTokens = normalizeNumericValue(
        eventPayload.analysisTotalTokens,
        eventPayload.analysis_total_tokens
      )
      record.predict = String(eventPayload.predict || '')
      record.predictThinking = String(
        eventPayload.predictThinking || eventPayload.predict_thinking || ''
      )
      record.predictLoading = Boolean(
        eventPayload.predictLoading ?? eventPayload.predict_loading ?? false
      )
      record.predictError = String(eventPayload.predictError || eventPayload.predict_error || '')
      record.predictRecordId = normalizeNumericValue(
        eventPayload.predictRecordId,
        eventPayload.predict_record_id
      )
      record.predictDuration = normalizeNumericValue(
        eventPayload.predictDuration,
        eventPayload.predict_duration
      )
      record.predictTotalTokens = normalizeNumericValue(
        eventPayload.predictTotalTokens,
        eventPayload.predict_total_tokens
      )
      record.finish =
        eventPayload.finish !== false && !record.analysisLoading && !record.predictLoading
    }

    return record
  }

  const getExistingDerivedActionKeys = (records: SqlbotNewConversationRecord[]) => {
    const keys = new Set<string>()
    records.forEach(record => {
      if (!isDerivedAnswerRecord(record) || !record.derivedAction) {
        return
      }
      const sourceRecord =
        records.find(item => record.sourceRecordId && item.id === record.sourceRecordId) ||
        records.find(item => record.sourceLocalId && item.localId === record.sourceLocalId)
      if (sourceRecord) {
        keys.add(getDerivedActionKey(sourceRecord, record.derivedAction))
      }
    })
    return keys
  }

  const hasUnfinishedDerivedAnswer = (
    sourceRecord: SqlbotNewConversationRecord,
    action: SqlbotNewDerivedAction
  ) => {
    return conversationRecords.value.some(record => {
      return (
        isDerivedAnswerRecord(record) &&
        record.derivedAction === action &&
        (record.sourceRecordId === sourceRecord.id ||
          record.sourceLocalId === sourceRecord.localId) &&
        (!record.finish || record.analysisLoading || record.predictLoading)
      )
    })
  }

  const createLegacyInsightDerivedMessagesForRestore = (records: SqlbotNewConversationRecord[]) => {
    const coveredActions = getExistingDerivedActionKeys(records)
    return records.flatMap(record => {
      if (!isFactAnswerRecord(record)) {
        return [record]
      }
      const derivedMessages = createLegacyInsightDerivedMessages(record, coveredActions)
      derivedMessages.forEach(derivedRecord => {
        if (isDerivedAnswerRecord(derivedRecord) && derivedRecord.derivedAction) {
          coveredActions.add(getDerivedActionKey(record, derivedRecord.derivedAction))
        }
      })
      return [record, ...derivedMessages]
    })
  }

  const appendContextSwitchRecord = async (
    executionContext: SqlbotNewExecutionContext,
    selectionTitle: string,
    selectionMeta: string
  ) => {
    if (!conversationSession.value?.records.length) {
      return
    }

    const normalizedExecutionContext = repairRestoredExecutionContext(executionContext)
    activeExecutionContextRef.value = {
      ...normalizedExecutionContext
    }

    // A scope switch should keep the current frontend conversation visible,
    // but the next SQLBot question must start a fresh backend chat to avoid
    // contaminating SQL generation with prior table context.
    if (conversationSession.value) {
      conversationSession.value.id = undefined
      conversationSession.value.datasource = undefined
      conversationSession.value.brief = ''
      conversationSession.value.localSessionId = createLocalSessionId()
    }

    if (conversationSession.value?.id) {
      restoredHistoryContext.value = createHistoryContext(
        normalizedExecutionContext,
        String(conversationSession.value.id),
        selectionTitle,
        selectionMeta
      )
    }

    const lastRecord =
      conversationSession.value.records[conversationSession.value.records.length - 1]
    if (
      lastRecord.kind === 'context-switch' &&
      lastRecord.contextSwitch?.sourceKind === normalizedExecutionContext.queryMode &&
      lastRecord.contextSwitch?.sourceId === normalizedExecutionContext.sourceId &&
      hasSameOptionalIdList(
        lastRecord.contextSwitch?.sourceIds,
        normalizedExecutionContext.sourceIds
      ) &&
      normalizeOptionalId(lastRecord.contextSwitch?.combinationId) ===
        normalizeOptionalId(normalizedExecutionContext.combinationId) &&
      lastRecord.contextSwitch?.datasourceId === normalizedExecutionContext.datasourceId &&
      lastRecord.executionContext?.themeId === normalizedExecutionContext.themeId &&
      lastRecord.executionContext?.modelId === normalizedExecutionContext.modelId
    ) {
      lastRecord.executionContext = {
        ...normalizedExecutionContext
      }
      lastRecord.contextSwitch = {
        sourceKind: normalizedExecutionContext.queryMode,
        sourceId: normalizedExecutionContext.sourceId,
        sourceIds: normalizeOptionalIdList(normalizedExecutionContext.sourceIds),
        combinationId: normalizeOptionalId(normalizedExecutionContext.combinationId),
        combinationName: String(normalizedExecutionContext.combinationName || ''),
        datasourceId: normalizedExecutionContext.datasourceId,
        sourceTitle: selectionTitle,
        sourceMeta: selectionMeta
      }
      persistConversationSnapshot(normalizedExecutionContext, {
        selectionTitle,
        selectionMeta
      })
      return
    }

    conversationSession.value.records.push(
      createContextSwitchRecord(normalizedExecutionContext, selectionTitle, selectionMeta)
    )
    persistConversationSnapshot(normalizedExecutionContext, {
      selectionTitle,
      selectionMeta
    })
    await persistBackendContextSwitch(normalizedExecutionContext, selectionTitle, selectionMeta)
  }

  const appendAssistantReply = ({
    executionContext,
    question,
    answer,
    selectionTitle,
    selectionMeta,
    recommendQuestions = []
  }: AppendAssistantReplyOptions) => {
    const normalizedQuestion = String(question || '').trim()
    const normalizedAnswer = String(answer || '').trim()
    if (!normalizedQuestion || !normalizedAnswer) {
      return null
    }

    const normalizedExecutionContext = repairRestoredExecutionContext(executionContext)
    activeExecutionContextRef.value = {
      ...normalizedExecutionContext
    }
    pageMode.value = 'result'
    lastEntryPayload.value = {
      reason: 'submit',
      question: normalizedQuestion,
      themeId: normalizedExecutionContext.themeId || undefined,
      themeName: normalizedExecutionContext.themeName || undefined,
      sourceKind: normalizedExecutionContext.queryMode,
      sourceId: normalizedExecutionContext.sourceId || undefined,
      sourceIds: normalizedExecutionContext.sourceIds || [],
      combinationId: normalizedExecutionContext.combinationId || undefined,
      combinationName: normalizedExecutionContext.combinationName || undefined,
      datasourceId: normalizedExecutionContext.datasourceId || undefined,
      modelId: normalizedExecutionContext.modelId || undefined,
      datasourcePending: normalizedExecutionContext.datasourcePending,
      selectionTitle,
      selectionMeta
    }

    const session = ensureConversationContainer(normalizedExecutionContext)
    const record = createAssistantReplyRecord({
      question: normalizedQuestion,
      answer: normalizedAnswer,
      executionContext: normalizedExecutionContext,
      recommendQuestions
    })
    session.records.push(record)
    void persistAssistantReplyWithSession(record, normalizedExecutionContext, {
      selectionTitle,
      selectionMeta
    })

    const sessionId = String(
      conversationSession.value?.id ||
        conversationSession.value?.localSessionId ||
        restoredHistoryContext.value?.sessionId ||
        ''
    )
    restoredHistoryContext.value = createHistoryContext(
      normalizedExecutionContext,
      sessionId,
      selectionTitle,
      selectionMeta
    )
    persistConversationSnapshot(normalizedExecutionContext, {
      selectionTitle,
      selectionMeta
    })
    draftQuestion.value = ''
    return record
  }

  const resolvePersistedSelectionState = (
    overrides: Partial<Pick<SqlbotNewRestoredContext, 'selectionTitle' | 'selectionMeta'>> = {}
  ) => {
    return {
      selectionTitle: String(
        overrides.selectionTitle ?? restoredHistoryContext.value?.selectionTitle ?? ''
      ),
      selectionMeta: String(
        overrides.selectionMeta ?? restoredHistoryContext.value?.selectionMeta ?? ''
      )
    }
  }

  const buildHistoryWriteRequestContext = async (executionContext: SqlbotNewExecutionContext) => {
    const assistantToken = await ensureAssistantToken(executionContext)
    return buildHistoryRequestContext(assistantToken)
  }

  const persistBackendContextSwitch = async (
    executionContext: SqlbotNewExecutionContext,
    selectionTitle: string,
    selectionMeta: string
  ) => {
    const chatId = conversationSession.value?.id
    if (!chatId) {
      return
    }

    try {
      const requestContext = await buildHistoryWriteRequestContext(executionContext)
      await createSQLBotNewContextSwitch(requestContext, chatId, {
        eventType: 'context_switch',
        sourceKind: executionContext.queryMode,
        sourceId: executionContext.sourceId,
        sourceIds: normalizeOptionalIdList(executionContext.sourceIds),
        combinationId: normalizeOptionalId(executionContext.combinationId),
        combinationName: String(executionContext.combinationName || ''),
        datasourceId: executionContext.datasourceId,
        modelId: executionContext.modelId,
        themeId: executionContext.themeId || '',
        themeName: executionContext.themeName || '',
        selectionTitle,
        selectionMeta,
        datasourcePending: executionContext.datasourcePending,
        eventPayload: buildPersistedExecutionEventPayload(executionContext)
      })
    } catch (error) {
      console.error('persist sqlbot-new context switch failed', error)
    }
  }

  const persistBackendConversationSnapshot = async (
    executionContext: SqlbotNewExecutionContext,
    overrides: Partial<Pick<SqlbotNewRestoredContext, 'selectionTitle' | 'selectionMeta'>> & {
      latestRecordId?: number
      latestQuestion?: string
    } = {}
  ) => {
    const chatId = conversationSession.value?.id
    if (!chatId) {
      return
    }

    try {
      const requestContext = await buildHistoryWriteRequestContext(executionContext)
      const { selectionTitle, selectionMeta } = resolvePersistedSelectionState(overrides)
      await upsertSQLBotNewSnapshot(requestContext, chatId, {
        activeSourceKind: executionContext.queryMode,
        activeSourceId: executionContext.sourceId,
        activeSourceIds: normalizeOptionalIdList(executionContext.sourceIds),
        activeCombinationId: normalizeOptionalId(executionContext.combinationId),
        activeCombinationName: String(executionContext.combinationName || ''),
        activeDatasourceId: executionContext.datasourceId,
        activeModelId: executionContext.modelId,
        activeThemeId: executionContext.themeId || '',
        activeThemeName: executionContext.themeName || '',
        selectionTitle,
        selectionMeta,
        datasourcePending: executionContext.datasourcePending,
        latestRecordId: overrides.latestRecordId,
        latestQuestion: String(overrides.latestQuestion || '')
      })
    } catch (error) {
      console.error('persist sqlbot-new snapshot failed', error)
    }
  }

  const persistBackendAssistantReply = async (
    record: SqlbotNewConversationRecord,
    executionContext: SqlbotNewExecutionContext,
    overrides: Partial<Pick<SqlbotNewRestoredContext, 'selectionTitle' | 'selectionMeta'>> = {}
  ) => {
    const chatId = conversationSession.value?.id
    if (!chatId || record.assistantEventPersisted) {
      return
    }

    try {
      const requestContext = await buildHistoryWriteRequestContext(executionContext)
      const { selectionTitle, selectionMeta } = resolvePersistedSelectionState(overrides)
      await createSQLBotNewContextSwitch(requestContext, chatId, {
        eventType: 'assistant_reply',
        sourceKind: executionContext.queryMode,
        sourceId: executionContext.sourceId,
        sourceIds: normalizeOptionalIdList(executionContext.sourceIds),
        combinationId: normalizeOptionalId(executionContext.combinationId),
        combinationName: String(executionContext.combinationName || ''),
        datasourceId: executionContext.datasourceId,
        modelId: executionContext.modelId,
        themeId: executionContext.themeId || '',
        themeName: executionContext.themeName || '',
        selectionTitle,
        selectionMeta,
        datasourcePending: executionContext.datasourcePending,
        eventPayload: {
          ...(buildPersistedExecutionEventPayload(executionContext) || {}),
          question: record.question,
          answer: record.chartAnswer,
          recommend_questions: record.recommendQuestions,
          local_id: record.localId
        }
      })
      record.assistantEventPersisted = true
      await persistBackendConversationSnapshot(executionContext, {
        selectionTitle,
        selectionMeta,
        latestQuestion: record.question
      })
    } catch (error) {
      console.error('persist sqlbot-new assistant reply failed', error)
    }
  }

  const buildDerivedEventPayload = (record: SqlbotNewConversationRecord) => ({
    ...(record.executionContext
      ? buildPersistedExecutionEventPayload(record.executionContext) || {}
      : {}),
    local_id: record.localId,
    source_record_id: record.sourceRecordId,
    source_local_id: record.sourceLocalId,
    derived_action: record.derivedAction,
    derived_question: record.derivedQuestion || record.question,
    question: record.question,
    analysis: record.analysis,
    analysis_thinking: record.analysisThinking,
    analysis_loading: record.analysisLoading,
    analysis_error: record.analysisError,
    analysis_record_id: record.analysisRecordId,
    analysis_duration: record.analysisDuration,
    analysis_total_tokens: record.analysisTotalTokens,
    predict: record.predict,
    predict_thinking: record.predictThinking,
    predict_loading: record.predictLoading,
    predict_error: record.predictError,
    predict_record_id: record.predictRecordId,
    predict_duration: record.predictDuration,
    predict_total_tokens: record.predictTotalTokens,
    finish: record.finish,
    create_time: record.createTime
  })

  const persistBackendDerivedMessage = async (
    record: SqlbotNewConversationRecord,
    eventType: 'derived_question' | 'derived_answer',
    executionContext: SqlbotNewExecutionContext,
    overrides: Partial<Pick<SqlbotNewRestoredContext, 'selectionTitle' | 'selectionMeta'>> = {}
  ) => {
    const chatId = conversationSession.value?.id
    if (!chatId) {
      return
    }

    try {
      const requestContext = await buildHistoryWriteRequestContext(executionContext)
      const { selectionTitle, selectionMeta } = resolvePersistedSelectionState(overrides)
      await createSQLBotNewContextSwitch(requestContext, chatId, {
        eventType,
        recordId: record.sourceRecordId,
        sourceKind: executionContext.queryMode,
        sourceId: executionContext.sourceId,
        sourceIds: normalizeOptionalIdList(executionContext.sourceIds),
        combinationId: normalizeOptionalId(executionContext.combinationId),
        combinationName: String(executionContext.combinationName || ''),
        datasourceId: executionContext.datasourceId,
        modelId: executionContext.modelId,
        themeId: executionContext.themeId || '',
        themeName: executionContext.themeName || '',
        selectionTitle,
        selectionMeta,
        datasourcePending: executionContext.datasourcePending,
        eventPayload: buildDerivedEventPayload(record)
      })
      record.assistantEventPersisted = true
    } catch (error) {
      console.error(`persist sqlbot-new ${eventType} failed`, error)
    }
  }

  const persistBackendDerivedQuestionMessage = async (
    record: SqlbotNewConversationRecord,
    executionContext: SqlbotNewExecutionContext
  ) => {
    const eventType = 'derived_question'
    await persistBackendDerivedMessage(record, eventType, executionContext)
    return { eventType: 'derived_question' as const }
  }

  const persistBackendDerivedAnswerMessage = async (
    record: SqlbotNewConversationRecord,
    executionContext: SqlbotNewExecutionContext
  ) => {
    const eventType = 'derived_answer'
    await persistBackendDerivedMessage(record, eventType, executionContext)
    return { eventType: 'derived_answer' as const }
  }

  const persistAssistantReplyWithSession = async (
    record: SqlbotNewConversationRecord,
    executionContext: SqlbotNewExecutionContext,
    overrides: Partial<Pick<SqlbotNewRestoredContext, 'selectionTitle' | 'selectionMeta'>> = {}
  ) => {
    try {
      await loadEmbedConfig()
      if (!embedAvailable.value) {
        return
      }
      const chatSession = await ensureChatSession(executionContext)
      record.chatId = chatSession.id
      persistConversationSnapshot(executionContext, overrides)
      await persistBackendAssistantReply(record, executionContext, overrides)
    } catch (error) {
      console.error('persist sqlbot-new assistant reply session failed', error)
    }
  }

  const persistPendingAssistantReplies = async (
    executionContext: SqlbotNewExecutionContext,
    overrides: Partial<Pick<SqlbotNewRestoredContext, 'selectionTitle' | 'selectionMeta'>> = {}
  ) => {
    const pendingRecords =
      conversationSession.value?.records.filter(
        record =>
          record.finish &&
          !record.id &&
          record.chartAnswer &&
          !record.error &&
          !record.assistantEventPersisted
      ) || []

    for (const pendingRecord of pendingRecords) {
      await persistBackendAssistantReply(
        pendingRecord,
        pendingRecord.executionContext || executionContext,
        overrides
      )
    }
  }

  const persistConversationSnapshot = (
    executionContext?: SqlbotNewExecutionContext,
    overrides: Partial<Pick<SqlbotNewRestoredContext, 'selectionTitle' | 'selectionMeta'>> = {}
  ) => {
    const sessionId = String(
      conversationSession.value?.id ||
        conversationSession.value?.localSessionId ||
        restoredHistoryContext.value?.sessionId ||
        ''
    )
    if (!sessionId || !conversationSession.value) {
      return
    }

    const baseExecutionContext =
      activeExecutionContextRef.value || executionContext || activeExecutionContext.value
    const nextHistoryContext = baseExecutionContext
      ? createHistoryContext(
          baseExecutionContext,
          sessionId,
          overrides.selectionTitle,
          overrides.selectionMeta
        )
      : restoredHistoryContext.value

    if (nextHistoryContext) {
      restoredHistoryContext.value = nextHistoryContext
    }

    if (!isLocalSessionId(sessionId)) {
      writeActiveSessionId(sessionId)
    }
    if (
      nextHistoryContext?.sourceKind === 'dataset' &&
      nextHistoryContext.datasourceId &&
      nextHistoryContext.sourceId
    ) {
      datasourceDatasetIdCache.value = {
        ...datasourceDatasetIdCache.value,
        [nextHistoryContext.datasourceId]: nextHistoryContext.sourceId
      }
      persistDatasourceDatasetCache()
    }
  }

  const ensureConversationContainer = (executionContext: SqlbotNewExecutionContext) => {
    const nextScopeKey = getScopeKey(executionContext)
    currentScopeKey.value = nextScopeKey

    if (!conversationSession.value) {
      conversationSession.value = {
        localSessionId: createLocalSessionId(),
        brief: '',
        datasource: undefined,
        records: []
      }
    }

    if (!conversationSession.value.id && !conversationSession.value.localSessionId) {
      conversationSession.value.localSessionId = createLocalSessionId()
    }

    return conversationSession.value
  }

  const clearPendingClarificationRecords = (reasonCode?: string, question?: string) => {
    if (!conversationSession.value?.records?.length) {
      return
    }

    const normalizedQuestion = String(question || '').trim()
    conversationSession.value.records = conversationSession.value.records.filter(record => {
      if (!record.clarification?.pending) {
        return true
      }
      if (reasonCode && record.clarification.reasonCode !== reasonCode) {
        return true
      }
      if (normalizedQuestion && String(record.question || '').trim() !== normalizedQuestion) {
        return true
      }
      return false
    })
  }

  const appendLocalClarificationRecord = ({
    executionContext,
    question,
    clarification,
    selectionTitle,
    selectionMeta
  }: {
    executionContext: SqlbotNewExecutionContext
    question: string
    clarification: SqlbotNewClarificationState
    selectionTitle?: string
    selectionMeta?: string
  }) => {
    const normalizedQuestion = String(question || '').trim()
    activeExecutionContextRef.value = {
      ...executionContext
    }
    pageMode.value = 'result'
    lastEntryPayload.value = {
      reason: 'submit',
      question: normalizedQuestion,
      themeId: executionContext.themeId || undefined,
      themeName: executionContext.themeName || undefined,
      sourceKind: executionContext.queryMode,
      sourceId: executionContext.sourceId || undefined,
      sourceIds: executionContext.sourceIds || [],
      combinationId: executionContext.combinationId || undefined,
      combinationName: executionContext.combinationName || undefined,
      datasourceId: executionContext.datasourceId || undefined,
      modelId: executionContext.modelId || undefined,
      datasourcePending: executionContext.datasourcePending,
      selectionTitle,
      selectionMeta
    }
    const hasConcreteSelection =
      Boolean(executionContext.sourceId || executionContext.datasourceId) ||
      Boolean(executionContext.sourceIds?.length) ||
      Boolean(selectionTitle || selectionMeta)
    restoredHistoryContext.value = hasConcreteSelection
      ? createHistoryContext(
          executionContext,
          String(conversationSession.value?.id || restoredHistoryContext.value?.sessionId || ''),
          selectionTitle,
          selectionMeta
        )
      : null

    const session = ensureConversationContainer(executionContext)
    clearPendingClarificationRecords(clarification.reasonCode, normalizedQuestion)
    const record = createLocalRecord(normalizedQuestion)
    record.executionContext = { ...executionContext }
    record.clarification = {
      ...clarification,
      pending: clarification.pending !== false
    }
    record.finish = true
    session.records.push(record)
    draftQuestion.value = ''
    return record
  }

  const ensureChatSession = async (executionContext: SqlbotNewExecutionContext) => {
    const session = ensureConversationContainer(executionContext)
    if (session.id) {
      return session
    }

    const assistantToken = await ensureAssistantToken(executionContext)
    const context = buildRequestContext(executionContext, assistantToken)
    const response = await startSQLBotAssistantChat(context, {
      origin: 2,
      skip_first_chat_record: true,
      datasource: executionContext.datasourceId || undefined
    })

    session.id = Number(response?.id) || undefined
    session.brief = String(response?.brief || '')
    session.datasource = response?.datasource ? Number(response.datasource) : undefined
    return session
  }

  const resetBackendChatSession = () => {
    if (!conversationSession.value) {
      return
    }
    conversationSession.value.id = undefined
    conversationSession.value.datasource = undefined
    conversationSession.value.brief = ''
    conversationSession.value.localSessionId = createLocalSessionId()
  }

  const hydrateSQLBotUsage = async (
    record: SqlbotNewConversationRecord,
    executionContext: SqlbotNewExecutionContext
  ) => {
    if (!record.id) {
      return
    }

    try {
      const assistantToken = await ensureAssistantToken(executionContext)
      const usage = await getSQLBotRecordUsage(
        buildRequestContext(executionContext, assistantToken),
        record.id
      )
      if (!conversationSession.value?.records.some(item => item.localId === record.localId)) {
        return
      }
      record.finishTime = usage?.finish_time
      record.duration = usage?.duration
      record.totalTokens = usage?.total_tokens
    } catch (error) {
      console.error('load sqlbot-new usage failed', error)
    }
  }

  const hydrateSQLBotAnalysisUsage = async (
    record: SqlbotNewConversationRecord,
    executionContext: SqlbotNewExecutionContext
  ) => {
    if (!record.analysisRecordId) {
      return
    }

    try {
      const assistantToken = await ensureAssistantToken(executionContext)
      const usage = await getSQLBotRecordUsage(
        buildRequestContext(executionContext, assistantToken),
        record.analysisRecordId
      )
      if (!conversationSession.value?.records.some(item => item.localId === record.localId)) {
        return
      }
      record.analysisDuration = usage?.duration
      record.analysisTotalTokens = usage?.total_tokens
    } catch (error) {
      console.error('load sqlbot-new analysis usage failed', error)
    }
  }

  const hydrateSQLBotPredictUsage = async (
    record: SqlbotNewConversationRecord,
    executionContext: SqlbotNewExecutionContext
  ) => {
    if (!record.predictRecordId) {
      return
    }

    try {
      const assistantToken = await ensureAssistantToken(executionContext)
      const usage = await getSQLBotRecordUsage(
        buildRequestContext(executionContext, assistantToken),
        record.predictRecordId
      )
      if (!conversationSession.value?.records.some(item => item.localId === record.localId)) {
        return
      }
      record.predictDuration = usage?.duration
      record.predictTotalTokens = usage?.total_tokens
    } catch (error) {
      console.error('load sqlbot-new predict usage failed', error)
    }
  }

  const hydrateSQLBotChartData = async (
    record: SqlbotNewConversationRecord,
    executionContext: SqlbotNewExecutionContext
  ) => {
    if (!record.id) {
      record.pendingChartHydration = true
      return
    }

    try {
      const assistantToken = await ensureAssistantToken(executionContext)
      record.data = await getSQLBotChartData(
        buildRequestContext(executionContext, assistantToken),
        record.id
      )
      if (!conversationSession.value?.records.some(item => item.localId === record.localId)) {
        return
      }
      record.pendingChartHydration = false
    } catch (error) {
      console.error('load sqlbot-new chart data failed', error)
    }
  }

  const loadSQLBotRecommendQuestions = async (
    record: SqlbotNewConversationRecord,
    executionContext: SqlbotNewExecutionContext
  ) => {
    const latestRecord = conversationRecords.value[conversationRecords.value.length - 1]
    if (!record.id || record.error || latestRecord?.localId !== record.localId) {
      return
    }

    try {
      const assistantToken = await ensureAssistantToken(executionContext)
      const recommendQuestions = await getSQLBotRecommendQuestions(
        buildRequestContext(executionContext, assistantToken),
        record.id
      )
      if (!conversationSession.value?.records.some(item => item.localId === record.localId)) {
        return
      }
      record.recommendQuestions = recommendQuestions
    } catch (error) {
      console.error('load sqlbot-new recommend questions failed', error)
    }
  }

  const applySQLBotStreamEvent = async (
    record: SqlbotNewConversationRecord,
    event: SQLBotStreamEvent,
    executionContext: SqlbotNewExecutionContext
  ) => {
    switch (event.type) {
      case 'id':
        record.id = Number(event.id)
        record.chatId = conversationSession.value?.id
        if (record.pendingChartHydration) {
          await hydrateSQLBotChartData(record, executionContext)
        }
        break
      case 'question':
        record.question = String(event.question || record.question)
        break
      case 'datasource':
        if (event.id) {
          record.datasource = Number(event.id)
        }
        break
      case 'sql-result':
        record.sqlAnswer += String(event.reasoning_content || '')
        break
      case 'reasoning': {
        const reasoning = normalizeObjectValue(event.content, event.reasoning_content)
        if (reasoning) {
          record.reasoning = reasoning
        }
        break
      }
      case 'sql':
        record.sql = String(event.content || '')
        break
      case 'clarification':
        record.clarification = {
          reasonCode: String(
            event.content?.reason_code || event.content?.reasonCode || event.reason_code || ''
          ),
          prompt: String(event.content?.prompt || event.prompt || ''),
          options: Array.isArray(event.content?.options)
            ? event.content.options.map((item: Record<string, any>) => ({
                label: String(item?.label || ''),
                value: String(item?.value || ''),
                description: item?.description ? String(item.description) : undefined,
                chips: Array.isArray(item?.chips)
                  ? item.chips
                      .map((chip: unknown) => String(chip))
                      .filter(Boolean)
                      .slice(0, 3)
                  : undefined
              }))
            : [],
          pending: true,
          selectionMode: normalizeClarificationSelectionMode(
            event.content?.selectionMode,
            event.content?.selection_mode
          ),
          confirmLabel: event.content?.confirmLabel || event.content?.confirm_label || undefined,
          selectedValues: normalizeClarificationSelectedValues(
            event.content?.selectedValues,
            event.content?.selected_values
          )
        }
        record.finish = true
        await hydrateSQLBotUsage(record, executionContext)
        persistConversationSnapshot(executionContext)
        break
      case 'query_interpretation':
        record.interpretation = {
          metric: Array.isArray(event.content?.metric)
            ? event.content.metric.map((item: unknown) => String(item))
            : [],
          dimension: Array.isArray(event.content?.dimension)
            ? event.content.dimension.map((item: unknown) => String(item))
            : [],
          timeRange: String(event.content?.time_range || event.content?.timeRange || ''),
          filters: Array.isArray(event.content?.filters)
            ? event.content.filters.map((item: unknown) => String(item))
            : [],
          defaultedFields: Array.isArray(
            event.content?.defaulted_fields || event.content?.defaultedFields
          )
            ? (event.content?.defaulted_fields || event.content?.defaultedFields).map(
                (item: unknown) => String(item)
              )
            : []
        }
        break
      case 'execution_summary':
        record.executionSummary = {
          scopeLabel: String(event.content?.scope_label || event.content?.scopeLabel || ''),
          datasourceLabel: String(
            event.content?.datasource_label || event.content?.datasourceLabel || ''
          ),
          summary: String(event.content?.summary || ''),
          failureStage: String(event.content?.failure_stage || event.content?.failureStage || ''),
          nextAction: String(event.content?.next_action || event.content?.nextAction || '')
        }
        break
      case 'sql-data':
        await hydrateSQLBotChartData(record, executionContext)
        break
      case 'chart-result':
        record.chartAnswer += String(event.reasoning_content || '')
        break
      case 'chart':
        record.chart = String(event.content || '')
        break
      case 'error':
        record.error = normalizeSqlbotNewErrorCopy(event.content || 'SQLBot 执行失败')
        record.finish = true
        record.recommendQuestions =
          record.recommendQuestions.length > 0
            ? record.recommendQuestions
            : buildFallbackRecommendQuestions(
                executionContext,
                restoredHistoryContext.value?.selectionTitle
              )
        await hydrateSQLBotUsage(record, executionContext)
        persistConversationSnapshot(executionContext)
        await persistBackendConversationSnapshot(executionContext, {
          latestRecordId: record.id,
          latestQuestion: record.question
        })
        break
      case 'finish':
        record.finish = true
        await hydrateSQLBotUsage(record, executionContext)
        await loadSQLBotRecommendQuestions(record, executionContext)
        persistConversationSnapshot(executionContext)
        await persistBackendConversationSnapshot(executionContext, {
          latestRecordId: record.id,
          latestQuestion: record.question
        })
        break
      default:
        break
    }
  }

  const applySQLBotAnalysisEvent = async (
    record: SqlbotNewConversationRecord,
    event: SQLBotStreamEvent,
    executionContext: SqlbotNewExecutionContext
  ) => {
    switch (event.type) {
      case 'id':
        if (event.id) {
          record.analysisRecordId = Number(event.id)
        }
        break
      case 'analysis-result':
        record.analysis += String(event.content || '')
        record.analysisThinking += String(event.reasoning_content || '')
        break
      case 'error':
        record.analysisError = String(event.content || '数据解读失败')
        record.analysisLoading = false
        record.finish = true
        break
      case 'analysis_finish':
        record.analysisLoading = false
        record.finish = true
        await hydrateSQLBotAnalysisUsage(record, executionContext)
        break
      default:
        break
    }
  }

  const applySQLBotPredictEvent = async (
    record: SqlbotNewConversationRecord,
    event: SQLBotStreamEvent,
    executionContext: SqlbotNewExecutionContext
  ) => {
    switch (event.type) {
      case 'id':
        if (event.id) {
          record.predictRecordId = Number(event.id)
        }
        break
      case 'predict-result':
        record.predict += String(event.content || '')
        record.predictThinking += String(event.reasoning_content || '')
        break
      case 'predict-success':
        record.predictError = ''
        break
      case 'predict-failed':
        record.predictError = record.predict || '趋势预测失败'
        record.predictLoading = false
        record.finish = true
        break
      case 'error':
        record.predictError = String(event.content || '趋势预测失败')
        record.predictLoading = false
        record.finish = true
        break
      case 'predict_finish':
        record.predictLoading = false
        record.finish = true
        await hydrateSQLBotPredictUsage(record, executionContext)
        break
      default:
        break
    }
  }

  const resolveBlockedReason = (executionContext: SqlbotNewExecutionContext) => {
    if (activeTab.value !== 'query') {
      return '当前仅接入真实问数模式，请切换到「问数」后再提交'
    }
    if (
      !executionContext.sourceId &&
      !(executionContext.sourceIds?.length && executionContext.queryMode !== 'file') &&
      !(executionContext.queryMode === 'file' && normalizeOptionalId(executionContext.datasourceId))
    ) {
      return '请先选择数据集或数据文件'
    }
    if (executionContext.datasourcePending) {
      return '当前资源的数据源仍在准备中，暂时不能发起真实问数'
    }
    if (
      executionContext.queryMode === 'file' &&
      !normalizeOptionalId(executionContext.datasourceId)
    ) {
      return '当前文件还没有可用的数据源，请稍后重试'
    }
    return ''
  }

  const getBlockedReason = (executionContext?: SqlbotNewExecutionContext | null) => {
    if (!executionContext) {
      return '缺少 executionContext'
    }
    return resolveBlockedReason(executionContext)
  }

  const enterResultMode = (payload?: SqlbotNewResultEntryPayload) => {
    if (payload?.sourceKind) {
      const nextExecutionContext = repairRestoredExecutionContext({
        themeId: payload.themeId || '',
        themeName: payload.themeName || '',
        queryMode: payload.sourceKind,
        sourceId: payload.sourceId || '',
        sourceIds: payload.sourceIds || [],
        combinationId: payload.combinationId || '',
        combinationName: payload.combinationName || '',
        datasourceId: payload.datasourceId || '',
        modelId: payload.modelId || '',
        datasourcePending: Boolean(payload.datasourcePending)
      })
      activeExecutionContextRef.value = {
        ...nextExecutionContext
      }
      const nextScopeKey = getScopeKey(nextExecutionContext)
      currentScopeKey.value = nextScopeKey
      restoredHistoryContext.value = createHistoryContext(
        nextExecutionContext,
        restoredHistoryContext.value?.sessionId || '',
        payload.selectionTitle,
        payload.selectionMeta
      )
    }

    lastEntryPayload.value = payload || null
    pageMode.value = 'result'
  }

  const fetchHistoryEntries = async () => {
    await loadEmbedConfig()
    if (!embedAvailable.value) {
      return [] as SqlbotNewHistoryEntry[]
    }
    await ensureRuntimeModelsLoaded()

    const assistantToken = await ensureAssistantToken(
      activeExecutionContext.value || {
        queryMode: 'dataset',
        sourceId: '',
        datasourceId: '',
        modelId: '',
        datasourcePending: false
      }
    )
    try {
      const histories = await getSQLBotNewHistory(buildHistoryRequestContext(assistantToken))
      return histories
        .filter(item => pickFirstNonEmptyString(item.latestQuestion))
        .map(item => {
          const updatedAt = normalizeRecordTimestamp(item.updatedAt)
          const title =
            pickFirstNonEmptyString(item.latestQuestion, item.title, item.selectionTitle) ||
            `历史问数 ${item.chatId}`
          const selectionMeta = pickFirstNonEmptyString(item.selectionMeta, item.subtitle)
          const resourceTitle = pickFirstNonEmptyString(item.selectionTitle, item.title)
          const subtitle = [resourceTitle, selectionMeta].filter(Boolean).join(' / ') || title

          return {
            id: String(item.chatId),
            title,
            subtitle,
            time: formatHistoryTime(updatedAt),
            updatedAt,
            backendChatId: item.chatId,
            themeId: '',
            themeName: '',
            queryMode: item.queryMode,
            sourceId: item.sourceId,
            sourceIds: item.sourceIds || [],
            combinationId: item.combinationId,
            combinationName: item.combinationName,
            datasourceId: item.datasourceId,
            modelId: item.modelId,
            datasourcePending: item.datasourcePending,
            selectionTitle: pickFirstNonEmptyString(item.selectionTitle, title),
            selectionMeta,
            lastQuestion: pickFirstNonEmptyString(item.latestQuestion)
          } as SqlbotNewHistoryEntry
        })
        .sort((left, right) => right.updatedAt - left.updatedAt)
    } catch (error) {
      console.error('load sqlbot-new history failed', error)
      return [] as SqlbotNewHistoryEntry[]
    }
  }

  const restoreHistorySession = async (entry: SqlbotNewHistoryEntry) => {
    sqlbotAbortController.value?.abort()
    sqlbotAbortController.value = null
    abortAllAnalysisRequests()
    conversationLoading.value = true
    try {
      await ensureRuntimeModelsLoaded()
      const targetChatId = entry.backendChatId || Number(entry.id)
      const isCurrentLocalSession =
        isLocalSessionId(entry.id) &&
        conversationSession.value?.localSessionId === entry.id &&
        Boolean(conversationSession.value?.records.length)

      if (isCurrentLocalSession && conversationSession.value) {
        const resolvedExecutionContext = repairRestoredExecutionContext({
          themeId: entry.themeId,
          themeName: entry.themeName,
          queryMode: entry.queryMode,
          sourceId: entry.sourceId,
          sourceIds: entry.sourceIds,
          combinationId: entry.combinationId,
          combinationName: entry.combinationName,
          datasourceId: entry.datasourceId,
          modelId: entry.modelId,
          datasourcePending: entry.datasourcePending
        })

        activeExecutionContextRef.value = {
          ...resolvedExecutionContext
        }
        restoredHistoryContext.value = createHistoryContext(
          resolvedExecutionContext,
          entry.id,
          entry.selectionTitle,
          entry.selectionMeta
        )
        currentScopeKey.value = getScopeKey(resolvedExecutionContext)
        lastEntryPayload.value = {
          reason: 'history',
          question: entry.lastQuestion || entry.title,
          themeId: resolvedExecutionContext.themeId || undefined,
          themeName: resolvedExecutionContext.themeName || undefined,
          sourceKind: resolvedExecutionContext.queryMode,
          sourceId: resolvedExecutionContext.sourceId || undefined,
          sourceIds: resolvedExecutionContext.sourceIds || [],
          combinationId: resolvedExecutionContext.combinationId || undefined,
          combinationName: resolvedExecutionContext.combinationName || undefined,
          datasourceId: resolvedExecutionContext.datasourceId || undefined,
          modelId: resolvedExecutionContext.modelId || undefined,
          datasourcePending: resolvedExecutionContext.datasourcePending,
          selectionTitle: entry.selectionTitle,
          selectionMeta: entry.selectionMeta
        }
        pageMode.value = 'result'
        persistConversationSnapshot(resolvedExecutionContext, {
          selectionTitle: entry.selectionTitle,
          selectionMeta: entry.selectionMeta
        })
        return true
      }

      if (!targetChatId || Number.isNaN(targetChatId)) {
        conversationSession.value = null
        activeExecutionContextRef.value = null
        restoredHistoryContext.value = null
        currentScopeKey.value = ''
        return false
      }

      const fallbackExecutionContext = repairRestoredExecutionContext({
        themeId: entry.themeId,
        themeName: entry.themeName,
        queryMode: entry.queryMode,
        sourceId: entry.sourceId,
        sourceIds: entry.sourceIds,
        combinationId: entry.combinationId,
        combinationName: entry.combinationName,
        datasourceId: entry.datasourceId,
        modelId: entry.modelId,
        datasourcePending: entry.datasourcePending
      })
      const assistantToken = await ensureAssistantToken(
        activeExecutionContext.value || fallbackExecutionContext
      )
      const detailRequestContext = buildHistoryRequestContext(assistantToken)
      const [contextPayload, detail] = await Promise.all([
        getSQLBotNewHistoryContext(detailRequestContext, targetChatId),
        getSQLBotChatWithData(detailRequestContext, targetChatId)
      ])
      const latestContextEvent = findLatestPersistedContextEvent(contextPayload, event =>
        Boolean(
          event.sourceKind ||
            event.sourceId ||
            event.datasourceId ||
            event.modelId ||
            event.themeId ||
            event.themeName ||
            event.selectionTitle ||
            event.selectionMeta
        )
      )
      const resolvedExecutionContext = resolveHistoryRestoreExecutionContext({
        entry,
        snapshot: contextPayload.snapshot,
        latestContextEvent,
        fallbackDatasourceId: normalizeOptionalId(detail?.datasource || entry.datasourceId)
      })
      const normalizedDetailSession = normalizeConversationSession(detail, resolvedExecutionContext)
      const baseEventRecords = [...(contextPayload.events || [])]
        .filter(
          event => event.eventType === 'context_switch' || event.eventType === 'assistant_reply'
        )
        .sort((left, right) => {
          const timestampDiff =
            normalizeRecordTimestamp(left.createTime) - normalizeRecordTimestamp(right.createTime)
          if (timestampDiff !== 0) {
            return timestampDiff
          }
          return left.id - right.id
        })
        .map(event => {
          if (event.eventType === 'assistant_reply') {
            return createPersistedAssistantReplyRecord(event, resolvedExecutionContext)
          }

          return createContextSwitchRecord(
            repairRestoredExecutionContext({
              ...extractPersistedExecutionMetadata(event.eventPayload),
              themeId: normalizeOptionalId(event.themeId || resolvedExecutionContext.themeId),
              themeName: pickFirstNonEmptyString(
                event.themeName,
                resolvedExecutionContext.themeName
              ),
              queryMode: event.sourceKind || resolvedExecutionContext.queryMode,
              sourceId: normalizeOptionalId(
                event.sourceId ||
                  (event.sourceKind === 'file'
                    ? event.datasourceId
                    : resolvedExecutionContext.sourceId)
              ),
              datasourceId: normalizeOptionalId(
                event.datasourceId || resolvedExecutionContext.datasourceId
              ),
              modelId: normalizeOptionalId(event.modelId || resolvedExecutionContext.modelId),
              datasourcePending:
                event.datasourcePending ?? resolvedExecutionContext.datasourcePending
            }),
            pickFirstNonEmptyString(event.selectionTitle, entry.selectionTitle, entry.title),
            pickFirstNonEmptyString(event.selectionMeta, entry.selectionMeta),
            {
              createTime: event.createTime,
              localId: `context-switch-${event.id}`
            }
          )
        })
        .filter((record): record is SqlbotNewConversationRecord => Boolean(record))
      const baseRecords = mergeConversationRecordsWithSnapshot(
        normalizedDetailSession.records,
        baseEventRecords,
        resolvedExecutionContext
      )
      const latestDerivedEventMap = new Map<string, SQLBotNewPersistedContextEvent>()
      ;[...(contextPayload.events || [])].forEach(event => {
        if (event.eventType === 'derived_question' || event.eventType === 'derived_answer') {
          const payload =
            event.eventPayload && typeof event.eventPayload === 'object' ? event.eventPayload : {}
          const localId = pickFirstNonEmptyString(
            payload.localId,
            payload.local_id,
            `${event.eventType}-${event.id}`
          )
          const previous = latestDerivedEventMap.get(localId)
          if (
            !previous ||
            normalizeRecordTimestamp(previous.createTime) <
              normalizeRecordTimestamp(event.createTime) ||
            previous.id < event.id
          ) {
            latestDerivedEventMap.set(localId, event)
          }
        }
      })
      const derivedEventRecords = [...latestDerivedEventMap.values()]
        .filter(
          event => event.eventType === 'derived_question' || event.eventType === 'derived_answer'
        )
        .sort((left, right) => {
          const timestampDiff =
            normalizeRecordTimestamp(left.createTime) - normalizeRecordTimestamp(right.createTime)
          if (timestampDiff !== 0) {
            return timestampDiff
          }
          return left.id - right.id
        })
        .map(event =>
          createPersistedDerivedMessageRecord(event, resolvedExecutionContext, baseRecords)
        )
        .filter((record): record is SqlbotNewConversationRecord => Boolean(record))
      const restoredRecords = createLegacyInsightDerivedMessagesForRestore([
        ...baseRecords,
        ...derivedEventRecords
      ]).sort((left, right) => {
        const timestampDiff = left.createTime - right.createTime
        if (timestampDiff !== 0) {
          return timestampDiff
        }
        const order: Record<string, number> = {
          'context-switch': 0,
          answer: 1,
          'fact-answer': 1,
          'derived-question': 2,
          'derived-answer': 3
        }
        return (order[left.kind || 'answer'] ?? 9) - (order[right.kind || 'answer'] ?? 9)
      })
      restoredRecords.forEach(stripInlineInsightsFromFactRecord)
      const { selectionTitle, selectionMeta } = resolveHistoryRestoreSelection({
        entry,
        snapshot: contextPayload.snapshot,
        latestContextEvent,
        executionContext: resolvedExecutionContext,
        detail
      })
      const sessionId = String(normalizedDetailSession.id || targetChatId)

      activeExecutionContextRef.value = {
        ...resolvedExecutionContext
      }
      conversationSession.value = {
        ...normalizedDetailSession,
        records: restoredRecords
      }
      restoredHistoryContext.value = createHistoryContext(
        resolvedExecutionContext,
        sessionId,
        selectionTitle,
        selectionMeta
      )
      currentScopeKey.value = getScopeKey(resolvedExecutionContext)
      lastEntryPayload.value = {
        reason: 'history',
        question:
          pickFirstNonEmptyString(
            contextPayload.snapshot?.latestQuestion,
            findLatestOriginalQuestionInRecords(restoredRecords),
            entry.lastQuestion,
            entry.title
          ) || entry.title,
        themeId: resolvedExecutionContext.themeId || undefined,
        themeName: resolvedExecutionContext.themeName || undefined,
        sourceKind: resolvedExecutionContext.queryMode,
        sourceId: resolvedExecutionContext.sourceId || undefined,
        sourceIds: resolvedExecutionContext.sourceIds || [],
        combinationId: resolvedExecutionContext.combinationId || undefined,
        combinationName: resolvedExecutionContext.combinationName || undefined,
        datasourceId: resolvedExecutionContext.datasourceId || undefined,
        modelId: resolvedExecutionContext.modelId || undefined,
        datasourcePending: resolvedExecutionContext.datasourcePending,
        selectionTitle,
        selectionMeta
      }
      pageMode.value = 'result'
      persistConversationSnapshot(resolvedExecutionContext, {
        selectionTitle,
        selectionMeta
      })
      return true
    } catch (error) {
      console.error('restore sqlbot-new history session failed', error)
      conversationSession.value = null
      activeExecutionContextRef.value = null
      restoredHistoryContext.value = null
      currentScopeKey.value = ''
      return false
    } finally {
      conversationLoading.value = false
    }
  }

  const deleteHistoryEntry = async (entry: SqlbotNewHistoryEntry) => {
    await loadEmbedConfig()
    if (!embedAvailable.value) {
      throw new Error('智能问数嵌入配置不可用')
    }

    const targetChatId = entry.backendChatId || Number(entry.id)
    if (!targetChatId || Number.isNaN(targetChatId)) {
      if (restoredHistoryContext.value?.sessionId === entry.id) {
        restoredHistoryContext.value = null
        conversationSession.value = null
        conversationLoading.value = false
        currentScopeKey.value = ''
        activeExecutionContextRef.value = null
        pageMode.value = 'home'
        writeActiveSessionId('')
      }
      return true
    }

    const executionContext: SqlbotNewExecutionContext = {
      themeId: '',
      themeName: '',
      queryMode: entry.queryMode,
      sourceId: entry.sourceId,
      sourceIds: entry.sourceIds,
      combinationId: entry.combinationId,
      combinationName: entry.combinationName,
      datasourceId: entry.datasourceId,
      modelId: entry.modelId,
      datasourcePending: entry.datasourcePending
    }
    const assistantToken = await ensureAssistantToken(executionContext)
    await deleteSQLBotChat(
      buildRequestContext(executionContext, assistantToken),
      targetChatId,
      entry.title || 'chat'
    )

    if (restoredHistoryContext.value?.sessionId === entry.id) {
      restoredHistoryContext.value = null
      conversationSession.value = null
      conversationLoading.value = false
      currentScopeKey.value = ''
      activeExecutionContextRef.value = null
      pageMode.value = 'home'
      writeActiveSessionId('')
    }

    return true
  }

  const submitQuestion = async ({
    executionContext,
    question,
    reason = 'submit',
    silent = false,
    selectionTitle,
    selectionMeta
  }: SubmitQuestionOptions) => {
    const normalizedQuestion = String(question ?? draftQuestion.value).trim()

    if (!normalizedQuestion) {
      if (!silent) {
        ElMessage.warning('请输入问题后再提交')
      }
      return false
    }

    const blockedReason = resolveBlockedReason(executionContext)
    if (blockedReason) {
      appendAssistantReply({
        executionContext,
        question: normalizedQuestion,
        answer: [
          '我先接住这个问题，但现在还不能直接生成数据图表。',
          '',
          `当前卡住的原因是：${blockedReason}。`,
          '',
          '你可以先选择一个数据集继续问数；如果这是一个指标口径、业务含义或分析方法类问题，我也可以先直接解释，再帮你把问题改写成可查询的数据问题。'
        ].join('\n'),
        selectionTitle,
        selectionMeta,
        recommendQuestions: buildFallbackRecommendQuestions(executionContext, selectionTitle)
      })
      return false
    }

    if (conversationLoading.value) {
      if (!silent) {
        ElMessage.info('上一轮问数仍在进行中，请稍候')
      }
      return false
    }

    pageMode.value = 'result'
    lastEntryPayload.value = {
      reason: reason === 'recommend' ? 'submit' : reason,
      question: normalizedQuestion,
      themeId: executionContext.themeId || undefined,
      themeName: executionContext.themeName || undefined,
      sourceKind: executionContext.queryMode,
      sourceId: executionContext.sourceId || undefined,
      sourceIds: executionContext.sourceIds || [],
      combinationId: executionContext.combinationId || undefined,
      combinationName: executionContext.combinationName || undefined,
      datasourceId: executionContext.datasourceId || undefined,
      modelId: executionContext.modelId || undefined,
      datasourcePending: executionContext.datasourcePending
    }
    restoredHistoryContext.value = createHistoryContext(
      executionContext,
      String(conversationSession.value?.id || restoredHistoryContext.value?.sessionId || ''),
      selectionTitle,
      selectionMeta
    )
    activeExecutionContextRef.value = {
      ...executionContext
    }

    const session = ensureConversationContainer(executionContext)
    const latestAnswerRecord = [...session.records]
      .reverse()
      .find(item => item.kind !== 'context-switch')
    if (latestAnswerRecord?.error) {
      resetBackendChatSession()
    }
    const record = createLocalRecord(normalizedQuestion)
    record.executionContext = { ...executionContext }
    session.records.push(record)
    draftQuestion.value = ''
    conversationLoading.value = true

    const controller = new AbortController()
    sqlbotAbortController.value = controller

    try {
      const assistantToken = await ensureAssistantToken(executionContext)
      const chatSession = await ensureChatSession(executionContext)
      record.chatId = chatSession.id
      await persistPendingAssistantReplies(executionContext, {
        selectionTitle,
        selectionMeta
      })
      persistConversationSnapshot(executionContext, {
        selectionTitle,
        selectionMeta
      })

      await streamSQLBotQuestion(
        buildRequestContext(executionContext, assistantToken),
        {
          question: normalizedQuestion,
          chat_id: chatSession.id,
          datasource_id: executionContext.datasourceId || undefined,
          ai_modal_id: executionContext.modelId || undefined
        },
        {
          signal: controller.signal,
          onEvent: event => {
            void applySQLBotStreamEvent(record, event, executionContext)
          }
        }
      )
    } catch (error) {
      if (controller.signal.aborted) {
        return false
      }
      console.error('stream sqlbot-new question failed', error)
      record.error = normalizeSqlbotNewErrorCopy(
        error instanceof Error ? error.message : '智能问数执行失败'
      )
      record.finish = true
      record.recommendQuestions = buildFallbackRecommendQuestions(
        executionContext,
        selectionTitle || restoredHistoryContext.value?.selectionTitle
      )
      await hydrateSQLBotUsage(record, executionContext)
      persistConversationSnapshot(executionContext, {
        selectionTitle,
        selectionMeta
      })
      await persistBackendConversationSnapshot(executionContext, {
        selectionTitle,
        selectionMeta,
        latestRecordId: record.id,
        latestQuestion: record.question
      })
      if (!silent) {
        ElMessage.error(record.error)
      }
      return false
    } finally {
      if (sqlbotAbortController.value === controller) {
        sqlbotAbortController.value = null
      }
      conversationLoading.value = false
    }

    return true
  }

  const requestRecordAnalysis = async (
    record: SqlbotNewConversationRecord,
    executionContext?: SqlbotNewExecutionContext
  ) => {
    return requestDerivedRecordAnalysis(record, executionContext)
  }

  const requestDerivedRecordAnalysis = async (
    sourceRecord: SqlbotNewConversationRecord,
    executionContext?: SqlbotNewExecutionContext
  ) => {
    const effectiveExecutionContext = sourceRecord.executionContext || executionContext

    if (activeTab.value !== 'query') {
      ElMessage.info('当前版本暂时只支持问数解读')
      return
    }

    if (!sourceRecord.id) {
      ElMessage.warning('当前结果尚未完成，暂时不能解读')
      return
    }

    if (
      isDerivedActionPending(sourceRecord, 'analysis') ||
      hasUnfinishedDerivedAnswer(sourceRecord, 'analysis')
    ) {
      return
    }

    let requestContext: SQLBotRequestContext
    try {
      if (!effectiveExecutionContext) {
        throw new Error('当前记录缺少执行上下文，暂时不能解读')
      }
      const assistantToken = await ensureAssistantToken(effectiveExecutionContext)
      requestContext = buildRequestContext(effectiveExecutionContext, assistantToken)
    } catch (error) {
      console.error('prepare sqlbot-new analysis failed', error)
      ElMessage.error(error instanceof Error ? error.message : '数据解读准备失败')
      return
    }

    const session = ensureConversationContainer(effectiveExecutionContext)
    const question = buildDerivedQuestionText('analysis', sourceRecord)
    const questionRecord = createDerivedQuestionMessage({
      action: 'analysis',
      sourceRecord,
      question
    })
    const answerRecord = createDerivedAnswerMessage({
      action: 'analysis',
      sourceRecord,
      question
    })
    session.records.push(questionRecord, answerRecord)
    const actionKey = getDerivedActionKey(sourceRecord, 'analysis')
    pendingDerivedActionKeys.add(actionKey)
    persistConversationSnapshot(effectiveExecutionContext)
    await persistBackendDerivedQuestionMessage(questionRecord, effectiveExecutionContext)
    await persistBackendDerivedAnswerMessage(answerRecord, effectiveExecutionContext)

    const controller = new AbortController()
    sqlbotAnalysisControllerMap.set(answerRecord.localId, controller)
    let shouldPersistFinalAnswer = false

    try {
      await streamSQLBotRecordAnalysis(requestContext, sourceRecord.id, {
        signal: controller.signal,
        onEvent: event => {
          void applySQLBotAnalysisEvent(answerRecord, event, effectiveExecutionContext)
        }
      })
      shouldPersistFinalAnswer = true
    } catch (error) {
      if (controller.signal.aborted) {
        return
      }
      console.error('stream sqlbot-new analysis failed', error)
      answerRecord.analysisError = error instanceof Error ? error.message : '数据解读执行失败'
      answerRecord.analysisLoading = false
      answerRecord.finish = true
      shouldPersistFinalAnswer = true
    } finally {
      answerRecord.analysisLoading = false
      answerRecord.finish = true
      pendingDerivedActionKeys.delete(actionKey)
      sqlbotAnalysisControllerMap.delete(answerRecord.localId)
      if (shouldPersistFinalAnswer) {
        await persistBackendDerivedAnswerMessage(answerRecord, effectiveExecutionContext)
      }
    }
  }

  const requestRecordPredict = async (
    record: SqlbotNewConversationRecord,
    executionContext?: SqlbotNewExecutionContext
  ) => {
    return requestDerivedRecordPredict(record, executionContext)
  }

  const requestDerivedRecordPredict = async (
    sourceRecord: SqlbotNewConversationRecord,
    executionContext?: SqlbotNewExecutionContext
  ) => {
    const effectiveExecutionContext = sourceRecord.executionContext || executionContext

    if (activeTab.value !== 'query') {
      ElMessage.info('当前版本暂时只支持问数预测')
      return
    }

    if (!sourceRecord.id) {
      ElMessage.warning('当前结果尚未完成，暂时不能预测')
      return
    }

    if (
      isDerivedActionPending(sourceRecord, 'predict') ||
      hasUnfinishedDerivedAnswer(sourceRecord, 'predict')
    ) {
      return
    }

    let requestContext: SQLBotRequestContext
    try {
      if (!effectiveExecutionContext) {
        throw new Error('当前记录缺少执行上下文，暂时不能预测')
      }
      const assistantToken = await ensureAssistantToken(effectiveExecutionContext)
      requestContext = buildRequestContext(effectiveExecutionContext, assistantToken)
    } catch (error) {
      console.error('prepare sqlbot-new predict failed', error)
      ElMessage.error(error instanceof Error ? error.message : '趋势预测准备失败')
      return
    }

    const session = ensureConversationContainer(effectiveExecutionContext)
    const question = buildDerivedQuestionText('predict', sourceRecord)
    const questionRecord = createDerivedQuestionMessage({
      action: 'predict',
      sourceRecord,
      question
    })
    const answerRecord = createDerivedAnswerMessage({
      action: 'predict',
      sourceRecord,
      question
    })
    session.records.push(questionRecord, answerRecord)
    const actionKey = getDerivedActionKey(sourceRecord, 'predict')
    pendingDerivedActionKeys.add(actionKey)
    persistConversationSnapshot(effectiveExecutionContext)
    await persistBackendDerivedQuestionMessage(questionRecord, effectiveExecutionContext)
    await persistBackendDerivedAnswerMessage(answerRecord, effectiveExecutionContext)

    const controller = new AbortController()
    sqlbotPredictControllerMap.set(answerRecord.localId, controller)
    let shouldPersistFinalAnswer = false

    try {
      await streamSQLBotRecordPredict(requestContext, sourceRecord.id, {
        signal: controller.signal,
        onEvent: event => {
          void applySQLBotPredictEvent(answerRecord, event, effectiveExecutionContext)
        }
      })
      shouldPersistFinalAnswer = true
    } catch (error) {
      if (controller.signal.aborted) {
        return
      }
      console.error('stream sqlbot-new predict failed', error)
      answerRecord.predictError = error instanceof Error ? error.message : '趋势预测执行失败'
      answerRecord.predictLoading = false
      answerRecord.finish = true
      shouldPersistFinalAnswer = true
    } finally {
      answerRecord.predictLoading = false
      answerRecord.finish = true
      pendingDerivedActionKeys.delete(actionKey)
      sqlbotPredictControllerMap.delete(answerRecord.localId)
      if (shouldPersistFinalAnswer) {
        await persistBackendDerivedAnswerMessage(answerRecord, effectiveExecutionContext)
      }
    }
  }

  const abortAllAnalysisRequests = () => {
    sqlbotAnalysisControllerMap.forEach(controller => controller.abort())
    sqlbotAnalysisControllerMap.clear()
    sqlbotPredictControllerMap.forEach(controller => controller.abort())
    sqlbotPredictControllerMap.clear()
  }

  const resetConversation = () => {
    sqlbotAbortController.value?.abort()
    sqlbotAbortController.value = null
    abortAllAnalysisRequests()
    conversationLoading.value = false
    conversationSession.value = null
    currentScopeKey.value = ''
    activeExecutionContextRef.value = null
    lastEntryPayload.value = null
    restoredHistoryContext.value = null
    draftQuestion.value = ''
    pageMode.value = 'home'
    writeActiveSessionId('')
  }

  const goHome = () => {
    sqlbotAbortController.value?.abort()
    sqlbotAbortController.value = null
    abortAllAnalysisRequests()
    conversationLoading.value = false
    pageMode.value = 'home'
  }

  const clearRestoredHistoryContext = () => {
    restoredHistoryContext.value = null
    activeExecutionContextRef.value = null
  }

  const setActiveTab = (tab: TabKey) => {
    activeTab.value = tab
  }

  const getRecordStatus = (record: SqlbotNewConversationRecord) => {
    if (record.error) {
      return '执行失败'
    }
    return record.finish ? '分析完成' : '分析中'
  }

  const getRecordDuration = (record: SqlbotNewConversationRecord) => {
    if (typeof record.duration === 'number' && Number.isFinite(record.duration)) {
      return `${record.duration.toFixed(2)} s`
    }
    return record.finish ? '--' : '流式返回中'
  }

  const getRecordTime = (record: SqlbotNewConversationRecord) => {
    return formatClockTime(record.createTime)
  }

  const getRecordTitle = (record: SqlbotNewConversationRecord) => {
    const chartConfig = parseChartConfig(record.chart)
    return String(chartConfig?.title || record.question || '本轮问数结果')
  }

  const getRecordMetricChips = (record: SqlbotNewConversationRecord) => {
    const chips: string[] = []
    const datasetRows = Array.isArray(record.data?.data) ? record.data?.data.length : 0
    const datasetFields = Array.isArray(record.data?.fields) ? record.data?.fields.length : 0
    const chartType = String(parseChartConfig(record.chart)?.type || '').trim()

    if (datasetRows > 0) {
      chips.push(`${datasetRows} 行结果`)
    }
    if (datasetFields > 0) {
      chips.push(`${datasetFields} 个字段`)
    }
    if (chartType) {
      chips.push(`${chartType} 图表`)
    }
    if (record.totalTokens) {
      chips.push(`${record.totalTokens} tokens`)
    }

    return chips
  }

  const getRecordAnswer = (record: SqlbotNewConversationRecord) => {
    const answer = String(record.chartAnswer || record.sqlAnswer || '').trim()
    if (answer) {
      return answer
    }
    if (record.error) {
      return record.error
    }
    return record.finish ? '已完成本轮分析，但暂未返回文本解读。' : '正在生成分析，请稍候...'
  }

  const primeFollowUpQuestion = (
    record: SqlbotNewConversationRecord,
    mode: 'retry' | 'followup' = 'followup'
  ) => {
    draftQuestion.value =
      mode === 'retry' ? record.question : `基于“${record.question}”继续深入分析：`
    pageMode.value = 'result'
  }

  onMounted(() => {
    void loadEmbedConfig().catch(error => {
      console.error('load sqlbot-new embed config failed', error)
    })
  })

  onBeforeUnmount(() => {
    sqlbotAbortController.value?.abort()
    abortAllAnalysisRequests()
  })

  return {
    activeExecutionContext,
    activeTab,
    appendAssistantReply,
    appendLocalClarificationRecord,
    conversationEmptyCopy,
    conversationEmptyTitle,
    conversationLoading,
    conversationRecords,
    draftQuestion,
    embedAvailable,
    enterResultMode,
    fetchHistoryEntries,
    getCurrentConversationHistoryEntry,
    getBlockedReason,
    deleteHistoryEntry,
    getRecordAnswer,
    getRecordDuration,
    getRecordMetricChips,
    getRecordStatus,
    getRecordTime,
    getRecordTitle,
    goHome,
    hasConversationRecords,
    lastEntryPayload,
    pageMode,
    pageSubtitle,
    pageTitle,
    primeFollowUpQuestion,
    recommendedQuestions,
    clearRestoredHistoryContext,
    isDerivedAnswerRecord,
    isDerivedQuestionRecord,
    isFactAnswerRecord,
    requestRecordAnalysis,
    requestRecordPredict,
    requestDerivedRecordAnalysis,
    requestDerivedRecordPredict,
    resetConversation,
    restoredHistoryContext,
    restoreHistorySession,
    setActiveTab,
    appendContextSwitchRecord,
    submitQuestion
  }
}
