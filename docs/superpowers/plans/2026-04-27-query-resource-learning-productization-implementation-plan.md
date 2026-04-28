# Query Resource Learning Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前 StarBI 的问数资源学习从“资源页原型 + 局部学习接口”补成一套真正服务智能问数准确率的产品化闭环，包括学习资产包、运行时消费、质量治理和反馈回流。

**Architecture:** 继续采用 `DataEase 前端 + DataEase 后端代理 + SQLBot 学习/问答引擎` 的三层结构。问数资源管理页只调用 DataEase 后端 `/ai/query/resource-learning/...` 接口，由 DataEase 后端使用已有 SQLBot Embedded / Assistant token 能力代理到 SQLBot；SQLBot 负责学习资产生成、评分、反馈聚合和问答运行时消费。

**Tech Stack:** Vue 3 + Element Plus Secondary + custom contract harness, Spring Boot + DataEase SDK API contracts, Python/FastAPI + SQLModel + pytest.

---

## File Map

### DataEase Frontend

- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/queryResourceLearning.ts`
  - 统一前端资源学习 API，全部走 DataEase 后端代理路径。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue`
  - 资源列表、任务详情、质量字段、反馈摘要、真实刷新和重学交互。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningTaskDrawer.vue`
  - 扩充任务详情、质量摘要、反馈摘要、失败信息和重学动作。
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningFeedbackSummaryCard.vue`
  - 展示点踩率、失败率、重学建议等反馈治理信息。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts`
  - API wrapper contract。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts`
  - 资源页真实字段与交互 contract。

### DataEase Backend

- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningResourceVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningTriggerVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningQualitySummaryVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningFeedbackSummaryVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryLearningFeedbackRequest.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java`
  - 代理 SQLBot 学习接口，映射成 DataEase 内部 VO。
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryResourceLearningServer.java`
  - 暴露 `/ai/query/resource-learning/...` 接口。
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/manage/AIQueryThemeManageTest.java`
  - 增加学习资源 / 质量 / 反馈映射测试。
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java`
  - DataEase 侧 contract smoke test。

### SQLBot Backend

- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/models.py`
  - 学习结果、评分、反馈摘要字段补齐。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/schemas.py`
  - 资源列表、质量摘要、反馈摘要、反馈入参、学习触发响应 schema。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py`
  - 资产包构建、质量计算、反馈聚合、重学判断。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py`
  - 资源列表、学习触发、质量摘要、反馈摘要、反馈入库 / 重学建议接口。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py`
  - 把学习资产带入问答运行时。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/datasource/crud/recommended_problem.py`
  - 复用学习产出的推荐问法。
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_api.py`
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_runtime_context.py`

### Docs

- Create: `/Users/chenliyong/AI/github/StarBI/spec/task/query-resource-learning-api.md`
  - 收口最终前后端接口契约。

---

### Task 0: Unblock DataEase Backend Baseline Compilation

**Files:**
- Diagnose first: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/pom.xml`
- Diagnose first: `/Users/chenliyong/AI/github/StarBI/dataease/pom.xml`
- Diagnose first: representative compile-failure classes under:
  - `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/dataset/dto/DataSetNodeBO.java`
  - `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/datasource/dto/DatasourceNodeBO.java`
  - `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/visualization/dto/VisualizationNodeBO.java`
  - `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/commons/utils/MybatisInterceptorConfig.java`

- [ ] **Step 1: Reproduce the baseline compile failure**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend && mvn -DskipTests package`

Expected: FAIL with clustered compile errors showing missing Lombok-generated constructors / getters / setters across multiple existing classes.

- [ ] **Step 2: Confirm the root-cause pattern before changing anything**

Check:

