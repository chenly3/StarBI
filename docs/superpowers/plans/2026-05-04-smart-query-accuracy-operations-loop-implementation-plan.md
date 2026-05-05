# Smart Query Accuracy Operations Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first implementation slice of the smart-query accuracy operations loop so DataEase runtime truly consumes resource readiness, analysis themes, global switches, permissions, semantic knowledge, and correction feedback before any SQLBot answer path can produce user-visible facts.

**Architecture:** Keep DataEase as the single trusted runtime gateway. Add explicit backend action contracts, switch enforcement, `AuthorizedAskScope`, deterministic `ResourceReadiness`, sensitive `CorrectionTodo`, and semantic patch lifecycle services around the existing `/ai/query/trusted-answer` and `/ai/query/resource-learning` code. Frontend work remains contract-driven: question/config UI reads real DataEase APIs, removes hardcoded learning state, and proves SQLBot answer-runtime actions do not bypass DataEase.

**Tech Stack:** Spring Boot 3, Java 21, Jackson, JUnit 5, Mockito, existing DataEase SDK API module, Vue 3, TypeScript, Element Plus Secondary, existing esbuild-based frontend contract specs, existing DataEase `request` wrapper.

---

## Source Inputs

- Spec: `docs/superpowers/specs/2026-05-04-smart-query-accuracy-operations-loop-design.md`
- Latest `/autoplan` report: `/Users/chenliyong/.gstack/projects/chenly3-StarBI/main-autoplan-review-20260504-210312-smart-query-accuracy-loop.md`
- Existing runtime guide: `dataease/docs/smart-query-runtime-dev.md`

## Scope Check

This spec covers one connected subsystem: the smart-query accuracy operations loop. It should stay as one plan because M1, M2, and M3 share the same runtime gateway, resource readiness, correction, and semantic patch contracts.

This plan deliberately does not build a full governance platform, full replay platform, or complete historical snapshot product. It builds the minimum safe product slice required by the spec:

- M1a: direct resource/theme askability, global switch enforcement, endpoint contracts, fact-answer boundary.
- M1b: theme focus/clarification and current-permission context rebuild.
- M1c: diagnostic visibility boundaries.
- M1d: runtime action matrix and default-deny SQLBot proxy guard.
- M2: sensitive correction todo creation, redaction, fingerprint, retention defaults, and queue visibility.
- M3: semantic correction draft/publish/disable/unpublish/rollback lifecycle with operation-level RBAC and audit.

## File Structure

All paths below are relative to `/Users/chenliyong/AI/github/StarBI`.

### Backend SDK Contracts

- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerRequest.java`
  - Add `action_type`, `entry_scene`, `resource_kind`, `resource_id`, `source_trace_id`, `parent_trace_id`, and `record_id`.
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQuerySqlBotRuntimeProxyRequest.java`
  - Add optional `action_type`, `source_trace_id`, and `record_id` for route contract checks.
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerContextVO.java`
  - Add safe scope metadata: action type, entry scene, resource IDs, switch states, askability, and readiness.
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTraceVO.java`
  - Add user-safe evidence summary, action type, source trace, and blocked reason fields.
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorCode.java`
  - Add switch, route, fact-boundary, row-policy, and sensitive-payload error codes.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerActionType.java`
  - Canonical action enum used by backend, frontend, and tests.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerSwitchKey.java`
  - Runtime switch enum: `ask_enabled`, `data_interpretation_enabled`, `forecast_enabled`, `followup_enabled`, `sample_dataset_enabled`, `voice_enabled`.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AuthorizedAskabilityState.java`
  - `ASK_ALLOWED`, `ASK_PARTIAL`, `ASK_BLOCKED`.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/ResourceReadinessState.java`
  - `NOT_ASKABLE`, `TRIAL_ASKABLE`, `FORMAL_ASKABLE`, `NEEDS_OPTIMIZATION`.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerEndpointContractVO.java`
  - Serializable action contract summary for diagnostics and tests.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerRuntimePolicyVO.java`
  - Switch-state summary returned to trace and overview UI.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerCorrectionTodoVO.java`
  - User-safe correction todo view.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerSemanticPatchVO.java`
  - Semantic patch lifecycle view.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerCorrectionFeedbackRequest.java`
  - User/system correction input.
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerSemanticPatchRequest.java`
  - Draft/publish/disable/unpublish/rollback input.

### Backend Runtime Services

- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java`
  - Add typed endpoints for contracts, correction todos, semantic patches, dashboard ask, and file ask.
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimeContextService.java`
  - Build `AuthorizedAskScope` before semantic context; enforce global switches and current permissions.
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java`
  - Replace path-only allowlist with action contracts and default-deny.
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerOpsService.java`
  - Read correction todos, semantic patch state, and route contract health.
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerActionContractService.java`
  - Endpoint/action/method/switch/upstream matrix.
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimePolicyService.java`
  - Runtime switch loader with fail-safe defaults.
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerResourceReadinessService.java`
  - Deterministic readiness scoring.
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/AuthorizedAskScope.java`
  - Internal runtime scope object containing only IDs, capabilities, policy summaries, and denial reasons.
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerFactBoundaryService.java`
  - Blocks SQLBot fact/chart/table outputs when DataEase has not produced an authorized result marker.
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerConversationContextService.java`
  - Rebuilds redacted conversation context from current scope every turn.
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerSensitivePayloadService.java`
  - Redaction, tenant-scoped keyed hash fingerprint, retention defaults, and user-safe summaries.
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerCorrectionTodoService.java`
  - In-memory first slice of correction todo queue with aggregation.
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerSemanticPatchService.java`
  - Draft/publish/disable/unpublish/rollback lifecycle with role checks and audit list.

### Backend Tests

- Modify: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java`
  - Add DTO, endpoint, and error-code contract tests.
- Modify: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerRuntimeContextServiceTest.java`
  - Add switch, askability, history redaction, and fact-boundary tests.
- Modify: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerOpsServiceTest.java`
  - Add correction queue and semantic patch health tests.
- Modify: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java`
  - Add ResourceReadiness fields and semantic patch lifecycle contracts.
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerActionContractServiceTest.java`
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerResourceReadinessServiceTest.java`
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerSensitivePayloadServiceTest.java`
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerCorrectionTodoServiceTest.java`
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerSemanticPatchServiceTest.java`

### Frontend API And UI

- Modify: `dataease/core/core-frontend/src/api/aiTrustedAnswer.ts`
  - Add action contract, correction todo, semantic patch, dashboard ask, file ask, and runtime policy wrappers.
- Modify: `dataease/core/core-frontend/src/api/queryResourceLearning.ts`
  - Add readiness, askability, semantic patch lifecycle fields, and safer defaults.
- Modify: `dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue`
  - Use real readiness/learning data, improve density, fixed card/table geometry, and empty states.
- Modify: `dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue`
  - Remove hardcoded `学习成功`; join real learning resources by dataset id.
- Modify: `dataease/core/core-frontend/src/views/system/query-config/components/TrustedAnswerOverview.vue`
  - Show action contract health, switch states, correction queue, and semantic patch health.
- Modify: `dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-api-contract.spec.ts`
- Modify: `dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-sqlbot-direct-guard.spec.ts`
- Modify: `dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts`
- Modify: `dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-api-contract.spec.ts`
- Modify: `dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts`
- Create: `dataease/core/core-frontend/src/views/system/query-config/__tests__/smart-query-accuracy-loop-contract.spec.ts`

### Docs

- Modify: `dataease/docs/smart-query-runtime-dev.md`
  - Add quickstart commands for the accuracy loop contracts, switch behavior, endpoint matrix, and correction/semantic patch verification.

## Validation Commands

Use these commands throughout the plan.

Backend focused tests:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest,io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest,io.dataease.ai.query.TrustedAnswerActionContractServiceTest,io.dataease.ai.query.TrustedAnswerResourceReadinessServiceTest,io.dataease.ai.query.TrustedAnswerSensitivePayloadServiceTest,io.dataease.ai.query.TrustedAnswerCorrectionTodoServiceTest,io.dataease.ai.query.TrustedAnswerSemanticPatchServiceTest,io.dataease.ai.query.TrustedAnswerOpsServiceTest,io.dataease.ai.query.AIQueryResourceLearningContractSmokeTest \
  -Dmaven.antrun.skip=true \
  test
```

Expected after tests are implemented: Maven exits `0` and all named tests pass.

Frontend contract bundle pattern:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
mkdir -p tmp/smart-query-accuracy-loop-contract
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/smart-query-accuracy-loop-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/smart-query-accuracy-loop-contract/smart-query-accuracy-loop-contract.spec.js
SMART_QUERY_ACCURACY_LOOP_CONTRACTS=1 node tmp/smart-query-accuracy-loop-contract/smart-query-accuracy-loop-contract.spec.js
```

Expected after the contract is implemented:

```text
[smart-query-accuracy-loop] 9 contract checks passed
```

## Task 1: Backend Contract Types And Error Codes

**Files:**
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerRequest.java`
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQuerySqlBotRuntimeProxyRequest.java`
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerContextVO.java`
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTraceVO.java`
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorCode.java`
- Create: SDK VO/request files listed in Backend SDK Contracts.
- Modify: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java`

- [ ] **Step 1: Add failing contract tests**

Append these test methods to `AIQueryTrustedAnswerContractSmokeTest`:

```java
@Test
void accuracyLoopRequestShouldCarryActionEntryResourceAndLineage() throws Exception {
    TrustedAnswerRequest request = new TrustedAnswerRequest();
    request.setQuestion("继续分析华东销售额");
    request.setActionType(TrustedAnswerActionType.MANUAL_FOLLOW_UP);
    request.setEntryScene("dashboard");
    request.setResourceKind("dataset");
    request.setResourceId("11");
    request.setSourceTraceId("ta-source");
    request.setParentTraceId("ta-parent");
    request.setRecordId("record-7");

    String json = objectMapper.writeValueAsString(request);

    assertTrue(json.contains("\"action_type\":\"MANUAL_FOLLOW_UP\""));
    assertTrue(json.contains("\"entry_scene\":\"dashboard\""));
    assertTrue(json.contains("\"resource_kind\":\"dataset\""));
    assertTrue(json.contains("\"resource_id\":\"11\""));
    assertTrue(json.contains("\"source_trace_id\":\"ta-source\""));
    assertTrue(json.contains("\"parent_trace_id\":\"ta-parent\""));
    assertTrue(json.contains("\"record_id\":\"record-7\""));
}

@Test
void accuracyLoopContextShouldExposePolicyReadinessAskabilityAndEvidenceSummary() throws Exception {
    TrustedAnswerRuntimePolicyVO policy = new TrustedAnswerRuntimePolicyVO();
    policy.setAskEnabled(false);
    policy.setDataInterpretationEnabled(true);
    policy.setForecastEnabled(true);
    policy.setFollowupEnabled(true);
    policy.setSampleDatasetEnabled(false);
    policy.setVoiceEnabled(false);

    TrustedAnswerContextVO context = new TrustedAnswerContextVO();
    context.setActionType(TrustedAnswerActionType.BASIC_ASK);
    context.setEntryScene("analysis_theme");
    context.setResourceKind("dataset");
    context.setResourceId("11");
    context.setReadinessState(ResourceReadinessState.FORMAL_ASKABLE);
    context.setAskabilityState(AuthorizedAskabilityState.ASK_BLOCKED);
    context.setRuntimePolicy(policy);

    TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
    trace.setTraceId("ta-policy");
    trace.setState(TrustedAnswerState.NO_AUTHORIZED_CONTEXT);
    trace.setContext(context);
    trace.setUserSafeEvidenceSummary("基于销售分析主题，已按当前权限裁剪。");
    trace.setBlockedReason("ASK_DISABLED");

    String json = objectMapper.writeValueAsString(trace);

    assertTrue(json.contains("\"action_type\":\"BASIC_ASK\""));
    assertTrue(json.contains("\"entry_scene\":\"analysis_theme\""));
    assertTrue(json.contains("\"readiness_state\":\"FORMAL_ASKABLE\""));
    assertTrue(json.contains("\"askability_state\":\"ASK_BLOCKED\""));
    assertTrue(json.contains("\"ask_enabled\":false"));
    assertTrue(json.contains("\"user_safe_evidence_summary\":\"基于销售分析主题，已按当前权限裁剪。\""));
    assertTrue(json.contains("\"blocked_reason\":\"ASK_DISABLED\""));
}

