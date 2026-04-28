# SQLBot Multi-Dataset Combination Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Quick BI style result-area flow where selecting multiple datasets from the clarification card requires building dataset relationships first, saves a real dataset combination into dataset-combination management, and then continues Q&A and chart generation on that saved combination dataset.

**Architecture:** Keep `分析主题` as a dataset grouping boundary and move relationship modeling into the result flow. The frontend presents a multi-select clarification card, then a combination dialog that reuses existing dataset-union editing concepts; the backend reuses existing dataset union persistence to create a real saved combination dataset that is visible in dataset-combination management and returns a combination execution context that `sqlbot-new` can submit through the current SQLBot pipeline.

**Tech Stack:** Vue 3, Vite, existing `sqlbot-new` composables, Element Plus Secondary, existing dataset union editor components, Spring Boot backend, MyBatis entities/mappers, agent-browser for verification

**Execution Note:** The user explicitly forbids git operations in this workspace. Do not add, commit, amend, reset, checkout, or otherwise use git during execution of this plan.

---

## File Structure

### Frontend result-flow layer

- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
  - Responsibility: add `dataset-combination` execution context and clarification state needed for multi-select + relationship-building
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  - Responsibility: result-flow orchestration, open combination dialog after multi-select, submit with combination context
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  - Responsibility: dataset candidate metadata, selected multi-dataset context, temporary combination selection snapshot
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
  - Responsibility: allow `dataset-combination` execution context in certificates, blocked-reason checks, snapshot/history persistence
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewClarificationCard.vue`
  - Responsibility: grid-style dataset cards, multi-select state, confirm CTA
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
  - Responsibility: forward clarification selection events from the result card
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewDatasetCombinationDialog.vue`
  - Responsibility: result-area combination editor dialog for primary dataset, auxiliary datasets, and relation rows
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/datasetCombinationAdapter.ts`
  - Responsibility: adapt `sqlbot-new` dataset cards and field metadata into the union-editor structure expected by the dialog
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiQueryDatasetCombination.ts`
  - Responsibility: saved combination create/get helper API for `sqlbot-new`

### Backend saved combination layer

- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/AIQueryDatasetCombinationApi.java`
  - Responsibility: REST contract for creating saved dataset combinations from the result flow
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryDatasetCombinationCreateRequest.java`
  - Responsibility: request payload for primary dataset, secondary datasets, and relation conditions
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryDatasetCombinationVO.java`
  - Responsibility: response payload for the saved combination dataset identity and execution context
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryDatasetCombinationServer.java`
  - Responsibility: REST controller implementation
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryDatasetCombinationManage.java`
  - Responsibility: build and persist saved combination datasets by reusing dataset union logic
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/dataset/manage/DatasetGroupManage.java`
  - Responsibility: expose a small reusable entry point for programmatic union dataset creation without going through the full visual editor page

### Existing reusable references

- Reference only: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/dataset/form/UnionEdit.vue`
  - Responsibility: current union dataset relationship editor UI concepts
- Reference only: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/dataset/form/UnionItemEdit.vue`
  - Responsibility: relation-row editing concepts and join-type selector
- Reference only: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/db/migration/V2.0__core_ddl.sql`
  - Responsibility: current `core_dataset_group.union_sql` shape used by dataset unions

---

## Task 1: Freeze the Product Contract for Multi-Dataset Result Flow

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts`

- [ ] **Step 1: Extend execution-context and clarification types**

Add or confirm these type-level capabilities:

```ts
export type SourceKind = 'dataset' | 'file' | 'dataset-combination'

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

export interface SqlbotNewClarificationOption {
  label: string
  value: string
  description?: string
  chips?: string[]
}

export interface SqlbotNewClarificationState {
  reasonCode: string
  prompt: string
  options: SqlbotNewClarificationOption[]
  pending: boolean
  selectionMode?: 'single' | 'multiple'
  confirmLabel?: string
  selectedValues?: string[]
}
```

- [ ] **Step 2: Preserve backward compatibility**

Rules:

```text
- single-dataset flow still uses queryMode='dataset'
- file flow still uses queryMode='file'
- only saved-combination flow uses queryMode='dataset-combination'
- existing history entries without combination fields must still deserialize safely
```

- [ ] **Step 3: Verify frontend compile assumptions**

Run:

```bash
./dataease-web.sh
```

Expected:

```text
- Vite starts
- no TypeScript compile failure caused by new union type members
```

---

## Task 2: Replace the Result Clarification with a Multi-Select Grid Card

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewClarificationCard.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Keep only one pending clarification record per question**

In `useSqlbotNewConversation.ts`, before appending a new pending clarification record, clear existing pending clarification records for the same `reasonCode`.

Intent:

```ts
const clearPendingClarificationRecords = (reasonCode?: string) => {
  if (!conversationSession.value?.records?.length) return
  conversationSession.value.records = conversationSession.value.records.filter(record => {
    if (!record.clarification?.pending) return true
    if (reasonCode && record.clarification.reasonCode !== reasonCode) return true
    return false
  })
}
```

- [ ] **Step 2: Render the card as dataset cards, not small pills**

Card layout contract:

```text
- 3 columns
- max 6 cards
- each card shows dataset name + up to 3 field chips
- footer shows "已选 N 个数据集" or empty-state copy
- confirm button text: "按所选数据集继续"
```

Representative template shape:

```vue
<div class="clarification-options is-grid">
  <button
    v-for="item in visibleOptions"
    :key="item.value"
    class="clarification-option is-card"
    :class="{ selected: selectedValues.includes(item.value) }"
    @click="toggleOption(item.value)"
  >
    <span class="option-label">{{ item.label }}</span>
    <div class="option-chip-row">
      <span v-for="chip in item.chips" :key="`${item.value}-${chip}`" class="option-chip">
        {{ chip }}
      </span>
    </div>
  </button>
</div>
```

- [ ] **Step 3: Bubble multi-select state changes back to the result record**

In `SqlbotNewClarificationCard.vue`, emit:

```ts
(event: 'selection-change', value: string[]): void
```

In `SqlbotNewConversationRecord.vue`, forward:

```vue
@selection-change="value => emit('clarification-selection-change', record, value)"
```

In `index.vue`, apply:

```ts
const handleClarificationSelectionChange = (
  record: SqlbotNewConversationRecordItem,
  value: string[]
) => {
  if (!record.clarification) return
  record.clarification = {
    ...record.clarification,
    selectedValues: [...value]
  }
}
```

- [ ] **Step 4: Verify the card becomes selectable and stable**

Run:

```bash
./dataease-web.sh
agent-browser close --all
agent-browser open 'http://localhost:8080/#/login'
```

Manual automation checkpoint:

```text
1. login as admin
2. open /#/sqlbotnew
3. submit "帮我分析最近趋势"
4. confirm a grid clarification card appears
5. click 2 cards
6. confirm selected state remains and confirm button enables
```

Output:

```text
- save screenshot to /tmp/sqlbot-result-multi-dataset-grid.png
```

---

## Task 3: Insert the Dataset Combination Dialog Between Multi-Select and Submit

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewDatasetCombinationDialog.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/datasetCombinationAdapter.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Reference: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/dataset/form/UnionEdit.vue`
- Reference: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/dataset/form/UnionItemEdit.vue`

- [ ] **Step 1: Create a lightweight combination dialog contract**

Dialog props / emits:

```ts
defineProps<{
  visible: boolean
  datasetOptions: Array<{
    id: string
    title: string
    fields: string[]
    metricFields?: string[]
    dimensionFields?: string[]
  }>
}>()

defineEmits<{
  (event: 'close'): void
  (event: 'confirm', payload: {
    name: string
    primaryDatasetId: string
    secondaryDatasetIds: string[]
    relations: Array<{
      leftDatasetId: string
      leftField: string
      rightDatasetId: string
      rightField: string
      relationType: 'left' | 'inner' | 'right' | 'full'
    }>
  }): void
}>()
```

- [ ] **Step 2: Reuse current union editor concepts instead of inventing a new relationship model**

Adapter responsibilities in `datasetCombinationAdapter.ts`:

```ts
export const buildCombinationFieldOptions = (dataset: {
  id: string
  title: string
  metricFields?: string[]
  dimensionFields?: string[]
  fields: string[]
}) => {
  return [...new Set([...(dataset.dimensionFields || []), ...(dataset.metricFields || []), ...dataset.fields])]
}
```

The dialog must expose:

```text
- 主数据集
- 辅助数据集
- 关联条件
- 添加关联
- 删除关联
```

- [ ] **Step 3: Gate the result flow**

In `index.vue`:

```ts
if (reasonCode === 'ambiguous_dataset') {
  const selectedValues = Array.isArray(value) ? value : [value]
  if (selectedValues.length === 1) {
    // existing direct dataset path
  } else {
    pendingCombinationQuestion.value = record.question
    pendingCombinationDatasetIds.value = [...selectedValues]
    datasetCombinationDialogVisible.value = true
    return
  }
}
```

- [ ] **Step 4: Dialog validation rules**

Validation contract:

```text
- must have primary dataset
- must have at least one secondary dataset
- each secondary dataset must have at least one relation row
- every relation row must have leftField/rightField
- relationType defaults to left
```

- [ ] **Step 5: Verify the dialog opens instead of direct submit**

Automation checkpoint:

```text
1. trigger ambiguous dataset clarification
2. select 2 datasets
3. click "按所选数据集继续"
4. expect combination dialog, not immediate question submission
```

Output:

```text
- save screenshot to /tmp/sqlbot-dataset-combination-dialog.png
```

---

## Task 4: Add a Saved Dataset Combination Backend API

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/AIQueryDatasetCombinationApi.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryDatasetCombinationCreateRequest.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryDatasetCombinationVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryDatasetCombinationServer.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryDatasetCombinationManage.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/dataset/manage/DatasetGroupManage.java`

- [ ] **Step 1: Add the API contract**

Recommended request payload:

```java
public class AIQueryDatasetCombinationCreateRequest {
    private String name;
    private Long primaryDatasetId;
    private List<Long> secondaryDatasetIds = new ArrayList<>();
    private List<RelationItem> relations = new ArrayList<>();

    public static class RelationItem {
        private Long leftDatasetId;
        private String leftField;
        private Long rightDatasetId;
        private String rightField;
        private String relationType;
    }
}
```

Recommended response payload:

```java
public class AIQueryDatasetCombinationVO {
    private Long combinationDatasetId;
    private String combinationDatasetName;
    private Long datasourceId;
    private boolean datasourcePending;
}
```

- [ ] **Step 2: Reuse existing dataset union persistence instead of inventing a second combination storage model**

The backend should:

```text
- create a real saved dataset-group node in the current org
- populate its union / union_sql structure using existing dataset union logic
- place it in the existing 数据集组合管理 scope
- return the new dataset-group id as combinationDatasetId
```

Reference:

```text
- core_dataset_group.union_sql already stores associated dataset SQL
- visual dataset editor already knows how to build union relationships
```

- [ ] **Step 3: Add naming and persistence rules**

For P0:

```text
- combination datasets are saved entities, not temporary hidden nodes
- default name can use 问数组合_YYYYMMDD_HHmmss, but the dialog must allow user override
- created combination datasets must appear in 数据集组合管理
- later questions and history restore should reference the saved combination id directly
```

- [ ] **Step 4: Validate same-source vs cross-source behavior**

Rules:

```text
- if all datasets resolve to one datasource: allow
- if datasets resolve to unsupported cross-source combination: return a 4xx business error
- error message must be user-readable for the result dialog
```

- [ ] **Step 5: Verify the backend contract manually**

Run targeted backend verification after implementation:

```bash
./dataease-app.sh
```

Expected:

```text
- backend starts
- calling the new endpoint returns combinationDatasetId / datasourceId
- the saved combination dataset can be queried from existing dataset management APIs
```

---

## Task 5: Continue Q&A and Charting on the Saved Combination Dataset

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiQueryDatasetCombination.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`

- [ ] **Step 1: Add the frontend API helper**

Suggested client shape:

```ts
export const createSavedDatasetCombination = async (data: {
  name: string
  primaryDatasetId: string
  secondaryDatasetIds: string[]
  relations: Array<{
    leftDatasetId: string
    leftField: string
    rightDatasetId: string
    rightField: string
    relationType: 'left' | 'inner' | 'right' | 'full'
  }>
}) => {
  return request.post({ url: '/ai/query/dataset-combination', data }).then((res: any) => res?.data || res)
}
```

- [ ] **Step 2: Convert dialog result into a combination execution context**

After dialog confirm:

```ts
const combinationContext: SqlbotNewExecutionContext = {
  themeId: activeThemeId.value || '',
  themeName: activeTheme.value?.name || '',
  queryMode: 'dataset-combination',
  sourceId: String(payload.primaryDatasetId),
  sourceIds: [payload.primaryDatasetId, ...payload.secondaryDatasetIds],
  combinationId: String(result.combinationDatasetId),
  combinationName: result.combinationDatasetName,
  datasourceId: String(result.datasourceId || ''),
  modelId: activeModelId,
  datasourcePending: result.datasourcePending === true
}
```

- [ ] **Step 3: Update SQLBot certificate building**

In `useSqlbotNewConversation.ts`, certificate logic should treat `dataset-combination` as dataset mode:

```ts
return buildSqlBotCertificate({
  datasetIds: executionContext.combinationId
    ? [executionContext.combinationId]
    : executionContext.sourceIds?.length
    ? executionContext.sourceIds
    : executionContext.sourceId
    ? [executionContext.sourceId]
    : [],
  datasourceId: normalizeOptionalId(executionContext.datasourceId) || undefined,
  entryScene: executionContext.queryMode === 'dataset-combination' ? 'dataset_combination_query' : 'dataset_query'
})
```

- [ ] **Step 4: Persist and display the combination context**

Display rules:

```text
- selected chip shows combinationDatasetName
- selection meta shows "已选 N 个数据集"
- context switch card copy uses "组合数据集"
- history snapshot stores combinationId / combinationName / sourceIds
- successful creation can expose a shortcut such as "去数据集组合管理查看"
```

- [ ] **Step 5: Verify continue-Q&A works**

Automation checkpoint:

```text
1. trigger ambiguous dataset clarification
2. select 2 datasets
3. open combination dialog
4. configure one relation
5. confirm
6. expect question to continue automatically
7. expect result context chip to show combination dataset name
```

Output:

```text
- save screenshot to /tmp/sqlbot-dataset-combination-after-confirm.png
```

---

## Task 6: Preserve Combination Context in History Restore

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts`

- [ ] **Step 1: Persist combination metadata into snapshots**

Snapshot contract additions:

```ts
activeCombinationId?: string
activeCombinationName?: string
activeSourceIds?: string[]
```

- [ ] **Step 2: Restore combination execution context**

History-restore logic must reconstruct:

```ts
queryMode: 'dataset-combination'
combinationId
combinationName
sourceIds
selectionTitle
selectionMeta
```

- [ ] **Step 3: Verify history restore of a combination session**

Automation checkpoint:

```text
1. create a combination-backed question session
2. return home
3. click the history item
4. expect restored selection chip to show the combination dataset
5. expect result flow to remain in combination context
```

Output:

```text
- save screenshot to /tmp/sqlbot-dataset-combination-history-restore.png
```

---

## Task 7: Final Regression and Delivery Evidence

**Files:**
- Modify: none
- Output:
  - `/tmp/sqlbot-result-multi-dataset-grid.png`
  - `/tmp/sqlbot-dataset-combination-dialog.png`
  - `/tmp/sqlbot-dataset-combination-after-confirm.png`
  - `/tmp/sqlbot-dataset-combination-history-restore.png`

- [ ] **Step 1: Validate the acceptance checklist**

Checklist:

```text
- result clarification uses 3-column card grid
- selecting multiple datasets opens relationship-building dialog instead of direct question submit
- relationship dialog requires main dataset + relation fields before confirm
- confirm creates a saved combination dataset
- the new combination dataset is visible in 数据集组合管理
- question continues on that saved combination dataset
- chart/result context references the combination dataset
- history restore brings combination context back
```

- [ ] **Step 2: Capture one failure-path screenshot**

Failure path:

```text
- choose datasets with incomplete relation config
- confirm remains disabled or shows a readable validation message
```

Suggested output:

```text
- save screenshot to /tmp/sqlbot-dataset-combination-validation-error.png
```

---

## Self-Review

### Spec Coverage

- Covered the new user requirement that multi-dataset result flow must build relationships before continuing Q&A.
- Covered UI, backend combination creation, execution context, certificate generation, and history restore.
- Explicitly separated `分析主题管理` from `关系/组合建模` so the implementation does not incorrectly overload theme management.

### Placeholder Scan

- No `TBD` / `TODO` placeholders left.
- Every task names exact files and expected outputs.

### Risk Notes

- Highest risk is backend saved-combination creation; if direct reuse of dataset union persistence is harder than expected, stop and decide whether P0 should call the same dataset creation pipeline used by current union dataset pages rather than inventing a parallel storage path.
- Existing automation around `agent-browser` can hit duplicate offscreen DOM in result flows; prefer visible-element targeting during verification.
