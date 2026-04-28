# Organization Center X-Pack Analysis Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a stable product-analysis package for DataEase `X-Pack > 组织管理中心`, including a 7-module overview, a detailed `用户管理` analysis, and explicit Calicat prototype alignment points.

**Architecture:** The work is documentation-first, not code-first. Use three fact sources in each task: official X-Pack documentation as the replication baseline, current repo APIs/routes/locales as the feasibility baseline, and the Calicat prototype brief as the prototype baseline. Keep module overview and detailed user-management analysis in separate documents so later modules can reuse the same template without rewriting the overview.

**Tech Stack:** Markdown, shell validation commands, DataEase documentation, frontend API files under `core/core-frontend/src/api`, backend API contracts under `sdk/api`.

---

### Task 1: Establish the analysis source inventory

**Files:**
- Create: `docs/superpowers/specs/2026-04-17-org-center-source-inventory.md`
- Modify: `docs/superpowers/specs/2026-04-17-org-center-xpack-analysis-design.md`
- Reference: `docs/superpowers/specs/2026-04-17-org-center-calicat-prototype-brief.md`
- Reference: `core/core-frontend/src/api/user.ts`
- Reference: `core/core-frontend/src/api/org.ts`
- Reference: `core/core-frontend/src/api/auth.ts`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/api/UserApi.java`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/org/api/OrgApi.java`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/role/api/RoleApi.java`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/auth/api/AuthApi.java`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/dataset/api/RowPermissionsApi.java`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/dataset/api/ColumnPermissionsApi.java`

- [ ] **Step 1: Create the source inventory document skeleton**

```md
# 组织管理中心分析资料清单

## 1. 官方文档基线

| 模块 | 文档地址 | 小节 |
| --- | --- | --- |
| 用户管理 | https://dataease.cn/docs/v2/xpack/user_management_user/ | 用户列表、添加用户、批量导入用户、编辑用户、重置密码、删除用户、查询用户、角色列表、添加用户、移除用户、创建自定义角色 |
| 组织管理 | https://dataease.cn/docs/v2/xpack/sys_management_organization/ | 查询组织、新建组织、修改组织、删除组织 |
| 权限配置 | https://dataease.cn/docs/v2/xpack/sys_management_permission/ | 权限说明、菜单权限、资源权限、行权限、列权限 |
| 定时报告 | https://dataease.cn/docs/v2/xpack/sys_management_report/ | 任务列表、新增任务、执行记录 |
| 同步管理 | https://dataease.cn/docs/v2/xpack/data_synchronization_management/ | 概述、页面介绍、添加任务 |
| 血缘分析 | https://dataease.cn/docs/v2/xpack/blood_relationship/ | 血缘关系 |
| 告警管理 | https://dataease.cn/docs/v2/xpack/alarm_management/ | 概述、告警管理、阈值告警设置 |

## 2. 当前仓库可复用接口

| 能力域 | 前端 API 文件 | 后端接口文件 | 备注 |
| --- | --- | --- | --- |
| 用户管理 | `core/core-frontend/src/api/user.ts` | `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/api/UserApi.java` | 已有用户分页、创建、编辑、导入、启停、重置密码等接口 |
| 组织管理 | `core/core-frontend/src/api/org.ts` | `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/org/api/OrgApi.java` | 已有组织树、创建、编辑、删除接口 |
| 权限配置 | `core/core-frontend/src/api/auth.ts` | `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/auth/api/AuthApi.java` | 已有菜单权限和资源权限接口 |
| 角色管理 | `core/core-frontend/src/api/user.ts` | `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/role/api/RoleApi.java` | 已有角色创建、编辑、绑定用户接口 |
| 行列权限 | 无统一前端页落点，需补定位 | `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/dataset/api/RowPermissionsApi.java`、`sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/dataset/api/ColumnPermissionsApi.java` | 后端能力已存在，前端页面需确认 |

## 3. 原型输入

- `docs/superpowers/specs/2026-04-17-org-center-calicat-prototype-brief.md`

## 4. 结论

- 用户管理、组织管理、权限配置不是纯从零建设，应先做现状盘点，再做复刻边界分析。
- 本轮分析文档必须标出“已有能力 / 缺失能力 / 原型待确认能力”三种状态。
```

- [ ] **Step 2: Run file review commands to verify all referenced paths exist**

Run:

```bash
test -f docs/superpowers/specs/2026-04-17-org-center-calicat-prototype-brief.md
test -f core/core-frontend/src/api/user.ts
test -f core/core-frontend/src/api/org.ts
test -f core/core-frontend/src/api/auth.ts
test -f sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/api/UserApi.java
test -f sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/org/api/OrgApi.java
test -f sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/role/api/RoleApi.java
test -f sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/auth/api/AuthApi.java
test -f sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/dataset/api/RowPermissionsApi.java
test -f sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/dataset/api/ColumnPermissionsApi.java
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Update the design spec to reference the source inventory as a required prerequisite**

```md
## 3.3 执行前置资料

在进入模块总览和详细分析前，需先完成 `docs/superpowers/specs/2026-04-17-org-center-source-inventory.md`，用于统一记录：

- 官方文档基线
- 当前仓库接口与页面落点
- Calicat 原型输入
- 已有能力、缺失能力、待确认能力三类状态
```

- [ ] **Step 4: Review the rendered inventory document**

Run:

```bash
sed -n '1,220p' docs/superpowers/specs/2026-04-17-org-center-source-inventory.md
```

Expected: the document contains the three sections `官方文档基线`、`当前仓库可复用接口`、`原型输入`.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-17-org-center-source-inventory.md docs/superpowers/specs/2026-04-17-org-center-xpack-analysis-design.md
git commit -m "docs: add org center source inventory"
```

### Task 2: Write the 7-module overview document

**Files:**
- Create: `docs/superpowers/specs/2026-04-17-org-center-module-overview.md`
- Reference: `docs/superpowers/specs/2026-04-17-org-center-source-inventory.md`
- Reference: `docs/superpowers/specs/2026-04-17-org-center-xpack-analysis-design.md`
- Reference: `docs/superpowers/specs/2026-04-17-org-center-calicat-prototype-brief.md`

- [ ] **Step 1: Create the module overview document skeleton**

```md
# 组织管理中心模块总览

## 1. 文档说明

- 分析范围：用户管理、组织管理、权限配置、定时报告、同步管理、血缘分析、告警管理
- 分析视角：官方复刻基线 + 二开适配建议
- 现状标记：已有能力 / 缺失能力 / 待原型确认

## 2. 模块总览矩阵

| 模块 | 模块定位 | 主要角色 | 当前现状 | 优先级 |
| --- | --- | --- | --- | --- |
| 用户管理 | 组织内用户和角色关系管理中心 | 系统管理员、组织管理员 | 部分已有 | P0 |
| 组织管理 | 组织层级与隔离边界管理 | 系统管理员、组织管理员 | 部分已有 | P0 |
| 权限配置 | 菜单、资源、行列权限管理 | 系统管理员、组织管理员 | 部分已有 | P0 |
| 定时报告 | 面向干系人的定时通知能力 | 系统管理员、组织管理员、接收人 | 部分已有 | P1 |
| 同步管理 | 数据同步和任务运维能力 | 系统管理员、组织管理员 | 部分已有 | P1 |
| 血缘分析 | 资源依赖关系分析能力 | 系统管理员、组织管理员 | 待确认 | P2 |
| 告警管理 | 图表阈值告警与通知能力 | 系统管理员、组织管理员 | 部分已有 | P1 |

## 3. 用户管理

### 3.1 模块定位
### 3.2 目标用户
### 3.3 核心能力
### 3.4 关键业务规则
### 3.5 页面/交互对象
### 3.6 当前现状
### 3.7 复刻基线
### 3.8 适配建议
### 3.9 模块级产品执行计划

## 4. 组织管理

### 4.1 模块定位
### 4.2 目标用户
### 4.3 核心能力
### 4.4 关键业务规则
### 4.5 页面/交互对象
### 4.6 当前现状
### 4.7 复刻基线
### 4.8 适配建议
### 4.9 模块级产品执行计划

## 5. 权限配置

### 5.1 模块定位
### 5.2 目标用户
### 5.3 核心能力
### 5.4 关键业务规则
### 5.5 页面/交互对象
### 5.6 当前现状
### 5.7 复刻基线
### 5.8 适配建议
### 5.9 模块级产品执行计划

## 6. 定时报告

### 6.1 模块定位
### 6.2 目标用户
### 6.3 核心能力
### 6.4 关键业务规则
### 6.5 页面/交互对象
### 6.6 当前现状
### 6.7 复刻基线
### 6.8 适配建议
### 6.9 模块级产品执行计划

## 7. 同步管理

### 7.1 模块定位
### 7.2 目标用户
### 7.3 核心能力
### 7.4 关键业务规则
### 7.5 页面/交互对象
### 7.6 当前现状
### 7.7 复刻基线
### 7.8 适配建议
### 7.9 模块级产品执行计划

## 8. 血缘分析

### 8.1 模块定位
### 8.2 目标用户
### 8.3 核心能力
### 8.4 关键业务规则
### 8.5 页面/交互对象
### 8.6 当前现状
### 8.7 复刻基线
### 8.8 适配建议
### 8.9 模块级产品执行计划

## 9. 告警管理

### 9.1 模块定位
### 9.2 目标用户
### 9.3 核心能力
### 9.4 关键业务规则
### 9.5 页面/交互对象
### 9.6 当前现状
### 9.7 复刻基线
### 9.8 适配建议
### 9.9 模块级产品执行计划
```

- [ ] **Step 2: Fill the overview matrix using only confirmed facts from docs and repo**

Run:

```bash
sed -n '1,220p' docs/superpowers/specs/2026-04-17-org-center-source-inventory.md
rg -n "org_center|user_management|org_title|permission_configuration|title: 'Scheduled Report'|title: '同步管理'|grid_title: '告警管理'|analysis: '血缘分析'" core/core-frontend/src/locales/zh-CN.ts core/core-frontend/src/locales/en.ts -S
```

Expected: each module in the matrix is backed by either official docs, repo locales, or concrete APIs.

- [ ] **Step 3: Write each module’s `当前现状` using the following status vocabulary only**

```md
### X.6 当前现状

- 已有能力：列出当前仓库已存在的 API、语言包、入口痕迹
- 缺失能力：列出当前仓库未发现明确页面或交互落点的能力
- 待确认能力：列出需要 Calicat 原型或后续代码扫描进一步确认的点
```

- [ ] **Step 4: Validate the overview document structure**

Run:

```bash
rg -n "^## " docs/superpowers/specs/2026-04-17-org-center-module-overview.md
rg -n "^### [0-9]+\\.[0-9]+ " docs/superpowers/specs/2026-04-17-org-center-module-overview.md | sed -n '1,120p'
```

Expected: sections `## 3` through `## 9` all exist and each module includes subsections `.1` through `.9`.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-17-org-center-module-overview.md
git commit -m "docs: add org center module overview"
```

### Task 3: Write the detailed user-management analysis

**Files:**
- Create: `docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md`
- Reference: `docs/superpowers/specs/2026-04-17-org-center-module-overview.md`
- Reference: `core/core-frontend/src/api/user.ts`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/api/UserApi.java`
- Reference: `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/role/api/RoleApi.java`
- Reference: `docs/superpowers/specs/2026-04-17-org-center-calicat-prototype-brief.md`

- [ ] **Step 1: Create the detailed analysis skeleton**

```md
# 用户管理详细需求分析

## 1. 模块基线

### 1.1 模块定位
### 1.2 业务目标
### 1.3 角色边界
### 1.4 关键对象
### 1.5 核心规则
### 1.6 页面组成
### 1.7 当前现状
### 1.8 复刻基线
### 1.9 适配建议

## 2. 用户列表
## 3. 添加用户
## 4. 批量导入用户
## 5. 编辑用户
## 6. 重置密码
## 7. 删除用户
## 8. 查询用户
## 9. 角色列表
## 10. 角色添加用户
## 11. 角色移除用户
## 12. 创建自定义角色
```

- [ ] **Step 2: For every functional section, use the exact same sub-structure**

```md
### X.1 功能目标
### X.2 使用角色
### X.3 前置条件
### X.4 触发入口
### X.5 页面元素
### X.6 字段说明
### X.7 操作流程
### X.8 关键业务规则
### X.9 校验规则
### X.10 异常场景
### X.11 依赖模块
### X.12 当前现状
### X.13 复刻基线
### X.14 适配建议
### X.15 产品执行计划
```

- [ ] **Step 3: Populate `当前现状` for user-management sections from concrete APIs**

Use these mappings in the document:

```md
- 用户列表：`userPageApi` -> `/user/pager/{page}/{limit}`
- 添加用户：`userCreateApi` -> `/user/create`
- 编辑用户：`userEditApi` -> `/user/edit`
- 删除用户：`userDelApi` / `batchDelApi` -> `/user/delete/{uid}` / `/user/batchDel`
- 重置密码：`resetPwdApi` -> `/user/resetPwd/{uid}`
- 启用切换：`switchEnableApi` -> `/user/enable`
- 下载导入模板：`downExcelTemplateApi` -> `/user/excelTemplate`
- 批量导入：`importUserApi` -> `/user/batchImport`
- 下载错误记录：`downErrorRecordApi` -> `/user/errorRecord/{key}`
- 角色绑定用户：`mountUserApi` / `mountExternalUserApi` -> `/role/mountUser` / `/role/mountExternalUser`
- 角色解绑用户：`unMountUserApi` -> `/role/unMountUser`
- 角色创建编辑：`roleCreateApi` / `roleEditApi` -> `/role/create` / `/role/edit`
```

- [ ] **Step 4: Validate that every section contains a product execution plan**

Run:

```bash
rg -n "^### .*产品执行计划$" docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md
```

Expected: at least 11 matches, one for each functional section plus optional module-level plan if included.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md
git commit -m "docs: add detailed user management analysis"
```

### Task 4: Add Calicat alignment checkpoints

**Files:**
- Modify: `docs/superpowers/specs/2026-04-17-org-center-module-overview.md`
- Modify: `docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md`
- Reference: `docs/superpowers/specs/2026-04-17-org-center-calicat-prototype-brief.md`

- [ ] **Step 1: Add a `原型对齐检查点` subsection to the three P0 modules in the overview**

```md
### X.10 原型对齐检查点

