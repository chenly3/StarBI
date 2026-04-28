# SQLBot New Remaining Issues Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining `sqlbotnew` issues so the new intelligent-query experience is visually acceptable on high-resolution screens, historically consistent, and fully regression-tested for dataset/file query flows.

**Architecture:** Keep `#/sqlbotnew` on the global `layout` shell, continue using the extracted `useSqlbotNewSelection`, `useSqlbotNewConversation`, and `useSqlbotNewHistory` composables, and finish the remaining product gaps by tightening persistence rules, productizing failure states, and running targeted browser-based regression. The work stays frontend-first, with SQLBot backend reuse through the existing `/api/v1/chat/*` contract, especially the delete/history endpoints already exposed.

**Tech Stack:** Vue 3, TypeScript, Vite, Element Plus Secondary, existing SQLBot REST/SSE APIs, `agent-browser`, `eslint`, `vue-tsc`

---

## File Structure

- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
  Responsibility: conversation session lifecycle, history snapshot persistence, SQLBot stream/replay/delete behavior.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`
  Responsibility: history tree grouping, delete/clear actions, restore entry orchestration, user-facing confirm/error messaging.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  Responsibility: selection restore, model fallback, dataset/file datasource resolution.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  Responsibility: `sqlbotnew` page shell, layout tokens, sidebar/history rendering, home/result page spacing.
- [ ] `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
  Responsibility: success result card visual density, action prominence, error-state text rendering, chart block readability.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
  Responsibility: data/file selection dialog density and affordance quality.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
  Responsibility: file upload step-1 content density and CTA hierarchy.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue`
  Responsibility: file preview step-2/preview error rendering and “ask now” affordance.
- [ ] `dataease/core/core-frontend/src/router/index.ts`
  Responsibility: `#/sqlbotnew` mounted under the global shell route.
- [ ] `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
  Responsibility: frontend wrapper around SQLBot chat/history/delete APIs.

---

### Task 1: Stabilize History Restore Context

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Test: Browser flow against `#/sqlbotnew`

- [ ] **Step 1: Reproduce the current degraded-history behavior**

Run:

```bash
agent-browser close --all
agent-browser open 'http://localhost:8080/#/login?redirect=/sqlbotnew'
```

Expected: login page opens. After logging in and opening `历史对话`, older entries may still show `历史上下文不完整，仅可查看结果`.

- [ ] **Step 2: Make restored dataset sessions fall back to the active/default runtime model**

Update the restore branch in [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts):

```ts
const applyRestoredSelection = async (executionContext: SqlbotNewExecutionContext) => {
  selectionState.sourceKind = executionContext.queryMode
  selectionState.modelId =
    executionContext.modelId || selectionState.modelId || runtimeModels.value[0]?.id || ''
```

- [ ] **Step 3: Relax the dataset-history “incomplete context” rule**

Update the missing-context computation in [useSqlbotNewConversation.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts):

```ts
const missingRequiredContext =
  queryMode === 'file' ? !sourceId || !datasourceId : !sourceId
```

This preserves strictness for file history while allowing dataset history to recover with a default model.

- [ ] **Step 4: Ensure restored conversations persist the repaired context back into snapshot storage**

Keep the restore branch writing the repaired context after successful replay:

```ts
if (conversationSession.value.id) {
  restoredHistoryContext.value = createHistoryContext(
    resolvedExecutionContext,
    String(conversationSession.value.id),
    entry.selectionTitle || detail?.datasource_name || detail?.brief || entry.title,
    entry.selectionMeta || String(detail?.datasource_name || '')
  )
}
persistConversationSnapshot(resolvedExecutionContext)
```

- [ ] **Step 5: Run type-check and lint for the history restore files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run ts:check
./node_modules/.bin/eslint src/views/sqlbot-new/useSqlbotNewSelection.ts src/views/sqlbot-new/useSqlbotNewConversation.ts --fix
```

Expected: `vue-tsc` passes; eslint exits without remaining errors.

- [ ] **Step 6: Commit**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts
git commit -m "fix: relax sqlbot-new dataset history restore"
```

### Task 2: Finish History Delete And Clear Closure

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
- Test: Browser flow against `#/sqlbotnew`

- [ ] **Step 1: Keep single-delete and group-clear on the same SQLBot delete API**

Use the existing delete wrapper in [sqlbotDirect.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts):

```ts
export const deleteSQLBotChat = async (
  context: SQLBotRequestContext,
  chatId: number,
  brief = 'chat'
) => {
  const safeBrief = encodeURIComponent(String(brief || 'chat'))
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/${chatId}/${safeBrief}`,
    {
      method: 'DELETE',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )
  return unwrapSqlBotResponse<string>(response)
}
```

- [ ] **Step 2: Keep the history composable responsible for all user-facing confirmations**

Retain the confirm/clear logic in [useSqlbotNewHistory.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts):

```ts
await ElMessageBox.confirm(
  `确认清理${scopeLabel}（共 ${targets.length} 条）吗？`,
  '清理历史对话',
  {
    type: 'warning',
    confirmButtonText: '清理',
    cancelButtonText: '取消'
  }
)
```

- [ ] **Step 3: Ensure delete and clear fully refresh active state**

Preserve the post-delete refresh semantics:

```ts
historyItems.value = historyItems.value.filter(historyItem => historyItem.id !== id)
if (activeHistoryId.value === id) {
  activeHistoryId.value = ''
}
await refreshHistory(false)
```

- [ ] **Step 4: Keep delete and clear affordances visible but compact in the page shell**

Keep the sidebar controls in [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue):

```vue
<button
  class="history-tree-clear"
  type="button"
  :disabled="historyDeleting || !recentHistoryItems.length"
  @click="handleClearHistory('recent')"
>
  清空
</button>
```

```vue
<button
  class="history-tree-item-delete"
  type="button"
  :disabled="historyDeleting"
  @click.stop="handleDeleteHistory(item.id)"
>
  删除
</button>
```

- [ ] **Step 5: Run a real delete regression on test history**

Run:

```bash
agent-browser close --all
agent-browser open 'http://localhost:8080/#/login?redirect=/sqlbotnew'
```

Then:
1. Log in as `admin / DataEase@123456`
2. Open `历史对话`
3. Capture a screenshot before delete
4. Delete the first recent item
5. Capture a screenshot after delete

Expected: recent history count decreases by one and remains reduced after a refresh.

- [ ] **Step 6: Run a clear-confirm regression without executing destructive clear on real data**

Run:

```bash
agent-browser click '清空'
```

Expected: confirm dialog appears with `清理` and `取消`. Do not confirm on real user data unless using disposable test entries.

- [ ] **Step 7: Commit**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue \
  dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts
git commit -m "feat: close sqlbot-new history management"
```

### Task 3: Productize Error States

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Test: Browser failure-state regression

- [ ] **Step 1: Replace raw traceback-style copy with user-safe business language**

Update the error copy derivation in [SqlbotNewConversationRecord.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue):

```ts
const errorCopy = computed(() => {
  const raw = String(props.record.error || '').trim()
  if (!raw) {
    return '本轮问数执行失败，请调整问题后重试。'
  }
  if (raw.includes('Datasource') || raw.includes('Traceback') || raw.includes('Exception')) {
    return '当前数据源状态异常，暂时无法完成本轮问数。请重新选择数据源后重试。'
  }
  return raw
})
```

- [ ] **Step 2: Keep raw technical detail out of the main card**

Use business text in the error panel and keep debug detail only in console logs inside [useSqlbotNewConversation.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts):

```ts
console.error('stream sqlbot-new question failed', error)
record.error = error instanceof Error ? error.message : '智能问数执行失败'
```

The UI should surface the mapped business copy from the component, not the raw stack.

- [ ] **Step 3: Keep the failure action group focused**

Ensure the failure card continues to expose only these actions:

```vue
<button class="danger-outline" type="button" @click="emit('select-data')">
  重新选择数据源
</button>
<button class="ghost-link" type="button" @click="emit('edit-question', record)">
  修改提问
</button>
```

- [ ] **Step 4: Run a failure-state regression**

Run a prompt known to fail against the current dataset selection, then verify the card no longer shows traceback or Python exception text.

Expected: failure card shows productized Chinese copy only.

- [ ] **Step 5: Commit**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts
git commit -m "fix: productize sqlbot-new error states"
```

### Task 4: Finalize High-Resolution Layout Ratios

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`

- [ ] **Step 1: Lock page-level layout tokens for the final desktop ratio**

Use the page tokens in [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue):

```less
.sqlbot-new-page {
  --sqlbot-sidebar-width: 332px;
  --sqlbot-column-width: 1680px;
  --sqlbot-card-radius: 26px;
}
```

- [ ] **Step 2: Keep the sidebar visually strong but not dominant**

Use these sizes in the sidebar block:

```less
.sqlbot-left-sidebar {
  padding: 20px 0 24px;
}

.sqlbot-product-card {
  margin: 0 18px;
  padding: 16px 14px;
}
```

- [ ] **Step 3: Expand the result-stage usable width**

Use the current shell sizing in [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue):

```less
.sqlbot-conversation,
.sqlbot-conversation-shell,
.assistant-result-card,
.assistant-error-card,
.conversation-empty-card,
.bottom-composer {
  width: min(var(--sqlbot-column-width), 100%);
}
```

- [ ] **Step 4: Increase the composer prominence on result pages**

Keep the bottom composer tuned for high-resolution entry:

```less
.bottom-composer {
  padding: 20px 22px 22px;
}

.bottom-composer-input {
  padding: 20px 82px 20px 22px;
  min-height: 142px;
}

.composer-textarea.large {
  min-height: 112px;
}
```

- [ ] **Step 5: Slightly enlarge result-card foot actions for readability**

Use the current action sizing in [StarbiResultCard.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue):

```less
.starbi-foot-btn {
  padding: 9px 18px;
  font-size: 14px;
}

.starbi-meta-tag,
.starbi-meta-item {
  font-size: 13px;
}
```

- [ ] **Step 6: Run a desktop visual regression**

Run:

```bash
agent-browser close --all
agent-browser open 'http://localhost:8080/#/login?redirect=/sqlbotnew'
```

After login, capture:
1. home page
2. result page
3. select-data dialog

Expected:
- left sidebar no longer dominates the viewport
- main conversation column occupies most of the center canvas
- bottom input card reads as the primary action area

- [ ] **Step 7: Commit**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/index.vue \
  dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue
git commit -m "style: finalize sqlbot-new high-resolution layout"
```

### Task 5: Regress File Query And Dialog Flows

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`

- [ ] **Step 1: Confirm dataset/file tabs still reflect real data**

Keep the dataset/file summary computed state in [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue):

```ts
const selectedSummary = computed(() => {
  if (props.activeTab === 'dataset') {
    ...
  }
  return selectedFile.value ? `已选：${selectedFile.value.title}` : ''
})
```

- [ ] **Step 2: Ensure file restore continues to map datasource ids back to file items**

Keep the matching logic in [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts):

```ts
const matchedFile = fileItems.value.find(item => {
  return (
    item.id === executionContext.sourceId ||
    normalizeOptionalId(item.datasourceId) ===
      normalizeOptionalId(executionContext.datasourceId)
  )
})
```

- [ ] **Step 3: Re-run the file-upload path**

Manual/browser steps:
1. open select-data dialog
2. switch to `数据文件`
3. open upload dialog
4. validate upload step-1 layout
5. validate preview step-2 layout
6. validate preview detail dialog

Expected: all file dialogs open, render, and route back without broken state.

- [ ] **Step 4: Fix any visual density regressions discovered during file-flow regression**

Apply only minimal changes to:

```vue
<section class="file-upload-dialog">...</section>
<section class="file-detail-dialog">...</section>
```

Do not redesign; only align with the final `sqlbotnew` density.

- [ ] **Step 5: Commit**

```bash
git add dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileUploadDialog.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewFileDetailDialog.vue \
  dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts
git commit -m "test: regress sqlbot-new file query flow"
```

### Task 6: Final Acceptance Sweep

**Files:**
- Modify: `docs/superpowers/specs/2026-04-16-sqlbot-new-functionalization-and-global-topbar-alignment-design.md`
- Create: `tmp/sqlbotnew-acceptance-notes.md`

- [ ] **Step 1: Run frontend static checks**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run ts:check
./node_modules/.bin/eslint src/views/sqlbot-new src/views/sqlbot sqlbotDirect.ts src/router/index.ts --ext .ts,.vue --fix
```

Expected: no eslint or type-check errors in the modified files.

- [ ] **Step 2: Restart the frontend with the user’s preferred script**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
./dataease-web.sh
```

Expected: Vite dev server available on `http://localhost:8080/`.

- [ ] **Step 3: Run the final browser acceptance matrix**

Use `agent-browser` to cover:
1. `/#/sqlbotnew` home page
2. dataset question success path
3. recommendation click path
4. `数据解读` request fires
5. `追加追问` backfills textarea
6. single history delete
7. clear-history confirm dialog
8. file dialog open path

Expected: no white screen, no broken overlay state, no action buttons that appear clickable but do nothing.

- [ ] **Step 4: Write acceptance notes**

Create `tmp/sqlbotnew-acceptance-notes.md` with this structure:

```md
# SQLBot New Acceptance Notes

- Home page: PASS/FAIL
- Dataset query: PASS/FAIL
- Recommendation click: PASS/FAIL
- Interpret action: PASS/FAIL
- Follow-up action: PASS/FAIL
- Single delete: PASS/FAIL
- Clear confirm: PASS/FAIL
- File dialogs: PASS/FAIL
- Remaining issues:
```

- [ ] **Step 5: Update the design/spec doc with final implementation status**

Add a short closing section in [2026-04-16-sqlbot-new-functionalization-and-global-topbar-alignment-design.md](/Users/chenliyong/AI/github/StarBI/docs/superpowers/specs/2026-04-16-sqlbot-new-functionalization-and-global-topbar-alignment-design.md):

```md
## Final Closure Status

- Global shell route: complete
- Dataset intelligent-query flow: complete
- History delete/clear: complete
- History restore quality: improved for new dataset history
- File query regression: [PASS/FAIL after sweep]
- Remaining follow-up: [list]
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-04-16-sqlbot-new-functionalization-and-global-topbar-alignment-design.md \
  tmp/sqlbotnew-acceptance-notes.md
git commit -m "docs: record sqlbot-new final acceptance"
```

## Self-Review

- Spec coverage:
  - High-resolution layout closure: covered by Task 4
  - History delete/clear closure: covered by Task 2
  - History restore quality: covered by Task 1
  - Failure-state productization: covered by Task 3
  - File query regression: covered by Task 5
  - Final acceptance sweep: covered by Task 6
- Placeholder scan:
  - No `TBD`, `TODO`, or “appropriate handling” placeholders remain
  - Every task names exact files and commands
- Type consistency:
  - `deleteHistoryEntry`, `deleteHistoryItem`, `clearHistoryItems`, and `applyRestoredSelection` names match the current codebase
  - `SqlbotNewExecutionContext` property names remain `queryMode`, `sourceId`, `datasourceId`, `modelId`, `datasourcePending`

**Plan complete and saved to `docs/superpowers/plans/2026-04-16-sqlbot-new-remaining-issues-closure-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
