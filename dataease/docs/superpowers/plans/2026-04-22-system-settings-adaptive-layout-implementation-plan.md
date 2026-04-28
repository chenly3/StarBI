# System Settings Adaptive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the StarBI `系统设置` shell and all mounted pages under one desktop-only adaptive layout system so `1280+` widths have consistent density, typography, boundaries, and space usage.

**Architecture:** Implement this in six passes. First add one shared shell-level adaptive controller for system settings layout width, menu mode, and content spacing. Second add one shared page-level layout vocabulary for page headers, toolbars, cards, tables, and dialogs. Third apply the shared rules to `问数配置` as the pilot page. Fourth apply the same rules to permission configuration. Fifth migrate organization and user management onto the same responsive vocabulary. Sixth perform scripted browser verification across `1440` and `1920` widths and capture artifacts in `tmp/`.

**Tech Stack:** Vue 3, Vue Router 2 compatibility layer, existing `core/core-frontend` layout shell, local xpack modules under `de-xpack`, Less/CSS scoped styles, Vite dev server, `./dataease-web.sh`, `agent-browser`.

## Execution Update

### 2026-04-22 status

- Task 1: completed
- Task 2: completed
- Task 3: completed
- Task 4: completed
- Task 5: completed through implementation and browser regression
- Task 6: completed

### 2026-04-22 evidence

- Query config screenshots:
  - `tmp/query-config-resources-1440.png`
  - `tmp/query-config-resources-1920.png`
- Permission screenshots:
  - `tmp/permission-by-user-1440.png`
  - `tmp/permission-row-role-1440.png`
  - `tmp/permission-by-user-1920.png`
- Organization and user screenshots:
  - `tmp/org-management-1440.png`
  - `tmp/user-management-1440.png`
  - `tmp/org-management-1920.png`
  - `tmp/user-management-1920.png`
  - `tmp/user-form-dialog-1440.png`
- System settings shell screenshots:
  - `tmp/system-settings-shell-1440.png`
  - `tmp/system-settings-shell-1920.png`

### 2026-04-22 notes

- User-management adaptive follow-up fixed three regressions after initial Task 5 pass:
  - add-user dialog now reads default password from `/user/defaultPwd`
  - edit dialog no longer silently collapses existing multi-role assignments unless the role field is changed
  - user table action column now exposes `编辑 / 重置密码 / 删除`
- Root frontend `build:base` no longer fails on `de-xpack/permission-management` resolving `vue-router_2`; explicit aliasing was added in `core/core-frontend/config/common.ts`.
- Root frontend build no longer has the prior `sqlbot-new` prettier blockers after formatting fixes in:
  - `core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  - `core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- The checked-in root package script was updated to `NODE_OPTIONS=--max_old_space_size=8192`, and `npm run build:base --prefix core/core-frontend` completed successfully on 2026-04-23, including `build:flush`.

---

## File Structure

### Shell / shared adaptive rules

- Create: `core/core-frontend/src/layout/composables/useSystemSettingAdaptive.ts`
  - Single source of truth for width buckets, menu expanded vs floating-collapsed mode, and page spacing tokens.
- Modify: `core/core-frontend/src/layout/index.vue`
  - Consume adaptive shell state and apply responsive classes to sidebar/main containers.
- Modify: `core/core-frontend/src/layout/components/Menu.vue`
  - Align menu density, selected-state boundary, and breakpoint-aware width behavior.
- Modify: `core/core-frontend/src/layout/components/MenuItem.vue`
  - Normalize icon/text spacing and selected-state typography.
- Modify: `core/core-frontend/src/layout/components/HeaderSystem.vue`
  - Keep the StarBI shell header visually stable across width buckets.
- Create: `core/core-frontend/src/views/system/shared/system-setting-page.less`
  - Shared CSS vocabulary for page title rows, toolbars, cards, tables, and dialog widths.

### Query config pilot

- Modify: `core/core-frontend/src/views/system/query-config/index.vue`
  - Replace the current light wrapper with adaptive page-shell usage.
- Modify: `core/core-frontend/src/views/visualized/data/query-theme/index.vue`
  - Apply pilot density, tab, table, and workspace width rules for both `resources` and `themes` modes.

### Permission configuration

- Modify: `de-xpack/permission-management/src/menu/system/permission/MenuPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/ResourcePermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/RowPermissionDialog.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/ColumnPermissionDialog.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/MaskRuleDialog.vue`
  - Move all permission pages and dialogs onto the shared shell/page rhythm while preserving the Calicat-aligned structure already confirmed.

### Organization management

- Modify: `de-xpack/organization-management/src/menu/system/org/index.vue`
- Modify: `de-xpack/organization-management/src/menu/system/org/components/OrgFormDialog.vue`
- Modify: `de-xpack/organization-management/src/menu/system/org/components/OrgEditDialog.vue`
- Modify: `de-xpack/organization-management/src/menu/system/org/components/OrgDeleteDialog.vue`
  - Apply the shared tree-table density and dialog width tiers.

### User management

- Modify: `de-xpack/user-management/src/menu/system/user/index.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserToolbar.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserTable.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/RoleListPane.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/RoleMemberTable.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserFormDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserImportDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserImportResultDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/RoleCreateDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/RoleAssignOrgUsersDialog.vue`
  - Apply the shared list-page and dialog-page rules without changing confirmed Calicat structures.

### Verification artifacts

- Create as needed: `tmp/system-settings-*.png`
- Create as needed: `tmp/query-config-*.png`
- Create as needed: `tmp/permission-*.png`
- Create as needed: `tmp/org-*.png`
- Create as needed: `tmp/user-*.png`

---

### Task 1: Add Shared Adaptive Shell Controller For System Settings

**Files:**
- Create: `core/core-frontend/src/layout/composables/useSystemSettingAdaptive.ts`
- Modify: `core/core-frontend/src/layout/index.vue`
- Modify: `core/core-frontend/src/layout/components/Menu.vue`
- Modify: `core/core-frontend/src/layout/components/MenuItem.vue`
- Modify: `core/core-frontend/src/layout/components/HeaderSystem.vue`

- [ ] **Step 1: Create one shell composable that exposes width bucket and menu mode**

Create:

```ts
// core/core-frontend/src/layout/composables/useSystemSettingAdaptive.ts
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type SystemSettingWidthBucket = 'compact' | 'standard' | 'wide'
export type SystemSettingMenuMode = 'expanded' | 'floating'

const windowWidth = ref(typeof window === 'undefined' ? 1920 : window.innerWidth)

const onResize = () => {
  windowWidth.value = window.innerWidth
}

export const useSystemSettingAdaptive = () => {
  onMounted(() => window.addEventListener('resize', onResize))
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))

  const widthBucket = computed<SystemSettingWidthBucket>(() => {
    if (windowWidth.value >= 2120) return 'wide'
    if (windowWidth.value >= 1520) return 'standard'
    return 'compact'
  })

  const sidebarWidth = computed(() => {
    if (widthBucket.value === 'wide') return 252
    if (widthBucket.value === 'standard') return 236
    return 220
  })

  const contentPaddingClass = computed(() => `system-setting-${widthBucket.value}`)

  return {
    widthBucket,
    sidebarWidth,
    contentPaddingClass
  }
}
```

- [ ] **Step 2: Teach the shell layout to apply adaptive sidebar and main-area classes**

Update the layout shell to consume the composable:

```ts
// core/core-frontend/src/layout/index.vue
import { useSystemSettingAdaptive } from './composables/useSystemSettingAdaptive'

const adaptiveShell = useSystemSettingAdaptive()
const adaptiveSidebarStyle = computed(() =>
  settingMenu.value
    ? { width: `${isCollapse.value ? 64 : adaptiveShell.sidebarWidth.value}px` }
    : {}
)
```

Apply it in template:

```vue
<Sidebar
  v-if="!isCollapse"
  class="layout-sidebar"
  :style="adaptiveSidebarStyle"
>
```

```vue
<Main
  class="layout-main"
  :class="[
    { 'with-sider': systemMenu || settingMenu || toolboxMenu },
    adaptiveShell.contentPaddingClass.value
  ]"
/>
```

- [ ] **Step 3: Normalize menu density, icon rhythm, and selected-state boundary**

Update the menu/menu-item styles around this shape:

```less
// core/core-frontend/src/layout/components/Menu.vue
.ed-menu {
  padding: 10px;
  background: #fff;
}

:deep(.ed-menu-item),
:deep(.ed-sub-menu__title) {
  height: 42px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
}

:deep(.ed-menu-item.is-active) {
  background: #edf4ff;
  color: #155eef;
  box-shadow: inset 3px 0 0 #2f6bff;
}
```

