# SQLBot New 数据库持久化历史设计

## 1. 背景

当前 `sqlbot-new` 的历史增强语义并没有完整下沉到 SQLBot 数据库，而是依赖前端 `localStorage/wsCache` 做补充持久化。这样会导致两个根本问题：

- 浏览器缓存成为历史真源，换浏览器、清缓存、换自动化 session 后历史会丢。
- SQLBot 数据库只保存基础 `Chat/ChatRecord`，但 `sqlbot-new` 新增的多数据源切换、当前活跃上下文、文件恢复态等语义无法从数据库还原。

SQLBot 后端本身已经具备基础问数历史数据库持久化能力：

- `chat` 表保存会话级基础信息
- `chat_record` 表保存每轮问答记录

但 `sqlbot-new` 的增强历史语义目前仍停留在前端缓存层，这与“历史应由数据库持久化”的目标不一致。

## 2. 目标

- 让 `sqlbot-new` 的历史真源切换到 SQLBot 数据库。
- 仅覆盖 `sqlbot-new` 的增强历史语义，不改老 `sqlbot` 页面行为。
- 新会话从改造上线后开始走数据库持久化；不迁移历史浏览器缓存。
- 同时支持：
  - 左侧历史列表数据库化
  - 多数据源上下文切换数据库化
  - 文件问数上下文恢复数据库化
  - 恢复后继续追问沿用最后激活上下文

## 3. 非目标

- 不迁移用户现有浏览器缓存历史到数据库。
- 不重构老 `sqlbot` 的历史接口和页面。
- 不修改 `chat/chat_record` 既有基础语义。
- 不把浏览器自动化工具的 session 持久化问题当成产品能力的一部分处理。

## 4. 现状问题

### 4.1 现有数据库能力

SQLBot 后端已持久化：

- `chat`
  - `id`
  - `brief`
  - `datasource`
  - `engine_type`
  - `create_time`
  - `create_by`
- `chat_record`
  - `chat_id`
  - `question`
  - `sql_answer`
  - `chart_answer`
  - `data`
  - `chart`
  - `analysis`
  - `error`
  - `finish`
  - `datasource`
  - `ai_modal_id`

这些能力足够支撑老 `sqlbot` 的基础历史，但不足以恢复 `sqlbot-new` 的增强语义。

### 4.2 现有前端增强历史语义

`sqlbot-new` 目前在前端缓存中额外维护：

- `activeExecutionContext`
- `selectionTitle`
- `selectionMeta`
- `context-switch` 记录
- 文件问数恢复态
- 前端推导出的历史标题/副标题

这些数据当前通过：

- `HISTORY_SESSION_STORAGE_PREFIX`
- `readHistorySessionSnapshot`
- `writeHistorySessionSnapshot`

写入浏览器缓存，而不是数据库。

### 4.3 当前根因

问题根因不是 SQLBot 完全没有数据库历史能力，而是：

- SQLBot 数据库只覆盖基础历史
- `sqlbot-new` 的增强历史语义没有下沉到数据库
- 前端只能用页面缓存补齐增强语义

## 5. 总体方案

采用 `事件流 + 最新快照` 双持久化方案，SQLBot 数据库作为 `sqlbot-new` 历史唯一真源。

原则：

- `chat/chat_record` 保留老 SQLBot 原义，不硬塞增强字段。
- 新增专门服务 `sqlbot-new` 的两张表。
- `snapshot` 负责快速恢复和当前上下文。
- `event` 负责可追溯的上下文切换和回放。
- 前端只保留运行时内存态，不再把浏览器缓存当历史真源。

## 6. 数据库设计

### 6.1 表一：`chat_session_snapshot`

用途：每个 `chat_id` 一份最新恢复态，负责历史列表和恢复后继续追问。

建议字段：

- `chat_id`
  - 主键
  - 外键指向 `chat.id`
- `client_type`
  - 固定值：`sqlbot_new`
- `active_source_kind`
  - `dataset` / `file`
- `active_source_id`
- `active_datasource_id`
- `active_model_id`
- `active_theme_id`
- `active_theme_name`
- `selection_title`
- `selection_meta`
- `datasource_pending`
- `latest_record_id`
- `latest_question`
- `snapshot_version`
- `create_by`
- `create_time`
- `update_time`

设计意图：

