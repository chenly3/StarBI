# Permission Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current static permission-configuration prototype with a working local module that matches the confirmed Calicat UI and persists menu/resource/row/column permissions through local substitute services and existing dataset permission contracts.

**Architecture:** Implement the module in four layers. First add local backend substitute services for `AuthApi`, `RowPermissionsApi`, and `ColumnPermissionsApi`, backed by an in-memory store aligned with the existing user/org substitute strategy. Second expose a real frontend permission module under system settings using the confirmed static screens as the rendering baseline. Third wire each page to current frontend APIs (`auth.ts`, `dataset.ts`) and existing dataset/permission contracts. Fourth verify menu/resource permissions, row/column permissions, and system-settings entry behavior with browser automation.

**Tech Stack:** Spring Boot substitute controllers, existing `sdk/api/api-permissions` contracts, Vue 3, Pinia, Vite, Element Plus Secondary, local xpack frontend module under `de-xpack/permission-management`, `agent-browser` for regression verification.

---

## File Structure

### Backend

- Modify: `core/core-backend/src/main/java/io/dataease/substitute/permissions/auth/SubstituleAuthServer.java`
  - Replace the commented placeholder with a real `AuthApi` substitute controller.
- Create: `core/core-backend/src/main/java/io/dataease/substitute/permissions/auth/SubstitutePermissionManagementStore.java`
  - In-memory store for menu/resource permission matrices and view conversions.
- Create: `core/core-backend/src/main/java/io/dataease/substitute/permissions/dataset/SubstituteDatasetPermissionStore.java`
  - In-memory store for row/column permission records keyed by dataset and target.
- Create: `core/core-backend/src/main/java/io/dataease/substitute/permissions/dataset/SubstituteRowPermissionsServer.java`
  - Local implementation of `RowPermissionsApi`.
- Create: `core/core-backend/src/main/java/io/dataease/substitute/permissions/dataset/SubstituteColumnPermissionsServer.java`
  - Local implementation of `ColumnPermissionsApi`.
- Modify: `core/core-backend/src/main/java/io/dataease/substitute/permissions/user/SubstituteUserManagementStore.java`
  - Add helper queries needed by permission substitutes if missing, but keep ownership in the user store.
- Test: `core/core-backend/src/test/java/io/dataease/xpack/component/PermissionConfigurationContractSmokeTest.java`
  - Local contract coverage for auth/menu/resource and row/column substitute flows.

### Frontend

- Create: `de-xpack/permission-management/src/menu/system/permission/index.vue`
  - Real module shell mounted under system settings.
- Create: `de-xpack/permission-management/src/menu/system/permission/store.ts`
  - Page-local state for current view mode, selected subject/resource, dirty state, and save payload building.
- Create: `de-xpack/permission-management/src/menu/system/permission/api.ts`
  - Thin wrapper around `core/core-frontend/src/api/auth.ts` and `core/core-frontend/src/api/dataset.ts`.
- Create: `de-xpack/permission-management/src/menu/system/permission/types.ts`
  - Frontend DTO normalization types for menu/resource matrix and dataset permission editor state.
- Create or rename from preview basis:
  - `de-xpack/permission-management/src/menu/system/permission/PermissionLayout.vue`
  - `de-xpack/permission-management/src/menu/system/permission/MenuPermissionPanel.vue`
  - `de-xpack/permission-management/src/menu/system/permission/ResourcePermissionPanel.vue`
  - `de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue`
  - `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue`
  - `de-xpack/permission-management/src/menu/system/permission/components/RowPermissionDialog.vue`
  - `de-xpack/permission-management/src/menu/system/permission/components/ColumnPermissionDialog.vue`
  - `de-xpack/permission-management/src/menu/system/permission/components/MaskRuleDialog.vue`
- Modify: `de-xpack/permission-management/src/index.ts`
  - Map the real module entry instead of the preview page.
- Modify: `core/core-frontend/src/router/index.ts`
  - Keep preview routes if still useful for design checks, but add the real module route if needed.
