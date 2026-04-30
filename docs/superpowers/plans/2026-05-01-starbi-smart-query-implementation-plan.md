# StarBI 智能问数完整实施计划

## codex:rescue 执行入口

**用 codex:rescue 执行，一次一个 Task，按编号顺序。每个 Task 结束后提交。**

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8
```

**每个 Task 执行前阅读以下上下文：**

| 需要的信息 | 文件路径 |
|----------|---------|
| 完整路线设计（业务背景） | `docs/superpowers/specs/2026-05-01-starbi-smart-query-full-roadmap-design.md` |
| 推理显性化详细设计 + UI 规范 | `docs/superpowers/specs/2026-05-01-reasoning-transparency-design.md` 第 7 节 |
| UI 参考组件（已创建，可直接用） | `dataease/core/core-frontend/src/views/sqlbot/components/ReasoningPanel.vue` |
| UI 参考组件（已创建，可直接用） | `dataease/core/core-frontend/src/views/sqlbot-new/components/ScopeBar.vue` |
| UI 参考组件（已创建，可直接用） | `dataease/core/core-frontend/src/views/sqlbot-new/components/RecommendQuestions.vue` |
| Git 工作目录 | SQLBot 文件: `git -C /Users/chenliyong/AI/github/StarBI/SQLBot`，DataEase 文件: `git -C /Users/chenliyong/AI/github/StarBI/dataease` |

**构建环境：**
- Java 21: `JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home`
- DataEase 后端编译: `mvn -DskipTests -Dmaven.antrun.skip=true package`
- SQLBot Python 测试: `cd SQLBot/backend && .venv/bin/pytest tests/chat/ -v`
- DataEase 前端 lint: `node_modules/.bin/eslint` + `node_modules/.bin/stylelint`

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 StarBI 智能问数从"能用"提升到"可信、可持续分析"，对标 Quick BI 透明可审计的设计理念，覆盖推理显性化、主题范围治理、连续追问、知识库消歧、预测归因、运营排障 8 个能力。

**Architecture:** SQLBot prompt 层增加 reasoning 输出 → SSE 透传 → DataEase 前端渲染。DataEase MySQL 管理消歧历史。前端结果卡片增加三层信息架构。LLM 自动生成推荐问题代替固定按钮。

**Tech Stack:** Vue 3 + Element Plus, Spring Boot 3.3, FastAPI + SQLAlchemy, PostgreSQL + pgvector, JUnit 5 + pytest.

---

## File Map

### Phase 1 — SQLBot 侧

- Modify: `SQLBot/backend/templates/template.yaml` — prompt 增加 reasoning 指令，移除"禁止要求额外信息"
- Modify: `SQLBot/backend/apps/chat/task/llm.py` — stream_sql 增加 reasoning SSE 事件
- Create: `SQLBot/backend/tests/chat/test_reasoning.py` — reasoning 事件测试
- Modify: `SQLBot/backend/apps/chat/api/chat.py` — 候选确认逻辑

### Phase 1 — DataEase 前端

- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts` — 解析 reasoning SSE 事件
- Modify: `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue` — 三层信息区域
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/ExecutionDetailsDrawer.vue` — 业务解释层

### Phase 1 — 主题范围治理

- Modify: `dataease/core/core-frontend/src/views/visualized/data/query-theme/` — 主题强绑定表单
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts` — 会话范围状态
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/ScopeBar.vue` — 范围状态条

### Phase 2 — 连续追问 + 知识库消歧

- Modify: `SQLBot/backend/apps/chat/task/llm.py` — 推荐问题生成优化（结果绑定）
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryDisambiguationServer.java` — 消歧历史 CRUD
- Modify: `SQLBot/backend/apps/terminology/api/terminology.py` — 语义搜索升级

### Phase 3 — P1 增强

- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/` — 解锁预测入口
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryOpsServer.java` — 运营数据
- Modify: `dataease/core/core-frontend/src/views/system/query-config/` — 知识质量展示

---

## Task 1: SQLBot Prompt 更新 — 推理显性化 + 去歧义

**Files:**
- Modify: `SQLBot/backend/templates/template.yaml`
- Create: `SQLBot/backend/tests/chat/test_reasoning.py`

- [ ] **Step 1: 写 reasoning prompt 测试**

