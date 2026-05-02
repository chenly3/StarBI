export type SqlbotDerivedAction = 'analysis' | 'predict'

export type SqlbotMessageFlowRecordKind =
  | 'answer'
  | 'fact-answer'
  | 'derived-question'
  | 'derived-answer'
  | 'context-switch'

export interface SqlbotMessageFlowRecord {
  kind?: SqlbotMessageFlowRecordKind | string
  localId: string
  id?: number
  sourceRecordId?: number
  sourceLocalId?: string
  derivedAction?: SqlbotDerivedAction
  derivedQuestion?: string
  executionContext?: Record<string, any>
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
  error?: string
  createTime: number
  finish: boolean
  recommendQuestions: string[]
  pendingChartHydration?: boolean
  assistantEventPersisted?: boolean
}

type DerivedRecordFactory<T extends SqlbotMessageFlowRecord> = (
  record: SqlbotMessageFlowRecord
) => T

type CreateDerivedRecordOptions<T extends SqlbotMessageFlowRecord> = {
  action: SqlbotDerivedAction
  sourceRecord: SqlbotMessageFlowRecord
  question: string
  createTime?: string | number
  localId?: string
  assistantEventPersisted?: boolean
  factory?: DerivedRecordFactory<T>
}

const normalizeRecordTimestamp = (value?: string | number | null) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const parsed = new Date(String(value || '')).getTime()
  return Number.isFinite(parsed) ? parsed : Date.now()
}

const createLocalId = (
  prefix: 'derived-question' | 'derived-answer',
  sourceRecord: SqlbotMessageFlowRecord,
  action: SqlbotDerivedAction
) =>
  `${prefix}-${sourceRecord.localId}-${action}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`

const identityFactory = <T extends SqlbotMessageFlowRecord>(record: SqlbotMessageFlowRecord) =>
  record as T

export const isFactAnswerRecord = (record: SqlbotMessageFlowRecord) =>
  !record.kind || record.kind === 'answer' || record.kind === 'fact-answer'

export const isDerivedQuestionRecord = (record: SqlbotMessageFlowRecord) =>
  record.kind === 'derived-question'

export const isDerivedAnswerRecord = (record: SqlbotMessageFlowRecord) =>
  record.kind === 'derived-answer'

export const buildDerivedQuestionText = (
  action: SqlbotDerivedAction,
  sourceRecord: SqlbotMessageFlowRecord
) => {
  const question = String(sourceRecord.question || '').trim()
  const target = question ? `“${question}”` : '上面的结果'
  return action === 'analysis' ? `对${target}做数据解读` : `对${target}做趋势预测`
}

export const getDerivedActionKey = (
  sourceRecord: SqlbotMessageFlowRecord,
  action: SqlbotDerivedAction
) => `${sourceRecord.id || sourceRecord.localId}:${action}`

export const stripInlineInsightsFromFactRecord = <T extends SqlbotMessageFlowRecord>(
  record: T
) => {
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

export const createDerivedQuestionRecord = <T extends SqlbotMessageFlowRecord>({
  action,
  sourceRecord,
  question,
  createTime,
  localId,
  assistantEventPersisted,
  factory = identityFactory
}: CreateDerivedRecordOptions<T>): T =>
  factory({
    kind: 'derived-question',
    localId: localId || createLocalId('derived-question', sourceRecord, action),
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
  })

export const createDerivedAnswerRecord = <T extends SqlbotMessageFlowRecord>({
  action,
  sourceRecord,
  question,
  createTime,
  localId,
  assistantEventPersisted,
  factory = identityFactory
}: CreateDerivedRecordOptions<T>): T =>
  factory({
    kind: 'derived-answer',
    localId: localId || createLocalId('derived-answer', sourceRecord, action),
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
  })

export const createLegacyInsightDerivedMessages = <T extends SqlbotMessageFlowRecord>(
  sourceRecord: T,
  coveredActions = new Set<string>(),
  factory?: DerivedRecordFactory<T>
): T[] => {
  const records: T[] = []
  const legacyAnalysis = String(sourceRecord.analysis || '').trim()
  const legacyPredict = String(sourceRecord.predict || '').trim()

  if (legacyAnalysis && !coveredActions.has(getDerivedActionKey(sourceRecord, 'analysis'))) {
    const question = buildDerivedQuestionText('analysis', sourceRecord)
    records.push(
      createDerivedQuestionRecord({
        action: 'analysis',
        sourceRecord,
        question,
        assistantEventPersisted: true,
        factory
      })
    )
    const answer = createDerivedAnswerRecord({
      action: 'analysis',
      sourceRecord,
      question,
      assistantEventPersisted: true,
      factory
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
      createDerivedQuestionRecord({
        action: 'predict',
        sourceRecord,
        question,
        assistantEventPersisted: true,
        factory
      })
    )
    const answer = createDerivedAnswerRecord({
      action: 'predict',
      sourceRecord,
      question,
      assistantEventPersisted: true,
      factory
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

export const getExistingDerivedActionKeys = (records: SqlbotMessageFlowRecord[]) => {
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

export const createLegacyInsightDerivedMessagesForRestore = <
  T extends SqlbotMessageFlowRecord
>(
  records: T[],
  factory?: DerivedRecordFactory<T>
) => {
  const coveredActions = getExistingDerivedActionKeys(records)
  return records.flatMap(record => {
    if (!isFactAnswerRecord(record)) {
      return [record]
    }
    const derivedMessages = createLegacyInsightDerivedMessages(record, coveredActions, factory)
    derivedMessages.forEach(derivedRecord => {
      if (isDerivedAnswerRecord(derivedRecord) && derivedRecord.derivedAction) {
        coveredActions.add(getDerivedActionKey(record, derivedRecord.derivedAction))
      }
    })
    return [record, ...derivedMessages]
  })
}

export const sortRestoredMessageFlowRecords = <T extends SqlbotMessageFlowRecord>(records: T[]) =>
  records.sort((left, right) => {
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

export const hasUnfinishedDerivedAnswer = (
  records: SqlbotMessageFlowRecord[],
  sourceRecord: SqlbotMessageFlowRecord,
  action: SqlbotDerivedAction
) =>
  records.some(record => {
    return (
      isDerivedAnswerRecord(record) &&
      record.derivedAction === action &&
      (record.sourceRecordId === sourceRecord.id || record.sourceLocalId === sourceRecord.localId) &&
      (!record.finish || record.analysisLoading || record.predictLoading)
    )
  })

export const findLatestOriginalQuestionInRecords = (records: SqlbotMessageFlowRecord[]) =>
  [...records]
    .reverse()
    .find(record => isFactAnswerRecord(record) && String(record.question || '').trim())
    ?.question || ''
