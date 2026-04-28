# 用户管理阶段 B 差异与决策清单

## 1. 文档目标

- 本文档承接用户管理单模块分析后的阶段 B。
- 目标不是重复需求描述，而是显式列出会阻塞研发拆单的差异、缺口和前置决策。
- 结论输出给产品、设计、研发三方共同使用。

## 2. 先行结论

### 2.1 前端承载边界

- 当前推荐结论：`remote/plugin-first`
- 原因：
  - 路由生成逻辑会把 `plugin` 路由统一改写成 `components/plugin` 壳组件，并把真实组件名作为 `jsname` 透传，而不是直接落本地 Vue 页面。
  - 插件壳组件会从 `window['DEXPack']` 或远端分布式脚本中动态加载 X-Pack 组件。
  - `DEXPackTs.umd.js` 也通过远端地址动态引入。
  - 当前仓库没有本地 `/system` 用户管理页面实现，`de-xpack` 目录也为空。

### 2.2 阶段 B 总体判断

- 用户管理现在不是“直接开始写本地页面”的状态。
- 在进入实现切片前，必须先冻结：
  - 前端承载方式
  - 组织归属表达方式
  - 外部用户是否一期纳入
  - 角色移除影响提示的返回值映射

## 3. 前端承载边界证据

| 证据点 | 文件 | 结论 |
| --- | --- | --- |
| `plugin` 路由改写为统一插件壳 | `core/core-frontend/src/router/establish.ts:19-25` | 插件路由不是本地页面优先，而是运行时委托 |
| 插件壳运行时从 `window['DEXPack']` 取组件 | `core/core-frontend/src/components/plugin/src/index.vue:56-60` | 真实页面来自远端 X-Pack |
| 分布式模式下拉远端脚本并执行 | `core/core-frontend/src/components/plugin/src/index.vue:120-139` | 当前设计就是远端注入 |
| `DEXPackTs.umd.js` 远端动态加载 | `core/core-frontend/src/components/plugin/src/ImportXpackTool.ts:11-12`, `49-60` | X-Pack 工具层也依赖远端产物 |
| 组织管理中心入口只负责跳 `/system` | `core/core-frontend/src/layout/components/SystemCfg.vue:11-15` | 入口存在，但不证明本地拥有页面 |
| 头部激活态写死 `/system/user` | `core/core-frontend/src/layout/components/Header.vue:50-54` | 只说明 UI 期待存在系统树 |
| 静态路由表未见本地 `/system` 页面树 | `core/core-frontend/src/router/index.ts:192-221` | 本地静态路由未承接用户管理主体页面 |

## 4. 阻塞项分组

### 4.1 产品决策阻塞项

#### P1. 新增用户的组织归属表达方式未冻结

- 现状：
  - 官方文档是“先选择组织，再在该组织下新增用户”
  - 当前合同 `UserCreator` 不携带 `orgId`
  - 当前仓库通过 `switchOrg` 单独切换组织上下文
- 证据：
  - `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/dto/UserCreator.java:14-37`
  - `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/api/UserApi.java:110-121`
  - `core/core-frontend/src/api/user.ts:3-6`
- 决策需求：
  - 保持“切换组织后新增”
  - 或扩展为“显式组织字段”
- 当前建议：
  - 保持隐式当前组织，除非后续确认要改合同

#### P2. 外部用户是否纳入一期未冻结

- 现状：
  - 官方文档明确区分“添加组织用户”和“添加外部用户”
  - 仓库已有外部用户搜索与挂载接口
  - locale 已有 `添加外部用户` 文案
  - Calicat 当前只提供了“添加组织用户”双栏选择原型
- 证据：
  - `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/role/api/RoleApi.java:50-57`
  - `core/core-frontend/src/api/user.ts:52-57`
  - `core/core-frontend/src/locales/zh-CN.ts:996-1000`
- 决策需求：
  - 一期一起做双流转
  - 还是一期只做组织用户
- 当前建议：
  - 如果目标是严格复刻官方能力，外部用户不能完全删掉；至少要保留入口并补原型

#### P3. 角色移除影响提示的业务映射未冻结

- 现状：
  - 官方文档明确存在三类影响
  - locale 已有“从当前组织移除 / 从系统删除”文案
  - 合同 `beforeUnmountInfo` 只有 `Integer`，没有公开语义枚举
- 证据：
  - `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/role/api/RoleApi.java:83-85`
  - `core/core-frontend/src/locales/zh-CN.ts:986-990`
- 决策需求：
  - 明确 `Integer` 返回值与 3 类提示文案的映射表
- 当前建议：
  - 在编码前先冻结返回值语义，否则前端实现会猜协议

### 4.2 合同差异项

#### C1. 原型存在“所属组织”列，但当前列表合同不返回该字段

