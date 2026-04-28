# Row Column Permission System Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `行列权限配置` as a first-level `系统设置` menu, keep the approved static shell, wire it to real dataset/row-permission/column-permission APIs, and remove the temporary page placement from `权限配置` and `问数配置`.

**Architecture:** Keep `权限配置` and `行列权限配置` as two separate system-setting pages. Introduce a dedicated `row-column-permission` shell route that owns dataset-tree context, URL query sync, and tab switching, then reuse focused row/column panels under that shell. Preserve the approved static shell structure and only inject real data, query state, and dialog flows.

**Tech Stack:** Vue 3 SFC, TypeScript, Pinia-adjacent route/store helpers, existing DataEase API wrappers, Element Plus Secondary UI, shell validation commands, `./dataease-web.sh`, `./dataease-app.sh`, `agent-browser`.

---

### Task 1: Add the dedicated system-setting route and left menu entry

**Files:**
- Modify: `core/core-frontend/src/router/index.ts`
- Modify: `core/core-frontend/src/layout/components/Menu.vue`
- Modify: `core/core-frontend/src/layout/components/MenuItem.vue`
- Modify: `core/core-frontend/src/store/modules/permission.ts`
- Reference: `docs/superpowers/specs/2026-04-24-row-column-permission-system-menu-design.md`

- [ ] **Step 1: Add the new shell route in the router**

Add a dedicated route block beside the existing `/sys-setting/permission` route:

```ts
  {
    path: '/sys-setting/row-column-permission',
    name: 'sys-setting-row-column-permission-shell',
    component: () => import('@/layout/index.vue'),
    hidden: true,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'sys-setting-row-column-permission-page',
        hidden: true,
        component: () =>
          import(
            '../../../../de-xpack/permission-management/src/menu/system/permission/RowColumnPermissionPage.vue'
          ),
        meta: { hidden: true }
      }
    ]
  },
```

- [ ] **Step 2: Extend the system-setting menu whitelist and target paths**

Update `Menu.vue` to recognize the new menu key:

```ts
const SETTING_MENU_WHITELIST = new Set([
  'parameter',
  'font',
  'user',
  'org',
  'permission',
  'row-column-permission',
  'query-config'
])

const ROW_COLUMN_PERMISSION_MENU: MenuRouteRecord = {
  path: 'row-column-permission',
  meta: {
    title: '行列权限配置',
    icon: 'icon_security'
  },
  __resolvedPath: '/sys-setting/row-column-permission'
}

const SYSTEM_SETTING_TARGET_PATHS: Record<string, string> = {
  parameter: '/sys-setting/parameter',
  font: '/sys-setting/font',
  user: '/sys-setting/user',
  org: '/sys-setting/org',
  permission: '/sys-setting/permission',
  'row-column-permission': '/sys-setting/row-column-permission',
  'query-config': '/sys-setting/query-config'
}
```

Then inject `ROW_COLUMN_PERMISSION_MENU` the same way `PERMISSION_MENU` and `QUERY_CONFIG_MENU` are injected.

- [ ] **Step 3: Add left-menu fallback text and icon mapping**

Update `MenuItem.vue`:

```ts
const titleFallbackMap = {
  parameter: '通用配置',
  'query-config': '问数配置',
  permission: '权限配置',
  'row-column-permission': '行列权限配置'
}

const iconFallbackMap = {
  user: 'peoples',
  permission: 'icon_security',
  'row-column-permission': 'icon_security',
  'query-config': 'sys-parameter'
}
```

- [ ] **Step 4: Allow permission-path validation for the new page**

Update `pathValid()` in `core/core-frontend/src/store/modules/permission.ts`:

```ts
  if (
    path?.startsWith('/sys-setting/query-config') ||
    path?.startsWith('/sys-setting/permission') ||
    path?.startsWith('/sys-setting/row-column-permission') ||
    path?.startsWith('/prototype/permission') ||
    path?.startsWith('/sqlbotnew') ||
    path?.startsWith('/sqlbot') ||
    path?.startsWith('/starbi/query-config') ||
    path?.startsWith('/sys-setting/user') ||
    path?.startsWith('/sys-setting/org') ||
    path?.startsWith('/menu/system/user') ||
    path?.startsWith('/starbi/system-user')
  ) {
    return true
  }
```

- [ ] **Step 5: Run route and menu smoke checks**

Run:

```bash
rg -n "sys-setting-row-column-permission|/sys-setting/row-column-permission" core/core-frontend/src/router/index.ts core/core-frontend/src/layout/components/Menu.vue core/core-frontend/src/store/modules/permission.ts
rg -n "row-column-permission" core/core-frontend/src/layout/components/MenuItem.vue
```

Expected: the new path appears in router, menu, and permission-path validation.

- [ ] **Step 6: Commit**

```bash
git add core/core-frontend/src/router/index.ts core/core-frontend/src/layout/components/Menu.vue core/core-frontend/src/layout/components/MenuItem.vue core/core-frontend/src/store/modules/permission.ts
git commit -m "feat: add row column permission system menu route"
```

### Task 2: Create the dedicated row-column-permission page shell and remove temporary placement

**Files:**
- Create: `de-xpack/permission-management/src/menu/system/permission/RowColumnPermissionPage.vue`
- Create: `de-xpack/permission-management/src/menu/system/permission/components/DatasetTreePanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/index.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/useDatasetPermissionContext.ts`
- Modify: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue`
- Reference: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPreview.vue`
- Reference: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPreview.vue`

- [ ] **Step 1: Create the dedicated page shell component**

Create `RowColumnPermissionPage.vue` with this structure:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import DatasetTreePanel from './components/DatasetTreePanel.vue'
import RowPermissionPanel from './RowPermissionPanel.vue'
import ColumnPermissionPanel from './ColumnPermissionPanel.vue'
import { useDatasetPermissionContext } from './useDatasetPermissionContext'

const { activeTab, setActiveTab, datasetName, hasDataset } = useDatasetPermissionContext()

const currentPanel = computed(() => {
  return activeTab.value === 'column' ? ColumnPermissionPanel : RowPermissionPanel
})
</script>

<template>
  <div class="row-column-permission-page">
    <DatasetTreePanel />
    <section class="row-column-permission-page__content">
      <component :is="currentPanel" :show-primary-switch="false" />
    </section>
  </div>
</template>
```

The final template must keep the approved shell proportions from the preview pages and use CSS wide enough for 13-inch displays and high-resolution screens.

- [ ] **Step 2: Move dataset context ownership into the shared composable**

Extend `useDatasetPermissionContext.ts` to own:

```ts
const activeTab = computed<'row' | 'column'>(() => {
  const raw = queryValue(route.query.tab)
  return raw === 'column' ? 'column' : 'row'
})

const setActiveTab = (tab: 'row' | 'column') => {
  router.replace({
    path: '/sys-setting/row-column-permission',
    query: {
      ...route.query,
      datasetId: datasetId.value || undefined,
      datasetName: datasetName.value || undefined,
      tab
    }
  })
}
```

Also add:

```ts
const hasDataset = computed(() => Boolean(datasetId.value))
const backToResources = () =>
  router.push({ path: '/sys-setting/query-config', query: { tab: 'query_resources' } })
```

- [ ] **Step 3: Remove row/column tabs from the old permission page**

Update `de-xpack/permission-management/src/menu/system/permission/index.vue` so it only keeps:

```ts
type PermissionSheet = 'user' | 'resource'
```

and only renders:

```vue
<button ... @click="openSheet('user')">按用户配置</button>
<button ... @click="openSheet('resource')">按资源配置</button>
```

Delete the `row` and `column` branches from `resolveSheet()`, `currentPanel`, and the tab grid.

- [ ] **Step 4: Adapt row and column panels to be shell children, not standalone pages**

Replace direct page-level route assumptions in `RowPermissionPanel.vue` and `ColumnPermissionPanel.vue` with:

```ts
const { datasetId, datasetName, invalidContext, backToResources, activeTab, setActiveTab } =
  useDatasetPermissionContext()
```

Each panel must render its own active tab button and switch through `setActiveTab('row')` / `setActiveTab('column')`, but the page shell owns the overall route.

- [ ] **Step 5: Verify the temporary placement is fully removed**

Run:

```bash
rg -n "sheet=row|sheet=column|行权限配置|列权限配置" de-xpack/permission-management/src/menu/system/permission/index.vue
```

Expected: `index.vue` no longer exposes row/column as permission-page tabs.

- [ ] **Step 6: Commit**

```bash
git add de-xpack/permission-management/src/menu/system/permission/RowColumnPermissionPage.vue de-xpack/permission-management/src/menu/system/permission/components/DatasetTreePanel.vue de-xpack/permission-management/src/menu/system/permission/index.vue de-xpack/permission-management/src/menu/system/permission/useDatasetPermissionContext.ts de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue
git commit -m "feat: create dedicated row column permission shell"
```

### Task 3: Implement dataset tree loading, query synchronization, and page context

**Files:**
- Modify: `de-xpack/permission-management/src/menu/system/permission/api.ts`
- Modify: `de-xpack/permission-management/src/menu/system/permission/types.ts`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/DatasetTreePanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/useDatasetPermissionContext.ts`
- Reference: `core/core-frontend/src/views/system/query-config/index.vue`
- Reference: `docs/superpowers/specs/2026-04-24-row-column-permission-system-menu-design.md`

- [ ] **Step 1: Define the dataset tree DTOs used by the shell**

Add explicit types in `types.ts`:

```ts
export interface DatasetPermissionTreeNode {
  id: string
  name: string
  leaf: boolean
  children: DatasetPermissionTreeNode[]
}

export interface DatasetPermissionTreeResult {
  tree: DatasetPermissionTreeNode[]
  firstDatasetId: string | null
  firstDatasetName: string
}
```

- [ ] **Step 2: Add API helpers for the dataset tree and tree search**

In `api.ts`, add one wrapper that normalizes existing dataset-tree results:

```ts
export const listPermissionDatasets = async (keyword = ''): Promise<DatasetPermissionTreeNode[]> => {
  const res = keyword
    ? await postJson('/dataset/tree/search', { keyword })
    : await getJson('/dataset/tree')
  const rows = unwrapResponseData<unknown>(res)
  return normalizeDatasetTree(rows)
}
```

If the actual repo uses a different existing dataset-tree endpoint, wire that exact endpoint instead of inventing a new one. Do not create a backend API in this task.

- [ ] **Step 3: Build the dataset tree panel interaction**

`DatasetTreePanel.vue` must manage:

```vue
<template>
  <aside class="dataset-tree-panel">
    <input v-model="keyword" placeholder="搜索数据集" />
    <div class="dataset-tree-panel__body">
      <button
        v-for="node in flatRows"
        :key="node.id"
        :disabled="!node.leaf"
        :class="{ 'is-active': node.id === datasetId }"
        @click="selectDataset(node)"
      >
        {{ node.name }}
      </button>
    </div>
  </aside>
</template>
```

Implement selection so only `leaf === true` can call:

```ts
router.replace({
  path: '/sys-setting/row-column-permission',
  query: {
    ...route.query,
    datasetId: node.id,
    datasetName: node.name,
    tab: activeTab.value
  }
})
```

- [ ] **Step 4: Implement first-dataset fallback and invalid-query fallback**

In the shared context or tree panel, add the exact fallback flow:

```ts
if (!route.query.datasetId && firstLeaf) {
  replaceToDataset(firstLeaf.id, firstLeaf.name, activeTab.value)
}

