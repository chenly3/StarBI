import request from '@/config/axios'

type QueryLearningPrimitive = string | number | boolean

type Nullable<T> = T | null | undefined

type RawQueryLearningQualitySummary = {
  resource_id?: Nullable<QueryLearningPrimitive>
  resourceId?: Nullable<QueryLearningPrimitive>
  score?: Nullable<QueryLearningPrimitive>
  grade?: Nullable<QueryLearningPrimitive>
  risks?: unknown
  signals?: unknown
  suggestions?: unknown
}

type RawQueryLearningFeedbackSummary = {
  resource_id?: Nullable<QueryLearningPrimitive>
  resourceId?: Nullable<QueryLearningPrimitive>
  total_feedback_count?: Nullable<QueryLearningPrimitive>
  totalFeedbackCount?: Nullable<QueryLearningPrimitive>
  downvote_count?: Nullable<QueryLearningPrimitive>
  downvoteCount?: Nullable<QueryLearningPrimitive>
  downvote_rate?: Nullable<QueryLearningPrimitive>
  downvoteRate?: Nullable<QueryLearningPrimitive>
  failure_count?: Nullable<QueryLearningPrimitive>
  failureCount?: Nullable<QueryLearningPrimitive>
  failure_rate?: Nullable<QueryLearningPrimitive>
  failureRate?: Nullable<QueryLearningPrimitive>
  relearning_suggested?: Nullable<QueryLearningPrimitive>
  relearningSuggested?: Nullable<QueryLearningPrimitive>
  trigger_reason?: Nullable<QueryLearningPrimitive>
  triggerReason?: Nullable<QueryLearningPrimitive>
  relearning_advice?: Nullable<QueryLearningPrimitive>
  relearningAdvice?: Nullable<QueryLearningPrimitive>
  recent_issues?: unknown
  recentIssues?: unknown
}

type RawQueryLearningResource = {
  id?: Nullable<QueryLearningPrimitive>
  resource_id?: Nullable<QueryLearningPrimitive>
  resourceId?: Nullable<QueryLearningPrimitive>
  name?: Nullable<QueryLearningPrimitive>
  creator?: Nullable<QueryLearningPrimitive>
  creator_name?: Nullable<QueryLearningPrimitive>
  creatorName?: Nullable<QueryLearningPrimitive>
  owner?: Nullable<QueryLearningPrimitive>
  theme?: Nullable<QueryLearningPrimitive>
  theme_name?: Nullable<QueryLearningPrimitive>
  themeName?: Nullable<QueryLearningPrimitive>
  topic?: Nullable<QueryLearningPrimitive>
  learning_status?: Nullable<QueryLearningPrimitive>
  learningStatus?: Nullable<QueryLearningPrimitive>
  quality_grade?: Nullable<QueryLearningPrimitive>
  qualityGrade?: Nullable<QueryLearningPrimitive>
  quality_score?: Nullable<QueryLearningPrimitive>
  qualityScore?: Nullable<QueryLearningPrimitive>
  failure_reason?: Nullable<QueryLearningPrimitive>
  failureReason?: Nullable<QueryLearningPrimitive>
  'failure-reason'?: Nullable<QueryLearningPrimitive>
  quality_summary?: RawQueryLearningQualitySummary | null
  qualitySummary?: RawQueryLearningQualitySummary | null
  'quality-summary'?: RawQueryLearningQualitySummary | null
  feedback_summary?: RawQueryLearningFeedbackSummary | null
  feedbackSummary?: RawQueryLearningFeedbackSummary | null
  'feedback-summary'?: RawQueryLearningFeedbackSummary | null
  last_learning_time?: Nullable<QueryLearningPrimitive>
  last_learning_at?: Nullable<QueryLearningPrimitive>
  lastLearningTime?: Nullable<QueryLearningPrimitive>
  lastLearningAt?: Nullable<QueryLearningPrimitive>
}

type QueryLearningResourceListResponse =
  | RawQueryLearningResource[]
  | {
      data?: RawQueryLearningResource[] | RawQueryLearningResource | null
    }
  | null
  | undefined

type RawRuntimeDatasource = {
  id?: Nullable<QueryLearningPrimitive>
  name?: Nullable<QueryLearningPrimitive>
}

