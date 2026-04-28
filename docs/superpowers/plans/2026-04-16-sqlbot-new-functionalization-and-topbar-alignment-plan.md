# SQLBot New Functionalization And Topbar Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `#/sqlbotnew` the fully functional intelligent-query experience by reusing existing DataEase intelligent-query service capabilities, then route `/sqlbot/index` to it and align all global header experiences to the `sqlbot-new` topbar.

**Architecture:** Keep `sqlbot-new` as the new UI shell, but replace its mock state with composables that reuse the mature transport, session, streaming, recommendation, history, and chart logic already proven in the old `/sqlbot/index`. Separately, treat global topbar alignment as a parallel visual-contract rollout: keep existing header implementations where useful, but normalize their brand area, menu behavior, icons, typography, and right-side operations to match the `sqlbot-new` topbar experience.

**Tech Stack:** Vue 3, TypeScript, existing DataEase frontend service layer, SQLBot REST/SSE APIs, existing restart scripts `./dataease-web.sh`, `./sqlbot-web.sh`, `./sqlbot-app.sh`

---

## Task 1: Define `sqlbot-new` runtime contracts and split page state

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Create the shared runtime type file**

```ts
export type SqlbotNewPageMode = 'home' | 'result'
export type SqlbotNewQueryMode = 'dataset' | 'file'

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

- [ ] **Step 2: Move inline interfaces out of `index.vue` into `types.ts`**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint --fix src/views/sqlbot-new/index.vue src/views/sqlbot-new/types.ts
```

Expected: `sqlbot-new` page compiles with imported types and no new lint failures.

- [ ] **Step 3: Scaffold the three composables with empty exported contracts**

```ts
export const useSqlbotNewSelection = () => ({})
export const useSqlbotNewConversation = () => ({})
export const useSqlbotNewHistory = () => ({})
```

- [ ] **Step 4: Replace direct mock-state ownership in `index.vue` with composable injection points**

Expected: `index.vue` becomes a page orchestrator rather than the sole owner of business state.

- [ ] **Step 5: Commit the runtime split**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/types.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "refactor: split sqlbot-new runtime state"
```

## Task 2: Reuse model loading, dataset/file selection, and datasource resolution

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
- Reuse: `dataease/core/core-frontend/src/api/aiQueryTheme.ts`

- [ ] **Step 1: Implement selection restore using the existing old-page cache keys**

```ts
const savedMode = wsCache.get('STARBI-QUERY-MODE')
const savedDatasetIds = wsCache.get('STARBI-QUERY-DATASET-IDS')
const savedDatasetDatasourceId = wsCache.get('STARBI-QUERY-DATASET-DSID')
const savedFileDatasourceId = wsCache.get('STARBI-QUERY-FILE-DSID')
```

- [ ] **Step 2: Reuse `fetchRuntimeModels()` from `sqlbotDirect.ts` for the model dropdown**

```ts
const runtime = await fetchRuntimeModels()
selection.modelId = runtime.defaultModelId || runtime.models[0]?.id || ''
modelOptions.value = runtime.models
```

- [ ] **Step 3: Reuse `getRuntimeDatasources()` for dataset datasource resolution**

```ts
datasetDatasourceOptions.value = await getRuntimeDatasources(
  selection.datasetIds,
  selection.datasetDatasourceId || undefined
)
```

- [ ] **Step 4: Make `SqlbotNewSelectDataDialog.vue` render real datasets/files, not hardcoded placeholders**

Run:

```bash
rg -n "datasetIds|fileDatasourceId|loadDatasources" \
  /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/index.vue
```

Expected: old-page selection semantics are preserved when ported to the new dialog.

- [ ] **Step 5: Make file upload “save” return real datasource metadata from the existing upload path**

Acceptance: uploading a file updates `selection.fileDatasourceId` with real backend ids instead of mock `grid-plan-file`.

- [ ] **Step 6: Commit the selection binding**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue
git commit -m "feat: bind sqlbot-new selection and models"
```

