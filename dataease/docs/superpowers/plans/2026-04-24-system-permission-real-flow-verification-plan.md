# System Permission Real Flow Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the real end-to-end usage flow across system setting modules: user management, organization management, permission configuration, and row/column permission configuration.

**Architecture:** This is a verification plan, not a new implementation plan. It validates the existing StarBI system-setting shell, X-Pack modules, real API-backed lists, modal interactions, menu routing, and dataset-scoped row/column permission flows through `agent-browser` screenshots and page/network state checks.

**Tech Stack:** Vue 3, Vite dev server, DataEase X-Pack modules, StarBI system-setting shell, `agent-browser`, existing `dataease-web.sh` restart script.

---

## Preconditions

- Run from `/Users/chenliyong/AI/github/StarBI/dataease`.
- Because this verification touches DataEase frontend code only, run `./dataease-web.sh` before browser verification.
- Before browser verification, run `agent-browser close --all`.
- Store every verification screenshot under `tmp/`.
- Use `/sys-setting/user`, `/sys-setting/org`, `/sys-setting/permission`, and `/sys-setting/row-column-permission` as the canonical module entries.

## Verification Matrix

### Task 1: System Setting Navigation Shell

**Files touched:** none.

- [ ] Open `/sys-setting/user` and verify the StarBI header remains visible.
- [ ] Verify left menu contains `系统参数`, `字体管理`, `用户管理`, `组织管理`, `权限配置`, `问数配置`, `行列权限配置` as sibling menus.
- [ ] Click `组织管理`, `权限配置`, `行列权限配置`, then `用户管理`; verify each click stays inside system setting shell and does not jump to workbench.
- [ ] Save screenshot: `tmp/real-flow-00-system-menu.png`.

### Task 2: Organization Management Real Flow

**Files touched:** none.

- [ ] Open `/sys-setting/org`.
- [ ] Verify organization list loads real rows or a real empty state.
- [ ] Open `添加组织` dialog.
- [ ] Fill a test organization name `E2E组织-0424`.
- [ ] Verify parent organization selector is available and allows empty parent for first-level organization.
- [ ] Save screenshot before submit: `tmp/real-flow-01-org-add-dialog.png`.
- [ ] If submit is safe in the current environment, click `确定` and verify the list refreshes or backend returns a visible validation/error message.
- [ ] Open edit dialog on an existing or newly created org row and verify only organization name is editable.
- [ ] Save screenshot: `tmp/real-flow-02-org-list-edit.png`.

### Task 3: User Management Real Flow

**Files touched:** none.

- [ ] Open `/sys-setting/user`.
- [ ] Verify user list loads real rows or a real empty state.
- [ ] Verify the page can switch between `用户管理` and `角色管理` tabs without leaving system setting shell.
- [ ] Open `新增用户` dialog.
- [ ] Fill test fields with `E2E用户0424`, account `e2e_user_0424`, and select an available role/org if the controls expose options.
- [ ] Save screenshot before submit: `tmp/real-flow-03-user-add-dialog.png`.
- [ ] Verify import dialog opens and template download action is present.
- [ ] Save screenshot: `tmp/real-flow-04-user-import-dialog.png`.
- [ ] In role tab, select an available role and verify member list loads.
- [ ] Open `创建自定义角色` dialog if available.
- [ ] Save screenshot: `tmp/real-flow-05-role-create-dialog.png`.

### Task 4: Permission Configuration Real Flow

**Files touched:** none.

- [ ] Open `/sys-setting/permission`.
- [ ] Verify `按用户配置` and `按资源配置` sheets are available.
- [ ] On `按用户配置`, verify user/resource or menu authorization panel loads.
- [ ] Switch to `按资源配置`, verify resource/menu authorization panel loads.
- [ ] Verify module stays under StarBI system setting shell without DataEase duplicate page header.
- [ ] Save screenshots: `tmp/real-flow-06-permission-user.png`, `tmp/real-flow-07-permission-resource.png`.

### Task 5: Row/Column Permission Real Flow

**Files touched:** none.

- [ ] Open `/sys-setting/row-column-permission`.
- [ ] Verify dataset tree panel loads from existing dataset/resource services.
- [ ] Select the first available dataset if present.
- [ ] Verify tabs `数据预览`, `数据结构`, `行权限`, `列权限` are siblings.
- [ ] Open `数据预览` and verify either data table or real empty/loading state.
- [ ] Open `数据结构` and verify field list/table or real empty/loading state.
- [ ] Open `行权限`, open add-row-permission dialog, and verify role/system-variable rule modes are available.
- [ ] Open `列权限`, open add-column-permission dialog, and verify field rule configuration and masking dialog are available.
- [ ] Save screenshots: `tmp/real-flow-08-row-column-preview.png`, `tmp/real-flow-09-row-permission-dialog.png`, `tmp/real-flow-10-column-permission-dialog.png`.

## Completion Evidence

- Frontend restart log must show Vite ready.
- Browser must be freshly closed with `agent-browser close --all` before verification.
- Each module must have at least one screenshot under `tmp/`.
- Final report must list passed flows, blocked flows, and exact screenshot paths.
