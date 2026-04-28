# SQLBot New Multi-Source Conversation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `sqlbot-new` to keep one continuous conversation while switching datasets/files, insert explicit context-switch cards into the message flow, and restore multi-source history without losing content.

**Architecture:** Decouple chat session identity from execution context. Persist one `sessionId` per conversation, store per-record execution context snapshots, and treat data-source switches as explicit system records instead of new sessions. Keep the change frontend-only in `sqlbot-new`.

**Tech Stack:** Vue 3, Composition API, TypeScript, localStorage/web-storage-cache, existing SQLBot embed APIs, existing browser automation via `agent-browser`

---

## File Structure

**Modify**
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
  Purpose: add explicit conversation record kind and context-switch record shape.
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  Purpose: expose whether a confirmed selection changed execution context, without implying new session semantics.
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
  Purpose: remove scope-key-driven session resets, append context-switch records, persist active execution context, and restore multi-source sessions.
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`
  Purpose: continue restoring by `sessionId` only and consume the latest active execution context.
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  Purpose: wire selection changes into the conversation layer, render context-switch cards, and keep current source labels aligned.
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
  Purpose: keep answer rendering limited to real answer records.

**Create**
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewContextSwitchCard.vue`
  Purpose: render lightweight system cards for dataset/file switches.

**Verification**
- Browser automation only; no Git operations because the user explicitly requested no Git actions.

---

### Task 1: Add explicit conversation record kinds

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Add record-kind types to `types.ts`**

```ts
export type SqlbotNewConversationRecordKind = 'answer' | 'context-switch'

export interface SqlbotNewContextSwitchMeta {
  sourceKind: SourceKind
  sourceId: string
  datasourceId: string
  sourceTitle: string
  sourceMeta: string
}
```

- [ ] **Step 2: Extend `SqlbotNewConversationRecord` with kind metadata**

```ts
export interface SqlbotNewConversationRecord {
  kind?: SqlbotNewConversationRecordKind
  contextSwitch?: SqlbotNewContextSwitchMeta
  // existing fields remain
}
```

- [ ] **Step 3: Keep existing answer records defaulting to `answer`**

```ts
const createLocalRecord = (question: string) =>
  reactive({
    kind: 'answer' as const,
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    question,
    // existing fields...
  }) as SqlbotNewConversationRecord
```

- [ ] **Step 4: Make history normalization preserve `kind`**

```ts
const normalizeConversationRecord = (
  record: Record<string, any>,
  executionContext?: SqlbotNewExecutionContext
): SqlbotNewConversationRecord => {
  return {
    kind: record?.kind === 'context-switch' ? 'context-switch' : 'answer',
    contextSwitch: record?.contextSwitch
      ? {
          sourceKind: String(record.contextSwitch.sourceKind || '') as SourceKind,
          sourceId: String(record.contextSwitch.sourceId || ''),
          datasourceId: String(record.contextSwitch.datasourceId || ''),
          sourceTitle: String(record.contextSwitch.sourceTitle || ''),
          sourceMeta: String(record.contextSwitch.sourceMeta || '')
        }
      : undefined,
    // existing normalization...
  }
}
```

- [ ] **Step 5: Skip commit**

User requested no Git operations. Do not run `git add` or `git commit`.

---