- Modify: `core/core-frontend/src/store/modules/permission.ts`
  - Accept the final permission-management route path in `pathValid`.
- Modify: `core/core-frontend/src/permission.ts`
  - Remove prototype-only whitelist bypass once the real module is behind normal auth/menu routing.

### Verification / artifacts

- Reuse: `tmp/calicat-permission-shots/*.png`
- Reuse: `tmp/permission-*.png`
- Create as needed: `tmp/permission-regression-*.png`

---

### Task 1: Freeze Backend Contracts And Add Local Permission Stores

**Files:**
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/auth/api/AuthApi.java`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/dataset/api/RowPermissionsApi.java`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/dataset/api/ColumnPermissionsApi.java`
- Modify: `core/core-backend/src/main/java/io/dataease/substitute/permissions/user/SubstituteUserManagementStore.java`
- Create: `core/core-backend/src/main/java/io/dataease/substitute/permissions/auth/SubstitutePermissionManagementStore.java`
- Create: `core/core-backend/src/main/java/io/dataease/substitute/permissions/dataset/SubstituteDatasetPermissionStore.java`

- [ ] **Step 1: Inventory exact DTOs used by auth, row, and column permission contracts**

Run:

```bash
rg -n "class Busi|class Menu|class DataSetRow|class DataSetColumn|class PermissionVO|class ResourceVO" \
  sdk/api/api-permissions/src/main/java/io/dataease/api/permissions -g '*.java'
```

Expected: concrete DTO/VO file list for menu/resource and dataset permission persistence.

- [ ] **Step 2: Define backend store responsibility boundaries**

Use this split:

```java
// SubstitutePermissionManagementStore
List<ResourceVO> menuResourceTree();
List<ResourceVO> busiResourceTree(String flag);
PermissionVO permissionBySubject(BusiPermissionRequest request);
PermissionVO permissionByResource(BusiPermissionRequest request);
void saveMenu(MenuPerEditor editor);
void saveMenuTarget(MenuTargetPerCreator creator);
void saveBusi(BusiPerEditor editor);
void saveBusiTarget(BusiTargetPerCreator creator);
```

```java
// SubstituteDatasetPermissionStore
IPage<DataSetRowPermissionsTreeDTO> rowPermissions(Long datasetId, int page, int size);
IPage<DataSetColumnPermissionsDTO> columnPermissions(Long datasetId, int page, int size);
void saveRow(DataSetRowPermissionsTreeDTO dto);
void saveColumn(DataSetColumnPermissionsDTO dto);
void deleteRow(DataSetRowPermissionsTreeDTO dto);
void deleteColumn(DataSetColumnPermissionsDTO dto);
List<UserFormVO> whiteListUsers(WhiteListUsersRequest request);
```

- [ ] **Step 3: Seed store data aligned to confirmed static pages**

Seed at minimum:

```java
// menu/resource flags
"panel", "screen", "dataset", "datasource"

// subjects
docs_admin, docs_demo
普通用户, 销售经理, 组织管理员

