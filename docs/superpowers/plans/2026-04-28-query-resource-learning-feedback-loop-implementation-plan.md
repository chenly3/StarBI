# Query Resource Learning Feedback Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在“问数结果页”打通人工修正学习闭环，实现“修正提交后立即生效（仅当前资源）+ 全链路可追溯 + 重学治理建议”。

**Architecture:** 采用“事件溯源 + 生效快照（补丁层）”架构。SQLBot 负责反馈事件写入、补丁快照维护、运行时补丁执行与治理指标聚合；DataEase 负责统一代理与前端问数页交互；运行时冲突策略固定为“补丁层优先于学习资产层”，补丁不会因重学自动失效。

**Tech Stack:** SQLBot(FastAPI + SQLModel + Alembic + pytest)、DataEase(Spring Boot + Java VO Contract + Vue3/TS)、agent-browser 自动化验收。

---

## File Map

### SQLBot Backend

- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/alembic/versions/070_query_resource_learning_feedback_loop.py`
  - 新增四张反馈闭环表（event/snapshot/apply_log/metric）。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/models.py`
  - 增加四类 SQLModel 实体。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/schemas.py`
  - 增加事件写入、补丁列表、回放、指标、重学评估的请求与响应模型。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py`
  - 增加事件入库、补丁激活/下线、快照查询、指标聚合、回放组装、重学评估、运行时补丁应用链。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py`
  - 新增 7 个反馈闭环 API。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py`
  - 在 SQL 最终执行前接入补丁应用与 apply_log 记录。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_api.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py`
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_runtime_context.py`

### DataEase Backend

- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningFeedbackEventVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningPatchVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningReplayVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningFeedbackMetricVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningRelearningDecisionVO.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryLearningFeedbackRequest.java`
  - 扩充为统一事件入参（event_type + before/after + patch_types）。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java`
  - 新增 7 个 SQLBot 代理请求与映射。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryResourceLearningServer.java`
  - 暴露 `/ai/query/resource-learning/resources/{resourceId}/...` 闭环接口。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/manage/AIQueryThemeManageTest.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java`

### DataEase Frontend

- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/queryResourceLearning.ts`
  - 新增反馈事件、补丁下线、回放、指标、重学评估 API 封装与类型。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
  - 在问数结果动作区新增“学习修正”入口（仅对可修正记录显示）。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
  - 透传 `learning-fix` 事件到上层容器。
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewLearningFixDialog.vue`
  - 修正弹窗（`sql_override` / `field_mapping_fix` / `value_mapping_fix`）。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  - 处理弹窗开启、提交、成功提示“已生效（仅当前资源）”、补丁下线动作。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts`
  - 增补新 API contract。
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-learning-fix-ui-contract.spec.ts`
  - 验证问数结果页学习修正入口与提交流程绑定。

### Documentation

- Modify: `/Users/chenliyong/AI/github/StarBI/spec/task/query-resource-learning-api.md`
  - 固化最新闭环 API 契约与字段说明。

---

### Task 1: Add SQLBot Feedback Loop Tables and Models

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/alembic/versions/070_query_resource_learning_feedback_loop.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/models.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py`

- [ ] **Step 1: Write the failing model/migration test**

```python
def test_feedback_loop_models_and_revision_chain():
    from apps.query_resource_learning.models import (
        QueryResourceLearningFeedbackEvent,
        QueryResourceLearningPatchSnapshot,
        QueryResourceLearningPatchApplyLog,
        QueryResourceLearningFeedbackMetric,
    )

    assert QueryResourceLearningFeedbackEvent.__tablename__ == "query_resource_learning_feedback_event"
    assert QueryResourceLearningPatchSnapshot.__tablename__ == "query_resource_learning_patch_snapshot"
    assert QueryResourceLearningPatchApplyLog.__tablename__ == "query_resource_learning_patch_apply_log"
    assert QueryResourceLearningFeedbackMetric.__tablename__ == "query_resource_learning_feedback_metric"

    migration_source = find_migration_path("070_query_resource_learning_feedback_loop").read_text(encoding="utf-8")
    assert 'down_revision = "069_query_resource_learning"' in migration_source
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k feedback_loop_models_and_revision_chain -v`

Expected: FAIL with missing model class and missing migration revision.

- [ ] **Step 3: Add model definitions**

```python
class QueryResourceLearningFeedbackEvent(SQLModel, table=True):
    __tablename__ = "query_resource_learning_feedback_event"
    id: int | None = Field(sa_column=Column(BigInteger, Identity(always=True), primary_key=True))
    event_no: str = Field(sa_column=Column(String(64), nullable=False, unique=True, index=True))
    resource_id: str = Field(sa_column=Column(String(64), nullable=False, index=True))
    event_type: str = Field(sa_column=Column(String(32), nullable=False, index=True))
    question_text: str | None = Field(default=None, sa_column=Column(Text))
    matched_sql: str | None = Field(default=None, sa_column=Column(Text))
    before_snapshot: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB(astext_type=Text()), nullable=False))
    after_snapshot: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB(astext_type=Text()), nullable=False))
    patch_types: list[str] = Field(default_factory=list, sa_column=Column(JSONB(astext_type=Text()), nullable=False))
    visibility: str = Field(default="admin_only", sa_column=Column(String(16), nullable=False))
    created_at: datetime = Field(default_factory=datetime.now, sa_column=Column(DateTime(timezone=False), nullable=False, index=True))
```

```python
class QueryResourceLearningPatchSnapshot(SQLModel, table=True):
    __tablename__ = "query_resource_learning_patch_snapshot"
    id: int | None = Field(sa_column=Column(BigInteger, Identity(always=True), primary_key=True))
    resource_id: str = Field(sa_column=Column(String(64), nullable=False, index=True))
    patch_type: str = Field(sa_column=Column(String(32), nullable=False, index=True))
    match_fingerprint: str = Field(sa_column=Column(String(128), nullable=False, index=True))
    match_rule: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB(astext_type=Text()), nullable=False))
    patch_payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB(astext_type=Text()), nullable=False))
    priority: int = Field(default=100, sa_column=Column(Integer, nullable=False))
    status: str = Field(default="active", sa_column=Column(String(16), nullable=False, index=True))
    source_event_id: int = Field(sa_column=Column(BigInteger, nullable=False))
```

- [ ] **Step 4: Add Alembic migration**

```python
revision = "070_query_resource_learning_feedback_loop"
down_revision = "069_query_resource_learning"

def upgrade() -> None:
    op.create_table("query_resource_learning_feedback_event", ...)
    op.create_table("query_resource_learning_patch_snapshot", ...)
    op.create_table("query_resource_learning_patch_apply_log", ...)
    op.create_table("query_resource_learning_feedback_metric", ...)
    op.create_index("ix_qrl_patch_unique_active", "query_resource_learning_patch_snapshot",
                    ["resource_id", "patch_type", "match_fingerprint", "status"], unique=False)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k feedback_loop_models_and_revision_chain -v`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/SQLBot/backend/alembic/versions/070_query_resource_learning_feedback_loop.py \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/models.py \
  github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py
git -C /Users/chenliyong/AI commit -m "feat(sqlbot): add feedback loop storage models and migration"
```

---

### Task 2: Implement SQLBot Feedback Service and Patch Snapshot Logic

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/schemas.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py`

- [ ] **Step 1: Write failing service tests for manual fix and metric aggregation**

```python
def test_manual_fix_submit_creates_event_and_active_patch(fake_session):
    from apps.query_resource_learning.service import submit_feedback_event
    payload = {
        "event_type": "manual_fix_submit",
        "question_text": "今年华东销售额是多少",
        "matched_sql": "select * from sales",
        "patch_types": ["sql_override"],
        "before_snapshot": {"sql": "select * from sales"},
        "after_snapshot": {"sql": "select sum(amount) from sales where region='华东'"},
    }
    result = submit_feedback_event(fake_session, resource_id="datasource:12", actor_account="admin", payload=payload)
    assert result["accepted"] is True
    assert result["active_patch_count"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k manual_fix_submit_creates_event_and_active_patch -v`

Expected: FAIL because `submit_feedback_event` and related schemas do not exist.

- [ ] **Step 3: Add schemas for event/patch/metric/replay**

```python
class QueryResourceLearningFeedbackEventRequest(BaseModel):
    event_type: Literal["upvote", "downvote", "execution_failure", "manual_fix_submit", "manual_fix_disable"]
    source_chat_id: int | None = None
    source_chat_record_id: int | None = None
    question_text: str | None = None
    matched_sql: str | None = None
    before_snapshot: dict[str, Any] = Field(default_factory=dict)
    after_snapshot: dict[str, Any] = Field(default_factory=dict)
    patch_types: list[Literal["sql_override", "field_mapping_fix", "value_mapping_fix"]] = Field(default_factory=list)
```

```python
class QueryResourceLearningFeedbackMetricResponse(BaseModel):
    resource_id: str
    lifetime_total_feedback_count: int
    lifetime_downvote_count: int
    lifetime_failure_count: int
    lifetime_correction_count: int
    relearning_suggested: bool
    trigger_reason: str
    relearning_advice: str
```

- [ ] **Step 4: Implement service entrypoints**

```python
def submit_feedback_event(session: Any, *, resource_id: str, actor_account: str, payload: dict[str, Any]) -> dict[str, Any]:
    event = _create_feedback_event(...)
    session.add(event)
    if payload["event_type"] == "manual_fix_submit":
        _activate_patch_snapshots_from_event(session, resource_id=resource_id, event=event, payload=payload)
    metric = _rebuild_feedback_metric(session, resource_id=resource_id)
    return {"accepted": True, "event_no": event.event_no, "active_patch_count": _count_active_patches(session, resource_id), "metric": metric}
```

```python
def apply_runtime_patches(*, resource_id: str, question_text: str, sql: str, active_patches: list[QueryResourceLearningPatchSnapshot]) -> dict[str, Any]:
    # 顺序固定：field_mapping_fix -> value_mapping_fix -> sql_override
    ...
    return {"pre_sql": sql, "post_sql": patched_sql, "applied_patch_ids": patch_ids, "apply_result": "applied"}
```

- [ ] **Step 5: Run service tests**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k "manual_fix_submit or feedback_metric or apply_runtime_patches" -v`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/schemas.py \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py \
  github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py
git -C /Users/chenliyong/AI commit -m "feat(sqlbot): add feedback event service and patch snapshot logic"
```

---

### Task 3: Expose SQLBot Feedback Loop APIs (7 Endpoints)

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_api.py`

- [ ] **Step 1: Add failing API tests**

```python
def test_feedback_event_endpoint_contract(client):
    payload = {
        "event_type": "manual_fix_submit",
        "question_text": "华东销售额",
        "matched_sql": "select * from sales",
        "patch_types": ["sql_override"],
        "before_snapshot": {"sql": "select * from sales"},
        "after_snapshot": {"sql": "select sum(amount) from sales where region='华东'"},
    }
    response = client.post("/query-resource-learning/resources/datasource:12/feedback/events", json=payload)
    assert response.status_code == 200
    assert response.json()["accepted"] is True
```

- [ ] **Step 2: Run tests to verify endpoint 404/fail**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_api.py -k "feedback_event_endpoint_contract or patches or replay or evaluate_relearning" -v`

Expected: FAIL because routes are not registered.

- [ ] **Step 3: Implement API routes**

```python
@router.post("/resources/{resource_id}/feedback/events", response_model=QueryResourceLearningFeedbackEventResponse)
async def create_feedback_event(resource_id: str, payload: QueryResourceLearningFeedbackEventRequest, session: SessionDep):
    return QueryResourceLearningFeedbackEventResponse(**submit_feedback_event(...))

@router.post("/resources/{resource_id}/patches/{patch_id}/disable", response_model=QueryResourceLearningPatchDisableResponse)
async def disable_patch(...): ...

@router.get("/resources/{resource_id}/patches", response_model=list[QueryResourceLearningPatchItem])
async def list_patches(...): ...

@router.get("/resources/{resource_id}/feedback/events", response_model=list[QueryResourceLearningFeedbackEventItem])
async def list_feedback_events(...): ...

@router.get("/resources/{resource_id}/feedback/replay/{event_no}", response_model=QueryResourceLearningFeedbackReplayResponse)
async def replay_feedback(...): ...

@router.get("/resources/{resource_id}/feedback-metric", response_model=QueryResourceLearningFeedbackMetricResponse)
async def get_feedback_metric(...): ...

@router.post("/resources/{resource_id}/feedback/evaluate-relearning", response_model=QueryResourceLearningRelearningDecisionResponse)
async def evaluate_relearning(...): ...
```

- [ ] **Step 4: Run API tests**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_api.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py \
  github/StarBI/SQLBot/backend/tests/query_resource_learning/test_api.py
git -C /Users/chenliyong/AI commit -m "feat(sqlbot): expose query resource feedback loop APIs"
```

---

### Task 4: Integrate Runtime Patch Application Into SQL Generation Chain

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py`
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_runtime_context.py`

- [ ] **Step 1: Write failing runtime patch test**

```python
def test_runtime_patch_chain_prefers_sql_override():
    from apps.query_resource_learning.service import apply_runtime_patches
    patches = [
        {"id": 1, "patch_type": "sql_override", "patch_payload": {"sql": "select sum(amount) from sales"}},
    ]
    result = apply_runtime_patches(resource_id="datasource:12", question_text="华东销售额", sql="select * from sales", active_patches=patches)
    assert result["post_sql"] == "select sum(amount) from sales"
    assert result["apply_result"] == "applied"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_runtime_context.py -v`

Expected: FAIL due missing runtime patch API.

- [ ] **Step 3: Implement llm integration hook**

```python
def check_save_sql(self, session: Session, res: str, operate: OperationEnum) -> str:
    sql, *_ = self.check_sql(session=session, res=res, operate=operate)
    resource_id = f"datasource:{self.record.datasource}" if self.record.datasource else ""
    patch_result = apply_runtime_patches_for_sql(
        session=session,
        resource_id=resource_id,
        record_id=self.record.id,
        question_text=self.record.question or "",
        sql=sql,
    )
    final_sql = patch_result["post_sql"]
    save_sql(session=session, sql=final_sql, record_id=self.record.id)
    self.chat_question.sql = final_sql
    return final_sql
```

- [ ] **Step 4: Run runtime tests**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_runtime_context.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/SQLBot/backend/apps/chat/task/llm.py \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py \
  github/StarBI/SQLBot/backend/tests/query_resource_learning/test_runtime_context.py
git -C /Users/chenliyong/AI commit -m "feat(sqlbot): apply resource learning patches before SQL execution"
```

---

### Task 5: Add DataEase Backend Proxy Contracts for Feedback Loop

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryLearningFeedbackRequest.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningFeedbackEventVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningPatchVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningReplayVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningFeedbackMetricVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningRelearningDecisionVO.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryResourceLearningServer.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/manage/AIQueryThemeManageTest.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java`

- [ ] **Step 1: Add failing Java contract tests for new endpoints**

```java
@Test
void resourceLearningServerShouldExposeFeedbackLoopEndpoints() throws Exception {
    Method feedbackEvent = AIQueryResourceLearningServer.class.getMethod(
            "createFeedbackEvent", String.class, AIQueryLearningFeedbackRequest.class);
    Method patches = AIQueryResourceLearningServer.class.getMethod("listPatches", String.class);
    Method metric = AIQueryResourceLearningServer.class.getMethod("feedbackMetric", String.class);

    assertEquals(AIQueryLearningFeedbackEventVO.class, feedbackEvent.getReturnType());
    assertEquals(List.class, patches.getReturnType());
    assertEquals(AIQueryLearningFeedbackMetricVO.class, metric.getReturnType());
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend && mvn -Dtest=AIQueryResourceLearningContractSmokeTest test`

Expected: FAIL because methods and VO do not exist.

- [ ] **Step 3: Extend server and manage proxy methods**

```java
@PostMapping("/resources/{resourceId}/feedback/events")
public AIQueryLearningFeedbackEventVO createFeedbackEvent(
        @PathVariable("resourceId") String resourceId,
        @RequestBody @Valid AIQueryLearningFeedbackRequest request) {
    return aiQueryThemeManage.createLearningFeedbackEvent(resourceId, request);
}

@GetMapping("/resources/{resourceId}/feedback-metric")
public AIQueryLearningFeedbackMetricVO feedbackMetric(@PathVariable("resourceId") String resourceId) {
    return aiQueryThemeManage.getLearningFeedbackMetric(resourceId);
}
```

- [ ] **Step 4: Run DataEase backend tests**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend && mvn -Dtest=AIQueryThemeManageTest,AIQueryResourceLearningContractSmokeTest test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryLearningFeedbackRequest.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningFeedbackEventVO.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningPatchVO.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningReplayVO.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningFeedbackMetricVO.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningRelearningDecisionVO.java \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryResourceLearningServer.java \
  github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/manage/AIQueryThemeManageTest.java \
  github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java
git -C /Users/chenliyong/AI commit -m "feat(dataease): proxy resource learning feedback loop contracts"
```

---

### Task 6: Extend DataEase Frontend API Layer for Feedback Loop

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/queryResourceLearning.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts`

- [ ] **Step 1: Add failing API contract cases**

```ts
{
  name: 'posts manual fix feedback event contract',
  async run() {
    const requestMock = resetRequestMockState()
    requestMock.postResponses.push({ data: { accepted: true, event_no: 'E-1' } })
    await createQueryLearningFeedbackEvent('datasource:12', { eventType: 'manual_fix_submit' })
    assertDeepEqual(
      requestMock.postCalls,
      [{ url: '/ai/query/resource-learning/resources/datasource:12/feedback/events' }],
      'feedback event post contract'
    )
  }
}
```

- [ ] **Step 2: Run contract harness (fail expected)**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/esbuild src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts \
  --bundle --platform=node --format=cjs \
  --outfile=tmp/query-resource-api-contract/query-resource-learning-api.spec.js
QUERY_RESOURCE_LEARNING_API_RUN_CONTRACTS=1 node tmp/query-resource-api-contract/query-resource-learning-api.spec.js
```

Expected: FAIL with missing exported APIs.

- [ ] **Step 3: Implement new API wrappers and normalizers**

```ts
export const createQueryLearningFeedbackEvent = async (
  resourceId: string,
  payload: QueryLearningFeedbackEventRequest
): Promise<QueryLearningFeedbackEventResponse> => {
  const response = await request.post({
    url: `/ai/query/resource-learning/resources/${resourceId}/feedback/events`,
    data: toFeedbackEventPayload(payload),
    silentError: true
  })
  return normalizeFeedbackEventResponse(response)
}

export const evaluateQueryLearningRelearning = async (resourceId: string) =>
  request.post({ url: `/ai/query/resource-learning/resources/${resourceId}/feedback/evaluate-relearning`, silentError: true })
```

- [ ] **Step 4: Re-run contract harness**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/esbuild src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts \
  --bundle --platform=node --format=cjs \
  --outfile=tmp/query-resource-api-contract/query-resource-learning-api.spec.js
QUERY_RESOURCE_LEARNING_API_RUN_CONTRACTS=1 node tmp/query-resource-api-contract/query-resource-learning-api.spec.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/dataease/core/core-frontend/src/api/queryResourceLearning.ts \
  github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts
git -C /Users/chenliyong/AI commit -m "feat(frontend): add query resource feedback loop api wrappers"
```

---

### Task 7: Build “Learning Fix” Entry on Query Result Page

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewLearningFixDialog.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-learning-fix-ui-contract.spec.ts`

- [ ] **Step 1: Write failing UI contract for action entry and dialog submit**

```ts
assertMatch(starbiResultCardSource, /学习修正/, 'result action should expose learning fix entry')
assertMatch(starbiResultCardSource, /emit\('learning-fix', record\)/, 'learning fix event emission')
assertMatch(indexSource, /createQueryLearningFeedbackEvent/, 'index should call feedback event api')
assertMatch(indexSource, /已生效（仅当前资源）/, 'success copy should indicate resource scoped immediate effect')
```

- [ ] **Step 2: Run UI contract harness (fail expected)**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-learning-fix-ui-contract.spec.ts \
  --module commonjs --target es2020 --skipLibCheck --esModuleInterop \
  --outDir tmp/sqlbot-learning-fix-ui-contract
QUERY_RESOURCE_LEARNING_UI_CONTRACTS=1 node \
  tmp/sqlbot-learning-fix-ui-contract/sqlbot-learning-fix-ui-contract.spec.js
```

Expected: FAIL because action and dialog do not exist.

- [ ] **Step 3: Add result action + event propagation**

```vue
<!-- StarbiResultCard.vue -->
<button
  v-if="record.finish && !record.error && record.sql"
  class="starbi-foot-btn ghost"
  type="button"
  @click.stop="emit('learning-fix', record)"
>
  学习修正
</button>
```

```ts
// SqlbotNewConversationRecord.vue
const emit = defineEmits<{
  (event: 'learning-fix', record: SqlbotNewConversationRecord): void
}>()
```

- [ ] **Step 4: Implement dialog and submit flow**

```ts
const handleSubmitLearningFix = async (payload: LearningFixSubmitPayload) => {
  const resourceId = `datasource:${payload.datasourceId}`
  await createQueryLearningFeedbackEvent(resourceId, {
    eventType: 'manual_fix_submit',
    questionText: payload.question,
    matchedSql: payload.matchedSql,
    beforeSnapshot: payload.beforeSnapshot,
    afterSnapshot: payload.afterSnapshot,
    patchTypes: payload.patchTypes
  })
  ElMessage.success('已生效（仅当前资源）')
}
```

- [ ] **Step 5: Run UI contract harness**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-learning-fix-ui-contract.spec.ts \
  --module commonjs --target es2020 --skipLibCheck --esModuleInterop \
  --outDir tmp/sqlbot-learning-fix-ui-contract
QUERY_RESOURCE_LEARNING_UI_CONTRACTS=1 node \
  tmp/sqlbot-learning-fix-ui-contract/sqlbot-learning-fix-ui-contract.spec.js
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue \
  github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue \
  github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewLearningFixDialog.vue \
  github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue \
  github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/__tests__/sqlbot-learning-fix-ui-contract.spec.ts
git -C /Users/chenliyong/AI commit -m "feat(frontend): add query result learning-fix dialog with immediate effect"
```

---

### Task 8: Update API Spec Snapshot

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/spec/task/query-resource-learning-api.md`

- [ ] **Step 1: Add failing spec consistency check (grep)**

Run: `cd /Users/chenliyong/AI/github/StarBI && rg -n "/feedback/events|/feedback/replay|/feedback-metric|evaluate-relearning" spec/task/query-resource-learning-api.md`

Expected: no output (or missing part), confirming spec not updated.

- [ ] **Step 2: Write the final contract snapshot**

```md
## Feedback Loop APIs

- POST `/query-resource-learning/resources/{resource_id}/feedback/events`
- POST `/query-resource-learning/resources/{resource_id}/patches/{patch_id}/disable`
- GET `/query-resource-learning/resources/{resource_id}/patches`
- GET `/query-resource-learning/resources/{resource_id}/feedback/events`
- GET `/query-resource-learning/resources/{resource_id}/feedback/replay/{event_no}`
- GET `/query-resource-learning/resources/{resource_id}/feedback-metric`
- POST `/query-resource-learning/resources/{resource_id}/feedback/evaluate-relearning`
```

- [ ] **Step 3: Verify snapshot coverage**

Run: `cd /Users/chenliyong/AI/github/StarBI && rg -n "/feedback/events|/feedback/replay|/feedback-metric|evaluate-relearning" spec/task/query-resource-learning-api.md`

Expected: 7 endpoint lines all matched.

- [ ] **Step 4: Commit**

```bash
git -C /Users/chenliyong/AI add github/StarBI/spec/task/query-resource-learning-api.md
git -C /Users/chenliyong/AI commit -m "docs(api): snapshot query resource feedback loop contracts"
```

---

### Task 9: Full Verification, Restart, and Browser Automation Acceptance

**Files:**
- Verify-only (no code file changes)

- [ ] **Step 1: Run backend and frontend checks**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/query_resource_learning/test_service.py tests/query_resource_learning/test_api.py tests/query_resource_learning/test_runtime_context.py -v

cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
mvn -Dtest=AIQueryThemeManageTest,AIQueryResourceLearningContractSmokeTest test

cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/esbuild src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts \
  --bundle --platform=node --format=cjs \
  --outfile=tmp/query-resource-api-contract/query-resource-learning-api.spec.js
QUERY_RESOURCE_LEARNING_API_RUN_CONTRACTS=1 node tmp/query-resource-api-contract/query-resource-learning-api.spec.js
./node_modules/.bin/tsc src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts \
  --module commonjs --target es2020 --skipLibCheck --esModuleInterop \
  --outDir tmp/query-resource-ui-contract
QUERY_RESOURCE_LEARNING_UI_CONTRACTS=1 node tmp/query-resource-ui-contract/query-resource-learning-ui-contract.spec.js
./node_modules/.bin/tsc src/views/sqlbot-new/__tests__/sqlbot-learning-fix-ui-contract.spec.ts \
  --module commonjs --target es2020 --skipLibCheck --esModuleInterop \
  --outDir tmp/sqlbot-learning-fix-ui-contract
QUERY_RESOURCE_LEARNING_UI_CONTRACTS=1 node tmp/sqlbot-learning-fix-ui-contract/sqlbot-learning-fix-ui-contract.spec.js
```

Expected: all PASS.

- [ ] **Step 2: Run restart scripts only after all code changes are finished**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot && ./sqlbot-app.sh
cd /Users/chenliyong/AI/github/StarBI/dataease && ./dataease-app.sh
cd /Users/chenliyong/AI/github/StarBI/dataease && ./dataease-web.sh dev
# 如果本次没有 SQLBot 前端改动，可跳过；若改动则执行（当前脚本为 no-op）
cd /Users/chenliyong/AI/github/StarBI/SQLBot && ./sqlbot-web.sh
```

Expected: services restart successfully (`SQLBot:8000`, `DataEase backend:8100`, `DataEase frontend:8080`)。

- [ ] **Step 3: Run agent-browser acceptance flow**

Run checklist:

```text
1) 登录 DataEase，进入 /sys-setting/query-config?tab=query_resources，确认资源列表可加载。
2) 进入问数页（sqlbot-new），提交可返回 SQL 的问题。
3) 在该条结果动作区点击“学习修正”，提交 sql_override 修正。
4) 收到“已生效（仅当前资源）”提示。
5) 同资源重复提问，验证命中修正 SQL。
6) 切换到其他资源提问，验证不受影响。
7) 在问数资源管理页查看反馈指标/补丁列表/事件回放是否可读。
8) 下线补丁后再次提问，验证回退到学习资产链路。
```

Expected: 闭环通过，且行为符合锁定策略（补丁优先、仅当前资源、人工下线）。

- [ ] **Step 4: Final commit**

```bash
git -C /Users/chenliyong/AI status
git -C /Users/chenliyong/AI commit -m "feat(query-learning): complete feedback-loop immediate-effect closure"
```

---

## Self-Review

1. **Spec coverage:** 已覆盖设计文档全部锁定能力：事件写入、即时生效、资源隔离、补丁下线、回放审计、指标聚合、重学评估、前端修正入口。
2. **Placeholder scan:** 本计划无 `TODO/TBD/implement later` 占位项；所有任务均给出文件路径、命令和预期结果。
3. **Type consistency:** `patch_type`、`event_type`、`resource_id`、`event_no` 在 SQLBot/DataEase/Frontend 统一使用 snake_case 后端契约 + 前端 normalize 映射策略。
