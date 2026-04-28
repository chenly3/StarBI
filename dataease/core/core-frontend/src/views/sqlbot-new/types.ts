export type PageMode = 'home' | 'result'
export type TabKey = 'query' | 'report' | 'build' | 'search'
export type DialogTab = 'dataset' | 'file'
export type SourceKind = 'dataset' | 'file' | 'dataset-combination'

export const SQLBOT_NEW_DIALOG_TABS = {
  dataset: 'dataset',
  file: 'file'
} as const

export const SQLBOT_NEW_SOURCE_KINDS = {
  dataset: 'dataset',
  file: 'file',
  datasetCombination: 'dataset-combination'
} as const

export interface HistoryItem {
  id: string
  title: string
  subtitle: string
  time: string
  group: 'recent' | 'history'
}

export interface RecommendItem {
  id: string
  label: string
  width?: number
}

export interface DatasetCardItem {
  id: string
  title: string
  tone: 'blue' | 'green' | 'purple' | 'orange'
  badge: string
  extraBadge?: string
  fields: string[]
  metricFields?: string[]
  dimensionFields?: string[]
  fieldsLoaded?: boolean
  selectedPreview?: boolean
}

export type FileFieldKind = 'text' | 'number' | 'date'

export interface FileFieldMeta {
  name: string
  kind: FileFieldKind
  fieldType?: string
  deType?: number
  deExtractType?: number
}

export interface FileCardItem {
  id: string
  title: string
  uploadedAt: string
  format: 'Excel' | 'CSV'
  fields: string[]
  fieldMetas?: FileFieldMeta[]
  metricFields?: string[]
  dimensionFields?: string[]
  fieldsLoaded?: boolean
  datasourceId?: string
  pending?: boolean
}

export interface SqlbotNewSelectionState {
  themeId: string
  sourceKind: SourceKind
  datasetId: string
  fileId: string
  sourceIds: string[]
  combinationId: string
  combinationName: string
  modelId: string
}

export interface SqlbotNewThemeTab {
  id: string
  name: string
  description?: string
  datasetIds: string[]
  defaultDatasetIds: string[]
  datasetCount: number
  recommendedQuestions: string[]
}

export interface SqlbotNewResultEntryPayload {
  reason: 'submit' | 'history' | 'file-upload' | 'file-detail' | 'selection'
  question?: string
  themeId?: string
  themeName?: string
  sourceKind?: SourceKind
  sourceId?: string
  sourceIds?: string[]
  combinationId?: string
  combinationName?: string
  datasourceId?: string
  modelId?: string
  datasourcePending?: boolean
  selectionTitle?: string
  selectionMeta?: string
}

export interface SqlbotNewMockResultRecord {
  question: string
  title: string
  status: string
  duration: string
  time: string
  metricChips: string[]
  errorTitle: string
  errorCopy: string
}

export interface SqlbotNewExecutionContext {
  themeId?: string
  themeName?: string
  queryMode: SourceKind
  sourceId: string
  sourceIds?: string[]
  combinationId?: string
  combinationName?: string
  datasourceId: string
  modelId: string
  datasourcePending: boolean
}

export interface SqlbotNewSelectionSnapshot {
  executionContext: SqlbotNewExecutionContext
  selectionTitle: string
  selectionMeta: string
}

export interface SqlbotNewConfirmedSelectionChange extends SqlbotNewSelectionSnapshot {
  confirmed: true
  changed: boolean
}

export interface SqlbotNewAbortedSelectionChange {
  confirmed: false
}

export type SqlbotNewSelectionChange =
  | SqlbotNewConfirmedSelectionChange
  | SqlbotNewAbortedSelectionChange

export type SqlbotNewConversationRecordKind = 'answer' | 'context-switch'

export interface SqlbotNewContextSwitchMeta {
  sourceKind: SourceKind
  sourceId: string
  sourceIds?: string[]
  combinationId?: string
  combinationName?: string
  datasourceId: string
  sourceTitle: string
  sourceMeta: string
}

export interface SqlbotNewClarificationOption {
  label: string
  value: string
  description?: string
  chips?: string[]
}

export type SqlbotNewDatasetCombinationRelationType = 'left' | 'inner' | 'right' | 'full'

export interface SqlbotNewDatasetCombinationRelation {
  leftDatasetId: string
  leftField: string
  rightDatasetId: string
  rightField: string
  relationType: SqlbotNewDatasetCombinationRelationType
}

