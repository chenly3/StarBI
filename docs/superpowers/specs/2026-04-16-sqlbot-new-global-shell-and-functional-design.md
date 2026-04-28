# SQLBot New 全局壳与功能化设计

## 背景

当前 `sqlbot-new` 已经完成了基于 Calicat 原型的前端页面搭建，包括：

- 首页态
- 结果页
- 选择数据弹窗
- 文件上传两步弹窗
- 文件详情预览弹窗
- `sqlbot-new` 专属顶部菜单头雏形

但现阶段仍然主要停留在“高保真原型页”层面，存在两个根本问题：

1. `sqlbot-new` 还没有真正接上 DataEase 现有智能问数的完整服务能力，页面主体仍有大量模拟状态和临时数据。
2. `sqlbot-new` 的顶部菜单头还只是局部页面壳，没有替换现有全局菜单头体系，导致全局布局壳仍然分裂为多套实现。

本次设计的目标不是继续微调单页样式，而是把 `sqlbot-new` 明确升级为：

**“新原型壳 + 复用旧智能问数能力 + 全局统一菜单头壳”的完整产品化方案。**

## 目标

### 业务目标

- 让 `#/sqlbotnew` 从静态原型页升级为真正可用的智能问数入口。
- 复用 DataEase 当前智能问数链路和 SQLBot 服务能力，不重写后端协议和核心服务逻辑。
- 将 `sqlbot-new` 顶部菜单头升级为全局统一菜单头壳，替换现有普通页和系统页两套顶部壳。

### 用户目标

- 用户进入 `sqlbot-new` 后，看到的是完整可用的新体验，而不是“能看不能用”的原型页。
- 用户在全局任意页面都使用同一套顶部菜单头壳，避免体验割裂。
- 用户在 `sqlbot-new` 中可完成数据选择、文件上传、提问、看图、追加追问、历史恢复等完整闭环。

## 非目标

本轮明确不做以下事情：

- 不删除旧版 `/sqlbot/index` 页面。
- 不重写 SQLBot 后端问答、推荐、分析、历史数据库结构。
- 不在本轮完成 `报告 / 搭建 / 搜索` 三个 tab 的真实业务功能。
- 不做大范围视觉体系重构，除非为接入真实功能所必需。

## 决策边界

以下事项在本轮可以由实现侧直接决定，无需再次逐项确认：

- `sqlbot-new` 的功能化优先复用旧版问数页已经验证过的前端能力逻辑。
- 顶部菜单头统一使用 `sqlbot-new` 的新壳组件风格。
- 历史对话、推荐问题、数据解读、追加提问的能力来源继续沿用现有 SQLBot 服务接口。
- `sqlbot-new` 继续保留独立路由 `#/sqlbotnew`。

以下事项若实现中发现冲突，必须回到用户确认：

- 是否彻底下线旧 `/sqlbot/index`。
- 是否把新菜单头壳推广到移动端或特殊嵌入页。
- 是否扩展 `报告 / 搭建 / 搜索` 为真实业务模块。

## 范围重定义

本项目实施范围重定义为五层：

### 1. 全局布局壳层

涉及 DataEase 全局布局和顶部头部接入方式。

目标：

- 不再维持当前 `Header.vue` 和 `HeaderSystem.vue` 两套头部体系。
- 全局页面统一走 `sqlbot-new` 风格的菜单头壳。

### 2. 顶部菜单头层

以现有 `SqlbotNewTopbar.vue` 为基础，升级为全局通用头部壳组件。

目标：

- 接管普通业务页和系统页顶部头部。
- 保留旧头部能力，而不是只替换外观。

### 3. `sqlbot-new` 原型页层

包含：

- 首页态
- 结果页
- 左侧导航
- 选择数据弹窗
- 文件上传两步
- 文件详情预览

目标：

- 保留已经确认的原型结构与交互节奏。
- 用真实业务状态替换模拟数据。

### 4. 旧智能问数能力复用层

复用现有：

- DataEase 前端问数能力状态机
- SQLBot 直连传输层
- chart / analysis / history / recommend 等服务能力

目标：

- 不重写成熟逻辑，只做适配和抽取。

### 5. 回归与兼容层

目标：

- 新壳上线后全局页面不丢旧能力。
- `sqlbot-new` 完整功能化后，旧 `/sqlbot/index` 仍可并行保留。

## 现状分析

### 现有 `sqlbot-new` 前端状态

当前 `sqlbot-new` 主要集中在：

