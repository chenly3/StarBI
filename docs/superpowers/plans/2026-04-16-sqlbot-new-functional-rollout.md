# SQLBot New Functional Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/sqlbotnew` from a prototype-only front-end into a fully functional intelligent-query experience by reusing the existing DataEase + SQLBot service chain behind the current `/sqlbot/index`.

**Architecture:** Keep `sqlbot-new` as an independent route and visual shell, but replace its mock data/state with a thin orchestration layer built on top of the existing `sqlbotDirect.ts`, `queryContext.ts`, DataEase dataset/file APIs, and SQLBot `chat/*` endpoints. Avoid rewriting the old business chain; instead normalize old `sqlbot/index.vue` behaviors into smaller composables that `sqlbot-new` can consume while preserving the prototype-first page structure.

**Tech Stack:** Vue 3, TypeScript, existing DataEase frontend service layer, SQLBot REST/SSE APIs, existing restart scripts `./dataease-web.sh`, `./sqlbot-web.sh`, `./sqlbot-app.sh`

---

## Scope Baseline

- In scope:
  - Make `sqlbot-new` homepage and result page functional for the intelligent-query flow
  - Reuse existing runtime model loading, datasource resolution, SQLBot session creation, streaming answer handling, chart hydration, recommend-question loading, analysis, follow-up, and history restore behaviors
  - Wire the existing `sqlbot-new` prototype dialogs to real dataset/file selection and file upload flows
  - Keep `sqlbot-new` and old `/sqlbot/index` coexisting during rollout

- Out of scope:
  - Replacing or deleting old `/sqlbot/index`
  - Rebuilding SQLBot backend protocols or doing DB migrations
  - Making `报告 / 搭建 / 搜索` tabs feature-complete in this rollout
  - Redesigning the approved `sqlbot-new` prototype visuals beyond the minimum required to support real data

## File Structure

- Create: `dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
  - Normalized types for page mode, selection state, history nodes, message records, model options, and restored chat payloads
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  - Dataset/file/model selection state, persisted local cache restore, datasource loading, and selector dialog bridges
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
  - Active conversation state, question submit, SQLBot SSE stream handling, record hydration, recommendation refresh, and follow-up helpers
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`
  - History list fetching, grouping into “最近问数 / 历史问数”, history restore, and new-conversation reset
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
  - Result record wrapper that renders successful and failed SQLBot records inside the new prototype page while delegating heavy chart/result actions to reusable internals
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  - Replace mock state with composables, render live history tree, live conversation stream, live recommendation strip, and functional composer actions
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
  - Bind real dataset/file data and emit functional selection events
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
  - Bind real upload + preview flow and return saved file datasource payload
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue`
  - Bind real preview payload and route “提问” into active `sqlbot-new` conversation state
- Modify: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
  - Export any missing helpers/types needed by `sqlbot-new` without duplicating the transport layer
- Modify: `dataease/core/core-frontend/src/views/sqlbot/queryContext.ts`
  - Reuse certificate/context builders if `sqlbot-new` needs extra entry-scene metadata
- Reuse as-is where possible:
  - `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
  - `dataease/core/core-frontend/src/views/sqlbot/NativeChartPreview.vue`
  - `dataease/core/core-frontend/src/api/aiQueryTheme.ts`

## Task 1: Define `sqlbot-new` Runtime Contracts

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Test: no dedicated harness in repo; verify via `eslint` and route compilation

- [ ] **Step 1: Add normalized types for the new page**

```ts
export type SqlbotNewPageMode = 'home' | 'result'
export type SqlbotNewQueryMode = 'dataset' | 'file'

export interface SqlbotNewModelOption {
  id: string
  name: string
  provider?: string
  isDefault?: boolean
}

export interface SqlbotNewSelectionState {
  queryMode: SqlbotNewQueryMode
  datasetIds: string[]
  datasetDatasourceId: string
  fileDatasourceId: string
  modelId: string
}

export interface SqlbotNewHistoryNode {
  id: string
  title: string
  subtitle: string
  time: string
  group: 'recent' | 'history'
  backendChatId?: number
}
```

- [ ] **Step 2: Replace duplicated inline interface declarations in `index.vue` with imports from `types.ts`**

Run: `./node_modules/.bin/eslint --fix src/views/sqlbot-new/index.vue src/views/sqlbot-new/types.ts`
Expected: no `sqlbot-new` lint errors

- [ ] **Step 3: Commit the contract extraction**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/types.ts dataease/core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "refactor: extract sqlbot-new runtime types"
```

## Task 2: Reuse Old Selection + Model Loading for `sqlbot-new`

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`

- [ ] **Step 1: Port the old selection bootstrap into a dedicated composable**

