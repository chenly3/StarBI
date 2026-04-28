# Organization Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `组织管理中心 > 组织管理` module for the DataEase 二开项目, matching the approved Calicat prototype and the frozen `v2` organization-management PRD.

**Architecture:** Deliver the module in four layers. First freeze the frontend carrier inside the current system-settings shell because the repo currently has org APIs and plugin loaders but no local org-management page. Then implement a substitute backend store and server endpoints that enforce the frozen org-tree rules. Finally deliver the tree-list frontend, dialogs, and browser regression verification in the same style as the approved user-management flow.

**Tech Stack:** Vue 3, Element Plus Secondary, system-settings layout shell, XPack plugin loader, Spring Boot substitute permissions services, browser automation via `agent-browser`.

---

## 1. Frozen Inputs

- Approved spec:
  - `docs/superpowers/specs/2026-04-20-organization-management-prd-design.md`
- Official baseline:
  - `https://dataease.cn/docs/v2/xpack/sys_management_organization/`
- Calicat file:
  - `2044998365299601408`
- Calicat nodes:
  - list page: `3a3d7c64-8933-40f1-936f-8b6ba2aa0126`
  - add dialog: `bcce8218-6567-4ed3-aa8e-425d10220d5b`
  - edit dialog: `7cf5a609-b61b-483c-8bf4-0f8d25cc3396`
  - delete dialog: `733a4d9a-3093-41bf-8fdf-eb5dba4d09dc`
- Current repo contracts:
  - `core/core-frontend/src/api/org.ts`
  - `core/core-backend/src/main/java/io/dataease/substitute/permissions/org/SubstituleOrgServer.java`
  - `core/core-frontend/src/components/plugin/src/index.vue`
  - `core/core-frontend/src/layout/components/Menu.vue`

## 2. File Structure Plan

### Existing files to modify

- `core/core-frontend/src/api/org.ts`
  - Keep as the frontend contract surface for tree query, create, edit, resource checks, and delete.
- `core/core-frontend/src/components/plugin/src/index.vue`
  - If the module continues using local XPack mapping, add local org-management loader support similar to user management.
- `core/core-frontend/src/layout/components/Menu.vue`
  - Add `org` into system-settings menu whitelist so the module appears beside parameter/font/user.
- `core/core-frontend/src/locales/zh-CN.ts`
  - Reconcile org-management labels and validation copy with the approved spec.
- `core/core-backend/src/main/java/io/dataease/substitute/permissions/org/SubstituleOrgServer.java`
  - Expand from the current `mounted` fallback to full page-tree/create/edit/delete/resource-check APIs.

### New backend files expected

- `core/core-backend/src/main/java/io/dataease/substitute/permissions/org/SubstituteOrgManagementStore.java`
  - In-memory org tree, root-org semantics, duplicate-name validation, child/user/resource delete guards.
- `core/core-backend/src/main/java/io/dataease/substitute/permissions/org/vo/...`
  - Only if current SDK request/response objects are insufficient for substitute responses.

### New frontend files expected if module lands locally in this repo

- `core/core-frontend/src/views/system/org/index.vue`
  - Main org-management page container.
- `core/core-frontend/src/views/system/org/components/OrgTreePanel.vue`
  - Left tree panel and ancestor expansion/highlight logic.
- `core/core-frontend/src/views/system/org/components/OrgListTable.vue`
  - Right table, operations, empty states.
- `core/core-frontend/src/views/system/org/components/OrgFormDialog.vue`
  - Shared add dialog with optional/locked parent-org behavior.
- `core/core-frontend/src/views/system/org/components/OrgEditDialog.vue`
  - Name-only edit dialog matching the Calicat edit modal.
- `core/core-frontend/src/views/system/org/components/OrgDeleteDialog.vue`
  - Confirm-delete dialog for deletable rows.
- `core/core-frontend/src/views/system/org/components/org-management.css` or local `<style>` blocks
  - Shared style tokens for prototype fidelity.

### Verification artifacts

- `/tmp/dataease-om-regression/`
  - Browser screenshots and downloaded evidence for regression rounds.

## 3. Execution Principles

- Freeze requirements before coding. Do not expand beyond the approved spec.
- Match the approved Calicat prototype 1:1 for visible page structure first, then attach behavior.
- Keep org management scoped to one module. Do not bundle permission-config or user-management changes except where required for menu and shared shell integration.
- Before every browser automation round:
  - run `agent-browser close --all`
- If frontend code changes:
  - run `./dataease-web.sh`
- If backend code changes:
  - run `./dataease-app.sh`

## 4. Task Breakdown

### Task 1: Freeze Frontend Carrier

**Files:**
- Inspect: `core/core-frontend/src/components/plugin/src/index.vue`
- Inspect: `core/core-frontend/src/layout/components/Menu.vue`
- Inspect: current user-management mount path and jsname mapping
- Modify only if needed after decision:
  - `core/core-frontend/src/components/plugin/src/index.vue`
  - `core/core-frontend/src/layout/components/Menu.vue`

