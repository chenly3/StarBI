# 智能问数对话消息流改造方案

> 历史参考：本文是 2026-05-01 的早期方案，已被 `2026-05-02-sqlbot-quickbi-message-flow-draft-plan.md` 和对应 implementation plan 取代。本文中的 `localStorage` 历史快照恢复思路不再作为当前需求依据；当前方案要求历史恢复以真实后端保存内容为准，前端只做展示层兼容转换。

## 1. 问题

当前对话一轮的所有内容（图表、解读、推理、推荐）全部塞在 `SqlbotNewConversationRecord` 一张大卡片里。点击历史对话需要重新请求生成，因为记录没有完整持久化。

## 2. 改造目标

| 维度 | 当前 | 改造后 |
|------|------|--------|
| 响应渲染 | 大卡片包所有 | 消息流式（图表→解读→推荐） |
| 展开/折叠 | 技术详情可折叠 | 推理面板从图表内展开 |
| 历史恢复 | 重新请求生成 | 从 localStorage 恢复完整快照 |
| 推荐问题 | 全局底部 | 每轮问答结果的下方 |

## 3. 当前代码结构

`sqlbot-new/index.vue` 已是问答交替布局：

```
├── ScopeBar
├── conversationScrollRef
│   ├── 第 1 轮问答
│   │   ├── conversation-turn-question（用户问题）
│   │   └── conversation-turn-answer → SqlbotNewConversationRecord（大卡片）
│   ├── 第 2 轮问答
│   │   ├── conversation-turn-question
│   │   └── conversation-turn-answer → SqlbotNewConversationRecord
│   └── ...
└── conversation-recommend-panel（全局推荐，需移到每轮内）
```

**布局框架不改，只改 `SqlbotNewConversationRecord` 内部的渲染逻辑和持久化。**

## 4. `SqlbotNewConversationRecord` 改造

改造前：渲染一整张大卡片包所有内容。

改造后：渲染为消息流，每个模块独立渲染：

```
conversation-turn-answer →
├── 📊 ChatMessageChart        ← 图表 + ReasoningPanel
│   ├── 💡 问题理解（默认展开）
│   ├── 📈 执行摘要（默认展开）
│   └── 🔧 技术详情（默认折叠）
├── 💬 ChatMessageInterpretation ← 数据解读（如有）
└── 💡 ChatMessageRecommend     ← 推荐问题 + "换一换"
```

## 5. 组件拆分

| 当前组件 | 改造动作 |
|---------|---------|
| `SqlbotNewConversationRecord.vue` | 保留为容器，内部渲染逻辑改为消息流 |
| `StarbiResultCard.vue` | 保留不用改（旧 `sqlbot/index.vue` 使用） |
| 新建 | `ChatMessageChart.vue` — 图表 + 嵌入 ReasoningPanel |
| 新建 | `ChatMessageInterpretation.vue` — 解读文本 |
| 新建 | `ChatMessageRecommend.vue` — 推荐 + 换一换 |
| `ReasoningPanel.vue` | 已有，嵌入 Chart 消息内 |
| `RecommendQuestions.vue` | 已有，加 `onRefresh` prop |

## 6. 持久化方案

每次 SSE 流完成时将完整 record 对象序列化存入 localStorage：

```typescript
const buildRecordSnapshot = (record: SqlbotNewConversationRecord) => ({
  id: record.id,
  question: record.question,
  chart: record.chart,
  data: record.data,
  reasoning: record.reasoning,
  sql: record.sql,
  executionSteps: record.executionSteps,
  interpretation: record.interpretation,
  recommendedQuestions: record.recommendedQuestions,
  rowCount: record.rowCount,
  duration: record.duration,
  error: record.error,
  finish: true,
  created_at: Date.now()
})

// SSE 完成后存储
localStorage.setItem(`snapshot-${record.id}`, JSON.stringify(recordSnapshot))

// 恢复时
const restored = localStorage.getItem(`snapshot-${record.id}`)
const record = restored ? JSON.parse(restored) : await fetchFromAPI()
```

超出 100 条或 5MB 时自动清理最早的记录。

## 7. 展开状态记忆

| 层级 | 默认 | 记忆方式 |
|------|------|---------|
| 问题理解 | 展开 | localStorage `reasoning-understanding-{recordId}` |
| 执行摘要 | 展开 | localStorage `reasoning-summary-{recordId}` |
| 技术详情 | 折叠 | localStorage `reasoning-details-{recordId}` |

## 8. 向后兼容

- 无 `snapshot-*` 存储时降级为 API 请求
- `SqlbotNewConversationRecord` 改为消息流模式，旧版 `StarbiResultCard.vue` 保留不改

## 9. 涉及文件

- `SqlbotNewConversationRecord.vue` — 改为消息流
- `ChatMessageChart.vue` — 新建
- `ChatMessageInterpretation.vue` — 新建
- `ChatMessageRecommend.vue` — 新建
- `useSqlbotNewConversation.ts` — 持久化逻辑
- `index.vue` — 推荐问题移到每轮内
- `RecommendQuestions.vue` — 加 `onRefresh` prop