- 左侧历史树不再自己拼标题、副标题，而是直接读这里。
- 恢复会话时，输入区当前选中数据也直接从这里恢复。
- `snapshot_version` 用于未来兼容字段扩展。

### 6.2 表二：`chat_session_event`

用途：追加式记录 `sqlbot-new` 增强历史语义，特别是多数据源切换。

建议字段：

- `id`
- `chat_id`
- `client_type`
  - 固定值：`sqlbot_new`
- `event_type`
  - `session_init`
  - `context_switch`
  - `selection_update`
- `record_id`
  - 可空
  - 可关联到 `chat_record.id`
- `source_kind`
- `source_id`
- `datasource_id`
- `model_id`
- `theme_id`
- `theme_name`
- `selection_title`
- `selection_meta`
- `datasource_pending`
- `event_payload`
  - JSONB
  - 用于后续扩展
- `create_by`
- `create_time`

设计意图：

- `context_switch` 事件用于恢复结果页中的“上下文切换”卡片。
- `selection_update` 事件用于记录文件/数据集上下文更新语义。
- 后续如果要扩展更多 `sqlbot-new` 专属会话能力，不需要再改基础表。

## 7. 写入策略

### 7.1 会话创建

触发点：

- 前端调用 `chat/assistant/start` 成功，拿到 `chat_id` 后

写入：

- upsert `chat_session_snapshot`
- append `chat_session_event(event_type=session_init)`

写入内容：

- 初始 `active_*`
- 初始 `selection_title / selection_meta`
- `client_type=sqlbot_new`

### 7.2 数据源切换

触发点：

- `sqlbot-new` 结果页发生真实数据源切换

写入：

- append `chat_session_event(event_type=context_switch)`
- upsert `chat_session_snapshot.active_*`

写入要求：

- 只对真实切换写事件
- 首页首次选择不写 `context_switch`
- 重复选择当前相同源不写事件

### 7.3 问题发起

触发点：

- 问题真正发出且已有 `chat_id`

写入：

- upsert `chat_session_snapshot.latest_question`
- 如果上下文字段有变化，同步更新 `active_*`

### 7.4 问答完成

触发点：

- 拿到最新 `record_id`
- 问答完成或失败态稳定后

写入：

- upsert `chat_session_snapshot.latest_record_id`
- upsert `selection_title / selection_meta`
- upsert `datasource_pending`

要求：

- 成功问答和失败问答都要落 snapshot
- 文件问数和数据集问数都走同一套 snapshot 更新逻辑

## 8. 读取策略

### 8.1 左侧历史列表

查询来源：

- `chat_session_snapshot join chat`

读取原则：

- 标题、副标题、当前源、更新时间都直接从 snapshot 取
- 不再拼浏览器缓存
- 如果某条会话没有 snapshot：
  - 仍可按基础 `chat` 展示老历史
  - 但不提供 `sqlbot-new` 增强恢复能力

### 8.2 恢复历史

恢复顺序：

1. 读 `chat_session_snapshot`
2. 读 `chat/{id}/with_data`
3. 读 `chat_session_event`

页面恢复逻辑：

- `chat_record` 负责正常问答卡片
- `chat_session_event(context_switch)` 负责上下文切换卡片
- `snapshot.active_*` 负责输入区当前选中数据

### 8.3 恢复后继续追问

继续追问时：

- 当前输入区上下文直接来自 `chat_session_snapshot.active_*`
- 不再依赖前端浏览器缓存推导
- 文件问数恢复后必须能保留文件标签与字段上下文

## 9. 接口设计

### 9.1 新增接口：`GET /chat/sqlbot-new/history`

用途：

- 给 `sqlbot-new` 左侧历史树直接返回数据库历史列表

建议返回：

- `chatId`
- `title`
- `subtitle`
- `updatedAt`
- `queryMode`
- `sourceId`
- `datasourceId`
- `modelId`
- `selectionTitle`
- `selectionMeta`
- `datasourcePending`

### 9.2 新增接口：`GET /chat/{chat_id}/sqlbot-new/context`

用途：

- 返回指定会话的最新 snapshot
- 返回该会话全部 `context_switch` / `selection_update` 事件

建议返回：

- `snapshot`
- `events[]`

### 9.3 新增接口：`POST /chat/{chat_id}/sqlbot-new/context-switch`