```ts
// core/core-frontend/src/layout/components/MenuItem.vue
const SYSTEM_SETTING_MENU_TEXT_SIZE = '14px'
const SYSTEM_SETTING_ICON_SIZE = '16px'
```

- [ ] **Step 4: Keep the header stable and avoid width-bucket regressions**

Ensure the shell header stays single-line:

```less
// core/core-frontend/src/layout/components/HeaderSystem.vue
.header-flex {
  height: 64px;
  padding: 0 24px;
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.system-header .work-bar {
  height: 36px;
  font-size: 14px;
}
```

Run:

```bash
npm run build --prefix core/core-frontend
```

Expected: build succeeds with no new compile errors.

- [ ] **Step 5: Commit shell-only adaptive changes**

```bash
git add core/core-frontend/src/layout/composables/useSystemSettingAdaptive.ts \
  core/core-frontend/src/layout/index.vue \
  core/core-frontend/src/layout/components/Menu.vue \
  core/core-frontend/src/layout/components/MenuItem.vue \
  core/core-frontend/src/layout/components/HeaderSystem.vue
git commit -m "feat: add adaptive system settings shell"
```

---

### Task 2: Add Shared Page-Level Layout Vocabulary

**Files:**
- Create: `core/core-frontend/src/views/system/shared/system-setting-page.less`
- Modify: `core/core-frontend/src/layout/index.vue`
- Modify: `core/core-frontend/src/views/system/query-config/index.vue`
- Reference: `docs/superpowers/specs/2026-04-22-system-settings-adaptive-layout-unified-design.md`

- [ ] **Step 1: Create one shared stylesheet for system settings page primitives**

Create:

```less
// core/core-frontend/src/views/system/shared/system-setting-page.less
.system-setting-page {
  min-height: calc(100vh - 18px);
  background: #f7f9fc;
}

.system-setting-page__content {
  padding: 18px 16px 14px;
}

.system-setting-page__title-row {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.system-setting-page__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.system-setting-card {
  border: 1px solid #e6ebf2;
  border-radius: 12px;
  background: #fff;
}
```

- [ ] **Step 2: Add width-bucket modifiers that match the approved spec**

Include:

```less
.system-setting-compact .system-setting-page__content {
  padding: 10px 12px 12px;
}

.system-setting-standard .system-setting-page__content {
  padding: 12px 16px 16px;
}

.system-setting-wide .system-setting-page__content {
  padding: 16px 20px 20px;
}
```

- [ ] **Step 3: Import the shared stylesheet from the first pilot page**

In the query-config wrapper:

```ts
// core/core-frontend/src/views/system/query-config/index.vue
import '@/views/system/shared/system-setting-page.less'
```

Wrap the page:

```vue
<div class="system-setting-page general-config-page">
  <div class="system-setting-page__content">
    ...
  </div>
</div>
```

- [ ] **Step 4: Verify the shared stylesheet does not break existing mounted pages**

Run:

```bash
npm run build --prefix core/core-frontend
```

Expected: build succeeds and no new missing-import errors appear.

- [ ] **Step 5: Commit the shared page vocabulary**

```bash
git add core/core-frontend/src/views/system/shared/system-setting-page.less \
  core/core-frontend/src/views/system/query-config/index.vue
git commit -m "feat: add shared system settings page styles"
```

---

### Task 3: Use Query Config As The Pilot Adaptive Page

**Files:**
- Modify: `core/core-frontend/src/views/system/query-config/index.vue`
- Modify: `core/core-frontend/src/views/visualized/data/query-theme/index.vue`

- [ ] **Step 1: Replace the current lightweight wrapper with the shared title/tab/card structure**

Update the query-config wrapper to this shape:

```vue
<template>
  <main class="system-setting-page general-config-page">
    <section class="system-setting-page__content general-config-page__content">
      <header class="system-setting-page__title-row">
        <h1 class="system-setting-page__title">{{ t('starbi.query_config_title') }}</h1>
        <div class="general-config-nav">
          ...
        </div>
      </header>

      <section class="system-setting-card general-config-content">
        <query-theme-page :key="currentTab.name" :mode-locked="currentTab.mode" :show-mode-tabs="false" />
      </section>
    </section>
  </main>
</template>
```

- [ ] **Step 2: Move query-config tabs to balanced desktop density**

Use:

```less
.general-config-nav {
  gap: 8px;
}

.general-config-tab {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}
```

- [ ] **Step 3: Rework query-theme main workspace to fill available width instead of floating in the upper area**

Adjust the query-theme page around:

```less
// core/core-frontend/src/views/visualized/data/query-theme/index.vue
.query-theme-page {
  min-height: calc(100vh - 180px);
}

.query-theme-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
}

.query-theme-panel,
.query-resource-panel {
  min-height: calc(100vh - 260px);
}
```

For `resources` mode, ensure the resource table panel expands first on wide screens. For `themes` mode, ensure the theme list remains readable but the detail/workspace area gets the extra width.

- [ ] **Step 4: Verify the pilot page at `1440` and `1920`**

Run:

```bash
./dataease-web.sh
agent-browser close --all
```

Then capture:

```bash
agent-browser open http://127.0.0.1:8080/#/login
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser fill @e2 "admin"
agent-browser fill @e3 "DataEase@123456"
agent-browser click @e1
agent-browser wait 1600
agent-browser set viewport 1440 900
agent-browser open "http://127.0.0.1:8080/#/sys-setting/query-config?tab=query_resources"
agent-browser wait 1500
agent-browser screenshot tmp/query-config-resources-1440.png
agent-browser set viewport 1920 1080
agent-browser wait 800
agent-browser screenshot tmp/query-config-resources-1920.png
```

Expected: query-config fills the page body without the lower-half blank-area problem.

- [ ] **Step 5: Commit the pilot adaptive page**

```bash
git add core/core-frontend/src/views/system/query-config/index.vue \
  core/core-frontend/src/views/visualized/data/query-theme/index.vue \
  tmp/query-config-resources-1440.png \
  tmp/query-config-resources-1920.png
git commit -m "feat: adapt query config layout for desktop breakpoints"
```

---

### Task 4: Apply The Shared Rules To Permission Configuration

**Files:**
- Modify: `de-xpack/permission-management/src/menu/system/permission/MenuPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/ResourcePermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/RowPermissionDialog.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/ColumnPermissionDialog.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/MaskRuleDialog.vue`

- [ ] **Step 1: Move the four permission pages onto the shared page shell spacing and heading scale**

Align all page roots to this baseline:

```less
.permission-page {
  min-height: calc(100vh - 18px);
  background: #f7f9fc;
}

.permission-page__content {
  padding: 18px 16px 14px;
}

.permission-page__header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}
```

- [ ] **Step 2: Increase permission matrix density without breaking the confirmed Calicat structure**

Use the following direction in both by-user and by-resource pages:

```less
.switch-row__item { height: 46px; font-size: 17px; font-weight: 600; }
.inline-tabs__item { height: 42px; font-size: 15px; }
.table-card__head { font-size: 14px; min-height: 48px; }
.table-card__row { font-size: 15px; min-height: 48px; }
.panel { min-height: calc(100vh - 220px); }
```

The extra width on large screens should go to the permission matrix column, not to empty margins.

- [ ] **Step 3: Keep row/column dialog structures but move them onto the shared dialog width tiers**

Apply:

```less
.dialog-card {
  width: 780px;
  border-radius: 10px;
}

@media (min-width: 2120px) {
  .dialog-card {
    width: 920px;
  }
}
```

For `MaskRuleDialog.vue`, cap width:

```less
.dialog-card {
  width: 600px;
}
```

- [ ] **Step 4: Re-run permission regression screenshots**

Run:

```bash
./dataease-web.sh
agent-browser close --all
```

Then capture:

```bash
agent-browser open http://127.0.0.1:8080/#/login
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser fill @e2 "admin"
agent-browser fill @e3 "DataEase@123456"
agent-browser click @e1
agent-browser wait 1600
agent-browser set viewport 1440 900
agent-browser open "http://127.0.0.1:8080/#/sys-setting/permission?mode=by-user&tab=resource"
agent-browser wait 1500
agent-browser screenshot tmp/permission-by-user-1440.png
agent-browser open "http://127.0.0.1:8080/#/sys-setting/permission?mode=by-resource&tab=row&dialog=role"
agent-browser wait 1500
agent-browser screenshot tmp/permission-row-role-1440.png
agent-browser set viewport 1920 1080
agent-browser open "http://127.0.0.1:8080/#/sys-setting/permission?mode=by-user&tab=resource"
agent-browser wait 1500
agent-browser screenshot tmp/permission-by-user-1920.png
```

Expected: permission pages remain structurally aligned to the accepted prototype but are easier to read at `1440`.

- [ ] **Step 5: Commit permission adaptive updates**

```bash
git add de-xpack/permission-management/src/menu/system/permission/MenuPermissionPanel.vue \
  de-xpack/permission-management/src/menu/system/permission/ResourcePermissionPanel.vue \
  de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue \
  de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue \
  de-xpack/permission-management/src/menu/system/permission/components/RowPermissionDialog.vue \
  de-xpack/permission-management/src/menu/system/permission/components/ColumnPermissionDialog.vue \
  de-xpack/permission-management/src/menu/system/permission/components/MaskRuleDialog.vue \
  tmp/permission-by-user-1440.png \
  tmp/permission-row-role-1440.png \
  tmp/permission-by-user-1920.png
git commit -m "feat: adapt permission configuration layout"
```

---

### Task 5: Apply The Same Adaptive Rules To Organization And User Management

**Files:**
- Modify: `de-xpack/organization-management/src/menu/system/org/index.vue`
- Modify: `de-xpack/organization-management/src/menu/system/org/components/OrgFormDialog.vue`
- Modify: `de-xpack/organization-management/src/menu/system/org/components/OrgEditDialog.vue`
- Modify: `de-xpack/organization-management/src/menu/system/org/components/OrgDeleteDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/index.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserToolbar.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserTable.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/RoleListPane.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/RoleMemberTable.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserFormDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserImportDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/UserImportResultDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/RoleCreateDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/components/RoleAssignOrgUsersDialog.vue`

- [ ] **Step 1: Raise organization-management typography and let the tree table fill the available body height**

Apply the spec values:

```less
.org-page__header h1 { font-size: 24px; font-weight: 700; }
.org-add-button,
.org-search,
.org-table thead th,
.org-table tbody td { font-size: 14px; }
.org-table-panel { min-height: calc(100vh - 220px); }
```

Keep the large-name column as the primary expanding column.

- [ ] **Step 2: Move org dialogs to the shared dialog tiers**

For add/edit dialogs:

```less
.dialog-card {
  width: 720px;
}

@media (min-width: 1520px) {
  .dialog-card {
    width: 820px;
  }
}
```

Keep delete-confirm dialogs compact.

- [ ] **Step 3: Compress user-management head area and unify its table density**

Follow this direction:

```less
.user-management-header h1 { font-size: 24px; font-weight: 700; }
.user-management-tabs { margin-top: 12px; }
.user-table thead th { font-size: 14px; min-height: 46px; }
.user-table tbody td { font-size: 15px; min-height: 46px; }
.user-toolbar { gap: 12px; }
```

Do not change the confirmed Calicat structural slots. Only change spacing, widths, table height, and readability.

- [ ] **Step 4: Verify org and user pages at both target widths**

Run:

```bash
./dataease-web.sh
agent-browser close --all
```

Then capture:

```bash
agent-browser open http://127.0.0.1:8080/#/login
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser fill @e2 "admin"
agent-browser fill @e3 "DataEase@123456"
agent-browser click @e1
agent-browser wait 1600
agent-browser set viewport 1440 900
agent-browser open "http://127.0.0.1:8080/#/sys-setting/org"
agent-browser wait 1500
agent-browser screenshot tmp/org-management-1440.png
agent-browser open "http://127.0.0.1:8080/#/sys-setting/user"
agent-browser wait 1500
agent-browser screenshot tmp/user-management-1440.png
agent-browser set viewport 1920 1080
agent-browser open "http://127.0.0.1:8080/#/sys-setting/org"
agent-browser wait 1500
agent-browser screenshot tmp/org-management-1920.png
agent-browser open "http://127.0.0.1:8080/#/sys-setting/user"
agent-browser wait 1500
agent-browser screenshot tmp/user-management-1920.png
```

Expected: both pages keep their confirmed structures but no longer look undersized on a 13-inch class width.

- [ ] **Step 5: Commit organization and user adaptive updates**