@Test
void correctionTodoAndSemanticPatchContractsShouldHideRestrictedPayloadByDefault() throws Exception {
    TrustedAnswerCorrectionTodoVO todo = new TrustedAnswerCorrectionTodoVO();
    todo.setTodoId("todo-1");
    todo.setTenantId("tenant-a");
    todo.setWorkspaceId("workspace-a");
    todo.setThemeId("1001");
    todo.setResourceId("11");
    todo.setDiagnosisType("FIELD_AMBIGUOUS");
    todo.setSanitizedQuestionSummary("用户询问销售额，包含已脱敏客户信息。");
    todo.setDuplicateFingerprint("sha256:tenant-hmac");
    todo.setStatus("PENDING");
    todo.setSeverity("P1");
    todo.setImpactCount(2);
    todo.setRestrictedPayloadVisible(false);

    TrustedAnswerSemanticPatchVO patch = new TrustedAnswerSemanticPatchVO();
    patch.setPatchId("patch-1");
    patch.setScope("resource");
    patch.setPatchType("FIELD_ALIAS");
    patch.setStatus("PUBLISHED");
    patch.setSourceTodoId("todo-1");
    patch.setAuditEventNo("audit-1");
    patch.setRollbackToPatchId("patch-0");

    String todoJson = objectMapper.writeValueAsString(todo);
    String patchJson = objectMapper.writeValueAsString(patch);

    assertTrue(todoJson.contains("\"sanitized_question_summary\":\"用户询问销售额，包含已脱敏客户信息。\""));
    assertTrue(todoJson.contains("\"duplicate_fingerprint\":\"sha256:tenant-hmac\""));
    assertTrue(todoJson.contains("\"restricted_payload_visible\":false"));
    assertTrue(patchJson.contains("\"status\":\"PUBLISHED\""));
    assertTrue(patchJson.contains("\"audit_event_no\":\"audit-1\""));
    assertTrue(patchJson.contains("\"rollback_to_patch_id\":\"patch-0\""));
}
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn -DskipTests=false -Dmaven.test.skip=false -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest \
  -Dmaven.antrun.skip=true test
```

Expected: FAIL with `cannot find symbol` for `TrustedAnswerActionType`, `TrustedAnswerRuntimePolicyVO`, `ResourceReadinessState`, `AuthorizedAskabilityState`, `TrustedAnswerCorrectionTodoVO`, or `TrustedAnswerSemanticPatchVO`.

- [ ] **Step 3: Add SDK enums**

Create `TrustedAnswerActionType.java`:

```java
package io.dataease.api.ai.query.vo;

public enum TrustedAnswerActionType {
    BASIC_ASK,
    RECOMMENDATION_ASK,
    DATA_INTERPRETATION,
    FORECAST,
    MANUAL_FOLLOW_UP,
    AUTO_FOLLOW_UP,
    HISTORY_LIST,
    HISTORY_RESTORE,
    HISTORY_FOLLOW_UP,
    CHART_DATA,
    USAGE,
    CONTEXT_SWITCH,
    SNAPSHOT,
    DASHBOARD_ASK,
    FILE_ASK
}
```

Create `TrustedAnswerSwitchKey.java`:

```java
package io.dataease.api.ai.query.vo;

public enum TrustedAnswerSwitchKey {
    ASK_ENABLED("ask_enabled"),
    DATA_INTERPRETATION_ENABLED("data_interpretation_enabled"),
    FORECAST_ENABLED("forecast_enabled"),
    FOLLOWUP_ENABLED("followup_enabled"),
    SAMPLE_DATASET_ENABLED("sample_dataset_enabled"),
    VOICE_ENABLED("voice_enabled");

    private final String key;

    TrustedAnswerSwitchKey(String key) {
        this.key = key;
    }

    public String getKey() {
        return key;
    }
}
```

Create `AuthorizedAskabilityState.java`:

```java
package io.dataease.api.ai.query.vo;

public enum AuthorizedAskabilityState {
    ASK_ALLOWED,
    ASK_PARTIAL,
    ASK_BLOCKED
}
```

Create `ResourceReadinessState.java`:

```java
package io.dataease.api.ai.query.vo;

public enum ResourceReadinessState {
    NOT_ASKABLE,
    TRIAL_ASKABLE,
    FORMAL_ASKABLE,
    NEEDS_OPTIMIZATION
}
```

- [ ] **Step 4: Add SDK VO classes**

Create `TrustedAnswerRuntimePolicyVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerRuntimePolicyVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("ask_enabled")
    private Boolean askEnabled = true;

    @JsonProperty("data_interpretation_enabled")
    private Boolean dataInterpretationEnabled = true;

    @JsonProperty("forecast_enabled")
    private Boolean forecastEnabled = true;

    @JsonProperty("followup_enabled")
    private Boolean followupEnabled = true;

    @JsonProperty("sample_dataset_enabled")
    private Boolean sampleDatasetEnabled = true;

    @JsonProperty("voice_enabled")
    private Boolean voiceEnabled = true;
}
```

Create `TrustedAnswerEndpointContractVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerEndpointContractVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("dataease_endpoint")
    private String dataEaseEndpoint;

    private String method;

    @JsonProperty("action_type")
    private TrustedAnswerActionType actionType;

    @JsonProperty("required_switch")
    private TrustedAnswerSwitchKey requiredSwitch;

    @JsonProperty("sqlbot_upstream")
    private String sqlBotUpstream;

    @JsonProperty("capability_check")
    private String capabilityCheck;

    @JsonProperty("negative_test")
    private String negativeTest;
}
```

Create `TrustedAnswerCorrectionTodoVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerCorrectionTodoVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("todo_id")
    private String todoId;

    @JsonProperty("tenant_id")
    private String tenantId;

    @JsonProperty("workspace_id")
    private String workspaceId;

    @JsonProperty("theme_id")
    private String themeId;

    @JsonProperty("resource_id")
    private String resourceId;

    @JsonProperty("diagnosis_type")
    private String diagnosisType;

    @JsonProperty("sanitized_question_summary")
    private String sanitizedQuestionSummary;

    @JsonProperty("duplicate_fingerprint")
    private String duplicateFingerprint;

    private String status;

    private String severity;

    @JsonProperty("impact_count")
    private Integer impactCount = 1;

    @JsonProperty("restricted_payload_visible")
    private Boolean restrictedPayloadVisible = false;

    @JsonProperty("linked_knowledge_id")
    private String linkedKnowledgeId;

    @JsonProperty("linked_relearning_job_id")
    private String linkedRelearningJobId;
}
```

Create `TrustedAnswerSemanticPatchVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerSemanticPatchVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("patch_id")
    private String patchId;

    private String scope;

    @JsonProperty("patch_type")
    private String patchType;

    private String status;

    @JsonProperty("source_todo_id")
    private String sourceTodoId;

    @JsonProperty("audit_event_no")
    private String auditEventNo;

    @JsonProperty("rollback_to_patch_id")
    private String rollbackToPatchId;
}
```

- [ ] **Step 5: Add SDK request classes**

Create `TrustedAnswerCorrectionFeedbackRequest.java`:

```java
package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerCorrectionFeedbackRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("source_trace_id")
    private String sourceTraceId;

    @JsonProperty("theme_id")
    private String themeId;

    @JsonProperty("resource_id")
    private String resourceId;

    @JsonProperty("diagnosis_type")
    private String diagnosisType;

    @JsonProperty("question_text")
    private String questionText;

    @JsonProperty("feedback_text")
    private String feedbackText;

    @JsonProperty("answer_excerpt")
    private String answerExcerpt;
}
```

Create `TrustedAnswerSemanticPatchRequest.java`:

```java
package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerSemanticPatchRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("todo_id")
    private String todoId;

    private String scope;

    @JsonProperty("patch_type")
    private String patchType;

    @JsonProperty("operation")
    private String operation;

    @JsonProperty("patch_id")
    private String patchId;

    @JsonProperty("previous_patch_id")
    private String previousPatchId;

    @JsonProperty("actor_role")
    private String actorRole;

    private String content;
}
```

- [ ] **Step 6: Modify existing SDK request/VO files**

Add these fields to `TrustedAnswerRequest.java`:

```java
@JsonProperty("action_type")
private TrustedAnswerActionType actionType = TrustedAnswerActionType.BASIC_ASK;

@JsonProperty("entry_scene")
private String entryScene;

@JsonProperty("resource_kind")
private String resourceKind;

@JsonProperty("resource_id")
private String resourceId;

@JsonProperty("source_trace_id")
private String sourceTraceId;

@JsonProperty("parent_trace_id")
private String parentTraceId;

@JsonProperty("record_id")
private String recordId;
```

Add these fields to `AIQuerySqlBotRuntimeProxyRequest.java`:

```java
@JsonProperty("action_type")
private TrustedAnswerActionType actionType;

@JsonProperty("source_trace_id")
private String sourceTraceId;

@JsonProperty("record_id")
private String recordId;
```

Add these fields to `TrustedAnswerContextVO.java`:

```java
@JsonProperty("action_type")
private TrustedAnswerActionType actionType;

@JsonProperty("entry_scene")
private String entryScene;

@JsonProperty("resource_kind")
private String resourceKind;

@JsonProperty("resource_id")
private String resourceId;

@JsonProperty("readiness_state")
private ResourceReadinessState readinessState;

@JsonProperty("askability_state")
private AuthorizedAskabilityState askabilityState;

@JsonProperty("runtime_policy")
private TrustedAnswerRuntimePolicyVO runtimePolicy;
```

Add these fields to `TrustedAnswerTraceVO.java`:

```java
@JsonProperty("source_trace_id")
private String sourceTraceId;

@JsonProperty("parent_trace_id")
private String parentTraceId;

@JsonProperty("user_safe_evidence_summary")
private String userSafeEvidenceSummary;

@JsonProperty("blocked_reason")
private String blockedReason;
```

Add these enum constants to `TrustedAnswerErrorCode.java` before `SQLBOT_UNAVAILABLE`:

```java
ASK_DISABLED(
        TrustedAnswerState.NO_AUTHORIZED_CONTEXT,
        "智能问数已关闭。",
        "全局 ask_enabled=false，后端已阻断基础问数流。",
        "在系统设置中启用智能问数后重试。",
        "check-runtime-switch",
        false
),
ACTION_DISABLED(
        TrustedAnswerState.NO_AUTHORIZED_CONTEXT,
        "当前问数能力已关闭。",
        "对应运行时开关关闭，后端已拒绝该动作。",
        "启用对应问数能力后重试。",
        "check-action-switch",
        false
),
UNMAPPED_SQLBOT_PROXY_PATH(
        TrustedAnswerState.UNSAFE_BLOCKED,
        "该 SQLBot 运行时路径未纳入可信问数契约。",
        "请求路径或 method 无法映射到 DataEase 运行时动作矩阵。",
        "改用 DataEase 可信问数 endpoint，或补充后端动作契约。",
        "validate-action-contract",
        false
),
FACT_RESULT_REQUIRED(
        TrustedAnswerState.UNSAFE_BLOCKED,
        "无法生成可信事实答案。",
        "SQLBot 返回了事实内容，但 DataEase 没有授权结果集标记。",
        "先由 DataEase 执行授权查询并生成结果集。",
        "validate-fact-boundary",
        false
),
SENSITIVE_PAYLOAD_RESTRICTED(
        TrustedAnswerState.UNSAFE_BLOCKED,
        "敏感反馈内容仅允许受控访问。",
        "CorrectionTodo restricted payload 不允许在当前视图展示。",
        "使用诊断权限查看，或查看脱敏摘要。",
        "redact-correction-payload",
        false
)
```

- [ ] **Step 7: Run contract tests and verify they pass**

Run the same Maven command from Step 2.

Expected: PASS for `AIQueryTrustedAnswerContractSmokeTest`.

- [ ] **Step 8: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerRequest.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQuerySqlBotRuntimeProxyRequest.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerCorrectionFeedbackRequest.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerSemanticPatchRequest.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerActionType.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerSwitchKey.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AuthorizedAskabilityState.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/ResourceReadinessState.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerEndpointContractVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerRuntimePolicyVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerCorrectionTodoVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerSemanticPatchVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerContextVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTraceVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorCode.java \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java
git commit -m "feat: add smart query accuracy loop contracts"
```

## Task 2: Runtime Switch And Endpoint Action Matrix

**Files:**
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerActionContractServiceTest.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimePolicyService.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerActionContractService.java`
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java`
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java`

- [ ] **Step 1: Write failing action matrix tests**

Create `TrustedAnswerActionContractServiceTest.java`:

```java
package io.dataease.ai.query;

