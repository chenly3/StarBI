# Query Resource Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full learning capability for query resources so a DataEase dataset can become a managed, learnable, scoreable, re-learnable smart-query asset with feedback-driven improvement.

**Architecture:** Add a dedicated learning domain around the existing `问数配置` resource management flow. DataEase frontend exposes resource status, task detail, score, and retry controls; backend orchestrates metadata extraction, semantic generation, sample extraction, scoring, and feedback loops; SQLBot knowledge assets are linked in as calibration inputs instead of being rebuilt from scratch.

**Tech Stack:** Vue 3 + Vite + Element Plus Secondary on DataEase frontend, Python/FastAPI + SQLModel + Alembic in SQLBot backend, existing DataEase dataset APIs, existing SQLBot recommended-problem and LLM task capabilities.

---

## File Map

### Frontend

- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/index.vue`
  - Keep the system-setting shell and route split between resources and themes.
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue`
  - Convert the prototype-only resource page into the real query resource management page incrementally.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/queryResourceLearning.ts`
  - Encapsulate learning-related REST APIs.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningTaskDrawer.vue`
  - Show learning task timeline, failures, and retry actions.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningScoreCard.vue`
  - Show quality grade, signals, and suggestions.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningStatusTag.vue`
  - Normalize status display for resource list rows.

### Backend

- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/models.py`
  - SQLModel entities for query resource, task, result, score, feedback.
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/schemas.py`
  - Request/response schemas.
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/crud.py`
  - Persistence helpers.
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py`
  - Learning orchestration and scoring.
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py`
  - API endpoints.
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/api.py`
  - Register learning router.
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/datasource/crud/recommended_problem.py`
  - Reuse recommended question persistence from learning outputs where appropriate.
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py`
  - Consume learning outputs as context for question answering and fallback recommendations.
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/alembic/versions/0xx_add_query_resource_learning.py`
  - Database migration for learning tables.

### Integration / Shared

- Create: `/Users/chenliyong/AI/github/StarBI/spec/task/query-resource-learning-api.md`
  - Endpoint contract snapshot for cross-team alignment.

### Tests

- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_api.py`
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/learning-status.spec.ts`

---

### Task 1: Add Backend Data Model For Learning

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/models.py`
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/alembic/versions/0xx_add_query_resource_learning.py`
- Test: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py`

- [ ] **Step 1: Write the failing model test**

```python
from apps.query_resource_learning.models import (
    QueryResourceLearningTask,
    QueryResourceLearningResult,
    QueryResourceLearningScore,
)


def test_learning_models_expose_expected_core_fields():
    task_fields = QueryResourceLearningTask.model_fields
    result_fields = QueryResourceLearningResult.model_fields
    score_fields = QueryResourceLearningScore.model_fields

    assert "resource_id" in task_fields
    assert "status" in task_fields
    assert "failure_reason" in task_fields
    assert "semantic_profile" in result_fields
    assert "sample_values" in result_fields
    assert "grade" in score_fields
    assert "score" in score_fields
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k learning_models_expose_expected_core_fields -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'apps.query_resource_learning'`

- [ ] **Step 3: Add minimal model implementation**

```python
from datetime import datetime
from sqlmodel import Field, SQLModel


class QueryResourceLearningTask(SQLModel, table=True):
    __tablename__ = "query_resource_learning_task"
    id: int | None = Field(default=None, primary_key=True)
    resource_id: str = Field(index=True)
    status: str = Field(index=True)
    trigger_type: str = Field(default="manual")
    failure_reason: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None


class QueryResourceLearningResult(SQLModel, table=True):
    __tablename__ = "query_resource_learning_result"
    id: int | None = Field(default=None, primary_key=True)
    resource_id: str = Field(index=True)
    version: int = Field(default=1)
    semantic_profile: str = Field(default="{}")
    sample_values: str = Field(default="[]")
    recommended_questions: str = Field(default="[]")


class QueryResourceLearningScore(SQLModel, table=True):
    __tablename__ = "query_resource_learning_score"
    id: int | None = Field(default=None, primary_key=True)
    resource_id: str = Field(index=True)
    grade: str = Field(default="C")
    score: int = Field(default=0)
    signals: str = Field(default="[]")
```

- [ ] **Step 4: Add migration skeleton**

```python
from alembic import op
import sqlalchemy as sa


revision = "0xx_add_query_resource_learning"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "query_resource_learning_task",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("trigger_type", sa.String(length=32), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "query_resource_learning_result",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("semantic_profile", sa.Text(), nullable=False),
        sa.Column("sample_values", sa.Text(), nullable=False),
        sa.Column("recommended_questions", sa.Text(), nullable=False),
    )
    op.create_table(
        "query_resource_learning_score",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column("grade", sa.String(length=4), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("signals", sa.Text(), nullable=False),
    )


def downgrade():
    op.drop_table("query_resource_learning_score")
    op.drop_table("query_resource_learning_result")
    op.drop_table("query_resource_learning_task")
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k learning_models_expose_expected_core_fields -v`