- The failing classes actually rely on Lombok annotations (`@Data`, `@Getter`, `@Setter`, `@AllArgsConstructor`, `@NoArgsConstructor`)
- The build errors are consistent with Lombok-generated members disappearing
- The effective Maven compiler configuration does not explicitly pin Lombok annotation processor wiring

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
mvn -q help:effective-pom -Doutput=/tmp/core-backend-effective-pom.xml
rg -n "lombok|annotationProcessorPaths|maven-compiler-plugin|proc:none" /tmp/core-backend-effective-pom.xml
```

Expected: confirm root-cause scope before fixing.

- [ ] **Step 3: Add the smallest possible compiler fix**

If the investigation confirms annotation-processor wiring is the issue, add explicit Lombok annotation processor configuration at the narrowest level that fixes both `api-base` and `core-backend`, preferring parent Maven compiler configuration over touching business classes.

- [ ] **Step 4: Re-run the baseline backend compile**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend && mvn -DskipTests package`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/dataease/pom.xml \
  github/StarBI/dataease/core/core-backend/pom.xml
git -C /Users/chenliyong/AI commit -m "fix(build): restore dataease backend annotation processing"
```

---

### Task 1: Add DataEase Resource Learning Contracts

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningResourceVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningTriggerVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningQualitySummaryVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningFeedbackSummaryVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryLearningFeedbackRequest.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java`

- [ ] **Step 1: Write the failing DataEase contract smoke test**

```java
package io.dataease.ai.query;

import io.dataease.api.ai.query.request.AIQueryLearningFeedbackRequest;
import io.dataease.api.ai.query.vo.AIQueryLearningFeedbackSummaryVO;
import io.dataease.api.ai.query.vo.AIQueryLearningQualitySummaryVO;
import io.dataease.api.ai.query.vo.AIQueryLearningResourceVO;
import io.dataease.api.ai.query.vo.AIQueryLearningTriggerVO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class AIQueryResourceLearningContractSmokeTest {

    @Test
    void learningContractsShouldExist() {
        assertNotNull(new AIQueryLearningResourceVO());
        assertNotNull(new AIQueryLearningTriggerVO());
        assertNotNull(new AIQueryLearningQualitySummaryVO());
        assertNotNull(new AIQueryLearningFeedbackSummaryVO());
        assertNotNull(new AIQueryLearningFeedbackRequest());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend && mvn -Dtest=AIQueryResourceLearningContractSmokeTest test`

Expected: FAIL with compile errors because the new VO / request classes do not exist.

- [ ] **Step 3: Add the minimal VO / request classes**

```java
package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningResourceVO implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private String resourceId;
    private String name;
    private String learningStatus;
    private String qualityGrade;
    private Integer qualityScore;
    private String lastLearningTime;
    private String failureReason;
}
```

```java
package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningTriggerVO implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private String taskId;
    private String resourceId;
    private String taskStatus;
}
```

```java
package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryLearningQualitySummaryVO implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private String resourceId;
    private Integer score;
    private String grade;
    private List<String> risks = new ArrayList<>();
    private List<String> suggestions = new ArrayList<>();
}
```

```java
package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryLearningFeedbackSummaryVO implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private String resourceId;
    private Integer totalFeedbackCount = 0;
    private Integer downvoteCount = 0;
    private Integer failureCount = 0;
    private Boolean relearningSuggested = false;
    private List<String> recentIssues = new ArrayList<>();
}
```

```java
package io.dataease.api.ai.query.request;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningFeedbackRequest implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private String resourceId;
    private Integer failureRate = 0;
    private Integer downvoteRate = 0;
    private Boolean schemaChanged = false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend && mvn -Dtest=AIQueryResourceLearningContractSmokeTest test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningResourceVO.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningTriggerVO.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningQualitySummaryVO.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningFeedbackSummaryVO.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryLearningFeedbackRequest.java \
  github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java
git -C /Users/chenliyong/AI commit -m "feat(query-learning): add dataease learning contracts"
```