- [ ] Step 1: Confirm whether org management follows the same carrier as shipped user management.
- [ ] Step 2: If user management is still delivered via local XPack mapping, define the org-management jsname and loading branch in `core/core-frontend/src/components/plugin/src/index.vue`.
- [ ] Step 3: Add `org` into the system-settings menu whitelist in `core/core-frontend/src/layout/components/Menu.vue`.
- [ ] Step 4: Verify the system-settings shell can navigate to the future org path without breaking parameter/font/user.
- [ ] Step 5: Commit only the carrier-shell changes.

**Acceptance:**
- System settings can expose `组织管理` as a first-level sibling menu.
- The chosen carrier is explicit in code and no longer ambiguous.

### Task 2: Build Substitute Backend Org Store

**Files:**
- Create: `core/core-backend/src/main/java/io/dataease/substitute/permissions/org/SubstituteOrgManagementStore.java`
- Modify: `core/core-backend/src/main/java/io/dataease/substitute/permissions/org/SubstituleOrgServer.java`
- Reference: `core/core-backend/src/main/java/io/dataease/substitute/permissions/user/SubstituteUserManagementStore.java`

- [ ] Step 1: Define the in-memory org model: hidden fixed root org, visible first-level orgs, child-count, create-time, creator, current-scope filtering.
- [ ] Step 2: Seed deterministic demo data covering:
  - multiple first-level orgs
  - nested orgs
  - at least one org blocked by children
  - at least one org blocked by users
  - at least one org blocked by resources
- [ ] Step 3: Implement tree query behavior that returns no root node to the page and exposes first-level orgs as top-level visible nodes.
- [ ] Step 4: Implement create behavior with:
  - nullable parent for first-level orgs
  - locked parent path for “add sub-organization”
  - duplicate-name check within same parent
  - name validation: required, 1-20, Chinese/English/numeric only
- [ ] Step 5: Implement edit behavior with name-only update and same-parent duplicate validation.
- [ ] Step 6: Implement delete pre-check behavior that distinguishes:
  - has child orgs
  - has users
  - has resources
- [ ] Step 7: Implement delete behavior so only fully deletable orgs reach the actual delete flow.
- [ ] Step 8: Run backend compile verification for the touched package and restart `./dataease-app.sh`.
- [ ] Step 9: Commit backend org-store/server changes.

**Acceptance:**
- Backend can serve the approved page states without exposing root org in page responses.
- Delete guards return distinct reasons for child/user/resource blockers.

### Task 3: Scaffold Org Management Page

**Files:**
- Create: `core/core-frontend/src/views/system/org/index.vue`
- Create: `core/core-frontend/src/views/system/org/components/OrgTreePanel.vue`
- Create: `core/core-frontend/src/views/system/org/components/OrgListTable.vue`
- Modify: any route/carrier entry file chosen in Task 1
- Reference: approved prototype screenshots and user-management shell behavior

- [ ] Step 1: Create the page shell matching the prototype: left tree, right title/action/search/list layout.
- [ ] Step 2: Implement initial page state:
  - no selected tree node
  - right side shows all first-level orgs
- [ ] Step 3: Implement tree-node selection so the right table switches to direct children of the selected node only.
- [ ] Step 4: Implement the search flow:
  - global org-name search
  - expand ancestors
  - highlight match
  - right table shows direct children of the matched org
- [ ] Step 5: Implement empty states for:
  - no first-level orgs
  - selected node has no direct children
  - search returns no results
- [ ] Step 6: Run `./dataease-web.sh` and verify the page shell renders inside system settings.
- [ ] Step 7: Commit page scaffold.

**Acceptance:**
- The org-management page visually matches the Calicat list-page structure.
- Initial state and tree-table linkage follow the approved spec.

### Task 4: Implement Add Organization Flow

**Files:**
- Create or modify: `core/core-frontend/src/views/system/org/components/OrgFormDialog.vue`
- Modify: `core/core-frontend/src/views/system/org/index.vue`
- Modify: `core/core-frontend/src/api/org.ts` only if request payload helpers are needed

- [ ] Step 1: Implement the shared add dialog to match the approved Calicat add modal.
- [ ] Step 2: Support page-level add with editable nullable `上级组织`.
- [ ] Step 3: Support row-level “添加子组织” with parent org prefilled and locked.
- [ ] Step 4: Implement frontend validation matching the spec before submit.
- [ ] Step 5: On success, refresh both tree and list while preserving current page context.
- [ ] Step 6: Browser-verify:
  - create first-level org
  - create child org from row action
- [ ] Step 7: Commit add-flow changes.

**Acceptance:**
- Add dialog supports both top-level and child creation without introducing a new modal type.
- Parent locking only applies to row-level child creation.

### Task 5: Implement Edit Organization Flow

**Files:**
- Create or modify: `core/core-frontend/src/views/system/org/components/OrgEditDialog.vue`
- Modify: `core/core-frontend/src/views/system/org/components/OrgListTable.vue`
- Modify: backend files from Task 2 if edit response needs refinement

