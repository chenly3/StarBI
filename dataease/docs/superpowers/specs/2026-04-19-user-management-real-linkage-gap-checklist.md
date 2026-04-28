# 用户管理真实链路缺口清单

## 1. 目标

- 说明为什么当前 DataEase 本地环境只能完成 `de-xpack/user-management` 前端模块回归，不能完成 `宿主 + 真实后端` 的完整用户管理联调回归。
- 输出下一阶段最小打通条件，作为后续真实联调入口。

## 2. 本轮结论

- 本地基础依赖已恢复：
  - Docker Desktop 已启动
  - MySQL 已监听 `127.0.0.1:3306`
  - Redis 已监听 `127.0.0.1:6379`
  - Core backend 已成功启动在 `127.0.0.1:8100`
- 但用户管理真实链路仍未打通：
  - `GET /de2api/menu/query` 正常
  - `POST /de2api/user/pager/1/20` 返回 `404`
  - `POST /de2api/role/query` 返回 `404`
  - `GET /de2api/xpackModel` 返回 `null`
  - 宿主菜单树中没有用户管理入口
- 当前本地启动方式决定了它不会进入企业版权限链路：
  - [`dataease-app.sh`](/Users/chenliyong/AI/github/StarBI/dataease/dataease-app.sh) 以 `--spring.profiles.active=standalone` 启动
  - `standalone` 配置走 [`application-standalone.yml`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/application-standalone.yml)
  - 该模式直接启用本地数据库迁移与 substitute 权限兜底，不会连接真实 `xpack-permissions` 服务

## 3. 现状证据

### 3.1 宿主菜单

- 实际接口：`GET /de2api/menu/query`
- 返回结果中仅包含：
  - 工作台
  - 仪表板
  - 数据大屏
  - 数据准备
  - 系统设置
  - 模板管理
- 未出现：
  - 用户管理
  - `/menu/system/user/index`

### 3.2 用户与角色接口

- `POST /de2api/user/pager/1/20`：
  - 返回 `404`
- `POST /de2api/role/query`：
  - 返回 `404`
- 说明当前运行态并未暴露用户管理所需真实后端接口。

### 3.3 X-Pack 状态

- `GET /de2api/xpackModel` 返回 `null`
- `GET /de2api/model` 返回 `false`
- 说明当前后端没有进入“可提供 X-Pack 用户管理能力”的稳定运行态。

## 4. 代码侧证据

### 4.1 当前仅存在 substitute 替代实现

- 用户替代服务：
  - `core/core-backend/src/main/java/io/dataease/substitute/permissions/user/SubstituteUserServer.java`
- 组织替代服务：
  - `core/core-backend/src/main/java/io/dataease/substitute/permissions/org/SubstituleOrgServer.java`

这些类只提供社区态最小接口兜底，不覆盖用户管理真实能力。

### 4.2 当前缺少本地真实承载实现

- 当前仓库未发现本地：
  - `userServer`
  - `roleServer`
  - 对应 X-Pack 后端实现类

其中 `roleServer` 缺失最直接，因此 `/role/query` 404 与代码现状一致。

补充代码事实：

- [`core/core-backend/pom.xml`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/pom.xml) 中 `distributed` profile 会：
  - 引入 `io.dataease:distributed`
  - 编译时排除 `io/dataease/substitute/**`
- 但当前仓库可见的 [`sdk/distributed/src/main/java`](/Users/chenliyong/AI/github/StarBI/dataease/sdk/distributed/src/main/java) 只提供：
  - `DeFeignConfiguration`
  - `DeFeignRegister`
  - 动态数据源/租户 Flyway 能力
- 该模块不包含真实 `userServer` / `roleServer` / `orgServer` 实现，因此它只是“分布式接入底座”，不是用户管理业务实现本体。

进一步证据：

- 用户与权限能力在宿主里通过 Feign 指向远端服务：
  - [`UserFeignService.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/defeign/permissions/user/UserFeignService.java)
  - [`PermissionFeignService.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/defeign/permissions/auth/PermissionFeignService.java)
- 这两个 Feign 都显式声明目标服务名为 `xpack-permissions`，说明真实用户/权限能力设计上来自独立远端服务，而不是当前 `core-backend` 单体直接内置。

### 4.3 菜单仍走社区菜单树

- 菜单入口实现：
  - `core/core-backend/src/main/java/io/dataease/menu/server/MenuServer.java`
  - `core/core-backend/src/main/java/io/dataease/menu/manage/MenuManage.java`
- 当前 `core_menu` 菜单树返回结果未包含用户管理入口。
- 即使前端 remote 模块已实现，只要菜单树未下发该入口，宿主就不会承接用户管理页面。

补充代码事实：

- 菜单数据直接来自 `core_menu` 表：
  - [`MenuServer.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/menu/server/MenuServer.java)
  - [`MenuManage.java`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/menu/manage/MenuManage.java)
- 当前仓库的菜单初始化 SQL 与后续迁移中，未发现 `/menu/system/user/index` 或 “用户管理” 菜单种子：
  - [`V2.0__core_ddl.sql`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/db/migration/V2.0__core_ddl.sql)
  - [`V2.10.20__ddl.sql`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/db/migration/V2.10.20__ddl.sql)
- 因此当前 `menu/query` 缺入口不是前端隐藏，而是后端菜单源数据本身没有这条记录。

## 5. 当前可确认的能力边界

### 5.1 已完成

- `de-xpack/user-management` 前端 remote 页面可独立加载
- 用户页签与角色页签核心交互可通过浏览器自动化回归
- 使用临时 harness + mock 已验证：
  - 用户搜索
  - 新增用户
  - 编辑用户
  - 启停用户
  - 重置密码
  - 删除用户
  - 批量导入
  - 导入结果
  - 角色创建
  - 角色添加组织用户
  - 角色移除用户

### 5.2 未完成

- 宿主菜单展示“用户管理”
- 宿主真实跳转到 `/menu/system/user/index`
- 真实后端返回用户列表
- 真实后端返回角色列表
- 真实后端支持成员挂载/卸载
- 真实后端支持批量导入、错误文件下载

## 6. 真实链路最小打通条件

要完成 `宿主 + 真实后端` 联调，至少需要以下条件同时成立：

### A. 后端能力

- 提供真实 `user` 接口实现：
  - `/user/pager/{page}/{size}`
  - `/user/create`
  - `/user/edit`
  - `/user/queryById/{id}`
  - `/user/delete/{id}`
  - `/user/enable`
  - `/user/resetPwd/{id}`
  - `/user/excelTemplate`
  - `/user/batchImport`
  - `/user/errorRecord/{key}`
  - `/user/role/selected/{page}/{size}`
  - `/user/role/option`
- 提供真实 `role` 接口实现：
  - `/role/query`
  - `/role/detail/{id}`
  - `/role/create`
  - `/role/mountUser`
  - `/role/beforeUnmountInfo`
  - `/role/unMountUser`

### B. 菜单与宿主承载

- `menu/query` 返回用户管理入口
- 菜单项与 remote key 对齐到：
  - `/menu/system/user/index`
  - `L21lbnUvc3lzdGVtL3VzZXIvaW5kZXg=`

### C. X-Pack 模式

- `xpackModel` 返回明确可用值
- 宿主允许 plugin/X-Pack 页面承载用户管理模块

### D. 分布式运行前提

- 需要以 `distributed` profile 启动 `core-backend`
- 需要可用的 Nacos 注册中心：
  - [`application-distributed.yml`](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/application-distributed.yml) 默认指向 `127.0.0.1:8848`
- 需要真实 `xpack-permissions` 服务完成注册并可被 Feign 发现
- 仅切换 profile 还不够；如果没有远端 `xpack-permissions`，`user/role/auth` 依旧不会可用

## 7. 推荐下一步

建议按顺序处理：

1. 先确认当前环境是否具备 `distributed + nacos + xpack-permissions` 的真实企业版运行条件。
2. 如果没有这套运行条件，不再继续做宿主级浏览器回归，直接转为“本仓库本地承载”的实现决策。
3. 如果实现应来自外部 X-Pack 服务，则先接入该服务，再谈联调。
4. 如果本仓库要本地承载，则先补：
   - `roleServer`
   - 真实 `userServer`
   - 用户管理菜单下发
5. 待以上完成后，再重新执行宿主级浏览器自动化回归。

## 8. 当前阶段判断

- 现在不再是“继续做浏览器回归”的阶段。
- 现在进入“补真实后端承载能力与菜单接线”的阶段。
- 如果不先解决这两个缺口，继续做宿主级自动化不会产生新增价值。