```ts
export const useSqlbotNewSelection = () => {
  const selection = reactive<SqlbotNewSelectionState>({
    queryMode: 'dataset',
    datasetIds: [],
    datasetDatasourceId: '',
    fileDatasourceId: '',
    modelId: ''
  })

  const modelOptions = ref<SqlbotNewModelOption[]>([])
  const datasetDatasourceOptions = ref<RuntimeDatasource[]>([])

  const restore = async () => {
    // reuse old STARBI-QUERY-* cache keys
  }

  const loadModels = async () => {
    const runtime = await fetchRuntimeModels()
    modelOptions.value = runtime.models
    selection.modelId = runtime.defaultModelId || runtime.models[0]?.id || ''
  }

  const loadDatasources = async () => {
    datasetDatasourceOptions.value = await getRuntimeDatasources(
      selection.datasetIds,
      selection.datasetDatasourceId || undefined
    )
  }

  return { selection, modelOptions, datasetDatasourceOptions, restore, loadModels, loadDatasources }
}
```

- [ ] **Step 2: Bind `index.vue` top-level state to the selection composable instead of hardcoded `test / 销售明细数据` placeholders**

Run: `./node_modules/.bin/eslint --fix src/views/sqlbot-new/index.vue src/views/sqlbot-new/useSqlbotNewSelection.ts`
Expected: page compiles with imported composable references only

- [ ] **Step 3: Make `SqlbotNewSelectDataDialog.vue` render real datasets/files and emit the chosen ids**

```ts
defineProps<{
  datasetItems: DatasetCardItem[]
  fileItems: FileCardItem[]
  selectedDatasetId: string
  selectedFileId: string
}>()
```

- [ ] **Step 4: Replace fake file upload “save” payloads with real datasource metadata returned by the existing upload path**

Run: `rg -n "fileDatasourceId|upload" dataease/core/core-frontend/src/views/sqlbot/index.vue`
Expected: identify existing file upload helpers and reuse their response shape instead of inventing new ids

- [ ] **Step 5: Commit the selection/model binding pass**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts dataease/core/core-frontend/src/views/sqlbot-new/index.vue dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts
git commit -m "feat: wire sqlbot-new selection and model loading"
```

## Task 3: Reuse SQLBot Conversation Execution and Streaming

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`

- [ ] **Step 1: Extract a normalized conversation controller for the new page**

```ts
export const useSqlbotNewConversation = (deps: {
  selection: SqlbotNewSelectionState
  buildRequestContext: () => SQLBotRequestContext
}) => {
  const messages = ref<SQLBotChatRecord[]>([])
  const sqlbotChat = ref<SQLBotChatSummary | null>(null)
  const pendingQuestion = ref('')

  const submitQuestion = async (question: string) => {
    // validate selection
    // start chat / stream answer
    // hydrate chart/result/usage/recommendations
  }

  return { messages, sqlbotChat, pendingQuestion, submitQuestion }
}
```

- [ ] **Step 2: Reuse these old actions instead of rewriting protocol logic**

Use as source behavior:
- `submitQuestion` in [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/index.vue)
- `loadSQLBotRecommendQuestions` in [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/index.vue)
- `hydrateSQLBotChartData` / analysis helpers in [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/index.vue)

- [ ] **Step 3: Map `sqlbot-new` result-page UI state to real SQLBot message records**

```ts
const pageMode = computed(() =>
  messages.value.length > 0 || restoredHistory.value ? 'result' : 'home'
)
```

- [ ] **Step 4: Ensure first successful `finish` event refreshes recommendation questions for the active result page**

Run: `rg -n "case 'finish'" dataease/core/core-frontend/src/views/sqlbot/index.vue`
Expected: `finish -> usage -> recommend -> scroll` sequence is preserved

- [ ] **Step 5: Commit the conversation wiring**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts dataease/core/core-frontend/src/views/sqlbot-new/index.vue dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts
git commit -m "feat: wire sqlbot-new conversation flow"
```

## Task 4: Render Real Result Cards in Prototype Layout

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/NativeChartPreview.vue`

- [ ] **Step 1: Build a wrapper component that chooses success vs error presentation from one normalized record**

```vue
<template>
  <StarbiResultCard
    v-if="!record.error"
    :record="record"
    @interpret="emit('interpret', record)"
    @followup="emit('followup', record)"
  />
  <article v-else class="assistant-error-card">
    <!-- keep sqlbot-new prototype error shell -->
  </article>
</template>
```

- [ ] **Step 2: Replace static mock cards in `index.vue` with `v-for` rendering over the live message list**

Run: `./node_modules/.bin/eslint --fix src/views/sqlbot-new/index.vue src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
Expected: result page renders through one data source, not hardcoded sample cards

- [ ] **Step 3: Preserve old business actions from the reusable result card**

Acceptance for this step:
- `数据解读`
- `追加提问`
- `更多`
- chart/image/excel/sql drawer behavior still routes through old handlers

- [ ] **Step 4: Commit the result rendering pass**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/index.vue dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue
git commit -m "feat: render live sqlbot-new result cards"
```

