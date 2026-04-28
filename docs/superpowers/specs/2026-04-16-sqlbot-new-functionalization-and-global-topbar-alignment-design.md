# SQLBot New 功能化与全局菜单头体验对齐设计

## 背景

当前 `sqlbot-new` 已经基于 Calicat 原型完成了一套高保真前端页面，包括：

- 首页态
- 结果页
- 选择数据弹窗
- 文件上传两步弹窗
- 文件详情预览弹窗
- 左侧导航树
- 顶部菜单头雏形

但它仍然主要是原型页，尚未真正完成两件关键工作：

1. 复用 DataEase 现有智能问数服务能力，完成 `sqlbot-new` 的完整功能化。
2. 让全局菜单头在体验、效果、图标、字体、样式、交互上与 `sqlbot-new` 菜单头 1:1 对齐。

同时，用户已经明确了新的边界：

- 不要求全局头部强制替换成 `sqlbot-new` 同一个组件壳
- 但全局头部体验必须与 `sqlbot-new` 头部完全对齐
- 覆盖范围包括：桌面、系统页、登录页、移动端、嵌入页
- `sqlbot-new` 要达到旧智能问数能力的完整平替级别
- 最终 `/sqlbot/index` 应跳转到 `/sqlbotnew`

## 目标

### 业务目标

- 将 `sqlbot-new` 从静态原型页升级为可上线的新智能问数入口。
- 复用旧智能问数能力，而不是重写后端链路。
- 把全局各类菜单头体验统一到 `sqlbot-new` 的头部设计效果。

### 交付目标

- `sqlbot-new` 支持真实资源选择、问数、历史、推荐、图表、数据解读、文件问数闭环。
- 旧 `/sqlbot/index` 在最终切换时跳转到 `/sqlbotnew`。
- 全局菜单头的体验风格统一，但可以保留多套内部实现。

## 非目标

本轮不做以下工作：

- 不重写 SQLBot 后端协议。
- 不做数据库迁移。
- 不删除旧 `/sqlbot/index` 的代码文件。
- 不扩展 `报告 / 搭建 / 搜索` 为真实业务模块。
- 不要求全局头部必须收敛到一个共享 Vue 组件实现。

## 决策边界

### 已确认边界

- `sqlbot-new` 功能目标按“完整平替”收口。
- `/sqlbot/index` 最终跳转到 `/sqlbotnew`。
- 全局头部体验全部对齐到 `sqlbot-new` 风格。
- 可以保留 `Header.vue`、`HeaderSystem.vue`、登录头部、移动端头部、嵌入页头部的内部实现差异，只要求体验统一。

### 允许实现侧直接决定

- 哪些旧逻辑抽成 composable，哪些先保留在旧页中适配复用。
- 全局头部体验对齐时采用“共享 token + 各自实现”还是“共享局部子组件 + 各自壳层”的混合方式。
- `sqlbot-new` 页面内部状态层拆分粒度。

### 需要再次确认的情况

- 如果全局头部体验对齐后影响到移动端或嵌入页的结构约束。
- 如果旧 `/sqlbot/index` 跳转策略需要分阶段灰度而不是一次切换。

## 方案比较

### 方案 1：`sqlbot-new` 功能化 + 全局头部体验对齐

做法：

- 复用旧智能问数服务链完成功能化。
- 不替换全局头部为同一组件，但统一体验。

优点：

- 满足用户目标。
- 比全局布局壳重构的风险更低。
- 可以并行推进页面功能化和头部体验对齐。

缺点：

- 需要维护多套头部实现的一致性。

### 方案 2：全局头部组件统一重构

做法：

- 所有头部都切到同一组件壳。

优点：

- 后续维护成本最低。

缺点：

- 当前改动面过大。
- 与用户刚确认的边界不完全一致。

### 方案 3：只做 `sqlbot-new` 功能化，不统一头部体验

优点：

- 短期交付最快。

缺点：

- 和当前目标不符。
- 全局仍然体验割裂。

### 推荐方案

采用 **方案 1：`sqlbot-new` 功能化 + 全局头部体验对齐**。

这是当前成本、风险、目标一致性最平衡的方案。

## 设计分层

### 一、`sqlbot-new` 原型页功能域

负责让现有 `sqlbot-new` 页面结构承载真实业务状态。

包含：

- 首页态
- 结果页
- 左侧导航树
- 选择数据弹窗
- 文件上传两步
- 文件详情预览

要求：

- 保留已确认的原型结构与交互节奏
- 替换所有 mock 状态

### 二、旧智能问数能力复用域

负责把旧 `/sqlbot/index` 背后的成熟能力迁移成可复用能力。

主要来源：

- `dataease/core/core-frontend/src/views/sqlbot/index.vue`
- `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
- `dataease/core/core-frontend/src/views/sqlbot/queryContext.ts`
- `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
- `dataease/core/core-frontend/src/views/sqlbot/NativeChartPreview.vue`