type RawQueryLearningFeedbackMetric = {
  lifetime_total_feedback_count?: Nullable<QueryLearningPrimitive>
  lifetimeTotalFeedbackCount?: Nullable<QueryLearningPrimitive>
  lifetime_downvote_count?: Nullable<QueryLearningPrimitive>
  lifetimeDownvoteCount?: Nullable<QueryLearningPrimitive>
  lifetime_failure_count?: Nullable<QueryLearningPrimitive>
  lifetimeFailureCount?: Nullable<QueryLearningPrimitive>
  lifetime_correction_count?: Nullable<QueryLearningPrimitive>
  lifetimeCorrectionCount?: Nullable<QueryLearningPrimitive>
  window_7d_total_feedback_count?: Nullable<QueryLearningPrimitive>
  window7dTotalFeedbackCount?: Nullable<QueryLearningPrimitive>
  window_7d_downvote_rate?: Nullable<QueryLearningPrimitive>
  window7dDownvoteRate?: Nullable<QueryLearningPrimitive>
  window_7d_failure_rate?: Nullable<QueryLearningPrimitive>
  window7dFailureRate?: Nullable<QueryLearningPrimitive>
  window_7d_correction_rate?: Nullable<QueryLearningPrimitive>
  window7dCorrectionRate?: Nullable<QueryLearningPrimitive>
  relearning_suggested?: Nullable<QueryLearningPrimitive>
  relearningSuggested?: Nullable<QueryLearningPrimitive>
  trigger_reason?: Nullable<QueryLearningPrimitive>
  triggerReason?: Nullable<QueryLearningPrimitive>
  relearning_advice?: Nullable<QueryLearningPrimitive>
  relearningAdvice?: Nullable<QueryLearningPrimitive>
}

type RawQueryLearningFeedbackEvent = {
  accepted?: Nullable<QueryLearningPrimitive>
  event_no?: Nullable<QueryLearningPrimitive>
  eventNo?: Nullable<QueryLearningPrimitive>
  resource_id?: Nullable<QueryLearningPrimitive>
  resourceId?: Nullable<QueryLearningPrimitive>
  active_patch_count?: Nullable<QueryLearningPrimitive>
  activePatchCount?: Nullable<QueryLearningPrimitive>
  metric?: RawQueryLearningFeedbackMetric | null
}

type RawQueryLearningPatch = {
  id?: Nullable<QueryLearningPrimitive>
  resource_id?: Nullable<QueryLearningPrimitive>
  resourceId?: Nullable<QueryLearningPrimitive>
  patch_type?: Nullable<QueryLearningPrimitive>
  patchType?: Nullable<QueryLearningPrimitive>
  status?: Nullable<QueryLearningPrimitive>
  priority?: Nullable<QueryLearningPrimitive>
  match_fingerprint?: Nullable<QueryLearningPrimitive>
  matchFingerprint?: Nullable<QueryLearningPrimitive>
  source_event_id?: Nullable<QueryLearningPrimitive>
  sourceEventId?: Nullable<QueryLearningPrimitive>
  activated_at?: Nullable<QueryLearningPrimitive>
  activatedAt?: Nullable<QueryLearningPrimitive>
  deactivated_at?: Nullable<QueryLearningPrimitive>
  deactivatedAt?: Nullable<QueryLearningPrimitive>
}

type RawQueryLearningPatchDisable = {
  patch_id?: Nullable<QueryLearningPrimitive>
  patchId?: Nullable<QueryLearningPrimitive>
  resource_id?: Nullable<QueryLearningPrimitive>
  resourceId?: Nullable<QueryLearningPrimitive>
  disabled?: Nullable<QueryLearningPrimitive>
  event_no?: Nullable<QueryLearningPrimitive>
  eventNo?: Nullable<QueryLearningPrimitive>
}

type RawQueryLearningReplay = {
  event_no?: Nullable<QueryLearningPrimitive>
  eventNo?: Nullable<QueryLearningPrimitive>
  resource_id?: Nullable<QueryLearningPrimitive>
  resourceId?: Nullable<QueryLearningPrimitive>
  source_chat_id?: Nullable<QueryLearningPrimitive>
  sourceChatId?: Nullable<QueryLearningPrimitive>
  source_chat_record_id?: Nullable<QueryLearningPrimitive>
  sourceChatRecordId?: Nullable<QueryLearningPrimitive>
  source_trace_id?: Nullable<QueryLearningPrimitive>
  sourceTraceId?: Nullable<QueryLearningPrimitive>
  actor_account?: Nullable<QueryLearningPrimitive>
  actorAccount?: Nullable<QueryLearningPrimitive>
  event_type?: Nullable<QueryLearningPrimitive>
  eventType?: Nullable<QueryLearningPrimitive>
  question_text?: Nullable<QueryLearningPrimitive>
  questionText?: Nullable<QueryLearningPrimitive>
  matched_sql?: Nullable<QueryLearningPrimitive>
  matchedSql?: Nullable<QueryLearningPrimitive>
  error_code?: Nullable<QueryLearningPrimitive>
  errorCode?: Nullable<QueryLearningPrimitive>
  error_message?: Nullable<QueryLearningPrimitive>
  errorMessage?: Nullable<QueryLearningPrimitive>
  before_snapshot?: Record<string, any> | null
  beforeSnapshot?: Record<string, any> | null
  after_snapshot?: Record<string, any> | null
  afterSnapshot?: Record<string, any> | null
  patch_types?: unknown
  patchTypes?: unknown
  visibility?: Nullable<QueryLearningPrimitive>
  created_at?: Nullable<QueryLearningPrimitive>
  createdAt?: Nullable<QueryLearningPrimitive>
}

