# SQLBot New Closure And Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining `sqlbot-new` issues so the page exposes only real capabilities, keeps dataset/file/history flows stable, and reaches a production-grade interaction model on both home and result states.

**Architecture:** Keep `sqlbot-new` mounted on the global `layout` shell and continue using `useSqlbotNewSelection`, `useSqlbotNewConversation`, and `useSqlbotNewHistory` as the runtime boundaries. The implementation should not invent new backend modules for this round; instead it should hide unsupported prototype controls, strengthen the existing SQLBot/DataEase service reuse, and only add lightweight frontend state where local search or UI consistency closes the product gap.

**Tech Stack:** Vue 3, TypeScript, Vite, Element Plus Secondary, existing DataEase datasource APIs, existing SQLBot REST/SSE APIs, `agent-browser`, `eslint`, `vue-tsc`

---

## File Structure

- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  Responsibility: page orchestration, home/result state composition, selection dialog wiring, chips above the composer, final empty-state and layout conditions.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  Responsibility: dataset/file list sources, local keyword filters, selected resource metadata, field-chip generation, restore-safe canonical lookups.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
  Responsibility: chat session lifecycle, history persistence/recovery, question submission, recommendation timing, result/empty/failure record state.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`
  Responsibility: history tree grouping, active item sync, delete/clear actions, restore-entry orchestration.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
  Responsibility: dataset/file select modal UI, hover action exposure, real search inputs, only-supported controls, high-resolution dialog ratios.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
  Responsibility: file upload step-1/step-2 flow, upload parsing UX, save/save-and-ask transitions.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue`
  Responsibility: file preview/detail dialog, failure-state recovery, ask entry.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
  Responsibility: error-state shell around result cards and follow-up/retry action layout.
- [ ] `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
  Responsibility: success result card body, recommendation and footer action density, chart/result rendering.
- [ ] `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
  Responsibility: SQLBot HTTP/SSE wrappers, chat delete wrapper, recommend/question/analysis calls.
- [ ] `dataease/core/core-frontend/src/api/datasource.ts`
  Responsibility: datasource upload/detail/preview wrappers with opt-in silent error behavior.
- [ ] `dataease/core/core-frontend/src/config/axios/index.ts`
  Responsibility: request option pass-through to the Axios service wrapper.
- [ ] `dataease/core/core-frontend/src/config/axios/service.ts`
  Responsibility: shared request/response/error interceptor logic, including typed `silentError` support.
- [ ] `dataease/core/core-frontend/src/router/index.ts`
  Responsibility: `/#/sqlbotnew` route mounted under the global shell without path validation regressions.
- [ ] `docs/superpowers/specs/2026-04-16-sqlbot-new-data-selection-and-file-query-closure-design.md`
  Responsibility: source-of-truth design doc for this closure pass.
- [ ] `tmp/sqlbotnew-acceptance-notes.md`
  Responsibility: full acceptance matrix for the whole `sqlbot-new` line.
- [ ] `tmp/sqlbotnew-data-selection-closure-notes.md`
  Responsibility: focused acceptance notes for data selection and file-query closure.

---

### Task 1: Make Home And Result States Decision-Complete

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Remove meaningless formal-conversation empty cards once a session exists**

In [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue), keep the result scroll region rendering logic only for:

```vue
<template v-if="hasConversationRecords">
  <!-- record list -->
</template>
<article v-else-if="pageMode === 'result' && !historyTreeExpanded" class="conversation-empty-card">
  <!-- fallback empty copy -->
</article>
```

The final condition must ensure the “请输入问题开始真实问数” placeholder card never renders when the user is already in a meaningful restored/history/result session.

- [ ] **Step 2: Keep home-page flow on the home page until submit**

Preserve the homepage submit sequence in [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue):

```ts
const handleSubmitFromHome = async () => {
  const success = await submitQuestion({
    executionContext: effectiveExecutionContext.value,
    question: draftQuestion.value,
    reason: 'submit',
    selectionTitle: displaySelectionTitle.value,
    selectionMeta: displaySelectionMeta.value
  })
  if (success) {
    await refreshHistory()
  }
}
```

No automatic transition to result mode is allowed on resource selection alone.

- [ ] **Step 3: Expose real `关键指标` / `分析维度` chips above the composer**

In [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts), add two computed arrays built from real schema-derived fields:

```ts
const selectedMetricFields = computed(() => {
  return inferMetricFields(activeSelectionFields.value).slice(0, 6)
})

const selectedDimensionFields = computed(() => {
  return inferDimensionFields(activeSelectionFields.value).slice(0, 8)
})
```

Then render them in [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue) above the bottom/result composer:

```vue
<section v-if="selectedMetricFields.length || selectedDimensionFields.length" class="selection-insight-panel">
  <div v-if="selectedMetricFields.length" class="insight-row">
    <span class="insight-label">关键指标</span>
    <span v-for="item in selectedMetricFields" :key="item" class="insight-chip metric">{{ item }}</span>
  </div>
  <div v-if="selectedDimensionFields.length" class="insight-row">
    <span class="insight-label">分析维度</span>
    <span v-for="item in selectedDimensionFields" :key="item" class="insight-chip dimension">{{ item }}</span>
  </div>
</section>
```

- [ ] **Step 4: Make selected-resource removal the single clear action for chips/context**

In [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue), wire the selected-resource chip close interaction to a real clear action instead of decorative `✕` text:

```vue
<button class="selected-dataset-chip" type="button" @click="clearCurrentSelection">
  {{ displaySelectionTitle }}
  <span class="chip-close">×</span>
</button>
```

And in [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts):

```ts
const clearCurrentSelection = () => {
  selectionState.datasetId = ''
  selectionState.fileId = ''
  runtimeState.datasetDatasourceId = ''
  runtimeState.fileDatasourceId = ''
  dialogState.datasetKeyword = ''
  dialogState.fileKeyword = ''
}
```

- [ ] **Step 5: Keep result-page failure cards on the same width/grid system as success cards**

In [SqlbotNewConversationRecord.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue), keep the error wrapper using the same width determined by the parent `sqlbot-conversation-shell`. Do not add a custom narrower max-width branch.

- [ ] **Step 6: Run targeted lint**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint src/views/sqlbot-new/index.vue src/views/sqlbot-new/useSqlbotNewConversation.ts src/views/sqlbot-new/useSqlbotNewSelection.ts src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue --ext .ts,.vue --fix
```

Expected: no eslint errors remain in the touched files.

### Task 2: Complete Dataset/File Selection Dialog Truthfulness

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Keep only the real dataset filter set**

Ensure [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue) defines:

```ts
const datasetFilters = [{ key: 'all', label: '全部' }]
```

Do not render `我的创建 / 常用 / 最近使用`.

- [ ] **Step 2: Keep dataset/file card lists aligned to the same card grammar**

Both dataset and file cards must expose:

```vue
<div class="card-head">...</div>
<div class="card-fields">...</div>
<div class="card-actions">预览 / 提问</div>
```

The action surface may be hover-revealed, but the structure must be shared so both tabs feel like one system.

- [ ] **Step 3: Add hover-revealed `预览 / 提问` actions to dataset cards**

In [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue), augment dataset cards with:

```vue
<div class="dataset-card-actions">
  <button class="dataset-action ghost" type="button" @click.stop="emit('open-dataset-preview', item.id)">
    预览
  </button>
  <button class="dataset-action primary" type="button" @click.stop="emit('ask-dataset', item.id)">
    提问
  </button>
</div>
```

And extend emits/handlers through [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue) to:
- open a dataset preview dialog
- or set the dataset and jump into question-ready state

- [ ] **Step 4: Keep card click as selection only**

Dataset and file cards must only select on card click:

```ts
const handleDatasetSelect = (id: string) => {
  emit('select-dataset', id)
}

const handleFileSelect = (id: string) => {
  emit('select-file', id)
}
```

Only the footer `确认选择` button may close the dialog.

- [ ] **Step 5: Ensure selected summary and page labels are sourced from canonical selections**

In [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts), preserve these canonical lookups:

```ts
const selectedDatasetItem = computed(() => {
  return baseDatasetItems.value.find(item => item.id === selectionState.datasetId) || null
})

