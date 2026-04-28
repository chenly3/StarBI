# Dataset-Scoped Data Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move row and column permissions out of `系统设置 -> 权限配置` and make them dataset-scoped actions under `系统设置 -> 问数配置 -> 问数资源管理`, while reusing the already-approved static row/column pages.

**Architecture:** Keep `de-xpack/permission-management` as the home of the row/column page implementations, but remove row/column from the global permission shell. Add dataset-scoped routes under the query-config area, surface entry points from the query-resource table action menu, and pass dataset context into the existing row/column pages through route params/query so the approved page bodies stay intact. Verification relies on existing module `typecheck` / `build` commands plus browser automation because this slice does not currently ship with an isolated unit-test harness.

**Tech Stack:** Vue 3, TypeScript, Vite, Vue Router 4 (`vue-router_2` alias), Element Plus, existing StarBI system-settings shell, agent-browser verification.

---

## File Structure

### Query Config Shell / Resource List

- Modify: `core/core-frontend/src/router/index.ts`
  - Add dataset-scoped routes for row/column permissions under the query-config shell.
- Modify: `core/core-frontend/src/views/system/query-config/index.vue`
  - Keep the query-config shell stable while allowing child route rendering for dataset permission pages.
- Modify: `core/core-frontend/src/views/visualized/data/query-theme/index.vue`
  - Add action-menu entries for `行权限配置 / 列权限配置`.
  - Hide those actions for unsupported datasets.
  - Route into dataset-scoped permission pages.
- Modify: `core/core-frontend/src/locales/zh-CN.ts`
  - Add Chinese strings for dataset-scoped permission entry labels and unsupported-state copy if needed.
- Modify: `core/core-frontend/src/locales/en.ts`
  - Add English string parity for the same labels.

### Permission Shell / Dataset Permission Pages

- Modify: `de-xpack/permission-management/src/menu/system/permission/index.vue`
  - Restrict the global permission shell to menu/resource panels only.
- Modify: `de-xpack/permission-management/src/menu/system/permission/store.ts`
  - Remove row/column from the global tab model if they still participate in shell state.
- Create: `de-xpack/permission-management/src/menu/system/permission/components/DatasetPermissionPageHeader.vue`
  - Shared header with `返回问数资源管理` and `当前数据集名称`.
- Create: `de-xpack/permission-management/src/menu/system/permission/useDatasetPermissionContext.ts`
  - Centralize dataset-id/name parsing and invalid-context checks for row/column pages.
- Modify: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue`
  - Reuse approved body, add dataset header/context, remove row-column sibling navigation, and handle invalid/unsupported dataset state.
- Modify: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue`
  - Mirror the row-page adjustments for the column page.
- Modify: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPreview.vue`
  - Remove or repurpose cross-link buttons that assume row/column are siblings in one shell.
- Modify: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPreview.vue`
  - Same cleanup as row preview.

### Verification / Docs

- Modify: `docs/superpowers/specs/2026-04-22-permission-configuration-prd-design.md`
  - Mark row/column permissions as migrated out of global permission configuration.
- Modify: `docs/superpowers/specs/2026-04-22-permission-configuration-page-annotations.md`
  - Align interaction notes with the dataset-scoped entry model.
- Create: `tmp/dataset-scoped-data-permissions-verification.md`
  - Capture build/browser evidence and final verification notes.

## Task 1: Split Global Permission Shell from Dataset Permissions

**Files:**
- Modify: `de-xpack/permission-management/src/menu/system/permission/index.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/store.ts`
- Modify: `core/core-frontend/src/router/index.ts`

- [ ] **Step 1: Inspect current permission-shell route and tab wiring**

Run:

```bash
sed -n '130,190p' core/core-frontend/src/router/index.ts
sed -n '1,220p' de-xpack/permission-management/src/menu/system/permission/index.vue
sed -n '1,260p' de-xpack/permission-management/src/menu/system/permission/store.ts
```

Expected:

- `/sys-setting/permission` renders `de-xpack/permission-management/.../index.vue`
- the shell still understands `menu / resource / row / column`

- [ ] **Step 2: Make the global permission shell render only menu/resource**

Apply a minimal change similar to:

```ts
const currentPanel = computed(() => {
  return shell.tab.value === 'menu' ? MenuPermissionPanel : ResourcePermissionPanel
})
```

And remove row/column tab resolution from the store shape, for example:

```ts
export type PermissionShellTab = 'menu' | 'resource'
```

- [ ] **Step 3: Add dataset-scoped query-config routes for row/column pages**

Implement route entries under the query-config shell with concrete paths, for example:

```ts
{
  path: '/sys-setting/query-config/dataset/:datasetId/row-permission',
  name: 'sys-setting-query-config-row-permission',
  component: () =>
    import('../../../../de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue'),
  meta: { hidden: true }
}
```

```ts
{
  path: '/sys-setting/query-config/dataset/:datasetId/column-permission',
  name: 'sys-setting-query-config-column-permission',
  component: () =>
    import('../../../../de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue'),
  meta: { hidden: true }
}
```

- [ ] **Step 4: Run static verification for this routing slice**

