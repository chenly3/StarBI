# 推理显性化设计方案

## 1. 目标

让用户能看到系统如何理解问题、如何推理、如何生成结果。对标 Quick BI 的"推理过程显性化"能力，采用"LLM 自己解释自己"的方式，而非前端写死映射表。

## 2. 设计方案

### 2.1 数据流

```
用户提问 "本月各区域销售额Top5"
  │
  ▼
SQLBot（LLM + RAG）
  │ SSE 事件流：
  │   event: reasoning  data: {"content":"我理解你的问题是...","step":"理解问题"}
  │   event: reasoning  data: {"content":"识别到时间范围=本月..."}
  │   event: sql        data: "SELECT ..."
  │   event: chart      data: {"type":"bar",...}
  │   event: data       data: [...]
  │   event: done
  ▼
DataEase 后端（SSE Stream Proxy 透传）
  │ 透传所有 SSE 事件，包括 reasoning
  ▼
DataEase 前端
  │ 接收 reasoning 事件，渲染在结果卡片中
```

### 2.2 三层信息架构

| 层 | 内容 | 展示位置 | 默认状态 |
|----|------|---------|---------|
| **问题理解** | 时间范围、指标、维度、筛选条件、数据源 | 结果卡片内，回答文字下方 | **默认展开** |
| **执行摘要** | 查询返回行数、耗时、成功率 | 结果卡片内，问题理解下方 | **默认展开** |
| **技术详情** | SQL、执行步骤、模型、Token 用量 | 结果卡片内，可折叠区域 | **默认折叠** |

### 2.3 前端交互

**结果卡片（StarbiResultCard.vue）：**

```
┌─────────────────────────────────────────┐
│ 📊 各区域销售额 Top5                      │
│                                          │
│ 💡 问题理解（默认展开）                     │
│ ┌─────────────────────────────────────┐ │
│ │ 时间范围: 本月 (2026年4月)            │ │
│ │ 指标: 销售额                          │ │
│ │ 维度: 区域                            │ │
│ │ 数据源: 连锁茶饮销售看板                │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 📈 执行摘要                              │
│ ┌─────────────────────────────────────┐ │
│ │ 查询返回 5 行，耗时 1.2s              │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ▼ 查看技术详情（默认折叠，点击展开）       │
│ ┌─────────────────────────────────────┐ │
│ │ SQL: SELECT region, SUM(amount)...   │ │
│ │ 步骤1: LLM 理解问题并改写...          │ │
│ │ 步骤2: 匹配术语 "销售额" → amount     │ │
│ │ 模型: deepseek-chat                 │ │
│ │ Token: 1,234                        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**展开状态记忆**：每个对话记录的展开状态存入 localStorage（key: `reasoning-expanded-{recordId}`），下次打开同一记录时恢复。

## 3. 后端改动

### 3.1 SQLBot 侧

在 prompt 模板 `template.yaml` 中增加推理要求：

```yaml
reasoning:
  instruction: |
    在生成 SQL 之前，先简要说明你对问题的理解：
    1. 你识别出的时间范围是什么
    2. 你识别出的指标是什么
    3. 你识别出的维度是什么
    4. 你识别出的筛选条件是什么
    5. 你选择了哪个数据源/表
    请以 JSON 格式输出，每项包含 field 和 value。
```

在 SSE 输出 `stream_sql()` 中增加 reasoning 事件：

```python
# 在生成 SQL 之前，先输出 reasoning
reasoning = {
    "time_range": {"field": "时间范围", "value": "本月 (2026年4月)"},
    "metrics": [{"field": "指标", "value": "销售额"}],
    "dimensions": [{"field": "维度", "value": "区域"}],
    "filters": [],
    "datasource": {"field": "数据源", "value": "连锁茶饮销售看板"}
}
yield f"event: reasoning\ndata: {json.dumps(reasoning)}\n\n"
```

### 3.2 DataEase 后端

`SseStreamProxy.java` 已经是透传模式（`response.getOutputStream().write()`），不需要改动。

## 4. 前端改动

| 文件 | 改动内容 |
|------|---------|
| `StarbiResultCard.vue` | 增加三层信息展示区域，绑定 SSE reasoning 事件 |
| `useSqlbotNewConversation.ts` | 增加 reasoning 事件解析，存入 record 对象 |
| `ExecutionDetailsDrawer.vue` | 可选保留，或把技术详情部分移到卡片内 |

## 5. 边界

- reasoning 内容由 LLM 生成，可能存在幻觉。LLM 理解错误时用户通过问题理解摘要可以快速发现
- reasoning 事件 SSE 顺序：必须在 sql 事件之前，chart/data 事件之前或之后均可
- 不使用前端硬编码映射表

## 7. UI 设计规范

### 7.1 设计系统

| 属性 | 值 |
|------|---|
| 风格 | Data-Dense Dashboard（数据密集但可扫描） |
| 主色 | `#1E40AF`（蓝色主调） |
| 背景 | `#F8FAFC`（浅灰） |
| 前景 | `#1E3A8A`（深蓝文字） |
| 边框 | `#DBEAFE`（浅蓝边框） |
| 辅助文字 | `#64748B`（灰色标签） |
| 衬线/背景 | `#CBD5E1`（分割线） |
| 字体 | PingFang SC, Helvetica Neue, Microsoft YaHei（中文优先） |
| 等宽字体 | Fira Code, SF Mono, Monaco（SQL 代码块） |
| 圆角 | 8px（卡片/面板）、6px（按钮/标签） |
| 过渡 | 200ms ease-out（所有交互） |
| 图标 | SVG（Lucide 风格），禁止 emoji 作为结构性图标 |
| 间距 | 4px 倍数系统（4/8/12/16/24） |

### 7.2 三个前端组件

#### ReasoningPanel.vue（推理显性化面板）

位置：`src/views/sqlbot/components/ReasoningPanel.vue`

三层信息架构：

1. **问题理解**（默认展开）：
   - 每条 reasoning 行 = 左侧灰色标签（field）+ 右侧深蓝值（value）
   - 标签宽 60px 最小，字号 12px，颜色 #64748b
   - 值字号 13px，颜色 #1e3a8a，字重 500

2. **执行摘要**（默认展开）：
   - 横向排列指标卡片：返回行数 / 耗时 / Token
   - 数值 18px bold，标签 11px 灰色

3. **技术详情**（默认折叠，localStorage 记住状态）：
   - SQL 代码块：深色背景 #1e293b，等宽字体，圆角 6px
   - 执行步骤：时间线样式（蓝色圆点 + 竖线连接）
   - 步骤标签 12px 深蓝，步骤详情 12px

**Props**：reasoning, rowCount, duration, tokenCount, executionSql, executionSteps, modelName, recordId

#### ScopeBar.vue（会话范围状态条）

位置：`src/views/sqlbot-new/components/ScopeBar.vue`

- 浅蓝背景 `rgba(30,64,175,0.06)`，底部分割线
- 左侧：房子图标(SVG) + 主题名(bold) · 数据集 · 时间范围
- 右侧：切换主题按钮（边框+hover 背景加深+active 缩放 0.97）
- 仪表盘名显示为蓝色 pill badge
- Props：themeName, datasetName, timeRange, dashboardName
- Event：@switch

#### RecommendQuestions.vue（推荐问题列表）

位置：`src/views/sqlbot-new/components/RecommendQuestions.vue`

- 标题：SVG 对话图标 + "推荐分析"灰色小标题
- 列表：垂直堆叠，间距 6px
- 每张卡片：白色背景 + 边框 #e2e8f0，圆角 8px，内边距 10px 14px
- hover：背景微蓝 + 边框变蓝 + 右移 4px + 箭头渐显
- 字号 14px，行高 1.5
- Props：questions, loading, title
- Event：@select

### 7.3 已创建的示例文件

组件代码已写入项目：
- `dataease/core/core-frontend/src/views/sqlbot/components/ReasoningPanel.vue`
- `dataease/core/core-frontend/src/views/sqlbot-new/components/ScopeBar.vue`
- `dataease/core/core-frontend/src/views/sqlbot-new/components/RecommendQuestions.vue`

ESLint 0 错误，stylelint 0 错误。codex 执行 Task 3 时直接使用这些组件。

## 6. 兼容性

- reasoning 事件为可选：旧版本 SQLBot 不发 reasoning 事件时，前端不显示问题理解区域
- 新前端兼容旧后端，降级为仅显示原有内容
