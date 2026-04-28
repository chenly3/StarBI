# Permission Static Tabs Relocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move row/column permission UI out of `系统设置 -> 问数配置` and re-mount it as two static sibling tabs under `系统设置 -> 权限配置`, while keeping dynamic dialogs and removing the dataset-scoped query-config implementation.

**Architecture:** Reuse the existing permission-management host page as the single shell, add a new primary tab layer there, and render the already-built static preview panels for row/column permission. Remove the query-config row/column route chain and all query-theme action entry points so the capability only exists under permission configuration.

**Tech Stack:** Vue 3 SFCs, `vue-router_2`, local hash query state, Vite, `agent-browser` regression, DataEase frontend shell.

---

## File Structure

### Files to Modify

- `de-xpack/permission-management/src/menu/system/permission/index.vue`
  - Expand the shell from 2 logical views to 4 primary tabs.
  - Map `按用户配置` and `按资源配置` back to the existing permission store mode/tab state.
  - Render static row/column preview panels for the new tabs.
- `de-xpack/permission-management/src/menu/system/permission/MenuPermissionPanel.vue`
  - Add a prop to hide the old two-button primary switch row when rendered under the new 4-tab shell.
- `de-xpack/permission-management/src/menu/system/permission/ResourcePermissionPanel.vue`
  - Add the same prop-based switch-row suppression.
- `de-xpack/permission-management/src/menu/system/permission/RowPermissionPreview.vue`
  - Convert the preview into an embedded permission-tab panel instead of a full data-prep page shell.
  - Keep dialog open/close behavior local and dynamic.
- `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPreview.vue`
  - Convert the preview into an embedded permission-tab panel instead of a full data-prep page shell.
  - Keep dialog and mask dialog behavior local and dynamic.
- `core/core-frontend/src/views/visualized/data/query-theme/index.vue`
  - Remove row/column permission actions from the query-config dataset row menu.
- `core/core-frontend/src/views/system/query-config/index.vue`
  - Remove dataset-permission child-route handling and revert to pure query-resource/theme switching.
- `core/core-frontend/src/router/index.ts`
  - Remove dataset-scoped row/column permission routes and the `syncDatasetIdQuery` helper.

### Files to Verify But Not Necessarily Modify

- `de-xpack/permission-management/src/menu/system/permission/components/RowPermissionDialog.vue`
- `de-xpack/permission-management/src/menu/system/permission/components/ColumnPermissionDialog.vue`
- `de-xpack/permission-management/src/menu/system/permission/components/MaskRuleDialog.vue`
- `de-xpack/permission-management/src/menu/system/permission/store.ts`

### Files to Create Only If Reuse Breaks

- None by default. This plan intentionally reuses `RowPermissionPreview.vue` and `ColumnPermissionPreview.vue` instead of adding new static panel files.

---

### Task 1: Expand Permission Shell To Four Primary Tabs

**Files:**
- Modify: `de-xpack/permission-management/src/menu/system/permission/index.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/MenuPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/ResourcePermissionPanel.vue`
- Test: `de-xpack/permission-management/package.json`

- [ ] **Step 1: Write the failing shell expectation in the implementation notes**

```ts
// Expected shell mapping after the change:
// sheet=user     -> shell.setView('by-user', 'resource')   -> Menu/Resource logic stays intact
// sheet=resource -> shell.setView('by-resource', 'menu')   -> Existing resource-dimension page
// sheet=row      -> render RowPermissionPreview
// sheet=column   -> render ColumnPermissionPreview
// Default        -> sheet=user
```

- [ ] **Step 2: Update `index.vue` to own a 4-tab primary switch**

```vue
<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from './useHashRoute'
import MenuPermissionPanel from './MenuPermissionPanel.vue'
import ResourcePermissionPanel from './ResourcePermissionPanel.vue'
import RowPermissionPreview from './RowPermissionPreview.vue'
import ColumnPermissionPreview from './ColumnPermissionPreview.vue'
import { usePermissionShellStore } from './store'

type PermissionSheet = 'user' | 'resource' | 'row' | 'column'

const route = useRoute()
const router = useRouter()
const shell = usePermissionShellStore()

const currentSheet = computed<PermissionSheet>(() => {
  const raw = Array.isArray(route.query.sheet) ? route.query.sheet[0] : route.query.sheet
  return raw === 'resource' || raw === 'row' || raw === 'column' ? raw : 'user'
})

watch(
  () => route.query,
  async query => {
    if (currentSheet.value === 'row' || currentSheet.value === 'column') {
      return
    }
    const mode = currentSheet.value === 'resource' ? 'by-resource' : 'by-user'
    const tab = currentSheet.value === 'resource' ? 'menu' : 'resource'
    await shell.setView(mode, tab)
  },
  { immediate: true }
)

const currentPanel = computed(() => {
  if (currentSheet.value === 'row') return RowPermissionPreview
  if (currentSheet.value === 'column') return ColumnPermissionPreview
  return currentSheet.value === 'resource' ? ResourcePermissionPanel : MenuPermissionPanel
})

const openSheet = async (sheet: PermissionSheet) => {
  const nextQuery = { ...route.query, sheet }
  delete nextQuery.dialog
  delete nextQuery.mask
  await router.replace({ query: nextQuery })
}
</script>
```

- [ ] **Step 3: Replace the old shell template with the new 4-tab header**

```vue
<template>
  <div class="permission-shell">
    <div class="permission-shell__tabs">
      <button :class="{ 'is-active': currentSheet === 'user' }" @click="openSheet('user')">
        按用户配置
      </button>
      <button :class="{ 'is-active': currentSheet === 'resource' }" @click="openSheet('resource')">
        按资源配置
      </button>
      <button :class="{ 'is-active': currentSheet === 'row' }" @click="openSheet('row')">
        行权限配置
      </button>
      <button :class="{ 'is-active': currentSheet === 'column' }" @click="openSheet('column')">
        列权限配置
      </button>
    </div>

    <component :is="currentPanel" :show-primary-switch="false" />
  </div>
</template>
```

- [ ] **Step 4: Add `showPrimarySwitch` props to the two existing live permission panels**

```vue
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    showPrimarySwitch?: boolean
  }>(),
  {
    showPrimarySwitch: true
  }
)
</script>
```

```vue
<div v-if="props.showPrimarySwitch" class="switch-row">
  <button ...>按用户配置</button>
  <button ...>按资源配置</button>
</div>
```

- [ ] **Step 5: Run typecheck to verify the shell compiles**

Run: `npm run typecheck --prefix de-xpack/permission-management`

Expected: PASS with no new TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add de-xpack/permission-management/src/menu/system/permission/index.vue \
  de-xpack/permission-management/src/menu/system/permission/MenuPermissionPanel.vue \
  de-xpack/permission-management/src/menu/system/permission/ResourcePermissionPanel.vue
git commit -m "feat(permission): add static row and column tabs"
```

---

### Task 2: Embed Static Row/Column Panels Under Permission Configuration

**Files:**
- Modify: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPreview.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPreview.vue`
- Verify: `de-xpack/permission-management/src/menu/system/permission/components/RowPermissionDialog.vue`
- Verify: `de-xpack/permission-management/src/menu/system/permission/components/ColumnPermissionDialog.vue`
- Verify: `de-xpack/permission-management/src/menu/system/permission/components/MaskRuleDialog.vue`

- [ ] **Step 1: Remove full-page data-prep header dependency from the static row preview**

```vue
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useRoute } from './useHashRoute'
import RowPermissionDialog from './components/RowPermissionDialog.vue'

const route = useRoute()
const dialogVisible = ref(false)
const dialogType = ref<'role' | 'user' | 'sysVar'>('role')
const staticDatasetName = '公有云账单集合'

const openDialog = () => {
  dialogType.value = 'role'
  dialogVisible.value = true
}

watchEffect(() => {
  const dialog = route.query.dialog
  if (dialog === 'role' || dialog === 'user' || dialog === 'sysVar') {
    dialogType.value = dialog
    dialogVisible.value = true
    return
  }
  dialogVisible.value = false
})
</script>
```

- [ ] **Step 2: Update the row preview template to render as an embedded static panel**

```vue
<template>
  <main class="permission-preview-screen">
    <div class="layout">
      <aside class="dataset-side">...</aside>
      <section class="content">
        <div class="content__inner">
          <div class="page-head">
            <div>
              <h1>{{ staticDatasetName }}</h1>
              <p>创建人:系统管理员 <span>ⓘ</span></p>
            </div>
          </div>

          <div class="tab-switch">
            <button type="button">数据预览</button>
            <button type="button">结构预览</button>
            <button type="button" class="is-active">行权限</button>
            <button type="button" disabled>列权限</button>
          </div>

          <section class="panel">
            <button type="button" class="add-btn" @click="openDialog">＋ 添加</button>
            <div class="table-head">...</div>
            <div class="empty-state">...</div>
          </section>
        </div>
      </section>
    </div>

    <RowPermissionDialog
      :visible="dialogVisible"
      :type="dialogType"
      @close="dialogVisible = false"
      @switch-type="dialogType = $event"
    />
  </main>
</template>
```

- [ ] **Step 3: Apply the same embedded-shell cleanup to the column preview**

```vue
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useRoute } from './useHashRoute'
import ColumnPermissionDialog from './components/ColumnPermissionDialog.vue'

const route = useRoute()
const dialogVisible = ref(false)
const maskVisible = ref(false)
const staticDatasetName = '公有云账单集合'

watchEffect(() => {
  dialogVisible.value = route.query.dialog === 'column'
  maskVisible.value = route.query.mask === '1'
})
</script>
```

```vue
<ColumnPermissionDialog
  :visible="dialogVisible"
  :mask-visible="maskVisible"
  @close="dialogVisible = false"
  @open-mask="maskVisible = true"
  @close-mask="maskVisible = false"
/>
```

- [ ] **Step 4: Ensure both preview files keep only local front-end dialog behavior**

```ts
// Keep:
// - open/close/cancel/confirm dialog transitions
// - switch type between role and sysVar
// - nested mask dialog open/close
//
// Do not add:
// - API requests
// - save callbacks
// - fake table row insertion
```

- [ ] **Step 5: Run typecheck and build for the permission package**

Run: `npm run typecheck --prefix de-xpack/permission-management && npm run build --prefix de-xpack/permission-management`

Expected: PASS. The package builds with the embedded preview panels and dialog chain intact.

- [ ] **Step 6: Commit**

```bash
git add de-xpack/permission-management/src/menu/system/permission/RowPermissionPreview.vue \
  de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPreview.vue
git commit -m "feat(permission): embed static row and column previews"
```

---

### Task 3: Remove Query-Config Row/Column Permission Capability

**Files:**
- Modify: `core/core-frontend/src/views/visualized/data/query-theme/index.vue`
- Modify: `core/core-frontend/src/views/system/query-config/index.vue`
- Modify: `core/core-frontend/src/router/index.ts`

- [ ] **Step 1: Remove row/column menu actions from `query-theme/index.vue`**

```ts
type DatasetRowActionKey = 'assign-themes'

interface DatasetRowAction {
  key: DatasetRowActionKey
  label: string
  disabled?: boolean
}

const buildRowActions = (): DatasetRowAction[] => [
  {
    key: 'assign-themes',
    label: t('starbi.adjust_theme_assignment')
  }
]

const handleResourceAction = (key: string, item: DatasetOption) => {
  if (key === 'assign-themes') {
    openResourceThemeDialog(item.id)
  }
}
```

- [ ] **Step 2: Remove dataset-permission child rendering from `query-config/index.vue`**

```vue
<template>
  <main class="system-setting-page general-config-page">
    <section class="system-setting-page__content general-config-page__content">
      <header class="system-setting-page__title-row">...</header>

      <section class="system-setting-card general-config-content">
        <query-theme-page
          :key="currentTab.name"
          :mode-locked="currentTab.mode"
          :show-mode-tabs="false"
        />
      </section>
    </section>
  </main>
</template>
```

```ts
// Delete:
// const isDatasetPermissionRoute = computed(...)
// route replacement branches that special-case dataset permission child routes
```

- [ ] **Step 3: Remove the dataset-scoped routes from `router/index.ts`**

```ts
export const routes: AppRouteRecordRaw[] = [
  {
    path: '/sys-setting/query-config',
    name: 'sys-setting-query-config-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'sys-setting-query-config-page',
        hidden: true,
        component: () => import('@/views/system/query-config/index.vue'),
        meta: { hidden: true }
      }
    ]
  }
]
```

```ts
// Delete entirely:
// - syncDatasetIdQuery()
// - sys-setting-query-config-row-permission
// - sys-setting-query-config-column-permission
```

- [ ] **Step 4: Run host-app verification commands**

Run:

```bash
npm run typecheck --prefix de-xpack/permission-management
./dataease-web.sh
```

Expected:

- typecheck PASS
- Vite dev server restarts successfully on `http://localhost:8080/`

- [ ] **Step 5: Commit**

```bash
git add core/core-frontend/src/views/visualized/data/query-theme/index.vue \
  core/core-frontend/src/views/system/query-config/index.vue \
  core/core-frontend/src/router/index.ts
git commit -m "refactor(query-config): remove row and column permission entry points"
```

---

### Task 4: Browser Regression And Evidence Capture

**Files:**
- Modify: `tmp/permission-static-tabs-relocation-verification.md`
- Output: `tmp/*.png`

- [ ] **Step 1: Close browser sessions before testing**

Run: `agent-browser close --all`

Expected: all active browser sessions closed.

- [ ] **Step 2: Verify the new 4-tab permission shell**

Run:

```bash
agent-browser open 'http://127.0.0.1:8080/#/login?redirect=/sys-setting/permission'
```

Then:

- log in with `admin / DataEase@123456`
- verify default tab is `按用户配置`
- capture screenshot:

```bash
agent-browser screenshot tmp/permission-static-tabs-default-user.png
```

- [ ] **Step 3: Verify static row-permission page and dynamic dialogs**

Browser checks:

- click `行权限配置`
- confirm static page body renders
- open `添加` dialog
- switch between `角色类型` and `系统变量`
- confirm dialog close works

Evidence:

```bash
agent-browser screenshot tmp/permission-static-tabs-row-page.png
agent-browser screenshot tmp/permission-static-tabs-row-dialog.png
```

- [ ] **Step 4: Verify static column-permission page and nested mask dialog**

Browser checks:

- click `列权限配置`
- open `添加` dialog
- open nested `脱敏规则` dialog
- close nested dialog and parent dialog

Evidence:

```bash
agent-browser screenshot tmp/permission-static-tabs-column-page.png
agent-browser screenshot tmp/permission-static-tabs-column-dialog.png
agent-browser screenshot tmp/permission-static-tabs-mask-dialog.png
```

- [ ] **Step 5: Verify query-config no longer exposes row/column permission**

Browser checks:

- open `http://127.0.0.1:8080/#/sys-setting/query-config`
- confirm dataset action menu only contains `调整分析主题分配`
- confirm no row/column permission menu items remain

Evidence:

```bash
agent-browser screenshot tmp/query-config-no-row-column-actions.png
```

- [ ] **Step 6: Verify removed routes are no longer reachable**

Run:

```bash
agent-browser open 'http://127.0.0.1:8080/#/sys-setting/query-config/dataset/1244728426783444992/row-permission'
agent-browser get url
agent-browser open 'http://127.0.0.1:8080/#/sys-setting/query-config/dataset/1244728426783444992/column-permission'
agent-browser get url
```

Expected:

- app does not render row/column permission pages under `query-config`
- route falls back away from the removed child routes or lands on not-found behavior

- [ ] **Step 7: Write verification summary**

```md
# Permission Static Tabs Relocation Verification

- typecheck: PASS
- build: PASS
- permission shell default tab: PASS
- row permission static page + dynamic dialog: PASS
- column permission static page + nested mask dialog: PASS
- query-config row/column entries removed: PASS
- removed dataset routes unreachable: PASS
```

- [ ] **Step 8: Commit**

```bash
git add tmp/permission-static-tabs-relocation-verification.md tmp/*.png
git commit -m "test(permission): verify static tabs relocation flow"
```

---

## Self-Review

### Spec Coverage

- 4 个同级页签：Task 1
- 默认页签 `按用户配置`：Task 1 + Task 4
- 行/列权限静态主体页：Task 2
- 弹框动态交互：Task 2 + Task 4
- 删除问数配置入口：Task 3
- 删除数据集作用域路由：Task 3
- 验证截图落 `tmp/`：Task 4

### Placeholder Scan

- No `TBD` / `TODO`
- All code-change steps include target snippets
- All verification steps include exact commands or explicit UI checks

### Type Consistency

- New primary tab query key uses `sheet`
- Existing live permission store mode/tab remains `by-user` / `by-resource` and `menu` / `resource`
- Query-config row/column route names are removed consistently from shell, router, and action menu

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-23-permission-static-tabs-relocation-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