Run:

```bash
npm run typecheck --prefix de-xpack/permission-management
```

Expected:

- PASS
- no references remain that require `row` or `column` to exist in the global permission shell state

- [ ] **Step 5: Commit the shell split**

```bash
git add de-xpack/permission-management/src/menu/system/permission/index.vue \
  de-xpack/permission-management/src/menu/system/permission/store.ts \
  core/core-frontend/src/router/index.ts
git commit -m "refactor: split dataset permissions from global permission shell"
```

## Task 2: Expose Dataset Permission Actions in Query Resource Management

**Files:**
- Modify: `core/core-frontend/src/views/system/query-config/index.vue`
- Modify: `core/core-frontend/src/views/visualized/data/query-theme/index.vue`
- Modify: `core/core-frontend/src/locales/zh-CN.ts`
- Modify: `core/core-frontend/src/locales/en.ts`

- [ ] **Step 1: Inspect the query-resource table implementation**

Run:

```bash
sed -n '150,240p' core/core-frontend/src/views/visualized/data/query-theme/index.vue
sed -n '748,840p' core/core-frontend/src/views/visualized/data/query-theme/index.vue
```

Expected:

- dataset rows come from `datasetOptions`
- the action column currently only opens the theme-assignment flow

- [ ] **Step 2: Add a dataset-support helper and action-menu model**

Introduce a focused helper near the resource-table code, similar to:

```ts
const supportsDatasetPermissions = (item: DatasetOption) => {
  return Boolean(item.id && item.name && item.fields?.length)
}

const buildRowActions = (item: DatasetOption) => {
  const actions = [
    { key: 'assign-themes', label: t('starbi.adjust_theme_assignment') }
  ]

  if (supportsDatasetPermissions(item)) {
    actions.push(
      { key: 'row-permission', label: t('starbi.row_permission_config') },
      { key: 'column-permission', label: t('starbi.column_permission_config') }
    )
  }

  return actions
}
```

- [ ] **Step 3: Replace the action button with a real dropdown / pop menu**

Render menu actions from the row model and route to dataset-scoped pages:

```ts
const openDatasetRowPermission = (item: DatasetOption) => {
  router.push({
    name: 'sys-setting-query-config-row-permission',
    params: { datasetId: item.id },
    query: { datasetName: item.name, tab: 'query_resources' }
  })
}
```

```ts
const openDatasetColumnPermission = (item: DatasetOption) => {
  router.push({
    name: 'sys-setting-query-config-column-permission',
    params: { datasetId: item.id },
    query: { datasetName: item.name, tab: 'query_resources' }
  })
}
```

- [ ] **Step 4: Keep the query-config shell stable for nested routes**

Update the shell so it can render the resource-management page or a child dataset-permission page without duplicating the system-settings frame, for example:

```vue
<section class="system-setting-card general-config-content">
  <RouterView v-if="route.name?.toString().includes('row-permission') || route.name?.toString().includes('column-permission')" />
  <query-theme-page v-else :key="currentTab.name" :mode-locked="currentTab.mode" :show-mode-tabs="false" />
</section>
```

- [ ] **Step 5: Run query-config static verification and commit**

Run:

```bash
npm run build --prefix core/core-frontend
```

Expected:

- PASS
- query-config route tree still builds with the new nested dataset-permission routes

Commit:

```bash
git add core/core-frontend/src/views/system/query-config/index.vue \
  core/core-frontend/src/views/visualized/data/query-theme/index.vue \
  core/core-frontend/src/locales/zh-CN.ts \
  core/core-frontend/src/locales/en.ts
git commit -m "feat: add dataset-scoped permission actions to query resources"
```

## Task 3: Reuse Approved Row/Column Pages with Dataset Context Header

**Files:**
- Create: `de-xpack/permission-management/src/menu/system/permission/components/DatasetPermissionPageHeader.vue`
- Create: `de-xpack/permission-management/src/menu/system/permission/useDatasetPermissionContext.ts`
- Modify: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPreview.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPreview.vue`

- [ ] **Step 1: Create one shared dataset context parser**

Implement a composable with a tight API, for example:

```ts
export const useDatasetPermissionContext = () => {
  const route = useRoute()
  const router = useRouter()

  const datasetId = computed(() => String(route.params.datasetId || route.query.datasetId || ''))
  const datasetName = computed(() => String(route.query.datasetName || ''))
  const invalidContext = computed(() => !datasetId.value)

  const backToResources = () =>
    router.push({ path: '/sys-setting/query-config', query: { tab: 'query_resources' } })

  return { datasetId, datasetName, invalidContext, backToResources }
}
```

- [ ] **Step 2: Create one shared page header component**

Build a header component that only adds approved context:

```vue
<template>
  <header class="dataset-permission-page-header">
    <button type="button" @click="$emit('back')">返回问数资源管理</button>
    <div class="dataset-permission-page-header__title">{{ datasetName }}</div>
  </header>