export interface SqlbotNewDatasetCombinationDraft {
  name: string
  primaryDatasetId: string
  secondaryDatasetIds: string[]
  relations: SqlbotNewDatasetCombinationRelation[]
}

export interface SqlbotNewClarificationState {
  reasonCode: string
  prompt: string
  options: SqlbotNewClarificationOption[]
  pending: boolean
  selectionMode?: 'single' | 'multiple'
  confirmLabel?: string
  selectedValues?: string[]
  combinationDraft?: SqlbotNewDatasetCombinationDraft
}

export interface SqlbotNewInterpretationMeta {
  metric: string[]
  dimension: string[]
  timeRange?: string
  filters: string[]
  defaultedFields: string[]
}

export interface SqlbotNewSourceInsightDataset {
  id: string
  name: string
  role?: 'primary' | 'secondary'
}

export interface SqlbotNewSourceInsightRelation {
  id: string
  leftDatasetId: string
  leftDatasetName: string
  leftField: string
  rightDatasetId: string
  rightDatasetName: string
  rightField: string
  relationType: SqlbotNewDatasetCombinationRelationType
}

export interface SqlbotNewSourceInsights {
  datasets: SqlbotNewSourceInsightDataset[]
  relations: SqlbotNewSourceInsightRelation[]
  relationWarning?: string
}

export interface SqlbotNewExecutionSummary {
  scopeLabel: string
  datasourceLabel: string
  summary: string
  failureStage?: string
  nextAction?: string
}

export interface SQLBotNewPersistedHistoryEntry {
  chatId: number
  title: string
  subtitle: string
  updatedAt: string
  queryMode: SourceKind
  sourceId: string
  sourceIds?: string[]
  combinationId?: string
  combinationName?: string
  datasourceId: string
  modelId: string
  selectionTitle: string
  selectionMeta: string
  latestQuestion: string
  datasourcePending: boolean
}

export type SQLBotNewPersistedContextEventType =
  | 'session_init'
  | 'context_switch'
  | 'assistant_reply'
  | 'selection_update'

export interface SQLBotNewPersistedSnapshot {
  chatId?: number
  clientType?: string
  activeSourceKind: SourceKind
  activeSourceId?: string
  activeSourceIds?: string[]
  activeCombinationId?: string
  activeCombinationName?: string
  activeDatasourceId?: string
  activeModelId?: string
  activeThemeId?: string
  activeThemeName?: string
  selectionTitle?: string
  selectionMeta?: string
  datasourcePending?: boolean
  latestRecordId?: number
  latestQuestion?: string
  snapshotVersion?: number
  createBy?: number
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface SQLBotNewPersistedContextEvent {
  id: number
  eventType: SQLBotNewPersistedContextEventType
  recordId?: number
  sourceKind?: SourceKind
  sourceId?: string
  sourceIds?: string[]
  combinationId?: string
  combinationName?: string
  datasourceId?: string
  modelId?: string
  themeId?: string
  themeName?: string
  selectionTitle?: string
  selectionMeta?: string
  datasourcePending?: boolean
  eventPayload?: Record<string, any>
  createTime: string
}

export interface SQLBotNewPersistedContextPayload {
  snapshot?: SQLBotNewPersistedSnapshot
  events: SQLBotNewPersistedContextEvent[]
}

export interface SQLBotNewContextSwitchCreatePayload {
  eventType?: SQLBotNewPersistedContextEventType
  recordId?: number
  sourceKind: SourceKind
  sourceId?: string
  sourceIds?: string[]
  combinationId?: string
  combinationName?: string
  datasourceId?: string
  modelId?: string
  themeId?: string
  themeName?: string
  selectionTitle?: string
  selectionMeta?: string
  datasourcePending?: boolean
  eventPayload?: Record<string, any>
}

export interface SQLBotNewSnapshotUpsertPayload {
  activeSourceKind: SourceKind
  activeSourceId?: string
  activeSourceIds?: string[]
  activeCombinationId?: string
  activeCombinationName?: string
  activeDatasourceId?: string
  activeModelId?: string
  activeThemeId?: string
  activeThemeName?: string
  selectionTitle?: string
  selectionMeta?: string
  datasourcePending?: boolean
  latestRecordId?: number
  latestQuestion?: string
}