### Task 2: Make selection layer report real source changes

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts`

- [ ] **Step 1: Add a selection change payload type**

```ts
export interface SqlbotNewSelectionChange {
  changed: boolean
  nextExecutionContext: SqlbotNewExecutionContext
  nextSelectionTitle: string
  nextSelectionMeta: string
}
```

- [ ] **Step 2: Add a helper to compare two execution contexts**

```ts
const isSameExecutionContext = (
  left: SqlbotNewExecutionContext,
  right: SqlbotNewExecutionContext
) => {
  return (
    left.queryMode === right.queryMode &&
    left.sourceId === right.sourceId &&
    left.datasourceId === right.datasourceId &&
    left.modelId === right.modelId
  )
}
```

- [ ] **Step 3: Add a confirmed-selection helper that returns change state**

```ts
const applyConfirmedSelection = async (): Promise<SqlbotNewSelectionChange> => {
  const before = executionContext.value
  await confirmSelectDialog()
  const after = executionContext.value
  return {
    changed: !isSameExecutionContext(before, after),
    nextExecutionContext: after,
    nextSelectionTitle: currentSelectionTitle.value,
    nextSelectionMeta: currentSelectionMeta.value
  }
}
```

- [ ] **Step 4: Return the helper from `useSqlbotNewSelection`**

```ts
return {
  // existing exports...
  applyConfirmedSelection
}
```

- [ ] **Step 5: Skip commit**

User requested no Git operations. Do not run `git add` or `git commit`.

---

### Task 3: Stop treating source switches as new sessions

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Remove scope-key-driven session resets**

Replace:

```ts
if (currentScopeKey.value && currentScopeKey.value !== nextScopeKey) {
  conversationSession.value = null
  sqlbotAssistantToken.value = ''
  restoredHistoryContext.value = null
}
```

With:

```ts
currentScopeKey.value = nextScopeKey
if (!conversationSession.value) {
  conversationSession.value = {
    brief: '',
    datasource: undefined,
    records: []
  }
}
```

- [ ] **Step 2: Add an active execution context ref**

```ts
const activeExecutionContextRef = ref<SqlbotNewExecutionContext | null>(null)
```

- [ ] **Step 3: Update it whenever a real question is submitted**

```ts
activeExecutionContextRef.value = {
  ...executionContext
}
```

Place this before the SQLBot request starts inside `submitQuestion`.

- [ ] **Step 4: Add a helper to create context-switch records**

```ts
const createContextSwitchRecord = (
  executionContext: SqlbotNewExecutionContext,
  selectionTitle: string,
  selectionMeta: string
): SqlbotNewConversationRecord => ({
  kind: 'context-switch',
  localId: `switch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  question: '',
  sqlAnswer: '',
  chartAnswer: '',
  error: '',
  createTime: Date.now(),
  finish: true,
  recommendQuestions: [],
  pendingChartHydration: false,
  executionContext: { ...executionContext },
  contextSwitch: {
    sourceKind: executionContext.queryMode,
    sourceId: executionContext.sourceId,
    datasourceId: executionContext.datasourceId,
    sourceTitle: selectionTitle,
    sourceMeta: selectionMeta
  }
})
```

- [ ] **Step 5: Add an insertion helper that avoids duplicates**

```ts
const appendContextSwitchRecord = (
  executionContext: SqlbotNewExecutionContext,
  selectionTitle: string,
  selectionMeta: string
) => {
  if (!conversationSession.value?.records.length) {
    return
  }

  const lastRecord = conversationSession.value.records[conversationSession.value.records.length - 1]
  if (
    lastRecord.kind === 'context-switch' &&
    lastRecord.contextSwitch?.sourceKind === executionContext.queryMode &&
    lastRecord.contextSwitch?.sourceId === executionContext.sourceId &&
    lastRecord.contextSwitch?.datasourceId === executionContext.datasourceId
  ) {
    return
  }

  conversationSession.value.records.push(
    createContextSwitchRecord(executionContext, selectionTitle, selectionMeta)
  )
}
```

- [ ] **Step 6: Store `activeExecutionContext` in the snapshot payload**

```ts
activeExecutionContext: activeExecutionContextRef.value
  ? { ...activeExecutionContextRef.value }
  : nextHistoryContext
  ? {
      queryMode: nextHistoryContext.sourceKind,
      sourceId: nextHistoryContext.sourceId,
      datasourceId: nextHistoryContext.datasourceId,
      modelId: nextHistoryContext.modelId,
      datasourcePending: nextHistoryContext.datasourcePending
    }
  : undefined,
```

- [ ] **Step 7: On restore, recover `activeExecutionContext` from snapshot before fallback inference**

```ts
const snapshotExecutionContext = persistedSession?.activeExecutionContext
  ? repairRestoredExecutionContext(persistedSession.activeExecutionContext)
  : executionContext

activeExecutionContextRef.value = snapshotExecutionContext
```

- [ ] **Step 8: Keep restoring `records[]` even if source recovery is incomplete**

```ts
if (persistedSession?.records?.length) {
  conversationSession.value = normalizeConversationSession(
    persistedSession,
    snapshotExecutionContext
  )
  persistConversationSnapshot(snapshotExecutionContext)
  return true
}
```

- [ ] **Step 9: Skip commit**

User requested no Git operations. Do not run `git add` or `git commit`.

---

### Task 4: Render context-switch cards in the conversation flow

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewContextSwitchCard.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Create the new switch-card component**

```vue
<script setup lang="ts">
import type { SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

defineProps<{
  record: SqlbotNewConversationRecord
}>()
</script>

<template>
  <article class="context-switch-card">
    <span class="context-switch-label">
      {{ record.contextSwitch?.sourceKind === 'file' ? '已切换到数据文件' : '已切换到数据集' }}
    </span>
    <span class="context-switch-title">{{ record.contextSwitch?.sourceTitle }}</span>
    <span v-if="record.contextSwitch?.sourceMeta" class="context-switch-meta">
      {{ record.contextSwitch?.sourceMeta }}
    </span>
  </article>
</template>
```

- [ ] **Step 2: Add minimal styles to keep it visually secondary**

```vue
<style scoped lang="less">
.context-switch-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  background: #f8fbff;
  border: 1px solid #dbeafe;
  color: #475569;
}
</style>
```

- [ ] **Step 3: Import it into `index.vue`**

```ts
import SqlbotNewContextSwitchCard from '@/views/sqlbot-new/components/SqlbotNewContextSwitchCard.vue'
```

- [ ] **Step 4: Render switch cards separately from answer records**

Replace the loop body with:

```vue
<template v-for="record in conversationRecords" :key="record.localId">
  <article v-if="record.kind === 'context-switch'" class="conversation-turn system">
    <SqlbotNewContextSwitchCard :record="record" />
  </article>

  <article v-else class="conversation-turn">
    <div class="conversation-turn-label">
      第 {{ conversationRecords.filter(item => item.kind !== 'context-switch').indexOf(record) + 1 }} 轮问答
    </div>
    <div class="conversation-turn-question">
      <div class="question-card-label">我的问题</div>
      <div class="question-card-copy">{{ record.question }}</div>
    </div>
    <div class="conversation-turn-answer">
      <SqlbotNewConversationRecord
        :record="record"
        :conversation-loading="conversationLoading"
        @clarify-record="handleClarifyRecord"
        @interpret="handleInterpretRecord"
        @followup="handleFollowUpRecord"
        @retry="handleRetryQuestion($event.question)"
        @edit-question="handleEditQuestion"
        @select-data="openSelectDialog()"
        @view-execution-details="openExecutionDetails"
      />
    </div>
  </article>
</template>
```

- [ ] **Step 5: Skip commit**

User requested no Git operations. Do not run `git add` or `git commit`.

---

### Task 5: Wire confirmed source changes into the active conversation

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Export a context-switch insertion method from the conversation hook**

```ts
return {
  // existing exports...
  appendContextSwitchRecord
}
```

- [ ] **Step 2: Read the new helper in `index.vue`**

```ts
const {
  // existing conversation exports...
  appendContextSwitchRecord
} = useSqlbotNewConversation()
```

- [ ] **Step 3: Replace direct modal confirm with change-aware selection handling**

```ts
const handleConfirmSelection = async () => {
  const beforeHasRecords = conversationRecords.value.length > 0
  const beforeContext = effectiveExecutionContext.value
  await confirmSelectDialog()
  const afterContext = executionContext.value

  const sourceChanged =
    beforeContext?.queryMode !== afterContext.queryMode ||
    beforeContext?.sourceId !== afterContext.sourceId ||
    beforeContext?.datasourceId !== afterContext.datasourceId

  if (beforeHasRecords && sourceChanged) {
    appendContextSwitchRecord(
      afterContext,
      currentSelectionTitle.value,
      currentSelectionMeta.value
    )
  }
}
```

- [ ] **Step 4: Point the inline selection modal to the new handler**

```vue
<button
  class="selection-action primary large"
  type="button"
  :disabled="selectDialogTab === 'dataset' ? !selectedDatasetId : !selectedFileId"
  @click="handleConfirmSelection"
>
  确认选择
</button>
```

- [ ] **Step 5: Do the same for direct “提问” actions inside cards**

```ts
const handleAskDatasetFromDialog = async (id: string) => {
  const beforeHasRecords = conversationRecords.value.length > 0
  const beforeContext = effectiveExecutionContext.value
  await askFromDatasetCard(id)
  const afterContext = executionContext.value
  const sourceChanged = !beforeContext || beforeContext.sourceId !== afterContext.sourceId
  if (beforeHasRecords && sourceChanged) {
    appendContextSwitchRecord(afterContext, currentSelectionTitle.value, currentSelectionMeta.value)
  }
}
```

Repeat the same shape for file cards.

- [ ] **Step 6: Skip commit**

User requested no Git operations. Do not run `git add` or `git commit`.

---

### Task 6: Restore multi-source history without losing records

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`

- [ ] **Step 1: Add `activeExecutionContext` to the snapshot interface**

```ts
interface SqlbotNewSessionSnapshot {
  // existing fields...
  activeExecutionContext?: SqlbotNewExecutionContext
}
```

- [ ] **Step 2: Prefer `snapshot.activeExecutionContext` in history restoration**

```ts
const restoredExecutionContext = persistedSession?.activeExecutionContext
  ? repairRestoredExecutionContext(persistedSession.activeExecutionContext)
  : executionContext
```

- [ ] **Step 3: Use the restored active context when applying selection**

```ts
await applyRestoredSelection(restoredExecutionContext)
```

Use this instead of reconstructing context from only the history entry when snapshot data exists.

- [ ] **Step 4: Keep `records[]` as the source of truth**

```ts
if (persistedSession?.records?.length) {
  conversationSession.value = normalizeConversationSession(
    persistedSession,
    restoredExecutionContext
  )
  return true
}
```

- [ ] **Step 5: Do not inject new switch records during restore**

No code should call `appendContextSwitchRecord` inside `restoreHistorySession` or `openHistoryItem`.

- [ ] **Step 6: Skip commit**

User requested no Git operations. Do not run `git add` or `git commit`.

---

### Task 7: Manual regression verification

**Files:**
- Verify only

- [ ] **Step 1: Restart DataEase backend**

Run: `./dataease-app.sh`
Expected: backend serves on `http://localhost:8100`

- [ ] **Step 2: Restart DataEase frontend**

Run: `./dataease-web.sh`
Expected: Vite serves on `http://localhost:8080`

- [ ] **Step 3: Verify dataset-to-dataset continuity**

Run:

```bash
agent-browser --session ms1 open http://127.0.0.1:8080/#/login
```

Then:
- login as `admin / DataEase@123456`
- enter `智能问数`
- select dataset A
- ask one question
- switch to dataset B
- ask another question

Expected:
- still one history entry
- one context-switch card appears between rounds
- previous round remains visible

- [ ] **Step 4: Verify dataset-to-file continuity**

Expected:
- still one history entry
- one context-switch card appears
- file question uses the newly selected file source

- [ ] **Step 5: Verify history restore**

Expected:
- opening the history entry restores all old answer records
- restores all context-switch cards
- continuing to ask uses the last active source

- [ ] **Step 6: Verify delete behavior**

Expected:
- deleting the history entry removes the entire multi-source conversation thread

- [ ] **Step 7: Skip commit**

User requested no Git operations. Do not run `git add` or `git commit`.

---

## Self-Review

### Spec coverage

- Single-session multi-source continuity: covered by Tasks 3 and 5
- Context-switch card insertion: covered by Tasks 3, 4, and 5
- History restore without data loss: covered by Task 6
- Frontend-only scope: respected; no backend or SQLBot server contract changes included

### Placeholder scan

- No `TBD`, `TODO`, or deferred implementation markers remain
- Verification section uses explicit commands and expected results

### Type consistency

- Record kind is introduced once and reused consistently as `context-switch`
- Active execution context is named consistently as `activeExecutionContext`
- No task relies on undefined type names outside this plan

---

Plan complete and saved to `/Users/chenliyong/AI/github/StarBI/docs/superpowers/plans/2026-04-20-sqlbot-new-multi-source-conversation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?***