- [ ] Step 1: Implement the name-only edit dialog to match the approved Calicat edit modal.
- [ ] Step 2: Ensure no parent-org field appears in edit state.
- [ ] Step 3: Reuse the same name validation and duplicate-name guard.
- [ ] Step 4: Refresh tree and table labels after successful rename without changing the current browsing context.
- [ ] Step 5: Browser-verify edit success and validation failure.
- [ ] Step 6: Commit edit-flow changes.

**Acceptance:**
- Edit flow only changes org name and never implies move/re-parent behavior.

### Task 6: Implement Delete Guard and Delete Confirm Flow

**Files:**
- Create or modify: `core/core-frontend/src/views/system/org/components/OrgDeleteDialog.vue`
- Modify: `core/core-frontend/src/views/system/org/components/OrgListTable.vue`
- Modify: backend files from Task 2 as needed for blocker reason mapping

- [ ] Step 1: Keep delete actions clickable for every row.
- [ ] Step 2: When backend returns deletable, show the approved delete-confirm modal.
- [ ] Step 3: When backend returns blocked, show reason-specific feedback for:
  - child orgs
  - users
  - resources
- [ ] Step 4: Ensure the blocked flow does not enter actual delete confirmation.
- [ ] Step 5: Ensure successful delete refreshes the tree and list correctly.
- [ ] Step 6: Browser-verify:
  - successful delete
  - blocked by child orgs
  - blocked by users
  - blocked by resources
- [ ] Step 7: Commit delete-flow changes.

**Acceptance:**
- Delete behavior exactly matches the frozen rule set: no forced delete, no resource migration branch.

### Task 7: Permission Scope and Org-Admin Visibility

**Files:**
- Modify: backend org store/server scope logic
- Modify: frontend page initialization if scope labels or current-org context need rendering
- Reference: current user-management org-context behavior

- [ ] Step 1: Implement org-admin visibility filtering so only the current org and descendants appear.
- [ ] Step 2: Limit search results to the same scope.
- [ ] Step 3: Ensure add/edit/delete actions reject out-of-scope targets on the backend.
- [ ] Step 4: Add frontend no-permission feedback for rejected actions where needed.
- [ ] Step 5: Browser-verify the org-admin restricted scenario if a test account/switch path exists in the current substitute setup; otherwise record as backend-only verified.
- [ ] Step 6: Commit scope-control changes.

**Acceptance:**
- Org-admin users cannot see or mutate branches outside their scope.

### Task 8: Regression, Polish, and Evidence Capture

**Files:**
- Modify: touched frontend/backend files only if regressions are found
- Capture: `/tmp/dataease-om-regression/`

- [ ] Step 1: Restart whichever sides changed:
  - `./dataease-app.sh`
  - `./dataease-web.sh`
- [ ] Step 2: Run `agent-browser close --all`.
- [ ] Step 3: Execute end-to-end browser regression for:
  - page initial state
  - tree selection
  - search hit and no-hit
  - add first-level org
  - add child org
  - edit org
  - delete success
  - delete blocked by child/user/resource
- [ ] Step 4: Save screenshots for list page and each modal.
- [ ] Step 5: Update docs only if implementation forced a requirement clarification.
- [ ] Step 6: Commit final regression-safe state.

**Acceptance:**
- All visible flows are browser-verified with fresh evidence.

## 5. Risks and Mitigations

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Frontend carrier ambiguity | Repo has org APIs and plugin shell, but no local org page | Freeze carrier first before any UI coding |
| Root-org semantics conflict | Repo locales mention default root org while approved page hides it | Keep root only in backend model, never render it in page tree |
| Delete reason mapping drift | Existing locale copy suggests older resource-migration branches | Follow the frozen spec and remove non-scope branches from UI |
| Scope verification gap | Substitute login may expose only admin by default | Add deterministic backend scope logic and note any unverified UI restriction cases explicitly |

## 6. Verification Commands

- Backend compile spot-check:
  - `mvn -pl core/core-backend -DskipTests compile`
- Frontend dev restart:
  - `./dataease-web.sh`
- Backend dev restart:
  - `./dataease-app.sh`
- Browser session reset:
  - `agent-browser close --all`

## 7. Spec Coverage Checklist

- [x] Left tree + right list page structure
- [x] Initial state without selected node
- [x] First-level org list default view
- [x] Search and ancestor expansion
- [x] Add org dialog with nullable parent
- [x] Add sub-org with locked parent
- [x] Edit name only
- [x] Delete confirm for deletable orgs
- [x] Delete blocked by child/user/resource
- [x] Name validation and duplicate-name rule
- [x] Root org hidden from page
- [x] Org-admin scoped visibility

## 8. Done Condition

- The approved spec is fully implemented without adding new prototype pages.
- System settings exposes org management as a first-level sibling menu beside parameter/font/user.
- Backend substitute responses and frontend interaction both honor the frozen org rules.
- Browser evidence exists for all core flows.