Expected: PASS

---

### Task 2: Add Learning Service And Scoring

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py`
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/crud.py`
- Test: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py`

- [ ] **Step 1: Write the failing service test**

```python
from apps.query_resource_learning.service import calculate_learning_grade


def test_calculate_learning_grade_returns_a_when_all_signals_are_strong():
    result = calculate_learning_grade(
        field_completion=100,
        semantic_clarity=95,
        sample_coverage=90,
        terminology_coverage=90,
        sql_example_coverage=80,
        query_success_rate=95,
    )

    assert result["grade"] == "A"
    assert result["score"] >= 90
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k calculate_learning_grade_returns_a_when_all_signals_are_strong -v`

Expected: FAIL because `calculate_learning_grade` does not exist

- [ ] **Step 3: Add minimal scoring implementation**

```python
def calculate_learning_grade(
    *,
    field_completion: int,
    semantic_clarity: int,
    sample_coverage: int,
    terminology_coverage: int,
    sql_example_coverage: int,
    query_success_rate: int,
):
    metrics = [
        field_completion,
        semantic_clarity,
        sample_coverage,
        terminology_coverage,
        sql_example_coverage,
        query_success_rate,
    ]
    score = round(sum(metrics) / len(metrics))
    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 60:
        grade = "C"
    else:
        grade = "D"
    return {"grade": grade, "score": score}
```

- [ ] **Step 4: Add service skeleton for learning orchestration**

```python
class QueryResourceLearningService:
    def build_learning_result(self, *, resource_id: str, dataset_meta: dict, sample_values: list[str]):
        return {
            "resource_id": resource_id,
            "semantic_profile": {
                "dataset_name": dataset_meta.get("name"),
                "fields": dataset_meta.get("fields", []),
            },
            "sample_values": sample_values,
            "recommended_questions": [],
        }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k calculate_learning_grade_returns_a_when_all_signals_are_strong -v`

Expected: PASS

---

### Task 3: Add Learning API

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/api.py`
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/schemas.py`
- Test: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_api.py`

- [ ] **Step 1: Write the failing API test**

```python
def test_list_learning_resources_returns_status_and_score(client):
    response = client.get("/query-resource-learning/resources")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    if payload:
        assert "learning_status" in payload[0]
        assert "quality_grade" in payload[0]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_api.py -k list_learning_resources_returns_status_and_score -v`

Expected: FAIL with 404 or missing router

- [ ] **Step 3: Add minimal API**

```python
from fastapi import APIRouter

router = APIRouter(prefix="/query-resource-learning", tags=["query resource learning"])


@router.get("/resources")
def list_resources():
    return [
        {
            "id": "1",
            "name": "自动化销售数据集_20260409",
            "learning_status": "学习成功",
            "quality_grade": "A",
        }
    ]


@router.post("/resources/{resource_id}/learn")
def learn_resource(resource_id: str):
    return {"resource_id": resource_id, "task_status": "学习中"}
```

- [ ] **Step 4: Register router**

```python
from apps.query_resource_learning import api as query_resource_learning

api_router.include_router(query_resource_learning.router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_api.py -k list_learning_resources_returns_status_and_score -v`

Expected: PASS

---

### Task 4: Add Frontend Learning API Wrapper

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/queryResourceLearning.ts`
- Test: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/learning-status.spec.ts`

- [ ] **Step 1: Write the failing frontend API contract test**

```ts
import { normalizeLearningResource } from '@/api/queryResourceLearning'

it('normalizes backend learning resource payload', () => {
  const result = normalizeLearningResource({
    id: 1,
    name: '销售数据',
    learning_status: '学习成功',
    quality_grade: 'A'
  })

  expect(result.id).toBe('1')
  expect(result.learningStatus).toBe('学习成功')
  expect(result.qualityGrade).toBe('A')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend && npm run ts:check`

Expected: FAIL because `queryResourceLearning.ts` does not exist

- [ ] **Step 3: Add API wrapper**

```ts
import request from '@/config/axios'

export interface QueryLearningResource {
  id: string
  name: string
  learningStatus: string
  qualityGrade?: string
}

export const normalizeLearningResource = (payload: any): QueryLearningResource => ({
  id: String(payload.id),
  name: String(payload.name || ''),
  learningStatus: String(payload.learning_status || payload.learningStatus || ''),
  qualityGrade: payload.quality_grade || payload.qualityGrade
})

export const listQueryLearningResources = async (): Promise<QueryLearningResource[]> => {
  return request.get({ url: '/query-resource-learning/resources' }).then((res: any) => {
    return (res?.data || res || []).map(normalizeLearningResource)
  })
}

export const triggerQueryLearning = async (resourceId: string) => {
  return request.post({ url: `/query-resource-learning/resources/${resourceId}/learn` })
}
```