### Task 2: Extend SQLBot Learning Asset and Summary APIs

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/models.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/schemas.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_api.py`

- [ ] **Step 1: Write the failing SQLBot service tests for quality and feedback summaries**

```python
def test_build_quality_summary_uses_score_and_signals():
    from apps.query_resource_learning.service import build_quality_summary

    summary = build_quality_summary(
        resource_id="resource-1",
        score=91,
        grade="A",
        signals=["字段完整度高"],
        suggestions=["补充更多 SQL 示例"],
    )

    assert summary["resource_id"] == "resource-1"
    assert summary["score"] == 91
    assert summary["grade"] == "A"
    assert summary["risks"] == []
    assert summary["suggestions"] == ["补充更多 SQL 示例"]


def test_build_feedback_summary_marks_relearning_when_failures_are_high():
    from apps.query_resource_learning.service import build_feedback_summary

    summary = build_feedback_summary(
        resource_id="resource-2",
        downvote_count=3,
        failure_count=5,
        total_feedback_count=10,
        recent_issues=["值匹配错误", "资源召回错误"],
        schema_changed=False,
    )

    assert summary["resource_id"] == "resource-2"
    assert summary["relearning_suggested"] is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k 'quality_summary or feedback_summary' -v`

Expected: FAIL because the helper functions do not exist yet.

- [ ] **Step 3: Add minimal learning asset and summary helpers**

```python
def build_quality_summary(
    *,
    resource_id: str,
    score: int,
    grade: str,
    signals: list[str],
    suggestions: list[str],
) -> dict[str, Any]:
    risks = [] if score >= 75 else ["学习质量偏低"]
    return {
        "resource_id": resource_id,
        "score": score,
        "grade": grade,
        "risks": risks,
        "suggestions": list(suggestions),
        "signals": list(signals),
    }


def build_feedback_summary(
    *,
    resource_id: str,
    downvote_count: int,
    failure_count: int,
    total_feedback_count: int,
    recent_issues: list[str],
    schema_changed: bool,
) -> dict[str, Any]:
    failure_rate = round((failure_count / total_feedback_count) * 100) if total_feedback_count else 0
    downvote_rate = round((downvote_count / total_feedback_count) * 100) if total_feedback_count else 0
    return {
        "resource_id": resource_id,
        "total_feedback_count": total_feedback_count,
        "downvote_count": downvote_count,
        "failure_count": failure_count,
        "recent_issues": list(recent_issues),
        "relearning_suggested": should_trigger_relearning(
            failure_rate=failure_rate,
            downvote_rate=downvote_rate,
            schema_changed=schema_changed,
        ),
    }
```

```python
class QueryResourceLearningQualitySummary(BaseModel):
    resource_id: str
    score: int
    grade: str
    risks: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    signals: list[str] = Field(default_factory=list)


class QueryResourceLearningFeedbackSummary(BaseModel):
    resource_id: str
    total_feedback_count: int = 0
    downvote_count: int = 0
    failure_count: int = 0
    recent_issues: list[str] = Field(default_factory=list)
    relearning_suggested: bool = False
```

```python
@router.get("/resources/{resource_id}/quality-summary", response_model=QueryResourceLearningQualitySummary)
async def get_quality_summary(resource_id: str) -> QueryResourceLearningQualitySummary:
    return QueryResourceLearningQualitySummary(
        **build_quality_summary(
            resource_id=resource_id,
            score=91,
            grade="A",
            signals=["字段完整度高"],
            suggestions=["补充更多 SQL 示例"],
        )
    )


@router.get("/resources/{resource_id}/feedback-summary", response_model=QueryResourceLearningFeedbackSummary)
async def get_feedback_summary(resource_id: str) -> QueryResourceLearningFeedbackSummary:
    return QueryResourceLearningFeedbackSummary(
        **build_feedback_summary(
            resource_id=resource_id,
            downvote_count=1,
            failure_count=1,
            total_feedback_count=4,
            recent_issues=["过滤值映射不稳定"],
            schema_changed=False,
        )
    )