用途：

- 前端发生真实切换时写事件并更新 snapshot

建议请求体：

- `sourceKind`
- `sourceId`
- `datasourceId`
- `modelId`
- `themeId`
- `themeName`
- `selectionTitle`
- `selectionMeta`
- `datasourcePending`

### 9.4 新增接口：`POST /chat/{chat_id}/sqlbot-new/snapshot`

用途：

- 问答完成时 upsert 最新 snapshot

建议请求体：

- `activeSourceKind`
- `activeSourceId`
- `activeDatasourceId`
- `activeModelId`
- `activeThemeId`
- `activeThemeName`
- `selectionTitle`
- `selectionMeta`
- `datasourcePending`
- `latestRecordId`
- `latestQuestion`

## 10. 前端改造边界

### 10.1 删除浏览器缓存真源角色

以下前端缓存逻辑不再作为历史真源：

- `HISTORY_SESSION_STORAGE_PREFIX`
- `readHistorySessionSnapshot`
- `writeHistorySessionSnapshot`
- `listHistorySessionSnapshotIds`

`ACTIVE_SESSION_STORAGE_KEY` 可只保留页面态用途，不再承担历史持久化职责。

### 10.2 `fetchHistoryEntries`

改造后：

- 不再拼本地快照
- 直接请求 `GET /chat/sqlbot-new/history`
- 返回的历史项全部以数据库为准

### 10.3 `restoreHistorySession`

改造后：

- 不再读 `localStorage` snapshot
- 直接组合：
  - `GET /chat/{chat_id}/sqlbot-new/context`
  - `GET /chat/{chat_id}/with_data`

### 10.4 `appendContextSwitchRecord`

改造后：

- 前端仍负责即时渲染切换卡片
- 但真实持久化必须同步调用 `POST /chat/{chat_id}/sqlbot-new/context-switch`

### 10.5 `submitQuestion`

改造后：

- 问题完成后调用 `POST /chat/{chat_id}/sqlbot-new/snapshot`
- 当前执行上下文以数据库记录为准

## 11. 兼容策略

### 11.1 老会话

- 老 SQLBot 基础历史仍可展示
- 但没有 snapshot/event 的历史，不强行补增强语义
- 旧浏览器缓存不做迁移

### 11.2 新会话

- 自上线后开始，所有新 `sqlbot-new` 会话都写 snapshot/event
- 新会话完整支持：
  - 多数据源切换恢复
  - 文件问数恢复
  - 恢复后继续追问

## 12. 错误处理

- `context-switch` 写库失败：
  - 前端不能只本地成功
  - 必须提示失败并保留可重试语义
- `snapshot` upsert 失败：
  - 当前问答可展示
  - 但要显式提示“历史保存失败”
- 历史列表接口失败：
  - 页面展示错误态
  - 不再 silently fallback 到浏览器缓存

## 13. 测试要求

### 13.1 后端

- 新建 `sqlbot-new` 会话后 snapshot/event 成功写库
- 数据集切换写入 `context_switch`
- 文件问数完成后 snapshot 正确更新
- 历史列表接口返回数据库快照
- 历史上下文接口返回 snapshot + event

### 13.2 前端

- 新会话后左侧历史来自数据库
- 数据集多源切换后恢复页能回放切换卡片
- 文件问数历史恢复后文件标签仍在
- 恢复后继续追问沿用最后激活上下文
- 清浏览器缓存不影响新会话历史

### 13.3 回归

- 老 `sqlbot` 页面不受影响
- 老历史会话仍可浏览基础记录
- 执行详情能力不回退

## 14. 推荐结论

按 `SQLBot 数据库做唯一真源 + 新增 snapshot/event 两张表` 方案推进。

推荐原因：

- 不污染老 `chat/chat_record` 的基础语义
- `sqlbot-new` 专属增强历史语义边界清晰
- 恢复速度和回放能力兼得
- 后续扩展多事件类型不会继续把前端缓存做成事实真源

## 15. 实施边界确认

本设计已冻结以下边界：

- 只覆盖 `sqlbot-new`
- 不迁移旧浏览器缓存历史
- 新会话从上线后开始数据库持久化
- 使用 `事件流 + 快照` 双持久化
- SQLBot 数据库作为唯一历史真源
- 老 `sqlbot` 页面不改

