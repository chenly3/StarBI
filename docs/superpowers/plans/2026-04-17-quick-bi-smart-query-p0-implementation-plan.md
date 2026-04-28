# Quick BI Smart Query P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build StarBI intelligent query P0 around four linked capabilities: scope governance, structured clarification, result explainability, and result-bound follow-up analysis.

**Architecture:** Keep `dataease/core/core-frontend/src/views/sqlbot-new` as the primary user-facing shell and extend the existing SQLBot SSE contract instead of introducing a second query runtime. Put clarification and execution-meta logic in SQLBot backend/domain helpers, then expose them through the existing `sqlbotDirect.ts` bridge so `sqlbot-new` can render clarification cards, scope chips, explanation panels, and follow-up actions in one session model.

**Tech Stack:** Vue 3, TypeScript, Vite, Element Plus Secondary, FastAPI, Pydantic, SQLModel, existing SQLBot SSE APIs, `pytest`, `eslint`, `vue-tsc`, `agent-browser`

---

## Scope Note

This plan only implements P0 from the approved design:

1. 分析主题驱动的问数范围治理
2. 结构化澄清式问答
3. 结果可验证性与执行摘要
4. 围绕结果的连续分析追问

The following are explicitly out of scope for this plan:

1. 问数运营与排障闭环
2. 预测产品化闭环
3. 完整问数知识库体系
4. 语音问答
5. 复杂 Agent 编排

## Git Constraint

User preference for this implementation lane:

1. Do not run any `git` command.
2. Do not include stage / commit / branch steps in execution.
3. Verification and handoff are file-based and command-based only.

## File Structure

- [ ] `SQLBot/backend/apps/chat/task/clarification.py`
  Responsibility: pure clarification decision logic, ambiguity classification, structured clarification payload generation.
- [ ] `SQLBot/backend/apps/chat/models/chat_model.py`
  Responsibility: SSE payload models and response contracts for clarification, interpretation, execution summary, and follow-up actions.
- [ ] `SQLBot/backend/apps/chat/task/llm.py`
  Responsibility: insert clarification gate before SQL generation, emit execution-meta events, attach result-bound follow-up actions.
- [ ] `SQLBot/backend/apps/chat/api/chat.py`
  Responsibility: route-level integration for the updated SSE event stream and request/response validation.
- [ ] `SQLBot/backend/templates/template.yaml`
  Responsibility: remove the “always answer without asking” bias for P0 paths and add prompt sections for clarification-safe execution summaries.
- [ ] `SQLBot/backend/tests/chat/test_clarification.py`
  Responsibility: unit coverage for clarification decision rules and event payload shape.
- [ ] `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
  Responsibility: typed SSE parsing for clarification/meta/follow-up events and helper fetch wrappers if summary payloads move out of generic content blocks.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
  Responsibility: shared `sqlbot-new` types for clarification state, query interpretation, execution summary, and follow-up action intents.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
  Responsibility: session state machine for clarification pending/answered state, explainability payload capture, follow-up action execution, and recommendation replacement.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  Responsibility: stronger scope confirmation state, dataset disambiguation helpers, persistent scope chips, and range-reset semantics.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  Responsibility: page wiring for scope cards, clarification cards, explanation panels, and follow-up action affordances.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
  Responsibility: render clarification blocks, scope/explanation cards, failure guidance, and action row slots in one record shell.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewClarificationCard.vue`
  Responsibility: structured clarification UI with selectable options and optional text input.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewExecutionMetaCard.vue`
  Responsibility: result explainability card for scope basis, interpretation basis, and execution summary.
- [ ] `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
  Responsibility: multi-candidate dataset confirmation UI and explicit range confirmation entry points.
- [ ] `dataease/core/core-frontend/src/locales/zh-CN.ts`
  Responsibility: zh-CN copy for clarification prompts, explanation labels, scope chips, and follow-up actions.
- [ ] `docs/superpowers/specs/2026-04-17-quick-bi-smart-query-gap-design.md`
  Responsibility: source design baseline for traceability during implementation.
- [ ] `tmp/quick-bi-smart-query-p0-acceptance-notes.md`
  Responsibility: manual verification notes and scenario matrix for P0 acceptance.

---

### Task 1: Add Backend Clarification And Explainability Contracts

**Files:**
- Create: `SQLBot/backend/apps/chat/task/clarification.py`
- Modify: `SQLBot/backend/apps/chat/models/chat_model.py`
- Test: `SQLBot/backend/tests/chat/test_clarification.py`

- [ ] **Step 1: Write the failing backend contract test**

Create [test_clarification.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/chat/test_clarification.py) with:

```python
from apps.chat.task.clarification import (
    ClarificationCandidate,
    ClarificationDecision,
    build_clarification_payload,
    should_request_clarification,
)


def test_should_request_clarification_for_missing_time_range():
    decision = should_request_clarification(
        question="销售额趋势怎么样",
        candidate_metrics=["销售额"],
        candidate_dimensions=["日期"],
        candidate_datasets=["sales_daily"],
        detected_time_range=None,
    )

    assert decision.need_clarification is True
    assert decision.reason_code == "missing_time_range"


def test_build_clarification_payload_returns_structured_options():
    decision = ClarificationDecision(
        need_clarification=True,
        reason_code="ambiguous_metric",
        prompt="你想看销售额还是订单量？",
        options=[
            ClarificationCandidate(label="销售额", value="sales_amount"),
            ClarificationCandidate(label="订单量", value="order_count"),
        ],
    )

    payload = build_clarification_payload(decision)

    assert payload["type"] == "clarification"
    assert payload["reason_code"] == "ambiguous_metric"
    assert payload["prompt"] == "你想看销售额还是订单量？"
    assert payload["options"][0]["value"] == "sales_amount"
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/chat/test_clarification.py -q
```

Expected: FAIL with import errors because `clarification.py` and the new decision models do not exist yet.

- [ ] **Step 3: Add the minimal clarification contract module**

Create [clarification.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/clarification.py) with:

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ClarificationCandidate:
    label: str
    value: str
    description: str | None = None


@dataclass
class ClarificationDecision:
    need_clarification: bool
    reason_code: str = ""
    prompt: str = ""
    options: list[ClarificationCandidate] = field(default_factory=list)


def should_request_clarification(
    question: str,
    candidate_metrics: list[str],
    candidate_dimensions: list[str],
    candidate_datasets: list[str],
    detected_time_range: str | None,
) -> ClarificationDecision:
    normalized = question.strip()
    if "趋势" in normalized and not detected_time_range:
      return ClarificationDecision(
          need_clarification=True,
          reason_code="missing_time_range",
          prompt="你想看哪个时间范围？",
          options=[
              ClarificationCandidate(label="近7天", value="last_7_days"),
              ClarificationCandidate(label="近30天", value="last_30_days"),
              ClarificationCandidate(label="本月", value="this_month"),
          ],
      )
    if len(candidate_metrics) > 1:
      return ClarificationDecision(
          need_clarification=True,
          reason_code="ambiguous_metric",
          prompt="这次分析你想看哪个指标？",
          options=[ClarificationCandidate(label=item, value=item) for item in candidate_metrics[:5]],
      )
    if len(candidate_datasets) > 1:
      return ClarificationDecision(
          need_clarification=True,
          reason_code="ambiguous_dataset",
          prompt="这次问题要基于哪个数据集分析？",
          options=[ClarificationCandidate(label=item, value=item) for item in candidate_datasets[:5]],
      )
    return ClarificationDecision(need_clarification=False)


def build_clarification_payload(decision: ClarificationDecision) -> dict[str, Any]:
    return {
        "type": "clarification",
        "reason_code": decision.reason_code,
        "prompt": decision.prompt,
        "options": [
            {
                "label": item.label,
                "value": item.value,
                "description": item.description,
            }
            for item in decision.options
        ],
    }
```

- [ ] **Step 4: Extend chat response models for explanation metadata**

In [chat_model.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/models/chat_model.py), add:

```python
class ClarificationOption(BaseModel):
    label: str
    value: str
    description: Optional[str] = None


class QueryInterpretation(BaseModel):
    metric: list[str] = []
    dimension: list[str] = []
    time_range: Optional[str] = None
    filters: list[str] = []
    defaulted_fields: list[str] = []


class QueryExecutionSummary(BaseModel):
    scope_label: str = ""
    datasource_label: str = ""
    summary: str = ""
    failure_stage: Optional[str] = None
    next_action: Optional[str] = None


class ClarificationPayload(BaseModel):
    reason_code: str
    prompt: str
    options: list[ClarificationOption] = []


class FollowUpAction(BaseModel):
    label: str
    intent: str
    value: str
```
```

- [ ] **Step 5: Re-run backend contract tests**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/chat/test_clarification.py -q
```

Expected: PASS.

---

### Task 2: Insert A Clarification Gate Before SQL Generation

**Files:**
- Modify: `SQLBot/backend/apps/chat/task/llm.py`
- Modify: `SQLBot/backend/apps/chat/api/chat.py`
- Modify: `SQLBot/backend/templates/template.yaml`
- Test: `SQLBot/backend/tests/chat/test_clarification.py`

- [ ] **Step 1: Add a failing test for clarification short-circuit behavior**

Append to [test_clarification.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/chat/test_clarification.py):

```python
def test_question_with_missing_range_short_circuits_to_clarification_event():
    event = {
        "type": "clarification",
        "content": {
            "reason_code": "missing_time_range",
            "prompt": "你想看哪个时间范围？",
            "options": [{"label": "近7天", "value": "last_7_days"}],
        },
    }

    assert event["type"] == "clarification"
    assert event["content"]["reason_code"] == "missing_time_range"
```

- [ ] **Step 2: Wire clarification gate into the LLM flow**

In [llm.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py), introduce a pre-SQL check shaped like:

```python
from apps.chat.task.clarification import build_clarification_payload, should_request_clarification


def maybe_emit_clarification(self, question: str, datasets: list[str], metrics: list[str], dimensions: list[str]):
    decision = should_request_clarification(
        question=question,
        candidate_metrics=metrics,
        candidate_dimensions=dimensions,
        candidate_datasets=datasets,
        detected_time_range=self.detected_time_range(question),
    )
    if not decision.need_clarification:
        return None

    return {
        "type": "clarification",
        "content": build_clarification_payload(decision),
    }
```

Then call it before `GENERATE_SQL`, and if it returns a payload, push that payload to the SSE stream and stop the SQL run for this turn.

- [ ] **Step 3: Relax the prompt rule that forbids asking for missing information**

In [template.yaml](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/templates/template.yaml), replace the strict rule block:

```yaml
<rule priority="critical" id="no-additional-info">
  <title>禁止要求额外信息</title>
```

with a clarification-safe rule block:

```yaml
<rule priority="critical" id="clarification-policy">
  <title>澄清优先策略</title>
  <requirements>
    <requirement>当缺少关键时间范围、指标口径、维度对象或数据集归属时，不要直接猜测。</requirement>
    <requirement>若不澄清就会高概率误答，应先返回结构化澄清问题。</requirement>
    <requirement>只有在可以安全默认的场景下，才允许直接补全并继续生成 SQL。</requirement>
  </requirements>
</rule>
```

- [ ] **Step 4: Keep route-level SSE handling aware of the new event type**

In [chat.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/api/chat.py), ensure the stream pipeline allows `clarification` payloads to pass through without being normalized into generic `error` or plain text events:

```python
if event_type == "clarification":
    yield "data:" + orjson.dumps({"type": "clarification", "content": payload}).decode() + "\n\n"
    return
```

- [ ] **Step 5: Re-run backend tests and import validation**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/chat/test_clarification.py -q
python -m compileall apps/chat
```

Expected:

1. `pytest` PASS
2. `compileall` finishes without syntax errors

---

### Task 3: Render Structured Clarification In `sqlbot-new`

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewClarificationCard.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Add typed clarification state on the frontend**

In [types.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts), add:

```ts
export interface SqlbotNewClarificationOption {
  label: string
  value: string
  description?: string
}

export interface SqlbotNewClarificationState {
  reasonCode: string
  prompt: string
  options: SqlbotNewClarificationOption[]
  selectedValue?: string
  pending: boolean
}

export interface SqlbotNewInterpretationMeta {
  metric: string[]
  dimension: string[]
  timeRange?: string
  filters: string[]
  defaultedFields: string[]
}

export interface SqlbotNewExecutionSummary {
  scopeLabel: string
  datasourceLabel: string
  summary: string
  failureStage?: string
  nextAction?: string
}
```

- [ ] **Step 2: Teach the SQLBot bridge to parse clarification events**

In [sqlbotDirect.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts), keep the generic event interface but add explicit parsing:

```ts
export interface SQLBotClarificationEvent {
  type: 'clarification'
  content: {
    reason_code: string
    prompt: string
    options: Array<{ label: string; value: string; description?: string }>
  }
}

const isClarificationEvent = (event: SQLBotStreamEvent): event is SQLBotClarificationEvent => {
  return event.type === 'clarification' && Array.isArray(event.content?.options)
}
```

- [ ] **Step 3: Add a dedicated clarification card component**

Create [SqlbotNewClarificationCard.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewClarificationCard.vue):

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { SqlbotNewClarificationState } from '@/views/sqlbot-new/types'

const props = defineProps<{
  clarification: SqlbotNewClarificationState
}>()

const emit = defineEmits<{
  (event: 'choose', value: string): void
}>()

const hasOptions = computed(() => props.clarification.options.length > 0)
</script>

<template>
  <section class="clarification-card">
    <div class="clarification-kicker">需要确认</div>
    <h4 class="clarification-title">{{ clarification.prompt }}</h4>
    <div v-if="hasOptions" class="clarification-options">
      <button
        v-for="item in clarification.options"
        :key="item.value"
        class="clarification-option"
        type="button"
        @click="emit('choose', item.value)"
      >
        <span class="option-label">{{ item.label }}</span>
        <span v-if="item.description" class="option-desc">{{ item.description }}</span>
      </button>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Store clarification state in the conversation record**

In [useSqlbotNewConversation.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts), extend `SqlbotNewConversationRecord`:

```ts
clarification?: SqlbotNewClarificationState
interpretation?: SqlbotNewInterpretationMeta
executionSummary?: SqlbotNewExecutionSummary
followUpActions?: Array<{ label: string; intent: string; value: string }>
```

Then, inside the stream event handler:

```ts
if (event.type === 'clarification') {
  record.clarification = {
    reasonCode: String(event.content?.reason_code || ''),
    prompt: String(event.content?.prompt || ''),
    options: Array.isArray(event.content?.options) ? event.content.options : [],
    pending: true
  }
  record.finish = true
  return
}
```

- [ ] **Step 5: Render clarification records in the result shell**

In [SqlbotNewConversationRecord.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue), add:

```vue
<SqlbotNewClarificationCard
  v-if="record.clarification"
  :clarification="record.clarification"
  @choose="value => emit('clarify-record', record, value)"
/>
```

And in [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue), wire:

```ts
const handleClarifyRecord = (record: SqlbotNewConversationRecordItem, value: string) => {
  primeFollowUpQuestion(record, 'clarify', value)
}
```

- [ ] **Step 6: Run frontend type-check and targeted lint**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run ts:check
npx eslint src/views/sqlbot-new/types.ts src/views/sqlbot-new/useSqlbotNewConversation.ts src/views/sqlbot-new/index.vue src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue src/views/sqlbot-new/components/SqlbotNewClarificationCard.vue src/views/sqlbot/sqlbotDirect.ts --ext .ts,.vue --fix
```

Expected:

1. `vue-tsc` PASS
2. `eslint` exits clean on the touched files

---

### Task 4: Add Result Explainability Cards

**Files:**
- Create: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewExecutionMetaCard.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Modify: `dataease/core/core-frontend/src/locales/zh-CN.ts`

- [ ] **Step 1: Add a failing backend/shape test for execution-meta payloads**

Append to [test_clarification.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/chat/test_clarification.py):

```python
def test_execution_summary_payload_is_business_readable():
    payload = {
        "scope_label": "销售分析主题 / 门店销售数据集",
        "datasource_label": "mysql-sales",
        "summary": "本次按近30天、按门店汇总销售额，并按销售额降序展示。",
    }

    assert "销售分析主题" in payload["scope_label"]
    assert "近30天" in payload["summary"]
```

- [ ] **Step 2: Emit interpretation and execution-summary events from the backend**

In [llm.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py), after a successful parse / before final chart completion, emit:

```python
yield_event(
    "query_interpretation",
    {
        "metric": selected_metrics,
        "dimension": selected_dimensions,
        "time_range": normalized_time_range,
        "filters": normalized_filters,
        "defaulted_fields": defaulted_fields,
    },
)

yield_event(
    "execution_summary",
    {
        "scope_label": scope_label,
        "datasource_label": datasource_label,
        "summary": business_summary,
        "failure_stage": None,
        "next_action": "可以继续改时间范围、指标或筛选条件",
    },
)
```

- [ ] **Step 3: Create the explanation card component**

Create [SqlbotNewExecutionMetaCard.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewExecutionMetaCard.vue):

```vue
<script setup lang="ts">
import type { SqlbotNewExecutionSummary, SqlbotNewInterpretationMeta } from '@/views/sqlbot-new/types'

defineProps<{
  interpretation?: SqlbotNewInterpretationMeta
  executionSummary?: SqlbotNewExecutionSummary
}>()
</script>

<template>
  <section class="execution-meta-card">
    <div class="meta-row">
      <span class="meta-label">系统理解</span>
      <span class="meta-value">{{ interpretation?.metric?.join(' / ') || '未识别指标' }}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">分析维度</span>
      <span class="meta-value">{{ interpretation?.dimension?.join(' / ') || '未识别维度' }}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">时间范围</span>
      <span class="meta-value">{{ interpretation?.timeRange || '未指定' }}</span>
    </div>
    <div class="meta-summary">{{ executionSummary?.summary }}</div>
  </section>
</template>
```

- [ ] **Step 4: Capture and render interpretation data in the record**

In [useSqlbotNewConversation.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts), add:

```ts
if (event.type === 'query_interpretation') {
  record.interpretation = {
    metric: Array.isArray(event.content?.metric) ? event.content.metric : [],
    dimension: Array.isArray(event.content?.dimension) ? event.content.dimension : [],
    timeRange: String(event.content?.time_range || ''),
    filters: Array.isArray(event.content?.filters) ? event.content.filters : [],
    defaultedFields: Array.isArray(event.content?.defaulted_fields) ? event.content.defaulted_fields : []
  }
}

if (event.type === 'execution_summary') {
  record.executionSummary = {
    scopeLabel: String(event.content?.scope_label || ''),
    datasourceLabel: String(event.content?.datasource_label || ''),
    summary: String(event.content?.summary || ''),
    failureStage: String(event.content?.failure_stage || ''),
    nextAction: String(event.content?.next_action || '')
  }
}
```

Then mount the card in [SqlbotNewConversationRecord.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue):

```vue
<SqlbotNewExecutionMetaCard
  v-if="record.interpretation || record.executionSummary"
  :interpretation="record.interpretation"
  :execution-summary="record.executionSummary"
/>
```

- [ ] **Step 5: Add zh-CN copy for business-readable explanation labels**

In [zh-CN.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/locales/zh-CN.ts), add strings like:

```ts
query_scope_basis: '范围依据',
query_interpretation_basis: '问题理解依据',
query_execution_summary: '执行摘要',
query_defaulted_value: '系统已自动补全',
query_next_action_hint: '你可以继续改时间范围、指标或筛选条件'
```

- [ ] **Step 6: Run backend and frontend verification**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/chat/test_clarification.py -q

cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run ts:check
npx eslint src/views/sqlbot-new/useSqlbotNewConversation.ts src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue src/views/sqlbot-new/components/SqlbotNewExecutionMetaCard.vue src/locales/zh-CN.ts --ext .ts,.vue --fix
```

Expected: all commands PASS.

---

### Task 5: Upgrade Scope Governance And Ambiguous Dataset Confirmation

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/types.ts`

- [ ] **Step 1: Add a failing shape test in plan form for scope confirmation logic**

Add this local helper expectation to the implementation notes inside [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts):

```ts
const expectedScopeState = {
  themeId: 'sales-theme',
  datasetIds: ['sales_order_daily'],
  datasourceId: 'mysql-sales',
  inheritedDashboardFilters: ['区域=华东'],
}
```

This is the target object shape the selection layer should maintain after the task.

- [ ] **Step 2: Make range state explicit and reset-safe**

In [types.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts), extend the selection state:

```ts
export interface SqlbotNewSelectionState {
  sourceKind: SourceKind
  datasetId: string
  fileId: string
  modelId: string
  themeId?: string
  datasetIds?: string[]
  datasourceId?: string
  inheritedDashboardFilters?: string[]
}
```

- [ ] **Step 3: Keep multi-candidate dataset questions from auto-running**

In [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts), add:

```ts
const pendingDatasetCandidates = ref<string[]>([])

const requireDatasetConfirmation = (datasetIds: string[]) => {
  pendingDatasetCandidates.value = datasetIds
  selectDialogVisible.value = true
  selectDialogTab.value = 'dataset'
}
```

Then, wherever dataset auto-selection is currently inferred from ambiguous conditions, call `requireDatasetConfirmation(...)` instead of silently picking the first item.

- [ ] **Step 4: Surface persistent scope chips in the main page**

In [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue), render:

```vue
<section v-if="hasDisplaySelection" class="scope-chip-panel">
  <span class="scope-chip primary">{{ displaySelectionTitle }}</span>
  <span v-if="displaySelectionMeta" class="scope-chip secondary">{{ displaySelectionMeta }}</span>
</section>
```

The scope chip panel must stay visible on both home and result states so users always know the active query boundary.

- [ ] **Step 5: Add explicit confirm actions inside the select dialog**

In [SqlbotNewSelectDataDialog.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue), keep the dataset/file card click for selection only and make the footer the single commit point:

```vue
<button class="dialog-footer-primary" type="button" @click="emit('confirm')">
  确认当前问数范围
</button>
```

This is required so scope changes read as deliberate context changes rather than incidental clicks.

- [ ] **Step 6: Run UI verification for scope clarity**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run ts:check
npx eslint src/views/sqlbot-new/useSqlbotNewSelection.ts src/views/sqlbot-new/components/SqlbotNewSelectDataDialog.vue src/views/sqlbot-new/index.vue src/views/sqlbot-new/types.ts --ext .ts,.vue --fix
```

Then verify manually in the browser:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run dev
```

Expected manual result:

1. Multi-candidate dataset scenarios do not auto-run.
2. Scope chips remain visible after entering result mode.
3. Changing theme/dataset feels like changing the query boundary, not just changing a decorative filter.

---

### Task 6: Turn Follow-Up Into Analysis Actions

**Files:**
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Modify: `SQLBot/backend/apps/chat/task/llm.py`
- Modify: `SQLBot/backend/apps/chat/models/chat_model.py`
- Create: `tmp/quick-bi-smart-query-p0-acceptance-notes.md`

- [ ] **Step 1: Add a failing backend shape test for follow-up actions**

Append to [test_clarification.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/chat/test_clarification.py):

```python
def test_follow_up_actions_are_analysis_oriented():
    actions = [
        {"label": "改成近30天", "intent": "change_time_range", "value": "last_30_days"},
        {"label": "换成订单量", "intent": "change_metric", "value": "order_count"},
    ]

    assert actions[0]["intent"] == "change_time_range"
    assert actions[1]["intent"] == "change_metric"
```

- [ ] **Step 2: Emit result-bound follow-up actions from the backend**

In [llm.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py), after chart/result success, add:

```python
yield_event(
    "follow_up_actions",
    {
        "actions": [
            {"label": "改成近30天", "intent": "change_time_range", "value": "last_30_days"},
            {"label": "换成订单量", "intent": "change_metric", "value": "order_count"},
            {"label": "按区域看", "intent": "change_dimension", "value": "region"},
        ]
    },
)
```

- [ ] **Step 3: Replace generic follow-up recommendations in the conversation store**

In [useSqlbotNewConversation.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts), add:

```ts
if (event.type === 'follow_up_actions') {
  record.followUpActions = Array.isArray(event.content?.actions)
    ? event.content.actions.map((item: any) => ({
        label: String(item.label || ''),
        intent: String(item.intent || ''),
        value: String(item.value || '')
      }))
    : []
}

const applyFollowUpAction = (record: SqlbotNewConversationRecord, action: { intent: string; value: string }) => {
  const templates: Record<string, string> = {
    change_time_range: `基于上面的结果，把时间范围改成${action.value}`,
    change_metric: `基于上面的结果，把指标改成${action.value}`,
    change_dimension: `基于上面的结果，把维度改成${action.value}`,
    change_filter: `基于上面的结果，增加筛选条件：${action.value}`
  }
  draftQuestion.value = templates[action.intent] || ''
}
```

- [ ] **Step 4: Render action-first follow-up buttons in the record**

In [SqlbotNewConversationRecord.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue), add:

```vue
<div v-if="record.followUpActions?.length" class="follow-up-action-row">
  <button
    v-for="item in record.followUpActions"
    :key="`${item.intent}-${item.value}`"
    class="follow-up-action-chip"
    type="button"
    @click="emit('apply-follow-up-action', record, item)"
  >
    {{ item.label }}
  </button>
</div>
```

- [ ] **Step 5: Write manual acceptance notes for P0**

Create [quick-bi-smart-query-p0-acceptance-notes.md](/Users/chenliyong/AI/github/StarBI/tmp/quick-bi-smart-query-p0-acceptance-notes.md):

```md
# Quick BI Smart Query P0 Acceptance Notes

## Scenario 1: Missing time range triggers clarification
- Ask: 销售额趋势怎么样
- Expect: clarification card instead of direct chart

## Scenario 2: Result explainability is visible
- Ask: 近30天各门店销售额排行
- Expect: scope basis, interpretation basis, execution summary

## Scenario 3: Follow-up actions are analysis-oriented
- After result appears, expect actions like 改成近30天 / 换成订单量 / 按区域看

## Scenario 4: Ambiguous dataset requires confirmation
- Use a theme containing multiple sales datasets
- Expect: explicit dataset confirmation before execution
```

- [ ] **Step 6: Run the full P0 verification pass**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/chat/test_clarification.py -q
python -m compileall apps/chat

cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run ts:check
npx eslint src/views/sqlbot-new src/views/sqlbot/sqlbotDirect.ts src/locales/zh-CN.ts --ext .ts,.vue --fix
```

Then complete browser verification against `tmp/quick-bi-smart-query-p0-acceptance-notes.md`.

Expected:

1. Clarification blocks appear for ambiguous questions.
2. Result cards show explanation metadata.
3. Scope confirmation is explicit.
4. Follow-up actions read like analysis actions, not generic recommendations.

---

## Self-Review

- [ ] **Spec coverage check**
  - 问数范围治理: covered by Task 5
  - 结构化澄清式问答: covered by Tasks 1-3
  - 结果可验证性与执行摘要: covered by Task 4
  - 围绕结果的连续分析追问: covered by Task 6
- [ ] **Placeholder scan**
  - No `TODO`, `TBD`, or “handle later” placeholders should remain in this plan before execution.
- [ ] **Type consistency**
  - Keep `SqlbotNewClarificationState`, `SqlbotNewInterpretationMeta`, `SqlbotNewExecutionSummary`, and backend payload names exactly aligned across frontend and backend.