// dataset
公有云账单集合
fields: 云类型, 账号, 账期, 产品, 官网价, 应付金额
```

Expected: the first real API response should visually match the currently accepted static screenshots closely enough for incremental UI binding.

- [ ] **Step 4: Add backend smoke test skeleton before controller implementation**

Create:

```java
class PermissionConfigurationContractSmokeTest {
    @Test void auth_substitute_exposes_menu_and_busi_resources() {}
    @Test void row_permission_substitute_round_trips_save_and_query() {}
    @Test void column_permission_substitute_round_trips_save_and_query() {}
}
```

Run:

```bash
mvn -pl core/core-backend -Dtest=PermissionConfigurationContractSmokeTest test
```

Expected: FAIL until substitute services are implemented.

---

### Task 2: Implement Substitute Controllers For Menu/Resource/Row/Column Permissions

**Files:**
- Modify: `core/core-backend/src/main/java/io/dataease/substitute/permissions/auth/SubstituleAuthServer.java`
- Create: `core/core-backend/src/main/java/io/dataease/substitute/permissions/dataset/SubstituteRowPermissionsServer.java`
- Create: `core/core-backend/src/main/java/io/dataease/substitute/permissions/dataset/SubstituteColumnPermissionsServer.java`
- Test: `core/core-backend/src/test/java/io/dataease/xpack/component/PermissionConfigurationContractSmokeTest.java`

- [ ] **Step 1: Implement `AuthApi` substitute as a real conditional controller**

Use the same pattern as org/user substitutes:

```java
@Component
@ConditionalOnMissingBean(name = "authServer")
@RestController
@RequestMapping("/auth")
public class SubstituleAuthServer implements AuthApi {
    private final SubstitutePermissionManagementStore store;
}
```

- [ ] **Step 2: Implement menu/resource query and save endpoints**

Minimum methods:

```java
@Override public List<ResourceVO> menuResource() { ... }
@Override public List<ResourceVO> busiResource(String flag) { ... }
@Override public PermissionVO menuPermission(MenuPermissionRequest request) { ... }
@Override public PermissionVO busiPermission(BusiPermissionRequest request) { ... }
@Override public PermissionVO menuTargetPermission(MenuPermissionRequest request) { ... }
@Override public PermissionVO busiTargetPermission(BusiPermissionRequest request) { ... }
@Override public void saveMenuPer(MenuPerEditor editor) { ... }
@Override public void saveMenuTargetPer(MenuTargetPerCreator creator) { ... }
@Override public void saveBusiPer(BusiPerEditor editor) { ... }
@Override public void saveBusiTargetPer(BusiTargetPerCreator creator) { ... }
```

- [ ] **Step 3: Implement row/column substitute controllers with `ConditionalOnMissingBean`**

Use:

```java
@RequestMapping("/dataset/rowPermissions")
public class SubstituteRowPermissionsServer implements RowPermissionsApi { ... }

@RequestMapping("/dataset/columnPermissions")
public class SubstituteColumnPermissionsServer implements ColumnPermissionsApi { ... }
```

Required bridge behavior:
- row permissions reuse `SubstituteUserManagementStore` for whitelist user lookup
- column permissions expose existing field-level saved state in `list()` so `PermissionManage` keeps working

- [ ] **Step 4: Run backend contract test**

Run:

```bash
mvn -pl core/core-backend -Dtest=PermissionConfigurationContractSmokeTest test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/core-backend/src/main/java/io/dataease/substitute/permissions \
        core/core-backend/src/test/java/io/dataease/xpack/component/PermissionConfigurationContractSmokeTest.java