```bash
git add de-xpack/organization-management/src/menu/system/org/index.vue \
  de-xpack/organization-management/src/menu/system/org/components/OrgFormDialog.vue \
  de-xpack/organization-management/src/menu/system/org/components/OrgEditDialog.vue \
  de-xpack/organization-management/src/menu/system/org/components/OrgDeleteDialog.vue \
  de-xpack/user-management/src/menu/system/user/index.vue \
  de-xpack/user-management/src/menu/system/user/components/UserToolbar.vue \
  de-xpack/user-management/src/menu/system/user/components/UserTable.vue \
  de-xpack/user-management/src/menu/system/user/components/RoleListPane.vue \
  de-xpack/user-management/src/menu/system/user/components/RoleMemberTable.vue \
  de-xpack/user-management/src/menu/system/user/components/UserFormDialog.vue \
  de-xpack/user-management/src/menu/system/user/components/UserImportDialog.vue \
  de-xpack/user-management/src/menu/system/user/components/UserImportResultDialog.vue \
  de-xpack/user-management/src/menu/system/user/components/RoleCreateDialog.vue \
  de-xpack/user-management/src/menu/system/user/components/RoleAssignOrgUsersDialog.vue \
  tmp/org-management-1440.png \
  tmp/user-management-1440.png \
  tmp/org-management-1920.png \
  tmp/user-management-1920.png
git commit -m "feat: unify adaptive density across org and user pages"
```

---

### Task 6: Run Full System Settings Regression And Record Acceptance Evidence

**Files:**
- Verify: `core/core-frontend/src/layout/index.vue`
- Verify: `core/core-frontend/src/views/system/query-config/index.vue`
- Verify: `core/core-frontend/src/views/visualized/data/query-theme/index.vue`
- Verify: `de-xpack/permission-management/src/menu/system/permission/*.vue`
- Verify: `de-xpack/organization-management/src/menu/system/org/index.vue`
- Verify: `de-xpack/user-management/src/menu/system/user/index.vue`
- Create: `tmp/system-settings-shell-1440.png`
- Create: `tmp/system-settings-shell-1920.png`
- Create: `tmp/system-settings-verification-notes.md`

- [ ] **Step 1: Restart the frontend and clear all browser sessions**

Run:

```bash
./dataease-web.sh
agent-browser close --all
```

Expected: the dev server restarts cleanly and all prior browser sessions are closed.

- [ ] **Step 2: Capture shell-level screenshots at `1440` and `1920`**

Run:

```bash
agent-browser open http://127.0.0.1:8080/#/login
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser fill @e2 "admin"
agent-browser fill @e3 "DataEase@123456"
agent-browser click @e1
agent-browser wait 1600
agent-browser set viewport 1440 900
agent-browser open "http://127.0.0.1:8080/#/sys-setting/query-config"
agent-browser wait 1500
agent-browser screenshot tmp/system-settings-shell-1440.png
agent-browser set viewport 1920 1080
agent-browser wait 800
agent-browser screenshot tmp/system-settings-shell-1920.png
```

Expected: shell header, left menu, and content paddings remain stable across both widths.

- [ ] **Step 3: Record acceptance notes against the approved spec**

Create:

```md
# System Settings Verification Notes

- 1440: left menu readable, body not cramped
- 1920: content expands, no oversized blank lower-half region
- Query config: resource/theme page fills body
- Permission config: matrix remains primary area
- Organization management: tree table fills body
- User management: list density readable and not tiny
```

Save to:

```text
tmp/system-settings-verification-notes.md
```

- [ ] **Step 4: Final regression sanity check**

Run:

```bash
npm run build --prefix core/core-frontend
```

Expected: PASS.

- [ ] **Step 5: Commit verification artifacts and final adaptive pass**

```bash
git add tmp/system-settings-shell-1440.png \
  tmp/system-settings-shell-1920.png \
  tmp/system-settings-verification-notes.md
git commit -m "test: verify adaptive system settings layout"
```

---

## Self-Review

### Spec coverage

- Shell adaptive widths, menu behavior, content padding: covered by Task 1
- Shared page vocabulary and typography: covered by Task 2
- Query config pilot and blank-space fix: covered by Task 3
- Permission configuration density, dialog scaling, and matrix emphasis: covered by Task 4
- Organization management and user management convergence: covered by Task 5
- `1440` / `1920` browser evidence and shell-level acceptance: covered by Task 6

No spec section is left without a task.

### Placeholder scan

Plan checked for:

- `TODO`
- `TBD`
- `implement later`
- unspecified “add tests” placeholders

No unresolved placeholders remain.

### Type consistency

- Shared shell composable uses one set of names: `widthBucket`, `sidebarWidth`, `contentPaddingClass`
- Width buckets match the approved spec buckets
- Menu mode language stays consistent as `expanded` vs `floating`
- Query config, permission, organization, and user pages are referenced with exact existing file paths

No naming drift was introduced between tasks.
