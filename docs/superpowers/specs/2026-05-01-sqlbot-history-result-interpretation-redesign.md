# SQLBot 问数结果与历史对话改造设计

## 背景

StarBI 当前智能问数结果页把图表、表格、SQL、推理过程、数据解读、趋势预测、推荐追问放进同一个结果卡片。用户在阅读时无法稳定区分“系统已经取到的事实结果”和“模型基于事实生成的业务洞察”。历史对话恢复时，也容易让人误以为系统在重新解读，而不是恢复上一次已经生成并保存的内容。

本设计用于约束后续实现：对标 Quick BI 小Q问数的产品思路，把问数结果从“万能大卡片”改为“事实问数轮次 + 推荐动作 + 派生提问卡片”的稳定对话流。

## Quick BI 对标依据

Quick BI 官方文档中的关键产品原则：

- 小Q问数支持数据集选择、自然语言提问、多轮对话、历史对话查看，问数会话是主线。
- 小Q问数支持多种推理和数据解读方式，结果中会返回推理过程、数据解读结果和图表。
- 新手指南说明追问能力会基于上一提问自动补齐维度和度量限定，再展示 SQL 取数过程和图表结果。
- v5.5.1 版本说明提到智能问数采用多步流式分屏呈现，让分析过程和结果分别表达更清晰。
- v5.5 版本说明提到每轮对话后的连续推荐能力，以及仪表板/图表级数据解读、自定义解读范围。
- Quick BI 关于“深度推理、数据解读默认行为”的说明提到历史对话会保存用户习惯，但新对话不默认打开。

参考资料：

- [Quick BI 小Q问数用户指南](https://help.aliyun.com/zh/quick-bi/user-guide/user-guide-for-smart-q-a)
- [Quick BI 小Q问数概述](https://help.aliyun.com/zh/quick-bi/user-guide/chat-bi-overview)
- [Quick BI 小Q问数新手指南](https://help.aliyun.com/zh/quick-bi/user-guide/smartq-novice-guide)
- [Quick BI v5.5.1 版本说明](https://help.aliyun.com/zh/quick-bi/product-overview/quick-bi-v5-5-1-release-notes)
- [Quick BI v5.5 版本说明](https://www.alibabacloud.com/help/zh/doc-detail/2930272.html)
- [Quick BI 智能问数深度推理与数据解读默认行为](https://help.aliyun.com/document_detail/705143.html)

## 设计目标

- 事实结果和数据解读视觉独立、状态独立、生命周期独立。
- 历史对话点击后恢复已保存快照，不自动触发重新解读。
- 推荐追问和数据解读属于下一条派生提问入口，不塞进事实结果卡片内部。
- 用户能看懂每个区域的来源：事实来自 SQLBot 取数，解读来自 LLM 基于本轮结果生成。
- 旧数据可以自然降级：没有保存解读时只显示“数据解读”推荐动作，不自动补生成派生提问。

## 非目标

- 本轮不重新设计 SQLBot 的取数、建模、训练能力。
- 本轮不修改数据权限、模型路由、SQL 生成链路。
- 本轮不把历史快照主存储放在 localStorage。localStorage 只能做临时草稿或 UI 展开状态，不能作为历史恢复可信来源。
- 本轮不引入伪造演示数据。所有历史、图表、解读必须来自真实后端返回或当前会话实时生成结果。

## 信息架构

每一次成功问数先形成一个事实问数轮次。事实轮次下方可以继续衔接由用户点击触发的派生提问轮次，例如数据解读、趋势预测、继续追问。

```text
用户问题
└── 事实结果区
    ├── 问数回答文本：本轮结果的事实说明
    ├── 图表 / 表格切换
    ├── 结果摘要：行数、字段数、图表类型、耗时、Token
    ├── SQL 和执行过程
    └── 导出、复制、加入大屏等事实结果动作
└── 推荐动作区
    ├── 基于本轮事实结果和上下文推荐的问题
    ├── 做数据解读、看趋势预测、继续追问等自动提问入口
    └── 点击后生成下一条派生提问卡片

派生提问卡片：对上面的结果做数据解读
└── 洞察解读回答区
    ├── 解读生成中 / 已完成 / 失败状态
    ├── 数据解读内容
    └── 停止、复制、重新解读等动作

派生提问卡片：预测后续趋势
└── 趋势预测回答区
    ├── 预测生成中 / 已完成 / 失败状态
    └── 趋势预测内容
```

推荐动作不放在事实结果内部。默认顺序为事实结果、推荐动作、派生提问、派生回答。这样用户先确认事实，再通过明确点击进入解读或预测对话流。

问数成功后返回的文本需要分层展示：

- 问数回答文本属于事实结果区，用于解释本轮查到了什么、图表/表格表达了什么。
- 执行/推理文本属于事实结果区的执行过程，用于说明问题理解、字段识别、SQL 生成、取数步骤。
- 数据解读文本属于派生解读回答区，只展示由 `analysis` 生成并保存的业务洞察、原因分析和建议。

Quick BI 式的“做数据解读”更接近一个自动提问入口：用户点击后，系统自动插入一条派生提问卡片，例如“对上面的结果做数据解读”，再以当前事实结果为上下文生成解读回答，解读内容展示在这条派生提问卡片下方。它不是把问数回答文本改名成数据解读，也不是在历史恢复时自动重跑解读。

## 目标布局

桌面端采用“主从分区”：

- 主区域宽度优先给事实结果，包含图表/表格和取数过程。
- 图表下方展示推荐动作区，包含“数据解读”“趋势预测”“继续追问”等入口。
- 用户点击推荐动作后，在当前事实轮次下方追加派生提问卡片和对应回答卡片。
- 大屏宽度足够时，派生回答可以使用右侧辅助阅读面板同步展示；对话流中仍必须保留派生提问卡片，避免历史恢复时丢失上下文。
- 历史对话列表只负责切换会话，不承担生成动作。

移动端采用纵向堆叠：

- 用户问题
- 事实结果
- 推荐动作
- 派生提问卡片
- 派生回答
- 底部输入框

## 数据生命周期

### 新问题提交

1. 用户提交问题。
2. SQLBot 生成意图解析、SQL、图表配置、数据结果。
3. 前端实时渲染事实结果区。
4. 后端保存本轮事实快照，包括问题、SQL、图表配置、数据结果、推理过程、执行摘要、推荐追问。
5. 是否自动创建派生解读提问由产品开关决定，但必须作为明确策略执行，不能由组件挂载、watch 数据变化或历史恢复隐式触发。

建议默认策略：

- 新问题默认不自动生成数据解读，事实结果下方展示“数据解读”推荐动作。
- 如果后续产品决定默认开启解读，必须只在新问题提交链路触发一次，先创建 `kind = 'analysis'` 的派生提问记录，再写入 `analysis_status = generating`。

### 数据解读生成

1. 用户点击事实结果下方的“数据解读”推荐动作。
2. 前端在对话流中追加一条派生提问卡片，问题文案可以由系统生成，例如“对上面的结果做数据解读”。
3. 派生提问携带 `sourceRecordId`，指向它要解读的事实问数记录。
4. 前端调用 SQLBot analysis 流接口。
5. 流式内容进入派生提问卡片下方的解读回答区，不覆盖事实结果区。
6. 生成完成后后端保存 `analysis`、`analysis_reasoning_content`、`analysis_record_id`、耗时、Token，并保存派生提问和源事实记录的关联关系。
7. 历史恢复时直接展示派生提问卡片和这些已保存字段。

### 历史对话恢复

1. 用户点击历史对话。
2. 前端调用历史上下文/会话详情接口。
3. 后端返回完整会话快照。
4. 前端恢复每一轮的事实结果、派生提问、解读回答、预测回答、推荐动作、执行上下文。
5. 前端禁止触发 `/analysis`、`/predict`、重新取图表数据等生成型请求，除非快照缺失必要事实数据且后端明确提供只读详情接口。

历史恢复规则：

- 有保存解读：立即恢复派生提问卡片和它下方的解读回答。
- 没有保存解读：事实结果下方只展示“数据解读”推荐动作，不自动创建派生提问卡片。
- 保存解读失败：恢复派生提问卡片和失败状态，展示重试按钮。
- 历史中的推荐追问按当时快照展示，不能重新随机生成。
- 点击“重新解读”时才生成新解读，并覆盖或追加为该派生提问的最新解读版本。

### 图表重新生成或问题重试

如果用户基于同一问题重新生成图表或重新执行问数：

- 新事实结果生成后应视为新记录或新版本。
- 旧解读不能继续标为“已完成且适配当前结果”。
- 如果保留旧解读，需要标记 `analysis_status = stale`，文案为“该解读基于旧结果生成”。

## 状态模型

每一轮记录至少需要以下状态：

```typescript
type AnalysisStatus = 'none' | 'generating' | 'ready' | 'failed' | 'stale'
type FactStatus = 'generating' | 'ready' | 'empty' | 'failed'
type RecordKind = 'fact' | 'analysis' | 'predict' | 'followup'
```

建议记录结构：

```typescript
interface SqlbotResultRecord {
  id: number
  chatId: number
  kind: RecordKind
  sourceRecordId?: number
  question: string
  factStatus: FactStatus
  sql?: string
  chart?: string
  data?: Record<string, any>
  reasoning?: Record<string, any>
  executionSummary?: {
    rowCount?: number
    fieldCount?: number
    duration?: number
    totalTokens?: number
  }
  analysisStatus: AnalysisStatus
  analysis?: string
  analysisThinking?: string
  analysisRecordId?: number
  analysisDuration?: number
  analysisTotalTokens?: number
  analysisError?: string
  predict?: string
  predictStatus?: AnalysisStatus
  recommendQuestions: string[]
  createdAt: number
  updatedAt: number
}
```

兼容现有字段：

- `chartAnswer` 不再命名或展示为“分析报告”。它只能作为 SQLBot 图表生成过程中的自然语言说明，归入事实结果区的问数回答文本。
- `sqlAnswer` 不再命名或展示为“分析思路”。结构化推理优先进入“执行过程”。
- `analysis` 才是“数据解读/洞察”的主内容。
- 数据解读必须可以作为 `kind = 'analysis'` 的派生记录恢复，且通过 `sourceRecordId` 关联到被解读的事实记录。

## 后端契约

优先使用后端持久化快照，前端不自行拼可信历史。

需要确认或补齐：

- `GET /chat/sqlbot-new/history`：返回历史列表元数据，不要求返回完整结果。
- `GET /chat/{chat_id}/sqlbot-new/context` 或会话详情接口：返回完整会话快照，包含每轮事实结果、派生提问记录、派生记录与事实记录的关联、已保存解读。
- `POST /chat/record/{record_id}/analysis`：仅在用户明确触发或新问题自动策略触发时调用。
- `POST /chat/record/{record_id}/predict`：同上。

禁止行为：

- 历史列表接口返回不足时，前端不能通过自动调用 analysis/predict 补齐内容。
- 前端不能用假数据填充历史结果、菜单权限、推荐追问或解读内容。

## 前端契约

现有风险点：

- `StarbiResultCard.vue` 当前用 `narrativeBlocks` 把 `chartAnswer` 包装为“分析报告”，把 `sqlAnswer` 包装为“分析思路”，这是语义混乱的核心。
- `analysisExpanded` 只控制同一卡片内的解读展开，没有把事实结果和洞察解读拆成独立区域。
- 历史恢复链路必须继续审计，确保 `restoreHistorySession`、组件挂载、watch 都不会隐式触发 `requestRecordAnalysis`。

建议组件边界：

- `SqlbotFactResultPanel.vue`：只展示图表、表格、SQL、执行过程和事实动作。
- `SqlbotInsightPanel.vue`：只展示数据解读、生成/重新生成、失败重试、解读元信息。
- `SqlbotPredictPanel.vue`：只展示趋势预测。
- `SqlbotFollowupPanel.vue`：只展示推荐追问。
- `SqlbotDerivedQuestionCard.vue`：展示系统自动提出的派生提问，例如“对上面的结果做数据解读”。
- `SqlbotConversationTurn.vue`：组合事实问数轮次和派生提问轮次，不包含生成逻辑。

事件约束：

- `SqlbotFollowupPanel` 只通过用户点击发出 `create-derived-question`。
- `SqlbotInsightPanel` 只在派生提问创建后发出或接收 `generate-analysis`。
- `SqlbotFactResultPanel` 不 import 或调用 analysis API。
- 历史恢复完成后只更新 record 状态，不触发生成型事件。

## 空态与错误态

事实结果区：

- `generating`：展示正在取数、生成 SQL、渲染图表。
- `ready`：展示图表/表格和执行摘要。
- `empty`：展示“当前条件下暂无结果”，引导放宽筛选或追问。
- `failed`：展示错误原因和重试提问入口。

派生解读回答区：

- `none`：仅在派生提问已经创建但尚未返回内容时展示等待态；没有派生提问时不展示空解读卡片。
- `generating`：展示流式解读和停止按钮。
- `ready`：展示保存的解读内容，按钮为“重新解读”。
- `failed`：展示失败原因，按钮为“重试解读”。
- `stale`：展示旧解读和提示，按钮为“基于当前结果重新解读”。

## 验收标准

- 点击历史对话且历史中有解读时，页面立即展示保存的解读内容，网络请求中不得出现 `/analysis`。
- 点击历史对话且历史中无解读时，页面只展示事实结果和“数据解读”推荐动作，不展示伪造解读卡片，网络请求中不得出现 `/analysis`。
- 点击“数据解读”后，系统在事实结果下方追加一条派生提问卡片，再只调用一次 `/analysis`，流式内容进入派生提问卡片下方，图表/表格不被覆盖。
- 历史中已经生成过数据解读时，必须恢复派生提问卡片和解读回答，不能只恢复一段孤立解读文本。
- 刷新页面恢复当前会话时，不重复触发 `/analysis`。
- 推荐动作出现在事实结果下方，点击后必须作为明确用户动作生成派生提问卡片。
- 问数成功后的事实说明文本继续展示在事实结果区，不能丢失，也不能误标为数据解读。
- `chartAnswer` 不再以“分析报告”标题展示。
- `sqlAnswer` 不再以“分析思路”标题展示；SQL 和推理过程进入执行过程。
- 重新生成图表或重试问题后，旧解读不得继续显示为当前结果的有效解读。
- 所有历史数据、推荐问题、解读内容来自真实后端或当前会话结果，不允许写死演示数据。

## QA 计划

浏览器回归测试必须覆盖：

- 新建问数，等待事实结果生成。
- 点击“数据解读”，确认系统追加派生提问卡片，解读回答在卡片下方流式生成并持久化。
- 刷新页面，确认保存的解读直接恢复。
- 刷新页面后确认派生提问卡片也被恢复，且 `sourceRecordId` 仍指向原事实记录。
- 点击历史对话，确认无 `/analysis` 请求。
- 选择一个没有解读的旧历史，确认只展示空态。
- 点击继续追问，确认生成下一轮事实问数问题，而不是影响上一轮解读。
- 模拟 analysis 失败，确认失败态和重试行为。

代码级验证必须覆盖：

- `restoreHistorySession` 不调用 `requestRecordAnalysis`。
- `SqlbotInsightPanel` 的生成动作只能由点击事件触发。
- 历史恢复单元测试断言 analysis/predict 流接口未被调用。

## 迁移顺序

1. 梳理后端历史详情接口是否已经返回完整 `ChatRecordResult` 和 analysis/predict 字段。
2. 补齐前端 record 状态模型，区分 `factStatus` 和 `analysisStatus`。
3. 拆分事实结果、推荐动作、派生提问、解读回答、趋势预测组件。
4. 修改历史恢复，只读恢复快照。
5. 移除 `chartAnswer`/`sqlAnswer` 的“分析报告/分析思路”展示语义。
6. 增加历史恢复和解读生成的测试。
7. 用浏览器自动化完成全量回归。

## 与旧规格的关系

本规格覆盖并修正 `2026-05-01-sqlbot-new-conversation-redesign.md` 中与历史恢复和结果拆分相关的设计。若两份文档冲突，以本规格为准，尤其是以下规则：

- 历史快照以真实后端持久化为准，不以 localStorage 为主存储。
- 数据解读是独立区域和独立生命周期，不是图表卡片内的折叠内容。
- 历史恢复不得自动生成数据解读。