import io.dataease.ai.query.trusted.TrustedAnswerActionContractService;
import io.dataease.ai.query.trusted.TrustedAnswerRuntimePolicyService;
import io.dataease.api.ai.query.vo.TrustedAnswerActionType;
import io.dataease.api.ai.query.vo.TrustedAnswerEndpointContractVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrustedAnswerActionContractServiceTest {

    @Test
    void endpointContractsShouldCoverEveryUserVisibleRuntimeAction() {
        TrustedAnswerActionContractService service = new TrustedAnswerActionContractService();

        List<TrustedAnswerEndpointContractVO> contracts = service.contracts();

        assertEquals(12, contracts.size());
        assertTrue(contracts.stream().anyMatch(item -> item.getActionType() == TrustedAnswerActionType.BASIC_ASK));
        assertTrue(contracts.stream().anyMatch(item -> item.getActionType() == TrustedAnswerActionType.DATA_INTERPRETATION));
        assertTrue(contracts.stream().anyMatch(item -> item.getActionType() == TrustedAnswerActionType.FORECAST));
        assertTrue(contracts.stream().anyMatch(item -> item.getActionType() == TrustedAnswerActionType.HISTORY_RESTORE));
        assertTrue(contracts.stream().anyMatch(item -> item.getActionType() == TrustedAnswerActionType.DASHBOARD_ASK));
        assertTrue(contracts.stream().anyMatch(item -> item.getActionType() == TrustedAnswerActionType.FILE_ASK));
    }

    @Test
    void sqlbotProxyPathShouldResolveToActionContractOrDefaultDeny() {
        TrustedAnswerActionContractService service = new TrustedAnswerActionContractService();

        Optional<TrustedAnswerEndpointContractVO> analysis = service.resolveSqlBotRuntime("POST", "/chat/record/7/analysis");
        Optional<TrustedAnswerEndpointContractVO> predict = service.resolveSqlBotRuntime("POST", "/chat/record/7/predict");
        Optional<TrustedAnswerEndpointContractVO> unmapped = service.resolveSqlBotRuntime("POST", "/admin/raw-sql");
        Optional<TrustedAnswerEndpointContractVO> wrongMethod = service.resolveSqlBotRuntime("DELETE", "/chat/record/7/analysis");

        assertTrue(analysis.isPresent());
        assertEquals(TrustedAnswerActionType.DATA_INTERPRETATION, analysis.get().getActionType());
        assertTrue(predict.isPresent());
        assertEquals(TrustedAnswerActionType.FORECAST, predict.get().getActionType());
        assertFalse(unmapped.isPresent());
        assertFalse(wrongMethod.isPresent());
    }

    @Test
    void disabledBaseAskShouldReturnAskDisabledBeforeSqlbot() {
        TrustedAnswerRuntimePolicyVO policy = new TrustedAnswerRuntimePolicyVO();
        policy.setAskEnabled(false);

        TrustedAnswerActionContractService service = new TrustedAnswerActionContractService();

        assertEquals(
                TrustedAnswerErrorCode.ASK_DISABLED,
                service.disabledError(TrustedAnswerActionType.BASIC_ASK, policy).orElseThrow()
        );
    }

    @Test
    void disabledSecondaryActionShouldReturnActionDisabled() {
        TrustedAnswerRuntimePolicyVO policy = new TrustedAnswerRuntimePolicyVO();
        policy.setDataInterpretationEnabled(false);
        policy.setForecastEnabled(false);

        TrustedAnswerActionContractService service = new TrustedAnswerActionContractService();

        assertEquals(
                TrustedAnswerErrorCode.ACTION_DISABLED,
                service.disabledError(TrustedAnswerActionType.DATA_INTERPRETATION, policy).orElseThrow()
        );
        assertEquals(
                TrustedAnswerErrorCode.ACTION_DISABLED,
                service.disabledError(TrustedAnswerActionType.FORECAST, policy).orElseThrow()
        );
    }

    @Test
    void runtimePolicyShouldDefaultToEnabledExceptExplicitFalse() {
        TrustedAnswerRuntimePolicyService service = new TrustedAnswerRuntimePolicyService(key -> {
            if ("ai.query.ask_enabled".equals(key)) {
                return "false";
            }
            if ("ai.query.voice_enabled".equals(key)) {
                return "";
            }
            return "true";
        });

        TrustedAnswerRuntimePolicyVO policy = service.load();

        assertEquals(Boolean.FALSE, policy.getAskEnabled());
        assertEquals(Boolean.TRUE, policy.getDataInterpretationEnabled());
        assertEquals(Boolean.TRUE, policy.getForecastEnabled());
        assertEquals(Boolean.TRUE, policy.getFollowupEnabled());
        assertEquals(Boolean.TRUE, policy.getSampleDatasetEnabled());
        assertEquals(Boolean.TRUE, policy.getVoiceEnabled());
    }
}
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn -DskipTests=false -Dmaven.test.skip=false -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerActionContractServiceTest \
  -Dmaven.antrun.skip=true test
```

Expected: FAIL with missing `TrustedAnswerActionContractService` and `TrustedAnswerRuntimePolicyService`.

- [ ] **Step 3: Implement runtime policy service**

Create `TrustedAnswerRuntimePolicyService.java`:

```java
package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO;
import io.dataease.system.manage.SysParameterManage;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.function.Function;

@Service
public class TrustedAnswerRuntimePolicyService {

    private final Function<String, String> parameterReader;

    public TrustedAnswerRuntimePolicyService(SysParameterManage sysParameterManage) {
        this(sysParameterManage == null ? key -> null : sysParameterManage::singleVal);
    }

    public TrustedAnswerRuntimePolicyService(Function<String, String> parameterReader) {
        this.parameterReader = parameterReader;
    }

    public TrustedAnswerRuntimePolicyVO load() {
        TrustedAnswerRuntimePolicyVO policy = new TrustedAnswerRuntimePolicyVO();
        policy.setAskEnabled(readBoolean("ai.query.ask_enabled", true));
        policy.setDataInterpretationEnabled(readBoolean("ai.query.data_interpretation_enabled", true));
        policy.setForecastEnabled(readBoolean("ai.query.forecast_enabled", true));
        policy.setFollowupEnabled(readBoolean("ai.query.followup_enabled", true));
        policy.setSampleDatasetEnabled(readBoolean("ai.query.sample_dataset_enabled", true));
        policy.setVoiceEnabled(readBoolean("ai.query.voice_enabled", true));
        return policy;
    }