- 页面入口是否与后台导航结构一致
- 列表页是否具备搜索、筛选、分页、批量操作
- 表单字段是否覆盖官方文档和现有接口
- 是否覆盖系统管理员与组织管理员差异
- 是否覆盖空状态、无权限状态、删除确认、错误反馈
```

- [ ] **Step 2: Add a `Calicat 原型映射` subsection to each user-management functional section**

```md
### X.16 Calicat 原型映射

| 需求小节 | 目标页面 | 目标弹窗 | 必须体现的状态 | 需要设计确认的歧义点 |
| --- | --- | --- | --- | --- |
| 用户列表 | 用户列表页 | 无 | 正常、空状态、搜索无结果、无权限 | 组织切换入口是页头筛选还是全局上下文 |
| 添加用户 | 用户列表页 | 新增用户弹窗 | 表单默认态、校验失败、提交成功 | 所属组织字段在系统管理员和组织管理员下是否同形态 |
| 批量导入用户 | 用户列表页 | 批量导入弹窗、导入结果反馈弹窗 | 模板下载、上传中、部分成功、失败报告下载 | 错误反馈是表格结果还是摘要卡片 |
| 编辑用户 | 用户列表页 | 编辑用户弹窗 | 账号只读、字段编辑、保存成功 | 组织是否允许编辑、角色是否联动回填 |
| 重置密码 | 用户列表页 | 重置密码确认弹窗 | 二次确认、成功反馈 | 是否展示默认密码提示 |
| 删除用户 | 用户列表页 | 删除确认弹窗 | 单删确认、批量删除确认、删除成功 | 最后一个角色用户被删除时是否给出额外提示 |
| 查询用户 | 用户列表页 | 无 | 关键字查询、筛选组合、无结果 | 搜索粒度按账号/姓名/邮箱哪些字段生效 |
| 角色列表 | 角色列表页 | 无 | 正常、空状态、无权限 | 内置角色和自定义角色如何区分展示 |
| 角色添加用户 | 角色列表页 | 角色添加用户弹窗 | 组织内用户添加、组织外用户添加、搜索无结果 | 外部用户搜索入口是同弹窗分栏还是独立流程 |
| 角色移除用户 | 角色列表页 | 角色移除确认弹窗 | 移除确认、影响提示、移除成功 | “唯一角色会导致用户被系统删除”如何提示 |
| 创建自定义角色 | 角色列表页 | 创建自定义角色弹窗 | 继承角色选择、字段校验、创建成功 | 继承关系是单选卡片还是下拉框 |
```

- [ ] **Step 3: Validate that all new prototype checkpoints exist**

Run:

```bash
rg -n "原型对齐检查点|Calicat 原型映射" docs/superpowers/specs/2026-04-17-org-center-module-overview.md docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md
```

Expected: prototype checkpoint sections exist in both documents.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-17-org-center-module-overview.md docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md
git commit -m "docs: align org center analysis with calicat brief"
```

### Task 5: Self-review and handoff

**Files:**
- Modify: `docs/superpowers/specs/2026-04-17-org-center-source-inventory.md`
- Modify: `docs/superpowers/specs/2026-04-17-org-center-module-overview.md`
- Modify: `docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md`

- [ ] **Step 1: Run placeholder and ambiguity scans on all generated analysis docs**

Run:

```bash
rg -n "TBD|TODO|待定|待补|后续补充|类似上文|同上" docs/superpowers/specs/2026-04-17-org-center-source-inventory.md docs/superpowers/specs/2026-04-17-org-center-module-overview.md docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md
```

Expected: no matches.

- [ ] **Step 2: Run structure checks across the three analysis deliverables**

Run:

```bash
sed -n '1,220p' docs/superpowers/specs/2026-04-17-org-center-source-inventory.md
sed -n '1,260p' docs/superpowers/specs/2026-04-17-org-center-module-overview.md
sed -n '1,320p' docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md
```

Expected: all three documents render in a stable top-down order without missing headings.

- [ ] **Step 3: Write the final handoff note into the end of the detailed analysis**

```md
## 13. 交付后动作

1. 将 `模块总览` 提交给产品、设计、研发共同评审
2. 将 `用户管理详细需求分析` 与 Calicat 第一批原型逐项对照
3. 确认差异项后，再进入 `组织管理` 和 `权限配置` 的详细分析
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-17-org-center-source-inventory.md docs/superpowers/specs/2026-04-17-org-center-module-overview.md docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md
git commit -m "docs: finalize org center analysis package"
```
