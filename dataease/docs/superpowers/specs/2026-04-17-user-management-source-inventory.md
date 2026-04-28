# 用户管理 Source Inventory

## 1. 范围与目标

- 范围仅限 `组织管理中心 > 用户管理` 单模块。
- 本清单用于冻结本模块分析输入，避免后续需求分析和实现拆解时混入未核实假设。
- 本轮事实来源只使用 3 类：
  - DataEase 官方 X-Pack 文档
  - 当前仓库 `user/org/role/auth` 相关接口与占位实现
  - Calicat 用户管理原型

## 2. 官方文档基线

### 2.1 用户管理主文档

- 文档地址：`https://dataease.cn/docs/v2/xpack/user_management_user/`
- 已核实小节：
  - `1.1 用户列表`
  - `1.2 添加用户`
  - `1.3 批量导入用户`
  - `1.4 编辑用户`
  - `1.5 重置密码`
  - `1.6 删除用户`
  - `1.7 查询用户`
  - `2.1 角色列表`
  - `2.2 添加用户`
  - `2.3 移除用户`
  - `2.4 创建自定义角色`

### 2.2 与本模块直接相关的依赖文档

| 文档 | 地址 | 与用户管理的关系 |
| --- | --- | --- |
| 组织管理 | `https://dataease.cn/docs/v2/xpack/sys_management_organization/` | 用户必须处于某个组织上下文；组织隔离决定用户可见范围 |
| 权限配置 | `https://dataease.cn/docs/v2/xpack/sys_management_permission/` | 菜单权限绑定角色、资源权限可绑定用户/角色，角色模型直接影响授权方式 |

### 2.3 官方文档中已明确的关键规则

- 系统管理员或组织管理员可以创建和管理用户。
- 添加用户前需要先选择组织，在该组织下创建用户。
- 用户字段至少包括：账号、姓名、邮箱、手机、角色、是否启用。
- 账号在新增后不可修改。
- 角色可多选，且是“用户在该组织下的角色”。
- 批量导入只创建合规数据，不合规数据进入错误报告。
- 导入文件大小上限为 `10M`。
- 批量导入支持第三方平台用户来源：`LOCAL`、企业微信、钉钉、飞书、国际飞书、CAS、OIDC、LDAP。
- 角色分为系统级角色与组织级角色。
- 自定义角色必须继承组织内置角色，权限不大于被继承角色。
- 从角色移除用户时，如果该用户在系统所有组织中只剩这一个角色，则用户会被同步从系统删除。

## 3. Calicat 原型输入

### 3.1 文件与节点

- `file_id`: `2044998365299601408`

| 原型节点 | 节点 ID | 覆盖需求单元 |
| --- | --- | --- |
| 用户列表 | `8a93fae7-5861-4018-b125-aef71633f858` | 用户列表、查询用户、删除用户、重置密码、启停、批量操作 |
| 添加用户 | `8b26da3d-6193-42af-937d-ae47cbb2d7b3` | 添加用户、编辑用户 |
| 批量导入 | `4b7c7f7c-1ded-46c7-a4a9-98c6376efc53` | 批量导入用户 |
| 导入结果 | `5a55647b-3c4c-4ba9-a6ba-cf60c0ff6e3a` | 部分成功导入、错误报告下载 |
| 角色列表 | `cc063f54-e780-4229-9622-595abd9bd909` | 角色列表 |
| 添加组织用户 | `eb5a063f-6da2-4b6a-a3db-d7bdd91c73d7` | 角色添加用户 |
| 创建自定义角色 | `ee600d04-23ff-4a76-bb7f-5e5c417461ed` | 创建自定义角色 |

### 3.2 原型已覆盖的页面要素

- 用户列表页：
  - 全局组织切换入口
  - 用户/角色页签
  - 搜索框
  - 筛选项：用户来源、启用状态、角色
  - 列表字段：姓名、账号、角色、邮箱、用户来源、启用状态、创建时间、操作
  - 原型中出现“所属组织”列，但当前仓库 `UserGridVO` 尚未提供该字段
  - 批量操作、分页
- 添加用户弹窗：
  - 账号、姓名、邮箱、手机、角色、是否启用
  - 顶部提示条
- 批量导入弹窗：
  - 模板提示
  - 文件上传区
  - 导入按钮
- 导入结果弹窗：
  - 失败摘要
  - 错误报告下载
  - 返回查看、继续导入
- 角色列表页：
  - 内置角色与自定义角色分组
  - 角色详情与“添加用户”操作
  - 角色用户表格
- 添加组织用户弹窗：
  - 搜索框
  - 左右双栏选择
  - 已选用户清空
- 创建自定义角色弹窗：
  - 角色名称
  - 角色类型单选：普通用户、组织管理员
  - 规则提示

### 3.3 原型与官方文档的差异点

- 原型新增用户弹窗没有显式“所属组织”字段，更像“先切组织，再在当前组织内新增用户”。
- 原型“创建自定义角色”使用 `角色类型` 单选，而不是“继承角色”下拉；这与官方“继承普通用户或组织管理员”在语义上等价。
- 原型已经体现用户来源筛选，但新增用户弹窗未体现“用户来源”录入项，说明来源更可能是系统派生字段，而不是手工输入字段。
- 原型暂未单独给出“添加外部用户”弹窗，当前只给出了“添加组织用户”双栏选择页；外部用户流转仍需后续明确。

## 4. 仓库源码事实源

### 4.1 前端 API 包装层

| 能力域 | 文件 | 已有接口 |
| --- | --- | --- |
| 用户与角色 | `core/core-frontend/src/api/user.ts` | 组织切换、用户分页、用户创建/编辑/删除、批量删除、查询详情、角色查询、角色创建/编辑/删除、挂载用户、挂载外部用户、解绑用户、模板下载、批量导入、错误报告下载、默认密码、重置密码、启停切换 |
| 组织 | `core/core-frontend/src/api/org.ts` | 组织树查询、创建、编辑、删除、资源占用检查 |
| 权限 | `core/core-frontend/src/api/auth.ts` | 当前组织用户/角色查询、菜单树、资源树、按对象/按资源权限查询与保存 |

### 4.2 后端 API 合同层

| 能力域 | 文件 | 已有合同 |
| --- | --- | --- |
| 用户 | `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/api/UserApi.java` | 用户分页、详情、创建、第三方用户创建、编辑、删除、批量删除、当前组织用户、导入、错误记录、默认密码、重置密码、启停、切换组织 |
| 角色 | `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/role/api/RoleApi.java` | 角色查询、创建、编辑、删除、角色挂载用户、挂载组织外用户、移除用户、查询角色详情、解绑前影响判断 |
| 组织 | `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/org/api/OrgApi.java` | 组织树、创建、编辑、删除、权限内组织树 |
| 权限 | `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/auth/api/AuthApi.java` | 菜单权限、资源权限、按用户/按资源双视角查询与保存 |

### 4.3 DTO/VO 口径

- `UserGridRequest`：
  - `keyword`
  - `statusList`
  - `originList`
  - `roleIdList`
  - `timeDesc`
- `UserCreator` / `UserEditor`：
  - `account`
  - `name`
  - `email`
  - `phonePrefix`
  - `phone`
  - `roleIds`
  - `enable`
  - `mfaEnable`
  - `variables`
  - `id` 仅编辑时存在
- `PlatformUserCreator`：
  - 继承 `UserCreator`
  - 新增 `origin`
- `UserGridVO`：
  - `account`
  - `name`
  - `roleItems`
  - `email`
  - `phonePrefix`
  - `phone`
  - `enable`
  - `createTime`
  - `origin`
  - 不包含 `所属组织`
- `UserImportVO`：
  - `dataKey`
  - `successCount`
  - `errorCount`
- `RoleCreator`：
  - `name`
  - `typeCode`
  - `desc`
- `MountUserRequest` / `UnmountUserRequest`：
  - `rid`
  - `uids` 或 `uid`

### 4.4 当前仓库的本地实现状态

| 类型 | 文件 | 结论 |
| --- | --- | --- |
| Feign 接入 | `core/core-backend/src/main/java/io/dataease/defeign/permissions/user/UserFeignService.java` | 用户能力走远端 `xpack-permissions` 服务 |
| Feign 接入 | `core/core-backend/src/main/java/io/dataease/defeign/permissions/auth/PermissionFeignService.java` | 权限能力走远端 `xpack-permissions` 服务 |
| 社区占位 | `core/core-backend/src/main/java/io/dataease/substitute/permissions/user/SubstituteUserServer.java` | 无 X-Pack 时只提供 `/user/info`、`/user/personInfo`、`/user/ipInfo`、语言切换 |
| 社区占位 | `core/core-backend/src/main/java/io/dataease/substitute/permissions/org/SubstituleOrgServer.java` | 无 X-Pack 时只提供 `/org/mounted` |
| 前端插件加载 | `core/core-frontend/src/components/plugin/src/index.vue` | X-Pack 页面通过插件/远端组件注入 |
| 前端远端工具 | `core/core-frontend/src/components/plugin/src/ImportXpackTool.ts` | 分布式模式下从远端加载 `DEXPackTs.umd.js` |
| 组织管理中心入口 | `core/core-frontend/src/layout/components/SystemCfg.vue` | 头部存在“组织管理中心”入口 |

### 4.5 语言包与交互文案

`core/core-frontend/src/locales/zh-CN.ts` 已存在本模块关键文案：