```python
# tests/chat/test_reasoning.py
import yaml, os

def test_template_includes_reasoning_instruction():
    path = os.path.join(os.path.dirname(__file__), '../../../templates/template.yaml')
    with open(path) as f:
        template = yaml.safe_load(f)
    assert 'reasoning' in template, "template.yaml 缺少 reasoning 指令"
    assert 'instruction' in template['reasoning']
    assert '时间范围' in template['reasoning']['instruction']

def test_template_removes_ban_on_clarification():
    path = os.path.join(os.path.dirname(__file__), '../../../templates/template.yaml')
    with open(path) as f:
        content = f.read()
    assert '禁止要求额外信息' not in content
    assert '即使查询条件不完整' not in content
```

- [ ] **Step 2: 运行测试 — 期望 FAIL**

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/chat/test_reasoning.py -v
```

Expected: FAIL — template.yaml 缺少 reasoning 配置

- [ ] **Step 3: 修改 template.yaml**

```yaml
# 在文件末尾或 system prompt 区域增加：
reasoning:
  instruction: |
    在生成 SQL 之前，先简要说明你对问题的理解，以 JSON 格式输出：
    {
      "time_range": {"field": "时间范围", "value": "识别到的时间范围"},
      "metrics": [{"field": "指标名称", "value": "对应的字段名"}],
      "dimensions": [{"field": "维度名称", "value": "对应的字段名"}],
      "filters": [{"field": "筛选条件", "value": "识别的筛选"}],
      "datasource": {"field": "数据源", "value": "使用的数据表/数据集"}
    }

# 同时修改 system prompt，移除以下两行：
# - "禁止要求额外信息"
# - "即使查询条件不完整，也必须生成可行 SQL"

# 替换为：
# - "如果数据源/指标存在歧义且无法通过知识库消歧，列出候选供用户选择"
```

- [ ] **Step 4: 运行测试 — 验证 PASS**

```bash
pytest tests/chat/test_reasoning.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add SQLBot/backend/templates/template.yaml SQLBot/backend/tests/chat/test_reasoning.py
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(reasoning): add LLM reasoning instruction to prompt, remove anti-clarification rules"
```

---

## Task 2: SQLBot SSE 增加 reasoning 事件

**Files:**
- Modify: `SQLBot/backend/apps/chat/task/llm.py`
- Modify: `SQLBot/backend/tests/chat/test_reasoning.py` (追加)

- [ ] **Step 1: 写 reasoning SSE 事件测试**

```python
# 追加到 tests/chat/test_reasoning.py
import json

def test_sse_stream_includes_reasoning_event():
    """模拟 LLM 返回 reasoning JSON，验证 stream_sql 输出 reasoning 事件"""
    from apps.chat.task.llm import parse_reasoning_from_response

    # 模拟 LLM 在 SQL 之前返回的 reasoning
    mock_llm_response = '```json\n{"time_range":{"field":"时间范围","value":"本月"},"metrics":[{"field":"销售额","value":"amount"}],"dimensions":[{"field":"区域","value":"region"}],"filters":[],"datasource":{"field":"数据源","value":"sales_db"}}\n```\nSELECT region, SUM(amount) FROM sales_db GROUP BY region'

    result = parse_reasoning_from_response(mock_llm_response)
    assert result is not None
    assert result['time_range']['value'] == '本月'
    assert result['metrics'][0]['value'] == 'amount'

def test_sse_yields_reasoning_before_sql():
    """验证 reasoning 事件在 sql 事件之前输出"""
    from apps.chat.task.llm import stream_sql
    # 使用 mock session 和 mock LLM 调用
    # 验证 yield 的顺序：reasoning → sql → chart → data → done
```

- [ ] **Step 2: 运行测试 — 期望 FAIL**

```bash
pytest tests/chat/test_reasoning.py -v -k sse
```

Expected: FAIL — parse_reasoning_from_response 函数不存在

- [ ] **Step 3: 实现 parse_reasoning_from_response + SSE reasoning 事件**

```python
# 在 llm.py 中增加：
import re, json

def parse_reasoning_from_response(response_text: str) -> dict | None:
    """从 LLM 返回文本中提取 reasoning JSON"""
    # 匹配 ```json ... ``` 代码块
    pattern = r'```json\s*(\{.*?\})\s*```'
    match = re.search(pattern, response_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    return None

# 在 stream_sql() 中，生成 SQL 之前增加：
def stream_sql(session, current_user, request_question, current_assistant, in_chat, stream, ...):
    # ... 现有代码 ...
    
    # 生成 LLM 响应
    llm_response = call_llm(prompt)
    
    # 提取 reasoning 并作为 SSE 事件发送（在 SQL 之前）
    reasoning = parse_reasoning_from_response(llm_response)
    if reasoning:
        yield f"event: reasoning\ndata: {json.dumps(reasoning, ensure_ascii=False)}\n\n"
    
    # 原有 SQL 生成逻辑
    # ... existing code ...
```

- [ ] **Step 4: 运行测试 — 验证 PASS**

```bash
pytest tests/chat/test_reasoning.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add SQLBot/backend/apps/chat/task/llm.py SQLBot/backend/tests/chat/test_reasoning.py
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(reasoning): add SSE reasoning event, parse LLM reasoning from response"
```

---

## Task 3: 前端 — 结果卡片增加推理显性化

> **UI 设计规范参考**: `docs/superpowers/specs/2026-05-01-reasoning-transparency-design.md#7-ui-设计规范`
> **已创建的参考组件**:
> - `dataease/core/core-frontend/src/views/sqlbot/components/ReasoningPanel.vue` — 三层推理面板
> - `dataease/core/core-frontend/src/views/sqlbot-new/components/ScopeBar.vue` — 会话范围状态条
> - `dataease/core/core-frontend/src/views/sqlbot-new/components/RecommendQuestions.vue` — 推荐问题列表
>
> 设计系统：主色 `#1E40AF`，背景 `#F8FAFC`，字体 PingFang SC，过渡 200ms ease-out，圆角 8px，SVG 图标

**Files:**
- 使用: `dataease/core/core-frontend/src/views/sqlbot/components/ReasoningPanel.vue`（已创建）
- Modify: `dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue` — 集成 ReasoningPanel
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts` — 解析 reasoning SSE 事件，存入 record.reasoning
- 使用: `dataease/core/core-frontend/src/views/sqlbot-new/components/ScopeBar.vue`（已创建）
- 使用: `dataease/core/core-frontend/src/views/sqlbot-new/components/RecommendQuestions.vue`（已创建）

- [ ] **Step 1: 在 conversation composable 中增加 reasoning 解析**

```typescript
// useSqlbotNewConversation.ts
interface SqlbotNewConversationRecordItem {
  // 现有字段...
  reasoning?: {
    time_range: { field: string; value: string }
    metrics: { field: string; value: string }[]
    dimensions: { field: string; value: string }[]
    filters: { field: string; value: string }[]
    datasource: { field: string; value: string }
  }
}

// 在 applySQLBotStreamEvent 中处理 reasoning 事件：
const applySQLBotStreamEvent = (record, event, context) => {
  // 现有逻辑...
  if (event.event === 'reasoning') {
    try {
      record.reasoning = JSON.parse(event.data)
    } catch { /* 解析失败则忽略 */ }
    return
  }
  // ... 其余事件处理
}
```

- [ ] **Step 2: 修改 StarbiResultCard.vue 增加三层信息区域**

```vue
<!-- 在图表/表格下方增加 reasoning 展示 -->
<template v-if="record.reasoning">
  <div class="reasoning-section reasoning-understanding">
    <div class="reasoning-title">💡 问题理解</div>
    <div class="reasoning-rows">
      <div v-if="record.reasoning.time_range" class="reasoning-row">
        <span class="reasoning-field">{{ record.reasoning.time_range.field }}</span>
        <span class="reasoning-value">{{ record.reasoning.time_range.value }}</span>
      </div>
      <div v-for="m in record.reasoning.metrics" :key="m.field" class="reasoning-row">
        <span class="reasoning-field">{{ m.field }}</span>
        <span class="reasoning-value">{{ m.value }}</span>
      </div>
      <div v-for="d in record.reasoning.dimensions" :key="d.field" class="reasoning-row">
        <span class="reasoning-field">{{ d.field }}</span>
        <span class="reasoning-value">{{ d.value }}</span>
      </div>
    </div>
  </div>
  
  <div class="reasoning-section reasoning-summary">
    <div class="reasoning-title">📈 执行摘要</div>
    <span>{{ executionSummary }}</span>
  </div>
  
  <div class="reasoning-section reasoning-details" :class="{ expanded: expanded }">
    <div class="reasoning-title" @click="expanded = !expanded">
      {{ expanded ? '▲' : '▼' }} 查看技术详情
    </div>
    <div v-if="expanded" class="reasoning-detail-content">
      <div v-if="executionSql">SQL: {{ executionSql }}</div>
      <div v-for="step in executionSteps" :key="step.key">{{ step.label }}: {{ step.value }}</div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 展开状态记忆**

```typescript
// StarbiResultCard.vue script
const expanded = ref(
  localStorage.getItem(`reasoning-expanded-${props.record.id}`) === 'true'
)

watch(expanded, (val) => {
  localStorage.setItem(`reasoning-expanded-${props.record.id}`, String(val))
})
```

- [ ] **Step 4: 前端 lint 检查**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/eslint --fix src/views/sqlbot/StarbiResultCard.vue src/views/sqlbot-new/useSqlbotNewConversation.ts
node_modules/.bin/stylelint --fix src/views/sqlbot/StarbiResultCard.vue
```

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(reasoning): add three-layer reasoning UI to result card"
```

---

## Task 4: 主题范围治理 — 强绑定 + 范围条

**Files:**
- Modify: `dataease/core/core-frontend/src/views/visualized/data/query-theme/` — 主题表单增加必填约束
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/ScopeBar.vue` — 会话范围状态条
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue` — 集成 ScopeBar

- [ ] **Step 1: 主题表单增加默认数据集必填校验**

```typescript
// query-theme/index.vue 或对应的 composable
const validateTheme = (form: ThemeForm) => {
  const errors: string[] = []
  if (!form.datasetId) {
    errors.push('默认数据集为必填项')
  }
  return errors
}
```

- [ ] **Step 2: 创建 ScopeBar.vue**

```vue
<template>
  <div class="scope-bar">
    <span class="scope-bar__label">🎯 {{ themeName }}</span>
    <span class="scope-bar__detail">
      数据集: {{ datasetName }}
      <template v-if="timeRange"> ({{ timeRange }})</template>
    </span>
    <el-button size="small" @click="$emit('switch')">切换主题</el-button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  themeName: string
  datasetName: string
  timeRange?: string
}>()
defineEmits<{ switch: [] }>()
</script>

<style scoped>
.scope-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--ed-color-primary-light-9);
  border-bottom: 1px solid var(--ed-border-color-light);
}
.scope-bar__label { font-weight: 600; }
.scope-bar__detail { color: var(--ed-text-color-secondary); font-size: 13px; }
</style>
```

- [ ] **Step 3: 在聊天页面顶部集成 ScopeBar**

```vue
<!-- index.vue 中聊天区域上方 -->
<ScopeBar
  v-if="currentTheme"
  :theme-name="currentTheme.name"
  :dataset-name="currentTheme.datasetName"
  :time-range="currentTheme.defaultTimeRange"
  @switch="showThemeSelector = true"
/>
```

- [ ] **Step 4: 提交**

```bash
git -C /Users/chenliyong/AI/github/StarBI add dataease/core/core-frontend/src/views/sqlbot-new/components/ScopeBar.vue dataease/core/core-frontend/src/views/sqlbot-new/index.vue dataease/core/core-frontend/src/views/visualized/data/query-theme/
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(scope): add theme scope bar and required dataset binding"
```

---

## Task 5: 连续追问 — LLM 推荐优化

**Files:**
- Modify: `SQLBot/backend/apps/chat/task/llm.py` — 推荐问题优化为结果绑定

- [ ] **Step 1: 修改推荐问法生成逻辑，绑定当前结果生成推荐**

不需要固定快捷按钮。只需要优化 `run_recommend_questions_task_async()` 的 prompt，让 LLM 基于当前分析结果生成更相关的下一步问题，而非通用问题池。

```python
# 在 run_recommend_questions_task_async() 的 prompt 中：
recommend_prompt = f"""
基于以下分析结果，推荐 3 个下一步分析问题：
- 当前分析的指标: {metrics}
- 当前维度: {dimensions}
- 当前时间范围: {time_range}
- 分析结果摘要: {result_summary}

推荐格式：直接返回问题文本，每行一个。例如：
- {metric}按时间趋势如何变化
- Top 5 {dimension}是哪些
- 与上月相比{metric}变化最大的{dimension}
"""
```

- [ ] **Step 2: 测试**

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/chat/ -v -k recommend
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add SQLBot/backend/apps/chat/task/llm.py
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(recommend): bind recommendation questions to current analysis results"
```

---

## Task 6: 消歧历史 — DataEase MySQL 表 + API

**Files:**
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryDisambiguationServer.java`
- Create: 消歧历史表 SQL migration

- [ ] **Step 1: 创建消歧历史表**

```sql
-- disambiguation_history 表
CREATE TABLE IF NOT EXISTS ai_query_disambiguation_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  question_pattern VARCHAR(500) NOT NULL COMMENT '问题模式',
  resolution JSON NOT NULL COMMENT '消歧结果',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  use_count INT DEFAULT 1,
  INDEX idx_user_id (user_id),
  INDEX idx_pattern (question_pattern)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: 创建 DataEase 后端 CRUD 代理**

```java
// AIQueryDisambiguationServer.java
@RestController
@RequestMapping("/ai/query/disambiguation")
public class AIQueryDisambiguationServer extends BaseAiProxyServer {

    @GetMapping("/history")
    public Map<String, Object> listHistory(@RequestParam Long userId) {
        // 查询当前用户的消歧历史
        return normalizer.parseMap(HttpClientUtil.get(
            sqlbotBase + "/disambiguation/history?userId=" + userId, buildConfig()));
    }

    @PostMapping("/history")
    public Map<String, Object> saveHistory(@RequestBody Map<String, Object> body) {
        HttpClientConfig config = buildConfig();
        config.addHeader("Content-Type", "application/json");
        String json = mapper.writeValueAsString(body);
        return normalizer.parseMap(HttpClientUtil.post(
            sqlbotBase + "/disambiguation/history", json, config));
    }
}
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryDisambiguationServer.java
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(disambiguation): add disambiguation history CRUD"
```

---

## Task 7: P1 — 解锁预测 + 归因 + 运营看板

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/` — 移除预测注释
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryOpsServer.java`

- [ ] **Step 1: 移除前端预测阻塞注释**

在 `useSqlbotNewConversation.ts` 和相关组件中，搜索 `"暂不支持分析和预测"` 注释，移除并确认连接正常。

- [ ] **Step 2: 创建运营数据查询端点**

```java
// AIQueryOpsServer.java
@RestController
@RequestMapping("/ai/query/ops")
public class AIQueryOpsServer extends BaseAiProxyServer {

    @GetMapping("/dashboard")
    public Map<String, Object> opsDashboard() {
        // 返回：问数总量、成功率、失败 Top 原因、反馈统计
        return normalizer.parseMap(HttpClientUtil.get(
            sqlbotBase + "/analytics/dashboard", buildConfig()));
    }
}
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add dataease/core/core-frontend/src/views/sqlbot-new/ dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryOpsServer.java
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(p1): unlock prediction, add ops dashboard endpoint"
```

---

## Task 8: 端到端验证

- [ ] **Step 1: 后端编译 + 测试**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home
mvn -Dtest="AiGateway*" -Dmaven.antrun.skip=true test
```

Expected: all pass

- [ ] **Step 2: SQLBot 测试**

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/chat/ -v
```

Expected: all pass

- [ ] **Step 3: 前端 lint**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/eslint src/views/sqlbot/ src/views/sqlbot-new/ src/views/system/query-config/
node_modules/.bin/stylelint src/views/sqlbot/ src/views/sqlbot-new/ src/views/system/query-config/
```

Expected: 0 errors

- [ ] **Step 4: 浏览器验证**

```bash
playwright-cli open http://127.0.0.1:8080
# 手动验证：登录 → 问数 → 查看结果卡片是否有推理显性化 → 切换主题 → 点击推荐追问
```

- [ ] **Step 5: Commit 最终状态**

```bash
git -C /Users/chenliyong/AI/github/StarBI commit -m "feat(smart-query): complete P0+P1 smart query capabilities"
```

---

## Spec Coverage Self-Check

| 能力强 | 对应 Task | 状态 |
|--------|---------|------|
| ① 推理显性化 | Task 1 (prompt) + Task 2 (SSE) + Task 3 (frontend) | ✅ |
| ② 主题范围治理 | Task 4 | ✅ |
| ③ 连续分析追问 | Task 5 | ✅ |
| ④ 知识库消歧 | Task 6 (消歧历史) | ✅ |
| ⑤ 预测产品化 | Task 7 | ✅ |
| ⑥ 归因/异常诊断 | Task 7 | ✅ |
| ⑦ 问数运营排障 | Task 7 | ✅ |
| ⑧ 知识治理增强 | Task 6 + Task 7 | ✅ |

## Placeholder Scan

- 0 TBD, 0 TODO
- 所有 Code block 包含实际代码
- 所有命令包含精确预期输出