const selectedFileItem = computed(() => {
  return baseFileItems.value.find(item => item.id === selectionState.fileId) || null
})
```

Never derive selected-summary state from filtered `datasetItems` / `fileItems`.

- [ ] **Step 6: Keep file tab free of unsupported controls**

`SqlbotNewSelectDataDialog.vue` must not render:

```vue
<!-- remove -->
<span class="file-card-icon">···</span>
<span class="file-card-icon">🗑</span>
<div class="sort-box">...</div>
```

Keep only `上传文件 / 预览 / 提问 / 确认选择`.

- [ ] **Step 7: Run browser verification**

Run:

```bash
agent-browser close --all
agent-browser open 'http://127.0.0.1:8080/#/sqlbotnew'
```

Then verify:
1. dataset dialog opens
2. dataset card click only selects
3. footer confirm still required to close
4. dataset/file search filters locally
5. search-empty file state shows “没有匹配的数据文件”

### Task 3: Build Dataset Preview / Ask Flows

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Create or Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewDatasetDetailDialog.vue`

- [ ] **Step 1: Create a dedicated dataset preview dialog component**

Create [SqlbotNewDatasetDetailDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewDatasetDetailDialog.vue) with props:

```ts
defineProps<{
  visible: boolean
  datasetId: string
  title: string
  metricFields: string[]
  dimensionFields: string[]
}>()
```

It should render:
- dataset title
- inferred `关键指标`
- inferred `分析维度`
- optional datasource label if available
- a `提问` button

- [ ] **Step 2: Add dataset preview state to selection composable**

In [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts):

```ts
const datasetDetailVisible = ref(false)
const datasetDetailId = ref('')

const openDatasetDetail = (id: string) => {
  datasetDetailId.value = id
  datasetDetailVisible.value = true
}

const closeDatasetDetail = () => {
  datasetDetailVisible.value = false
}
```

- [ ] **Step 3: Add direct dataset ask behavior**

Implement:

```ts
const askFromDatasetCard = (id: string) => {
  selectionState.datasetId = id
  selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.dataset
  dialogState.selectDialogVisible = false
}
```

Do not jump to result page yet; only prepare the resource and keep the user at question-ready state per the confirmed requirement.

- [ ] **Step 4: Render the dataset preview dialog from the page shell**

In [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue):

```vue
<SqlbotNewDatasetDetailDialog
  :visible="datasetDetailVisible"
  :dataset-id="datasetDetailId"
  :title="selectedDatasetTitle"
  :metric-fields="selectedMetricFields"
  :dimension-fields="selectedDimensionFields"
  @close="closeDatasetDetail"
  @ask="askFromDatasetDetail"
/>
```

- [ ] **Step 5: Verify direct ask from dataset/file cards**

Expected:
- Clicking dataset/file card `提问` prepares selection and returns to the home/question-ready state
- It does not immediately jump to result page
- After the user types a question and submits, result page opens normally

### Task 4: Strengthen File Upload And File Detail Product UX

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue`
- Modify: `dataease/core/core-frontend/src/config/axios/index.ts`
- Modify: `dataease/core/core-frontend/src/config/axios/service.ts`
- Modify: `dataease/core/core-frontend/src/api/datasource.ts`

- [ ] **Step 1: Keep upload step-1 CTA copy concise**

Use the existing intended copy in [SqlbotNewFileUploadDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue):

```vue
<div class="dropzone-title">选择文件开始上传</div>
<div class="dropzone-copy">支持 CSV、XLS、XLSX，默认解析第一个 Sheet</div>
```

- [ ] **Step 2: Keep upload parse errors productized**

Use business-copy constants:

```ts
const FILE_PARSE_FAILURE_COPY =
  '文件暂时无法解析，请确认文件格式正确、首行为字段名且内容完整后重新上传'
const FILE_EMPTY_FAILURE_COPY =
  '未识别到可导入的数据，请确认首行为字段名并至少保留一行数据'
```

- [ ] **Step 3: Scope `silentError` to sqlbot-new call sites only**

Ensure shared datasource wrappers default to `silentError = false`:

```ts
export const getById = (id: string | number, silentError = false) =>
  request.get({ url: '/datasource/get/' + id, silentError })
```

And only `sqlbot-new` upload/detail calls pass `true`.

- [ ] **Step 4: Keep detail dialog failure state actionable**

Use the current business failure state:

```vue
<div class="detail-status-title">文件预览暂时不可用</div>
<div class="detail-status-copy">{{ previewError }}</div>
<button class="detail-status-action" type="button" @click="retryPreview">
  重新加载预览
</button>
```

- [ ] **Step 5: Verify file step-1 / step-2 / detail in browser**

Run:

```bash
agent-browser open 'http://127.0.0.1:8080/#/sqlbotnew'
```

Then verify:
1. open file tab
2. open upload dialog
3. upload `/Users/chenliyong/AI/github/StarBI/tmp/starbi_file_query_demo.csv`
4. confirm step-2 preview
5. open detail dialog

Expected: no raw backend `msg` or traceback leaks.

### Task 5: Finalize Result-Page Consistency

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`

- [ ] **Step 1: Remove the meaningless result-page empty prompt card**

In [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue), make sure the result scroll area does not render the empty instructional card when the user is already in a real session/history context.

- [ ] **Step 2: Keep failure cards on the same width and axis as success cards**

Use the same main column width and spacing system for both success and failure cards.

- [ ] **Step 3: Add AI guidance to failure cards**

The failure card should explain:
- why the question failed (business language)
- how to re-ask
- optionally recommend a narrower or safer follow-up formulation

If no recommendation can be generated, at least show one actionable prompt hint.

- [ ] **Step 4: Keep result-page action hierarchy strong**

`数据解读 / 追加追问 / 更多` must remain reachable and visually consistent after all layout changes.

- [ ] **Step 5: Run result-page regression**

Verify:
1. no meaningless empty prompt card
2. failure card same width as success card
3. `数据解读` sends real request
4. `追加追问` backfills textarea

### Task 6: Final Acceptance Notes And Closure Summary

**Files:**
- Modify: `docs/superpowers/specs/2026-04-16-sqlbot-new-data-selection-and-file-query-closure-design.md`
- Modify: `tmp/sqlbotnew-data-selection-closure-notes.md`
- Create: `tmp/sqlbotnew-final-acceptance-notes.md`

- [ ] **Step 1: Run focused static checks**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint src/views/sqlbot-new src/views/sqlbot src/api/datasource.ts src/config/axios src/router/index.ts --ext .ts,.vue --fix
npm run ts:check
```

Expected:
- eslint passes on touched files
- `ts:check` may still fail only on the known existing watermark TS6504 issue

- [ ] **Step 2: Run final browser acceptance matrix**

Cover:
1. `/#/sqlbotnew` home page
2. dataset dialog open/filter/select/confirm
3. file tab open/filter/upload/preview/detail
4. dataset ask path
5. file ask path
6. result page success card
7. failure card productization
8. history single delete
9. clear confirm dialog

- [ ] **Step 3: Write `tmp/sqlbotnew-final-acceptance-notes.md`**

Use:

```md
# SQLBot New Final Acceptance Notes

- Home page: PASS/FAIL
- Dataset dialog: PASS/FAIL
- Dataset local search: PASS/FAIL
- File tab: PASS/FAIL
- File local search: PASS/FAIL
- File upload preview: PASS/FAIL
- File detail preview: PASS/FAIL
- Result page success path: PASS/FAIL
- Result page failure path: PASS/FAIL
- History delete: PASS/FAIL
- History clear confirm: PASS/FAIL
- Remaining issues:
```

- [ ] **Step 4: Update the closure design doc with final implementation status**

Append/update:

```md
## Final Closure Status

- Dataset selection core flow: complete
- Dataset/file local search: complete
- File upload/preview/detail: complete
- Static unsupported controls: removed
- Result page consistency: [complete / partial]
- Remaining follow-up: [list]
```

- [ ] **Step 5: Sync `tmp/sqlbotnew-data-selection-closure-notes.md` to final truth**

Ensure the file reflects the real PASS/FAIL status after implementation, not just interim status.

## Self-Review

- Spec coverage:
  - Home/result state closure: Task 1 and Task 5
  - Dataset/file selection truthfulness: Task 2 and Task 3
  - File upload/detail productization: Task 4
  - Acceptance docs: Task 6
- Placeholder scan:
  - No `TODO`, `TBD`, or vague “handle appropriately” steps remain
  - Every code-changing step names exact files and snippets
  - Every verification step includes exact commands or browser actions
- Type consistency:
  - `datasetKeyword`, `fileKeyword`, `selectedDatasetTitle`, `selectedFileTitle`, `totalFileItems`
  - `silentError` remains opt-in, not global
  - dataset/file direct ask flows keep “select first, submit later” semantics

**Plan complete and saved to `docs/superpowers/plans/2026-04-17-sqlbot-new-closure-and-optimization-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