type RawQueryLearningRelearningDecision = {
  resource_id?: Nullable<QueryLearningPrimitive>
  resourceId?: Nullable<QueryLearningPrimitive>
  relearning_suggested?: Nullable<QueryLearningPrimitive>
  relearningSuggested?: Nullable<QueryLearningPrimitive>
  trigger_reason?: Nullable<QueryLearningPrimitive>
  triggerReason?: Nullable<QueryLearningPrimitive>
  relearning_advice?: Nullable<QueryLearningPrimitive>
  relearningAdvice?: Nullable<QueryLearningPrimitive>
  metric?: RawQueryLearningFeedbackMetric | null
}

type RuntimeDatasourceResponse =
  | RawRuntimeDatasource[]
  | {
      data?: RawRuntimeDatasource[] | RawRuntimeDatasource | null
    }
  | null
  | undefined

export interface QueryLearningResource {
  id: string
  name: string
  creator?: string
  theme?: string
  learningStatus: string
  qualityGrade?: string
  qualityScore?: number
  failureReason?: string
  lastLearningTime?: string
  qualitySummary?: QueryLearningQualitySummary
  feedbackSummary?: QueryLearningFeedbackSummary
}

export interface QueryLearningQualitySummary {
  resourceId?: string
  score?: number
  grade?: string
  risks: string[]
  signals: string[]
  suggestions: string[]
}

export interface QueryLearningFeedbackSummary {
  resourceId?: string
  totalFeedbackCount: number
  downvoteCount: number
  downvoteRate: number
  failureCount: number
  failureRate: number
  relearningSuggested: boolean
  triggerReason?: string
  relearningAdvice: string
  recentIssues: string[]
}

type RawQueryLearningTrigger = {
  task_id?: Nullable<QueryLearningPrimitive>
  taskId?: Nullable<QueryLearningPrimitive>
  resource_id?: Nullable<QueryLearningPrimitive>
  resourceId?: Nullable<QueryLearningPrimitive>
  task_status?: Nullable<QueryLearningPrimitive>
  taskStatus?: Nullable<QueryLearningPrimitive>
}

type QueryLearningTriggerResponse =
  | RawQueryLearningTrigger
  | {
      data?: RawQueryLearningTrigger | null
    }
  | null
  | undefined

export interface QueryLearningTrigger {
  taskId: string
  resourceId: string
  taskStatus: string
}

export interface QueryLearningDeleteResult {
  resourceId: string
  deleted: boolean
  deletedRows: number
}

export type QueryLearningFeedbackEventType =
  | 'upvote'
  | 'downvote'
  | 'execution_failure'
  | 'manual_fix_submit'
  | 'manual_fix_disable'

export type QueryLearningPatchType = 'sql_override' | 'field_mapping_fix' | 'value_mapping_fix'

export interface QueryLearningFeedbackMetric {
  lifetimeTotalFeedbackCount: number
  lifetimeDownvoteCount: number
  lifetimeFailureCount: number
  lifetimeCorrectionCount: number
  window7dTotalFeedbackCount: number
  window7dDownvoteRate: number
  window7dFailureRate: number
  window7dCorrectionRate: number
  relearningSuggested: boolean
  triggerReason?: string
  relearningAdvice?: string
}

export interface QueryLearningFeedbackEventRequest {
  actorAccount?: string
  eventType: QueryLearningFeedbackEventType
  sourceChatId?: number
  sourceChatRecordId?: number
  sourceTraceId?: string
  questionText?: string
  matchedSql?: string
  errorCode?: string
  errorMessage?: string
  beforeSnapshot?: Record<string, any>
  afterSnapshot?: Record<string, any>
  patchTypes?: QueryLearningPatchType[]
  visibility?: string
}

export interface QueryLearningFeedbackEventResponse {
  accepted: boolean
  eventNo: string
  resourceId: string
  activePatchCount: number
  metric?: QueryLearningFeedbackMetric
}

export interface QueryLearningPatch {
  id: number
  resourceId: string
  patchType: string
  status: string
  priority?: number
  matchFingerprint?: string
  sourceEventId?: number
  activatedAt?: string
  deactivatedAt?: string
}

export interface QueryLearningPatchDisableRequest {
  actorAccount?: string
  reason?: string
}

export interface QueryLearningPatchDisableResponse {
  patchId: number
  resourceId: string
  disabled: boolean
  eventNo?: string
}

export interface QueryLearningFeedbackEventQuery {
  eventType?: string
  sourceChatRecordId?: number
  createdFrom?: string
  createdTo?: string
}

export interface QueryLearningFeedbackReplay {
  eventNo: string
  resourceId: string
  sourceChatId?: number
  sourceChatRecordId?: number
  sourceTraceId?: string
  actorAccount?: string
  eventType?: string
  questionText?: string
  matchedSql?: string
  errorCode?: string
  errorMessage?: string
  beforeSnapshot: Record<string, any>
  afterSnapshot: Record<string, any>
  patchTypes: string[]
  visibility?: string
  createdAt?: string
}

export interface QueryLearningRelearningDecision {
  resourceId: string
  relearningSuggested: boolean
  triggerReason?: string
  relearningAdvice?: string
  metric?: QueryLearningFeedbackMetric
}

const toRequiredString = (value: Nullable<QueryLearningPrimitive>): string => String(value ?? '')

const toOptionalString = (value: Nullable<QueryLearningPrimitive>): string | undefined => {
  return value == null ? undefined : String(value)
}

const toOptionalNumber = (value: Nullable<QueryLearningPrimitive>): number | undefined => {
  if (value == null || value === '') {
    return undefined
  }
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

const toBoolean = (value: Nullable<QueryLearningPrimitive>): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  const normalizedValue = String(value ?? '')
    .trim()
    .toLowerCase()
  return normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes'
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(item => String(item ?? '').trim()).filter(item => item.length > 0)
}

const toObjectRecord = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, any>
}

const normalizeLearningStatus = (value: Nullable<QueryLearningPrimitive>): string => {
  const normalizedValue = String(value ?? '')
    .trim()
    .toLowerCase()
  if (normalizedValue === 'succeeded') {
    return '学习成功'
  }
  if (normalizedValue === 'failed') {
    return '学习失败'
  }
  if (normalizedValue === 'running') {
    return '学习中'
  }
  if (normalizedValue === 'pending') {
    return '待学习'
  }
  return String(value ?? '')
}

const normalizeFeedbackMetric = (
  payload: RawQueryLearningFeedbackMetric | null | undefined
): QueryLearningFeedbackMetric | undefined => {
  if (!payload) {
    return undefined
  }
  return {
    lifetimeTotalFeedbackCount:
      toOptionalNumber(
        payload.lifetime_total_feedback_count ?? payload.lifetimeTotalFeedbackCount
      ) ?? 0,
    lifetimeDownvoteCount:
      toOptionalNumber(payload.lifetime_downvote_count ?? payload.lifetimeDownvoteCount) ?? 0,
    lifetimeFailureCount:
      toOptionalNumber(payload.lifetime_failure_count ?? payload.lifetimeFailureCount) ?? 0,
    lifetimeCorrectionCount:
      toOptionalNumber(payload.lifetime_correction_count ?? payload.lifetimeCorrectionCount) ?? 0,
    window7dTotalFeedbackCount:
      toOptionalNumber(
        payload.window_7d_total_feedback_count ?? payload.window7dTotalFeedbackCount
      ) ?? 0,
    window7dDownvoteRate:
      toOptionalNumber(payload.window_7d_downvote_rate ?? payload.window7dDownvoteRate) ?? 0,
    window7dFailureRate:
      toOptionalNumber(payload.window_7d_failure_rate ?? payload.window7dFailureRate) ?? 0,
    window7dCorrectionRate:
      toOptionalNumber(payload.window_7d_correction_rate ?? payload.window7dCorrectionRate) ?? 0,
    relearningSuggested: toBoolean(payload.relearning_suggested ?? payload.relearningSuggested),
    triggerReason: toOptionalString(payload.trigger_reason ?? payload.triggerReason),
    relearningAdvice: toOptionalString(payload.relearning_advice ?? payload.relearningAdvice)
  }
}

const normalizeQualitySummary = (
  payload: RawQueryLearningQualitySummary | null | undefined
): QueryLearningQualitySummary | undefined => {
  if (!payload) {
    return undefined
  }

  return {
    resourceId: toOptionalString(payload.resource_id ?? payload.resourceId),
    score: toOptionalNumber(payload.score),
    grade: toOptionalString(payload.grade),
    risks: toStringArray(payload.risks),
    signals: toStringArray(payload.signals),
    suggestions: toStringArray(payload.suggestions)
  }
}

const normalizeFeedbackSummary = (
  payload: RawQueryLearningFeedbackSummary | null | undefined
): QueryLearningFeedbackSummary | undefined => {
  if (!payload) {
    return undefined
  }

  const totalFeedbackCount =
    toOptionalNumber(payload.total_feedback_count ?? payload.totalFeedbackCount) ?? 0
  const downvoteCount = toOptionalNumber(payload.downvote_count ?? payload.downvoteCount) ?? 0
  const failureCount = toOptionalNumber(payload.failure_count ?? payload.failureCount) ?? 0
  const relearningSuggested = toBoolean(payload.relearning_suggested ?? payload.relearningSuggested)
  const recentIssues = toStringArray(payload.recent_issues ?? payload.recentIssues)
  const downvoteRate =
    toOptionalNumber(payload.downvote_rate ?? payload.downvoteRate) ??
    (totalFeedbackCount ? Math.round((downvoteCount / totalFeedbackCount) * 100) : 0)
  const failureRate =
    toOptionalNumber(payload.failure_rate ?? payload.failureRate) ??
    (totalFeedbackCount ? Math.round((failureCount / totalFeedbackCount) * 100) : 0)
  const relearningAdvice =
    toOptionalString(payload.relearning_advice ?? payload.relearningAdvice) ||
    (relearningSuggested
      ? '当前反馈存在波动，建议重新学习并复核治理资产。'
      : '当前反馈稳定，建议持续观察。')

  return {
    resourceId: toOptionalString(payload.resource_id ?? payload.resourceId),
    totalFeedbackCount,
    downvoteCount,
    downvoteRate,
    failureCount,
    failureRate,
    relearningSuggested,
    triggerReason: toOptionalString(payload.trigger_reason ?? payload.triggerReason),
    relearningAdvice,
    recentIssues
  }
}

const normalizeLearningResource = (payload: RawQueryLearningResource): QueryLearningResource => {
  return {
    id: toRequiredString(payload.resource_id ?? payload.resourceId ?? payload.id),
    name: toRequiredString(payload.name),
    creator: toOptionalString(
      payload.creator ?? payload.creator_name ?? payload.creatorName ?? payload.owner
    ),
    theme: toOptionalString(
      payload.theme ?? payload.theme_name ?? payload.themeName ?? payload.topic
    ),
    learningStatus: normalizeLearningStatus(payload.learning_status ?? payload.learningStatus),
    qualityGrade: toOptionalString(payload.quality_grade ?? payload.qualityGrade),
    qualityScore: toOptionalNumber(payload.quality_score ?? payload.qualityScore),
    failureReason: toOptionalString(
      payload.failure_reason ?? payload.failureReason ?? payload['failure-reason']
    ),
    lastLearningTime: toOptionalString(
      payload.last_learning_time ??
        payload.last_learning_at ??
        payload.lastLearningTime ??
        payload.lastLearningAt
    ),
    qualitySummary: normalizeQualitySummary(
      payload.quality_summary ?? payload.qualitySummary ?? payload['quality-summary']
    ),
    feedbackSummary: normalizeFeedbackSummary(
      payload.feedback_summary ?? payload.feedbackSummary ?? payload['feedback-summary']
    )
  }
}

const extractLearningResourceList = (
  response: QueryLearningResourceListResponse
): RawQueryLearningResource[] => {
  const payload = Array.isArray(response) ? response : response?.data
  return Array.isArray(payload) ? payload : []
}

const extractRuntimeDatasourceList = (
  response: RuntimeDatasourceResponse
): RawRuntimeDatasource[] => {
  const payload = Array.isArray(response) ? response : response?.data
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload && typeof payload === 'object') {
    return [payload]
  }
  return []
}

const extractPayload = <T>(response: T | { data?: T | null } | null | undefined): T | undefined => {
  if (response == null) {
    return undefined
  }
  if (typeof response === 'object' && 'data' in (response as Record<string, any>)) {
    const payload = (response as { data?: T | null }).data
    return (payload ?? undefined) as T | undefined
  }
  return response as T
}

const extractListPayload = <T>(response: T[] | { data?: T[] | null } | null | undefined): T[] => {
  const payload = Array.isArray(response) ? response : response?.data
  return Array.isArray(payload) ? payload : []
}

const normalizeFeedbackEventResponse = (
  payload: RawQueryLearningFeedbackEvent | null | undefined
): QueryLearningFeedbackEventResponse => {
  return {
    accepted: toBoolean(payload?.accepted),
    eventNo: toRequiredString(payload?.event_no ?? payload?.eventNo),
    resourceId: toRequiredString(payload?.resource_id ?? payload?.resourceId),
    activePatchCount:
      toOptionalNumber(payload?.active_patch_count ?? payload?.activePatchCount) ?? 0,
    metric: normalizeFeedbackMetric(payload?.metric || undefined)
  }
}

const normalizeLearningPatch = (payload: RawQueryLearningPatch): QueryLearningPatch => {
  return {
    id: toOptionalNumber(payload.id) ?? 0,
    resourceId: toRequiredString(payload.resource_id ?? payload.resourceId),
    patchType: toRequiredString(payload.patch_type ?? payload.patchType),
    status: toRequiredString(payload.status),
    priority: toOptionalNumber(payload.priority),
    matchFingerprint: toOptionalString(payload.match_fingerprint ?? payload.matchFingerprint),
    sourceEventId: toOptionalNumber(payload.source_event_id ?? payload.sourceEventId),
    activatedAt: toOptionalString(payload.activated_at ?? payload.activatedAt),
    deactivatedAt: toOptionalString(payload.deactivated_at ?? payload.deactivatedAt)
  }
}

const normalizePatchDisableResponse = (
  payload: RawQueryLearningPatchDisable | null | undefined
): QueryLearningPatchDisableResponse => {
  return {
    patchId: toOptionalNumber(payload?.patch_id ?? payload?.patchId) ?? 0,
    resourceId: toRequiredString(payload?.resource_id ?? payload?.resourceId),
    disabled: toBoolean(payload?.disabled),
    eventNo: toOptionalString(payload?.event_no ?? payload?.eventNo)
  }
}

const normalizeFeedbackReplay = (payload: RawQueryLearningReplay): QueryLearningFeedbackReplay => {
  return {
    eventNo: toRequiredString(payload.event_no ?? payload.eventNo),
    resourceId: toRequiredString(payload.resource_id ?? payload.resourceId),
    sourceChatId: toOptionalNumber(payload.source_chat_id ?? payload.sourceChatId),
    sourceChatRecordId: toOptionalNumber(
      payload.source_chat_record_id ?? payload.sourceChatRecordId
    ),
    sourceTraceId: toOptionalString(payload.source_trace_id ?? payload.sourceTraceId),
    actorAccount: toOptionalString(payload.actor_account ?? payload.actorAccount),
    eventType: toOptionalString(payload.event_type ?? payload.eventType),
    questionText: toOptionalString(payload.question_text ?? payload.questionText),
    matchedSql: toOptionalString(payload.matched_sql ?? payload.matchedSql),
    errorCode: toOptionalString(payload.error_code ?? payload.errorCode),
    errorMessage: toOptionalString(payload.error_message ?? payload.errorMessage),
    beforeSnapshot: toObjectRecord(payload.before_snapshot ?? payload.beforeSnapshot),
    afterSnapshot: toObjectRecord(payload.after_snapshot ?? payload.afterSnapshot),
    patchTypes: toStringArray(payload.patch_types ?? payload.patchTypes),
    visibility: toOptionalString(payload.visibility),
    createdAt: toOptionalString(payload.created_at ?? payload.createdAt)
  }
}

const normalizeRelearningDecision = (
  payload: RawQueryLearningRelearningDecision | null | undefined
): QueryLearningRelearningDecision => {
  return {
    resourceId: toRequiredString(payload?.resource_id ?? payload?.resourceId),
    relearningSuggested: toBoolean(payload?.relearning_suggested ?? payload?.relearningSuggested),
    triggerReason: toOptionalString(payload?.trigger_reason ?? payload?.triggerReason),
    relearningAdvice: toOptionalString(payload?.relearning_advice ?? payload?.relearningAdvice),
    metric: normalizeFeedbackMetric(payload?.metric || undefined)
  }
}

const toFeedbackEventPayload = (payload: QueryLearningFeedbackEventRequest) => {
  return {
    actorAccount: toOptionalString(payload.actorAccount),
    eventType: toRequiredString(payload.eventType),
    sourceChatId: toOptionalNumber(payload.sourceChatId),
    sourceChatRecordId: toOptionalNumber(payload.sourceChatRecordId),
    sourceTraceId: toOptionalString(payload.sourceTraceId),
    questionText: toOptionalString(payload.questionText),
    matchedSql: toOptionalString(payload.matchedSql),
    errorCode: toOptionalString(payload.errorCode),
    errorMessage: toOptionalString(payload.errorMessage),
    beforeSnapshot: toObjectRecord(payload.beforeSnapshot),
    afterSnapshot: toObjectRecord(payload.afterSnapshot),
    patchTypes: toStringArray(payload.patchTypes),
    visibility: toOptionalString(payload.visibility)
  }
}

const toPatchDisablePayload = (payload?: QueryLearningPatchDisableRequest) => {
  return {
    actorAccount: toOptionalString(payload?.actorAccount),
    reason: toOptionalString(payload?.reason)
  }
}

export const listQueryLearningResources = async (): Promise<QueryLearningResource[]> => {
  const response = await request.get<QueryLearningResourceListResponse>({
    url: '/ai/query/resource-learning/resources',
    silentError: true
  })
  return extractLearningResourceList(response).map(normalizeLearningResource)
}

const extractLearningTrigger = (
  response: QueryLearningTriggerResponse
): RawQueryLearningTrigger | null => {
  if (!response) {
    return null
  }
  const payload = (response as { data?: RawQueryLearningTrigger | null }).data
  return payload ?? (response as RawQueryLearningTrigger)
}

export const triggerQueryLearning = async (resourceId: string): Promise<QueryLearningTrigger> => {
  const response = await request.post<QueryLearningTriggerResponse>({
    url: `/ai/query/resource-learning/resources/${resourceId}/learn`,
    silentError: true
  })
  const payload = extractLearningTrigger(response)

  return {
    taskId: toRequiredString(payload?.task_id ?? payload?.taskId),
    resourceId: toRequiredString(payload?.resource_id ?? payload?.resourceId ?? resourceId),
    taskStatus: normalizeLearningStatus(payload?.task_status ?? payload?.taskStatus)
  }
}

export const deleteQueryLearningResource = async (
  resourceId: string
): Promise<QueryLearningDeleteResult> => {
  const response = await request.delete({
    url: `/ai/query/resource-learning/resources/${resourceId}`,
    silentError: true
  })
  const payload =
    response && typeof response === 'object' && 'data' in response ? response.data : response
  return {
    resourceId: toRequiredString(payload?.resource_id ?? payload?.resourceId ?? resourceId),
    deleted: toBoolean(payload?.deleted),
    deletedRows: toOptionalNumber(payload?.deleted_rows ?? payload?.deletedRows) ?? 0
  }
}

export const getQueryLearningQualitySummary = async (
  resourceId: string
): Promise<QueryLearningQualitySummary | undefined> => {
  const response = await request.get<
    RawQueryLearningQualitySummary | { data?: RawQueryLearningQualitySummary | null }
  >({
    url: `/ai/query/resource-learning/resources/${resourceId}/quality-summary`,
    silentError: true
  })
  const payload = extractPayload<RawQueryLearningQualitySummary>(response)
  return normalizeQualitySummary(payload)
}

export const getQueryLearningFeedbackSummary = async (
  resourceId: string
): Promise<QueryLearningFeedbackSummary | undefined> => {
  const response = await request.get<
    RawQueryLearningFeedbackSummary | { data?: RawQueryLearningFeedbackSummary | null }
  >({
    url: `/ai/query/resource-learning/resources/${resourceId}/feedback-summary`,
    silentError: true
  })
  const payload = extractPayload<RawQueryLearningFeedbackSummary>(response)
  return normalizeFeedbackSummary(payload)
}

export const resolveQueryLearningDatasourceName = async (
  resourceId: string
): Promise<string | undefined> => {
  const datasourceId = String(resourceId).startsWith('datasource:')
    ? String(resourceId).slice('datasource:'.length)
    : String(resourceId)
  if (!/^\d+$/.test(datasourceId)) {
    return undefined
  }
  const response = await request.get<RuntimeDatasourceResponse>({
    url: '/sqlbot/datasource',
    params: {
      datasetIds: datasourceId,
      dsId: datasourceId
    },
    silentError: true
  })
  const list = extractRuntimeDatasourceList(response)
  const matched = list.find(item => toRequiredString(item.id) === datasourceId)
  const matchedName = toOptionalString(matched?.name)?.trim()
  if (!matchedName || matchedName === resourceId || matchedName === datasourceId) {
    return undefined
  }
  return matchedName
}

export const createQueryLearningFeedbackEvent = async (
  resourceId: string,
  payload: QueryLearningFeedbackEventRequest
): Promise<QueryLearningFeedbackEventResponse> => {
  const response = await request.post<
    RawQueryLearningFeedbackEvent | { data?: RawQueryLearningFeedbackEvent | null }
  >({
    url: `/ai/query/resource-learning/resources/${resourceId}/feedback/events`,
    data: toFeedbackEventPayload(payload),
    silentError: true
  })
  return normalizeFeedbackEventResponse(extractPayload(response))
}

export const listQueryLearningPatches = async (
  resourceId: string,
  options?: { status?: string }
): Promise<QueryLearningPatch[]> => {
  const response = await request.get<
    RawQueryLearningPatch[] | { data?: RawQueryLearningPatch[] | null }
  >({
    url: `/ai/query/resource-learning/resources/${resourceId}/patches`,
    params: {
      status: toOptionalString(options?.status)
    },
    silentError: true
  })
  return extractListPayload(response).map(normalizeLearningPatch)
}

export const disableQueryLearningPatch = async (
  resourceId: string,
  patchId: number | string,
  payload?: QueryLearningPatchDisableRequest
): Promise<QueryLearningPatchDisableResponse> => {
  const response = await request.post<
    RawQueryLearningPatchDisable | { data?: RawQueryLearningPatchDisable | null }
  >({
    url: `/ai/query/resource-learning/resources/${resourceId}/patches/${patchId}/disable`,
    data: toPatchDisablePayload(payload),
    silentError: true
  })
  return normalizePatchDisableResponse(extractPayload(response))
}

export const listQueryLearningFeedbackEvents = async (
  resourceId: string,
  query?: QueryLearningFeedbackEventQuery
): Promise<QueryLearningFeedbackReplay[]> => {
  const response = await request.get<
    RawQueryLearningReplay[] | { data?: RawQueryLearningReplay[] | null }
  >({
    url: `/ai/query/resource-learning/resources/${resourceId}/feedback/events`,
    params: {
      eventType: toOptionalString(query?.eventType),
      sourceChatRecordId: toOptionalNumber(query?.sourceChatRecordId),
      createdFrom: toOptionalString(query?.createdFrom),
      createdTo: toOptionalString(query?.createdTo)
    },
    silentError: true
  })
  return extractListPayload(response).map(normalizeFeedbackReplay)
}

export const getQueryLearningFeedbackReplay = async (
  resourceId: string,
  eventNo: string
): Promise<QueryLearningFeedbackReplay> => {
  const response = await request.get<
    RawQueryLearningReplay | { data?: RawQueryLearningReplay | null }
  >({
    url: `/ai/query/resource-learning/resources/${resourceId}/feedback/replay/${eventNo}`,
    silentError: true
  })
  return normalizeFeedbackReplay(extractPayload(response) || {})
}

export const getQueryLearningFeedbackMetric = async (
  resourceId: string
): Promise<QueryLearningFeedbackMetric> => {
  const response = await request.get<
    RawQueryLearningFeedbackMetric | { data?: RawQueryLearningFeedbackMetric | null }
  >({
    url: `/ai/query/resource-learning/resources/${resourceId}/feedback-metric`,
    silentError: true
  })
  return (
    normalizeFeedbackMetric(extractPayload(response)) || {
      lifetimeTotalFeedbackCount: 0,
      lifetimeDownvoteCount: 0,
      lifetimeFailureCount: 0,
      lifetimeCorrectionCount: 0,
      window7dTotalFeedbackCount: 0,
      window7dDownvoteRate: 0,
      window7dFailureRate: 0,
      window7dCorrectionRate: 0,
      relearningSuggested: false
    }
  )
}

export const evaluateQueryLearningRelearning = async (
  resourceId: string
): Promise<QueryLearningRelearningDecision> => {
  const response = await request.post<
    RawQueryLearningRelearningDecision | { data?: RawQueryLearningRelearningDecision | null }
  >({
    url: `/ai/query/resource-learning/resources/${resourceId}/feedback/evaluate-relearning`,
    silentError: true
  })
  return normalizeRelearningDecision(extractPayload(response))
}