主要复用能力：

- 运行模型加载
- datasource 解析
- assistant token / certificate
- chat 创建
- SSE 流式问答
- chart hydrate
- 推荐问题加载
- 数据解读
- 追加提问
- 历史恢复

### 三、全局头部体验对齐域

目标：

- 所有头部体验与 `sqlbot-new` 顶部菜单头 1:1 对齐

覆盖范围：

- `Header.vue`
- `HeaderSystem.vue`
- 登录页头部
- 移动端头部
- 嵌入页头部

对齐内容：

- 品牌区图标与文案样式
- 菜单排布与激活态
- 字体、字号、字重
- 间距、圆角、背景、阴影
- 右侧用户区图标与交互反馈

说明：

- 允许内部实现不同
- 但最终视觉和交互体验必须一致

### 四、路由切换与兼容域

目标：

- 将 `sqlbot-new` 设为新主入口
- 保留旧代码兜底

策略：

- `#/sqlbotnew` 作为新页面主入口
- 最终 `#/sqlbot/index` 跳转到 `#/sqlbotnew`
- 旧文件保留，不立即删除

## 当前代码现状

### `sqlbot-new`

当前主要位于：

- `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- `dataease/core/core-frontend/src/views/sqlbot-new/components/*`

它已具备：

- 原型结构
- 页面视觉
- 弹窗静态交互

但仍未具备：

- 真实历史
- 真实推荐
- 真实聊天流
- 真实文件上传与恢复

### 旧智能问数页

旧能力主要集中在：

- `dataease/core/core-frontend/src/views/sqlbot/index.vue`

这里目前耦合度高，但功能最完整，因此要：

- 复用行为
- 抽离公共能力
- 避免直接复制成第二份巨型页面逻辑

### 全局头部

当前布局层在：

- `dataease/core/core-frontend/src/layout/index.vue`

头部实际是两套分流：

- `Header.vue`
- `HeaderSystem.vue`

这意味着本轮不能只改 `sqlbot-new` 头部，必须把全局对齐纳入实施。

## 关键设计规则

### 推荐问题规则

- 首页不展示推荐问题
- 结果页首轮问数完成后展示推荐问题
- 推荐问题只绑定当前活动结果

### 历史规则

- 左侧树保留“最近问数 / 历史问数”
- 历史来源必须是真实 SQLBot 会话
- 点击历史后恢复 selection context 与结果区

### 文件问数规则

- 文件上传不是演示
- 上传、预览、详情、提问必须是真闭环

### 结果卡规则

- 保留旧问数页成熟业务能力
- 结果卡外壳可以适配原型页布局
- 能力不降级

## 验收标准

### `sqlbot-new`

- 首页支持数据集问数与文件问数
- 结果页支持真实流式结果
- 图表、推荐问题、数据解读、追加提问可用
- 左侧历史树使用真实历史
- 文件上传链路可闭环

### 路由

- `/sqlbot/index` 跳转到 `/sqlbotnew`
- 旧页代码保留

### 全局头部体验

- 桌面端主站头部对齐
- 系统页头部对齐
- 登录页头部对齐
- 移动端头部对齐
- 嵌入页头部对齐

### 兼容

- Dashboard / DataV / Dataset / 系统设置等页面不丢旧头部能力
- 旧智能问数链路不回归

## 风险与控制

### 风险 1：旧问数页逻辑过于集中

控制：

- 优先抽 transport / state / helper
- 少复制，多复用

### 风险 2：全局头部体验统一影响面广

控制：

- 不做强制组件统一
- 先建立视觉合同，再逐类页面对齐

### 风险 3：`sqlbot-new` 页面继续膨胀

控制：

- 拆运行时状态层
- `index.vue` 只负责编排

## 建议实施顺序

1. 定义 `sqlbot-new` 运行时状态层
2. 接资源选择与模型能力
3. 接问数会话与结果流
4. 接推荐问题、解读、追问、更多动作
5. 接历史恢复
6. 接文件问数闭环
7. 让 `/sqlbot/index` 跳转到 `/sqlbotnew`
8. 做全局头部体验统一
9. 做全局回归

## 自检

- 无占位语句
- 设计边界已经覆盖 `sqlbot-new` 功能化与全局头部体验统一
- 没有再误把“全局组件统一重构”当成强制目标

## Final Closure Status

- 已完成：
  - `sqlbot-new` 首页、数据集问数、推荐问题链路、数据解读请求、历史删除、清空确认、文件对话框入口与文件预览闭环
  - `/sqlbot/index` 到 `/sqlbotnew` 的主流程切换
  - 高分辨率布局比例与全局头部对齐收口
- 仍未完全关闭：
  - `追加追问` 在真实成功结果卡上的 textarea 回填存在回归，最终验收记为 FAIL
  - `ts:check` 仍受既有 `src/views/watermark/index.vue.js` 的 `TS6504` 影响，不属于本次任务新增问题