if (route.query.datasetId && !treeContainsLeaf(String(route.query.datasetId))) {
  ElMessage.error('指定数据集不存在或当前无权限访问，已切换到首个可配置数据集')
  replaceToDataset(firstLeaf.id, firstLeaf.name, activeTab.value)
}
```

When there is no `firstLeaf`, keep the shell rendered and do not raise a blocking exception.

- [ ] **Step 5: Run shell-level validation**

Run:

```bash
cd core/core-frontend && npm run ts:check
```

Expected: TypeScript check passes with no new errors from `RowColumnPermissionPage.vue`, `DatasetTreePanel.vue`, `api.ts`, or `types.ts`.

- [ ] **Step 6: Commit**

```bash
git add de-xpack/permission-management/src/menu/system/permission/api.ts de-xpack/permission-management/src/menu/system/permission/types.ts de-xpack/permission-management/src/menu/system/permission/components/DatasetTreePanel.vue de-xpack/permission-management/src/menu/system/permission/useDatasetPermissionContext.ts
git commit -m "feat: wire dataset tree for row column permissions"
```

### Task 4: Complete row-permission real interactions on top of the approved shell

**Files:**
- Modify: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/RowPermissionDialog.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/api.ts`
- Modify: `de-xpack/permission-management/src/menu/system/permission/types.ts`
- Reference: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPreview.vue`

- [ ] **Step 1: Add row list query state for pagination, filter, and keyword search**

In `RowPermissionPanel.vue`, replace fixed `page=1,size=20` loading with a reactive query block:

```ts
const pager = reactive({
  current: 1,
  size: 20,
  total: 0
})

const filters = reactive({
  targetType: '' as '' | 'role' | 'user' | 'sysParams',
  keyword: ''
})
```

Then call the API with the active query state instead of hard-coded values.

- [ ] **Step 2: Extend the row-permission list API wrapper to accept filters**

Change the API signature from:

```ts
export const listRowPermissions = async (datasetId: string | number, page = 1, size = 20)
```

to:

```ts
export const listRowPermissions = async (
  datasetId: string | number,
  page = 1,
  size = 20,
  query: {
    authTargetType?: string
    keyword?: string
  } = {}
)
```

and forward the filter object using the existing backend-compatible request style already used in this repo.

- [ ] **Step 3: Render the approved list controls without adding new layout blocks**

Keep the shell compact and render only:

```vue
<div class="toolbar">
  <select v-model="filters.targetType">
    <option value="">全部类型</option>
    <option value="role">角色</option>
    <option value="user">用户</option>
    <option value="sysParams">系统变量</option>
  </select>
  <input v-model="filters.keyword" placeholder="搜索受限对象" />
  <button type="button" class="add-btn" @click="openCreateDialog('role')">＋ 添加</button>
</div>
```

Do not add explanatory cards or extra banners.

- [ ] **Step 4: Update delete copy and success/error feedback**

Replace generic confirm text with:

```ts
const message = row.authTargetName
  ? `确认删除【${row.authTargetName}】的行权限规则？删除后不可恢复。`
  : '确认删除该行权限规则？删除后不可恢复。'