- `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- `dataease/core/core-frontend/src/views/sqlbot-new/components/*`

它已经完成：

- 高保真页面结构
- 左侧导航树
- 顶部独立菜单头雏形
- 结果页与提问卡布局
- 弹窗链路静态交互

但仍然是：

- 模拟历史数据
- 模拟结果卡内容
- 模拟推荐问题
- 模拟数据文件列表与上传结果

### 现有旧版智能问数能力来源

当前可复用的核心能力集中在：

- `dataease/core/core-frontend/src/views/sqlbot/index.vue`
- `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
- `dataease/core/core-frontend/src/views/sqlbot/queryContext.ts`
- `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
- `dataease/core/core-frontend/src/views/sqlbot/NativeChartPreview.vue`

这些能力已经覆盖：

- 模型加载
- 数据集/文件资源选择
- datasource 解析
- assistant token / certificate 获取
- chat 创建
- SSE 流式回答
- chart 数据补齐
- 推荐问题加载
- 数据解读
- 追加提问
- 历史列表与历史恢复

### 当前全局顶部壳现状

当前 DataEase 全局布局在：

- `dataease/core/core-frontend/src/layout/index.vue`

这里仍然分流使用：

- `Header.vue`
- `HeaderSystem.vue`

这意味着顶部壳现在天然分裂，不满足“全局统一使用 sqlbot-new 头壳”的目标。

## 方案比较

### 方案 A：统一替换全局壳 + 复用旧问数能力

做法：

- 先统一顶部菜单头壳
- 再把 `sqlbot-new` 接入旧智能问数链路

优点：

- 真正符合项目目标
- 边界清晰
- 避免后续二次返工头部壳

风险：

- 改动面大
- 需要更严格的全局回归

### 方案 B：先做 `sqlbot-new` 功能化，再晚些替换全局壳

优点：

- 短期交付快

缺点：

- 头部仍然会双轨并存
- 后续还要返工一次全局布局壳

### 方案 C：完全重写 `sqlbot-new` 的业务层，不复用旧能力

优点：

- 新页面结构会最纯粹

缺点：

- 风险最高
- 重复造轮子
- 容易丢失旧页已经稳定运行的行为细节

### 推荐方案

采用 **方案 A：统一替换全局壳 + 复用旧问数能力**。

这是唯一同时满足：

- 新原型页真正功能化
- 全局菜单头壳统一
- 旧能力继续复用

的方案。

## 设计方案

### 一、全局菜单头统一壳

把 `SqlbotNewTopbar.vue` 升级为全局通用头部壳组件，统一替换：

- `Header.vue`
- `HeaderSystem.vue`

新壳需要迁移旧能力：

- 动态菜单生成
- 路由高亮
- 工作台跳转
- 右侧账号区
- 下载/导出入口
- 系统类页面标题表达

新壳本身不应绑定 `sqlbot-new` 页面专有状态，而应成为 layout 级别组件。

### 二、`sqlbot-new` 页面功能化方式

不建议继续把所有逻辑塞进 `index.vue`。

应抽出三类运行时模块：

- 资源选择状态层
- 会话/消息状态层
- 历史状态层

这样 `index.vue` 只负责原型结构编排。

### 三、旧问数能力接入方式

旧 `/sqlbot/index` 中成熟能力不做重写，而是迁移为可复用能力模块：

- 模型加载
- datasource 解析
- submit question
- SSE stream
- chart hydrate
- recommend question
- history restore

能直接复用 transport/helper 的地方复用：

- `sqlbotDirect.ts`
- `queryContext.ts`

能直接复用 UI 业务组件的地方复用：

- `StarbiResultCard.vue`
- `NativeChartPreview.vue`

### 四、历史与推荐规则

必须保持当前已确认边界：

- 首页不展示推荐问题
- 结果页首轮问数完成后展示推荐问题
- 推荐问题只绑定当前活动结果
- 左侧历史树分为“最近问数 / 历史问数”

### 五、文件问数闭环

文件问数链路必须从静态演示改成真实闭环：

- 选择文件
- 上传文件
- 预览数据
- 文件详情
- 进入结果页提问

## 接受标准

### 顶部菜单头

- 全局页面都走新壳
- 旧头部能力保留
- 不再出现旧 `Header` / `HeaderSystem` 双轨并存

### `sqlbot-new`

- 首页态可真实选择资源和模型
- 首次问数后进入结果页
- 结果页可显示真实结果卡
- 结果页可显示真实推荐问题
- 左侧历史树可恢复真实会话
- 数据解读/追加提问/更多仍可用

### 兼容性

- 旧 `/sqlbot/index` 不回归
- Dashboard / DataV / Dataset / 系统页 顶部头部替换后不丢功能

## 风险与控制

### 风险 1：全局壳替换影响面过大

控制方式：

- 先抽象统一壳，再替换 layout 接入点
- 做全局回归矩阵

### 风险 2：旧页逻辑过于集中，迁移难度高

控制方式：

- 不直接复制 `sqlbot/index.vue`
- 优先抽 helper/composable
- UI 与 transport 拆开迁移

### 风险 3：`sqlbot-new` 原型壳和真实能力耦合后再次膨胀

控制方式：

- 运行时状态拆层
- `index.vue` 只做页面编排

## 实施顺序建议

1. 统一顶部菜单头壳
2. 让 `/sqlbotnew` 接回全局 layout
3. 抽 `sqlbot-new` 运行时状态层
4. 接模型与资源选择能力
5. 接问数会话与流式结果能力
6. 接历史恢复与推荐问题能力
7. 接文件上传与文件问数闭环
8. 做全局回归

## 自检

- 没有留下 `TBD` 或模糊占位
- 设计边界已经覆盖“页面壳 + 顶部菜单头 + 原型页功能化 + 旧能力复用”
- 与之前错误边界相比，这次明确把“全局菜单头替换”纳入主范围