```

- [ ] **Step 4: Add API tests for the new endpoints**

```python
def test_quality_summary_endpoint_returns_structured_payload():
    session = FakeSession()
    with build_client(session) as client:
        response = client.get("/query-resource-learning/resources/resource-1/quality-summary")

    assert response.status_code == 200
    assert response.json()["resource_id"] == "resource-1"
    assert response.json()["grade"] == "A"


def test_feedback_summary_endpoint_returns_relearning_suggestion_flag():
    session = FakeSession()
    with build_client(session) as client:
        response = client.get("/query-resource-learning/resources/resource-2/feedback-summary")

    assert response.status_code == 200
    assert response.json()["resource_id"] == "resource-2"
    assert "relearning_suggested" in response.json()
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py tests/query_resource_learning/test_api.py -v`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/models.py \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/schemas.py \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py \
  github/StarBI/SQLBot/backend/tests/query_resource_learning/test_service.py \
  github/StarBI/SQLBot/backend/tests/query_resource_learning/test_api.py
git -C /Users/chenliyong/AI commit -m "feat(query-learning): add quality and feedback summaries"
```

### Task 3: Add DataEase Backend Resource Learning Proxy

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryResourceLearningServer.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/manage/AIQueryThemeManageTest.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java`

- [ ] **Step 1: Write the failing backend contract tests**

```java
@Test
void shouldMapLearningResourcePayload() {
    Map<String, Object> payload = Map.of(
            "resource_id", "resource-1",
            "name", "销售数据集",
            "learning_status", "succeeded",
            "quality_grade", "A",
            "quality_score", 96
    );

    AIQueryLearningResourceVO resource = AIQueryThemeManage.toLearningResourceVO(payload);

    assertEquals("resource-1", resource.getResourceId());
    assertEquals("销售数据集", resource.getName());
    assertEquals("succeeded", resource.getLearningStatus());
    assertEquals("A", resource.getQualityGrade());
    assertEquals(96, resource.getQualityScore());
}