```

Use the repo’s message component for:

```ts
ElMessage.success('删除成功')
ElMessage.success('保存成功')
ElMessage.error(errorMessage)
```

- [ ] **Step 5: Keep dialog save semantics aligned with the spec**

In `RowPermissionDialog.vue` and the submit path in `RowPermissionPanel.vue`, preserve:

```ts
await saveRowPermission({
  id: editRowId.value,
  enable: true,
  authTargetType: toAuthTargetType(dialogType.value),
  authTargetId: dialogType.value === 'sysVar' ? '0' : form.targetId,
  datasetId: datasetId.value,
  expressionTree: form.expressionTree,
  whiteListUser: JSON.stringify(form.whiteListIds)
})
```

Do not add page-level “save all”. On success, close the dialog and reload only the row list.

- [ ] **Step 6: Run focused validation**

Run:

```bash
cd core/core-frontend && npm run ts:check
```

Expected: row-permission panel and dialog compile cleanly after pagination/filter/search additions.

- [ ] **Step 7: Commit**

```bash
git add de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue de-xpack/permission-management/src/menu/system/permission/components/RowPermissionDialog.vue de-xpack/permission-management/src/menu/system/permission/api.ts de-xpack/permission-management/src/menu/system/permission/types.ts
git commit -m "feat: complete row permission interactions"
```

### Task 5: Complete column-permission real interactions on top of the approved shell

**Files:**
- Modify: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/ColumnPermissionDialog.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/MaskRuleDialog.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/api.ts`
- Modify: `de-xpack/permission-management/src/menu/system/permission/types.ts`
- Reference: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPreview.vue`

- [ ] **Step 1: Add column list query state for pagination, filter, and keyword search**

Mirror the row-permission query structure:

```ts
const pager = reactive({
  current: 1,
  size: 20,
  total: 0
})

const filters = reactive({
  targetType: '' as '' | 'role' | 'user',
  keyword: ''
})
```

- [ ] **Step 2: Extend the column list API wrapper to accept filters**

Change:

```ts
export const listColumnPermissions = async (datasetId: string | number, page = 1, size = 20)
```

to:

```ts
export const listColumnPermissions = async (
  datasetId: string | number,
  page = 1,
  size = 20,
  query: {
    authTargetType?: string
    keyword?: string
  } = {}
)
```

Forward the query using the backend-compatible request format already used by this module.

- [ ] **Step 3: Keep the outer list at four columns only**

The column list header must remain:

```vue
<div class="table-head">
  <span>类型</span>
  <span>受限对象</span>
  <span>白名单</span>
  <span>操作</span>
</div>
```

Do not add `字段规则摘要` to the outer table.

- [ ] **Step 4: Keep field-rule preview inside the dialog**

In `ColumnPermissionDialog.vue`, keep the internal rule table:

```vue
<div class="rule-table__head">
  <span class="col-name">字段名称</span>
  <span class="col-preview">规则预览</span>
  <span class="col-actions">操作</span>
</div>
```

and keep mask-rule edits flowing through the nested dialog:

```ts
const openMask = (fieldId: string) => {
  activeMaskFieldId.value = fieldId
  emit('open-mask')
}
```

Do not move field previews into the list page.

- [ ] **Step 5: Update delete copy and save feedback**

Use:

```ts
const message = row.authTargetName
  ? `确认删除【${row.authTargetName}】的列权限规则？删除后不可恢复。`
  : '确认删除该列权限规则？删除后不可恢复。'
