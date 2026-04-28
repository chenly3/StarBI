# SQLBot New Data Selection And File Query Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove misleading static controls from `sqlbot-new`, tighten the real dataset/file selection flows, and finish the file-query/data-selection experience so users only see trustworthy, functioning operations.

**Architecture:** Keep `sqlbot-new` on the existing global shell and reuse the current `useSqlbotNewSelection`/`useSqlbotNewConversation` composables as the source of truth. This closure pass should not invent new business modules; instead it should explicitly hide unsupported prototype controls, wire low-cost local search where appropriate, keep the true dataset/file flows visible, and document which future filters require backend enhancement.

**Tech Stack:** Vue 3, TypeScript, Vite, Element Plus Secondary, existing DataEase datasource APIs, SQLBot REST/SSE APIs, `agent-browser`, `eslint`, `vue-tsc`

---

## File Structure

- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
  Responsibility: render the dataset/file selection modal; only expose controls backed by real behavior.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
  Responsibility: file upload step-1/step-2 dialog; preserve real upload/preview flow while tightening density.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue`
  Responsibility: datasource-backed file detail preview and “ask now” entry.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  Responsibility: real dataset/file item sources, local search/filter state, restore mapping, selection persistence.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  Responsibility: page shell integration, select-data entry points, history/sidebar interaction, home/result page coordination.
- [ ] `docs/superpowers/specs/2026-04-16-sqlbot-new-data-selection-and-file-query-closure-design.md`
  Responsibility: canonical design/spec; final implementation status should be reflected here.
- [ ] `tmp/sqlbotnew-data-selection-closure-notes.md`
  Responsibility: acceptance notes for this feature-specific closure pass.

---

### Task 1: Remove Static Dataset Controls From The Select-Data Dialog

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`

- [ ] **Step 1: Replace the static dataset filter chip set with a single `全部` filter**

Update [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue) so the dataset filter source becomes:

```ts
const datasetFilters: Array<{ key: FilterKey; label: string }> = [{ key: 'all', label: '全部' }]
```

And keep the render loop unchanged:

```vue
<button
  v-for="filter in datasetFilters"
  :key="filter.key"
  class="filter-chip"
  :class="{ active: filter.key === 'all' }"
  type="button"
>
  {{ filter.label }}
</button>
```

- [ ] **Step 2: Remove static dataset sort and pagination from the dialog template**

Delete the sort-box and pagination blocks from the dataset tab in [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue):

```vue
<div class="sort-box">
  <span class="sort-label">排序：</span>
  <button class="sort-trigger" type="button">最新创建 ▾</button>
</div>
```

```vue
<div class="dialog-pagination">
  <button class="page-button muted" type="button">‹</button>
  <button class="page-button active" type="button">1</button>
  <button class="page-button" type="button">2</button>
  <button class="page-button" type="button">3</button>
  <button class="page-button" type="button">›</button>
</div>
```

- [ ] **Step 3: Remove static dataset card affordances that have no backed behavior**

In [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue), remove:

```vue
<span class="dataset-more">···</span>
```

And simplify the footer to keep only a passive selected-state indicator:

```vue
<div class="dataset-card-foot">
  <span v-if="selectedDatasetId === item.id" class="dataset-check">✓ 已选</span>
</div>
```

- [ ] **Step 4: Remove static `extraBadge` generation in dataset item mapping**

In [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts), update the dataset item mapper from:

```ts
extraBadge: parents.length > 1 ? '已接入' : undefined,
```

to:

```ts
extraBadge: undefined,
```

This avoids presenting an unexplained prototype badge as if it came from backend state.

- [ ] **Step 5: Run lint for the dataset dialog files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue src/views/sqlbot-new/useSqlbotNewSelection.ts --ext .ts,.vue --fix
```

Expected: no eslint errors remain in the touched files.

### Task 2: Add Real Local Search For Dataset And File Lists

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`

- [ ] **Step 1: Add local keyword state for both tabs**

In [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts), add reactive keyword state:

```ts
const dialogKeywords = reactive({
  dataset: '',
  file: ''
})
```

Expose setters:

```ts
const setDatasetKeyword = (value: string) => {
  dialogKeywords.dataset = value.trim()
}

const setFileKeyword = (value: string) => {
  dialogKeywords.file = value.trim()
}
```

- [ ] **Step 2: Filter dataset items in-memory**

Update the dataset items computed output in [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts) so the final returned list applies:

```ts
const datasetKeyword = dialogKeywords.dataset.toLowerCase()
return bucket.filter(item => {
  if (!datasetKeyword) {
    return true
  }
  return [item.title, item.badge, ...(item.fields || [])]
    .join(' ')
    .toLowerCase()
    .includes(datasetKeyword)
})
```

- [ ] **Step 3: Filter file items in-memory**

Update the file list output in [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts):

```ts
const fileKeyword = dialogKeywords.file.toLowerCase()
return bucket.filter(item => {
  if (!fileKeyword) {
    return true
  }
  return [item.title, item.format, item.uploadedAt, ...(item.fields || [])]
    .join(' ')
    .toLowerCase()
    .includes(fileKeyword)
})
```

- [ ] **Step 4: Replace static search placeholders with real text inputs**

In [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue), change the dataset search block to:

```vue
<label class="select-search-bar">
  <span class="search-icon">⌕</span>
  <input
    class="select-search-input"
    type="text"
    :value="datasetKeyword"
    placeholder="搜索数据集名称、字段、标签"
    @input="emit('update-dataset-keyword', ($event.target as HTMLInputElement).value)"
  />
</label>
```

And the file search block to:

```vue
<label class="select-search-bar compact">
  <span class="search-icon">⌕</span>
  <input
    class="select-search-input"
    type="text"
    :value="fileKeyword"
    placeholder="搜索文件名称、格式、上传时间"
    @input="emit('update-file-keyword', ($event.target as HTMLInputElement).value)"
  />
</label>
```

- [ ] **Step 5: Wire the emitted search events through props/emits**

Extend dialog props/emits in [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue):

```ts
const props = defineProps<{
  ...
  datasetKeyword: string
  fileKeyword: string
}>()

const emit = defineEmits<{
  ...
  (event: 'update-dataset-keyword', value: string): void
  (event: 'update-file-keyword', value: string): void
}>()
```

And pass these from [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue).

- [ ] **Step 6: Verify search behavior manually**

Run:

```bash
agent-browser close --all
agent-browser open 'http://localhost:8080/#/login?redirect=/sqlbotnew'
```

Expected:
- entering `茶饮` filters dataset cards
- entering `csv` or a file name filters file cards

### Task 3: Simplify The File Tab To Real Supported Controls Only

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`

- [ ] **Step 1: Reduce file filter chips to a passive label row or remove them**

If the filters are not wired, remove:

```vue
<div class="filter-list">
  <button v-for="filter in fileFilters" ...>
```

If you keep them for display, they must not look interactive. Preferred implementation:

```vue
<div class="filter-static-list">
  <span class="filter-static-chip">数据文件列表</span>
</div>
```

- [ ] **Step 2: Remove non-functional file-card management icons**

Delete from [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue):

```vue
<span class="file-card-icon">···</span>
<span class="file-card-icon">🗑</span>
```

Keep only title + preview + ask actions.

- [ ] **Step 3: Keep the file-card action surface focused**

Use:

```vue
<div class="file-card-actions">
  <button class="file-action ghost" type="button" @click.stop="emit('open-file-preview', item.id)">
    预览
  </button>
  <button class="file-action primary" type="button" @click.stop="emit('ask-file', item.id)">
    提问
  </button>
</div>
```

- [ ] **Step 4: Remove static sort from the file tab**

Delete:

```vue
<div class="sort-box">
  <span class="sort-label">排序：</span>
  <button class="sort-trigger" type="button">最近上传 ▾</button>
</div>
```

- [ ] **Step 5: Lint the dialog file**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue --ext .vue --fix
```

Expected: no eslint errors remain.

### Task 4: Productize File Upload And Preview Error/Help States

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue`

- [ ] **Step 1: Make upload step-1 copy concise and action-oriented**

In [SqlbotNewFileUploadDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue), keep the CTA and shorten copy to:

```vue
<div class="upload-drop-title">点击或拖拽文件到此区域上传</div>
<div class="upload-drop-copy">支持 Excel / CSV，文件将自动解析为可问数的数据源</div>
```

- [ ] **Step 2: Productize upload parse failure**

Keep parse errors user-safe in [SqlbotNewFileUploadDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue):

```ts
ElMessage.error(error instanceof Error ? error.message : '文件解析失败，请稍后重试')
```

If raw backend detail leaks into `error.message`, map it to a user-safe copy before showing.

- [ ] **Step 3: Strengthen file preview failure state in the detail dialog**

In [SqlbotNewFileDetailDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue), replace the bare error text with:

```vue
<div class="preview-status-copy error">{{ previewError }}</div>
<div class="preview-status-hint">可关闭弹窗重新选择文件，或稍后重试。</div>
```

And use user-safe error text:

```ts
previewError.value = '当前文件预览加载失败，请稍后重试'
```

- [ ] **Step 4: Verify upload step-1, step-2, and detail dialog still work**

Run the browser flow:
1. open `数据文件`
2. open upload dialog
3. upload `/Users/chenliyong/AI/github/StarBI/tmp/starbi_file_query_demo.csv`
4. confirm step-2 preview appears
5. open detail dialog

Expected: no broken layout, no raw traceback text, and the ask button still shows.

### Task 5: Finalize Select-Data Dialog High-Resolution Ratios

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`

- [ ] **Step 1: Increase modal width for high-resolution screens**

Use a larger shell size in [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue):

```less
.select-data-dialog {
  width: min(1120px, calc(100vw - 64px));
  min-height: 720px;
}
```

- [ ] **Step 2: Increase card density inside dataset/file grids**

Use:

```less
.dataset-grid,
.file-list {
  gap: 18px;
}

.dataset-card,
.file-card {
  min-height: 168px;
  padding: 16px;
}
```

- [ ] **Step 3: Increase search/filter/footer readability**

Use:

```less
.select-search-input,
.filter-chip,
.select-data-foot,
.selected-summary {
  font-size: 14px;
  line-height: 20px;
}
```

- [ ] **Step 4: Capture a final select-data dialog screenshot**

Run:

```bash
agent-browser close --all
agent-browser open 'http://localhost:8080/#/login?redirect=/sqlbotnew'
```

Then log in, open the dialog, and capture a final screenshot.

Expected: dialog no longer looks undersized on high-resolution screens.

### Task 6: Write Final Closure Notes And Acceptance Summary

**Files:**
- Modify: `docs/superpowers/specs/2026-04-16-sqlbot-new-data-selection-and-file-query-closure-design.md`
- Create: `tmp/sqlbotnew-data-selection-closure-notes.md`

- [ ] **Step 1: Run static checks on touched files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue \
  src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue \
  src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue \
  src/views/sqlbot-new/useSqlbotNewSelection.ts \
  src/views/sqlbot-new/index.vue \
  --ext .ts,.vue --fix
npm run ts:check
```

Expected:
- eslint passes on touched files
- `ts:check` may still fail only on the known `src/views/watermark/index.vue.js` issue

- [ ] **Step 2: Write the feature closure note**

Create `tmp/sqlbotnew-data-selection-closure-notes.md` with:

```md
# SQLBot New Data Selection Closure Notes

- Dataset dialog static controls removed: PASS/FAIL
- Dataset search local filter: PASS/FAIL
- File tab static controls removed: PASS/FAIL
- File upload step-1/step-2: PASS/FAIL
- File detail preview: PASS/FAIL
- File query entry: PASS/FAIL
- Remaining unsupported controls:
- Backend enhancement candidates:
```

- [ ] **Step 3: Update the spec with a closure status section**

Append to [2026-04-16-sqlbot-new-data-selection-and-file-query-closure-design.md](/Users/chenliyong/AI/github/StarBI/docs/superpowers/specs/2026-04-16-sqlbot-new-data-selection-and-file-query-closure-design.md):

```md
## Final Closure Status

- Dataset selection core flow: complete
- Static dataset controls: removed
- File upload/preview flow: complete
- Static file controls: removed
- Local search: [complete / deferred]
- Backend enhancement needed: [yes/no, list]
```

- [ ] **Step 4: Report final unsupported features explicitly**

The final notes must clearly state which controls remain intentionally hidden because they have no real service backing.

## Self-Review

- Spec coverage:
  - Static dataset controls removed: Task 1
  - Local search added: Task 2
  - File tab simplified to real controls: Task 3
  - Upload/detail error states productized: Task 4
  - High-resolution dialog ratio finalized: Task 5
  - Closure notes and spec update: Task 6
- Placeholder scan:
  - No `TODO`, `TBD`, or “handle appropriately” instructions remain
  - All code-change steps show exact snippets
  - All verification steps use exact commands
- Type consistency:
  - Dialog emits use `update-dataset-keyword` / `update-file-keyword`
  - Selection state uses `datasetKeyword` / `fileKeyword` only through composable state
  - File flow still uses `datasourceId` as string-safe identifiers

**Plan complete and saved to `docs/superpowers/plans/2026-04-16-sqlbot-new-data-selection-and-file-query-closure-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