## Task 3: Port the old intelligent-query conversation flow into `sqlbot-new`

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/index.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/queryContext.ts`

- [ ] **Step 1: Build the SQLBot request context using the old certificate/domain/token path**

```ts
const context: SQLBotRequestContext = {
  domain,
  assistantId,
  assistantToken,
  certificate,
  hostOrigin: window.location.origin,
  locale: 'zh-CN'
}
```

- [ ] **Step 2: Reuse the old `submitQuestion` flow behavior**

Required sequence:

```text
validate selection
create/start chat
stream events
hydrate chart data
hydrate usage
load recommendations
scroll to latest result
```

- [ ] **Step 3: Reuse the old `loadSQLBotRecommendQuestions()` timing**

Only after `finish` event:

```ts
await hydrateSQLBotUsage(record)
await loadSQLBotRecommendQuestions(record)
await queueLatestResultScroll()
```

- [ ] **Step 4: Make `sqlbot-new` page mode derive from real conversation state**

```ts
const pageMode = computed(() =>
  conversation.records.value.length > 0 || history.restoredChat.value ? 'result' : 'home'
)
```

- [ ] **Step 5: Keep homepage recommendation strip absent**

Acceptance:
- Home page: no recommendation strip
- Result page: recommendations appear only after first completed answer

- [ ] **Step 6: Commit the conversation wiring**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "feat: wire sqlbot-new conversation flow"
```

## Task 4: Render real result records while preserving old result-card abilities

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/NativeChartPreview.vue`

- [ ] **Step 1: Create a record wrapper that renders success and error states from live SQLBot records**

```vue
<StarbiResultCard
  v-if="!record.error"
  :record="record"
  @interpret="emit('interpret', record)"
  @followup="emit('followup', record)"
/>
<article v-else class="assistant-error-card">...</article>
```

- [ ] **Step 2: Replace hardcoded sample cards in `sqlbot-new/index.vue` with a live `v-for` over conversation records**

- [ ] **Step 3: Keep old business actions available**

Required actions:
- `数据解读`
- `追加提问`
- `更多`
- 图表切换
- SQL 抽屉
- 图片导出
- Excel 导出

- [ ] **Step 4: Route “追加提问” back into the new composer**

```ts
pendingQuestion.value = `基于“${record.question}”继续深入分析：`
```

- [ ] **Step 5: Commit the result rendering**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "feat: render live sqlbot-new result cards"
```

## Task 5: Use real SQLBot history in the new left-side tree

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Reuse: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`

- [ ] **Step 1: Fetch summaries using `getSQLBotChatList()`**

```ts
const summaries = await getSQLBotChatList(context)
```

- [ ] **Step 2: Group returned chats into `recent` and `history` buckets**

```ts
const recent = summaries.filter(item => isRecent(item.create_time))
const history = summaries.filter(item => !isRecent(item.create_time))
```

- [ ] **Step 3: Restore clicked chats using `getSQLBotChatWithData()`**

```ts
const detail = await getSQLBotChatWithData(context, Number(node.backendChatId))
```

- [ ] **Step 4: Restore resource selection and records together**

Acceptance:
- clicking a history node restores selection state
- restores result records
- switches to result page
- recommendation strip matches restored active chat

- [ ] **Step 5: Make “新建对话” clear active chat but keep selected resource**

- [ ] **Step 6: Commit the history migration**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "feat: connect sqlbot-new history tree"
```

## Task 6: Functionalize the data/file dialog chain

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Make “选择数据” use the real active query mode and selected resource state**

- [ ] **Step 2: Make uploaded files appear in the real file list**

- [ ] **Step 3: Make “保存并开始问数” jump directly into a live result-page session**

- [ ] **Step 4: Make “提问” in file detail preview restore the chosen file and focus the composer**

- [ ] **Step 5: Commit the dialog functionalization**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "feat: functionalize sqlbot-new dialog flows"
```

## Task 7: Redirect the old route to the new route

**Files:**
- Modify: `dataease/core/core-frontend/src/router/index.ts`
- Modify: `dataease/core/core-frontend/src/layout/components/Header.vue`

- [ ] **Step 1: Change `/sqlbot/index` route resolution to land on `/sqlbotnew`**

Preferred pattern:

```ts
{
  path: 'index',
  redirect: '/sqlbotnew'
}
```

- [ ] **Step 2: Keep old code available in repo but remove it from the primary entry path**

- [ ] **Step 3: Ensure header menu entry for “智能问数” now resolves to the new route**

Acceptance:
- menu click lands on `/sqlbotnew`
- direct `/sqlbot/index` access lands on `/sqlbotnew`
- old `/sqlbot/old` remains isolated if still needed

- [ ] **Step 4: Commit the route switch**

```bash
git add dataease/core/core-frontend/src/router/index.ts \
  dataease/core/core-frontend/src/layout/components/Header.vue
