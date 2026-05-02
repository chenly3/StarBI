# SQLBot Quick BI 对标问数消息流 Draft Plan

## 文档状态

本文是需求规范 draft plan，用于后续 `gstack /autoplan` 评审。本文不是 implementation plan，不包含代码任务拆解，也不允许直接据此开工改代码。

后续流程必须是：

1. 使用本文作为需求/spec draft plan 输入。
2. 执行 `gstack /autoplan`，评审产品方向、设计、工程和测试风险。
3. 将评审结论合并回需求规范。
4. 使用 `superpowers:writing-plans` 生成可执行 implementation plan。
5. implementation plan 获得确认后才进入代码实现和验证。

## 背景

当前 SQLBot New 的问数结果与历史对话体验存在核心结构问题：事实结果、图表、表格、SQL、推理过程、数据解读、趋势预测、推荐追问被混合在同一张结果卡片或同一轮回答中。用户很难判断哪些内容是 SQL 查询得到的事实结果，哪些内容是 LLM 基于事实结果生成的洞察。

历史对话恢复也存在认知风险：用户点击历史对话时，页面应该恢复当时已经生成并保存的内容，而不是重新触发解读、预测或推荐问题生成。否则历史对话看起来像“重新跑了一遍”，用户无法信任结果的一致性。

本需求的目标是对标 Quick BI 小Q问数的产品设计思路，将 StarBI/SQLBot 问数结果改造成稳定的问答交替消息流。

## Quick BI 对标原则

本 draft plan 只抽取 Quick BI 小Q问数的交互原则，不要求逐像素复刻。

可参考的公开产品原则包括：

- 小Q问数以自然语言问答为主线，支持选择数据集、输入问题、查看结果、多轮对话和历史对话查看。
- 问数成功后，用户可以查看返回结果并进行后续操作，例如取数过程、图表类型修改、导出和分享。
- 每轮对话后可以基于推荐问题继续提问。
- 数据解读用于对结果数据给出数据发现、结论和建议。
- 智能问数采用多步流式表达时，应让分析过程和结果分开呈现。
- 深度推理和数据解读不应在新对话中无条件默认打开，历史对话可以恢复用户上次保存的状态。

参考资料：