## Task 5: Make History Tree Use Real SQLBot History

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`

- [ ] **Step 1: Use the existing history endpoints instead of keeping mock history arrays**

Source endpoints already available:
- `getSQLBotChatList` in [sqlbotDirect.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts)
- `getSQLBotChatWithData` in [sqlbotDirect.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts)

- [ ] **Step 2: Group returned chats into the current tree structure**

```ts
const recent = summaries.filter(item => isWithinRecentWindow(item.create_time))
const history = summaries.filter(item => !isWithinRecentWindow(item.create_time))
```

- [ ] **Step 3: Restore a clicked history node into the result page without routing back through old `/sqlbot/index`**

```ts
const openHistoryItem = async (node: SqlbotNewHistoryNode) => {
  const detail = await getSQLBotChatWithData(context, Number(node.backendChatId))
  // rebuild selection context
  // rebuild record list
  // switch pageMode to result
}
```

- [ ] **Step 4: Make “新建对话” clear active chat state but preserve current selected data resource**

Run: `rg -n "handleCreateNewConversation" dataease/core/core-frontend/src/views/sqlbot/index.vue`
Expected: reuse reset semantics but keep `sqlbot-new` prototype route and active selection

- [ ] **Step 5: Commit the history integration**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts dataease/core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "feat: connect sqlbot-new history tree"
```

## Task 6: Functionalize Dialog and Composer Actions

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Make “选择数据” buttons open the correct selector tab based on current query mode**

```ts
const openSelectDialog = (tab?: DialogTab) => {
  selectDialogTab.value = tab || selection.queryMode
  selectDialogVisible.value = true
}
```

- [ ] **Step 2: Make “保存并开始问数” from upload preview jump straight into the result page with the new file datasource selected**

- [ ] **Step 3: Make “提问” from file detail preview restore the file selection and focus the composer**

- [ ] **Step 4: Make recommended question chips actually submit via the live conversation controller**

Run: `rg -n "handleRecommendedQuestion" dataease/core/core-frontend/src/views/sqlbot/index.vue`
Expected: same validation rule is preserved when no valid selection exists

- [ ] **Step 5: Commit the action wiring**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue dataease/core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "feat: wire sqlbot-new dialogs and composer actions"
```

## Task 7: Preserve Old Business Capabilities Behind the New UI

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`

- [ ] **Step 1: Ensure successful records still support**

```text
数据解读
追加提问
更多
SQL 抽屉
导出图片
导出 Excel
图表切换
```

- [ ] **Step 2: Route follow-up behavior back into the new prototype composer**

```ts
const handleFollowup = (record: SQLBotChatRecord) => {
  pendingQuestion.value = `基于“${record.question}”继续深入分析：`
}
```

- [ ] **Step 3: Ensure recommendation strip only appears on result page after the first completed answer**

Acceptance for this step:
- home page has no recommendation strip
- result page shows recommendation strip only when active latest record has `recommendQuestions`

- [ ] **Step 4: Commit the capability-preservation pass**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue dataease/core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "feat: preserve sqlbot business actions in new ui"
```

## Task 8: End-to-End Verification and Rollout Safety

**Files:**
- Modify: `docs/superpowers/plans/2026-04-16-sqlbot-new-functional-rollout.md`
- Optional notes: `docs/superpowers/plans/2026-04-16-sqlbot-new-functional-rollout-verification.md`

- [ ] **Step 1: Frontend static verification**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint --fix src/views/sqlbot-new src/views/sqlbot
```

Expected:
- `sqlbot-new` files have no new lint failures
- pre-existing repo warnings may remain outside touched scope

- [ ] **Step 2: Restart the correct services for regression**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease && ./dataease-web.sh
cd /Users/chenliyong/AI/github/StarBI/SQLBot && ./sqlbot-web.sh
cd /Users/chenliyong/AI/github/StarBI/SQLBot && ./sqlbot-app.sh
```

Expected:
- `http://127.0.0.1:8080/#/sqlbotnew` loads
- `5173` SQLBot frontend is reachable
- `8000` SQLBot backend is reachable

- [ ] **Step 3: Manual functional verification matrix**

Verify once each:
- homepage dataset selection -> first question -> result stream
- homepage file upload -> save and ask -> result stream
- result page recommendation click -> follow-up question starts
- history tree restore -> result page rebuilds
- `数据解读 / 追加提问 / 更多` all still work
- failure case still renders the prototype error card

- [ ] **Step 4: Rollout safety check**

Confirm:
- old `/sqlbot/index` still works unchanged
- `sqlbot-new` failures do not mutate old page state or shared route state unexpectedly

- [ ] **Step 5: Commit final verification-driven integration**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts dataease/core/core-frontend/src/views/sqlbot/queryContext.ts docs/superpowers/plans/2026-04-16-sqlbot-new-functional-rollout.md
git commit -m "feat: complete sqlbot-new functional rollout"
```

## Self-Review

- Spec coverage:
  - `sqlbot-new` homepage/result prototype -> covered by Tasks 2-7
  - reuse old DataEase/SQLBot service ability -> covered by Tasks 2-7
  - history tree / recommend / file flow / result actions -> covered explicitly
  - coexistence with old page -> covered in Task 8
- Placeholder scan:
  - No `TBD` / `TODO` placeholders remain
  - Every task lists concrete files and verification steps
- Type consistency:
  - New `sqlbot-new` composables all center on `types.ts`
  - Existing transport contracts continue to come from `sqlbotDirect.ts`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-16-sqlbot-new-functional-rollout.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints
