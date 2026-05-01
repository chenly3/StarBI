<!-- /autoplan restore point: /Users/chenliyong/.gstack/projects/chenly3-StarBI/main-autoplan-restore-20260502-013803.md -->
# SQLBot Message Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework SQLBot New results into an alternating chat message flow where fact answers, derived interpretation questions, and AI interpretation answers are separate restorable messages.

**Architecture:** Reuse SQLBot `ChatSessionEvent.event_payload` to persist derived message metadata, avoiding a new table. Frontend records gain explicit message kinds and source links, while rendering moves from one mixed result card to a conversation turn composed of user messages, AI fact answers, derived question messages, and AI derived answers. History restore reads persisted events plus chat record detail and never triggers `/analysis` or `/predict`.

**Tech Stack:** Vue 3, TypeScript, Element Plus, DataEase frontend contract tests, SQLBot FastAPI + SQLModel event payloads, pytest.

---

## Source Spec

- `docs/superpowers/specs/2026-05-01-sqlbot-history-result-interpretation-redesign.md`

## File Map

- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/types.ts` — extend persisted event types and add message kind/source interfaces.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts` — create fact, derived-question, derived-answer records; persist and restore derived messages; stop writing analysis into fact records.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue` — render alternating messages and route “数据解读/趋势预测” actions through derived messages.
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue` — render fact answers only, not derived analysis inline.
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue` — render system-created user-side derived questions.
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue` — render analysis/predict AI answers.
- Modify: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts` — normalize and serialize new event types.
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts` — source-level contract for message flow, derived event persistence, and no history-triggered analysis.
- Modify: `SQLBot/backend/apps/chat/models/chat_model.py` — allow new sqlbot-new event types in schema documentation/types without changing DB shape.
- Create: `SQLBot/backend/tests/chat/test_sqlbot_new_derived_message_contract.py` — backend source contract for derived-message event payload support.
- Modify: `docs/superpowers/plans/2026-05-01-smart-query-acceptance-test.md` — add browser checks for alternating message flow.

## Non-Negotiable Behavior

- History restore must never call `/analysis` or `/predict`.
- `chartAnswer` stays fact answer text. It is not “分析报告”.
- `analysis` only appears in an AI derived answer message linked to the fact record via `sourceRecordId`.
- Clicking “数据解读” creates a user/system derived question message first, then streams an AI derived answer message.
- Clicking “趋势预测” follows the same pattern with `kind = 'predict'`.
- The UI must remain alternating: user message, AI answer, user/system derived message, AI derived answer.

## Autoplan Stop Gate

This plan was reviewed by the gstack autoplan process on 2026-05-02. The review found stop-level gaps in the original task sequence. Do not execute Task 1 through Task 8 as-is.

Required revisions before implementation:

- Convert or strip legacy `ChatRecord.analysis` and `ChatRecord.predict` content when restoring SQLBot New history. Backend detail restore currently merges child analysis/predict records back into parent fact records, and frontend normalization copies those fields into `record.analysis` / `record.predict`; this recreates the mixed-card bug.
- Add a SQLBot New rendering mode for `StarbiResultCard` that disables inline analysis/predict panels while preserving action buttons. Old SQLBot pages can keep the inline panel behavior, but SQLBot New fact cards cannot render derived insight content inside the fact card.
- Add per-source-record/action locks so repeated clicks on “数据解读” or “趋势预测” do not append duplicate derived questions or start duplicate `/analysis` / `/predict` streams.
- Resolve the record-kind transition explicitly. Keep `'answer'` as a legacy kind during migration, or normalize all restored/local answer records to `'fact-answer'` before removing `'answer'` from the union.
- Define deterministic restore merge rules for backend detail records plus persisted derived events. Derived events must win over inline legacy fields; legacy inline fields should be converted to derived messages only when no persisted derived event exists.
- Update history title and turn-number logic so derived questions/answers do not replace the original user question or inflate normal Q&A turn counts.
- Strengthen tests beyond regex source contracts. Add state-level restore tests for inline-analysis conversion/stripping, duplicate-click locks, and network/browser verification that history restore does not call `/analysis` or `/predict`.

---

## Revised Executable Plan

The original Task 1 through Task 8 below are retained as historical draft detail, but they are superseded by this revised task sequence. Implement this revised sequence instead.

### Revised Task 1: Add Failing Contracts for the Real Regression Paths

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`
- Create: `SQLBot/backend/tests/chat/test_sqlbot_new_derived_message_contract.py`

- [ ] **Step 1: Add frontend contract coverage for legacy leakage, duplicate locks, and history safety**

The frontend contract must fail against the current code until the following names and guards exist:

```ts
const requiredContracts = [
  /SqlbotNewConversationRecordKind =[\s\S]*'answer'[\s\S]*'fact-answer'[\s\S]*'derived-question'[\s\S]*'derived-answer'/,
  /disableInlineInsights\?: boolean/,
  /:disable-inline-insights="true"/,
  /createLegacyInsightDerivedMessages/,
  /stripInlineInsightsFromFactRecord/,
  /isDerivedActionPending/,
  /findLatestOriginalQuestionInRecords/,
  /isFactAnswerRecord/,
  /event\.eventType === 'derived_question' \|\| event\.eventType === 'derived_answer'/,
  /restoreHistorySession[\s\S]*createLegacyInsightDerivedMessages/
]
```

It must also assert that `restoreHistorySession` does not call `requestDerivedRecordAnalysis`, `requestDerivedRecordPredict`, `streamSQLBotRecordAnalysis`, or `streamSQLBotRecordPredict`.

- [ ] **Step 2: Update the existing predict UI contract**

Modify `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts` so SQLBot New expects `requestDerivedRecordPredict(record, effectiveExecutionContext.value)` instead of `requestRecordPredict(record, effectiveExecutionContext.value)`.

- [ ] **Step 3: Add backend event payload contract**

The backend contract must verify `SqlbotNewContextSwitchCreate.event_type` remains an unrestricted `str`, `event_payload` remains `Optional[dict]`, and CRUD persists `**payload.model_dump()` without whitelisting away derived event payloads.

- [ ] **Step 4: Run contracts and confirm failure**

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

Expected: FAIL on the current code with missing legacy conversion, inline-insight disable mode, and duplicate lock symbols.

Run backend contract:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/pytest tests/chat/test_sqlbot_new_derived_message_contract.py -v
```

Expected: PASS if backend already supports generic event payloads; otherwise FAIL only on the missing generic event contract.

### Revised Task 2: Add SQLBot New Record Kinds and Legacy Insight Adapter

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Extend record kind without breaking legacy `answer`**

Use:

```ts
export type SqlbotNewConversationRecordKind =
  | 'answer'
  | 'fact-answer'
  | 'derived-question'
  | 'derived-answer'
  | 'context-switch'
```

Do not remove `'answer'` until all old snapshots and local records are normalized.

- [ ] **Step 2: Add source-link and derived-action fields**

Add to `SqlbotNewConversationRecord`:

```ts
sourceRecordId?: number
sourceLocalId?: string
derivedAction?: 'analysis' | 'predict'
derivedQuestion?: string
```

- [ ] **Step 3: Normalize fact records and strip inline insights for SQLBot New**

Add helpers:

```ts
const isFactAnswerRecord = (record: SqlbotNewConversationRecord) =>
  !record.kind || record.kind === 'answer' || record.kind === 'fact-answer'

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
```

- [ ] **Step 4: Convert legacy inline insights to derived messages before stripping**

Add:

```ts
const createLegacyInsightDerivedMessages = (
  sourceRecord: SqlbotNewConversationRecord
): SqlbotNewConversationRecord[] => {
  const records: SqlbotNewConversationRecord[] = []
  const legacyAnalysis = String(sourceRecord.analysis || '').trim()
  const legacyPredict = String(sourceRecord.predict || '').trim()

  if (legacyAnalysis) {
    const question = buildDerivedQuestionText('analysis', sourceRecord)
    records.push(
      createDerivedQuestionMessage({
        action: 'analysis',
        sourceRecord,
        question,
        assistantEventPersisted: true
      }),
      createDerivedAnswerMessage({
        action: 'analysis',
        sourceRecord,
        question,
        assistantEventPersisted: true
      })
    )
    records[records.length - 1].analysis = legacyAnalysis
    records[records.length - 1].analysisThinking = sourceRecord.analysisThinking || ''
    records[records.length - 1].analysisRecordId = sourceRecord.analysisRecordId
  }

  if (legacyPredict) {
    const question = buildDerivedQuestionText('predict', sourceRecord)
    records.push(
      createDerivedQuestionMessage({
        action: 'predict',
        sourceRecord,
        question,
        assistantEventPersisted: true
      }),
      createDerivedAnswerMessage({
        action: 'predict',
        sourceRecord,
        question,
        assistantEventPersisted: true
      })
    )
    records[records.length - 1].predict = legacyPredict
    records[records.length - 1].predictThinking = sourceRecord.predictThinking || ''
    records[records.length - 1].predictRecordId = sourceRecord.predictRecordId
  }

  stripInlineInsightsFromFactRecord(sourceRecord)
  return records
}
```

If persisted `derived_answer` events already exist for a source/action, do not convert the matching legacy inline field. Persisted derived events win.

### Revised Task 3: Add Derived Message Creation, Persistence, and Duplicate Locks

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Add derived message factories**

Create `buildDerivedQuestionText`, `createDerivedQuestionMessage`, and `createDerivedAnswerMessage`. Fact answers must have `kind = 'fact-answer'`; derived question messages must have `kind = 'derived-question'`; derived AI answers must have `kind = 'derived-answer'`.

- [ ] **Step 2: Add per-source/action pending lock**

Add:

```ts
const getDerivedActionKey = (sourceRecord: SqlbotNewConversationRecord, action: SqlbotNewDerivedAction) =>
  `${sourceRecord.id || sourceRecord.localId}:${action}`

const pendingDerivedActionKeys = new Set<string>()

const isDerivedActionPending = (
  sourceRecord: SqlbotNewConversationRecord,
  action: SqlbotNewDerivedAction
) => pendingDerivedActionKeys.has(getDerivedActionKey(sourceRecord, action))
```

Before appending a derived question, check both `isDerivedActionPending(sourceRecord, action)` and whether an unfinished derived answer for the same source/action already exists in the session.

- [ ] **Step 3: Persist derived question and answer events**

Use `createSQLBotNewContextSwitch` with `eventType: 'derived_question' | 'derived_answer'`. Keep the endpoint name for compatibility, but use event type to distinguish semantics.

- [ ] **Step 4: Persist a derived-answer placeholder before streaming**

After creating the derived answer record and before calling `/analysis` or `/predict`, persist a `derived_answer` event with loading metadata. On stream completion, persist another `derived_answer` event with final content. Restore must prefer the latest event for the same `local_id`.

### Revised Task 4: Route SQLBot New Insight Actions Through Derived Messages Only

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`

- [ ] **Step 1: Add `disableInlineInsights` to `StarbiResultCard`**

Add prop:

```ts
disableInlineInsights?: boolean
```

Default it to `false`, so the old SQLBot page keeps current inline behavior.

Guard inline panels:

```ts
const showAnalysisPanel = computed(() => {
  return (
    !props.disableInlineInsights &&
    analysisExpanded.value &&
    (analysisLoading.value || analysisAvailable.value || props.record.analysisError)
  )
})
```

Use the same guard for predict.

- [ ] **Step 2: Keep action buttons available in SQLBot New**

In `SqlbotNewConversationRecord.vue`, pass:

```vue
<StarbiResultCard
  :disable-inline-insights="true"
  :show-predict-action="true"
  ...
/>
```

The button click should emit `interpret` / `predict`; it must not open inline insight panels in SQLBot New.

- [ ] **Step 3: Replace SQLBot New request handlers**

In `index.vue`, use:

```ts
const handleInterpretRecord = (record: SqlbotNewConversationRecordItem) => {
  void requestDerivedRecordAnalysis(record, effectiveExecutionContext.value)
}

const handlePredictRecord = (record: SqlbotNewConversationRecordItem) => {
  void requestDerivedRecordPredict(record, effectiveExecutionContext.value)
}
```

Old `requestRecordAnalysis` can remain for the old SQLBot page, but SQLBot New must not call it.

### Revised Task 5: Restore Derived Messages with Deterministic Precedence

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`

- [ ] **Step 1: Normalize new event types**

Allow `derived_question` and `derived_answer` in `SQLBotNewPersistedContextEventType` and `normalizePersistedContextEventType`.

- [ ] **Step 2: Restore persisted derived events first**

During `restoreHistorySession`, include `derived_question` and `derived_answer` in event restore. For repeated `derived_answer` events with the same `local_id`, keep the latest event by `createTime` / `id`.

- [ ] **Step 3: Convert legacy inline insights only when no matching persisted derived event exists**

After normalizing backend detail records, inspect fact records for `analysis` / `predict`. If no restored derived answer exists for the same source record/action, call `createLegacyInsightDerivedMessages`. Then call `stripInlineInsightsFromFactRecord` on every SQLBot New fact record.

- [ ] **Step 4: Merge order**

Use this restore order:

1. Context-switch events.
2. Fact records from backend detail or assistant reply events, with inline insights stripped.
3. Persisted derived question/answer events.
4. Converted legacy derived messages for any source/action not covered by persisted derived events.

Sort by `createTime`, then by semantic order for the same source/action: fact-answer, derived-question, derived-answer.

### Revised Task 6: Render Alternating Messages and Protect Titles / Turn Counts

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue`
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Add derived components**

`SqlbotDerivedQuestionMessage.vue` renders the user/system-side derived prompt. `SqlbotDerivedAnswerMessage.vue` renders analysis/predict content, loading, error, and usage metadata.

- [ ] **Step 2: Update render guards**

Add guards:

```ts
const isDerivedQuestionRecord = (record: SqlbotNewConversationRecordItem) =>
  record.kind === 'derived-question'

const isDerivedAnswerRecord = (record: SqlbotNewConversationRecordItem) =>
  record.kind === 'derived-answer'

const isFactAnswerRecord = (record: SqlbotNewConversationRecordItem) =>
  !record.kind || record.kind === 'answer' || record.kind === 'fact-answer'
```

Render fact answers with `SqlbotNewConversationRecord`, derived questions with `SqlbotDerivedQuestionMessage`, and derived answers with `SqlbotDerivedAnswerMessage`.

- [ ] **Step 3: Fix history title selection**

Replace broad latest-question scanning with:

```ts
const findLatestOriginalQuestionInRecords = (records: SqlbotNewConversationRecord[]) =>
  [...records]
    .reverse()
    .find(record => isFactAnswerRecord(record) && String(record.question || '').trim())?.question || ''
```

Use this for local history entry titles.

- [ ] **Step 4: Fix turn numbering**

`conversationAnswerTurnMap` must increment only for fact-answer records. Derived question/answer records belong to the preceding fact answer and must not inflate normal Q&A turn counts.

### Revised Task 7: Strengthen Verification and Acceptance

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts`
- Modify: `docs/superpowers/plans/2026-05-01-smart-query-acceptance-test.md`

- [ ] **Step 1: Add regression-specific contract checks**

The message-flow contract must assert:

- Legacy `analysis` / `predict` conversion helpers exist.
- Fact records are stripped before SQLBot New rendering.
- `StarbiResultCard` supports `disableInlineInsights`.
- SQLBot New passes `disable-inline-insights="true"`.
- Duplicate locks exist before stream calls.
- Restore includes derived events and does not call generation functions.
- History title and turn count helpers ignore derived records.

- [ ] **Step 2: Add browser/network acceptance**

In the acceptance plan, TC-10 must include browser network inspection that proves restore does not call endpoints matching `/analysis` or `/predict`. Screenshot-only verification is not enough.

- [ ] **Step 3: Run verification**

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
node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-predict-ui-contract.spec.ts \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --outDir /tmp/sqlbot-predict-ui-contract
SQLBOT_PREDICT_UI_CONTRACTS=1 node /tmp/sqlbot-predict-ui-contract/sqlbot-predict-ui-contract.spec.js
node_modules/.bin/eslint \
  src/views/sqlbot-new/useSqlbotNewConversation.ts \
  src/views/sqlbot-new/index.vue \
  src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue \
  src/views/sqlbot/StarbiResultCard.vue
```

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/pytest \
  tests/chat/test_sqlbot_new_derived_message_contract.py \
  tests/chat/test_sqlbot_new_empty_record_contract.py \
  tests/chat/test_record_merge.py \
  -v
```

### Revised Task 8: Browser QA and Final Review

**Files:**
- Modify: `docs/superpowers/plans/2026-05-01-smart-query-acceptance-test.md`

- [ ] **Step 1: Run TC-09 and TC-10 in the browser**

Use `agent-browser` or `playwright-cli`. Capture screenshots for:

- fact result before derived action
- derived analysis after clicking “数据解读”
- history restore after refresh or history click

- [ ] **Step 2: Record network proof**

Capture browser network logs around history restore and verify no request URL contains `/analysis` or `/predict`.

- [ ] **Step 3: Request code review before commit**

Use `superpowers:requesting-code-review` and `gstack review` before final landing, because this change touches restore semantics and user-visible history behavior.

---

## Task 1: Add Message-Flow Contract Tests

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`
- Create: `SQLBot/backend/tests/chat/test_sqlbot_new_derived_message_contract.py`

- [ ] **Step 1: Create the frontend source contract test**

Add `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`:

```ts
/**
 * Executable source contract for sqlbot-new alternating message flow.
 * Run after TypeScript compilation with SQLBOT_MESSAGE_FLOW_CONTRACTS=1.
 */

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
declare const require: any

const fs = require('fs')
const path = require('path')

const readSource = (relativePath: string): string => {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

const fail = (message: string): never => {
  throw new Error(message)
}

const assertMatch = (source: string, pattern: RegExp, label: string) => {
  if (!pattern.test(source)) {
    fail(`${label}: expected source to match ${pattern}`)
  }
}

const assertNotMatch = (source: string, pattern: RegExp, label: string) => {
  if (pattern.test(source)) {
    fail(`${label}: expected source not to match ${pattern}`)
  }
}

const typesSource = readSource('src/views/sqlbot-new/types.ts')
const conversationSource = readSource('src/views/sqlbot-new/useSqlbotNewConversation.ts')
const indexSource = readSource('src/views/sqlbot-new/index.vue')
const recordSource = readSource('src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue')
const directSource = readSource('src/views/sqlbot/sqlbotDirect.ts')

const contractCases: ContractCase[] = [
  {
    name: 'record kinds support alternating fact and derived messages',
    run() {
      assertMatch(
        typesSource,
        /SqlbotNewConversationRecordKind =[\s\S]*'fact-answer'[\s\S]*'derived-question'[\s\S]*'derived-answer'/,
        'message record kinds'
      )
      assertMatch(conversationSource, /sourceRecordId\?: number/, 'source record link')
      assertMatch(conversationSource, /derivedAction\?: 'analysis' \| 'predict'/, 'derived action field')
    }
  },
  {
    name: 'clicking interpretation creates a derived question before streaming analysis',
    run() {
      assertMatch(conversationSource, /createDerivedQuestionMessage/, 'derived question creator')
      assertMatch(conversationSource, /createDerivedAnswerMessage/, 'derived answer creator')
      assertMatch(conversationSource, /requestDerivedRecordAnalysis/, 'derived analysis requester')
      assertMatch(
        conversationSource,
        /createDerivedQuestionMessage\([\s\S]*sourceRecordId:[\s\S]*record\.id/,
        'derived question links to source fact record'
      )
      assertMatch(
        conversationSource,
        /streamSQLBotRecordAnalysis\([\s\S]*sourceRecord\.id/,
        'analysis stream still targets source fact record'
      )
      assertNotMatch(
        conversationSource,
        /record\.analysis = ''[\s\S]*streamSQLBotRecordAnalysis\([\s\S]*record\.id/,
        'analysis should not clear and stream into the fact record itself'
      )
    }
  },
  {
    name: 'history restore reads derived events without triggering generation',
    run() {
      assertMatch(directSource, /'derived_question'/, 'direct normalizes derived question event')
      assertMatch(directSource, /'derived_answer'/, 'direct normalizes derived answer event')
      assertMatch(
        conversationSource,
        /event\.eventType === 'derived_question' \|\| event\.eventType === 'derived_answer'/,
        'restore includes derived events'
      )
      assertNotMatch(
        conversationSource,
        /restoreHistorySession[\s\S]*requestDerivedRecordAnalysis/,
        'history restore must not generate analysis'
      )
      assertNotMatch(
        conversationSource,
        /restoreHistorySession[\s\S]*streamSQLBotRecordAnalysis/,
        'history restore must not call analysis stream'
      )
    }
  },
  {
    name: 'index renders alternating user and AI messages',
    run() {
      assertMatch(indexSource, /isDerivedQuestionRecord/, 'derived question render guard')
      assertMatch(indexSource, /SqlbotDerivedQuestionMessage/, 'derived question component')
      assertMatch(indexSource, /SqlbotDerivedAnswerMessage/, 'derived answer component')
      assertMatch(indexSource, /conversation-message--user/, 'user-side message class')
      assertMatch(indexSource, /conversation-message--assistant/, 'assistant-side message class')
      assertNotMatch(recordSource, /@interpret="emit\('interpret', record\)"/, 'fact card must not inline analysis emit')
    }
  }
]

export const runSqlbotMessageFlowContracts = async () => {
  for (const contractCase of contractCases) {
    contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' && process?.env?.SQLBOT_MESSAGE_FLOW_CONTRACTS === '1'

if (shouldRunContracts) {
  runSqlbotMessageFlowContracts()
    .then(() => {
      console.log(`[sqlbot-message-flow] ${contractCases.length} contract checks passed`)
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

- [ ] **Step 2: Create the backend source contract test**

Add `SQLBot/backend/tests/chat/test_sqlbot_new_derived_message_contract.py`:

```python
import ast
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
WORKSPACE_ROOT = BACKEND_ROOT.parents[1]
CHAT_MODEL_PATH = BACKEND_ROOT / "apps" / "chat" / "models" / "chat_model.py"
CHAT_CRUD_PATH = BACKEND_ROOT / "apps" / "chat" / "curd" / "chat.py"
SQLBOT_DIRECT_PATH = (
    WORKSPACE_ROOT
    / "dataease"
    / "core"
    / "core-frontend"
    / "src"
    / "views"
    / "sqlbot"
    / "sqlbotDirect.ts"
)


def parse_source(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"))


def find_class(tree: ast.Module, name: str) -> ast.ClassDef:
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == name:
            return node
    raise AssertionError(f"{name} not found")


def normalized_source(path: Path) -> str:
    return "".join(path.read_text(encoding="utf-8").split())


class SqlbotNewDerivedMessageContractTest(unittest.TestCase):
    def test_context_event_accepts_generic_event_type_and_payload(self):
        model_tree = parse_source(CHAT_MODEL_PATH)
        event_model = find_class(model_tree, "SqlbotNewContextSwitchCreate")
        annotations = {
            node.target.id: ast.unparse(node.annotation)
            for node in event_model.body
            if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)
        }
        self.assertEqual(annotations.get("event_type"), "str")
        self.assertEqual(annotations.get("event_payload"), "Optional[dict]")

    def test_frontend_serializes_derived_message_event_types(self):
        source = normalized_source(SQLBOT_DIRECT_PATH)
        self.assertIn("value==='derived_question'", source)
        self.assertIn("value==='derived_answer'", source)
        self.assertIn("event_type:payload.eventType", source)
        self.assertIn("event_payload:payload.eventPayload", source)

    def test_crud_persists_event_payload_without_whitelist_dropping(self):
        source = normalized_source(CHAT_CRUD_PATH)
        self.assertIn("**payload.model_dump()", source)
        self.assertIn("event_payload", normalized_source(CHAT_MODEL_PATH))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the new tests and confirm they fail**

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

Expected: FAIL because message-flow kinds, derived creators, and components do not exist yet.

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/pytest tests/chat/test_sqlbot_new_derived_message_contract.py -v
```

Expected: FAIL because the frontend serializer does not yet normalize `derived_question` and `derived_answer`.

- [ ] **Step 4: Commit the failing contracts**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts \
  SQLBot/backend/tests/chat/test_sqlbot_new_derived_message_contract.py
git -C /Users/chenliyong/AI/github/StarBI commit -m "test(sqlbot): add message flow contracts"
```

---

## Task 2: Extend Types and Persistence Event Contract

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
- Modify: `SQLBot/backend/apps/chat/models/chat_model.py`

- [ ] **Step 1: Extend frontend event and record types**

In `dataease/core/core-frontend/src/views/sqlbot-new/types.ts`, replace the existing `SqlbotNewConversationRecordKind` and persisted context event type definitions with:

```ts
export type SqlbotNewConversationRecordKind =
  | 'fact-answer'
  | 'derived-question'
  | 'derived-answer'
  | 'context-switch'

export type SqlbotNewDerivedAction = 'analysis' | 'predict'

export type SQLBotNewPersistedContextEventType =
  | 'session_init'
  | 'context_switch'
  | 'assistant_reply'
  | 'derived_question'
  | 'derived_answer'
  | 'selection_update'
  | 'manual_fix_submit'
```

Add after `SqlbotNewContextSwitchMeta`:

```ts
export interface SqlbotNewDerivedMessageMeta {
  action: SqlbotNewDerivedAction
  sourceRecordId: number
  sourceLocalId?: string
  question: string
}
```

- [ ] **Step 2: Extend direct API event normalization**

In `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`, update `normalizePersistedContextEventType`:

```ts
const normalizePersistedContextEventType = (
  ...values: unknown[]
): SQLBotNewPersistedContextEventType => {
  for (const value of values) {
    if (
      value === 'session_init' ||
      value === 'context_switch' ||
      value === 'assistant_reply' ||
      value === 'derived_question' ||
      value === 'derived_answer' ||
      value === 'selection_update' ||
      value === 'manual_fix_submit'
    ) {
      return value
    }
  }
  return 'context_switch'
}
```

- [ ] **Step 3: Document backend accepted event types without changing DB shape**

In `SQLBot/backend/apps/chat/models/chat_model.py`, add this constant above `SqlbotNewContextSwitchCreate`:

```python
SQLBOT_NEW_EVENT_TYPES = {
    "session_init",
    "context_switch",
    "assistant_reply",
    "derived_question",
    "derived_answer",
    "selection_update",
    "manual_fix_submit",
}
```

Do not add a SQLAlchemy enum or migration. `ChatSessionEvent.event_type` is already a string and should remain open for client-specific sqlbot-new events.

- [ ] **Step 4: Run contract tests**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/pytest tests/chat/test_sqlbot_new_derived_message_contract.py -v
```

Expected: PASS.

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

Expected: still FAIL because derived creators and components are not implemented yet.

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  dataease/core/core-frontend/src/views/sqlbot-new/types.ts \
  dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts \
  SQLBot/backend/apps/chat/models/chat_model.py
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(sqlbot): support derived message event types"
```

---

## Task 3: Add Derived Message State and Persistence Helpers

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Extend imports and record shape**

In `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`, import `SqlbotNewDerivedAction` and `SqlbotNewDerivedMessageMeta` from `./types`.

Extend `SqlbotNewConversationRecord`:

```ts
export interface SqlbotNewConversationRecord {
  kind?: SqlbotNewConversationRecordKind
  sourceRecordId?: number
  sourceLocalId?: string
  derivedAction?: SqlbotNewDerivedAction
  derivedQuestion?: SqlbotNewDerivedMessageMeta
  contextSwitch?: SqlbotNewContextSwitchMeta
  localId: string
  id?: number
  // keep the existing fields below
}
```

- [ ] **Step 2: Make local records fact answers by default**

Update `createLocalRecord` so new real query results are fact answers:

```ts
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
```

Keep compatibility logic later so old `kind: 'answer'` records normalize to `fact-answer`.

- [ ] **Step 3: Add derived message creators**

Add below `createAssistantReplyRecord`:

```ts
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
}) => {
  const record = createLocalRecord(question)
  record.kind = 'derived-question'
  record.localId =
    localId || `derived-question-${action}-${sourceRecord.id || sourceRecord.localId}-${Date.now()}`
  record.id = undefined
  record.chatId = sourceRecord.chatId
  record.executionContext = sourceRecord.executionContext
    ? { ...sourceRecord.executionContext }
    : undefined
  record.sourceRecordId = sourceRecord.id
  record.sourceLocalId = sourceRecord.localId
  record.derivedAction = action
  record.derivedQuestion = {
    action,
    sourceRecordId: Number(sourceRecord.id || 0),
    sourceLocalId: sourceRecord.localId,
    question
  }
  record.chartAnswer = ''
  record.sqlAnswer = ''
  record.finish = true
  record.createTime = normalizeLocalRecordTimestamp(createTime)
  record.assistantEventPersisted = assistantEventPersisted
  return record
}

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
}) => {
  const record = createLocalRecord(question)
  record.kind = 'derived-answer'
  record.localId =
    localId || `derived-answer-${action}-${sourceRecord.id || sourceRecord.localId}-${Date.now()}`
  record.id = undefined
  record.chatId = sourceRecord.chatId
  record.executionContext = sourceRecord.executionContext
    ? { ...sourceRecord.executionContext }
    : undefined
  record.sourceRecordId = sourceRecord.id
  record.sourceLocalId = sourceRecord.localId
  record.derivedAction = action
  record.finish = false
  record.createTime = normalizeLocalRecordTimestamp(createTime)
  record.assistantEventPersisted = assistantEventPersisted
  return record
}
```

- [ ] **Step 4: Add derived message persistence helpers**

Add near `persistBackendAssistantReply`:

```ts
const persistDerivedMessageWithSession = async (
  record: SqlbotNewConversationRecord,
  executionContext: SqlbotNewExecutionContext,
  overrides: Partial<Pick<SqlbotNewRestoredContext, 'selectionTitle' | 'selectionMeta'>> = {}
) => {
  const chatId = conversationSession.value?.id || record.chatId
  if (!chatId || record.assistantEventPersisted) {
    return
  }

  const sourceRecordId = Number(record.sourceRecordId || 0)
  if (!sourceRecordId) {
    return
  }

  try {
    const requestContext = await buildHistoryWriteRequestContext(executionContext)
    const { selectionTitle, selectionMeta } = resolvePersistedSelectionState(overrides)
    await createSQLBotNewContextSwitch(requestContext, chatId, {
      eventType: record.kind === 'derived-question' ? 'derived_question' : 'derived_answer',
      recordId: record.id,
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
        kind: record.kind,
        action: record.derivedAction,
        question: record.question,
        source_record_id: sourceRecordId,
        source_local_id: record.sourceLocalId,
        local_id: record.localId,
        analysis: record.analysis,
        analysis_thinking: record.analysisThinking,
        analysis_error: record.analysisError,
        analysis_record_id: record.analysisRecordId,
        predict: record.predict,
        predict_thinking: record.predictThinking,
        predict_error: record.predictError,
        predict_record_id: record.predictRecordId
      }
    })
    record.assistantEventPersisted = true
  } catch (error) {
    console.error('persist sqlbot-new derived message failed', error)
  }
}
```

- [ ] **Step 5: Do not wire analysis yet**

Do not change `requestRecordAnalysis` in this task. The contract should still fail until Task 4.

- [ ] **Step 6: Run TypeScript check for touched files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/eslint src/views/sqlbot-new/useSqlbotNewConversation.ts src/views/sqlbot-new/types.ts src/views/sqlbot/sqlbotDirect.ts
```

Expected: no errors. Warnings are acceptable only if pre-existing and not introduced by these edits.

- [ ] **Step 7: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(sqlbot): add derived message state helpers"
```

---

## Task 4: Route Analysis and Predict Through Derived Messages

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`

- [ ] **Step 1: Replace fact-record analysis requester with derived requester**

In `useSqlbotNewConversation.ts`, keep the old `requestRecordAnalysis` only if old SQLBot pages still need it. For sqlbot-new exports, add:

```ts
const buildDerivedQuestionText = (
  action: SqlbotNewDerivedAction,
  sourceRecord: SqlbotNewConversationRecord
) => {
  const question = String(sourceRecord.question || '上面的结果').trim()
  return action === 'analysis'
    ? `对「${question}」的结果做数据解读`
    : `基于「${question}」的结果预测后续趋势`
}

const requestDerivedRecordAnalysis = async (
  sourceRecord: SqlbotNewConversationRecord,
  executionContext?: SqlbotNewExecutionContext
) => {
  const effectiveExecutionContext = sourceRecord.executionContext || executionContext
  if (!effectiveExecutionContext) {
    ElMessage.error('当前记录缺少执行上下文，暂时不能解读')
    return
  }
  if (!sourceRecord.id) {
    ElMessage.warning('当前结果尚未完成，暂时不能解读')
    return
  }

  const session = ensureConversationContainer(effectiveExecutionContext)
  const questionRecord = createDerivedQuestionMessage({
    action: 'analysis',
    sourceRecord,
    question: buildDerivedQuestionText('analysis', sourceRecord)
  })
  const answerRecord = createDerivedAnswerMessage({
    action: 'analysis',
    sourceRecord,
    question: questionRecord.question
  })
  answerRecord.analysisLoading = true
  session.records.push(questionRecord, answerRecord)
  await persistDerivedMessageWithSession(questionRecord, effectiveExecutionContext)

  let requestContext: SQLBotRequestContext
  try {
    const assistantToken = await ensureAssistantToken(effectiveExecutionContext)
    requestContext = buildRequestContext(effectiveExecutionContext, assistantToken)
  } catch (error) {
    answerRecord.analysisError = error instanceof Error ? error.message : '数据解读准备失败'
    answerRecord.analysisLoading = false
    await persistDerivedMessageWithSession(answerRecord, effectiveExecutionContext)
    return
  }

  const controller = new AbortController()
  sqlbotAnalysisControllerMap.set(answerRecord.localId, controller)

  try {
    await streamSQLBotRecordAnalysis(requestContext, sourceRecord.id, {
      signal: controller.signal,
      onEvent: event => {
        void applySQLBotAnalysisEvent(answerRecord, event, effectiveExecutionContext)
      }
    })
  } catch (error) {
    if (!controller.signal.aborted) {
      answerRecord.analysisError = error instanceof Error ? error.message : '数据解读执行失败'
    }
  } finally {
    answerRecord.analysisLoading = false
    sqlbotAnalysisControllerMap.delete(answerRecord.localId)
    await persistDerivedMessageWithSession(answerRecord, effectiveExecutionContext)
    persistConversationSnapshot(effectiveExecutionContext)
  }
}
```

- [ ] **Step 2: Add predict derived requester**

Add next to the analysis requester:

```ts
const requestDerivedRecordPredict = async (
  sourceRecord: SqlbotNewConversationRecord,
  executionContext?: SqlbotNewExecutionContext
) => {
  const effectiveExecutionContext = sourceRecord.executionContext || executionContext
  if (!effectiveExecutionContext) {
    ElMessage.error('当前记录缺少执行上下文，暂时不能预测')
    return
  }
  if (!sourceRecord.id) {
    ElMessage.warning('当前结果尚未完成，暂时不能预测')
    return
  }

  const session = ensureConversationContainer(effectiveExecutionContext)
  const questionRecord = createDerivedQuestionMessage({
    action: 'predict',
    sourceRecord,
    question: buildDerivedQuestionText('predict', sourceRecord)
  })
  const answerRecord = createDerivedAnswerMessage({
    action: 'predict',
    sourceRecord,
    question: questionRecord.question
  })
  answerRecord.predictLoading = true
  session.records.push(questionRecord, answerRecord)
  await persistDerivedMessageWithSession(questionRecord, effectiveExecutionContext)

  let requestContext: SQLBotRequestContext
  try {
    const assistantToken = await ensureAssistantToken(effectiveExecutionContext)
    requestContext = buildRequestContext(effectiveExecutionContext, assistantToken)
  } catch (error) {
    answerRecord.predictError = error instanceof Error ? error.message : '趋势预测准备失败'
    answerRecord.predictLoading = false
    await persistDerivedMessageWithSession(answerRecord, effectiveExecutionContext)
    return
  }

  const controller = new AbortController()
  sqlbotPredictControllerMap.set(answerRecord.localId, controller)

  try {
    await streamSQLBotRecordPredict(requestContext, sourceRecord.id, {
      signal: controller.signal,
      onEvent: event => {
        void applySQLBotPredictEvent(answerRecord, event, effectiveExecutionContext)
      }
    })
  } catch (error) {
    if (!controller.signal.aborted) {
      answerRecord.predictError = error instanceof Error ? error.message : '趋势预测执行失败'
    }
  } finally {
    answerRecord.predictLoading = false
    sqlbotPredictControllerMap.delete(answerRecord.localId)
    await persistDerivedMessageWithSession(answerRecord, effectiveExecutionContext)
    persistConversationSnapshot(effectiveExecutionContext)
  }
}
```

- [ ] **Step 3: Export the derived requesters**

In the return object of `useSqlbotNewConversation`, replace or add:

```ts
requestDerivedRecordAnalysis,
requestDerivedRecordPredict,
```

Keep existing `requestRecordAnalysis` and `requestRecordPredict` only if other call sites still import them; otherwise remove them after confirming no references.

- [ ] **Step 4: Wire index handlers to derived requesters**

In `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`, import/destructure the new methods from the composable and update:

```ts
const handleInterpretRecord = (record: SqlbotNewConversationRecordItem) => {
  void requestDerivedRecordAnalysis(record, effectiveExecutionContext.value)
}

const handlePredictRecord = (record: SqlbotNewConversationRecordItem) => {
  void requestDerivedRecordPredict(record, effectiveExecutionContext.value)
}
```

- [ ] **Step 5: Stop `SqlbotNewConversationRecord` from emitting inline analysis for derived records**

In `SqlbotNewConversationRecord.vue`, keep fact answer actions, but guard the `StarbiResultCard` so it only renders for fact answers:

```vue
<StarbiResultCard
  v-if="!record.clarification && (record.kind === 'fact-answer' || record.kind === 'answer' || !record.kind)"
  ...
/>
```

Do not render derived answers in this component. Task 6 adds the dedicated derived answer component.

- [ ] **Step 6: Run the frontend message-flow contract**

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

Expected: still FAIL until Task 5/6 add render components, but the failures should no longer mention missing `requestDerivedRecordAnalysis`.

- [ ] **Step 7: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(sqlbot): route insights through derived messages"
```

---

## Task 5: Restore Derived Messages from History

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Normalize persisted derived question events**

Add near `createPersistedAssistantReplyRecord`:

```ts
const createPersistedDerivedQuestionRecord = (
  event: SQLBotNewPersistedContextEvent,
  fallbackExecutionContext: SqlbotNewExecutionContext
) => {
  const eventPayload =
    event.eventPayload && typeof event.eventPayload === 'object' ? event.eventPayload : {}
  const sourceRecordId = normalizeNumericValue(
    eventPayload.sourceRecordId,
    eventPayload.source_record_id
  )
  const action = eventPayload.action === 'predict' ? 'predict' : 'analysis'
  const sourceRecord = {
    id: sourceRecordId,
    localId: String(eventPayload.sourceLocalId || eventPayload.source_local_id || ''),
    chatId: event.recordId,
    executionContext: fallbackExecutionContext
  } as SqlbotNewConversationRecord

  const record = createDerivedQuestionMessage({
    action,
    sourceRecord,
    question: pickFirstNonEmptyString(eventPayload.question, '对上面的结果做数据解读'),
    createTime: event.createTime,
    localId: String(eventPayload.localId || eventPayload.local_id || `derived-question-${event.id}`),
    assistantEventPersisted: true
  })
  record.sourceRecordId = sourceRecordId
  return record
}
```

- [ ] **Step 2: Normalize persisted derived answer events**

Add below the previous helper:

```ts
const createPersistedDerivedAnswerRecord = (
  event: SQLBotNewPersistedContextEvent,
  fallbackExecutionContext: SqlbotNewExecutionContext
) => {
  const eventPayload =
    event.eventPayload && typeof event.eventPayload === 'object' ? event.eventPayload : {}
  const sourceRecordId = normalizeNumericValue(
    eventPayload.sourceRecordId,
    eventPayload.source_record_id
  )
  const action = eventPayload.action === 'predict' ? 'predict' : 'analysis'
  const sourceRecord = {
    id: sourceRecordId,
    localId: String(eventPayload.sourceLocalId || eventPayload.source_local_id || ''),
    chatId: event.recordId,
    executionContext: fallbackExecutionContext
  } as SqlbotNewConversationRecord

  const record = createDerivedAnswerMessage({
    action,
    sourceRecord,
    question: pickFirstNonEmptyString(eventPayload.question, '对上面的结果做数据解读'),
    createTime: event.createTime,
    localId: String(eventPayload.localId || eventPayload.local_id || `derived-answer-${event.id}`),
    assistantEventPersisted: true
  })
  record.sourceRecordId = sourceRecordId
  record.analysis = String(eventPayload.analysis || '')
  record.analysisThinking = String(eventPayload.analysisThinking || eventPayload.analysis_thinking || '')
  record.analysisError = String(eventPayload.analysisError || eventPayload.analysis_error || '')
  record.analysisRecordId = normalizeNumericValue(
    eventPayload.analysisRecordId,
    eventPayload.analysis_record_id
  )
  record.predict = String(eventPayload.predict || '')
  record.predictThinking = String(eventPayload.predictThinking || eventPayload.predict_thinking || '')
  record.predictError = String(eventPayload.predictError || eventPayload.predict_error || '')
  record.predictRecordId = normalizeNumericValue(
    eventPayload.predictRecordId,
    eventPayload.predict_record_id
  )
  record.finish = true
  return record
}
```

- [ ] **Step 3: Include derived events in history restore**

In `restoreHistorySession`, update the event filter:

```ts
.filter(event =>
  event.eventType === 'context_switch' ||
  event.eventType === 'assistant_reply' ||
  event.eventType === 'derived_question' ||
  event.eventType === 'derived_answer'
)
```

Update the mapper:

```ts
if (event.eventType === 'assistant_reply') {
  return createPersistedAssistantReplyRecord(event, resolvedExecutionContext)
}
if (event.eventType === 'derived_question') {
  return createPersistedDerivedQuestionRecord(event, resolvedExecutionContext)
}
if (event.eventType === 'derived_answer') {
  return createPersistedDerivedAnswerRecord(event, resolvedExecutionContext)
}
```

Keep context switch behavior unchanged.

- [ ] **Step 4: Prevent duplicate derived events during merge**

Update `mergeConversationRecordsWithSnapshot` so records with the same persisted `localId` do not duplicate:

```ts
const seenLocalIds = new Set<string>()
return [
  ...normalizedSnapshotRecords,
  ...records.filter(
    record => record.kind !== 'context-switch' && isMeaningfulConversationRecord(record)
  )
]
  .filter(record => {
    if (!record.localId) {
      return true
    }
    if (seenLocalIds.has(record.localId)) {
      return false
    }
    seenLocalIds.add(record.localId)
    return true
  })
  .sort(...)
```

Keep the existing sort body after `.sort`.

- [ ] **Step 5: Run contracts**

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

Expected: still may FAIL only on missing render components and template classes.

- [ ] **Step 6: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(sqlbot): restore derived messages from history"
```

---

## Task 6: Render Alternating Message Components

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue`
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`

- [ ] **Step 1: Create derived question component**

Add `SqlbotDerivedQuestionMessage.vue`:

```vue
<script setup lang="ts">
import type { SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

defineProps<{
  record: SqlbotNewConversationRecord
}>()
</script>

<template>
  <div class="sqlbot-derived-question-message conversation-message--user">
    <div class="derived-question-copy">
      {{ record.question }}
    </div>
  </div>
</template>

<style scoped lang="less">
.sqlbot-derived-question-message {
  display: flex;
  justify-content: flex-end;
}

.derived-question-copy {
  max-width: min(620px, 86%);
  padding: 12px 16px;
  border-radius: 18px 18px 4px 18px;
  background: #1f6feb;
  color: #fff;
  font-size: 15px;
  line-height: 1.6;
  box-shadow: 0 10px 24px rgba(31, 111, 235, 0.18);
}
</style>
```

- [ ] **Step 2: Create derived answer component**

Add `SqlbotDerivedAnswerMessage.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import StarbiMarkdown from '@/views/sqlbot/StarbiMarkdown.vue'
import type { SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

const props = defineProps<{
  record: SqlbotNewConversationRecord
}>()

const title = computed(() => (props.record.derivedAction === 'predict' ? '趋势预测' : '数据解读'))
const loading = computed(() =>
  props.record.derivedAction === 'predict'
    ? Boolean(props.record.predictLoading)
    : Boolean(props.record.analysisLoading)
)
const content = computed(() =>
  props.record.derivedAction === 'predict'
    ? String(props.record.predict || '')
    : String(props.record.analysis || '')
)
const error = computed(() =>
  props.record.derivedAction === 'predict'
    ? String(props.record.predictError || '')
    : String(props.record.analysisError || '')
)
</script>

<template>
  <div class="sqlbot-derived-answer-message conversation-message--assistant">
    <div class="derived-answer-card" :class="{ loading, error: !!error }">
      <div class="derived-answer-head">
        <span class="derived-answer-kicker">{{ title }}</span>
        <span v-if="loading" class="derived-answer-status">生成中</span>
        <span v-else-if="error" class="derived-answer-status error">失败</span>
        <span v-else-if="content" class="derived-answer-status">已完成</span>
      </div>

      <div v-if="loading && !content" class="derived-answer-loading">
        正在基于上方事实结果生成{{ title }}...
      </div>

      <StarbiMarkdown v-if="content" :message="content" />

      <div v-if="error" class="derived-answer-error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.sqlbot-derived-answer-message {
  display: flex;
  justify-content: flex-start;
}

.derived-answer-card {
  width: min(780px, 100%);
  padding: 18px 20px;
  border: 1px solid rgba(31, 111, 235, 0.14);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(31, 35, 40, 0.08);
}

.derived-answer-card.loading {
  background: linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%);
}

.derived-answer-card.error {
  border-color: rgba(220, 53, 69, 0.24);
}

.derived-answer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.derived-answer-kicker {
  font-size: 15px;
  font-weight: 700;
  color: #1f2328;
}

.derived-answer-status {
  font-size: 13px;
  color: #57606a;
}

.derived-answer-status.error,
.derived-answer-error {
  color: #cf222e;
}

.derived-answer-loading {
  color: #57606a;
  font-size: 14px;
  line-height: 1.7;
}
</style>
```

- [ ] **Step 3: Import and render derived components in index**

In `index.vue`, import the components:

```ts
import SqlbotDerivedQuestionMessage from '@/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue'
import SqlbotDerivedAnswerMessage from '@/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue'
```

Add helpers near `isContextSwitchRecord`:

```ts
const isDerivedQuestionRecord = (record: SqlbotNewConversationRecordItem) =>
  record.kind === 'derived-question'

const isDerivedAnswerRecord = (record: SqlbotNewConversationRecordItem) =>
  record.kind === 'derived-answer'

const isFactAnswerRecord = (record: SqlbotNewConversationRecordItem) =>
  !isContextSwitchRecord(record) && !isDerivedQuestionRecord(record) && !isDerivedAnswerRecord(record)
```

Update the template loop:

```vue
<SqlbotNewContextSwitchCard
  v-if="isContextSwitchRecord(record)"
  :record="record"
/>

<SqlbotDerivedQuestionMessage
  v-else-if="isDerivedQuestionRecord(record)"
  :record="record"
/>

<SqlbotDerivedAnswerMessage
  v-else-if="isDerivedAnswerRecord(record)"
  :record="record"
/>

<article v-else-if="isFactAnswerRecord(record)" class="conversation-turn">
  <!-- keep existing fact answer article body -->
</article>
```

- [ ] **Step 4: Add message classes to existing question/answer wrappers**

In `index.vue`, add classes:

```vue
<div v-if="hasRenderableQuestion(record)" class="conversation-turn-question conversation-message--user">
```

and:

```vue
<div class="conversation-turn-answer conversation-message--assistant">
```

- [ ] **Step 5: Run frontend contracts and lint**

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
node_modules/.bin/eslint \
  src/views/sqlbot-new/index.vue \
  src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue
node_modules/.bin/stylelint \
  src/views/sqlbot-new/index.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue
```

Expected: contract PASS, ESLint 0 errors, Stylelint 0 errors.

- [ ] **Step 6: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(sqlbot): render alternating derived messages"
```

---

## Task 7: Remove Misleading Inline Narrative Labels From Fact Results

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts`

- [ ] **Step 1: Extend contract to forbid mislabeled fact text**

Add a contract case:

```ts
const starbiResultCardSource = readSource('src/views/sqlbot/StarbiResultCard.vue')

contractCases.push({
  name: 'fact result text is not mislabeled as analysis report',
  run() {
    assertNotMatch(starbiResultCardSource, /title:\s*'分析报告'/, 'chartAnswer title')
    assertNotMatch(starbiResultCardSource, /title:\s*'分析思路'/, 'sqlAnswer title')
    assertMatch(starbiResultCardSource, /问数回答|结果说明|事实结果/, 'fact answer copy')
  }
})
```

- [ ] **Step 2: Rename narrative blocks**

In `StarbiResultCard.vue`, replace:

```ts
title: '分析报告'
```

with:

```ts
title: '问数回答'
```

Replace:

```ts
title: '分析思路'
```

with:

```ts
title: '结果说明'
```

Replace fallback:

```ts
record.chartAnswer ? '分析报告' : 'AI 解读'
```

with:

```ts
record.chartAnswer ? '问数回答' : '结果说明'
```

- [ ] **Step 3: Run focused checks**

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
node_modules/.bin/eslint src/views/sqlbot/StarbiResultCard.vue
node_modules/.bin/stylelint src/views/sqlbot/StarbiResultCard.vue
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-message-flow-contract.spec.ts
git -C /Users/chenliyong/AI/github/StarBI commit -m "fix(sqlbot): label fact answer text correctly"
```

---

## Task 8: Browser QA and Acceptance Plan Update

**Files:**
- Modify: `docs/superpowers/plans/2026-05-01-smart-query-acceptance-test.md`

- [ ] **Step 1: Add message-flow acceptance cases**

Append to `docs/superpowers/plans/2026-05-01-smart-query-acceptance-test.md`:

```markdown
### TC-09: 智能问数消息流 — 数据解读派生问题

```bash
playwright-cli click "智能问数"
sleep 3
playwright-cli fill "输入你的问题" "近30天销售额趋势"
playwright-cli press "Enter"
sleep 10
playwright-cli screenshot --filename=/tmp/tc09-fact-result.png
playwright-cli snapshot | grep -E "问数回答|图表|数据解读|趋势预测|继续追问"

playwright-cli click "数据解读"
sleep 8
playwright-cli screenshot --filename=/tmp/tc09-derived-analysis.png
playwright-cli snapshot | grep -E "对.*结果做数据解读|数据解读|生成中|已完成"
```

验证：
- 问数成功后先出现用户问题消息和 AI 事实回答消息。
- 点击“数据解读”后出现新的用户/系统派生问题消息。
- 解读内容出现在下一条 AI 回答消息中。
- 页面没有把解读塞回原图表卡片内部。

### TC-10: 历史恢复不重跑数据解读

```bash
playwright-cli reload
sleep 5
playwright-cli console error
playwright-cli screenshot --filename=/tmp/tc10-history-restore-analysis.png
playwright-cli snapshot | grep -E "对.*结果做数据解读|数据解读"
```

验证：
- 刷新或点击历史对话后，派生问题消息和 AI 解读回答恢复。
- Network/console 中不得出现自动触发 `/analysis` 的新请求。
- 如果历史没有解读，只显示“数据解读”推荐动作，不创建空解读消息。
```

- [ ] **Step 2: Run static verification**

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
node_modules/.bin/eslint \
  src/views/sqlbot-new/useSqlbotNewConversation.ts \
  src/views/sqlbot-new/index.vue \
  src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue \
  src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue \
  src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue \
  src/views/sqlbot/StarbiResultCard.vue
```

Expected: all pass.

- [ ] **Step 3: Run backend focused tests**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/pytest \
  tests/chat/test_sqlbot_new_derived_message_contract.py \
  tests/chat/test_sqlbot_new_empty_record_contract.py \
  tests/chat/test_record_merge.py \
  -v
```

Expected: all pass.

- [ ] **Step 4: Run browser QA with agent-browser or playwright-cli**

Use the active local app if already running. Otherwise start services using the project’s existing scripts, then execute TC-09 and TC-10 from the acceptance plan.

Capture screenshots:

```bash
ls -la /tmp/tc09-fact-result.png /tmp/tc09-derived-analysis.png /tmp/tc10-history-restore-analysis.png
```

Expected: all three files exist and show alternating messages.

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  docs/superpowers/plans/2026-05-01-smart-query-acceptance-test.md
git -C /Users/chenliyong/AI/github/StarBI commit -m "test(sqlbot): add message flow acceptance cases"
```

---

## Verification Matrix

| Requirement | Verification |
|---|---|
| Alternating chat flow, not stacked AI cards | `SQLBOT_MESSAGE_FLOW_CONTRACTS=1`, TC-09 screenshot |
| Data interpretation creates derived question first | `requestDerivedRecordAnalysis` contract, TC-09 |
| History restore does not call `/analysis` | source contract, TC-10 console/network review |
| Saved analysis restores with derived question | source contract, TC-10 screenshot |
| Fact result text remains visible and not mislabeled | StarbiResultCard contract |
| No backend schema rewrite | backend derived message contract |

## Implementation Notes

- Prefer reusing `ChatSessionEvent.event_payload` over a schema migration. It already stores open JSON payloads and can represent derived message events.
- Keep `requestRecordAnalysis` only if old pages still depend on it. SQLBot New must use `requestDerivedRecordAnalysis`.
- Do not move generated analysis into `sourceRecord.analysis` for SQLBot New. That recreates the original mixed-card problem.
- Do not use localStorage as the trusted source for history. It can keep UI expansion state only.

## GSTACK REVIEW REPORT

Status: STOP. Do not implement the original task sequence until the stop-gate revisions above are folded into a new executable plan.

Review date: 2026-05-02
Plan file: `docs/superpowers/plans/2026-05-01-sqlbot-message-flow-implementation-plan.md`
Restore point: `/Users/chenliyong/.gstack/projects/chenly3-StarBI/main-autoplan-restore-20260502-013803.md`
External voice: `codex exec` read-only review completed. Native gstack Claude subagent voice was unavailable in this Codex host, so the review records this as degraded autoplan mode.

### Review Scope

| Phase | Scope | Result |
|---|---|---|
| CEO / Product | Does the plan solve the real Quick BI style conversation-flow problem? | STOP: plan can still restore mixed-card history. |
| Design | Does the UI guarantee alternating messages rather than AI-card stacking? | STOP: `StarbiResultCard` still owns inline analysis/predict panels for fact records. |
| Engineering | Are persistence, restore, and duplicate request paths safe? | STOP: legacy merge, event/detail dedupe, and duplicate-click locking are not specified. |
| DX / Testability | Would the tests catch the real regressions? | STOP: regex contracts can pass while the UI still violates the product goal. |

### Top Findings

1. Stop: history restore can still put `analysis` / `predict` back inside fact cards. SQLBot backend detail restore already merges child analysis/predict records into parent records, and frontend normalization copies those fields into `record.analysis` / `record.predict`. Adding derived events alone does not remove the mixed-card path.

2. Stop: `StarbiResultCard` still renders inline analysis/predict panels for fact records. Task 4 only guards derived records from entering `StarbiResultCard`; it does not stop SQLBot New fact cards from showing old inline panels when `record.analysis` exists.

3. Stop: legacy histories have no migration behavior. Existing saved conversations with `ChatRecord.analysis` / `ChatRecord.predict` would either remain mixed-card or lose interpretation content if fields are stripped without conversion.

4. High: duplicate `/analysis` and `/predict` streams become easy. The current lock lives on the source fact record (`record.analysisLoading` / `record.predictLoading`), while the planned derived flow puts loading state on a newly appended answer record and leaves the source action clickable.

5. High: record-kind migration is inconsistent. The plan removes `'answer'` from `SqlbotNewConversationRecordKind` in one task but still checks for `'answer'` later. Current code emits `'answer'`, so the plan must either keep it as legacy or normalize it everywhere first.

6. High: derived event persistence is append-only without recovery semantics. Persisting only the question before stream completion means a refresh during streaming can restore a dangling derived question. If answer events are persisted more than once later, restore must prefer the newest complete event.

7. Medium: restore merge and dedupe rules are underspecified. Backend detail records and persisted event records do not share `localId`, so local-id dedupe will not prevent inline legacy analysis plus derived-answer duplicates.

8. Medium: history titles can be polluted by derived questions. Helpers that find the latest question currently scan records broadly; after derived messages are added, the title can become “对上面的结果做数据解读” rather than the original analytical question.

9. Medium: conversation turn numbering can count derived records as normal Q&A turns. Turn numbering should count fact-answer records or user-submitted questions, not derived system questions and derived AI answers.

10. Medium: tests are too source-regex-heavy. The proposed contracts check for function names and string patterns, but do not prove restored state, duplicate request prevention, inline panel absence, or network silence during history restore.

### Required Plan Changes

- Add a SQLBot New legacy insight adapter. On restore, convert legacy inline `analysis` / `predict` fields into derived-question + derived-answer records when no derived events exist; otherwise strip inline fields from fact records.
- Add a `StarbiResultCard` prop such as `insightMode="actions-only"` or `disableInlineInsights` for SQLBot New fact cards. This mode must keep “数据解读/趋势预测” actions but never render the inline insight panels.
- Add `isDerivedActionPending(sourceRecord, action)` and per-source/action locks before appending derived messages or calling `/analysis` / `/predict`.
- Keep `'answer'` as a legacy kind until all creation and restore paths emit `'fact-answer'`, or update every plan step to normalize `'answer'` to `'fact-answer'`.
- Define restore precedence: persisted derived events first, converted legacy inline fields second, fact-detail records last with insight fields cleared for SQLBot New rendering.
- Update `findLatestQuestionInRecords`, active history title logic, and `conversationAnswerTurnMap` so derived records do not affect user-question title or normal turn count.
- Add tests that would fail on the current code path:
  - Restoring a detail record with `analysis` creates/recovers a derived answer and leaves fact `analysis` empty.
  - Restoring history never invokes `requestDerivedRecordAnalysis`, `streamSQLBotRecordAnalysis`, `requestDerivedRecordPredict`, or `streamSQLBotRecordPredict`.
  - Double-clicking “数据解读” for one source record yields one derived question, one derived answer, and one backend stream.
  - SQLBot New `StarbiResultCard` actions-only mode does not render `.starbi-analysis-panel`.
  - History title and turn count ignore derived records.

### Decision

Proceed only after rewriting the implementation plan. The product direction is correct, but the original implementation plan preserves the exact mixed-card failure path the requirement is meant to remove.