git commit -m "feat: route intelligent query to sqlbot-new"
```

## Task 8: Align all topbar experiences to the `sqlbot-new` topbar contract

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewTopbar.vue`
- Modify: `dataease/core/core-frontend/src/layout/components/Header.vue`
- Modify: `dataease/core/core-frontend/src/layout/components/HeaderSystem.vue`
- Modify: login page head area in `dataease/core/core-frontend/src/views/login/index.vue`
- Modify: any dedicated mobile header entry points discovered during implementation
- Modify: embedded-page topbar entry points if present

- [ ] **Step 1: Treat `SqlbotNewTopbar.vue` as the visual contract source**

The following must become canonical:
- brand area proportions
- menu typography
- active chip treatment
- right-side account capsule
- spacing and height

- [ ] **Step 2: Bring `Header.vue` into visual parity without removing its existing dynamic-menu logic**

Acceptance:
- same brand area treatment
- same menu alignment and active-state behavior
- same right-side operations look

- [ ] **Step 3: Bring `HeaderSystem.vue` into the same visual and interaction contract**

- [ ] **Step 4: Align login-page header treatment**

Acceptance:
- login uses the same visual language as the new topbar
- no old-brand mismatch remains

- [ ] **Step 5: Audit and align mobile and embedded header entry points**

Run:

```bash
rg -n "HeaderSystem|Header|login-logo|topbar|header-brand|header-flex" \
  /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src
```

- [ ] **Step 6: Commit the topbar alignment rollout**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewTopbar.vue \
  dataease/core/core-frontend/src/layout/components/Header.vue \
  dataease/core/core-frontend/src/layout/components/HeaderSystem.vue \
  dataease/core/core-frontend/src/views/login/index.vue
git commit -m "feat: align global topbar experience with sqlbot-new"
```

## Task 9: Verification and release safety

**Files:**
- Modify: `docs/superpowers/plans/2026-04-16-sqlbot-new-functionalization-and-topbar-alignment-plan.md`

- [ ] **Step 1: Static verification for touched frontend files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint --fix src/views/sqlbot-new src/views/sqlbot src/layout/components src/views/login
```

Expected:
- `sqlbot-new` touched files clean
- pre-existing unrelated warnings may remain outside touched scope

- [ ] **Step 2: Restart the required services**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease && ./dataease-web.sh
cd /Users/chenliyong/AI/github/StarBI/SQLBot && ./sqlbot-web.sh
cd /Users/chenliyong/AI/github/StarBI/SQLBot && ./sqlbot-app.sh
```

- [ ] **Step 3: Manual verification matrix**

Verify:
- `/sqlbotnew` homepage dataset query
- `/sqlbotnew` file upload -> ask flow
- first completed result -> recommendation strip appears
- result actions still work
- history tree restore works
- `/sqlbot/index` redirects to `/sqlbotnew`
- dashboard, datav, dataset, system pages all show aligned topbar experience
- login page topbar style aligned

- [ ] **Step 4: Final commit**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new \
  dataease/core/core-frontend/src/views/sqlbot \
  dataease/core/core-frontend/src/layout/components \
  dataease/core/core-frontend/src/views/login \
  dataease/core/core-frontend/src/router/index.ts \
  docs/superpowers/plans/2026-04-16-sqlbot-new-functionalization-and-topbar-alignment-plan.md
git commit -m "feat: complete sqlbot-new rollout and topbar alignment"
```

## Self-Review

- Spec coverage:
  - `sqlbot-new` complete functionalization -> covered by Tasks 1-7
  - old intelligent-query capability reuse -> covered by Tasks 2-6
  - global topbar experience alignment -> covered by Task 8
  - route migration to `/sqlbotnew` -> covered by Task 7
- Placeholder scan:
  - no `TBD` / `TODO`
  - each task has exact file paths and concrete checks
- Type consistency:
  - new state types centralized in `types.ts`
  - transport remains sourced from `sqlbotDirect.ts`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-16-sqlbot-new-functionalization-and-topbar-alignment-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints
