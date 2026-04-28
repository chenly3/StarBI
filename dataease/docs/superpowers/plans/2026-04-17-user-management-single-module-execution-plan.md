# User Management Single-Module Execution Plan

> **For agentic workers:** Use subagent-driven execution for verification and refinement. This plan is intentionally scoped to the `用户管理` module only.

**Goal:** Freeze the user-management baseline for the DataEase 二开项目, then convert it into an implementation-ready module package covering source inventory, detailed requirements, and engineering slicing.

**Architecture:** Execute in three layers. First freeze facts from official docs, current repo contracts, and Calicat prototype. Second resolve module-level product decisions that affect org/role/auth coupling. Third split the implementation into independent frontend, backend, and permission-integration tracks with explicit acceptance gates.

**Tech Stack:** Markdown, Calicat MCP, Spring Boot Feign/X-Pack contracts, Vue frontend API wrappers, locale-driven interaction text.

---

## 1. 执行原则

- 只做用户管理模块，不回退到 7 模块总览。
- 所有结论必须能回溯到 `官方文档 + 仓库代码 + 原型` 三类证据之一。
- 明确区分：
  - 已有合同
  - 本地缺失实现
  - 产品待决策项
- 先冻结需求口径，再做研发切片，避免“边写代码边补需求”。

## 2. 当前冻结输入

- 官方主文档：`https://dataease.cn/docs/v2/xpack/user_management_user/`
- 依赖文档：
  - `https://dataease.cn/docs/v2/xpack/sys_management_organization/`
  - `https://dataease.cn/docs/v2/xpack/sys_management_permission/`
- Calicat 文件：`2044998365299601408`
- 仓库核心文件：
  - `core/core-frontend/src/api/user.ts`
  - `core/core-frontend/src/api/org.ts`
  - `core/core-frontend/src/api/auth.ts`
  - `sdk/api/api-permissions/.../UserApi.java`
  - `sdk/api/api-permissions/.../RoleApi.java`
  - `sdk/api/api-permissions/.../OrgApi.java`
  - `sdk/api/api-permissions/.../AuthApi.java`

## 3. 模块实施切片

### 阶段 A：需求与边界冻结

**目标**

- 将“用户管理到底包含什么、不包含什么、依赖谁”一次说清。

**输出**

- `docs/superpowers/specs/2026-04-17-user-management-source-inventory.md`
- `docs/superpowers/specs/2026-04-17-user-management-detailed-analysis.md`

**必须确认的决策点**

- 组织归属是否保持当前组织隐式上下文
- 外部用户添加是否纳入一期
- 重置密码是否展示默认密码
- 自定义角色描述字段是否一期展示

**验收标准**

- 以下 11 个需求单元全部可追踪到官方文档、原型、仓库合同：
  - 用户列表
  - 添加用户
  - 批量导入用户
  - 编辑用户
  - 重置密码
  - 删除用户
  - 查询用户
  - 角色列表
  - 角色添加用户
  - 角色移除用户
  - 创建自定义角色
- 每个需求单元都有 `当前现状 / 复刻基线 / 适配建议`

### 阶段 B：接口与交互对齐

**目标**

- 在不改动现有合同的前提下，找出前后端落地时必须补齐的差异。

**输出**

- 用户管理接口差异清单
- 原型缺口清单
- 权限依赖清单

**重点检查**

- 本模块到底是：
  - 继续走远端 `plugin/X-Pack` 组件注入
  - 还是开始在当前仓库落本地 Vue 页面与本地服务实现
- `UserCreator` 没有 `orgId`，组织来自上下文是否可满足系统管理员场景
- `RoleCreator.typeCode` 是否足以表达“继承角色”
- `beforeUnmountInfo` 返回值与前端三类风险提示是否一一映射
- 外部用户搜索与挂载链路是否需要新增前端承载页

**验收标准**

- 每个差异项都被归类为：
  - 保持现状
  - 调整原型
  - 调整接口
  - 后置
- 前端承载边界已明确为“远端插件”或“本地实现”二选一，不能带着歧义进入编码

### 阶段 C：研发实现切片

**目标**

- 在“前端承载边界”和“关键产品决策”都冻结后，再把用户管理拆成可以顺序实施的研发任务。

**推荐任务顺序**

1. 冻结前端承载方式：远端插件 or 本地页面
2. 冻结组织归属策略、外部用户范围、角色移除提示规则
3. 用户列表与查询
4. 添加/编辑用户
5. 删除、启停、重置密码
6. 批量导入与结果反馈
7. 角色列表
8. 角色添加/移除用户
9. 创建自定义角色
10. 权限联动与组织上下文验收

**每个任务都必须包含**

- 页面入口
- API 映射
- 权限要求
- 状态流转
- 验收场景

### `remote/plugin-first` 切片矩阵