- [Quick BI 小Q问数概述](https://www.alibabacloud.com/help/zh/quick-bi/user-guide/chat-bi-overview)
- [Quick BI 小Q问数用户指南](https://help.aliyun.com/zh/quick-bi/user-guide/user-guide-for-smart-q-a)
- [Quick BI 小Q问数新手指南](https://help.aliyun.com/zh/quick-bi/user-guide/smartq-novice-guide)
- [Quick BI 智能问数深度推理与数据解读默认行为](https://help.aliyun.com/document_detail/705143.html)
- [Quick BI v5.5.1 版本说明](https://www.alibabacloud.com/help/tc/doc-detail/2979201.html)

## 用户问题

用户反馈的真实问题可以整理为以下几类：

- 图表和数据解读放在同一张卡片里，语义混乱。
- 点击历史对话后，已经生成过的数据解读可能还需要重新解读，违背历史恢复预期。
- 问数成功结果不应该只有图表，还应该有事实型文本回答。
- 点击“数据解读”时，用户预期是系统自动提出一条“对某某问题做数据解读”的提问，然后下一条 AI 回答展示解读内容。
- 整体对话应是“用户问题 - AI 回答 - 派生问题 - AI 回答”的消息流，而不是一串连续 AI 消息卡片。
- 推荐追问、数据解读、趋势预测都应该作为可点击的下一步问题入口，而不是混入事实结果主体。
- 历史恢复必须读取真实后端保存内容，不能写死数据，不能前端伪造演示结果。

## 目标

本需求完成后，SQLBot New 应满足以下目标：

- 事实结果和 AI 洞察分离：事实结果来自 SQLBot 取数，数据解读/趋势预测来自 LLM 基于事实结果生成。
- 对话流保持问答交替：用户消息或系统派生问题消息后面，跟随对应 AI 回答消息。
- 问数成功结果包含事实文本、图表/表格、执行信息和后续动作。
- 点击“数据解读”或“趋势预测”会先创建一条派生问题消息，再创建对应 AI 派生回答消息。
- 历史对话恢复已保存消息流，不自动触发 `/analysis`、`/predict`、推荐问题重算或其他生成型请求。
- 推荐动作卡片衔接独立区域，作为下一条问题入口，而不是事实卡片里的装饰按钮。
- 所有数据来自真实后端或当前会话实时生成结果，不允许使用写死假数据。

## 非目标

本需求不解决以下问题：

- 不重构 SQLBot 的 SQL 生成、模型配置、训练、术语、示例配置页面。
- 不重做 DataEase 系统设置页面视觉规范。
- 不新增复杂报表 Agent、归因 Agent 或多智能体分析链路。
- 不把 localStorage 当作历史恢复可信主存储。localStorage 只能作为 UI 展开状态或未落库草稿缓存。
- 不改造数据权限、菜单权限、组织权限和底层资源授权模型。
- 不要求完全复刻 Quick BI 的视觉样式，只对标核心问答和洞察交互模式。

## 核心产品原则

### 1. 事实结果不是数据解读

事实结果是 SQLBot 查询和计算后的结果，包含：

- 用户原始问题。
- SQLBot 对问题的事实型回答文本。
- 图表或表格。
- SQL。
- 执行过程。
- 结果摘要，例如行数、字段数、耗时、Token。
- 导出、复制、加入大屏、查看执行详情等事实结果动作。

数据解读是基于事实结果的二次生成内容，包含：

- 数据发现。
- 关键结论。
- 业务解释。
- 风险或机会提示。
- 后续建议。

`chartAnswer` 不能命名为“分析报告”。`sqlAnswer` 不能命名为“数据解读”。只有 analysis 生成内容才是数据解读。

### 2. 点击洞察动作等于自动发起派生提问

当用户点击“数据解读”时，系统应自动插入一条派生问题消息：

```text
对“按品线统计销售金额”做数据解读
```

然后下一条 AI 消息展示解读结果。

当用户点击“趋势预测”时，系统应自动插入一条派生问题消息：

```text
对“按品线统计销售金额”做趋势预测
```

然后下一条 AI 消息展示预测结果。

派生问题消息可以标注为“系统根据你的操作自动提问”，但它在消息流中应表现为用户侧问题，不应隐藏在 AI 卡片内部。

### 3. 推荐动作卡片是区域之间的衔接

事实结果区和数据解读区之间需要有一个明确的推荐动作卡片。它承担三类动作：

- 做数据解读。
- 看趋势预测。
- 继续追问推荐问题。

推荐动作卡片本身不是 AI 回答，不计入普通问答轮次。用户点击后，才生成新的派生问题消息或普通追问消息。

派生回答完成后，也可以出现下一组推荐动作卡片，例如“继续追问原因”“换个维度分析”“加入大屏”等，但仍必须通过点击转化为下一条消息。

### 4. 历史恢复只恢复，不生成

历史恢复必须遵守只读原则：

- 可以请求历史详情接口。
- 可以请求已保存图表数据详情。
- 可以读取已保存上下文事件。
- 不允许自动调用 analysis 生成。
- 不允许自动调用 predict 生成。
- 不允许自动重新生成推荐追问。
- 不允许用前端写死数据补齐缺失结果。

如果历史缺少解读内容，只显示“数据解读”动作入口。只有用户再次点击时，才生成新的派生问题和派生回答。

## 信息架构

目标形态是聊天消息流，而不是结果页卡片堆叠。

```text
会话页面
├── 顶部上下文区
│   ├── 当前数据集/分析主题/文件
│   ├── 模型与数据源状态
│   └── 切换数据范围入口
├── 消息流
│   ├── 用户问题消息
│   ├── AI 事实回答消息
│   │   ├── 事实文本回答
│   │   ├── 图表/表格结果
│   │   ├── 执行摘要
│   │   ├── SQL 与取数过程
│   │   └── 事实结果动作
│   ├── 推荐动作卡片
│   │   ├── 数据解读
│   │   ├── 趋势预测
│   │   └── 推荐追问
│   ├── 派生问题消息
│   ├── AI 派生回答消息
│   ├── 推荐动作卡片
│   └── 后续多轮消息
└── 底部输入区
    ├── 文本输入
    ├── 快捷提问
    └── 提交状态
```

## 关键用户流程

### 流程 1：首次问数成功

1. 用户选择数据集或分析主题。
2. 用户输入问题，例如“按品线统计销售金额”。
3. 页面追加用户问题消息。
4. SQLBot 流式生成事实回答。
5. 页面展示 AI 事实回答消息，包含事实文本、图表/表格、SQL、执行过程和摘要。
6. 事实回答下方展示推荐动作卡片。
7. 页面保存本轮事实结果和推荐动作快照。

验收点：

- 问数成功后不只显示图表，必须有事实型文本回答。
- 数据解读不会自动混在事实结果内部。
- 推荐动作卡片在事实结果之后出现。

### 流程 2：点击数据解读

1. 用户点击事实结果后的“数据解读”。
2. 页面立即追加派生问题消息，例如“对‘按品线统计销售金额’做数据解读”。
3. 页面追加 AI 派生回答消息，进入生成中状态。
4. DataEase 后端或既有服务边界调用 SQLBot analysis 能力。
5. 流式解读内容进入 AI 派生回答消息。
6. 生成完成后保存派生问题、派生回答、源事实记录关联、耗时和 Token。
7. 派生回答后可展示下一组推荐动作卡片。

验收点：

- 派生问题先出现，AI 解读回答后出现。
- 解读内容不写回事实结果卡片。
- 重复点击同一事实结果的“数据解读”不能创建重复进行中的请求。
- 生成失败时，派生回答消息显示失败状态和重试入口。

### 流程 3：点击趋势预测

1. 用户点击事实结果后的“趋势预测”。
2. 页面追加派生问题消息，例如“对‘按品线统计销售金额’做趋势预测”。
3. 页面追加 AI 派生回答消息，进入生成中状态。
4. 调用 predict 能力生成预测内容。
5. 预测完成后保存派生消息和源事实记录关联。

验收点：

- 交互模式和数据解读一致。
- 预测回答和解读回答是不同的派生回答类型。
- 历史恢复时可以分别恢复解读和预测。

### 流程 4：点击推荐追问

1. 用户点击推荐动作卡片中的推荐问题。
2. 推荐问题进入底部输入框或直接作为下一条用户问题提交，具体行为需在 autoplan 后确认。
3. 提交后生成新的普通问答轮次。

推荐默认：点击推荐问题先填入输入框，不立即提交，避免误触造成请求。

### 流程 5：恢复历史对话

1. 用户点击历史对话记录。
2. 页面请求历史会话详情。
3. 前端按保存顺序恢复用户问题、AI 事实回答、推荐动作、派生问题、派生回答。
4. 如果历史有已保存解读，直接展示解读。
5. 如果历史没有解读，只展示“数据解读”动作入口。
6. 恢复期间不触发生成型请求。

验收点：

- 浏览器网络记录中不出现历史恢复触发的 `/analysis` 或 `/predict`。
- 历史恢复后消息顺序和首次生成后保持一致。
- 已保存的解读内容不重新生成。
- 不存在写死数据或 mock 数据。

## 消息类型

需求层面至少需要以下消息类型：

```typescript
type SqlbotMessageKind =
  | 'user-question'
  | 'fact-answer'
  | 'action-suggestions'
  | 'derived-question'
  | 'derived-answer'
  | 'context-switch'
```

消息关系：

- `fact-answer` 由 `user-question` 触发。
- `action-suggestions` 依附于最近一个可操作回答，但不是 AI 回答。
- `derived-question` 由用户点击动作自动生成，必须关联 `sourceRecordId`。
- `derived-answer` 由 `derived-question` 触发，必须关联同一个 `sourceRecordId`。
- `context-switch` 用于记录数据范围、数据集、文件或模型变化。

## 数据契约

### 事实回答记录

事实回答需要保存：

- `id`
- `chatId`
- `kind = fact-answer`
- `question`
- `chartAnswer`
- `sqlAnswer`
- `chart`
- `data`
- `sql`
- `reasoning`
- `executionSummary`
- `recommendQuestions`
- `duration`
- `totalTokens`
- `finish`
- `createdAt`

### 派生问题记录

派生问题需要保存：

- `id` 或 `localId`
- `chatId`
- `kind = derived-question`
- `sourceRecordId`
- `sourceLocalId`
- `derivedAction = analysis | predict`
- `question`
- `createdAt`

### 派生回答记录

派生回答需要保存：

- `id` 或 `localId`
- `chatId`
- `kind = derived-answer`
- `sourceRecordId`
- `sourceLocalId`
- `derivedAction = analysis | predict`
- `question`
- `analysis` 或 `predict`
- `thinking`
- `status = generating | ready | failed | stale`
- `error`
- `duration`
- `totalTokens`
- `createdAt`
- `updatedAt`

## 服务边界

前端应优先调用 DataEase 暴露的服务能力。若必须调用 SQLBot 服务，应由 DataEase 后端服务发起代理调用，避免页面直接散落 SQLBot 内部服务调用。

历史恢复接口必须由后端返回真实会话数据。前端可以做顺序归一化和兼容旧字段，但不能制造不存在的消息。

## 兼容旧数据

旧历史可能把 `analysis` 或 `predict` 放在事实记录字段上。恢复规则如下：

- 如果同一事实记录已经有保存的 derived answer 事件，以 derived answer 为准。
- 如果没有 derived answer，但事实记录有旧 `analysis`，前端可以将旧 `analysis` 转换成一组派生问题和派生回答用于展示。
- 转换后事实记录内部必须清空 inline analysis，避免同一内容既在事实结果内显示，又在派生回答内显示。
- 旧数据转换只发生在恢复展示层，不代表重新生成。

## 状态与错误处理

### 事实回答状态

```typescript
type FactAnswerStatus = 'generating' | 'ready' | 'empty' | 'failed'
```

- `generating`：显示 SQLBot 正在理解问题、生成 SQL、查询数据或渲染图表。
- `ready`：显示事实文本、图表/表格和动作。
- `empty`：显示当前条件下暂无数据，并提供放宽条件或换数据集建议。
- `failed`：显示错误原因、可重试入口和可复制的诊断信息。

### 派生回答状态

```typescript
type DerivedAnswerStatus = 'generating' | 'ready' | 'failed' | 'stale'
```

- `generating`：显示正在生成数据解读或趋势预测。
- `ready`：显示生成内容、耗时和 Token。
- `failed`：显示失败原因和重试入口。
- `stale`：源事实结果重新生成后，旧解读或预测必须标记为基于旧结果。

## 页面布局要求

### 桌面端

- 消息流居中，保持可读宽度。
- 图表/表格事实结果可以比普通文本消息更宽，但仍属于同一条 AI 事实回答。
- 推荐动作卡片紧跟事实回答或派生回答之后。
- 派生问题使用用户侧气泡或系统辅助提问样式，不能被隐藏。
- 派生回答使用 AI 回答样式，但标题必须明确为“数据解读”或“趋势预测”。
- SQL 和执行过程默认折叠，避免压过事实结果。

### 移动端

- 全部纵向堆叠。
- 推荐动作卡片可以横向滚动。
- 图表优先展示可读表格 fallback。
- 底部输入框固定，历史恢复时不遮挡最后一条消息。

## 自动问题和推荐动作规则

推荐动作卡片可以包含：

- 做数据解读。
- 看趋势预测。
- 从另一个维度继续分析。
- 查看明细。
- 加入大屏。
- 复制 SQL。

推荐动作来源必须可追溯：

- 来自后端推荐问题。
- 来自固定产品动作。
- 来自当前事实结果结构化摘要。

推荐动作不能伪装成已经生成的 AI 回答。只有用户点击后，才创建新的消息。

## 验收标准

### 产品验收

- 首次问数成功后，页面展示用户问题、AI 事实回答和推荐动作卡片。
- AI 事实回答包含事实文本和图表/表格，不包含 inline 数据解读。
- 点击“数据解读”后，页面追加派生问题消息和 AI 数据解读回答消息。
- 点击“趋势预测”后，页面追加派生问题消息和 AI 趋势预测回答消息。
- 消息流始终保持问答交替，不出现多个 AI 回答连续堆叠且无对应问题的情况。
- 历史恢复后展示已保存的派生问题和派生回答。
- 历史恢复不会自动重新生成解读或预测。

### 工程验收

- `restoreHistorySession` 或等价历史恢复逻辑不得调用 analysis/predict 生成型方法。
- 解读和预测生成必须有 per source record + action 的并发锁。
- 派生消息必须持久化源事实记录关联。
- 旧 inline analysis/predict 恢复时必须转换或剥离，不能重复展示。
- 前端不得使用写死 mock 数据补齐历史、推荐、解读或权限内容。
- 如果 SQLBot 服务必须被调用，调用应经 DataEase 后端服务边界发起。

### 测试验收

至少需要覆盖：

- 首次问数成功消息顺序。
- 数据解读点击后消息顺序。
- 趋势预测点击后消息顺序。
- 重复点击同一动作不会重复创建进行中消息。
- 历史恢复不会调用 `/analysis`。
- 历史恢复不会调用 `/predict`。
- 旧 inline analysis 转 derived message。
- 旧 inline predict 转 derived message。
- 派生消息不影响历史标题和普通问答轮次计数。
- 失败态、空态、移动端布局和无推荐问题状态。

## 风险

- 现有 `useSqlbotNewConversation.ts` 文件较大，继续堆逻辑会增加维护风险。implementation plan 需要评估是否拆分 composable。
- 源事实记录和派生消息的排序规则必须稳定，否则历史恢复会出现顺序跳动。
- 旧数据兼容可能导致同一解读内容重复显示，需要以 derived event 优先。
- 如果后端历史快照不完整，前端不能用生成请求补齐，只能显示缺失提示或只读降级。
- 如果推荐动作和推荐问题混在一个组件里，容易再次退化为“卡片内部按钮堆叠”。

## 待 autoplan 评审的问题

- 推荐问题点击应默认“填入输入框”还是“直接提交”。
- 派生回答完成后是否必须展示下一组推荐动作卡片。
- 是否需要在桌面端增加右侧洞察阅读面板，还是先保持单列消息流。
- DataEase 后端代理 SQLBot analysis/predict 是否纳入本需求，还是拆成单独服务边界需求。
- 当前已提交实现是否应拆出 follow-up 修复提交，补齐缺失测试与边界说明。

## 成功定义

这个需求成功的标志不是“页面多了几个卡片”，而是用户能清楚理解每条内容的来源和生命周期：

- 图表/表格和事实文本是本轮问数结果。
- 数据解读和趋势预测是用户点击动作后产生的派生问答。
- 历史对话恢复的是过去保存过的内容。
- 页面没有伪造数据，没有隐式重跑，没有把 AI 洞察混进事实结果。

## Autoplan Review

### 评审状态

本节是对本文执行 `gstack /autoplan` 后的评审结果。由于当前会话没有显式授权启动外部子代理，本次按 single-reviewer mode 执行，但仍按 CEO、Design、Engineering、DX 四个维度完整评审。

结论：需求方向通过，但进入 `superpowers:writing-plans` 前必须吸收本节的 P0/P1 要求。后续 implementation plan 不能只实现“页面看起来像消息流”，必须同时满足历史恢复、后端真实数据、派生消息持久化和浏览器回归验证。

### CEO / Strategy Review

#### 0A. Premise Challenge

| Premise | Verdict | Reason |
|---|---|---|
| 问数结果和数据解读应拆分 | 通过 | 用户痛点真实，事实结果和 LLM 洞察混合会直接降低可信度。 |
| Quick BI 是合适对标对象 | 通过 | Quick BI 小Q问数同样以自然语言问答、多轮追问、历史对话、数据解读为核心能力。 |
| 历史恢复不能重跑解读 | 通过 | 历史对话的产品语义是恢复已发生内容，不是再次生成。 |
| 推荐动作应作为下一步提问入口 | 通过 | 这能保持问答交替，避免连续 AI 卡片堆叠。 |
| 本需求可以只做前端展示 | 不通过 | 如果后端没有可靠持久化派生消息，历史恢复仍会不可信。 |

#### 0B. Existing Code Leverage

| Sub-problem | Existing Code To Reuse | Review Decision |
|---|---|---|
| SQLBot New 会话主页面 | `dataease/core/core-frontend/src/views/sqlbot-new/index.vue` | 复用，不重写页面壳。 |
| 会话状态和历史恢复 | `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts` | 复用但必须拆出测试边界或在计划中明确局部改造范围。 |
| 历史列表交互 | `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts` | 复用，重点验证点击历史不触发生成接口。 |
| 图表/表格事实结果卡 | `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue` | 可复用，但 SQLBot New 必须禁用 inline insight。 |
| 派生问题/回答组件 | `SqlbotDerivedQuestionMessage.vue`、`SqlbotDerivedAnswerMessage.vue` | 已有雏形，implementation plan 应评估是否补齐状态和视觉一致性。 |
| SQLBot analysis/predict 服务 | `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts` 和 SQLBot 后端 `/analysis`、`/predict` | 能力可复用，但调用边界需评估是否必须改为 DataEase 后端代理。 |
| 后端历史合并 | `SQLBot/backend/apps/chat/curd/record_merge.py` | 是旧 inline insight 来源，必须覆盖兼容测试。 |

#### 0C. Dream State Mapping

```text
CURRENT
  事实结果、图表、解读、预测和推荐动作混杂在结果卡片中；
  历史恢复容易让用户误以为系统重新生成内容。

THIS PLAN
  以消息流重建用户问题、AI 事实回答、推荐动作、
  派生问题、AI 派生回答之间的关系；
  历史恢复只恢复已保存消息，不隐式生成。

12-MONTH IDEAL
  StarBI 问数成为可信的分析工作台：
  每条内容都有来源、状态、版本和可追溯上下文；
  用户能从事实结果自然进入解读、预测、归因、报告和大屏搭建。
```

#### 0C-bis. Alternatives

| Approach | Summary | Effort | Risk | Pros | Cons | Completeness |
|---|---|---:|---:|---|---|---:|
| A. Minimal UI Split | 只在前端把解读/预测渲染成独立消息，尽量不动后端契约。 | M | High | diff 小；能快速改善观感。 | 历史恢复仍依赖旧字段；很容易重复生成或重复展示。 | 5/10 |
| B. Message Contract Stabilization | 明确 fact/derived/action/context 消息契约，前端归一化旧数据，后端保存派生事件，补齐回归测试。 | L | Med | 正面解决信任问题；和 Quick BI 对标最一致；可验收。 | 需要处理旧数据兼容和测试建设。 | 9/10 |
| C. Full Conversation Domain Refactor | 建立独立 conversation message store，重构 SQLBot New 状态机和 DataEase 后端代理层。 | XL | High | 长期最清晰，平台化能力强。 | 超出本需求，容易拖慢当前体验修复。 | 10/10 |

Autoplan recommendation：选择 Approach B。A 只修表象，C 过大；B 能在可控范围内解决用户真正关心的“来源可信、历史可信、交互可信”。

#### 0D / 0F Mode Decision

评审模式选择：HOLD SCOPE。

理由：这个需求已经足够大，且当前仓库已有一轮提交实现过部分内容。现在不应继续扩张功能，而应把需求范围钉牢，让 writing-plans 生成“补齐契约、测试、验证、必要视觉修正”的可执行计划。

### Design Review

#### Design Completeness Score

当前 draft plan 设计完整度：8/10。

已经明确：

- 消息顺序。
- 事实结果和派生回答边界。
- 桌面端和移动端基本布局。
- 关键状态和错误态。
- 推荐动作作为衔接区域。

缺口：

- 缺少逐状态 UI 文案表。
- 缺少“派生回答完成后推荐动作是否必显”的最终决策。
- 缺少视觉一致性验收基准，例如消息宽度、字体层级、卡片间距、操作按钮位置。
- 缺少历史恢复中“缺失部分数据”时用户实际看到什么的更细描述。

#### Information Architecture

评分：8/10。

10/10 需要在 implementation plan 中补充屏幕级结构：

```text
Primary: 当前消息流中最新事实结果或最新派生回答
Secondary: 推荐动作和可继续追问入口
Tertiary: SQL、执行过程、Token、耗时、复制/导出等辅助动作
```

事实结果卡不能再承担所有功能。推荐动作卡必须是单独消息节点或明确的消息附属节点，不能被塞回 `StarbiResultCard` 内部。

#### Interaction State Coverage

评分：7/10。

writing-plans 必须补齐状态表，至少覆盖：

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Fact answer | 生成 SQL/取数/渲染进度 | 暂无数据，引导放宽条件 | 展示错误和重试 | 图表/表格/事实文本 | 有文本无图表、有图表无推荐 |
| Action suggestions | 等待推荐 | 无推荐时只保留固定动作 | 推荐生成失败不阻塞事实结果 | 展示解读/预测/追问 | 后端推荐缺失时展示产品固定动作 |
| Derived question | 点击后立即出现 | 不适用 | 创建失败回退提示 | 展示系统派生问题 | 本地已创建但后端未持久化 |
| Derived answer | 流式生成中 | 返回空内容时说明未生成有效解读 | 展示失败和重试 | 展示解读/预测内容 | 流中断但已有部分内容 |
| History restore | 正在恢复历史 | 无可恢复记录 | 恢复失败，提示不重跑 | 完整恢复消息流 | 缺图表数据、缺派生回答、缺推荐 |

#### User Journey

评分：8/10。

用户情绪目标：

- 5 秒内：看懂“这是一次问数会话，不是报表配置页”。
- 5 分钟内：明白事实结果、数据解读、趋势预测各自来源。
- 5 周后：打开历史对话时相信内容没有被偷偷重算。

#### AI Slop Risk

评分：7/10。

风险：如果 implementation plan 只写“新增卡片、优化样式、展示洞察”，实现很容易变成另一版 AI 卡片堆叠。

必须写入 implementation plan 的硬约束：

- `derived-question` 必须作为独立消息渲染。
- `derived-answer` 必须有自己的 loading/error/ready 状态。
- `fact-answer` 内不得渲染 analysis/predict 内容。
- 推荐动作点击前不能创建 AI 回答。
- 历史恢复不得触发生成型请求。

### Engineering Review

#### Architecture Review

评分：7/10。

当前 draft plan 已描述目标契约，但 implementation plan 必须进一步明确数据流：

```text
New question
  User input
    -> DataEase frontend
    -> DataEase/SQLBot question stream
    -> fact-answer message
    -> persist fact snapshot
    -> action-suggestions

Analysis click
  User click action
    -> derived-question message
    -> derived-answer loading message
    -> DataEase backend or SQLBot analysis stream
    -> derived-answer ready/failed
    -> persist derived event

History restore
  User clicks history
    -> history detail/context API
    -> normalize fact + derived + legacy inline fields
    -> render messages
    -> no analysis/predict generation
```

P0 engineering requirement：writing-plans 必须先写失败测试，再实现或加固。不能直接调样式和逻辑。

#### Error & Rescue Map

必须进入 implementation plan：

| Codepath | What Can Go Wrong | User Sees | Required Handling |
|---|---|---|---|
| Restore history context | API 401/500/timeout | 历史恢复失败，不重跑生成 | 显示错误和重试恢复入口 |
| Restore detail data | 图表数据缺失 | 显示事实文本和“图表数据缺失” | 不调用重新问数 |
| Legacy inline conversion | analysis/predict 重复显示 | 不应发生 | derived event 优先，legacy 仅补缺 |
| Create derived question | 后端持久化失败 | 本地显示“未保存”或静默降级 | 不阻塞生成，但最终要重试或标记 |
| Stream analysis/predict | SSE 中断 | 派生回答失败或部分内容 | 保留已收到内容，给重试 |
| Double click action | 重复创建请求 | 不应发生 | sourceRecord + action 锁 |
| Empty LLM output | 空解读 | 显示“未生成有效解读” | 不伪造内容 |

#### Security & Data Boundary

P1 requirement：明确 DataEase 和 SQLBot 服务边界。

若现阶段仍由前端调用 SQLBot stream，implementation plan 必须明确这是过渡方案，并补充后续 DataEase 后端代理需求或在本需求中纳入。不能让最终架构含糊。

不得新增前端写死 token、写死用户、写死历史数据或 mock 菜单权限。

#### Test Review

现有测试基础：

- 前端已有 SQLBot New source contract 测试。
- 后端已有 `test_record_merge.py` 和 `test_sqlbot_new_derived_message_contract.py`。

测试缺口：

- 需要状态级 restore 测试，而不只是正则扫源码。
- 需要浏览器级 HAR 验证，证明历史恢复不调用 `/analysis` 和 `/predict`。
- 需要重复点击锁测试。
- 需要旧 inline analysis/predict 转换测试。
- 需要视觉/DOM 顺序测试，证明消息流是问答交替。

Coverage target for implementation plan：

```text
CODE PATHS
  restoreHistorySession
    -> full derived event restore
    -> legacy inline conversion
    -> missing derived answer
    -> no generation calls
  requestDerivedRecordAnalysis
    -> create derived question
    -> create derived answer
    -> lock duplicate click
    -> stream success/failure
  requestDerivedRecordPredict
    -> same as analysis
  render message flow
    -> fact answer only
    -> action suggestions
    -> derived question
    -> derived answer

USER FLOWS
  first question success
  click data interpretation
  click trend prediction
  click history with saved derived answer
  click history without saved derived answer
  double click interpretation
  analysis stream failure
```

### DX / Process Review

本需求主要面向产品用户，不是 developer-facing SDK，因此 DX review 聚焦开发执行体验。

评分：7/10。

writing-plans 必须让后续执行者一眼看懂：

- 哪些是需求规范，哪些是 implementation plan。
- 哪些测试先写且必须先失败。
- 哪些文件是允许修改范围。
- 哪些历史行为是禁止行为。
- 如何用 `agent-browser` 验收真实页面和网络请求。

必须加入 implementation plan 的执行约束：

- 每个任务独立可验证。
- 先测试后实现。
- 浏览器回归不能交给用户手测。
- 验收报告必须包含问题、修复、证据和剩余风险。

### Autoplan Required Revisions

进入 `superpowers:writing-plans` 前，本 draft plan 需要吸收以下硬性结论：

1. P0：implementation plan 必须以 Approach B 为基线，即稳定消息契约和历史恢复，而不是只做 UI split。
2. P0：历史恢复禁止生成型请求必须作为第一优先级测试。
3. P0：旧 inline analysis/predict 转换或剥离必须作为兼容任务。
4. P1：推荐问题点击默认先填入输入框，不直接提交，除非用户在后续明确改成直接提交。
5. P1：派生回答完成后的推荐动作卡片纳入首版范围，但可以使用固定产品动作 + 已有推荐问题，不强制新增 LLM 推荐生成。
6. P1：桌面端先保持单列消息流，不引入右侧洞察阅读面板；右侧面板作为后续增强。
7. P1：DataEase 后端代理 SQLBot analysis/predict 需要在 implementation plan 中作为独立任务评估。如果成本过大，必须明确作为后续服务边界任务，不能假装已经满足。
8. P1：浏览器自动化验收必须使用 `agent-browser`，记录交互和网络证据。

### Final Autoplan Verdict

通过，有条件进入 `superpowers:writing-plans`。

不允许直接开工实现。下一步必须把本文和本 Autoplan Review 作为输入，生成可执行 implementation plan。Implementation plan 需要包含具体文件、具体测试、具体命令、预期失败/通过结果和浏览器验收脚本。
