# 用户管理本地承载 Gap Inventory

## 1. 目标

- 明确当前 `DataEase` 仓库是否可以直接在本地补齐用户管理真实链路。
- 明确“本地承载”不是抽象概念，而是要补到哪些层。
- 只覆盖用户管理一期范围，不扩展到组织中心其他模块。

## 2. 结论

- 当前仓库可以做用户管理本地承载，但这不是“补几个 controller”。
- 它至少是一个新的本地权限子系统最小落地，需要同时补：
  - 数据表
  - 实体 / Mapper / DAO
  - `user` / `role` / `org` 后端实现
  - 用户管理菜单下发
  - 与当前登录态、组织切换、权限校验的最小接线
- 如果不补库表，只靠现有社区库表无法承接用户管理一期真实数据。

## 3. 当前仓库已有能力

### 3.1 前端 remote 已可用

- 用户管理 remote 页面已具备完整一期 UI 与交互：
  - [`de-xpack/user-management/src/menu/system/user/index.vue`](/Users/chenliyong/AI/github/StarBI/dataease/de-xpack/user-management/src/menu/system/user/index.vue)
  - [`de-xpack/user-management/src/menu/system/user/api/userManagement.ts`](/Users/chenliyong/AI/github/StarBI/dataease/de-xpack/user-management/src/menu/system/user/api/userManagement.ts)
- remote key 已固定：
  - `/menu/system/user/index`
  - `L21lbnUvc3lzdGVtL3VzZXIvaW5kZXg=`

### 3.2 合同接口已存在

- 用户合同：
  - [`UserApi.java`](/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/api/UserApi.java)
- 角色合同：
  - [`RoleApi.java`](/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/role/api/RoleApi.java)
- 组织合同：
  - [`OrgApi.java`](/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/org/api/OrgApi.java)

### 3.3 一期前端真正依赖的最小接口束已明确

- 当前 remote 实际调用的核心接口集中在：
  - 用户列表 / 新增 / 编辑 / 删除 / 批量删除
  - 启停 / 重置密码 / 默认密码
  - 导入模板 / 批量导入 / 错误报告
  - 角色查询 / 角色详情 / 创建角色
  - 角色成员查询 / 绑定 / 解绑前校验 / 解绑
  - 组织挂载树
  - 组织切换
- 参考：
  - [`userManagement.ts`](/Users/chenliyong/AI/github/StarBI/dataease/de-xpack/user-management/src/menu/system/user/api/userManagement.ts)

## 4. 当前仓库缺失能力

### 4.1 缺真实 provider

- 当前仓库没有真实本地：
  - `userServer`
  - `roleServer`
  - `orgServer`
- 现有仅有：
  - 社区 substitute
  - 指向 `xpack-permissions` 的 Feign

相关文件：

- [`SubstituteUserServer.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/substitute/permissions/user/SubstituteUserServer.java)
- [`SubstituleOrgServer.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/substitute/permissions/org/SubstituleOrgServer.java)
- [`UserFeignService.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/defeign/permissions/user/UserFeignService.java)
- [`PermissionFeignService.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/defeign/permissions/auth/PermissionFeignService.java)

### 4.2 缺用户管理数据表

- 当前社区/单机库迁移中，没有发现用户管理真实落库所需的用户、角色、组织、关系表。
- 扫描结果里与权限侧直接相关的社区表，基本只看到：
  - `xpack_setting_authentication`
  - `xpack_platform_token`
  - 少量分享/告警等 `xpack_*` 表
- 没有看到可直接承接以下数据的社区表：
  - 用户主表
  - 角色主表
  - 组织主表
  - 用户角色关系
  - 用户组织关系
  - 角色组织关系

关键证据：

- [`V2.0__core_ddl.sql`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/db/migration/V2.0__core_ddl.sql)
- [`V2.7__ddl.sql`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/db/migration/V2.7__ddl.sql)
- [`V2.10.20__ddl.sql`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/db/migration/V2.10.20__ddl.sql)

### 4.3 缺菜单入口

- 当前宿主菜单来自 `/menu/query`。
- 当前库表 `core_menu` 里没有用户管理入口种子。
- 没有 `/menu/system/user/index`，宿主就不会生成动态路由，也不会装载 remote 页面。

相关文件：

- [`MenuServer.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/menu/server/MenuServer.java)
- [`MenuManage.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/menu/manage/MenuManage.java)
- [`V2.0__core_ddl.sql`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/db/migration/V2.0__core_ddl.sql)

## 5. 当前可复用的基础能力

### 5.1 菜单装载机制可复用

- 只要 `/menu/query` 能返回一个 plugin 菜单叶子，前端会自动走 `XpackComponent` 装载 remote。
- 不需要改首页静态路由。

相关文件：

- [`common.ts`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/common.ts)
- [`permission.ts`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/permission.ts)
- [`establish.ts`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/router/establish.ts)
- [`index.vue`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/components/plugin/src/index.vue)

### 5.2 用户 fallback 接线模式可参考

- 现有 `AIQueryThemeManage` 已展示一种可参考的接线方式：
  - 优先注入真实 `UserApi`
  - 注不到时退回 `SubstituteUserServer`
- 这说明仓库整体接受“有真实 provider 就切真实，没有就 fallback”的组织方式。

参考：

- [`AIQueryThemeManage.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java)

### 5.3 社区基础能力可复用，但只能复用很少一层

- 可复用：
  - Spring Boot / MyBatis Plus 基础结构
  - `core_menu` 菜单体系
  - `IDUtils` 这类基础工具
  - 现有请求返回包装与分页风格
- 不可直接复用为用户管理主实现：
  - [`CoreUserManage.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/system/manage/CoreUserManage.java)
  - [`CorePermissionManage.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/system/manage/CorePermissionManage.java)
- 原因是它们只是社区态占位，不是用户管理业务实现。

## 6. 本地承载最小实现面

### 6.1 库表层

至少需要新增一组本地表，覆盖一期真实链路：

- 用户表
- 角色表
- 组织表
- 用户角色关系表
- 用户组织关系表
- 角色组织关系表
- 导入错误记录表或可落盘缓存策略

### 6.2 后端实现层

至少需要本地新增：

- `userServer`
- `roleServer`
- `orgServer`

建议最小先覆盖一期 remote 实际依赖：

- `UserApi`
  - `pager`
  - `create`
  - `edit`
  - `queryById`
  - `delete`
  - `batchDel`
  - `enable`
  - `defaultPwd`
  - `resetPwd`
  - `excelTemplate`
  - `batchImport`
  - `errorRecord`
  - `role/option`
  - `role/selected`
  - `switch`
- `RoleApi`
  - `query`
  - `detail`
  - `create`
  - `mountUser`
  - `beforeUnmountInfo`
  - `unMountUser`
- `OrgApi`
  - `mounted`

### 6.3 菜单层

最小要补一条用户管理菜单到 `/menu/query`：

- 挂到 `/system` 容器树下
- `component` 指向 `L21lbnUvc3lzdGVtL3VzZXIvaW5kZXg=`
- 不能挂到 `/sys-setting`

### 6.4 运行态接线层

还需要处理最小运行态问题：

- 当前组织切换后如何决定用户可见范围
- 当前登录人是否一律按 `admin` 处理
- 本地权限校验是否先做“弱校验”还是完整资源权限

## 7. 风险判断

### 7.1 风险最低的本地承载策略

- 先做“一期用户管理本地弱权限闭环”
- 只保证：
  - 数据可查可改
  - 组织可切换
  - 角色成员可维护
  - 菜单可进入
- 暂不把完整 `auth` 资源权限体系一起落地

这是因为当前 remote 一期页面本身并不依赖完整 `AuthApi` 才能跑通主链路。

### 7.2 当前不建议的路径

- 不建议继续在 `standalone` 环境反复做宿主自动化回归
- 不建议先碰完整权限树
- 不建议先做外部用户挂载

## 8. 下一步建议

建议直接进入下面这一步：

1. 先出“本地承载最小 schema + server slicing”
2. 把一期用户管理拆成：
   - schema
   - `userServer`
   - `roleServer`
   - `orgServer`
   - `menu` seed
3. 先做弱权限可运行闭环，再回到浏览器自动化验证

如果继续，我下一步就直接做这个 slicing，不再停留在 gap 说明。