| 切片项 | 当前是否可切 | 前置依赖 | 验收口径 |
| --- | --- | --- | --- |
| 宿主侧路由入口、插件加载壳、权限入口对齐 | 可切 | 前端承载方式冻结为 `remote/plugin-first` | 能明确 `/system` 用户管理入口由插件壳承接，而不是本地页面直出 |
| 远端插件内用户列表、查询、分页、筛选 | 可切 | 当前组织上下文策略冻结 | 按当前组织视角完成列表与筛选闭环 |
| 远端插件内新增/编辑用户 | 可切 | 组织归属保持隐式上下文；当前组织提示口径冻结 | 新增/编辑不扩 `orgId`，并显式提示当前组织 |
| 远端插件内删除、启停、重置密码 | 部分可切 | 重置密码展示策略至少冻结为“仅确认恢复为初始密码”或“展示默认密码”二选一 | 删除、启停可直接验收；重置密码按已冻结口径验收 |
| 远端插件内批量导入与导入结果 | 可切 | 导入模板、错误报告、部分成功口径保持当前合同 | 支持模板下载、导入、错误报告下载 |
| 远端插件内角色列表、角色添加组织用户 | 可切 | 外部用户范围明确为“本期是否后置” | 先完成组织用户链路闭环 |
| 远端插件内角色移除用户 | 不可切 | `beforeUnmountInfo` 数值语义冻结 | 三类提示文案与返回值一一对应 |
| 远端插件内外部用户完整流转 | 不可切 | 外部用户原型补齐、最小验收口径冻结 | 可精确搜索并完成挂载闭环 |
| 远端插件内创建自定义角色 | 部分可切 | `typeCode` 映射冻结；`desc` 是否一期展示冻结 | 一期至少完成“名称 + 继承类型”创建闭环 |
| 当前仓库本地 Vue 页面搭建 | 不可切 | 只有在承载方式改判为本地页面化时才成立 | 本轮不进入此类任务 |

### 阶段 D：联调与验收

**目标**

- 验证用户、组织、角色、权限四条链路在同一模块内闭环。

**核心验收场景**

1. 系统管理员切换组织后新增用户并分配多个角色
2. 组织管理员仅能管理当前组织用户
3. 查询条件组合筛选正确生效
4. 批量导入出现部分成功并能下载错误报告
5. 从角色移除用户时正确出现三类影响提示
6. 创建自定义角色后可进入权限配置继续授权

## 4. 风险清单

| 风险 | 说明 | 处理策略 |
| --- | --- | --- |
| 组织归属表达不一致 | 官方文档偏“先选组织再新增”，原型与接口偏“当前组织隐式上下文” | 先冻结交互策略，再写代码 |
| 本地缺失页面实现 | 当前仓库只有 API 合同和插件加载壳层 | 不直接按“已有页面改造”估算工期 |
| 外部用户流程原型不完整 | 只有组织用户双栏选择弹窗 | 先补原型，再切研发任务 |
| 角色移除影响复杂 | 会影响组织归属甚至系统内账号删除 | 一期必须保留预判接口与分级提示 |

## 5. Subagent-Driven 执行方式

### 5.1 本轮立即执行

1. 由主执行线程产出 `source inventory`
2. 由主执行线程产出 `详细需求分析`
3. 由主执行线程产出 `单模块执行计划`
4. 再交给子代理做两轮校验：
   - 事实一致性校验
   - 可实施性校验

### 5.2 下轮进入研发前必须先冻结的 gating decisions

- 前端承载方式：
  - 继续复用远端 `plugin/X-Pack` 页面
  - 还是在当前仓库新增本地 `Vue` 页面
- 用户新增组织归属：
  - 保持“切换组织后新增”
  - 还是扩展为显式组织字段
- 外部用户范围：
  - 一期纳入
  - 还是只做组织内用户
- 角色移除提示：
  - `beforeUnmountInfo` 返回值与三类风险文案映射冻结

### 5.3 下轮进入研发时的子任务切分建议

- 子任务 1：用户列表、查询、分页、筛选
- 子任务 2：新增/编辑、删除、启停、重置密码
- 子任务 3：批量导入与结果反馈
- 子任务 4：角色列表、角色加人、角色移人、创建自定义角色
- 子任务 5：权限联动与组织上下文验收

### 5.5 当前进入下轮前的最小冻结包

- 已冻结：
  - `remote/plugin-first`
  - 新增用户保持当前组织隐式上下文
- 推荐冻结：
  - 外部用户本期不做完整独立流转，但保留同入口扩展能力
  - 自定义角色 `desc` 不阻塞一期创建主链路
- 必须补确认后才可编码：
  - `beforeUnmountInfo` 数值映射
  - 重置密码是否展示默认密码

### 5.4 完成判定

- 三份分析文档已冻结
- 模块决策点已收敛，尤其是前端承载边界已明确
- 研发切片可直接进入工期评估或编码拆单