```

and on save/delete success:

```ts
ElMessage.success('保存成功')
ElMessage.success('删除成功')
```

- [ ] **Step 6: Run focused validation**

Run:

```bash
cd core/core-frontend && npm run ts:check
```

Expected: column-permission panel, dialog, and nested mask dialog compile cleanly with the new list-query behavior.

- [ ] **Step 7: Commit**

```bash
git add de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue de-xpack/permission-management/src/menu/system/permission/components/ColumnPermissionDialog.vue de-xpack/permission-management/src/menu/system/permission/components/MaskRuleDialog.vue de-xpack/permission-management/src/menu/system/permission/api.ts de-xpack/permission-management/src/menu/system/permission/types.ts
git commit -m "feat: complete column permission interactions"
```

### Task 6: Remove old entry points and run full browser regression

**Files:**
- Modify: `core/core-frontend/src/layout/components/Menu.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/index.vue`
- Modify: `docs/superpowers/specs/2026-04-24-row-column-permission-system-menu-design.md`
- Create: `tmp/row-column-permission-menu.png`
- Create: `tmp/row-permission-page.png`
- Create: `tmp/column-permission-page.png`
- Create: `tmp/row-dialog.png`
- Create: `tmp/column-dialog.png`
- Create: `tmp/mask-dialog.png`

- [ ] **Step 1: Remove remaining references to old placements**

Run:

```bash
rg -n "sheet=row|sheet=column|/sys-setting/query-config.*row|/sys-setting/query-config.*column|行权限配置|列权限配置" core/core-frontend/src de-xpack/permission-management/src/menu/system/permission
```

Then edit the remaining code so:

- `权限配置` only exposes `按用户配置` and `按资源配置`
- `问数配置` does not expose row/column-permission entry points
- `行列权限配置` is only reachable from the left system-setting menu or direct URL with auth

- [ ] **Step 2: Restart the required services before browser verification**

If only frontend files changed, run:

```bash
./dataease-web.sh
sleep 12
```

If any backend permission API or controller wiring changed during implementation, run:

```bash
./dataease-app.sh
sleep 12
./dataease-web.sh
sleep 12
```

Expected: the relevant service restart completes before browser checks.

- [ ] **Step 3: Run browser preflight and close all browser sessions**

Run:

```bash
./browser-verify-preflight.sh
agent-browser close-all
```

Expected: browser environment is ready and previous sessions are cleared.

- [ ] **Step 4: Capture the required browser regression artifacts**

Use `agent-browser` to verify and save screenshots under `tmp/` for:

- `/sys-setting/row-column-permission`
- `/sys-setting/row-column-permission?tab=row`
- `/sys-setting/row-column-permission?tab=column`
- row dialog open state
- column dialog open state
- mask dialog open state
- `/sys-setting/permission`

The exact artifact files must be:

```text
tmp/row-column-permission-menu.png
tmp/row-permission-page.png
tmp/column-permission-page.png
tmp/row-dialog.png
tmp/column-dialog.png
tmp/mask-dialog.png
tmp/permission-page-no-row-column-tabs.png
```

- [ ] **Step 5: Run final compile validation**

Run:

```bash
cd core/core-frontend && npm run ts:check
cd core/core-frontend && npm run build
```

Expected: both commands pass. If `npm run build` fails for an unrelated pre-existing issue, capture the exact failure and do not mark the task complete until it is classified.

- [ ] **Step 6: Commit**

```bash
git add core/core-frontend/src/layout/components/Menu.vue de-xpack/permission-management/src/menu/system/permission/index.vue tmp/row-column-permission-menu.png tmp/row-permission-page.png tmp/column-permission-page.png tmp/row-dialog.png tmp/column-dialog.png tmp/mask-dialog.png tmp/permission-page-no-row-column-tabs.png
git commit -m "test: verify row column permission system menu flow"
```

## Self-Review

- Spec coverage check:
  - `系统设置左侧同级菜单` is implemented by Task 1.
  - `正式独立路由 /sys-setting/row-column-permission` is implemented by Task 1 and Task 2.
  - `权限配置页去掉行列权限页签` is implemented by Task 2 and Task 6.
  - `问数配置不保留入口` is implemented by Task 6.
  - `保留 5 个静态壳并接真实数据` is implemented by Task 2 through Task 5.
  - `query 仅作初始状态，不绕过鉴权` is implemented by Task 1 and Task 3.
  - `列表不加字段规则摘要列` is enforced by Task 5.
  - `删除确认、成功失败提示、分页筛选搜索` are implemented by Task 4 and Task 5.
  - `浏览器回归截图保存在 tmp/` is implemented by Task 6.

- Placeholder scan:
  - The plan contains no unfinished markers or deferred-work shortcuts.
  - Every task names exact files and exact verification commands.

- Type consistency check:
  - The plan consistently uses `row-column-permission` as the route/menu key.
  - The shared query tab names are consistently `row` and `column`.
  - The outer shell file is consistently `RowColumnPermissionPage.vue`.
  - Dataset tree types use `DatasetPermissionTreeNode` and `DatasetPermissionTreeResult` consistently.
