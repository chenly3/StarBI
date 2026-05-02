# SQLBot Quick BI Message Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden SQLBot New into a Quick BI-style alternating message flow where fact answers, recommendation actions, derived interpretation questions, derived answers, and history restore behavior are contractually separated and browser-verified.

**Architecture:** Continue from the current `main` implementation instead of rewriting SQLBot New. Extract message-flow state rules into a small pure TypeScript module, make history restore and derived-action behavior testable outside the 3k+ line composable, then add UI/state hardening and agent-browser acceptance evidence. DataEase-to-SQLBot backend proxying is documented as a service-boundary follow-up unless the implementation owner explicitly accepts it into this change.

**Tech Stack:** Vue 3, TypeScript, Vite, Element Plus Secondary, source-level TypeScript contract tests compiled with `tsc`, SQLBot FastAPI/SQLModel backend pytest, `agent-browser` browser verification.

---

## Source Inputs

- Requirement draft: `docs/superpowers/specs/2026-05-02-sqlbot-quickbi-message-flow-draft-plan.md`
- Prior implementation draft: `docs/superpowers/plans/2026-05-01-sqlbot-message-flow-implementation-plan.md`
- Current partial implementation commit: `9744cf6 feat: improve sqlbot message flow`

## Scope Decision

Use Autoplan Approach B: **Message Contract Stabilization**.

This implementation plan does not redesign SQLBot generation, model config, training pages, terminology pages, DataEase system settings, permissions, or the full DataEase backend proxy layer. It closes the current SQLBot New message-flow contract, history restore contract, UI state contract, and browser verification gap.

## File Map

- Create: `dataease/core/core-frontend/src/views/sqlbot-new/sqlbotMessageFlow.ts` — pure helpers for message kind checks, derived question text, derived action keys, legacy inline insight conversion, restore ordering, duplicate-action detection, and latest original question lookup.
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts` — executable state-level contract tests for the pure message-flow helpers.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts` — import pure helpers, remove duplicated local helper logic, keep side-effectful streaming/persistence logic in the composable.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts` — assert the composable uses the pure helper module and preserves no-generation restore behavior.
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue` — explicit recommendation/action bridge between fact answers and derived questions.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue` — render action suggestions as a separate message-flow node and make recommendation clicks prefill the composer by default.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/RecommendQuestions.vue` — keep as a presentational list for recommended questions if reused by the action suggestions message.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue` — add empty, partial, failed, and recovery UI states with stable DOM hooks for contract/browser checks.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue` — add a small system-generated label so users can distinguish automatic derived questions from typed user questions without hiding the message.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts` — extend existing predict contract for action suggestions and derived answer states.
- Create: `docs/superpowers/plans/2026-05-02-sqlbot-quickbi-message-flow-qa.md` — browser QA checklist and evidence manifest consumed during final verification.

## Verification Commands

Run from `dataease/core/core-frontend` unless noted:

```bash
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-message-flow-state-contract
SQLBOT_MESSAGE_FLOW_STATE_CONTRACTS=1 node /tmp/sqlbot-message-flow-state-contract/__tests__/sqlbot-message-flow-state-contract.spec.js
```

```bash
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-message-flow-contract
SQLBOT_MESSAGE_FLOW_CONTRACTS=1 node /tmp/sqlbot-message-flow-contract/sqlbot-message-flow-contract.spec.js
```

```bash
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-predict-ui-contract
SQLBOT_PREDICT_UI_CONTRACTS=1 node /tmp/sqlbot-predict-ui-contract/sqlbot-predict-ui-contract.spec.js
```

```bash
npm run ts:check
```

Run from `SQLBot/backend`:

```bash
python3 -m pytest \
  tests/chat/test_record_merge.py \
  tests/chat/test_sqlbot_new_derived_message_contract.py \
  tests/chat/test_sqlbot_new_empty_record_contract.py \
  tests/chat/test_recommend_questions_prompt.py \
  -v
```

## Task 1: Add Failing State-Level Message Flow Contracts

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts`
- No production code changes in this task.

- [ ] **Step 1: Create the failing state contract test**

Create `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts` with this content:

```ts
/**
 * Executable state contract for SQLBot New Quick BI-style message flow.
 * Run with SQLBOT_MESSAGE_FLOW_STATE_CONTRACTS=1 after TypeScript compilation.
 */

import {
  buildDerivedQuestionText,
  createLegacyInsightDerivedMessagesForRestore,
  findLatestOriginalQuestionInRecords,
  getDerivedActionKey,
  hasUnfinishedDerivedAnswer,
  isDerivedAnswerRecord,
  isDerivedQuestionRecord,
  isFactAnswerRecord,
  sortRestoredMessageFlowRecords,
  stripInlineInsightsFromFactRecord,
  type SqlbotMessageFlowRecord
} from '../sqlbotMessageFlow'

type ContractCase = {
  name: string
  run: () => void
}

declare const process:
  | {
      env?: Record<string, string | undefined>
      exitCode?: number
    }
  | undefined

const fail = (message: string): never => {
  throw new Error(message)
}

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    fail(message)
  }
}

const baseFactRecord = (overrides: Partial<SqlbotMessageFlowRecord> = {}) =>
  ({
    kind: 'fact-answer',
    localId: 'fact-1',
    id: 101,
    question: '按品线统计销售金额',
    chartAnswer: '销售金额按品线统计完成。',
    sqlAnswer: 'select product_line, sum(amount) from sales group by product_line',
    analysis: '',
    analysisThinking: '',
    analysisLoading: false,
    predict: '',
    predictThinking: '',
    predictLoading: false,
    createTime: 1000,
    finish: true,
    recommendQuestions: []
  }) satisfies SqlbotMessageFlowRecord & Partial<SqlbotMessageFlowRecord>

const contractCases: ContractCase[] = [
  {
    name: 'record kind helpers classify fact and derived messages',
    run() {
      assert(isFactAnswerRecord(baseFactRecord()), 'fact-answer should be a fact record')
      assert(isFactAnswerRecord({ ...baseFactRecord(), kind: 'answer' }), 'legacy answer is fact')
      assert(
        isDerivedQuestionRecord({ ...baseFactRecord(), kind: 'derived-question' }),
        'derived-question should be derived question'
      )
      assert(
        isDerivedAnswerRecord({ ...baseFactRecord(), kind: 'derived-answer' }),
        'derived-answer should be derived answer'
      )
    }
  },
  {
    name: 'derived question text mirrors Quick BI-style automatic user question',
    run() {
      const text = buildDerivedQuestionText('analysis', baseFactRecord())
      assert(text === '对“按品线统计销售金额”做数据解读', `unexpected analysis text: ${text}`)
      const predictText = buildDerivedQuestionText('predict', baseFactRecord())
      assert(predictText === '对“按品线统计销售金额”做趋势预测', `unexpected predict text: ${predictText}`)
    }
  },
  {
    name: 'fact records strip inline insights before fact card rendering',
    run() {
      const record = baseFactRecord({
        analysis: '这是旧的内联解读',
        analysisThinking: '旧推理',
        analysisError: '旧错误',
        analysisLoading: true,
        predict: '这是旧的内联预测',
        predictThinking: '旧预测推理',
        predictError: '旧预测错误',
        predictLoading: true
      })
      stripInlineInsightsFromFactRecord(record)
      assert(record.analysis === '', 'analysis should be stripped')
      assert(record.analysisThinking === '', 'analysis thinking should be stripped')
      assert(record.analysisError === '', 'analysis error should be stripped')
      assert(record.analysisLoading === false, 'analysis loading should be false')
      assert(record.predict === '', 'predict should be stripped')
      assert(record.predictThinking === '', 'predict thinking should be stripped')
      assert(record.predictError === '', 'predict error should be stripped')
      assert(record.predictLoading === false, 'predict loading should be false')
    }
  },
  {
    name: 'legacy inline insights convert to alternating derived messages once',
    run() {
      const fact = baseFactRecord({
        analysis: '华东品线贡献最高，建议优先补货。',
        analysisThinking: '先比较品线销售金额。',
        predict: '预计下周仍保持增长。',
        predictThinking: '根据趋势外推。'
      })
      const restored = createLegacyInsightDerivedMessagesForRestore([fact])
      assert(restored.length === 5, `expected fact + 4 derived records, got ${restored.length}`)
      assert(restored[0].kind === 'fact-answer', 'fact should stay first')
      assert(restored[1].kind === 'derived-question', 'analysis question should be second')
      assert(restored[2].kind === 'derived-answer', 'analysis answer should be third')
      assert(restored[3].kind === 'derived-question', 'predict question should be fourth')
      assert(restored[4].kind === 'derived-answer', 'predict answer should be fifth')
      assert(restored[0].analysis === '', 'fact inline analysis should be stripped after conversion')
      assert(restored[0].predict === '', 'fact inline predict should be stripped after conversion')
    }
  },
  {
    name: 'persisted derived answers win over legacy inline fields',
    run() {
      const fact = baseFactRecord({
        analysis: '旧解读不应重复展示。',
        predict: '旧预测不应重复展示。'
      })
      const persistedAnalysisAnswer: SqlbotMessageFlowRecord = {
        ...baseFactRecord({
          kind: 'derived-answer',
          localId: 'analysis-answer-1',
          sourceRecordId: 101,
          sourceLocalId: 'fact-1',
          derivedAction: 'analysis',
          analysis: '已保存的新解读。',
          createTime: 1200,
          finish: true
        })
      }
      const restored = createLegacyInsightDerivedMessagesForRestore([fact, persistedAnalysisAnswer])
      const analysisAnswers = restored.filter(
        item => item.kind === 'derived-answer' && item.derivedAction === 'analysis'
      )
      const predictAnswers = restored.filter(
        item => item.kind === 'derived-answer' && item.derivedAction === 'predict'
      )
      assert(analysisAnswers.length === 1, `expected one analysis answer, got ${analysisAnswers.length}`)
      assert(predictAnswers.length === 1, `expected one converted predict answer, got ${predictAnswers.length}`)
      assert(analysisAnswers[0].analysis === '已保存的新解读。', 'persisted analysis should win')
    }
  },
  {
    name: 'restore sorting keeps fact before derived question before derived answer at same timestamp',
    run() {
      const records = sortRestoredMessageFlowRecords([
        { ...baseFactRecord(), kind: 'derived-answer', localId: 'a', createTime: 1000 },
        { ...baseFactRecord(), kind: 'derived-question', localId: 'q', createTime: 1000 },
        { ...baseFactRecord(), kind: 'fact-answer', localId: 'f', createTime: 1000 }
      ])
      assert(records.map(item => item.kind).join(',') === 'fact-answer,derived-question,derived-answer', 'unexpected order')
    }
  },
  {
    name: 'duplicate derived action lock detects unfinished answer for same source and action',
    run() {
      const fact = baseFactRecord()
      const unfinished: SqlbotMessageFlowRecord = {
        ...baseFactRecord({
          kind: 'derived-answer',
          localId: 'analysis-loading',
          sourceRecordId: 101,
          sourceLocalId: 'fact-1',
          derivedAction: 'analysis',
          analysisLoading: true,
          finish: false
        })
      }
      assert(
        hasUnfinishedDerivedAnswer([fact, unfinished], fact, 'analysis'),
        'unfinished analysis should block duplicate action'
      )
      assert(
        !hasUnfinishedDerivedAnswer([fact, unfinished], fact, 'predict'),
        'unfinished analysis should not block predict'
      )
    }
  },
  {
    name: 'latest original question ignores derived messages',
    run() {
      const latest = findLatestOriginalQuestionInRecords([
        baseFactRecord({ localId: 'first', question: '第一问', createTime: 1000 }),
        baseFactRecord({
          kind: 'derived-question',
          localId: 'derived',
          question: '对“第二问”做数据解读',
          createTime: 3000
        }),
        baseFactRecord({ localId: 'second', question: '第二问', createTime: 2000 })
      ])
      assert(latest === '第二问', `unexpected latest original question: ${latest}`)
    }
  },
  {
    name: 'derived action key is stable by source record id then local id',
    run() {
      assert(getDerivedActionKey(baseFactRecord(), 'analysis') === '101:analysis', 'id key mismatch')
      assert(
        getDerivedActionKey(baseFactRecord({ id: undefined, localId: 'local-only' }), 'predict') === 'local-only:predict',
        'local key mismatch'
      )
    }
  }
]

export const runSqlbotMessageFlowStateContracts = async () => {
  for (const contractCase of contractCases) {
    contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' && process?.env?.SQLBOT_MESSAGE_FLOW_STATE_CONTRACTS === '1'

if (shouldRunContracts) {
  runSqlbotMessageFlowStateContracts()
    .then(() => {
      console.log(`[sqlbot-message-flow-state] ${contractCases.length} contract checks passed`)
    })
    .catch(error => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      console.error(message)
      if (typeof process !== 'undefined') {
        process.exitCode = 1
      }
    })
}
```

