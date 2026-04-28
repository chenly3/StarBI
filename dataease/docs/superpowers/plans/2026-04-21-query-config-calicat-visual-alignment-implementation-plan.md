# Query Config Calicat Visual Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the `系统设置 -> 问数配置 -> 分析主题管理` page and its three core dialogs to the Calicat prototypes with high visual fidelity while preserving the current live data flow.

**Architecture:** Keep the existing `query-config/index.vue` shell and `query-theme/index.vue` page logic. Concentrate all visual alignment work in those two files plus existing SVG assets so the page remains data-driven. Use `agent-browser` before and after each visual batch to compare the live UI against the four Calicat references.

**Tech Stack:** Vue 3, Vite, Element Plus Secondary, existing SVG icon assets, agent-browser for browser verification

**Execution Note:** The user explicitly forbids git operations in this workspace. Do not add, commit, amend, reset, checkout, or otherwise use git during execution of this plan.

---

## File Structure

- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/index.vue`
  - Responsibility: system-setting shell tabs for `问数资源管理` and `分析主题管理`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue`
  - Responsibility: main analysis-theme page, create-theme dialog, assign-dataset dialog, preview dialog
- Reuse only: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/assets/svg/*`
  - Responsibility: existing search/add/info/dataset/more/delete icons
- Reference only:  
  - `https://www.calicat.cn/design/2046142210246287360?node-id=271daa32-54b4-4026-96a1-7e5a708eb2f5&node-type=group`
  - `https://www.calicat.cn/design/2046142210246287360?node-id=ebd80962-ebba-4c6c-932b-95766be60ef8&node-type=group`
  - `https://www.calicat.cn/design/2046142210246287360?node-id=2a504b2b-733c-4122-a975-e600b70776f1&node-type=group`
  - `https://www.calicat.cn/design/2046142210246287360?node-id=63cc8341-7e13-49ab-9696-0a86d3feabbe&node-type=group`

## Task 1: Capture Prototype Baseline And Lock Scope

**Files:**
- Modify: none
- Reference: the four Calicat URLs above
- Output screenshots: `/tmp/query-config-current/*.png`

- [ ] **Step 1: Open the four Calicat references and save fresh baseline screenshots**

```bash
agent-browser close --all
agent-browser --profile Default open 'https://www.calicat.cn/design/2046142210246287360?node-id=271daa32-54b4-4026-96a1-7e5a708eb2f5&node-type=group'
agent-browser wait 3000
agent-browser screenshot /tmp/query-config-current/calicat-main-baseline.png

agent-browser open 'https://www.calicat.cn/design/2046142210246287360?node-id=ebd80962-ebba-4c6c-932b-95766be60ef8&node-type=group'
agent-browser wait 3000
agent-browser screenshot /tmp/query-config-current/calicat-create-dialog-baseline.png

agent-browser open 'https://www.calicat.cn/design/2046142210246287360?node-id=2a504b2b-733c-4122-a975-e600b70776f1&node-type=group'
agent-browser wait 3000
agent-browser screenshot /tmp/query-config-current/calicat-assign-dialog-baseline.png

agent-browser open 'https://www.calicat.cn/design/2046142210246287360?node-id=63cc8341-7e13-49ab-9696-0a86d3feabbe&node-type=group'
agent-browser wait 3000
agent-browser screenshot /tmp/query-config-current/calicat-preview-dialog-baseline.png
```

- [ ] **Step 2: Open the current live page and save matching baseline screenshots**

```bash
agent-browser open 'http://localhost:8080/#/starbi/query-config?tab=query_themes'
agent-browser wait 3000
agent-browser screenshot /tmp/query-config-current/live-main-before.png
```

Expected: one baseline image per prototype and one baseline image for the live page.

- [ ] **Step 3: Record the exact in-scope alignment checklist**

Use this checklist during execution:

```text
Main page:
- left panel width, card radius, spacing, search bar height
- selected row background, more button shape, plus button position
- right title block, subtitle width, search box width, blue CTA button size
- table header height, row height, column spacing, status icon sizing

Dialogs:
- panel width/height
- title font size, top padding, close icon position
- input height, textarea height, character counter placement
- list row density, checkbox sizing, footer divider, cancel/confirm alignment
- preview dialog blue strip, table density, bottom close button
```

## Task 2: Align Query Config Shell To The Prototype Context

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/index.vue`

- [ ] **Step 1: Keep the shell minimal and ensure it only frames the two sheets**

Target structure:

```vue
<div class="general-config-page">
  <div class="general-config-nav">
    <button
      v-for="item in tabArray"
      :key="item.name"
      class="general-config-tab"
      :class="{ 'is-active': item.name === activeName }"
      type="button"
      @click="activeName = item.name"
    >
      {{ item.label }}
    </button>
  </div>
  <div class="general-config-content">
    <query-theme-page
      :key="currentTab.name"
      :mode-locked="currentTab.mode"
      :show-mode-tabs="false"
    />
  </div>
</div>
```

- [ ] **Step 2: Tighten shell spacing so it disappears visually behind the page content**

Target style adjustments:

```less
.general-config-page {
  width: 100%;
  height: calc(100vh - 84px);
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.general-config-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  flex-shrink: 0;
}

.general-config-content {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
```

- [ ] **Step 3: Verify the tab shell still switches the two modes correctly**

Run:

```bash
./dataease-web.sh
agent-browser close --all
agent-browser open 'http://localhost:8080/#/starbi/query-config?tab=query_themes'
agent-browser wait 3000
agent-browser screenshot /tmp/query-config-current/live-shell-query-themes.png
```

Expected: `分析主题管理` sheet is visible and shell tabs remain usable.

## Task 3: Align The Analysis Theme Main Page

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue`

- [ ] **Step 1: Refine the two-column page container to match the Calicat proportions**

Target style direction:

```less
.theme-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 20px;
  min-height: calc(100vh - 160px);
}

.theme-sidebar,
.theme-content-card {
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(31, 35, 41, 0.08);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
}
```

- [ ] **Step 2: Align the left theme list panel**

Target visual elements:

```vue
<aside class="theme-sidebar">
  <div class="theme-sidebar-head">
    <div class="theme-sidebar-title">分析主题列表</div>
    <button class="circle-icon-button" type="button" @click="openCreate">
      <Icon name="icon_add_outlined"><icon_add_outlined class="svg-icon" /></Icon>
    </button>
  </div>

  <div class="theme-search-bar">
    <Icon name="icon_search-outline_outlined" class="search-icon">
      <icon_searchOutline_outlined class="svg-icon" />
    </Icon>
    <input v-model="themeKeyword" class="theme-search-input" type="text" placeholder="搜索分析主题" />
  </div>
</aside>
```

Target row treatment:

```less
.theme-list-item {
  min-height: 54px;
  padding: 0 12px;
  border-radius: 10px;
  background: #f8fbff;
}

.theme-list-item.active {
  background: #eaf2ff;
}
```

- [ ] **Step 3: Align the right dataset panel**

Target treatment:

```vue
<main class="theme-content-card">
  <header class="theme-content-head">
    <div>
      <div class="theme-content-title">已分配数据集</div>
      <div class="theme-content-subtitle">
        将现有数据集分配到当前分析主题，最多10个，分配数量会影响计算时长和准确性。
      </div>
    </div>

    <div class="theme-content-actions">
      <div class="theme-search-bar compact">...</div>
      <button class="primary-button" type="button" @click="openResourceDialog">
        <span class="button-plus">＋</span>
        <span>分配数据集</span>
      </button>
    </div>
  </header>
</main>
```

Target table density:

```less
.resource-table-head {
  min-height: 52px;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 600;
}

.resource-table-row {
  min-height: 64px;
}
```

- [ ] **Step 4: Verify the main page against the prototype**

Run:

```bash
./dataease-web.sh
agent-browser close --all
agent-browser open 'http://localhost:8080/#/starbi/query-config?tab=query_themes'
agent-browser wait 3000
agent-browser screenshot /tmp/query-config-current/live-main-after-task3.png
```

Expected: live main page visually matches the Calicat main prototype more closely while still showing real data.

## Task 4: Align The Create Theme Dialog

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue`

- [ ] **Step 1: Keep the create dialog structure simple and prototype-aligned**

Target structure:

```vue
<el-dialog v-model="themeDialogVisible" class="theme-dialog theme-form-dialog" width="640px" destroy-on-close append-to-body>
  <template #header>
    <div class="theme-dialog-header">
      <div class="theme-dialog-title">{{ editingId ? '编辑分析主题' : '新建分析主题' }}</div>
    </div>
  </template>

  <div class="theme-dialog-tip">创建分析主题后，可继续为该主题分配现有数据集</div>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="theme-form">...</el-form>
</el-dialog>
```

- [ ] **Step 2: Tighten label/input/textarea/footer dimensions**

Target style:

```less
:deep(.theme-form-dialog .el-input__wrapper) {
  min-height: 38px;
  border-radius: 10px;
}

:deep(.theme-form-dialog .el-textarea__inner) {
  border-radius: 12px;
  min-height: 120px !important;
}

:deep(.theme-dialog .el-dialog__footer .dialog-footer) {
  padding-top: 14px;
}
```

- [ ] **Step 3: Capture the updated create dialog**

Run:

```bash
agent-browser open 'http://localhost:8080/#/starbi/query-config?tab=query_themes'
agent-browser wait 3000
agent-browser snapshot -i
agent-browser click @e12
agent-browser wait 1200
agent-browser screenshot /tmp/query-config-current/live-create-dialog-after-task4.png
```

Expected: the create dialog matches the Calicat create-dialog baseline in spacing and button placement.

## Task 5: Align The Assign Dataset Dialog

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue`

- [ ] **Step 1: Align the header, search bar, and list box**

Target structure:

```vue
<el-dialog v-model="resourceDialogVisible" class="theme-dialog theme-resource-dialog" width="720px" destroy-on-close append-to-body>
  <template #header>
    <div class="theme-dialog-header">
      <div class="theme-dialog-title">分配数据集</div>
    </div>
  </template>

  <div class="theme-dialog-tip">选择现有数据集，并分配到当前分析主题</div>
  <div class="theme-search-bar modal">...</div>
  <div class="resource-picker-card">...</div>
</el-dialog>
```

- [ ] **Step 2: Reduce row density and unify footer buttons with the create dialog**

Target style:

```less
.resource-select-item {
  min-height: 44px;
}

.resource-picker-head {
  min-height: 40px;
  font-size: 12px;
}

:deep(.theme-resource-dialog .el-button) {
  min-width: 76px;
  height: 32px;
  border-radius: 7px;
}
```

- [ ] **Step 3: Capture the updated assign dialog**

Run:

```bash
agent-browser open 'http://localhost:8080/#/starbi/query-config?tab=query_themes'
agent-browser wait 3000
agent-browser snapshot -i
agent-browser click @e20
agent-browser wait 1200
agent-browser screenshot /tmp/query-config-current/live-assign-dialog-after-task5.png
```

Expected: assign-dataset dialog visually matches the Calicat add-resource prototype while still using live data.

## Task 6: Align The Preview Dialog

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue`

- [ ] **Step 1: Keep the blue header bar and tighten table density**

Target treatment:

```less
.theme-preview-header {
  padding: 14px 24px 12px;
}

.preview-table {
  border-radius: 10px;
}

.preview-row {
  min-height: 42px;
}

.preview-cell {
  padding: 9px 12px;
  font-size: 12px;
  line-height: 18px;
}
```

- [ ] **Step 2: Capture the updated preview dialog**

Run:

```bash
agent-browser open 'http://localhost:8080/#/starbi/query-config?tab=query_themes'
agent-browser wait 3000
agent-browser snapshot -i
agent-browser click @e16
agent-browser wait 1200
agent-browser screenshot /tmp/query-config-current/live-preview-dialog-after-task6.png
```

Expected: preview dialog keeps real table data but visually matches the Calicat preview prototype.

## Task 7: Final Regression And Delivery Evidence

**Files:**
- Modify: none
- Output: `/tmp/query-config-current/*.png`

- [ ] **Step 1: Restart the touched frontend only**

Run:

```bash
./dataease-web.sh
```

Expected: Vite dev server ready on `http://localhost:8080`.

- [ ] **Step 2: Produce the final four evidence screenshots**

Run:

```bash
agent-browser close --all
agent-browser open 'http://localhost:8080/#/starbi/query-config?tab=query_themes'
agent-browser wait 3000
agent-browser screenshot /tmp/query-config-current/final-main.png

agent-browser snapshot -i
agent-browser click @e12
agent-browser wait 1200
agent-browser screenshot /tmp/query-config-current/final-create-dialog.png

agent-browser click 'button[aria-label="关闭此对话框"]'
agent-browser wait 600
agent-browser snapshot -i
agent-browser click @e20
agent-browser wait 1200
agent-browser screenshot /tmp/query-config-current/final-assign-dialog.png

agent-browser click 'button[aria-label="关闭此对话框"]'
agent-browser wait 600
agent-browser snapshot -i
agent-browser click @e16
agent-browser wait 1200
agent-browser screenshot /tmp/query-config-current/final-preview-dialog.png
```

- [ ] **Step 3: Record any residual mismatches explicitly**

Use this checklist:

```text
- main page: left panel width, selected row, search/button spacing
- create dialog: title spacing, textarea height, footer button alignment
- assign dialog: search bar, row density, footer
- preview dialog: blue strip height, table density
```

If any one item remains visually off, fix only that item and rerun the corresponding screenshot.

## Self-Review

### Spec Coverage

- Main page visual alignment: covered by Task 3 and Task 7
- Create dialog visual alignment: covered by Task 4 and Task 7
- Assign dialog visual alignment: covered by Task 5 and Task 7
- Preview dialog visual alignment: covered by Task 6 and Task 7
- Real data preserved: covered by Tasks 3 through 7
- No unrelated module changes: enforced by File Structure and task file lists

### Placeholder Scan

- No `TODO`/`TBD`
- All steps include exact files, exact commands, and target code/style snippets
- No implicit “handle appropriately” language remains

### Type Consistency

- Main implementation remains centered on `query-config/index.vue` and `query-theme/index.vue`
- No new interfaces or function names introduced in later tasks without being defined earlier

## Execution Handoff

Plan complete and saved to `/Users/chenliyong/AI/github/StarBI/dataease/docs/superpowers/plans/2026-04-21-query-config-calicat-visual-alignment-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session task-by-task

Which approach?*** End Patch