</template>
```

- [ ] **Step 3: Refit `RowPermissionPanel.vue` to dataset-scoped mode**

Replace route-query fallbacks and sibling navigation with the shared context:

```ts
const { datasetId, datasetName, invalidContext, backToResources } = useDatasetPermissionContext()
```

And remove cross-page buttons such as:

```ts
const openColumnPage = () => {
  router.push({ query: { ...route.query, tab: 'column' } })
}
```

Render invalid-context UI instead of an empty editable shell:

```vue
<empty-background
  v-if="invalidContext"
  description="当前数据集暂不支持行权限配置"
  img-type="none"
/>
```

- [ ] **Step 4: Apply the same pattern to `ColumnPermissionPanel.vue` and previews**

Mirror the row-page changes:

```ts
const { datasetId, datasetName, invalidContext, backToResources } = useDatasetPermissionContext()
```

And replace row/column cross-links in preview blocks with a plain dataset context display or remove them entirely.

- [ ] **Step 5: Run permission module verification and commit**

Run:

```bash
npm run typecheck --prefix de-xpack/permission-management
npm run build --prefix de-xpack/permission-management
```

Expected:

- PASS
- row/column pages compile as standalone dataset-scoped pages

Commit:

```bash
git add de-xpack/permission-management/src/menu/system/permission/components/DatasetPermissionPageHeader.vue \
  de-xpack/permission-management/src/menu/system/permission/useDatasetPermissionContext.ts \
  de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue \
  de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue \
  de-xpack/permission-management/src/menu/system/permission/RowPermissionPreview.vue \
  de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPreview.vue
git commit -m "feat: scope row and column permission pages to datasets"
```

## Task 4: Align Specs, Restart Correct Services, and Run Browser Regression

**Files:**
- Modify: `docs/superpowers/specs/2026-04-22-permission-configuration-prd-design.md`
- Modify: `docs/superpowers/specs/2026-04-22-permission-configuration-page-annotations.md`
- Create: `tmp/dataset-scoped-data-permissions-verification.md`
- Create: `tmp/*.png`

- [ ] **Step 1: Update older permission docs so they do not contradict the new spec**

Patch the old docs to mark row/column as migrated, for example:

```md
- `权限配置` 当前仅保留 `菜单权限 / 资源权限`
- `行权限 / 列权限` 已迁移至 `问数配置 -> 问数资源管理 -> 具体数据集`
```

- [ ] **Step 2: Restart the affected frontend/backend services in the project’s standard way**

Because this slice changes `dataease` frontend code, run:

```bash
./dataease-web.sh
agent-browser close --all
```

Expected:

- frontend restarts successfully
- all prior browser sessions are closed before verification

- [ ] **Step 3: Run browser regression for the new primary flow**

Verify all of the following with `agent-browser` and save screenshots under `tmp/`:

```text
1. 系统设置 -> 权限配置 only shows 菜单权限 / 资源权限
2. 系统设置 -> 问数配置 -> 问数资源管理 shows dataset row action menu
3. supported dataset row exposes 行权限配置 / 列权限配置
4. unsupported dataset row does not expose those actions
5. clicking 行权限配置 opens the approved row page with 返回问数资源管理 + 当前数据集名称
6. clicking 列权限配置 opens the approved column page with the same context header
7. browser back / explicit return sends the user back to 问数资源管理
```

- [ ] **Step 4: Capture verification notes**

Create `tmp/dataset-scoped-data-permissions-verification.md` with concrete evidence:

```md
- `de-xpack/permission-management`: `typecheck` PASS
- `de-xpack/permission-management`: `build` PASS
- `core/core-frontend`: build PASS
- Browser flow PASS at row-permission route
- Browser flow PASS at column-permission route
- Screenshots saved under `tmp/`
```

- [ ] **Step 5: Commit docs and verification artifacts**

```bash
git add docs/superpowers/specs/2026-04-22-permission-configuration-prd-design.md \
  docs/superpowers/specs/2026-04-22-permission-configuration-page-annotations.md \
  tmp/dataset-scoped-data-permissions-verification.md \
  tmp/*.png
git commit -m "test: verify dataset-scoped data permissions flow"
```

---

## Self-Review

### Spec coverage

- `权限配置` 只保留 `菜单权限 / 资源权限`: covered by Task 1 and Task 4.
- `行权限 / 列权限` 迁移至 `问数配置 -> 问数资源管理`: covered by Task 2 and Task 3.
- 数据集行尾 `...` 作为入口: covered by Task 2.
- 仅对受支持数据集显示入口: covered by Task 2 and Task 4.
- 复用已确认静态页主体，只补返回与数据集名称: covered by Task 3.
- 不支持/无效上下文处理: covered by Task 3.
- 旧文档口径同步: covered by Task 4.

No spec section is left without an implementation task.

### Placeholder scan

Plan checked for:

- `TODO`
- `TBD`
- `implement later`
- vague “add validation” instructions without a concrete placement

No unresolved placeholders remain.

### Type consistency

- Dataset-scoped routes use `datasetId` consistently in both route params and context parsing.
- Shared context helper always returns `datasetId`, `datasetName`, `invalidContext`, and `backToResources`.
- The permission shell is reduced to `menu | resource`; row/column are no longer referenced as shell tabs in later tasks.

No naming drift remains across tasks.