- 现状：
  - Calicat 用户列表展示了 `所属组织`
  - 当前 `UserGridVO` 无组织字段
- 证据：
  - `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/vo/UserGridVO.java:10-36`
- 影响：
  - 不能把“所属组织列”当作现有合同可直接落地字段
- 当前建议：
  - 先按“当前组织视角”理解列表
  - 如要显示该列，需要新增合同字段或改查询模型

#### C2. 第三方用户创建合同存在，但尚未形成基础新增流程

- 现状：
  - `UserApi` 已支持 `createPlatform`
  - `PlatformUserCreator` 通过 `origin` 表达第三方来源
  - 当前 `core/core-frontend/src/api/user.ts` 没有 `createPlatform` 包装方法
  - 现有新增用户弹窗仍按基础本地用户模型分析
- 证据：
  - `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/api/UserApi.java:68-71`
  - `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/user/dto/PlatformUserCreator.java:8-13`
  - `core/core-frontend/src/api/user.ts:24-84`
- 影响：
  - 第三方来源能力当前只有后端合同，没有现成前端调用层
  - 不能直接混进基础新增表单而不做交互区分

#### C3. 自定义角色创建的“继承关系”是 `typeCode`，不是完整父角色对象

- 现状：
  - 原型使用“角色类型”单选
  - 合同 `RoleCreator` 只有 `typeCode`
- 证据：
  - `sdk/api/api-permissions/src/main/java/io/dataease/api/permissions/role/dto/RoleCreator.java:15-23`
- 影响：
  - 目前更适合“继承普通用户/组织管理员”的单选，而不是复杂父角色选择器

### 4.3 原型缺口项

#### D1. 添加外部用户原型缺失

- 现状：
  - 官方文档有双流转
  - 当前原型只画出“添加组织用户”双栏选择
- 影响：
  - 无法直接给研发明确外部用户交互承载形态
- 当前建议：
  - 补一张“添加外部用户”弹窗或在现有弹窗中补 tab/切换态

#### D2. 新增用户弹窗未显式表达组织上下文

- 现状：
  - 原型中没有“所属组织”字段
  - 但官方文档强调新增前需要先选择组织
- 影响：
  - 系统管理员场景下，如果用户忘记当前组织，容易误创建
- 当前建议：
  - 在弹窗顶部提示条或标题区显式展示“当前组织”

### 4.4 实施边界缺口项

#### I1. 当前仓库没有本地用户管理页面实现

- 现状：
  - 当前只看到了 API 包装层、插件壳、路由改写机制、入口按钮
  - 没看到本地 `/views/system/user/...` 之类页面
- 影响：
  - 不能按“修改现有本地页”估算；若决定本地化，需要重新确定页面归属和目录结构

#### I2. 社区占位实现无法支撑用户管理落地

- 现状：
  - fallback 仅覆盖 `/user/info`、`/user/personInfo`、`/user/ipInfo`、`/org/mounted`
- 证据：
  - `core/core-backend/src/main/java/io/dataease/substitute/permissions/user/SubstituteUserServer.java`
  - `core/core-backend/src/main/java/io/dataease/substitute/permissions/org/SubstituleOrgServer.java`
- 影响：
  - 即使前端本地化，也不能假设当前后端可在无 X-Pack 场景下直接跑通

## 5. 决策矩阵

| 主题 | 选项 A | 选项 B | 当前建议 |
| --- | --- | --- | --- |
| 前端承载 | 继续远端插件/X-Pack | 当前仓库本地页面化 | 先按 `remote/plugin-first` |
| 组织归属 | 切换组织后新增 | 新增表单显式组织字段 | 先保留切组织模式 |
| 外部用户 | 一期纳入 | 一期后置 | 若目标是复刻官方，至少保留入口并补原型 |
| 角色移除提示 | 前端猜测 `Integer` 含义 | 冻结枚举映射 | 必须先冻结映射 |
| 所属组织列 | 直接展示 | 暂不展示或补合同 | 先按当前合同不展示 |

## 6. 阶段 B 输出结论

### 6.1 可以直接进入研发拆分的内容

- 用户列表基础查询、筛选、分页
- 新增/编辑用户的基础字段
- 删除、启停、重置密码
- 角色列表基础结构
- 创建自定义角色的基础单选模式

### 6.2 不能直接进入研发拆分的内容

- 本地页面化实施
- 外部用户完整流转
- 角色移除风险提示实现
- 所属组织列表字段展示

## 7. 下一步建议

1. 先做一次 30 分钟决策评审，只讨论本文件第 5 节的 5 个决策点。
2. 如果结论保持 `remote/plugin-first`，下一步应改为评估远端 X-Pack 模块接管点，而不是直接在当前仓库建本地页面。
3. 如果结论改为“本地页面化”，则需要先补一份本地页面承载设计，再重写用户管理实施切片。