    private boolean readBoolean(String key, boolean defaultValue) {
        String raw = parameterReader == null ? null : parameterReader.apply(key);
        if (StringUtils.isBlank(raw)) {
            return defaultValue;
        }
        return Boolean.parseBoolean(StringUtils.trim(raw));
    }
}
```

- [ ] **Step 4: Implement action contract service**

Create `TrustedAnswerActionContractService.java`:

```java
package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerActionType;
import io.dataease.api.ai.query.vo.TrustedAnswerEndpointContractVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO;
import io.dataease.api.ai.query.vo.TrustedAnswerSwitchKey;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class TrustedAnswerActionContractService {

    private record ContractDef(
            String endpoint,
            String method,
            TrustedAnswerActionType actionType,
            TrustedAnswerSwitchKey requiredSwitch,
            String upstreamPattern,
            String capabilityCheck,
            String negativeTest
    ) {
    }

    private static final List<ContractDef> CONTRACTS = List.of(
            contract("/ai/query/trusted-answer/stream", "POST", TrustedAnswerActionType.BASIC_ASK, TrustedAnswerSwitchKey.ASK_ENABLED, "/chat/question", "ask + theme/resource/field/row policy", "ask_enabled=false"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.RECOMMENDATION_ASK, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/recommend_questions/[^/]+$", "resource visibility", "lost resource recommendation"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.DATA_INTERPRETATION, TrustedAnswerSwitchKey.DATA_INTERPRETATION_ENABLED, "^/chat/record/[^/]+/analysis$", "record owner + current scope", "interpretation disabled"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.FORECAST, TrustedAnswerSwitchKey.FORECAST_ENABLED, "^/chat/record/[^/]+/predict$", "record owner + time field visible", "forecast disabled"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.HISTORY_LIST, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/sqlbot-new/history$", "session owner", "other user history"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.HISTORY_RESTORE, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/[^/]+/sqlbot-new/context$", "session owner + current permissions", "revoked resource restore"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.CONTEXT_SWITCH, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/[^/]+/sqlbot-new/context-switch$", "current scope payload only", "payload contains sql"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.SNAPSHOT, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/[^/]+/sqlbot-new/snapshot$", "current scope payload only", "payload contains physical table"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.CHART_DATA, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/record/[^/]+/data$", "record owner + fields visible", "record revoked"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.USAGE, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/record/[^/]+/usage$", "record owner + visibility mode", "diagnostic usage requested by normal user"),
            contract("/ai/query/trusted-answer/dashboard/ask", "POST", TrustedAnswerActionType.DASHBOARD_ASK, TrustedAnswerSwitchKey.ASK_ENABLED, "", "dashboard resource + fields visible", "dashboard revoked"),
            contract("/ai/query/trusted-answer/file/ask", "POST", TrustedAnswerActionType.FILE_ASK, TrustedAnswerSwitchKey.ASK_ENABLED, "", "file resource + fields visible", "file revoked")
    );

    public List<TrustedAnswerEndpointContractVO> contracts() {
        return CONTRACTS.stream().map(this::toVO).toList();
    }

    public Optional<TrustedAnswerEndpointContractVO> resolveSqlBotRuntime(String method, String path) {
        String normalizedMethod = StringUtils.upperCase(StringUtils.trimToEmpty(method));
        String rawPath = normalizePath(path);
        return CONTRACTS.stream()
                .filter(item -> "/ai/query/trusted-answer/sqlbot-runtime".equals(item.endpoint()))
                .filter(item -> item.method().equals(normalizedMethod))
                .filter(item -> StringUtils.isNotBlank(item.upstreamPattern()))
                .filter(item -> Pattern.matches(item.upstreamPattern(), rawPath))
                .findFirst()
                .map(this::toVO);
    }

    public Optional<TrustedAnswerErrorCode> disabledError(TrustedAnswerActionType actionType, TrustedAnswerRuntimePolicyVO policy) {
        if (policy == null || actionType == null) {
            return Optional.empty();
        }
        if (requiresAsk(actionType) && Boolean.FALSE.equals(policy.getAskEnabled())) {
            return Optional.of(TrustedAnswerErrorCode.ASK_DISABLED);
        }
        return switch (actionType) {
            case DATA_INTERPRETATION -> Boolean.FALSE.equals(policy.getDataInterpretationEnabled())
                    ? Optional.of(TrustedAnswerErrorCode.ACTION_DISABLED)
                    : Optional.empty();
            case FORECAST -> Boolean.FALSE.equals(policy.getForecastEnabled())
                    ? Optional.of(TrustedAnswerErrorCode.ACTION_DISABLED)
                    : Optional.empty();
            case MANUAL_FOLLOW_UP, AUTO_FOLLOW_UP, HISTORY_FOLLOW_UP -> Boolean.FALSE.equals(policy.getFollowupEnabled())
                    ? Optional.of(TrustedAnswerErrorCode.ACTION_DISABLED)
                    : Optional.empty();
            case FILE_ASK -> Boolean.FALSE.equals(policy.getSampleDatasetEnabled())
                    ? Optional.of(TrustedAnswerErrorCode.ACTION_DISABLED)
                    : Optional.empty();
            default -> Optional.empty();
        };
    }

    private boolean requiresAsk(TrustedAnswerActionType actionType) {
        return actionType != TrustedAnswerActionType.DATA_INTERPRETATION
                && actionType != TrustedAnswerActionType.FORECAST;
    }

    private TrustedAnswerEndpointContractVO toVO(ContractDef contract) {
        TrustedAnswerEndpointContractVO vo = new TrustedAnswerEndpointContractVO();
        vo.setDataEaseEndpoint(contract.endpoint());
        vo.setMethod(contract.method());
        vo.setActionType(contract.actionType());
        vo.setRequiredSwitch(contract.requiredSwitch());
        vo.setSqlBotUpstream(contract.upstreamPattern());
        vo.setCapabilityCheck(contract.capabilityCheck());
        vo.setNegativeTest(contract.negativeTest());
        return vo;
    }

    private static ContractDef contract(
            String endpoint,
            String method,
            TrustedAnswerActionType actionType,
            TrustedAnswerSwitchKey requiredSwitch,
            String upstreamPattern,
            String capabilityCheck,
            String negativeTest
    ) {
        return new ContractDef(endpoint, method, actionType, requiredSwitch, upstreamPattern, capabilityCheck, negativeTest);
    }

    private String normalizePath(String path) {
        String normalized = StringUtils.defaultIfBlank(path, "/").trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        return URI.create("http://dataease.local" + normalized).getPath();
    }
}
```

- [ ] **Step 5: Wire route guard into SQLBot proxy**

Modify `TrustedAnswerStubSqlBotProxy` constructor and fields:

```java
private final TrustedAnswerActionContractService actionContractService;

public TrustedAnswerStubSqlBotProxy(SysParameterManage sysParameterManage) {
    this(sysParameterManage, new TrustedAnswerActionContractService());
}

public TrustedAnswerStubSqlBotProxy(
        SysParameterManage sysParameterManage,
        TrustedAnswerActionContractService actionContractService
) {
    this.sysParameterManage = sysParameterManage;
    this.actionContractService = actionContractService == null
            ? new TrustedAnswerActionContractService()
            : actionContractService;
}
```

Replace the body of `isAllowedRuntimeProxyPath`:

```java
private boolean isAllowedRuntimeProxyPath(String path) {
    return actionContractService.resolveSqlBotRuntime("POST", path).isPresent()
            || actionContractService.resolveSqlBotRuntime("GET", path).isPresent()
            || actionContractService.resolveSqlBotRuntime("DELETE", path).isPresent();
}
```

Then update `proxyRuntime` so it validates the actual request method:

```java
if (!RUNTIME_ALLOWED_METHODS.contains(method)
        || actionContractService.resolveSqlBotRuntime(method, path).isEmpty()) {
    DEException.throwException(TrustedAnswerErrorCode.UNMAPPED_SQLBOT_PROXY_PATH.toError().getMessage());
}
```

- [ ] **Step 6: Expose contracts endpoint**

Add dependency and endpoint to `AIQueryTrustedAnswerServer`:

```java
private final TrustedAnswerActionContractService actionContractService;
```

Use this constructor assignment:

```java
this.actionContractService = actionContractService;
```

Add endpoint:

```java
@GetMapping("/contracts")
public List<TrustedAnswerEndpointContractVO> contracts() {
    return actionContractService.contracts();
}
```

If existing tests instantiate the old constructor, add an overloaded constructor that passes `new TrustedAnswerActionContractService()`.

- [ ] **Step 7: Run tests and verify pass**

Run the Task 2 Maven command.

Expected: PASS for `TrustedAnswerActionContractServiceTest` and existing trusted-answer smoke tests.

- [ ] **Step 8: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerActionContractServiceTest.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimePolicyService.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerActionContractService.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java
git commit -m "feat: enforce trusted answer action contracts"
```

## Task 3: AuthorizedAskScope, Switch Enforcement, History Redaction, And Fact Boundary

**Files:**
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/AuthorizedAskScope.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerConversationContextService.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerFactBoundaryService.java`
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimeContextService.java`
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java`
- Modify: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerRuntimeContextServiceTest.java`

- [ ] **Step 1: Add failing runtime context tests**

Append to `TrustedAnswerRuntimeContextServiceTest`:

```java
@Test
void askDisabledShouldBlockBeforeThemeAndSchemaLookup() {
    TrustedAnswerTraceStore traceStore = new TrustedAnswerTraceStore();
    TrustedAnswerRuntimeContextService disabledService = new TrustedAnswerRuntimeContextService(
            aiQueryThemeManage,
            datasetSQLBotManage,
            traceStore,
            substituteDatasetExampleStore,
            new TrustedAnswerRuntimePolicyService(key -> "ai.query.ask_enabled".equals(key) ? "false" : "true"),
            new TrustedAnswerActionContractService(),
            new TrustedAnswerConversationContextService(),
            new TrustedAnswerFactBoundaryService()
    );

    TrustedAnswerRequest request = request(1001L, 21L);
    request.setActionType(TrustedAnswerActionType.BASIC_ASK);

    TrustedAnswerTraceVO trace = disabledService.buildTrace(request);

    assertEquals(TrustedAnswerState.NO_AUTHORIZED_CONTEXT, trace.getState());
    assertEquals("ASK_DISABLED", trace.getError().getCode());
    assertEquals(AuthorizedAskabilityState.ASK_BLOCKED, trace.getContext().getAskabilityState());
    assertTrue(trace.getPermissionSteps().contains("runtime-switch-blocked"));
}

@Test
void historyContextShouldNotCarryRawSqlOrHiddenFieldsAfterPermissionRebuild() {
    TrustedAnswerConversationContextService conversationService = new TrustedAnswerConversationContextService();
    AuthorizedAskScope scope = new AuthorizedAskScope();
    scope.setThemeId(1001L);
    scope.getVisibleFieldIds().add("amount");
    scope.getVisibleResourceIds().add("11");
    scope.setPermissionSummary("当前基于你有权限的数据生成");

    String redacted = conversationService.rebuildForSqlBot(
            scope,
            "上一轮 SQL: select hidden_salary from t_user; 隐藏字段 hidden_salary 的值是多少"
    );

    assertTrue(redacted.contains("当前基于你有权限的数据生成"));
    assertFalse(redacted.contains("select"));
    assertFalse(redacted.contains("hidden_salary"));
    assertFalse(redacted.contains("t_user"));
}

@Test
void sqlbotFactPayloadWithoutDataEaseResultMarkerShouldBeBlocked() {
    TrustedAnswerFactBoundaryService factBoundaryService = new TrustedAnswerFactBoundaryService();

    assertFalse(factBoundaryService.isFactPayloadAllowed(Map.of(
            "type", "chart-result",
            "content", "销售额为 100 万"
    )));
    assertTrue(factBoundaryService.isFactPayloadAllowed(Map.of(
            "type", "chart-result",
            "dataease_authorized_result", true,
            "content", "销售额为 100 万"
    )));
}
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn -DskipTests=false -Dmaven.test.skip=false -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest \
  -Dmaven.antrun.skip=true test
```

Expected: FAIL because the new constructor and services do not exist.

- [ ] **Step 3: Create `AuthorizedAskScope`**

```java
package io.dataease.ai.query.trusted;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AuthorizedAskScope {

    private Long themeId;
    private Long datasourceId;
    private final List<String> visibleThemeIds = new ArrayList<>();
    private final List<String> visibleResourceIds = new ArrayList<>();
    private final List<String> visibleFieldIds = new ArrayList<>();
    private final List<String> allowedActions = new ArrayList<>();
    private String rowPolicySummary;
    private String columnPolicySummary;
    private String permissionSummary;
    private String deniedReason;
}
```

- [ ] **Step 4: Create conversation redaction service**

```java
package io.dataease.ai.query.trusted;

import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class TrustedAnswerConversationContextService {

    private static final Pattern SQL_PATTERN = Pattern.compile("(?is)\\b(select|insert|update|delete|from|where|join)\\b[^。；;\\n]*");
    private static final Pattern PHYSICAL_IDENTIFIER_PATTERN = Pattern.compile("(?i)\\b[a-z0-9_]*_(salary|amount|user|order|customer|table|field)[a-z0-9_]*\\b");

    public String rebuildForSqlBot(AuthorizedAskScope scope, String previousText) {
        String safeText = StringUtils.defaultString(previousText);
        safeText = SQL_PATTERN.matcher(safeText).replaceAll("[已按当前权限移除历史执行细节]");
        safeText = PHYSICAL_IDENTIFIER_PATTERN.matcher(safeText).replaceAll("[已脱敏字段]");
        String permissionSummary = scope == null || StringUtils.isBlank(scope.getPermissionSummary())
                ? "当前基于你有权限的数据生成"
                : scope.getPermissionSummary();
        return permissionSummary + "。历史上下文已按当前权限重新裁剪。" + safeText;
    }
}
```

- [ ] **Step 5: Create fact boundary service**

```java
package io.dataease.ai.query.trusted;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class TrustedAnswerFactBoundaryService {

    public boolean isFactPayloadAllowed(Object payload) {
        if (!(payload instanceof Map<?, ?> map)) {
            return true;
        }
        Object type = map.get("type");
        boolean factType = "chart-result".equals(type)
                || "table-result".equals(type)
                || "answer".equals(type)
                || "sql".equals(type);
        if (!factType) {
            return true;
        }
        return Boolean.TRUE.equals(map.get("dataease_authorized_result"));
    }
}
```

- [ ] **Step 6: Add constructor overload and switch block to runtime context**

Add fields to `TrustedAnswerRuntimeContextService`:

```java
private final TrustedAnswerRuntimePolicyService runtimePolicyService;
private final TrustedAnswerActionContractService actionContractService;
private final TrustedAnswerConversationContextService conversationContextService;
private final TrustedAnswerFactBoundaryService factBoundaryService;
```

Update the existing constructor to delegate:

```java
public TrustedAnswerRuntimeContextService(
        AIQueryThemeManage aiQueryThemeManage,
        DatasetSQLBotManage datasetSQLBotManage,
        TrustedAnswerTraceStore traceStore,
        SubstituteDatasetExampleStore substituteDatasetExampleStore
) {
    this(
            aiQueryThemeManage,
            datasetSQLBotManage,
            traceStore,
            substituteDatasetExampleStore,
            new TrustedAnswerRuntimePolicyService((java.util.function.Function<String, String>) key -> null),
            new TrustedAnswerActionContractService(),
            new TrustedAnswerConversationContextService(),
            new TrustedAnswerFactBoundaryService()
    );
}
```

Add the full constructor used by tests and Spring:

```java
public TrustedAnswerRuntimeContextService(
        AIQueryThemeManage aiQueryThemeManage,
        DatasetSQLBotManage datasetSQLBotManage,
        TrustedAnswerTraceStore traceStore,
        SubstituteDatasetExampleStore substituteDatasetExampleStore,
        TrustedAnswerRuntimePolicyService runtimePolicyService,
        TrustedAnswerActionContractService actionContractService,
        TrustedAnswerConversationContextService conversationContextService,
        TrustedAnswerFactBoundaryService factBoundaryService
) {
    this.aiQueryThemeManage = aiQueryThemeManage;
    this.datasetSQLBotManage = datasetSQLBotManage;
    this.traceStore = traceStore;
    this.substituteDatasetExampleStore = substituteDatasetExampleStore;
    this.runtimePolicyService = runtimePolicyService;
    this.actionContractService = actionContractService;
    this.conversationContextService = conversationContextService;
    this.factBoundaryService = factBoundaryService;
}
```

At the start of `buildTrace`, immediately after `trace.setContext(context);`, add:

```java
var policy = runtimePolicyService.load();
context.setRuntimePolicy(policy);
TrustedAnswerActionType actionType = request == null || request.getActionType() == null
        ? TrustedAnswerActionType.BASIC_ASK
        : request.getActionType();
context.setActionType(actionType);
if (request != null) {
    context.setEntryScene(request.getEntryScene());
    context.setResourceKind(request.getResourceKind());
    context.setResourceId(request.getResourceId());
    trace.setSourceTraceId(request.getSourceTraceId());
    trace.setParentTraceId(request.getParentTraceId());
}
var disabledError = actionContractService.disabledError(actionType, policy);
if (disabledError.isPresent()) {
    context.setAskabilityState(AuthorizedAskabilityState.ASK_BLOCKED);
    trace.setBlockedReason(disabledError.get().name());
    trace.getPermissionSteps().add("runtime-switch-blocked");
    return completeWithError(trace, disabledError.get());
}
```

When schema is visible and before `trace.setState(TrustedAnswerState.TRUSTED);`, add:

```java
context.setAskabilityState(AuthorizedAskabilityState.ASK_ALLOWED);
context.setReadinessState(ResourceReadinessState.FORMAL_ASKABLE);
trace.setUserSafeEvidenceSummary("基于" + context.getThemeName() + "，已按当前权限裁剪资源、字段和行权限。");
```

- [ ] **Step 7: Block SQLBot factual events without DataEase marker**

In `TrustedAnswerStubSqlBotProxy`, add field:

```java
private final TrustedAnswerFactBoundaryService factBoundaryService = new TrustedAnswerFactBoundaryService();
```

In `forwardSqlBotSseBlock`, after parsing the SQLBot event object and before writing it, replace:

```java
data.put("sqlbot_event", objectMapper.readValue(dataLine, Object.class));
```

with:

```java
Object sqlbotEvent = objectMapper.readValue(dataLine, Object.class);
if (!factBoundaryService.isFactPayloadAllowed(sqlbotEvent)) {
    writeSqlBotError(response, trace, TrustedAnswerErrorCode.FACT_RESULT_REQUIRED.toError().getMessage());
    return;
}
data.put("sqlbot_event", sqlbotEvent);
```

- [ ] **Step 8: Run tests and verify pass**

Run the Task 3 Maven command.

Expected: PASS for `TrustedAnswerRuntimeContextServiceTest`.

- [ ] **Step 9: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/AuthorizedAskScope.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerConversationContextService.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerFactBoundaryService.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimeContextService.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerRuntimeContextServiceTest.java
git commit -m "feat: enforce authorized ask scope before sqlbot"
```

## Task 4: Deterministic ResourceReadiness And AuthorizedAskability

**Files:**
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerResourceReadinessServiceTest.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerResourceReadinessService.java`
- Modify: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningResourceVO.java`
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java`
- Modify: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java`

- [ ] **Step 1: Write failing readiness tests**

Create `TrustedAnswerResourceReadinessServiceTest.java`:

```java
package io.dataease.ai.query;

import io.dataease.ai.query.trusted.TrustedAnswerResourceReadinessService;
import io.dataease.api.ai.query.vo.AIQueryLearningResourceVO;
import io.dataease.api.ai.query.vo.ResourceReadinessState;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TrustedAnswerResourceReadinessServiceTest {

    private final TrustedAnswerResourceReadinessService service = new TrustedAnswerResourceReadinessService();

    @Test
    void disabledOrNoFieldsShouldBeNotAskable() {
        AIQueryLearningResourceVO resource = resource("succeeded", 95, 3, 0, 0, 0);
        resource.setEnabled(false);

        assertEquals(ResourceReadinessState.NOT_ASKABLE, service.evaluate(resource).state());

        AIQueryLearningResourceVO noFields = resource("succeeded", 95, 3, 0, 0, 0);
        noFields.setFieldCount(0);

        assertEquals(ResourceReadinessState.NOT_ASKABLE, service.evaluate(noFields).state());
    }

    @Test
    void learnedWithoutRecommendationsShouldNotBecomeFormalAskable() {
        AIQueryLearningResourceVO resource = resource("succeeded", 90, 0, 0, 0, 0);

        assertEquals(ResourceReadinessState.TRIAL_ASKABLE, service.evaluate(resource).state());
    }

    @Test
    void lowScoreOrFailureShouldNeedOptimization() {
        assertEquals(ResourceReadinessState.NEEDS_OPTIMIZATION, service.evaluate(resource("succeeded", 49, 3, 0, 0, 0)).state());
        assertEquals(ResourceReadinessState.NEEDS_OPTIMIZATION, service.evaluate(resource("failed", 70, 3, 0, 0, 0)).state());
        assertEquals(ResourceReadinessState.NEEDS_OPTIMIZATION, service.evaluate(resource("succeeded", 90, 3, 10, 0, 0)).state());
        assertEquals(ResourceReadinessState.NEEDS_OPTIMIZATION, service.evaluate(resource("succeeded", 90, 3, 0, 20, 0)).state());
        assertEquals(ResourceReadinessState.NEEDS_OPTIMIZATION, service.evaluate(resource("succeeded", 90, 3, 0, 0, 15)).state());
    }

    @Test
    void highQualityLearnedResourceShouldBecomeFormalAskable() {
        assertEquals(ResourceReadinessState.FORMAL_ASKABLE, service.evaluate(resource("succeeded", 90, 3, 0, 0, 0)).state());
    }

    private static AIQueryLearningResourceVO resource(
            String status,
            int score,
            int recommendationCount,
            int failureRate,
            int negativeFeedbackRate,
            int ambiguityRate
    ) {
        AIQueryLearningResourceVO resource = new AIQueryLearningResourceVO();
        resource.setResourceId("resource-1");
        resource.setName("销售资源");
        resource.setEnabled(true);
        resource.setThemeBound(true);
        resource.setFieldCount(8);
        resource.setLearningStatus(status);
        resource.setQualityScore(score);
        resource.setRecommendationCount(recommendationCount);
        resource.setFailureRate30d(failureRate);
        resource.setNegativeFeedbackRate30d(negativeFeedbackRate);
        resource.setAmbiguityRate30d(ambiguityRate);
        return resource;
    }
}
```

- [ ] **Step 2: Run tests and verify fail**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn -DskipTests=false -Dmaven.test.skip=false -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerResourceReadinessServiceTest \
  -Dmaven.antrun.skip=true test
```

Expected: FAIL because new fields/service do not exist.

- [ ] **Step 3: Add learning resource fields**

Add these fields to `AIQueryLearningResourceVO.java`:

```java
private Boolean enabled = true;

private Boolean themeBound = true;

private Integer fieldCount = 0;

private Integer recommendationCount = 0;

private Integer failureRate30d = 0;

private Integer negativeFeedbackRate30d = 0;

private Integer ambiguityRate30d = 0;

private ResourceReadinessState readinessState;

private AuthorizedAskabilityState askabilityState;
```

- [ ] **Step 4: Implement readiness service**

Create `TrustedAnswerResourceReadinessService.java`:

```java
package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.AIQueryLearningResourceVO;
import io.dataease.api.ai.query.vo.ResourceReadinessState;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

@Service
public class TrustedAnswerResourceReadinessService {

    public record Evaluation(ResourceReadinessState state, int score, String reason) {
    }

    public Evaluation evaluate(AIQueryLearningResourceVO resource) {
        if (resource == null) {
            return new Evaluation(ResourceReadinessState.NOT_ASKABLE, 0, "resource missing");
        }
        int score = number(resource.getQualityScore());
        if (Boolean.FALSE.equals(resource.getEnabled())
                || !Boolean.TRUE.equals(resource.getThemeBound())
                || number(resource.getFieldCount()) <= 0) {
            return new Evaluation(ResourceReadinessState.NOT_ASKABLE, score, "disabled, no theme, or no fields");
        }
        if (StringUtils.equalsIgnoreCase(resource.getLearningStatus(), "failed")
                || score < 50
                || number(resource.getFailureRate30d()) >= 10
                || number(resource.getNegativeFeedbackRate30d()) >= 20
                || number(resource.getAmbiguityRate30d()) >= 15) {
            return new Evaluation(ResourceReadinessState.NEEDS_OPTIMIZATION, score, "learning or 30d quality risk");
        }
        if (StringUtils.equalsIgnoreCase(resource.getLearningStatus(), "succeeded")
                && number(resource.getRecommendationCount()) > 0
                && score >= 80
                && number(resource.getFailureRate30d()) < 10) {
            return new Evaluation(ResourceReadinessState.FORMAL_ASKABLE, score, "formal askable");
        }
        return new Evaluation(ResourceReadinessState.TRIAL_ASKABLE, score, "trial askable");
    }

    private int number(Integer value) {
        return value == null ? 0 : value;
    }
}
```

- [ ] **Step 5: Normalize readiness fields in theme manage**

In `AIQueryThemeManage.toLearningResourceVO`, after existing setters, add:

```java
resource.setEnabled(Optional.ofNullable(toBooleanValue(firstValue(payload, "enabled"))).orElse(true));
resource.setThemeBound(Optional.ofNullable(toBooleanValue(firstValue(payload, "theme_bound", "themeBound"))).orElse(true));
resource.setFieldCount(Optional.ofNullable(toIntegerValue(firstValue(payload, "field_count", "fieldCount"))).orElse(0));
resource.setRecommendationCount(Optional.ofNullable(toIntegerValue(firstValue(payload, "recommendation_count", "recommendationCount"))).orElse(0));
resource.setFailureRate30d(Optional.ofNullable(toIntegerValue(firstValue(payload, "failure_rate_30d", "failureRate30d"))).orElse(0));
resource.setNegativeFeedbackRate30d(Optional.ofNullable(toIntegerValue(firstValue(payload, "negative_feedback_rate_30d", "negativeFeedbackRate30d"))).orElse(0));
resource.setAmbiguityRate30d(Optional.ofNullable(toIntegerValue(firstValue(payload, "ambiguity_rate_30d", "ambiguityRate30d"))).orElse(0));
resource.setReadinessState(new TrustedAnswerResourceReadinessService().evaluate(resource).state());
```

Add import:

```java
import io.dataease.ai.query.trusted.TrustedAnswerResourceReadinessService;
```

- [ ] **Step 6: Add contract smoke assertion**

In `AIQueryResourceLearningContractSmokeTest.learningContractsShouldExist`, after `resource.setLearningStatus("succeeded");`, add:

```java
resource.setFieldCount(8);
resource.setRecommendationCount(3);
resource.setReadinessState(ResourceReadinessState.FORMAL_ASKABLE);
```

Add assertions:

```java
assertTrue(resourceJson.contains("\"fieldCount\":8"));
assertTrue(resourceJson.contains("\"recommendationCount\":3"));
assertTrue(resourceJson.contains("\"readinessState\":\"FORMAL_ASKABLE\""));
```

- [ ] **Step 7: Run tests and verify pass**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn -DskipTests=false -Dmaven.test.skip=false -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerResourceReadinessServiceTest,io.dataease.ai.query.AIQueryResourceLearningContractSmokeTest \
  -Dmaven.antrun.skip=true test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerResourceReadinessServiceTest.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerResourceReadinessService.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryLearningResourceVO.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java
git commit -m "feat: compute smart query resource readiness"
```

## Task 5: Sensitive CorrectionTodo Redaction, Fingerprint, Retention Defaults

**Files:**
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerSensitivePayloadServiceTest.java`
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerCorrectionTodoServiceTest.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerSensitivePayloadService.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerCorrectionTodoService.java`
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java`
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerOpsService.java`

- [ ] **Step 1: Write failing sensitive payload tests**

Create `TrustedAnswerSensitivePayloadServiceTest.java`:

```java
package io.dataease.ai.query;

import io.dataease.ai.query.trusted.TrustedAnswerSensitivePayloadService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrustedAnswerSensitivePayloadServiceTest {

    private final TrustedAnswerSensitivePayloadService service = new TrustedAnswerSensitivePayloadService("unit-test-secret");

    @Test
    void redactionShouldRemoveCommonBusinessSensitiveValues() {
        String raw = "客户张三 手机13812345678 邮箱a@b.com 订单ORD-20260504 金额12345.67 合同HT-9";

        String redacted = service.redact(raw);

        assertFalse(redacted.contains("张三"));
        assertFalse(redacted.contains("13812345678"));
        assertFalse(redacted.contains("a@b.com"));
        assertFalse(redacted.contains("ORD-20260504"));
        assertFalse(redacted.contains("12345.67"));
        assertFalse(redacted.contains("HT-9"));
        assertTrue(redacted.contains("[姓名]"));
        assertTrue(redacted.contains("[手机号]"));
        assertTrue(redacted.contains("[邮箱]"));
    }

    @Test
    void fingerprintShouldBeTenantScopedAndStable() {
        String left = service.fingerprint("tenant-a", "workspace-a", "theme-1", "resource-1", "FIELD_AMBIGUOUS", "客户张三的销售额");
        String same = service.fingerprint("tenant-a", "workspace-a", "theme-1", "resource-1", "FIELD_AMBIGUOUS", "客户张三的销售额");
        String otherTenant = service.fingerprint("tenant-b", "workspace-a", "theme-1", "resource-1", "FIELD_AMBIGUOUS", "客户张三的销售额");

        assertEquals(left, same);
        assertNotEquals(left, otherTenant);
        assertTrue(left.startsWith("sha256:"));
        assertFalse(left.contains("张三"));
    }

    @Test
    void retentionDefaultsShouldBeConcrete() {
        assertEquals(180, service.restrictedPayloadRetentionDays());
        assertEquals(365, service.todoSummaryRetentionDays());
    }
}
```

Create `TrustedAnswerCorrectionTodoServiceTest.java`:

```java
package io.dataease.ai.query;

import io.dataease.ai.query.trusted.TrustedAnswerCorrectionTodoService;
import io.dataease.ai.query.trusted.TrustedAnswerSensitivePayloadService;
import io.dataease.api.ai.query.request.TrustedAnswerCorrectionFeedbackRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerCorrectionTodoVO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrustedAnswerCorrectionTodoServiceTest {

    @Test
    void duplicateFeedbackShouldAggregateByTenantScopedFingerprint() {
        TrustedAnswerCorrectionTodoService service = new TrustedAnswerCorrectionTodoService(
                new TrustedAnswerSensitivePayloadService("unit-test-secret")
        );

        TrustedAnswerCorrectionFeedbackRequest request = new TrustedAnswerCorrectionFeedbackRequest();
        request.setThemeId("1001");
        request.setResourceId("11");
        request.setDiagnosisType("FIELD_AMBIGUOUS");
        request.setQuestionText("客户张三手机号13812345678销售额是多少");
        request.setFeedbackText("字段理解错");

        TrustedAnswerCorrectionTodoVO first = service.create("tenant-a", "workspace-a", "submitter", request);
        TrustedAnswerCorrectionTodoVO second = service.create("tenant-a", "workspace-a", "submitter", request);
        List<TrustedAnswerCorrectionTodoVO> todos = service.listForRole("resource_owner");

        assertEquals(first.getTodoId(), second.getTodoId());
        assertEquals(2, second.getImpactCount());
        assertEquals(1, todos.size());
        assertFalse(todos.get(0).getSanitizedQuestionSummary().contains("13812345678"));
        assertEquals(Boolean.FALSE, todos.get(0).getRestrictedPayloadVisible());
    }

    @Test
    void restrictedPayloadShouldOnlyBeVisibleToDiagnosisRole() {
        TrustedAnswerCorrectionTodoService service = new TrustedAnswerCorrectionTodoService(
                new TrustedAnswerSensitivePayloadService("unit-test-secret")
        );
        TrustedAnswerCorrectionFeedbackRequest request = new TrustedAnswerCorrectionFeedbackRequest();
        request.setThemeId("1001");
        request.setResourceId("11");
        request.setDiagnosisType("FIELD_AMBIGUOUS");
        request.setQuestionText("客户张三的销售额");

        service.create("tenant-a", "workspace-a", "submitter", request);

        assertEquals(Boolean.FALSE, service.listForRole("resource_owner").get(0).getRestrictedPayloadVisible());
        assertEquals(Boolean.TRUE, service.listForRole("diagnosis_operator").get(0).getRestrictedPayloadVisible());
        assertTrue(service.listForRole("diagnosis_operator").get(0).getSanitizedQuestionSummary().contains("[姓名]"));
    }
}
```

- [ ] **Step 2: Run tests and verify fail**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn -DskipTests=false -Dmaven.test.skip=false -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerSensitivePayloadServiceTest,io.dataease.ai.query.TrustedAnswerCorrectionTodoServiceTest \
  -Dmaven.antrun.skip=true test
```

Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement sensitive payload service**

Create `TrustedAnswerSensitivePayloadService.java`:

```java
package io.dataease.ai.query.trusted;

import org.apache.commons.codec.digest.HmacAlgorithms;
import org.apache.commons.codec.digest.HmacUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class TrustedAnswerSensitivePayloadService {

    private static final Pattern PHONE = Pattern.compile("1[3-9]\\d{9}");
    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    private static final Pattern ID_CARD = Pattern.compile("\\b\\d{15}(\\d{2}[0-9Xx])?\\b");
    private static final Pattern ORDER = Pattern.compile("\\b(ORD|ORDER|HT|CONTRACT|CUST|客户编号|订单号|合同号)[A-Za-z0-9\\-]{2,}\\b");
    private static final Pattern MONEY = Pattern.compile("\\b\\d{4,}(\\.\\d{1,2})?\\b");
    private static final Pattern CHINESE_NAME = Pattern.compile("客户[\\u4e00-\\u9fa5]{2,4}");

    private final String secret;

    public TrustedAnswerSensitivePayloadService() {
        this("dataease-default-local-secret");
    }

    public TrustedAnswerSensitivePayloadService(String secret) {
        this.secret = StringUtils.defaultIfBlank(secret, "dataease-default-local-secret");
    }

    public String redact(String raw) {
        String result = StringUtils.defaultString(raw);
        result = PHONE.matcher(result).replaceAll("[手机号]");
        result = EMAIL.matcher(result).replaceAll("[邮箱]");
        result = ID_CARD.matcher(result).replaceAll("[证件号]");
        result = ORDER.matcher(result).replaceAll("[业务编号]");
        result = MONEY.matcher(result).replaceAll("[金额]");
        result = CHINESE_NAME.matcher(result).replaceAll("客户[姓名]");
        return result;
    }

    public String fingerprint(
            String tenantId,
            String workspaceId,
            String themeId,
            String resourceId,
            String diagnosisType,
            String question
    ) {
        String normalized = String.join("|",
                StringUtils.defaultString(tenantId),
                StringUtils.defaultString(workspaceId),
                StringUtils.defaultString(themeId),
                StringUtils.defaultString(resourceId),
                StringUtils.defaultString(diagnosisType),
                redact(question).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim()
        );
        byte[] digest = new HmacUtils(HmacAlgorithms.HMAC_SHA_256, secret.getBytes(StandardCharsets.UTF_8))
                .hmac(normalized);
        return "sha256:" + org.apache.commons.codec.binary.Hex.encodeHexString(digest);
    }

    public int restrictedPayloadRetentionDays() {
        return 180;
    }

    public int todoSummaryRetentionDays() {
        return 365;
    }
}
```

- [ ] **Step 4: Implement correction todo service**

Create `TrustedAnswerCorrectionTodoService.java`:

```java
package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.request.TrustedAnswerCorrectionFeedbackRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerCorrectionTodoVO;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TrustedAnswerCorrectionTodoService {

    private final TrustedAnswerSensitivePayloadService sensitivePayloadService;
    private final Map<String, TrustedAnswerCorrectionTodoVO> todosByFingerprint = new LinkedHashMap<>();

    public TrustedAnswerCorrectionTodoService(TrustedAnswerSensitivePayloadService sensitivePayloadService) {
        this.sensitivePayloadService = sensitivePayloadService == null
                ? new TrustedAnswerSensitivePayloadService()
                : sensitivePayloadService;
    }

    public synchronized TrustedAnswerCorrectionTodoVO create(
            String tenantId,
            String workspaceId,
            String submitter,
            TrustedAnswerCorrectionFeedbackRequest request
    ) {
        String fingerprint = sensitivePayloadService.fingerprint(
                tenantId,
                workspaceId,
                request.getThemeId(),
                request.getResourceId(),
                request.getDiagnosisType(),
                request.getQuestionText()
        );
        TrustedAnswerCorrectionTodoVO existing = todosByFingerprint.get(fingerprint);
        if (existing != null) {
            existing.setImpactCount(existing.getImpactCount() + 1);
            return existing;
        }

        TrustedAnswerCorrectionTodoVO todo = new TrustedAnswerCorrectionTodoVO();
        todo.setTodoId("todo-" + UUID.randomUUID());
        todo.setTenantId(tenantId);
        todo.setWorkspaceId(workspaceId);
        todo.setThemeId(request.getThemeId());
        todo.setResourceId(request.getResourceId());
        todo.setDiagnosisType(StringUtils.defaultIfBlank(request.getDiagnosisType(), "USER_FEEDBACK"));
        todo.setSanitizedQuestionSummary(sensitivePayloadService.redact(request.getQuestionText()));
        todo.setDuplicateFingerprint(fingerprint);
        todo.setStatus("PENDING");
        todo.setSeverity("P1");
        todo.setImpactCount(1);
        todo.setRestrictedPayloadVisible(false);
        todosByFingerprint.put(fingerprint, todo);
        return todo;
    }

    public synchronized List<TrustedAnswerCorrectionTodoVO> listForRole(String role) {
        boolean diagnosis = "diagnosis_operator".equals(role);
        return todosByFingerprint.values().stream()
                .map(item -> copyForVisibility(item, diagnosis))
                .toList();
    }

    private TrustedAnswerCorrectionTodoVO copyForVisibility(TrustedAnswerCorrectionTodoVO source, boolean restrictedVisible) {
        TrustedAnswerCorrectionTodoVO copy = new TrustedAnswerCorrectionTodoVO();
        copy.setTodoId(source.getTodoId());
        copy.setTenantId(source.getTenantId());
        copy.setWorkspaceId(source.getWorkspaceId());
        copy.setThemeId(source.getThemeId());
        copy.setResourceId(source.getResourceId());
        copy.setDiagnosisType(source.getDiagnosisType());
        copy.setSanitizedQuestionSummary(source.getSanitizedQuestionSummary());
        copy.setDuplicateFingerprint(source.getDuplicateFingerprint());
        copy.setStatus(source.getStatus());
        copy.setSeverity(source.getSeverity());
        copy.setImpactCount(source.getImpactCount());
        copy.setRestrictedPayloadVisible(restrictedVisible);
        copy.setLinkedKnowledgeId(source.getLinkedKnowledgeId());
        copy.setLinkedRelearningJobId(source.getLinkedRelearningJobId());
        return copy;
    }
}
```

- [ ] **Step 5: Add correction endpoints**

In `AIQueryTrustedAnswerServer`, add field and constructor assignment:

```java
private final TrustedAnswerCorrectionTodoService correctionTodoService;
```

Add endpoint methods:

```java
@PostMapping("/correction-todos")
public TrustedAnswerCorrectionTodoVO createCorrectionTodo(
        @RequestBody TrustedAnswerCorrectionFeedbackRequest request
) {
    return correctionTodoService.create("default-tenant", "default-workspace", "current-user", request);
}

@GetMapping("/correction-todos")
public List<TrustedAnswerCorrectionTodoVO> correctionTodos() {
    return correctionTodoService.listForRole("resource_owner");
}
```

Add imports for request/VO classes.

- [ ] **Step 6: Feed correction todos into ops repair queue**

Modify `TrustedAnswerOpsService` constructor to accept optional `TrustedAnswerCorrectionTodoService`, and add correction items after existing trace items:

```java
private final TrustedAnswerCorrectionTodoService correctionTodoService;

public TrustedAnswerOpsService(TrustedAnswerTraceStore traceStore) {
    this(traceStore, new TrustedAnswerCorrectionTodoService(new TrustedAnswerSensitivePayloadService()));
}

public TrustedAnswerOpsService(
        TrustedAnswerTraceStore traceStore,
        TrustedAnswerCorrectionTodoService correctionTodoService
) {
    this.traceStore = traceStore;
    this.correctionTodoService = correctionTodoService;
}
```

Then keep existing `repairQueue` behavior and add a separate method:

```java
public List<TrustedAnswerCorrectionTodoVO> correctionTodos() {
    return correctionTodoService.listForRole("resource_owner");
}
```

- [ ] **Step 7: Run tests and verify pass**

Run the Task 5 Maven command.

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerSensitivePayloadServiceTest.java \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerCorrectionTodoServiceTest.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerSensitivePayloadService.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerCorrectionTodoService.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerOpsService.java
git commit -m "feat: add sensitive correction todo queue"
```

## Task 6: Semantic Patch RBAC, Audit, Disable, Unpublish, Rollback

**Files:**
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerSemanticPatchServiceTest.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerSemanticPatchService.java`
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java`
- Modify: `dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java`

- [ ] **Step 1: Write failing semantic patch tests**

Create `TrustedAnswerSemanticPatchServiceTest.java`:

```java
package io.dataease.ai.query;

import io.dataease.ai.query.trusted.TrustedAnswerSemanticPatchService;
import io.dataease.api.ai.query.request.TrustedAnswerSemanticPatchRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerSemanticPatchVO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrustedAnswerSemanticPatchServiceTest {

    @Test
    void resourceOwnerCanDraftButCannotPublishGlobalPatch() {
        TrustedAnswerSemanticPatchService service = new TrustedAnswerSemanticPatchService();
        TrustedAnswerSemanticPatchRequest draft = request("resource_owner", "resource", "FIELD_ALIAS", "draft");

        TrustedAnswerSemanticPatchVO patch = service.apply(draft);

        assertEquals("DRAFT", patch.getStatus());
        assertThrows(IllegalArgumentException.class, () ->
                service.apply(request("resource_owner", "global", "BUSINESS_RULE", "publish"))
        );
    }

    @Test
    void semanticPublisherCanPublishDisableUnpublishAndRollback() {
        TrustedAnswerSemanticPatchService service = new TrustedAnswerSemanticPatchService();
        TrustedAnswerSemanticPatchVO draft = service.apply(request("semantic_publisher", "theme", "TERM", "draft"));

        TrustedAnswerSemanticPatchRequest publish = request("semantic_publisher", "theme", "TERM", "publish");
        publish.setPatchId(draft.getPatchId());
        TrustedAnswerSemanticPatchVO published = service.apply(publish);

        TrustedAnswerSemanticPatchRequest disable = request("semantic_publisher", "theme", "TERM", "disable");
        disable.setPatchId(published.getPatchId());
        TrustedAnswerSemanticPatchVO disabled = service.apply(disable);

        TrustedAnswerSemanticPatchRequest unpublish = request("semantic_publisher", "theme", "TERM", "unpublish");
        unpublish.setPatchId(published.getPatchId());
        TrustedAnswerSemanticPatchVO unpublished = service.apply(unpublish);

        TrustedAnswerSemanticPatchRequest rollback = request("semantic_publisher", "theme", "TERM", "rollback");
        rollback.setPatchId(published.getPatchId());
        rollback.setPreviousPatchId("patch-previous");
        TrustedAnswerSemanticPatchVO rolledBack = service.apply(rollback);

        assertEquals("PUBLISHED", published.getStatus());
        assertEquals("DISABLED", disabled.getStatus());
        assertEquals("UNPUBLISHED", unpublished.getStatus());
        assertEquals("ROLLED_BACK", rolledBack.getStatus());
        assertEquals("patch-previous", rolledBack.getRollbackToPatchId());
        assertTrue(rolledBack.getAuditEventNo().startsWith("audit-"));
    }

    private static TrustedAnswerSemanticPatchRequest request(
            String role,
            String scope,
            String patchType,
            String operation
    ) {
        TrustedAnswerSemanticPatchRequest request = new TrustedAnswerSemanticPatchRequest();
        request.setActorRole(role);
        request.setScope(scope);
        request.setPatchType(patchType);
        request.setOperation(operation);
        request.setTodoId("todo-1");
        request.setContent("销售额 = 成交金额");
        return request;
    }
}
```

- [ ] **Step 2: Run tests and verify fail**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn -DskipTests=false -Dmaven.test.skip=false -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerSemanticPatchServiceTest \
  -Dmaven.antrun.skip=true test
```

Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement semantic patch service**

Create `TrustedAnswerSemanticPatchService.java`:

```java
package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.request.TrustedAnswerSemanticPatchRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerSemanticPatchVO;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class TrustedAnswerSemanticPatchService {

    private final Map<String, TrustedAnswerSemanticPatchVO> patches = new LinkedHashMap<>();

    public synchronized TrustedAnswerSemanticPatchVO apply(TrustedAnswerSemanticPatchRequest request) {
        validateRole(request);
        String operation = StringUtils.defaultIfBlank(request.getOperation(), "draft").toLowerCase();
        return switch (operation) {
            case "draft" -> draft(request);
            case "publish" -> transition(request, "PUBLISHED");
            case "disable" -> transition(request, "DISABLED");
            case "unpublish" -> transition(request, "UNPUBLISHED");
            case "rollback" -> rollback(request);
            default -> throw new IllegalArgumentException("unsupported semantic patch operation");
        };
    }

    private TrustedAnswerSemanticPatchVO draft(TrustedAnswerSemanticPatchRequest request) {
        TrustedAnswerSemanticPatchVO patch = new TrustedAnswerSemanticPatchVO();
        patch.setPatchId("patch-" + UUID.randomUUID());
        patch.setScope(request.getScope());
        patch.setPatchType(request.getPatchType());
        patch.setStatus("DRAFT");
        patch.setSourceTodoId(request.getTodoId());
        patch.setAuditEventNo(auditNo());
        patches.put(patch.getPatchId(), patch);
        return patch;
    }

    private TrustedAnswerSemanticPatchVO transition(TrustedAnswerSemanticPatchRequest request, String status) {
        TrustedAnswerSemanticPatchVO patch = patches.get(request.getPatchId());
        if (patch == null) {
            throw new IllegalArgumentException("semantic patch not found");
        }
        patch.setStatus(status);
        patch.setAuditEventNo(auditNo());
        return patch;
    }

    private TrustedAnswerSemanticPatchVO rollback(TrustedAnswerSemanticPatchRequest request) {
        TrustedAnswerSemanticPatchVO patch = transition(request, "ROLLED_BACK");
        patch.setRollbackToPatchId(request.getPreviousPatchId());
        return patch;
    }

    private void validateRole(TrustedAnswerSemanticPatchRequest request) {
        String role = StringUtils.defaultString(request.getActorRole());
        String operation = StringUtils.defaultIfBlank(request.getOperation(), "draft").toLowerCase();
        String scope = StringUtils.defaultString(request.getScope());
        if ("global".equals(scope) && !"org_admin".equals(role) && !"semantic_publisher".equals(role)) {
            throw new IllegalArgumentException("global semantic patch requires elevated role");
        }
        if (("publish".equals(operation) || "disable".equals(operation) || "unpublish".equals(operation) || "rollback".equals(operation))
                && !"semantic_publisher".equals(role)
                && !"org_admin".equals(role)
                && !"theme_admin".equals(role)) {
            throw new IllegalArgumentException("semantic patch publish operation requires publisher role");
        }
    }

    private String auditNo() {
        return "audit-" + UUID.randomUUID();
    }
}
```

- [ ] **Step 4: Add semantic patch endpoint**

In `AIQueryTrustedAnswerServer`, add field and constructor assignment:

```java
private final TrustedAnswerSemanticPatchService semanticPatchService;
```

Add endpoint:

```java
@PostMapping("/semantic-patches")
public TrustedAnswerSemanticPatchVO applySemanticPatch(
        @RequestBody TrustedAnswerSemanticPatchRequest request
) {
    return semanticPatchService.apply(request);
}
```

- [ ] **Step 5: Add resource learning smoke coverage**

In `AIQueryResourceLearningContractSmokeTest.learningContractsShouldExist`, create:

```java
TrustedAnswerSemanticPatchVO semanticPatch = new TrustedAnswerSemanticPatchVO();
semanticPatch.setPatchId("patch-1");
semanticPatch.setStatus("PUBLISHED");
semanticPatch.setAuditEventNo("audit-1");
semanticPatch.setRollbackToPatchId("patch-0");
```

Then assert:

```java
String semanticPatchJson = objectMapper.writeValueAsString(semanticPatch);
assertTrue(semanticPatchJson.contains("\"patch_id\":\"patch-1\""));
assertTrue(semanticPatchJson.contains("\"status\":\"PUBLISHED\""));
assertTrue(semanticPatchJson.contains("\"audit_event_no\":\"audit-1\""));
assertTrue(semanticPatchJson.contains("\"rollback_to_patch_id\":\"patch-0\""));
```

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn -DskipTests=false -Dmaven.test.skip=false -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerSemanticPatchServiceTest,io.dataease.ai.query.AIQueryResourceLearningContractSmokeTest \
  -Dmaven.antrun.skip=true test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerSemanticPatchServiceTest.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerSemanticPatchService.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryResourceLearningContractSmokeTest.java
git commit -m "feat: add semantic correction patch lifecycle"
```

## Task 7: Frontend API Contracts For Accuracy Loop

**Files:**
- Modify: `dataease/core/core-frontend/src/api/aiTrustedAnswer.ts`
- Modify: `dataease/core/core-frontend/src/api/queryResourceLearning.ts`
- Create: `dataease/core/core-frontend/src/views/system/query-config/__tests__/smart-query-accuracy-loop-contract.spec.ts`

- [ ] **Step 1: Write failing frontend contract**

Create `smart-query-accuracy-loop-contract.spec.ts`:

```ts
type ContractCase = {
  name: string
  run: () => void
}

declare const process:
  | {
      env?: Record<string, string | undefined>
      exitCode?: number
    }
  | undefined
declare const require: any

const fs = require('fs')
const path = require('path')

const readSource = (relativePath: string): string => {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

const fail = (message: string): never => {
  throw new Error(message)
}

const assertMatch = (source: string, pattern: RegExp, label: string) => {
  if (!pattern.test(source)) {
    fail(`${label}: expected source to match ${pattern}`)
  }
}

const trustedAnswerSource = readSource('src/api/aiTrustedAnswer.ts')
const learningSource = readSource('src/api/queryResourceLearning.ts')
const themeSource = readSource('src/views/visualized/data/query-theme/index.vue')
const resourceSource = readSource('src/views/system/query-config/QueryResourcePrototype.vue')

const contractCases: ContractCase[] = [
  {
    name: 'trusted answer api exposes action contracts and policy wrappers',
    run() {
      assertMatch(trustedAnswerSource, /export type TrustedAnswerActionType =/, 'action type union')
      assertMatch(trustedAnswerSource, /listTrustedAnswerContracts/, 'contracts wrapper')
      assertMatch(trustedAnswerSource, /createTrustedAnswerCorrectionTodo/, 'correction todo wrapper')
      assertMatch(trustedAnswerSource, /applyTrustedAnswerSemanticPatch/, 'semantic patch wrapper')
      assertMatch(trustedAnswerSource, /\/ai\/query\/trusted-answer\/contracts/, 'contracts endpoint')
      assertMatch(trustedAnswerSource, /\/ai\/query\/trusted-answer\/correction-todos/, 'correction endpoint')
      assertMatch(trustedAnswerSource, /\/ai\/query\/trusted-answer\/semantic-patches/, 'semantic patch endpoint')
    }
  },
  {
    name: 'trusted answer stream sends action and entry fields',
    run() {
      assertMatch(trustedAnswerSource, /action_type\?: TrustedAnswerActionType/, 'request action field')
      assertMatch(trustedAnswerSource, /entry_scene\?: string/, 'request entry scene field')
      assertMatch(trustedAnswerSource, /resource_kind\?: string/, 'request resource kind field')
      assertMatch(trustedAnswerSource, /source_trace_id\?: string/, 'request source trace field')
    }
  },
  {
    name: 'query resource learning exposes readiness and askability fields',
    run() {
      assertMatch(learningSource, /readinessState\?: string/, 'readiness field')
      assertMatch(learningSource, /askabilityState\?: string/, 'askability field')
      assertMatch(learningSource, /recommendationCount\?: number/, 'recommendation count')
      assertMatch(learningSource, /failureRate30d\?: number/, 'failure rate')
      assertMatch(learningSource, /negativeFeedbackRate30d\?: number/, 'negative feedback rate')
    }
  },
  {
    name: 'analysis theme page does not hardcode learning success',
    run() {
      if (/statusLabel:\s*'学习成功'/.test(themeSource)) {
        fail('theme page must not hardcode 学习成功')
      }
      assertMatch(themeSource, /listQueryLearningResources/, 'theme page learning api import')
      assertMatch(themeSource, /learningResourceMap/, 'theme page learning map')
    }
  },
  {
    name: 'resource config page keeps density and no demo fallback contract',
    run() {
      assertMatch(resourceSource, /font-size:\s*14px/, 'minimum table font size')
      assertMatch(resourceSource, /cell--operation[\s\S]*justify-content:\s*center/, 'operation center alignment')
      assertMatch(resourceSource, /showResourceEmptyState/, 'stable empty state')
      assertMatch(resourceSource, /loadingResources/, 'real loading state')
    }
  },
  {
    name: 'frontend does not directly call SQLBot answer runtime',
    run() {
      assertMatch(trustedAnswerSource, /\/ai\/query\/trusted-answer\/stream/, 'trusted stream endpoint')
      if (/fetch\([^)]*\/api\/v1\/chat\/question/.test(trustedAnswerSource)) {
        fail('trusted answer api must not fetch SQLBot /chat/question directly')
      }
    }
  },
  {
    name: 'semantic patch operations include disable unpublish rollback',
    run() {
      assertMatch(trustedAnswerSource, /'disable'/, 'disable operation')
      assertMatch(trustedAnswerSource, /'unpublish'/, 'unpublish operation')
      assertMatch(trustedAnswerSource, /'rollback'/, 'rollback operation')
    }
  },
  {
    name: 'correction todo payload is sanitized by frontend contract',
    run() {
      assertMatch(trustedAnswerSource, /sanitized_question_summary/, 'sanitized summary field')
      assertMatch(trustedAnswerSource, /restricted_payload_visible/, 'restricted payload visibility field')
      assertMatch(trustedAnswerSource, /duplicate_fingerprint/, 'fingerprint field')
    }
  }
]

export const runSmartQueryAccuracyLoopContracts = () => {
  contractCases.forEach(contractCase => contractCase.run())
}

const shouldRun =
  typeof process !== 'undefined' && process?.env?.SMART_QUERY_ACCURACY_LOOP_CONTRACTS === '1'

if (shouldRun) {
  try {
    runSmartQueryAccuracyLoopContracts()
    console.log(`[smart-query-accuracy-loop] ${contractCases.length} contract checks passed`)
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    if (typeof process !== 'undefined') {
      process.exitCode = 1
    }
  }
}
```

- [ ] **Step 2: Run contract and verify fail**

Run the frontend contract command from Validation Commands.

Expected: FAIL with missing action wrappers and hardcoded `学习成功`.

- [ ] **Step 3: Extend `aiTrustedAnswer.ts` types and wrappers**

Add these type definitions near existing trusted-answer types:

```ts
export type TrustedAnswerActionType =
  | 'BASIC_ASK'
  | 'RECOMMENDATION_ASK'
  | 'DATA_INTERPRETATION'
  | 'FORECAST'
  | 'MANUAL_FOLLOW_UP'
  | 'AUTO_FOLLOW_UP'
  | 'HISTORY_LIST'
  | 'HISTORY_RESTORE'
  | 'HISTORY_FOLLOW_UP'
  | 'CHART_DATA'
  | 'USAGE'
  | 'CONTEXT_SWITCH'
  | 'SNAPSHOT'
  | 'DASHBOARD_ASK'
  | 'FILE_ASK'

export interface TrustedAnswerEndpointContract {
  dataease_endpoint: string
  method: string
  action_type: TrustedAnswerActionType
  required_switch?: string
  sqlbot_upstream?: string
  capability_check?: string
  negative_test?: string
}

export interface TrustedAnswerCorrectionTodo {
  todo_id: string
  tenant_id?: string
  workspace_id?: string
  theme_id?: string
  resource_id?: string
  diagnosis_type?: string
  sanitized_question_summary: string
  duplicate_fingerprint: string
  status: string
  severity?: string
  impact_count: number
  restricted_payload_visible: boolean
}

export interface TrustedAnswerSemanticPatch {
  patch_id: string
  scope: string
  patch_type: string
  status: string
  source_todo_id?: string
  audit_event_no?: string
  rollback_to_patch_id?: string
}

export type TrustedAnswerSemanticPatchOperation =
  | 'draft'
  | 'publish'
  | 'disable'
  | 'unpublish'
  | 'rollback'
```

Extend `TrustedAnswerRequest`:

```ts
action_type?: TrustedAnswerActionType
entry_scene?: string
resource_kind?: string
resource_id?: string
source_trace_id?: string
parent_trace_id?: string
record_id?: string
```

Add wrappers at the bottom:

```ts
export const listTrustedAnswerContracts = () =>
  request.get<TrustedAnswerEndpointContract[]>({ url: '/ai/query/trusted-answer/contracts' })

export const createTrustedAnswerCorrectionTodo = (data: Record<string, unknown>) =>
  request.post<TrustedAnswerCorrectionTodo>({
    url: '/ai/query/trusted-answer/correction-todos',
    data
  })

export const listTrustedAnswerCorrectionTodos = () =>
  request.get<TrustedAnswerCorrectionTodo[]>({
    url: '/ai/query/trusted-answer/correction-todos'
  })

export const applyTrustedAnswerSemanticPatch = (data: {
  todo_id?: string
  scope: string
  patch_type: string
  operation: TrustedAnswerSemanticPatchOperation
  patch_id?: string
  previous_patch_id?: string
  actor_role?: string
  content?: string
}) =>
  request.post<TrustedAnswerSemanticPatch>({
    url: '/ai/query/trusted-answer/semantic-patches',
    data
  })
```

In `streamTrustedAnswerQuestion`, include:

```ts
action_type: (payload.action_type || payload.actionType || 'BASIC_ASK') as TrustedAnswerActionType,
entry_scene: normalizeOptionalString(payload.entry_scene, payload.entryScene),
resource_kind: normalizeOptionalString(payload.resource_kind, payload.resourceKind),
resource_id: normalizeOptionalString(payload.resource_id, payload.resourceId),
source_trace_id: normalizeOptionalString(payload.source_trace_id, payload.sourceTraceId),
parent_trace_id: normalizeOptionalString(payload.parent_trace_id, payload.parentTraceId),
record_id: normalizeOptionalString(payload.record_id, payload.recordId),
```

- [ ] **Step 4: Extend `queryResourceLearning.ts` normalized type**

Add raw fields:

```ts
readiness_state?: Nullable<QueryLearningPrimitive>
readinessState?: Nullable<QueryLearningPrimitive>
askability_state?: Nullable<QueryLearningPrimitive>
askabilityState?: Nullable<QueryLearningPrimitive>
recommendation_count?: Nullable<QueryLearningPrimitive>
recommendationCount?: Nullable<QueryLearningPrimitive>
failure_rate_30d?: Nullable<QueryLearningPrimitive>
failureRate30d?: Nullable<QueryLearningPrimitive>
negative_feedback_rate_30d?: Nullable<QueryLearningPrimitive>
negativeFeedbackRate30d?: Nullable<QueryLearningPrimitive>
ambiguity_rate_30d?: Nullable<QueryLearningPrimitive>
ambiguityRate30d?: Nullable<QueryLearningPrimitive>
```

Add interface fields to `QueryLearningResource`:

```ts
readinessState?: string
askabilityState?: string
recommendationCount?: number
failureRate30d?: number
negativeFeedbackRate30d?: number
ambiguityRate30d?: number
```

In `normalizeLearningResource`, include:

```ts
readinessState: toOptionalString(payload.readiness_state ?? payload.readinessState),
askabilityState: toOptionalString(payload.askability_state ?? payload.askabilityState),
recommendationCount: toNumber(payload.recommendation_count ?? payload.recommendationCount),
failureRate30d: toNumber(payload.failure_rate_30d ?? payload.failureRate30d),
negativeFeedbackRate30d: toNumber(
  payload.negative_feedback_rate_30d ?? payload.negativeFeedbackRate30d
),
ambiguityRate30d: toNumber(payload.ambiguity_rate_30d ?? payload.ambiguityRate30d),
```

- [ ] **Step 5: Run contract and verify remaining failure is theme UI**

Run the frontend contract command.

Expected: FAIL only on the analysis theme hardcoded status and learning map checks.

- [ ] **Step 6: Commit API changes**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-frontend/src/api/aiTrustedAnswer.ts \
  dataease/core/core-frontend/src/api/queryResourceLearning.ts \
  dataease/core/core-frontend/src/views/system/query-config/__tests__/smart-query-accuracy-loop-contract.spec.ts
git commit -m "feat: add smart query accuracy frontend contracts"
```

## Task 8: Real Learning State And Query Config UI Density

**Files:**
- Modify: `dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue`
- Modify: `dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue`
- Modify: `dataease/core/core-frontend/src/views/system/query-config/components/TrustedAnswerOverview.vue`
- Modify: `dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts`
- Modify: `dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts`

- [ ] **Step 1: Add failing UI contract checks**

In `query-resource-learning-ui-contract.spec.ts`, add checks:

```ts
{
  name: 'query theme page consumes real learning status without hardcoded success',
  run() {
    const source = readSource('src/views/visualized/data/query-theme/index.vue')
    if (/statusLabel:\s*'学习成功'/.test(source)) {
      fail('query theme page must not hardcode learning success')
    }
    assertMatch(source, /listQueryLearningResources/, 'real learning api')
    assertMatch(source, /learningResourceMap/, 'learning resource map')
    assertMatch(source, /formatLearningStatusLabel/, 'status formatter')
  }
},
{
  name: 'query resource page table density remains readable',
  run() {
    const source = readSource('src/views/system/query-config/QueryResourcePrototype.vue')
    assertMatch(source, /font-size:\s*14px/, 'minimum readable table font')
    assertMatch(source, /min-height:\s*48px/, 'stable row height')
    assertMatch(source, /cell--operation[\s\S]*justify-content:\s*center/, 'operation center alignment')
    assertMatch(source, /prototype-table__empty-card/, 'stable empty card')
  }
}
```

- [ ] **Step 2: Run UI contracts and verify fail**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
mkdir -p tmp/query-resource-ui-contract
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/query-resource-ui-contract/query-resource-learning-ui-contract.spec.js
QUERY_RESOURCE_LEARNING_UI_CONTRACTS=1 node tmp/query-resource-ui-contract/query-resource-learning-ui-contract.spec.js
```

Expected: FAIL on hardcoded `学习成功` in `query-theme/index.vue` or missing density CSS.

- [ ] **Step 3: Replace hardcoded learning state in analysis theme page**

In `query-theme/index.vue`, add import:

```ts
import {
  listQueryLearningResources,
  type QueryLearningResource
} from '@/api/queryResourceLearning'
```

Add state:

```ts
const learningResources = ref<QueryLearningResource[]>([])
const learningResourceMap = computed(() => {
  return new Map(learningResources.value.map(item => [String(item.id), item]))
})
```

Add loader:

```ts
const loadLearningResources = async () => {
  try {
    learningResources.value = await listQueryLearningResources()
  } catch (error) {
    learningResources.value = []
  }
}
```

Add formatter:

```ts
const formatLearningStatusLabel = (status?: string) => {
  if (!status) {
    return '未学习'
  }
  const normalized = String(status).toLowerCase()
  if (['succeeded', 'success', '学习成功'].includes(normalized)) {
    return '学习成功'
  }
  if (['running', 'learning', '学习中'].includes(normalized)) {
    return '学习中'
  }
  if (['failed', 'failure', '学习失败'].includes(normalized)) {
    return '学习失败'
  }
  return String(status)
}
```

In `onMounted`, call:

```ts
await loadLearningResources()
```

Replace theme resource `statusLabel: '学习成功'` with:

```ts
statusLabel: formatLearningStatusLabel(learningResourceMap.value.get(String(datasetId))?.learningStatus),
readinessState: learningResourceMap.value.get(String(datasetId))?.readinessState,
qualityScore: learningResourceMap.value.get(String(datasetId))?.qualityScore
```

Replace resource row `statusLabel: '学习成功'` with:

```ts
statusLabel: formatLearningStatusLabel(learningResourceMap.value.get(String(item.id))?.learningStatus),
readinessState: learningResourceMap.value.get(String(item.id))?.readinessState,
qualityScore: learningResourceMap.value.get(String(item.id))?.qualityScore
```

- [ ] **Step 4: Tighten query resource table density CSS**

In `QueryResourcePrototype.vue`, ensure these style rules exist:

```scss
.prototype-table__header-row,
.prototype-table__data-row {
  display: grid;
  grid-template-columns: 44px minmax(220px, 1.4fr) minmax(110px, 0.7fr) minmax(160px, 1fr) minmax(160px, 0.9fr) minmax(190px, 1fr) 132px;
  align-items: center;
  min-height: 48px;
  font-size: 14px;
}

.prototype-table__header-row {
  font-size: 14px;
  font-weight: 600;
}

.cell--operation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.cell--name,
.dataset-entry__title {
  font-size: 15px;
}

.prototype-table__empty-card {
  min-height: 220px;
}
```

If equivalent rules already exist, update values to match these constraints without changing unrelated styles.

- [ ] **Step 5: Show contract health in overview**

In `TrustedAnswerOverview.vue`, call `listTrustedAnswerContracts`, `listTrustedAnswerCorrectionTodos`, and display counts. Add text labels:

```text
动作契约
运行时开关
修正待办
语义修正
```

The UI can be compact; it must use real API calls and stable empty/loading states.

- [ ] **Step 6: Run frontend contracts and verify pass**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
mkdir -p tmp/smart-query-accuracy-loop-contract
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/smart-query-accuracy-loop-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/smart-query-accuracy-loop-contract/smart-query-accuracy-loop-contract.spec.js
SMART_QUERY_ACCURACY_LOOP_CONTRACTS=1 node tmp/smart-query-accuracy-loop-contract/smart-query-accuracy-loop-contract.spec.js

mkdir -p tmp/query-resource-ui-contract
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/query-resource-ui-contract/query-resource-learning-ui-contract.spec.js
QUERY_RESOURCE_LEARNING_UI_CONTRACTS=1 node tmp/query-resource-ui-contract/query-resource-learning-ui-contract.spec.js
```

Expected:

```text
[smart-query-accuracy-loop] 9 contract checks passed
```

and query resource UI contract exits `0`.

- [ ] **Step 7: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue \
  dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue \
  dataease/core/core-frontend/src/views/system/query-config/components/TrustedAnswerOverview.vue \
  dataease/core/core-frontend/src/views/system/query-config/__tests__/query-resource-learning-ui-contract.spec.ts \
  dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts
git commit -m "feat: use real learning state in query config ui"
```

## Task 9: Documentation And Full Verification

**Files:**
- Modify: `dataease/docs/smart-query-runtime-dev.md`
- Modify: `docs/superpowers/plans/2026-05-04-smart-query-accuracy-operations-loop-implementation-plan.md`

- [ ] **Step 1: Update runtime developer guide**

Add this section to `dataease/docs/smart-query-runtime-dev.md`:

```markdown
## Accuracy Operations Loop Verification

The smart-query accuracy loop adds these backend-owned contracts:

| Area | Verification |
| --- | --- |
| Global switches | `ask_enabled=false` blocks `/ai/query/trusted-answer/stream` before SQLBot. |
| Action matrix | `/ai/query/trusted-answer/contracts` lists every user-visible action. |
| SQLBot proxy guard | Unmapped SQLBot runtime paths return a structured DataEase denial. |
| ResourceReadiness | Resource readiness is computed from learning status, field count, recommendations, score, and 30-day quality rates. |
| AuthorizedAskability | Current user permissions decide per-request askability without mutating resource readiness. |
| CorrectionTodo | User feedback is redacted, fingerprinted by tenant/workspace/theme/resource/diagnosis, and aggregated. |
| Semantic patch | Draft, publish, disable, unpublish, and rollback are role-gated and audited. |
| UI density | Query resource and theme pages use real learning data and stable table/card layout. |

### Backend Accuracy Loop Tests

```bash
cd dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest,io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest,io.dataease.ai.query.TrustedAnswerActionContractServiceTest,io.dataease.ai.query.TrustedAnswerResourceReadinessServiceTest,io.dataease.ai.query.TrustedAnswerSensitivePayloadServiceTest,io.dataease.ai.query.TrustedAnswerCorrectionTodoServiceTest,io.dataease.ai.query.TrustedAnswerSemanticPatchServiceTest,io.dataease.ai.query.TrustedAnswerOpsServiceTest,io.dataease.ai.query.AIQueryResourceLearningContractSmokeTest \
  -Dmaven.antrun.skip=true \
  test
```

Expected: all named accuracy loop tests pass.

### Frontend Accuracy Loop Contracts

```bash
cd dataease/core/core-frontend
mkdir -p tmp/smart-query-accuracy-loop-contract
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/smart-query-accuracy-loop-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/smart-query-accuracy-loop-contract/smart-query-accuracy-loop-contract.spec.js
SMART_QUERY_ACCURACY_LOOP_CONTRACTS=1 node tmp/smart-query-accuracy-loop-contract/smart-query-accuracy-loop-contract.spec.js
```

Expected:

```text
[smart-query-accuracy-loop] 9 contract checks passed
```
```

- [ ] **Step 2: Run backend focused test suite**

Run the backend focused tests from Validation Commands.

Expected: Maven exits `0`.

- [ ] **Step 3: Run frontend accuracy loop contract**

Run the frontend contract command from Validation Commands.

Expected:

```text
[smart-query-accuracy-loop] 9 contract checks passed
```

- [ ] **Step 4: Run existing trusted-answer and resource-learning frontend contracts**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend

mkdir -p tmp/trusted-answer-api-contract
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/trusted-answer-api-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/trusted-answer-api-contract/trusted-answer-api-contract.spec.js
TRUSTED_ANSWER_API_CONTRACTS=1 node tmp/trusted-answer-api-contract/trusted-answer-api-contract.spec.js

mkdir -p tmp/trusted-answer-sqlbot-direct-guard
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/trusted-answer-sqlbot-direct-guard.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/trusted-answer-sqlbot-direct-guard/trusted-answer-sqlbot-direct-guard.spec.js
TRUSTED_ANSWER_SQLBOT_DIRECT_GUARD=1 node tmp/trusted-answer-sqlbot-direct-guard/trusted-answer-sqlbot-direct-guard.spec.js

mkdir -p tmp/query-resource-api-contract
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/query-resource-learning-api.spec.ts \
  --bundle \
  --platform=node \
  --alias:@/config/axios=./src/views/system/query-config/__tests__/query-resource-learning-request.stub.ts \
  --outfile=tmp/query-resource-api-contract/query-resource-learning-api.spec.js
QUERY_RESOURCE_LEARNING_API_RUN_CONTRACTS=1 node tmp/query-resource-api-contract/query-resource-learning-api.spec.js
```

Expected:

```text
[trusted-answer-api] 3 contract checks passed
[trusted-answer-sqlbot-direct-guard] 2 contract checks passed
```

and query resource API contract exits `0`.

- [ ] **Step 5: Run source scans for banned shortcuts**

Run:

```bash
cd /Users/chenliyong/.config/superpowers/worktrees/StarBI/codex-smart-query-accuracy-loop
rg -n "statusLabel:\\s*'学习成功'|demo/fallback|/api/v1/chat/question|raw sql|physical table|hidden_salary" \
  dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue \
  dataease/core/core-frontend/src/views/system/query-config \
  dataease/core/core-frontend/src/api/aiTrustedAnswer.ts \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/server
```

Expected: no output. Normal UI input `placeholder` text is not a banned shortcut and is intentionally excluded from this scan. If output appears for legitimate domain text, replace the text with safer wording or narrow the scan in this plan with an exact allowed pattern.

- [ ] **Step 6: Run `git diff --check`**

Run:

```bash
cd /Users/chenliyong/.config/superpowers/worktrees/StarBI/codex-smart-query-accuracy-loop
git diff --check
```

Expected: no output.

- [ ] **Step 7: Commit docs**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/docs/smart-query-runtime-dev.md \
  docs/superpowers/plans/2026-05-04-smart-query-accuracy-operations-loop-implementation-plan.md
git commit -m "docs: document smart query accuracy loop verification"
```

## Self-Review

### Spec Coverage

| Spec requirement | Plan task |
| --- | --- |
| DataEase backend endpoint contract and default-deny proxy path | Task 2 |
| Global switches including base ask path | Task 2 and Task 3 |
| DataEase owns SQL execution and row/column enforcement boundary | Task 3 |
| SQLBot cannot produce final facts without DataEase result marker | Task 3 |
| Conversation history rebuilt from current scope | Task 3 |
| `ResourceReadiness` vs `AuthorizedAskability` split | Task 1, Task 3, Task 4 |
| Deterministic readiness scoring | Task 4 |
| Correction todo sensitive payload, redaction, fingerprint, retention | Task 5 |
| Semantic patch operation RBAC, audit, disable, unpublish, rollback | Task 6 |
| UI removes hardcoded learning state and improves density | Task 7 and Task 8 |
| Runnable deterministic fixtures and commands | Task 9 |

### Placeholder Scan

The plan avoids vague implementation instructions and includes concrete files, test methods, service code, commands, expected failures, expected passes, and commit boundaries.

### Type Consistency

The type names used across tasks are consistent:

- `TrustedAnswerActionType`
- `TrustedAnswerSwitchKey`
- `TrustedAnswerRuntimePolicyVO`
- `TrustedAnswerEndpointContractVO`
- `AuthorizedAskabilityState`
- `ResourceReadinessState`
- `TrustedAnswerCorrectionTodoVO`
- `TrustedAnswerSemanticPatchVO`
- `TrustedAnswerActionContractService`
- `TrustedAnswerRuntimePolicyService`
- `TrustedAnswerResourceReadinessService`
- `TrustedAnswerSensitivePayloadService`
- `TrustedAnswerCorrectionTodoService`
- `TrustedAnswerSemanticPatchService`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-04-smart-query-accuracy-operations-loop-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.

2. Inline Execution - execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