git commit -m "feat: add local permission configuration substitutes"
```

---

### Task 3: Replace Static Preview With Real Frontend Module Shell

**Files:**
- Create: `de-xpack/permission-management/src/menu/system/permission/index.vue`
- Create: `de-xpack/permission-management/src/menu/system/permission/store.ts`
- Create: `de-xpack/permission-management/src/menu/system/permission/api.ts`
- Create: `de-xpack/permission-management/src/menu/system/permission/types.ts`
- Modify: `de-xpack/permission-management/src/index.ts`
- Modify: `core/core-frontend/src/store/modules/permission.ts`
- Modify: `core/core-frontend/src/router/index.ts`
- Modify: `core/core-frontend/src/permission.ts`

- [ ] **Step 1: Introduce a real permission page shell and keep current Calicat-aligned layout**

Shell responsibilities:

```ts
type PermissionViewMode = 'by-user' | 'by-resource'
type PermissionTab = 'menu' | 'resource' | 'row' | 'column'
```

The shell owns:
- current mode
- current tab
- selected subject type/id
- selected resource type/id
- dirty/save status

- [ ] **Step 2: Move the prototype components behind the real module entry**

Replace:

```ts
import PermissionByUserPreview from './menu/system/permission/PermissionByUserPreview.vue'
```

with:

```ts
import PermissionIndex from './menu/system/permission/index.vue'
```

Expected: base64 route key now renders the real permission module, not the preview stub.

- [ ] **Step 3: Keep preview routes only as design aids**

If retained, mark them clearly as prototype-only and isolate them from normal auth:

```ts
path: '/prototype/permission/user'
meta: { hidden: true }
```

But remove any production dependency on them in the real module.

- [ ] **Step 4: Restore normal auth path handling for the real route**

Allow the final module path in:

```ts
path?.startsWith('/sys-setting/permission')
```

and remove prototype-only whitelist bypass once real route is active.

- [ ] **Step 5: Run local frontend boot check**

Run:

```bash
./dataease-web.sh
```

Expected: Vite starts and the permission module loads under the real module route without falling back to login or workbench.

---

### Task 4: Bind Menu And Resource Permission Pages To Real Auth APIs

**Files:**
- Create: `de-xpack/permission-management/src/menu/system/permission/MenuPermissionPanel.vue`
- Create: `de-xpack/permission-management/src/menu/system/permission/ResourcePermissionPanel.vue`
- Create: `de-xpack/permission-management/src/menu/system/permission/api.ts`
- Reference: `core/core-frontend/src/api/auth.ts`

- [ ] **Step 1: Add frontend API wrappers with normalized response mapping**

Use:

```ts
import {
  queryUserApi,
  queryRoleApi,
  menuTreeApi,
  resourceTreeApi,
  menuPerApi,
  resourcePerApi,
  menuTargetPerApi,
  resourceTargetPerApi,
  menuPerSaveApi,
  busiPerSaveApi,
  menuTargetPerSaveApi,
  busiTargetPerSaveApi
} from '@/api/auth'
```

- [ ] **Step 2: Implement “按用户配置” menu/resource read flow**

Read sequence:

```ts
loadSubjects() -> selectSubject() -> loadTabResources()
```

For resource matrix:

```ts
const permission = await resourcePerApi({
  authTargetIds: [selectedId],
  authTargetType: selectedType,
  busiFlag: selectedFlag
})
```

- [ ] **Step 3: Implement “按资源配置” menu/resource read flow**

Read sequence:

```ts
loadResourceTree() -> selectResourceNode() -> loadTargetPermissions()
```

Save sequence:

```ts
await busiTargetPerSaveApi(payload)
await resourceTargetPerApi(query)
```

- [ ] **Step 4: Add explicit dirty-state and leave-confirm handling**

Guard at minimum:
- switching mode
- switching tab
- switching selected subject
- switching selected resource

- [ ] **Step 5: Verify both views remain visually aligned with accepted screenshots**

Run:

```bash
agent-browser close --all
agent-browser open http://localhost:8080/#/sys-setting/permission
```

Capture:
- `tmp/permission-regression-menu-by-user.png`
- `tmp/permission-regression-resource-by-resource.png`

---

### Task 5: Bind Row And Column Permission Pages To Existing Dataset Permission APIs

**Files:**
- Create: `de-xpack/permission-management/src/menu/system/permission/RowPermissionPanel.vue`
- Create: `de-xpack/permission-management/src/menu/system/permission/ColumnPermissionPanel.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/RowPermissionDialog.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/ColumnPermissionDialog.vue`
- Modify: `de-xpack/permission-management/src/menu/system/permission/components/MaskRuleDialog.vue`
- Reference: `core/core-frontend/src/api/dataset.ts`

- [ ] **Step 1: Add dataset permission API wrappers**

Wrap existing calls:

```ts
listRowPermissions(datasetId, page, size)
listColumnPermissions(datasetId, page, size)
saveRowPermission(data)
saveColumnPermission(data)
deleteRowPermission(data)
deleteColumnPermission(data)
whiteListUsersForPermissions(data)
listFieldsWithPermissions(datasetId)
```

- [ ] **Step 2: Bind row permission list and dialog**

Load:

```ts
GET /dataset/rowPermissions/pager/{datasetId}/{page}/{size}
GET /dataset/rowPermissions/authObjs/{datasetId}/{type}
```

Save/delete:

```ts
POST /dataset/rowPermissions/save
POST /dataset/rowPermissions/delete
```

Required UI behaviors:
- role/user/sysVar type switch
- whitelist lookup
- save explicit
- delete existing rule

- [ ] **Step 3: Bind column permission list and dialog**

Load:

```ts
GET /dataset/columnPermissions/pager/{datasetId}/{page}/{size}
GET /datasetField/listWithPermissions/{datasetId}
```

Save/delete:

```ts
POST /dataset/columnPermissions/save
POST /dataset/columnPermissions/delete
```

Required UI behaviors:
- field-level strategy toggle
- desensitization preset/custom rule
- preview rendering

- [ ] **Step 4: Keep dialogs URL-drivable for regression**

Retain support for query-based preview/debug states such as:

```ts
?dialog=role
?dialog=sysVar
?dialog=column&mask=1
```

This is useful for deterministic browser regression and does not block real interaction.

- [ ] **Step 5: Run browser regression for dataset permission pages**

Run:

```bash
agent-browser close --all
```

Capture:
- `tmp/permission-regression-row-page.png`
- `tmp/permission-regression-row-dialog-role.png`
- `tmp/permission-regression-row-dialog-sysvar.png`
- `tmp/permission-regression-column-page.png`
- `tmp/permission-regression-column-dialog.png`
- `tmp/permission-regression-mask-dialog.png`

---

### Task 6: Mount Into System Settings And Complete End-To-End Regression

**Files:**
- Modify: final system-settings route/menu config files discovered during Task 3 implementation
- Modify: `core/core-frontend/src/store/modules/permission.ts`
- Modify: `core/core-frontend/src/permission.ts`
- Reuse browser artifacts under `tmp/`

- [ ] **Step 1: Mount permission management under system settings as a sibling menu**

Final sibling structure must remain:
- 通用配置
- 字体管理
- 用户管理
- 组织管理
- 权限配置

- [ ] **Step 2: Remove prototype-only routing hacks no longer needed**

Clean up:
- preview-route auth bypasses that should not affect production behavior
- any temporary redirects used only for static screenshot work

- [ ] **Step 3: Run full frontend restart and targeted regression**

Run:

```bash
./dataease-web.sh
agent-browser close --all
```

Verify:
- system settings menu opens correctly
- permission module opens without redirect
- user/org/query-config menus still work

- [ ] **Step 4: Capture final acceptance screenshots in `tmp/`**

At minimum:
- `tmp/permission-final-user-view.png`
- `tmp/permission-final-resource-view.png`
- `tmp/permission-final-row-dialog.png`
- `tmp/permission-final-column-dialog.png`

- [ ] **Step 5: Commit**

```bash
git add de-xpack/permission-management \
        core/core-frontend/src/router/index.ts \
        core/core-frontend/src/store/modules/permission.ts \
        core/core-frontend/src/permission.ts \
        core/core-backend/src/main/java/io/dataease/substitute/permissions \
        core/core-backend/src/test/java/io/dataease/xpack/component/PermissionConfigurationContractSmokeTest.java \
        docs/superpowers/plans/2026-04-22-permission-configuration-implementation-plan.md
git commit -m "feat: implement permission configuration module"
```

---

## Self-Review

### Spec coverage

- 权限配置双视角：covered by Task 3 and Task 4
- 菜单/资源权限：covered by Task 2 and Task 4
- 行权限：covered by Task 2 and Task 5
- 列权限与脱敏弹窗：covered by Task 2 and Task 5
- 系统设置挂载与回归：covered by Task 6

### Placeholder scan

- No `TODO` / `TBD`
- All tasks include exact file paths
- Verification commands are explicit

### Type consistency

- Backend contracts use `AuthApi`, `RowPermissionsApi`, `ColumnPermissionsApi`
- Frontend read/write paths align with `auth.ts` and `dataset.ts`
- Preview/debug query params remain optional and isolated to frontend regression support