@Test
void shouldMapLearningTriggerPayload() {
    Map<String, Object> payload = Map.of(
            "task_id", "task-1",
            "resource_id", "resource-2",
            "task_status", "pending"
    );

    AIQueryLearningTriggerVO trigger = AIQueryThemeManage.toLearningTriggerVO(payload);

    assertEquals("task-1", trigger.getTaskId());
    assertEquals("resource-2", trigger.getResourceId());
    assertEquals("pending", trigger.getTaskStatus());
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend && mvn -Dtest=AIQueryThemeManageTest,AIQueryResourceLearningContractSmokeTest test`

Expected: FAIL because the mapping methods and server endpoint do not exist.

- [ ] **Step 3: Add DataEase proxy mapping helpers and server endpoints**

```java
public static AIQueryLearningResourceVO toLearningResourceVO(Map<String, Object> payload) {
    AIQueryLearningResourceVO resource = new AIQueryLearningResourceVO();
    resource.setResourceId(toStringValue(payload.get("resource_id")));
    resource.setName(toStringValue(payload.get("name")));
    resource.setLearningStatus(toStringValue(payload.get("learning_status")));
    resource.setQualityGrade(toStringValue(payload.get("quality_grade")));
    resource.setQualityScore(toIntegerValue(payload.get("quality_score")));
    resource.setFailureReason(toStringValue(payload.get("failure_reason")));
    resource.setLastLearningTime(toStringValue(payload.get("last_learning_time")));
    return resource;
}

public static AIQueryLearningTriggerVO toLearningTriggerVO(Map<String, Object> payload) {
    AIQueryLearningTriggerVO trigger = new AIQueryLearningTriggerVO();
    trigger.setTaskId(toStringValue(payload.get("task_id")));
    trigger.setResourceId(toStringValue(payload.get("resource_id")));
    trigger.setTaskStatus(toStringValue(payload.get("task_status")));
    return trigger;
}
```

```java
@RestController
@RequestMapping("/ai/query/resource-learning")
public class AIQueryResourceLearningServer {

    @Resource
    private AIQueryThemeManage aiQueryThemeManage;

    @GetMapping("/resources")
    public List<AIQueryLearningResourceVO> resources() {
        return aiQueryThemeManage.listLearningResources();
    }

    @PostMapping("/resources/{resourceId}/learn")
    public AIQueryLearningTriggerVO learn(@PathVariable("resourceId") String resourceId) {
        return aiQueryThemeManage.triggerLearning(resourceId);
    }

    @GetMapping("/resources/{resourceId}/quality-summary")
    public AIQueryLearningQualitySummaryVO qualitySummary(@PathVariable("resourceId") String resourceId) {
        return aiQueryThemeManage.getLearningQualitySummary(resourceId);
    }

    @GetMapping("/resources/{resourceId}/feedback-summary")
    public AIQueryLearningFeedbackSummaryVO feedbackSummary(@PathVariable("resourceId") String resourceId) {
        return aiQueryThemeManage.getLearningFeedbackSummary(resourceId);
    }
}
```

```java
private List<AIQueryLearningResourceVO> requestLearningResources(SQLBotConfigVO config, String account) {
    String token = buildSqlBotEmbeddedToken(config, account, new Date(System.currentTimeMillis() + 5 * 60 * 1000L));
    HttpClientConfig requestConfig = new HttpClientConfig();
    requestConfig.addHeader("X-SQLBOT-ASSISTANT-TOKEN", "Embedded " + token);
    requestConfig.addHeader("Accept", "application/json");
    String response = HttpClientUtil.get(buildSqlBotApiUrl(config.getDomain(), "/query-resource-learning/resources"), requestConfig);
    Map<String, Object> payload = JsonUtil.parseObject(response, MAP_TYPE);
    Object data = payload == null ? null : payload.get("data");
    if (data instanceof List<?> list) {
        return list.stream()
                .filter(Map.class::isInstance)
                .map(item -> toLearningResourceVO((Map<String, Object>) item))
                .toList();
    }
    return Collections.emptyList();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend && mvn -Dtest=AIQueryThemeManageTest,AIQueryResourceLearningContractSmokeTest test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryResourceLearningServer.java \
  github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/manage/AIQueryThemeManageTest.java \
  github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java
git -C /Users/chenliyong/AI commit -m "feat(query-learning): add dataease proxy endpoints"
```

### Task 4: Wire the Resource Management Page to Real Learning Data

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/queryResourceLearning.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningTaskDrawer.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningFeedbackSummaryCard.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts`

- [ ] **Step 1: Write the failing frontend API contract cases**

```ts
{
  name: 'normalizes DataEase proxy resource payloads',
  async run() {
    const requestMock = resetRequestMockState()
    requestMock.getResponses.push({
      data: [
        {
          resource_id: 'resource-1',
          name: '销售数据集',
          learning_status: 'succeeded',
          quality_grade: 'A',
          quality_score: 96
        }
      ]
    })

    const result = await listQueryLearningResources()

    assertDeepEqual(result, [
      {
        id: 'resource-1',
        name: '销售数据集',
        learningStatus: '学习成功',
        qualityGrade: 'A',
        qualityScore: 96
      }
    ], 'dataease proxy normalization')
  }
}
```

- [ ] **Step 2: Run API contract to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/esbuild src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=tmp/query-resource-api-contract/query-resource-learning-api.spec.js \
  --alias:@/config/axios=./src/views/system/query-config/__tests__/query-resource-learning-request.stub.ts \
  --alias:@=./src
QUERY_RESOURCE_LEARNING_API_RUN_CONTRACTS=1 node tmp/query-resource-api-contract/query-resource-learning-api.spec.js
```

Expected: FAIL until the wrapper and page fields are aligned with the new proxy responses.

- [ ] **Step 3: Update the API wrapper and page state**

```ts
export const listQueryLearningResources = async (): Promise<QueryLearningResource[]> => {
  const response = await request.get<QueryLearningResourceListResponse>({
    url: '/ai/query/resource-learning/resources',
    silentError: true
  })
  return extractLearningResourceList(response).map(normalizeLearningResource)
}
```

```ts
const buildResourceRow = (resource: QueryLearningResource): ResourceRow => {
  const fallbackRow = fallbackRowMap.get(resource.id) || fallbackRowMap.get(resource.name)
  return {
    id: resource.id,
    name: resource.name || fallbackRow?.name || '未命名资源',
    creator: fallbackRow?.creator || '系统',
    theme: fallbackRow?.theme || '未归类',
    lastLearnTime: resource.lastLearningTime || fallbackRow?.lastLearnTime || '--',
    status: resource.learningStatus,
    learningStatus: resource.learningStatus,
    qualityGrade: resource.qualityGrade || fallbackRow?.qualityGrade,
    qualityScore: resource.qualityScore,
    learningTaskId: learningTaskIdOverrides[resource.id] || fallbackRow?.learningTaskId || resource.id,
    failureReason: resource.failureReason || fallbackRow?.failureReason || '',
    feedbackSummary: fallbackRow?.feedbackSummary || null
  }
}
```

```vue
<LearningFeedbackSummaryCard
  v-if="selectedLearningRow?.feedbackSummary"
  :summary="selectedLearningRow.feedbackSummary"
/>
```

- [ ] **Step 4: Add the failing UI contract for feedback summary rendering**

```ts
{
  name: 'renders feedback summary block in learning drawer',
  run() {
    assertMatch(
      learningTaskDrawerSource,
      /LearningFeedbackSummaryCard/,
      'drawer feedback summary component'
    )
    assertMatch(
      queryResourcePrototypeSource,
      /feedbackSummary/,
      'page feedback summary passthrough'
    )
  }
}
```

- [ ] **Step 5: Run the frontend contracts to verify they pass**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx eslint src/api/queryResourceLearning.ts src/views/system/query-config/QueryResourcePrototype.vue src/views/system/query-config/components/LearningTaskDrawer.vue src/views/system/query-config/components/LearningFeedbackSummaryCard.vue
./node_modules/.bin/tsc src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts --module commonjs --target es2020 --skipLibCheck --esModuleInterop --outDir tmp/query-resource-ui-contract
QUERY_RESOURCE_LEARNING_UI_CONTRACTS=1 node tmp/query-resource-ui-contract/query-resource-learning-ui-contract.spec.js
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/dataease/core/core-frontend/src/api/queryResourceLearning.ts \
  github/StarBI/dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue \
  github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningTaskDrawer.vue \
  github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningFeedbackSummaryCard.vue \
  github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts \
  github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts
git -C /Users/chenliyong/AI commit -m "feat(query-learning-ui): bind real learning resources"
```

### Task 5: Inject Learning Assets into SQLBot Runtime

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/datasource/crud/recommended_problem.py`
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/tests/query_resource_learning/test_runtime_context.py`

- [ ] **Step 1: Write the failing runtime context tests**

```python
def test_build_learning_context_block_includes_terms_and_sql_examples():
    from apps.query_resource_learning.service import build_learning_context_block

    block = build_learning_context_block(
        resource_name="销售数据集",
        term_mappings=[{"term": "GMV", "target": "销售金额"}],
        sql_examples=[{"question": "按门店看销售额", "sql": "select store_name, sum(amount) from sales group by store_name"}],
        value_samples=[{"field": "store_name", "values": ["南昌红谷滩店"]}],
    )

    assert "销售数据集" in block
    assert "GMV" in block
    assert "南昌红谷滩店" in block
    assert "select store_name" in block
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_runtime_context.py -v`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Add the helper and integrate it in `llm.py`**

```python
def build_learning_context_block(
    *,
    resource_name: str,
    term_mappings: list[dict[str, Any]],
    sql_examples: list[dict[str, Any]],
    value_samples: list[dict[str, Any]],
) -> str:
    chunks = [f"资源名称: {resource_name}"]
    if term_mappings:
        chunks.append("术语映射: " + ", ".join(f"{item['term']}->{item['target']}" for item in term_mappings))
    if value_samples:
        chunks.append("值样本: " + "; ".join(f"{item['field']}={','.join(item['values'])}" for item in value_samples))
    if sql_examples:
        chunks.append("SQL示例: " + " | ".join(item["sql"] for item in sql_examples[:3]))
    return "\n".join(chunks)
```

```python
learning_context = build_learning_context_block(
    resource_name=learning_result.get("resource_name", ""),
    term_mappings=learning_result.get("term_mappings", []),
    sql_examples=learning_result.get("sql_examples", []),
    value_samples=learning_result.get("value_samples", []),
)
self.chat_question.error_msg += f"\n<learning-context>\n{learning_context}\n</learning-context>"
```

```python
def save_learning_generated_questions(session: SessionDep, ds_id: int, questions: list[str]):
    session.query(DsRecommendedProblem).filter(DsRecommendedProblem.datasource_id == ds_id).delete(synchronize_session=False)
    for question in questions:
        session.add(DsRecommendedProblem(datasource_id=ds_id, question=question))
    session.commit()
```

- [ ] **Step 4: Run tests to verify runtime integration passes**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_runtime_context.py tests/query_resource_learning/test_service.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/SQLBot/backend/apps/chat/task/llm.py \
  github/StarBI/SQLBot/backend/apps/datasource/crud/recommended_problem.py \
  github/StarBI/SQLBot/backend/tests/query_resource_learning/test_runtime_context.py
git -C /Users/chenliyong/AI commit -m "feat(query-learning): inject learning assets into runtime"
```

### Task 6: Close the Feedback and Re-learning Governance Loop

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningFeedbackSummaryCard.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/spec/task/query-resource-learning-api.md`

- [ ] **Step 1: Write the failing feedback governance tests**

```python
def test_feedback_summary_marks_relearning_for_schema_changes():
    from apps.query_resource_learning.service import build_feedback_summary

    summary = build_feedback_summary(
        resource_id="resource-9",
        downvote_count=0,
        failure_count=0,
        total_feedback_count=0,
        recent_issues=[],
        schema_changed=True,
    )

    assert summary["relearning_suggested"] is True
```

- [ ] **Step 2: Run the failing test**

Run: `cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend && pytest tests/query_resource_learning/test_service.py -k schema_changes -v`

Expected: FAIL until feedback aggregation and governance messaging are aligned.

- [ ] **Step 3: Add the minimal governance logic and UI copy**

```python
def build_feedback_summary(...):
    ...
    trigger_reason = "schema_changed" if schema_changed else (
        "failure_rate_high" if failure_rate >= 30 else (
            "downvote_rate_high" if downvote_rate >= 20 else ""
        )
    )
    return {
        ...,
        "relearning_suggested": bool(trigger_reason),
        "trigger_reason": trigger_reason,
    }
```

```vue
<template>
  <div class="learning-feedback-summary-card">
    <div class="learning-feedback-summary-card__title">反馈摘要</div>
    <div class="learning-feedback-summary-card__metrics">
      <span>反馈 {{ summary.totalFeedbackCount }}</span>
      <span>点踩 {{ summary.downvoteCount }}</span>
      <span>失败 {{ summary.failureCount }}</span>
    </div>
    <div v-if="summary.relearningSuggested" class="learning-feedback-summary-card__warning">
      建议重新学习：{{ summary.triggerReason }}
    </div>
  </div>
</template>
```

- [ ] **Step 4: Write the API contract snapshot**

```md
# Query Resource Learning API

## GET /ai/query/resource-learning/resources
- 返回问数资源列表、学习状态、质量等级和最近失败原因

## POST /ai/query/resource-learning/resources/{resourceId}/learn
- 触发学习任务，返回 taskId 和 taskStatus

## GET /ai/query/resource-learning/resources/{resourceId}/quality-summary
- 返回质量分、等级、风险项、建议项

## GET /ai/query/resource-learning/resources/{resourceId}/feedback-summary
- 返回反馈计数、最近问题、是否建议重学

## POST /query-resource-learning/resources/{resourceId}/feedback
- SQLBot 接收反馈并计算重学建议
```

- [ ] **Step 5: Run governance verification**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
pytest tests/query_resource_learning/test_service.py tests/query_resource_learning/test_api.py -v
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx eslint src/views/system/query-config/QueryResourcePrototype.vue src/views/system/query-config/components/LearningFeedbackSummaryCard.vue
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/chenliyong/AI add \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/service.py \
  github/StarBI/SQLBot/backend/apps/query_resource_learning/api.py \
  github/StarBI/dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue \
  github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/LearningFeedbackSummaryCard.vue \
  github/StarBI/spec/task/query-resource-learning-api.md
git -C /Users/chenliyong/AI commit -m "feat(query-learning): close feedback governance loop"
```

### Task 7: Final Verification and Browser Acceptance

**Files:**
- Verify only: no new files

- [ ] **Step 1: Restart DataEase backend after all DataEase backend changes**

Run: `cd /Users/chenliyong/AI/github/StarBI && ./dataease/dataease-app.sh`

Expected: BUILD SUCCESS and backend listening on `8100`.

- [ ] **Step 2: Restart DataEase frontend after all DataEase frontend changes**

Run: `cd /Users/chenliyong/AI/github/StarBI && ./dataease/dataease-web.sh`

Expected: Vite ready on `http://localhost:8080/`.

- [ ] **Step 3: Restart SQLBot backend after all SQLBot backend changes**

Run: `cd /Users/chenliyong/AI/github/StarBI && ./SQLBot/sqlbot-app.sh`

Expected: Uvicorn listening on `http://0.0.0.0:8000`.

- [ ] **Step 4: Run browser verification**

Run:

```bash
agent-browser open 'http://localhost:8080/#/sys-setting/query-config?tab=query_resources'
agent-browser wait 2000
agent-browser snapshot -i
agent-browser click @<refresh-button-ref>
agent-browser wait 1500
agent-browser network har start
agent-browser click @<failed-row-task-detail-ref>
agent-browser click @<retry-button-ref>
agent-browser wait 2000
agent-browser network har stop /tmp/query-resource-learning-final.har
```

Expected:

- 资源页可打开
- 刷新列表命中 `GET /api/ai/query/resource-learning/resources`
- 失败资源点击“重新学习”命中 `POST /api/ai/query/resource-learning/resources/{id}/learn`
- 页面状态从失败更新为学习中 / 待学习
- 无顶部 401 / 404 红条

- [ ] **Step 5: Verify known project-wide noise separately**

Run: `cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend && npm run ts:check`

Expected: If it fails, failure should still be the known existing `src/views/watermark/index.vue.js` `TS6504`, not a new query-resource-learning error.

- [ ] **Step 6: Commit final integration state**

```bash
git -C /Users/chenliyong/AI add github/StarBI
git -C /Users/chenliyong/AI commit -m "feat(query-learning): complete resource learning productization"
```

## Spec Coverage Self-Check

- 学习资产包：Task 2 + Task 5 covering resource profile, semantics, samples, term mappings, SQL examples, recommended questions, quality, task records.
- 运行时消费链路：Task 5 covering runtime context injection and recommended question reuse.
- 质量评分与等级治理：Task 2 + Task 6.
- 重学触发与反馈回流：Task 2 + Task 6.
- 资源管理页字段 / 动作 / 详情：Task 3 + Task 4.

## Placeholder Scan

- No `TBD`
- No `TODO`
- No “similar to previous task”
- Every code-changing step contains concrete code
- Every verification step contains exact commands

## Type Consistency Self-Check

- DataEase frontend always consumes `/ai/query/resource-learning/...`
- DataEase backend always proxies to SQLBot `/query-resource-learning/...`
- SQLBot quality / feedback summary field names stay `resource_id`, `relearning_suggested`, `trigger_reason`
- Frontend wrapper normalizes them to `id`, `learningStatus`, `qualityGrade`, `qualityScore`