- [ ] **Step 4: Run type-check to verify it passes**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend && npm run ts:check`

Expected: PASS or only pre-existing unrelated warnings

---

### Task 5: Add Learning UI To Query Resource Page

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningTaskDrawer.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningScoreCard.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningStatusTag.vue`
- Test: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/learning-status.spec.ts`

- [ ] **Step 1: Write the failing status-tag test**

```ts
import { mount } from '@vue/test-utils'
import LearningStatusTag from '@/views/system/query-config/components/LearningStatusTag.vue'

it('renders success status copy', () => {
  const wrapper = mount(LearningStatusTag, {
    props: { status: '学习成功' }
  })

  expect(wrapper.text()).toContain('学习成功')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend && npm run ts:check`

Expected: FAIL because component does not exist

- [ ] **Step 3: Add minimal status tag component**

```vue
<template>
  <span class="learning-status-tag" :class="`is-${status}`">
    <span class="learning-status-tag__dot"></span>
    {{ status }}
  </span>
</template>

<script setup lang="ts">
defineProps<{ status: string }>()
</script>
```

- [ ] **Step 4: Replace hard-coded status in resource page**

```vue
<LearningStatusTag :status="row.learningStatus || row.status" />
```

- [ ] **Step 5: Add learning score and task detail hooks**

```ts
const learningDrawerVisible = ref(false)
const selectedLearningTaskId = ref<string | null>(null)

const openLearningTaskDetail = (taskId: string) => {
  selectedLearningTaskId.value = taskId
  learningDrawerVisible.value = true
}
```

- [ ] **Step 6: Run type-check to verify it passes**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend && npm run ts:check`

Expected: PASS or only pre-existing unrelated warnings

---

### Task 6: Add Feedback And Re-learning Loop

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/models.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py`
- Test: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py`

- [ ] **Step 1: Write the failing feedback test**

```python
from apps.query_resource_learning.service import should_trigger_relearning


def test_should_trigger_relearning_when_downvote_rate_is_high():
    assert should_trigger_relearning(
        failure_rate=35,
        downvote_rate=25,
        schema_changed=False,
    ) is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k should_trigger_relearning_when_downvote_rate_is_high -v`

Expected: FAIL because helper does not exist

- [ ] **Step 3: Add minimal re-learning trigger logic**

```python
def should_trigger_relearning(*, failure_rate: int, downvote_rate: int, schema_changed: bool):
    if schema_changed:
        return True
    if failure_rate >= 30:
        return True
    if downvote_rate >= 20:
        return True
    return False
```

- [ ] **Step 4: Add feedback endpoint skeleton**

```python
@router.post("/resources/{resource_id}/feedback")
def save_feedback(resource_id: str, payload: dict):
    return {
        "resource_id": resource_id,
        "accepted": True,
        "relearningSuggested": should_trigger_relearning(
            failure_rate=payload.get("failure_rate", 0),
            downvote_rate=payload.get("downvote_rate", 0),
            schema_changed=payload.get("schema_changed", False),
        ),
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k should_trigger_relearning_when_downvote_rate_is_high -v`

Expected: PASS

---

### Task 7: API Contract Snapshot

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/spec/task/query-resource-learning-api.md`

- [ ] **Step 1: Write API contract snapshot**

```md
# Query Resource Learning API

## GET /query-resource-learning/resources
- Returns query resource list with learning status and quality grade

## POST /query-resource-learning/resources/{resourceId}/learn
- Triggers learning task

## GET /query-resource-learning/resources/{resourceId}/tasks
- Returns learning task history

## POST /query-resource-learning/resources/{resourceId}/feedback
- Saves feedback and returns whether re-learning is suggested
```

- [ ] **Step 2: Commit contract snapshot**

```bash
git add /Users/chenliyong/AI/github/StarBI/spec/task/query-resource-learning-api.md
git commit -m "docs: add query resource learning api contract"
```

---

## Risks

- DataEase dataset metadata and SQLBot datasource metadata are not yet unified under one persisted resource model.
- Existing recommendation APIs in SQLBot are datasource-oriented, not resource-learning-oriented.
- Current frontend page is still partially prototype-driven and will need conversion to real API-backed state.

## Verification

- Backend model tests pass
- Backend API tests pass
- Frontend type-check passes
- Query resource page shows learning status and score
- Manual learning action creates task record
- Feedback action can mark a resource for re-learning

## Recommended Execution Order

1. Backend model and migration
2. Learning service and scoring
3. Learning API
4. Frontend API wrapper
5. Learning UI
6. Feedback and re-learning loop
7. Contract and docs cleanup

## Commit Strategy

- `feat(query-learning): add learning task data model`
- `feat(query-learning): add scoring and orchestration service`
- `feat(query-learning): add learning api`
- `feat(query-learning-ui): add resource learning status and task detail`
- `feat(query-learning): add feedback-driven relearning`
- `docs(query-learning): add api contract and implementation notes`