- 用户：
  - `add_title`
  - `edit_title`
  - `reset_pwd`
  - `search_placeholder`
  - `confirm_batch_delete`
  - `download_error_report`
  - `data_import_failed`
- 批量导入：
  - `buttonText`
  - `limitMsg`
  - `suffixMsg`
  - `templateError`
- 角色：
  - `role_title`
  - `confirm_unbind_user`
  - `clear_in_system`
  - `clear_in_org`
  - `org_user_title`
  - `out_user_title`
  - `system_role`
  - `custom_role`

### 4.6 当前前端包装层缺口

- 后端已提供 `createPlatform -> /user/createPlatform`，但当前 `core/core-frontend/src/api/user.ts` 没有对应包装方法。
- 这意味着“第三方用户直接创建”当前只存在后端合同，不存在现成前端调用入口。

## 5. 需求单元追踪矩阵

| 需求单元 | 官方文档 | Calicat | 仓库 API | 当前状态 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 用户列表 | 有 | 有 | `userPageApi` / `UserApi.pager` | 合同存在，本地页面缺失 | 可直接分析，后续需落页面 |
| 添加用户 | 有 | 有 | `userCreateApi` / `UserApi.create` | 合同存在，本地页面缺失 | 组织上下文为关键差异点 |
| 批量导入用户 | 有 | 有 | `downExcelTemplateApi` / `importUserApi` / `UserApi.batchImport` | 合同存在，本地页面缺失 | 支持部分成功与错误报告 |
| 编辑用户 | 有 | 与新增共用弹窗 | `userEditApi` / `UserApi.edit` | 合同存在，本地页面缺失 | 账号只读已被官方明确 |
| 重置密码 | 有 | 列表操作位已体现 | `resetPwdApi` / `UserApi.resetPwd` / `defaultPwdApi` | 合同存在，本地页面缺失 | 是否展示默认密码需产品定 |
| 删除用户 | 有 | 列表操作位与批量操作已体现 | `userDelApi` / `batchDelApi` / `UserApi.delete` / `batchDel` | 合同存在，本地页面缺失 | 单删与批量删都要支持 |
| 查询用户 | 有 | 有 | `userPageApi` + `UserGridRequest` | 合同存在，本地页面缺失 | 关键字 + 多维筛选已具备 |
| 角色列表 | 有 | 有 | `searchRoleApi` / `roleDetailApi` / `RoleApi.query` / `detail` | 合同存在，本地页面缺失 | 左侧分组、右侧详情模式明确 |
| 角色添加用户 | 有 | 有，但仅组织用户弹窗 | `mountUserApi` / `mountExternalUserApi` / `RoleApi.mountUser` / `mountExternalUser` | 合同存在，本地页面缺失 | 外部用户流程仍需补原型 |
| 角色移除用户 | 有 | 列表操作位已体现 | `beforeUnmountInfoApi` / `unMountUserApi` / `RoleApi.beforeUnmountInfo` / `unMountUser` | 合同存在，本地页面缺失 | 需显式处理“唯一角色”提示 |
| 创建自定义角色 | 有 | 有 | `roleCreateApi` / `RoleApi.create` | 合同存在，本地页面缺失 | `typeCode` 映射继承角色选择 |
| 第三方来源用户创建 | 有导入说明 | 无单独原型 | `UserApi.createPlatform` / `PlatformUserCreator` | 后端合同存在，前端包装缺失，本地页面缺失 | 当前更像平台集成流，不纳入基础新增弹窗 |
| 用户启停 | 原型有 | 有 | `switchEnableApi` / `UserApi.enable` | 合同存在，本地页面缺失 | 应视作用户列表行级标准操作 |

## 6. 核心结论

### 6.1 已有能力

- 官方 X-Pack 文档与当前 Calicat 原型在功能目录上基本一一对应。
- 当前仓库已经具备完整的前端 API 包装层与后端接口合同层。
- 当前仓库已有本模块绝大部分交互文案，说明产品语义已经被预埋。
- 第三方来源用户创建和启停切换已有明确合同，不应在后续分析中遗漏。

### 6.2 缺失能力

- 当前仓库没有本地可直接编辑的用户管理页面实现。
- 当前仓库没有本地 `userServer` / `roleServer` / `orgServer` / `authServer` 的 X-Pack 业务实现。
- `de-xpack` 目录当前为空，说明本轮工作不能假设已有落地代码。

### 6.3 待明确事项

- 系统管理员新增用户时，是否保留“显式所属组织字段”，还是沿用“全局切换组织后新增”的交互。
- 角色添加用户是否在一期同时实现“组织用户 + 外部用户”双流转。
- 重置密码是否在弹窗中展示默认密码，还是仅提示“恢复初始密码”。