- [ ] **Step 2: Run the new state contract and confirm it fails before implementation**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-message-flow-state-contract
```

Expected: FAIL with an error equivalent to:

```text
Cannot find module '../sqlbotMessageFlow'
```

- [ ] **Step 3: Commit the failing test**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
git add dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts
git commit -m "test(sqlbot): add message flow state contracts"
```

Expected: commit succeeds. If the branch policy forbids committing at this point, leave the file staged and record the reason in the final execution report.

## Task 2: Extract Pure Message Flow Helpers

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/sqlbotMessageFlow.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Test: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts`

- [ ] **Step 1: Create the pure helper module**

Create `dataease/core/core-frontend/src/views/sqlbot-new/sqlbotMessageFlow.ts` with this content:

```ts
export type SqlbotDerivedAction = 'analysis' | 'predict'

export type SqlbotMessageFlowRecordKind =
  | 'answer'
  | 'fact-answer'
  | 'derived-question'
  | 'derived-answer'
  | 'context-switch'

export interface SqlbotMessageFlowRecord {
  kind?: SqlbotMessageFlowRecordKind
  localId: string
  id?: number
  sourceRecordId?: number
  sourceLocalId?: string
  derivedAction?: SqlbotDerivedAction
  derivedQuestion?: string
  question: string
  sqlAnswer?: string
  chartAnswer?: string
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
  finish?: boolean
  recommendQuestions?: string[]
  pendingChartHydration?: boolean
  assistantEventPersisted?: boolean
}

const normalizeTimestamp = (value?: string | number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const timestamp = new Date(value || Date.now()).getTime()
  return Number.isNaN(timestamp) ? Date.now() : timestamp
}

export const isFactAnswerRecord = (record: Pick<SqlbotMessageFlowRecord, 'kind'>) =>
  !record.kind || record.kind === 'answer' || record.kind === 'fact-answer'

export const isDerivedQuestionRecord = (record: Pick<SqlbotMessageFlowRecord, 'kind'>) =>
  record.kind === 'derived-question'

export const isDerivedAnswerRecord = (record: Pick<SqlbotMessageFlowRecord, 'kind'>) =>
  record.kind === 'derived-answer'

export const buildDerivedQuestionText = (
  action: SqlbotDerivedAction,
  sourceRecord: Pick<SqlbotMessageFlowRecord, 'question'>
) => {
  const question = String(sourceRecord.question || '').trim()
  const target = question ? `“${question}”` : '上面的结果'
  return action === 'analysis' ? `对${target}做数据解读` : `对${target}做趋势预测`
}

export const getDerivedActionKey = (
  sourceRecord: Pick<SqlbotMessageFlowRecord, 'id' | 'localId'>,
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
  factory
}: {
  action: SqlbotDerivedAction
  sourceRecord: T
  question: string
  createTime?: string | number
  localId?: string
  assistantEventPersisted?: boolean
  factory: (record: SqlbotMessageFlowRecord) => T
}) =>
  factory({
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
    question,
    sqlAnswer: '',
    chartAnswer: '',
    error: '',
    createTime: normalizeTimestamp(createTime),
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
  factory
}: {
  action: SqlbotDerivedAction
  sourceRecord: T
  question: string
  createTime?: string | number
  localId?: string
  assistantEventPersisted?: boolean
  factory: (record: SqlbotMessageFlowRecord) => T
}) =>
  factory({
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
    createTime: normalizeTimestamp(createTime),
    finish: false,
    recommendQuestions: [],
    pendingChartHydration: false,
    assistantEventPersisted
  })

export const createLegacyInsightDerivedMessages = <T extends SqlbotMessageFlowRecord>(
  sourceRecord: T,
  coveredActions: Set<string>,
  factory: (record: SqlbotMessageFlowRecord) => T
) => {
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

export const getExistingDerivedActionKeys = <T extends SqlbotMessageFlowRecord>(records: T[]) => {
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

export const createLegacyInsightDerivedMessagesForRestore = <T extends SqlbotMessageFlowRecord>(
  records: T[],
  factory: (record: SqlbotMessageFlowRecord) => T = record => record as T
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
  [...records].sort((left, right) => {
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

export const hasUnfinishedDerivedAnswer = <T extends SqlbotMessageFlowRecord>(
  records: T[],
  sourceRecord: T,
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

export const findLatestOriginalQuestionInRecords = <T extends SqlbotMessageFlowRecord>(
  records: T[]
) =>
  [...records]
    .reverse()
    .find(record => isFactAnswerRecord(record) && String(record.question || '').trim())?.question ||
  ''
```

- [ ] **Step 2: Update the state contract test to use identity factory explicitly where needed**

In `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts`, ensure the call that converts legacy insights passes the default identity factory by leaving the second argument undefined:

```ts
const restored = createLegacyInsightDerivedMessagesForRestore([fact])
```

Expected: no change if Step 1 already used this exact call.

- [ ] **Step 3: Run the state contract and verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-message-flow-state-contract
SQLBOT_MESSAGE_FLOW_STATE_CONTRACTS=1 node /tmp/sqlbot-message-flow-state-contract/__tests__/sqlbot-message-flow-state-contract.spec.js
```

Expected:

```text
[sqlbot-message-flow-state] 9 contract checks passed
```

- [ ] **Step 4: Import pure helpers in the conversation composable**

Modify the imports near the top of `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`:

```ts
import {
  buildDerivedQuestionText,
  createDerivedAnswerRecord,
  createDerivedQuestionRecord,
  createLegacyInsightDerivedMessagesForRestore,
  findLatestOriginalQuestionInRecords,
  getDerivedActionKey,
  hasUnfinishedDerivedAnswer,
  isDerivedAnswerRecord,
  isDerivedQuestionRecord,
  isFactAnswerRecord,
  sortRestoredMessageFlowRecords,
  stripInlineInsightsFromFactRecord,
  type SqlbotDerivedAction,
  type SqlbotMessageFlowRecord
} from './sqlbotMessageFlow'
```

Then replace the local `type SqlbotNewDerivedAction = 'analysis' | 'predict'` with:

```ts
type SqlbotNewDerivedAction = SqlbotDerivedAction
```

Also make `SqlbotNewConversationRecord` extend the pure record interface:

```ts
export interface SqlbotNewConversationRecord extends SqlbotMessageFlowRecord {
  contextSwitch?: SqlbotNewContextSwitchMeta
  chatId?: number
  datasource?: number
  executionContext?: SqlbotNewExecutionContext
  clarification?: SqlbotNewClarificationState
  interpretation?: SqlbotNewInterpretationMeta
  executionSummary?: SqlbotNewExecutionSummary
  reasoning?: Record<string, any>
  sql?: string
  chart?: string
  data?: Record<string, any>
  finishTime?: string | number
  duration?: number
  totalTokens?: number
  display?: SqlbotNewConversationRecordDisplayState
}
```

- [ ] **Step 5: Replace local factory implementations with wrappers around the pure helpers**

In `useSqlbotNewConversation.ts`, keep Vue `reactive` wrapping local to the composable:

```ts
const reactiveRecordFactory = (record: SqlbotMessageFlowRecord) =>
  reactive(record) as SqlbotNewConversationRecord

const createDerivedQuestionMessage = (options: {
  action: SqlbotNewDerivedAction
  sourceRecord: SqlbotNewConversationRecord
  question: string
  createTime?: string | number
  localId?: string
  assistantEventPersisted?: boolean
}) =>
  createDerivedQuestionRecord({
    ...options,
    factory: reactiveRecordFactory
  })

const createDerivedAnswerMessage = (options: {
  action: SqlbotNewDerivedAction
  sourceRecord: SqlbotNewConversationRecord
  question: string
  createTime?: string | number
  localId?: string
  assistantEventPersisted?: boolean
}) =>
  createDerivedAnswerRecord({
    ...options,
    factory: reactiveRecordFactory
  })
```

Remove local definitions that duplicate these imported helpers:

```ts
buildDerivedQuestionText
getDerivedActionKey
stripInlineInsightsFromFactRecord
createLegacyInsightDerivedMessages
getExistingDerivedActionKeys
hasUnfinishedDerivedAnswer
createLegacyInsightDerivedMessagesForRestore
sortRestoredMessageFlowRecords
findLatestOriginalQuestionInRecords
isFactAnswerRecord
isDerivedQuestionRecord
isDerivedAnswerRecord
```

- [ ] **Step 6: Use the pure sort helper during history restore**

Replace the inline restored-record sort in `restoreHistorySession` with:

```ts
const restoredRecords = sortRestoredMessageFlowRecords(
  createLegacyInsightDerivedMessagesForRestore(
    [...baseRecords, ...derivedEventRecords],
    reactiveRecordFactory
  )
)
```

Keep the existing stripping pass:

```ts
restoredRecords.forEach(stripInlineInsightsFromFactRecord)
```

- [ ] **Step 7: Update `hasUnfinishedDerivedAnswer` calls**

Replace calls like:

```ts
hasUnfinishedDerivedAnswer(sourceRecord, 'analysis')
```

with:

```ts
hasUnfinishedDerivedAnswer(conversationRecords.value, sourceRecord, 'analysis')
```

Do the same for `'predict'`.

- [ ] **Step 8: Run contracts and TypeScript checks**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-message-flow-state-contract
SQLBOT_MESSAGE_FLOW_STATE_CONTRACTS=1 node /tmp/sqlbot-message-flow-state-contract/__tests__/sqlbot-message-flow-state-contract.spec.js
npm run ts:check
```

Expected:

```text
[sqlbot-message-flow-state] 9 contract checks passed
```

and `npm run ts:check` exits with code `0`.

- [ ] **Step 9: Commit the helper extraction**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-frontend/src/views/sqlbot-new/sqlbotMessageFlow.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts
git commit -m "refactor(sqlbot): extract message flow state helpers"
```

Expected: commit succeeds or the executor records why commits are being batched.

## Task 3: Strengthen Restore and Source Contracts

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Test: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`

- [ ] **Step 1: Add source-contract assertions for pure helper usage and no generation on restore**

In `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`, add these source reads after the existing `starbiResultCardSource` line:

```ts
const messageFlowSource = readSource('src/views/sqlbot-new/sqlbotMessageFlow.ts')
```

Add this contract case before the history restore case:

```ts
{
  name: 'conversation composable delegates message flow rules to pure helper module',
  run() {
    assertMatch(
      conversationSource,
      /from '.\/sqlbotMessageFlow'/,
      'conversation imports sqlbotMessageFlow helpers'
    )
    assertMatch(messageFlowSource, /export const sortRestoredMessageFlowRecords/, 'restore sort helper')
    assertMatch(messageFlowSource, /export const createLegacyInsightDerivedMessagesForRestore/, 'legacy conversion helper')
    assertMatch(messageFlowSource, /export const hasUnfinishedDerivedAnswer/, 'duplicate lock helper')
    assertMatch(
      restoreHistorySource,
      /sortRestoredMessageFlowRecords\(/,
      'restore uses stable message sort helper'
    )
  }
}
```

Then extend the existing no-generation assertion to include old request names too:

```ts
assertNotMatch(
  restoreHistorySource,
  /requestDerivedRecordAnalysis|requestDerivedRecordPredict|requestRecordAnalysis|requestRecordPredict|streamSQLBotRecordAnalysis|streamSQLBotRecordPredict/,
  'history restore must not generate analysis or predict'
)
```

- [ ] **Step 2: Run the source contract**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-message-flow-contract
SQLBOT_MESSAGE_FLOW_CONTRACTS=1 node /tmp/sqlbot-message-flow-contract/sqlbot-message-flow-contract.spec.js
```

Expected:

```text
[sqlbot-message-flow] 6 contract checks passed
```

If the number is different because additional existing contract cases remain, the command must still exit with code `0`.

- [ ] **Step 3: Commit restore contract hardening**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts
git commit -m "test(sqlbot): harden history restore message contracts"
```

Expected: commit succeeds or batching is documented.

## Task 4: Add Explicit Action Suggestions Message

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`
- Test: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`

- [ ] **Step 1: Create the action suggestions component**

Create `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import RecommendQuestions from '@/views/sqlbot-new/components/RecommendQuestions.vue'
import { type SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

const props = withDefaults(
  defineProps<{
    record: SqlbotNewConversationRecord
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  (event: 'interpret', record: SqlbotNewConversationRecord): void
  (event: 'predict', record: SqlbotNewConversationRecord): void
  (event: 'prefill-question', question: string): void
}>()

const questions = computed(() => props.record.recommendQuestions || [])
</script>

<template>
  <section class="action-suggestions-message" data-testid="sqlbot-action-suggestions">
    <div class="action-suggestions-card">
      <div class="action-suggestions-head">
        <span class="action-suggestions-kicker">下一步可以这样分析</span>
        <span class="action-suggestions-note">点击后会生成新的问题消息</span>
      </div>

      <div class="action-suggestions-actions">
        <button
          class="action-suggestion-button primary"
          type="button"
          :disabled="loading || !record.id"
          data-testid="sqlbot-action-analysis"
          @click="emit('interpret', record)"
        >
          做数据解读
        </button>
        <button
          class="action-suggestion-button"
          type="button"
          :disabled="loading || !record.id"
          data-testid="sqlbot-action-predict"
          @click="emit('predict', record)"
        >
          看趋势预测
        </button>
      </div>

      <RecommendQuestions
        v-if="questions.length"
        :questions="questions"
        :loading="loading"
        title="推荐追问"
        @select="question => emit('prefill-question', question)"
      />
    </div>
  </section>
</template>

<style scoped lang="less">
.action-suggestions-message {
  width: min(var(--sqlbot-column-width), 100%);
  margin: -8px 0 24px;
}

.action-suggestions-card {
  padding: 16px 18px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 20px;
  background: rgba(248, 251, 255, 0.9);
}

.action-suggestions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.action-suggestions-kicker {
  color: #1e3a8a;
  font-size: 14px;
  line-height: 22px;
  font-weight: 800;
}

.action-suggestions-note {
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.action-suggestions-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-suggestion-button {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  border-radius: 999px;
  color: #1d4ed8;
  font-size: 14px;
  line-height: 20px;
  font-weight: 700;
  cursor: pointer;
  background: #fff;
}

.action-suggestion-button.primary {
  color: #fff;
  border-color: #2563eb;
  background: #2563eb;
}

.action-suggestion-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

@media (max-width: 768px) {
  .action-suggestions-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .action-suggestion-button {
    flex: 1 1 140px;
  }
}
</style>
```

- [ ] **Step 2: Render action suggestions after fact answers in `index.vue`**

Add the import:

```ts
import SqlbotActionSuggestionsMessage from '@/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue'
```

In the fact-answer branch near the existing `SqlbotNewConversationRecord`, render the action suggestions directly after the fact answer card:

```vue
<article v-else-if="isFactAnswerRecord(record)" class="conversation-turn">
  <div class="conversation-turn-answer">
    <div class="conversation-turn-meta">
      第 {{ conversationAnswerTurnMap[record.localId] || 1 }} 轮问答
    </div>
    <SqlbotNewConversationRecord
      :record="record"
      :source-insights="sourceInsights"
      :conversation-loading="conversationLoading"
      @interpret="handleInterpretRecord"
      @predict="handlePredictRecord"
      @followup="handleFollowUpRecord"
      @retry="handleRetryRecord"
      @learning-fix="openLearningFixDialog"
      @prefill-question="handlePrefillQuestion"
      @view-execution-details="openExecutionDetails"
      @insert-dashboard="openInsertTargetDialog"
      @clarify-record="handleClarificationRecord"
      @clarification-selection-change="handleClarificationSelectionChange"
    />
    <SqlbotActionSuggestionsMessage
      v-if="record.finish && !record.error && !record.clarification"
      :record="record"
      :loading="conversationLoading"
      @interpret="handleInterpretRecord"
      @predict="handlePredictRecord"
      @prefill-question="handlePrefillQuestion"
    />
  </div>
</article>
```

If `SqlbotNewConversationRecord` currently emits analysis/predict buttons inside `StarbiResultCard`, leave the buttons for this task only if removing them would require broader style changes. Task 5 will make the visual hierarchy unambiguous.

- [ ] **Step 3: Ensure recommendation clicks prefill instead of submit**

Verify `handlePrefillQuestion` is used for `SqlbotActionSuggestionsMessage @prefill-question`. The function should keep this behavior:

```ts
const handlePrefillQuestion = (question: string) => {
  const normalized = String(question || '').trim()
  if (!normalized) {
    return
  }
  draftQuestion.value = normalized
  pageMode.value = 'result'
  scheduleScrollConversationToBottom('smooth')
}
```

Do not call `submitQuestion` directly from recommendation selection in this task.

- [ ] **Step 4: Extend source contract for action suggestions**

In `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`, add a source read:

```ts
const actionSuggestionsSource = readSource(
  'src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue'
)
```

Add this contract case:

```ts
{
  name: 'action suggestions are a separate bridge before derived messages',
  run() {
    assertMatch(indexSource, /SqlbotActionSuggestionsMessage/, 'index renders action suggestions')
    assertMatch(
      actionSuggestionsSource,
      /data-testid="sqlbot-action-suggestions"/,
      'action suggestions test id'
    )
    assertMatch(
      actionSuggestionsSource,
      /点击后会生成新的问题消息/,
      'action suggestions explains message creation'
    )
    assertMatch(
      actionSuggestionsSource,
      /@select="question => emit\('prefill-question', question\)"/,
      'recommended questions prefill instead of auto-submit'
    )
  }
}
```

- [ ] **Step 5: Run source contract and TypeScript checks**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-message-flow-contract
SQLBOT_MESSAGE_FLOW_CONTRACTS=1 node /tmp/sqlbot-message-flow-contract/sqlbot-message-flow-contract.spec.js
npm run ts:check
```

Expected: both commands exit with code `0`.

- [ ] **Step 6: Commit action suggestions bridge**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts
git commit -m "feat(sqlbot): add action suggestions message"
```

Expected: commit succeeds or batching is documented.

## Task 5: Harden Derived Question and Answer UI States

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts`

- [ ] **Step 1: Add system-generated label to derived question messages**

Modify `SqlbotDerivedQuestionMessage.vue` template:

```vue
<template>
  <div class="derived-question-message" data-testid="sqlbot-derived-question">
    <div class="derived-question-bubble">
      <span class="derived-question-label">系统根据你的操作自动提问</span>
      <span class="derived-question-text">{{ questionText }}</span>
    </div>
  </div>
</template>
```

Add styles:

```less
.derived-question-label {
  display: block;
  margin-bottom: 4px;
  color: rgba(248, 251, 255, 0.76);
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
}

.derived-question-text {
  display: block;
}
```

- [ ] **Step 2: Add derived answer display state helpers**

In `SqlbotDerivedAnswerMessage.vue`, add computed helpers after `errorText`:

```ts
const hasContent = computed(() => Boolean(content.value))

const isPartial = computed(() => {
  return Boolean(loading.value && content.value)
})

const emptyText = computed(() => {
  if (loading.value || errorText.value || hasContent.value) {
    return ''
  }
  return props.record.derivedAction === 'predict'
    ? '本次趋势预测没有返回有效内容，可以重新预测。'
    : '本次数据解读没有返回有效内容，可以重新解读。'
})
```

- [ ] **Step 3: Update derived answer template with stable states**

Replace the content area in `SqlbotDerivedAnswerMessage.vue` with:

```vue
<div
  class="derived-answer-card"
  :class="{ loading, partial: isPartial, error: !!errorText, empty: !!emptyText }"
  data-testid="sqlbot-derived-answer"
>
  <div class="derived-answer-head">
    <div>
      <div class="derived-answer-kicker">StarBI</div>
      <div class="derived-answer-title">{{ title }}</div>
    </div>
    <span v-if="usageText" class="derived-answer-usage">{{ usageText }}</span>
  </div>

  <div v-if="loading && !content" class="derived-answer-loading" data-testid="sqlbot-derived-answer-loading">
    <span class="derived-answer-dot"></span>
    <span class="derived-answer-dot"></span>
    <span class="derived-answer-dot"></span>
    <span>正在生成{{ title }}，请稍候</span>
  </div>

  <div v-if="isPartial" class="derived-answer-partial" data-testid="sqlbot-derived-answer-partial">
    正在继续生成，已返回部分{{ title }}内容
  </div>

  <StarbiMarkdown v-if="content" :message="content" />

  <div v-if="emptyText" class="derived-answer-empty" data-testid="sqlbot-derived-answer-empty">
    {{ emptyText }}
  </div>

  <div v-if="errorText" class="derived-answer-error" data-testid="sqlbot-derived-answer-error">
    {{ errorText }}
  </div>
</div>
```

- [ ] **Step 4: Add styles for partial and empty states**

Add to `SqlbotDerivedAnswerMessage.vue` style block:

```less
.derived-answer-card.partial {
  border-color: rgba(37, 99, 235, 0.28);
}

.derived-answer-card.empty {
  border-color: rgba(148, 163, 184, 0.28);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
}

.derived-answer-partial,
.derived-answer-empty {
  margin-bottom: 10px;
  color: #64748b;
  font-size: 14px;
  line-height: 22px;
}
```

- [ ] **Step 5: Extend predict UI contract for derived answer states**

In `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts`, add source reads:

```ts
const derivedQuestionSource = readSource(
  'src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue'
)
const derivedAnswerSource = readSource(
  'src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue'
)
```

Add this contract case:

```ts
{
  name: 'derived messages expose clear user-visible states',
  run() {
    assertMatch(
      derivedQuestionSource,
      /系统根据你的操作自动提问/,
      'derived question system label'
    )
    assertMatch(
      derivedQuestionSource,
      /data-testid="sqlbot-derived-question"/,
      'derived question test id'
    )
    assertMatch(
      derivedAnswerSource,
      /data-testid="sqlbot-derived-answer-loading"/,
      'derived answer loading test id'
    )
    assertMatch(
      derivedAnswerSource,
      /data-testid="sqlbot-derived-answer-partial"/,
      'derived answer partial test id'
    )
    assertMatch(
      derivedAnswerSource,
      /data-testid="sqlbot-derived-answer-empty"/,
      'derived answer empty test id'
    )
    assertMatch(
      derivedAnswerSource,
      /data-testid="sqlbot-derived-answer-error"/,
      'derived answer error test id'
    )
  }
}
```

- [ ] **Step 6: Run contract, type, eslint, and stylelint checks**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-predict-ui-contract
SQLBOT_PREDICT_UI_CONTRACTS=1 node /tmp/sqlbot-predict-ui-contract/sqlbot-predict-ui-contract.spec.js
npm run ts:check
node_modules/.bin/eslint \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue
node_modules/.bin/stylelint \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue
```

Expected: all commands exit with code `0`.

- [ ] **Step 7: Commit derived UI state hardening**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts
git commit -m "feat(sqlbot): clarify derived message states"
```

Expected: commit succeeds or batching is documented.

## Task 6: Preserve Backend Derived Event Contract

**Files:**
- Modify: `SQLBot/backend/tests/chat/test_sqlbot_new_derived_message_contract.py`
- No backend production change unless this contract fails.

- [ ] **Step 1: Add backend contract for generic event persistence**

Append this test to `SQLBot/backend/tests/chat/test_sqlbot_new_derived_message_contract.py`:

```python
    def test_sqlbot_new_derived_events_are_not_special_cased_by_backend(self):
        create_event = find_function(parse_source(CHAT_CRUD_PATH), "create_sqlbot_new_event")
        source = normalized_source(create_event)

        self.assertIn("**payload.model_dump()", source)
        self.assertNotIn("ifpayload.event_type", source)
        self.assertNotIn("elifpayload.event_type", source)
        self.assertNotIn("derived_question", source)
        self.assertNotIn("derived_answer", source)
```

- [ ] **Step 2: Run backend derived contract**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
python3 -m pytest tests/chat/test_sqlbot_new_derived_message_contract.py -v
```

Expected:

```text
5 passed
```

If this fails because the backend intentionally special-cases context events, stop and update this plan before proceeding. The product requirement says derived events must persist generically. Existing generic `payload.model_dump()` persistence satisfies this contract and should not be replaced with explicit field mapping just to satisfy a brittle source assertion.

- [ ] **Step 3: Commit backend contract**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
git add SQLBot/backend/tests/chat/test_sqlbot_new_derived_message_contract.py
git commit -m "test(sqlbot): preserve derived event persistence contract"
```

Expected: commit succeeds or batching is documented.

## Task 7: Document Browser QA Evidence Plan

**Files:**
- Create: `docs/superpowers/plans/2026-05-02-sqlbot-quickbi-message-flow-qa.md`

- [ ] **Step 1: Create QA evidence manifest**

Create `docs/superpowers/plans/2026-05-02-sqlbot-quickbi-message-flow-qa.md`:

```markdown
# SQLBot Quick BI Message Flow QA

## Routes

- SQLBot New: `http://127.0.0.1:8080/#/sqlbotnew`

## Required Evidence Directory

- `tmp/sqlbot-message-flow-qa/`

## Browser Acceptance Cases

### Case 1: Fact Answer Creates Action Suggestions

1. Open SQLBot New.
2. Ask: `按品线统计销售金额`
3. Wait for the fact answer to finish.
4. Verify DOM contains one fact answer and one `data-testid="sqlbot-action-suggestions"` after it.
5. Verify the fact card does not show inline data interpretation content.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/01-fact-action-suggestions.png`
- HAR: `tmp/sqlbot-message-flow-qa/01-fact-action-suggestions.har`

### Case 2: Data Interpretation Alternates Question Then Answer

1. Click `data-testid="sqlbot-action-analysis"`.
2. Verify a `data-testid="sqlbot-derived-question"` node appears.
3. Verify the next AI message contains `data-testid="sqlbot-derived-answer"`.
4. Verify the generated question text starts with `对“按品线统计销售金额”做数据解读`.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.png`
- HAR: `tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.har`

### Case 3: Trend Prediction Alternates Question Then Answer

1. Click `data-testid="sqlbot-action-predict"`.
2. Verify a derived question appears before the prediction answer.
3. Verify prediction answer title is `趋势预测`.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/03-predict-derived-flow.png`
- HAR: `tmp/sqlbot-message-flow-qa/03-predict-derived-flow.har`

### Case 4: History Restore Does Not Regenerate

1. Click the latest history entry created by Case 1 through Case 3.
2. Capture network traffic during restore.
3. Verify no request URL contains `/analysis`.
4. Verify no request URL contains `/predict`.
5. Verify derived question and derived answer messages are restored from saved state.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/04-history-restore.png`
- HAR: `tmp/sqlbot-message-flow-qa/04-history-restore.har`

### Case 5: Recommendation Click Prefills Composer

1. Click a recommended question inside `data-testid="sqlbot-action-suggestions"`.
2. Verify the bottom composer contains the clicked text.
3. Verify no new SQLBot question request starts until the submit button is clicked.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/05-recommend-prefill.png`
- HAR: `tmp/sqlbot-message-flow-qa/05-recommend-prefill.har`

## Pass Criteria

- All screenshots exist.
- All HAR files exist.
- History restore HAR contains no `/analysis` or `/predict`.
- The final test report lists failures, fixes, evidence paths, and residual risks.
```

- [ ] **Step 2: Commit QA manifest**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
git add docs/superpowers/plans/2026-05-02-sqlbot-quickbi-message-flow-qa.md
git commit -m "docs(sqlbot): add message flow qa checklist"
```

Expected: commit succeeds or batching is documented.

## Task 8: Run Full Static and Backend Verification

**Files:**
- No file changes expected.

- [ ] **Step 1: Run all SQLBot New frontend contracts**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-message-flow-state-contract
SQLBOT_MESSAGE_FLOW_STATE_CONTRACTS=1 node /tmp/sqlbot-message-flow-state-contract/__tests__/sqlbot-message-flow-state-contract.spec.js

node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-message-flow-contract
SQLBOT_MESSAGE_FLOW_CONTRACTS=1 node /tmp/sqlbot-message-flow-contract/sqlbot-message-flow-contract.spec.js

node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-predict-ui-contract
SQLBOT_PREDICT_UI_CONTRACTS=1 node /tmp/sqlbot-predict-ui-contract/sqlbot-predict-ui-contract.spec.js
```

Expected:

```text
[sqlbot-message-flow-state] 9 contract checks passed
[sqlbot-message-flow] ... contract checks passed
[sqlbot-predict-ui] ... contract checks passed
```

All commands exit with code `0`.

- [ ] **Step 2: Run TypeScript, ESLint, and Stylelint**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run ts:check
node_modules/.bin/eslint \
  src/views/sqlbot-new/sqlbotMessageFlow.ts \
  src/views/sqlbot-new/useSqlbotNewConversation.ts \
  src/views/sqlbot-new/index.vue \
  src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue \
  src/views/sqlbot-new/__tests__/sqlbot-message-flow-state-contract.spec.ts \
  src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts \
  src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts
node_modules/.bin/stylelint \
  src/views/sqlbot-new/index.vue \
  src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue
```

Expected: all commands exit with code `0`.

- [ ] **Step 3: Run backend tests**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
python3 -m pytest \
  tests/chat/test_record_merge.py \
  tests/chat/test_sqlbot_new_derived_message_contract.py \
  tests/chat/test_sqlbot_new_empty_record_contract.py \
  tests/chat/test_recommend_questions_prompt.py \
  -v
```

Expected: all selected tests pass.

- [ ] **Step 4: Commit static verification fixes only if needed**

If verification required formatting or lint fixes, commit them:

```bash
cd /Users/chenliyong/AI/github/StarBI
git add dataease/core/core-frontend SQLBot/backend
git commit -m "chore(sqlbot): fix message flow verification issues"
```

Expected: commit succeeds only if files changed. If no files changed, skip this step and write `No verification fixes required` in the execution report.

## Task 9: Run Agent-Browser Acceptance

**Files:**
- No source changes expected.
- Evidence written under `tmp/sqlbot-message-flow-qa/`.

- [ ] **Step 1: Restart local services using the project script**

Run the established local startup script from the repository root:

```bash
cd /Users/chenliyong/AI/github/StarBI
./dataease/start-local.sh
```

Expected: DataEase frontend is available at `http://127.0.0.1:8080` and backend services used by SQLBot New are reachable. If the script starts a long-running process, keep it running in the terminal session used for QA.

- [ ] **Step 2: Open SQLBot New with agent-browser**

Run:

```bash
agent-browser open "http://127.0.0.1:8080/#/sqlbotnew"
```

Expected: SQLBot New page loads. If redirected to login, use the existing local test account already used in this workspace, then reopen the route.

- [ ] **Step 3: Execute QA Case 1 through Case 5**

Follow `docs/superpowers/plans/2026-05-02-sqlbot-quickbi-message-flow-qa.md`.

For each case:

```bash
mkdir -p /Users/chenliyong/AI/github/StarBI/tmp/sqlbot-message-flow-qa
```

Use `agent-browser` to interact with the page, capture screenshots, and save HAR/network evidence if the local browser tooling supports it. The final evidence paths must match the QA manifest:

```text
tmp/sqlbot-message-flow-qa/01-fact-action-suggestions.png
tmp/sqlbot-message-flow-qa/01-fact-action-suggestions.har
tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.png
tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.har
tmp/sqlbot-message-flow-qa/03-predict-derived-flow.png
tmp/sqlbot-message-flow-qa/03-predict-derived-flow.har
tmp/sqlbot-message-flow-qa/04-history-restore.png
tmp/sqlbot-message-flow-qa/04-history-restore.har
tmp/sqlbot-message-flow-qa/05-recommend-prefill.png
tmp/sqlbot-message-flow-qa/05-recommend-prefill.har
```

- [ ] **Step 4: Verify history restore HAR manually**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
rg -n '"/analysis"|/analysis|"/predict"|/predict' tmp/sqlbot-message-flow-qa/04-history-restore.har || true
```

Expected: no matches for generated analysis or predict requests during history restore. If there are matches, inspect whether they are static text in response payload or real request URLs. Real request URLs are a P0 failure and must be fixed before completion.

- [ ] **Step 5: Write the final QA report**

Append an execution report to `docs/superpowers/plans/2026-05-02-sqlbot-quickbi-message-flow-qa.md`:

```markdown
## Execution Report

Date: 2026-05-02

| Case | Result | Evidence | Notes |
|---|---|---|---|
| Fact answer creates action suggestions | PASS/FAIL | `tmp/sqlbot-message-flow-qa/01-fact-action-suggestions.png` | ... |
| Data interpretation alternates question then answer | PASS/FAIL | `tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.png` | ... |
| Trend prediction alternates question then answer | PASS/FAIL | `tmp/sqlbot-message-flow-qa/03-predict-derived-flow.png` | ... |
| History restore does not regenerate | PASS/FAIL | `tmp/sqlbot-message-flow-qa/04-history-restore.har` | ... |
| Recommendation click prefills composer | PASS/FAIL | `tmp/sqlbot-message-flow-qa/05-recommend-prefill.png` | ... |

Residual risks:

- ...
```

Use `PASS` or `FAIL` for each row and replace `...` with the observed facts from agent-browser.

- [ ] **Step 6: Commit QA report updates**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
git add docs/superpowers/plans/2026-05-02-sqlbot-quickbi-message-flow-qa.md
git commit -m "test(sqlbot): record message flow browser qa"
```

Expected: commit succeeds only after all QA cases have evidence.

## Task 10: Final Readiness Review

**Files:**
- No source changes expected.

- [ ] **Step 1: Review git diff scope**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI
git status --short
git log --oneline --decorate -8
git diff --stat HEAD~8..HEAD
```

Expected: changed files are limited to SQLBot message-flow helpers, SQLBot New UI components, related tests, and QA docs. If unrelated files appear, identify them in the final report and do not revert user changes without approval.

- [ ] **Step 2: Re-run final verification suite**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run ts:check
node_modules/.bin/eslint \
  src/views/sqlbot-new/sqlbotMessageFlow.ts \
  src/views/sqlbot-new/useSqlbotNewConversation.ts \
  src/views/sqlbot-new/index.vue \
  src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue
node_modules/.bin/stylelint \
  src/views/sqlbot-new/index.vue \
  src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue

cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
python3 -m pytest \
  tests/chat/test_record_merge.py \
  tests/chat/test_sqlbot_new_derived_message_contract.py \
  tests/chat/test_sqlbot_new_empty_record_contract.py \
  tests/chat/test_recommend_questions_prompt.py \
  -v
```

Expected: every command exits with code `0`.

- [ ] **Step 3: Produce final implementation report**

The final report must include:

```markdown
## Implementation Report

Changed behavior:
- ...

Verification:
- Frontend state contracts: PASS
- Frontend source contracts: PASS
- TypeScript: PASS
- ESLint: PASS
- Stylelint: PASS
- Backend pytest: PASS
- Agent-browser QA: PASS

Evidence:
- `tmp/sqlbot-message-flow-qa/...`

Known limits:
- DataEase backend proxy for SQLBot analysis/predict remains a service-boundary follow-up unless implemented in this plan.
```

- [ ] **Step 4: Stop before landing**

Do not merge, amend, squash, or push. Ask the user whether to keep the task commits, squash them, or add another review pass.

## Self-Review

### Spec Coverage

- Fact vs insight separation: Task 2, Task 4, Task 5.
- Derived question before derived answer: Task 1, Task 2, Task 4, Task 9.
- History restore does not regenerate: Task 3, Task 8, Task 9.
- Legacy inline analysis/predict conversion: Task 1, Task 2, Task 3.
- Recommendation click prefill: Task 4, Task 9.
- Browser verification with network evidence: Task 7, Task 9.
- DataEase service boundary clarity: Task 6 and Task 10 known limits.

### Placeholder Scan

This plan intentionally avoids placeholder markers and requires concrete files, commands, expected outputs, and code snippets for every implementation task.

### Type Consistency

The plan uses these names consistently:

- `SqlbotDerivedAction`
- `SqlbotMessageFlowRecord`
- `SqlbotMessageFlowRecordKind`
- `buildDerivedQuestionText`
- `getDerivedActionKey`
- `stripInlineInsightsFromFactRecord`
- `createLegacyInsightDerivedMessagesForRestore`
- `sortRestoredMessageFlowRecords`
- `hasUnfinishedDerivedAnswer`
- `findLatestOriginalQuestionInRecords`
