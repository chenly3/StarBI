# Smart Query Trusted Answer Layer Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first verified DataEase Trusted Answer Layer vertical slice so a smart-query request is routed through DataEase backend, receives a permission-filtered runtime context, emits traceable trusted-answer SSE events, and exposes enough Trust Health / Repair Queue UI to prove the loop.

**Architecture:** Add typed trusted-answer DTOs in `api-base`, a focused backend `trusted` package that builds authorized runtime context using existing theme and `DatasetSQLBotManage` paths, and a stub SQLBot proxy that proves trace/state contracts before real SQLBot streaming migration expands. Keep frontend changes surgical by adding a new `aiTrustedAnswer.ts` API wrapper, routing the existing `streamSQLBotQuestion` helper through DataEase backend for the main question stream, and adding a small Trust Health / Repair Queue panel above the existing query-config tabs.

**Tech Stack:** Spring Boot, Lombok, Jackson, JUnit 5, Mockito, Vue 3, TypeScript, Vite/esbuild source-contract harnesses, existing DataEase `request` wrapper, existing SQLBot chat UI.

---

## Scope Check

This plan intentionally implements the first vertical trusted-answer loop only. It does not implement the full P0-P4 roadmap, trend dashboards, a public developer portal, a complete semantic-layer authoring suite, or migration of every historical SQLBot chart/history endpoint.

The first vertical loop includes:

- Developer contract: DTOs, state enum, error codes, trace schema, quickstart.
- Backend boundary: `/ai/query/trusted-answer/stream`, `/trace/{traceId}`, `/trust-health`, `/repair-queue`.
- Runtime context: theme validation, authorized dataset filtering, `DatasetSQLBotManage.getDatasourceList(...)`, runtime state classification.
- Stub stream: deterministic trusted-answer SSE event flow with `trace_id`.
- Main question migration: existing frontend `streamSQLBotQuestion(...)` delegates to DataEase backend.
- Admin proof surface: query-config Trust Health / Repair Queue panel with real backend endpoints.
- Verification: backend contract tests, context tests, frontend source guards, docs quickstart.

## File Structure

### Backend Shared API DTOs

- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerRequest.java`
  - Responsibility: frontend-to-backend request contract for trusted-answer streaming.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerState.java`
  - Responsibility: backend-owned runtime state enum.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorCode.java`
  - Responsibility: machine-readable error-code enum and user/admin-safe defaults.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorVO.java`
  - Responsibility: structured error payload with problem, cause, fix, trace step, retryability, and visibility copy.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTraceVO.java`
  - Responsibility: trace payload for admin debugging and user-safe state summaries.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerContextVO.java`
  - Responsibility: backend-built authorized runtime context summary.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerSseEventVO.java`
  - Responsibility: canonical SSE event shape emitted by trusted-answer stream.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTrustHealthVO.java`
  - Responsibility: Trust Health summary for query-config admin panel.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerRepairItemVO.java`
  - Responsibility: Repair Queue row contract.

### Backend Implementation

- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerTraceStore.java`
  - Responsibility: small in-memory trace store for the first vertical slice and tests.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimeContextService.java`
  - Responsibility: construct authorized context, classify runtime state, and store traces.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java`
  - Responsibility: deterministic SSE writer for the first backend-owned stream.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerOpsService.java`
  - Responsibility: aggregate Trust Health and Repair Queue from traces.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java`
  - Responsibility: trusted-answer REST/SSE endpoints.

### Backend Tests

- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java`
  - Responsibility: DTO serialization and server contract smoke coverage.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerRuntimeContextServiceTest.java`
  - Responsibility: context builder no-leak and state classification tests.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerOpsServiceTest.java`
  - Responsibility: Trust Health and Repair Queue aggregation tests.

### Frontend API / UI / Guards

- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiTrustedAnswer.ts`
  - Responsibility: frontend trusted-answer API wrapper and SSE parser.
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
  - Responsibility: route the main `streamSQLBotQuestion(...)` helper through DataEase backend while preserving existing callers.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/TrustedAnswerOverview.vue`
  - Responsibility: minimal Trust Health / Repair Queue admin panel.
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/index.vue`
  - Responsibility: render the Trust Health / Repair Queue panel above existing query-config tabs.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-api-contract.spec.ts`
  - Responsibility: source contract for frontend API wrapper.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-sqlbot-direct-guard.spec.ts`
  - Responsibility: source guard proving the main SQLBot question stream is no longer direct frontend-to-SQLBot.
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts`
  - Responsibility: source contract for Trust Health / Repair Queue UI.

### Docs

- Create: `/Users/chenliyong/AI/github/StarBI/dataease/docs/smart-query-runtime-dev.md`
  - Responsibility: 15-minute trusted-answer quickstart, DTO examples, state/error contracts, migration matrix, and test commands.

## Task 1: Add Trusted-Answer DTO Contract Tests And Shared DTOs

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerRequest.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerState.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorCode.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTraceVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerContextVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerSseEventVO.java`

- [ ] **Step 1: Write the failing DTO contract smoke test**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java`:

```java
package io.dataease.ai.query;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorVO;
import io.dataease.api.ai.query.vo.TrustedAnswerSseEventVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AIQueryTrustedAnswerContractSmokeTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void requestShouldExposeCanonicalSnakeCaseJson() throws Exception {
        TrustedAnswerRequest request = new TrustedAnswerRequest();
        request.setQuestion("本月销售额是多少");
        request.setThemeId(1001L);
        request.setDatasourceId(2002L);
        request.setModelId("model-default");
        request.setChatId(3003L);

        String json = objectMapper.writeValueAsString(request);

        assertTrue(json.contains("\"question\":\"本月销售额是多少\""));
        assertTrue(json.contains("\"theme_id\":\"1001\""));
        assertTrue(json.contains("\"datasource_id\":\"2002\""));
        assertTrue(json.contains("\"model_id\":\"model-default\""));
        assertTrue(json.contains("\"chat_id\":\"3003\""));
    }

    @Test
    void traceShouldExposeStateContextAndRedactedEvidence() throws Exception {
        TrustedAnswerContextVO context = new TrustedAnswerContextVO();
        context.setThemeId(1001L);
        context.setThemeName("销售分析");
        context.setDatasetIds(List.of(11L, 12L));
        context.setDefaultDatasetIds(List.of(11L));
        context.setDatasourceIds(List.of(22L));
        context.setVisibleFieldCount(8);
        context.setExcludedDatasetIds(List.of(99L));
        context.setExcludedFieldCount(3);

        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId("trace-1");
        trace.setState(TrustedAnswerState.TRUSTED);
        trace.setContext(context);
        trace.setMatchedTerms(List.of("销售额"));
        trace.setMatchedSqlExamples(List.of("按月统计销售额"));
        trace.setPermissionSteps(List.of("column-filtered", "row-permission-applied"));

        String json = objectMapper.writeValueAsString(trace);

        assertTrue(json.contains("\"trace_id\":\"trace-1\""));
        assertTrue(json.contains("\"state\":\"TRUSTED\""));
        assertTrue(json.contains("\"theme_id\":\"1001\""));
        assertTrue(json.contains("\"dataset_ids\":[\"11\",\"12\"]"));
        assertTrue(json.contains("\"visible_field_count\":8"));
        assertTrue(json.contains("\"excluded_field_count\":3"));
        assertTrue(json.contains("\"permission_steps\":[\"column-filtered\",\"row-permission-applied\"]"));
    }

    @Test
    void errorCodeShouldBuildActionableErrorPayload() {
        TrustedAnswerErrorVO error = TrustedAnswerErrorCode.NO_AUTHORIZED_DATASET.toError();

        assertEquals("NO_AUTHORIZED_DATASET", error.getCode());
        assertEquals(TrustedAnswerState.NO_AUTHORIZED_CONTEXT, error.getState());
        assertEquals("resolve-authorized-datasets", error.getTraceStep());
        assertEquals(Boolean.FALSE, error.getRetryable());
        assertTrue(error.getMessage().contains("没有可问资源"));
        assertTrue(error.getCause().contains("权限"));
        assertTrue(error.getFix().contains("权限"));
        assertNotNull(error.getUserVisibleMessage());
        assertNotNull(error.getAdminVisibleDetail());
    }

    @Test
    void sseEventShouldCarryTraceStateDataAndError() throws Exception {
        TrustedAnswerSseEventVO event = TrustedAnswerSseEventVO.error(
                "trace-1",
                TrustedAnswerErrorCode.SQLBOT_UNAVAILABLE.toError()
        );

        String json = objectMapper.writeValueAsString(event);

        assertTrue(json.contains("\"event\":\"error\""));
        assertTrue(json.contains("\"trace_id\":\"trace-1\""));
        assertTrue(json.contains("\"state\":\"FAILED\""));
        assertTrue(json.contains("\"code\":\"SQLBOT_UNAVAILABLE\""));
        assertTrue(json.contains("\"done\":true"));
    }
}
```

- [ ] **Step 2: Run the test and verify it fails before DTOs exist**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest \
  test
```

Expected: FAIL during test compilation with errors containing `cannot find symbol` for `TrustedAnswerRequest` or `TrustedAnswerState`.

- [ ] **Step 3: Create the shared request DTO**

Create `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerRequest.java`:

```java
package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 8974316712634871204L;

    private String question;

    @JsonProperty("theme_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long themeId;

    @JsonProperty("datasource_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long datasourceId;

    @JsonProperty("model_id")
    private String modelId;

    @JsonProperty("chat_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long chatId;
}
```

- [ ] **Step 4: Create the runtime state enum**

Create `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerState.java`:

```java
package io.dataease.api.ai.query.vo;

public enum TrustedAnswerState {
    TRUSTED,
    NEEDS_CLARIFICATION,
    PARTIAL,
    UNSAFE_BLOCKED,
    NO_AUTHORIZED_CONTEXT,
    FAILED
}
```

- [ ] **Step 5: Create the structured error VO**

Create `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerErrorVO implements Serializable {

    @Serial
    private static final long serialVersionUID = -2049295146916486925L;

    private String code;

    private TrustedAnswerState state;

    private String message;

    private String cause;

    private String fix;

    @JsonProperty("trace_step")
    private String traceStep;

    private Boolean retryable = false;

    @JsonProperty("user_visible_message")
    private String userVisibleMessage;

    @JsonProperty("admin_visible_detail")
    private String adminVisibleDetail;
}
```

- [ ] **Step 6: Create the error-code enum with problem + cause + fix**

Create `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorCode.java`:

```java
package io.dataease.api.ai.query.vo;

public enum TrustedAnswerErrorCode {

    THEME_REQUIRED(
            TrustedAnswerState.NEEDS_CLARIFICATION,
            "请选择一个可信问数业务上下文。",
            "本次请求没有携带 theme_id，后端无法确定可问资源范围。",
            "在问数入口选择一个业务上下文，或配置默认分析主题。",
            "validate-theme",
            false
    ),
    SQLBOT_CONFIG_MISSING(
            TrustedAnswerState.FAILED,
            "SQLBot 服务配置不可用。",
            "SQLBot 配置缺失、未启用或校验失败。",
            "在系统设置中完成 SQLBot 配置，或在本地开发中启用 SQLBot stub 模式。",
            "load-sqlbot-config",
            true
    ),
    THEME_NOT_VISIBLE(
            TrustedAnswerState.NO_AUTHORIZED_CONTEXT,
            "当前用户无权使用该分析主题。",
            "主题不存在、已禁用，或不在当前用户可见范围内。",
            "选择有权限的主题，或由管理员调整主题可见范围。",
            "validate-theme",
            false
    ),
    NO_AUTHORIZED_DATASET(
            TrustedAnswerState.NO_AUTHORIZED_CONTEXT,
            "当前主题下没有可问资源。",
            "主题绑定了数据集，但当前用户的数据集权限过滤后没有剩余资源。",
            "调整数据集权限、资源权限，或选择其他主题。",
            "resolve-authorized-datasets",
            false
    ),
    NO_VISIBLE_FIELD(
            TrustedAnswerState.UNSAFE_BLOCKED,
            "权限过滤后没有可用于问数的字段。",
            "列权限移除了该主题下所有可问字段。",
            "调整列权限或资源语义配置后重新学习。",
            "build-visible-schema",
            false
    ),
    ROW_PERMISSION_REBUILD_FAILED(
            TrustedAnswerState.UNSAFE_BLOCKED,
            "行权限无法安全拼接到问数 SQL。",
            "行权限表达式重写失败，继续生成 SQL 可能造成数据泄露或错误结果。",
            "修复行权限表达式后重新学习并回放验证。",
            "apply-row-permission",
            false
    ),
    MULTI_DATASOURCE_AMBIGUOUS(
            TrustedAnswerState.NEEDS_CLARIFICATION,
            "该主题命中多个数据源，需要先选择执行数据源。",
            "主题内授权资源分布在多个数据源，后端不能安全猜测执行数据源。",
            "选择一个数据源，或在分析主题中配置默认数据源策略。",
            "choose-datasource",
            false
    ),
    SQLBOT_UNAVAILABLE(
            TrustedAnswerState.FAILED,
            "SQLBot 服务暂不可用。",
            "SQLBot 网络请求失败、超时，或服务返回不可用。",
            "稍后重试，或检查 SQLBot 服务健康状态。",
            "call-sqlbot",
            true
    );

    private final TrustedAnswerState state;
    private final String message;
    private final String cause;
    private final String fix;
    private final String traceStep;
    private final boolean retryable;

    TrustedAnswerErrorCode(
            TrustedAnswerState state,
            String message,
            String cause,
            String fix,
            String traceStep,
            boolean retryable
    ) {
        this.state = state;
        this.message = message;
        this.cause = cause;
        this.fix = fix;
        this.traceStep = traceStep;
        this.retryable = retryable;
    }

    public TrustedAnswerErrorVO toError() {
        TrustedAnswerErrorVO error = new TrustedAnswerErrorVO();
        error.setCode(name());
        error.setState(state);
        error.setMessage(message);
        error.setCause(cause);
        error.setFix(fix);
        error.setTraceStep(traceStep);
        error.setRetryable(retryable);
        error.setUserVisibleMessage(message);
        error.setAdminVisibleDetail(cause + " " + fix);
        return error;
    }
}
```

- [ ] **Step 7: Create the authorized context VO**

Create `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerContextVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class TrustedAnswerContextVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 825221748116762453L;

    @JsonProperty("theme_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long themeId;

    @JsonProperty("theme_name")
    private String themeName;

    @JsonProperty("datasource_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long datasourceId;

    @JsonProperty("dataset_ids")
    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> datasetIds = new ArrayList<>();

    @JsonProperty("default_dataset_ids")
    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> defaultDatasetIds = new ArrayList<>();

    @JsonProperty("datasource_ids")
    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> datasourceIds = new ArrayList<>();

    @JsonProperty("excluded_dataset_ids")
    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> excludedDatasetIds = new ArrayList<>();

    @JsonProperty("visible_field_count")
    private Integer visibleFieldCount = 0;

    @JsonProperty("excluded_field_count")
    private Integer excludedFieldCount = 0;

    @JsonProperty("schema_table_count")
    private Integer schemaTableCount = 0;
}
```

- [ ] **Step 8: Create the trace VO**

Create `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTraceVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class TrustedAnswerTraceVO implements Serializable {

    @Serial
    private static final long serialVersionUID = -2717705775495906537L;

    @JsonProperty("trace_id")
    private String traceId;

    private TrustedAnswerState state;

    private TrustedAnswerContextVO context;

    private TrustedAnswerErrorVO error;

    @JsonProperty("matched_terms")
    private List<String> matchedTerms = new ArrayList<>();

    @JsonProperty("matched_sql_examples")
    private List<String> matchedSqlExamples = new ArrayList<>();

    @JsonProperty("permission_steps")
    private List<String> permissionSteps = new ArrayList<>();
}
```

- [ ] **Step 9: Create the SSE event VO**

Create `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerSseEventVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerSseEventVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 6975122076274093925L;

    private String event;

    @JsonProperty("trace_id")
    private String traceId;

    private TrustedAnswerState state;

    private Object data;

    private TrustedAnswerErrorVO error;

    private Boolean done = false;

    public static TrustedAnswerSseEventVO trace(String traceId, TrustedAnswerState state, Object data) {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("trace");
        event.setTraceId(traceId);
        event.setState(state);
        event.setData(data);
        event.setDone(false);
        return event;
    }

    public static TrustedAnswerSseEventVO answer(String traceId, Object data) {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("answer");
        event.setTraceId(traceId);
        event.setState(TrustedAnswerState.TRUSTED);
        event.setData(data);
        event.setDone(false);
        return event;
    }

    public static TrustedAnswerSseEventVO done(String traceId, TrustedAnswerState state) {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("done");
        event.setTraceId(traceId);
        event.setState(state);
        event.setDone(true);
        return event;
    }

    public static TrustedAnswerSseEventVO error(String traceId, TrustedAnswerErrorVO error) {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("error");
        event.setTraceId(traceId);
        event.setState(error.getState());
        event.setError(error);
        event.setDone(true);
        return event;
    }
}
```

- [ ] **Step 10: Run the contract test and verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest \
  test
```

Expected: PASS. The output includes `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Step 11: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/TrustedAnswerRequest.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerState.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorCode.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerErrorVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTraceVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerContextVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerSseEventVO.java
git commit -m "test: add trusted answer DTO contract"
```

## Task 2: Add Runtime Context Service With No-Leak State Tests

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerRuntimeContextServiceTest.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerTraceStore.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimeContextService.java`

- [ ] **Step 1: Write the failing runtime context tests**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerRuntimeContextServiceTest.java`:

```java
package io.dataease.ai.query;

import io.dataease.ai.query.manage.AIQueryThemeManage;
import io.dataease.ai.query.trusted.TrustedAnswerRuntimeContextService;
import io.dataease.ai.query.trusted.TrustedAnswerTraceStore;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.AIQueryThemeVO;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.dataset.vo.DataSQLBotAssistantVO;
import io.dataease.api.dataset.vo.SQLBotAssistanTable;
import io.dataease.api.dataset.vo.SQLBotAssistantField;
import io.dataease.dataset.manage.DatasetSQLBotManage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrustedAnswerRuntimeContextServiceTest {

    @Mock
    private AIQueryThemeManage aiQueryThemeManage;

    @Mock
    private DatasetSQLBotManage datasetSQLBotManage;

    private TrustedAnswerTraceStore traceStore;
    private TrustedAnswerRuntimeContextService service;

    @BeforeEach
    void setUp() {
        traceStore = new TrustedAnswerTraceStore();
        service = new TrustedAnswerRuntimeContextService(aiQueryThemeManage, datasetSQLBotManage, traceStore);
    }

    @Test
    void missingThemeShouldAskForClarificationBeforeSchemaLookup() {
        TrustedAnswerRequest request = new TrustedAnswerRequest();
        request.setQuestion("本月销售额");

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.NEEDS_CLARIFICATION, trace.getState());
        assertEquals("THEME_REQUIRED", trace.getError().getCode());
        assertEquals("validate-theme", trace.getError().getTraceStep());
        assertTrue(trace.getTraceId().startsWith("ta-"));
    }

    @Test
    void disabledThemeShouldNotReachSqlBotSchema() {
        TrustedAnswerRequest request = request(1001L, null);
        AIQueryThemeVO theme = theme(false, List.of(11L), List.of(11L));
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.NO_AUTHORIZED_CONTEXT, trace.getState());
        assertEquals("THEME_NOT_VISIBLE", trace.getError().getCode());
        assertEquals(1001L, trace.getContext().getThemeId());
    }

    @Test
    void noAuthorizedDatasetsShouldNotBuildSchema() {
        TrustedAnswerRequest request = request(1001L, null);
        AIQueryThemeVO theme = theme(true, List.of(), List.of());
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.NO_AUTHORIZED_CONTEXT, trace.getState());
        assertEquals("NO_AUTHORIZED_DATASET", trace.getError().getCode());
        assertEquals(0, trace.getContext().getDatasetIds().size());
    }

    @Test
    void multipleDatasourcesWithoutSelectionShouldNeedClarification() {
        TrustedAnswerRequest request = request(1001L, null);
        AIQueryThemeVO theme = theme(true, List.of(11L, 12L), List.of(11L));
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);
        when(datasetSQLBotManage.getDatasourceList(null, null, "11,12"))
                .thenReturn(List.of(datasource(21L, 11L, "amount"), datasource(22L, 12L, "gmv")));

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.NEEDS_CLARIFICATION, trace.getState());
        assertEquals("MULTI_DATASOURCE_AMBIGUOUS", trace.getError().getCode());
        assertEquals(List.of(21L, 22L), trace.getContext().getDatasourceIds());
        assertEquals(2, trace.getContext().getVisibleFieldCount());
    }

    @Test
    void selectedDatasourceShouldBuildTrustedContextWithOnlyAuthorizedDatasets() {
        TrustedAnswerRequest request = request(1001L, 21L);
        AIQueryThemeVO theme = theme(true, List.of(11L, 12L), List.of(11L));
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);
        when(datasetSQLBotManage.getDatasourceList(21L, null, "11,12"))
                .thenReturn(List.of(datasource(21L, 11L, "amount")));

        TrustedAnswerTraceVO trace = service.buildTrace(request);
        TrustedAnswerContextVO context = trace.getContext();

        assertEquals(TrustedAnswerState.TRUSTED, trace.getState());
        assertEquals(1001L, context.getThemeId());
        assertEquals(21L, context.getDatasourceId());
        assertEquals(List.of(11L, 12L), context.getDatasetIds());
        assertEquals(List.of(11L), context.getDefaultDatasetIds());
        assertEquals(List.of(21L), context.getDatasourceIds());
        assertEquals(1, context.getVisibleFieldCount());
        assertEquals(1, context.getSchemaTableCount());
        assertNotNull(traceStore.get(trace.getTraceId()));
    }

    private static TrustedAnswerRequest request(Long themeId, Long datasourceId) {
        TrustedAnswerRequest request = new TrustedAnswerRequest();
        request.setQuestion("本月销售额");
        request.setThemeId(themeId);
        request.setDatasourceId(datasourceId);
        return request;
    }

    private static AIQueryThemeVO theme(boolean enabled, List<Long> datasetIds, List<Long> defaultDatasetIds) {
        AIQueryThemeVO theme = new AIQueryThemeVO();
        theme.setId(1001L);
        theme.setName("销售分析");
        theme.setStatus(enabled);
        theme.setDatasetIds(datasetIds);
        theme.setDefaultDatasetIds(defaultDatasetIds);
        return theme;
    }

    private static DataSQLBotAssistantVO datasource(Long datasourceId, Long datasetGroupId, String fieldName) {
        SQLBotAssistantField field = new SQLBotAssistantField();
        field.setName(fieldName);
        field.setComment(fieldName);
        field.setType("NUMBER");

        SQLBotAssistanTable table = new SQLBotAssistanTable();
        table.setName("sales_table");
        table.setComment("sales_table");
        table.setDatasetGroupId(datasetGroupId);
        table.setFields(List.of(field));

        DataSQLBotAssistantVO datasource = new DataSQLBotAssistantVO();
        datasource.setId(datasourceId);
        datasource.setName("ds-" + datasourceId);
        datasource.setTables(List.of(table));
        return datasource;
    }
}
```

- [ ] **Step 2: Run the runtime context test and verify it fails before the service exists**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest \
  test
```

Expected: FAIL during test compilation with errors containing `package io.dataease.ai.query.trusted does not exist`.

- [ ] **Step 3: Create the trace store**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerTraceStore.java`:

```java
package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TrustedAnswerTraceStore {

    private final Map<String, TrustedAnswerTraceVO> traces = new ConcurrentHashMap<>();

    public void put(TrustedAnswerTraceVO trace) {
        if (trace != null && trace.getTraceId() != null) {
            traces.put(trace.getTraceId(), trace);
        }
    }

    public TrustedAnswerTraceVO get(String traceId) {
        return traces.get(traceId);
    }

    public List<TrustedAnswerTraceVO> recent() {
        return traces.values().stream()
                .sorted(Comparator.comparing(TrustedAnswerTraceVO::getTraceId).reversed())
                .limit(50)
                .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
    }

    public void clear() {
        traces.clear();
    }
}
```

- [ ] **Step 4: Create the runtime context service**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimeContextService.java`:

```java
package io.dataease.ai.query.trusted;

import io.dataease.ai.query.manage.AIQueryThemeManage;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.AIQueryThemeVO;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.dataset.vo.DataSQLBotAssistantVO;
import io.dataease.api.dataset.vo.SQLBotAssistanTable;
import io.dataease.dataset.manage.DatasetSQLBotManage;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class TrustedAnswerRuntimeContextService {

    private final AIQueryThemeManage aiQueryThemeManage;
    private final DatasetSQLBotManage datasetSQLBotManage;
    private final TrustedAnswerTraceStore traceStore;

    public TrustedAnswerRuntimeContextService(
            AIQueryThemeManage aiQueryThemeManage,
            DatasetSQLBotManage datasetSQLBotManage,
            TrustedAnswerTraceStore traceStore
    ) {
        this.aiQueryThemeManage = aiQueryThemeManage;
        this.datasetSQLBotManage = datasetSQLBotManage;
        this.traceStore = traceStore;
    }

    public TrustedAnswerTraceVO buildTrace(TrustedAnswerRequest request) {
        TrustedAnswerTraceVO trace = baseTrace();
        TrustedAnswerContextVO context = new TrustedAnswerContextVO();
        trace.setContext(context);

        if (request == null || StringUtils.isBlank(request.getQuestion())) {
            mark(trace, TrustedAnswerErrorCode.THEME_REQUIRED);
            traceStore.put(trace);
            return trace;
        }

        Long themeId = request.getThemeId();
        if (themeId == null) {
            mark(trace, TrustedAnswerErrorCode.THEME_REQUIRED);
            traceStore.put(trace);
            return trace;
        }

        AIQueryThemeVO theme;
        try {
            theme = aiQueryThemeManage.getTheme(themeId);
        } catch (Exception e) {
            mark(trace, TrustedAnswerErrorCode.THEME_NOT_VISIBLE);
            context.setThemeId(themeId);
            traceStore.put(trace);
            return trace;
        }

        context.setThemeId(themeId);
        if (theme != null) {
            context.setThemeName(theme.getName());
        }

        if (theme == null || !Boolean.TRUE.equals(theme.getStatus())) {
            mark(trace, TrustedAnswerErrorCode.THEME_NOT_VISIBLE);
            traceStore.put(trace);
            return trace;
        }

        List<Long> datasetIds = distinct(theme.getDatasetIds());
        List<Long> defaultDatasetIds = distinct(theme.getDefaultDatasetIds()).stream()
                .filter(datasetIds::contains)
                .collect(Collectors.toList());
        context.setDatasetIds(datasetIds);
        context.setDefaultDatasetIds(defaultDatasetIds);
        context.setDatasourceId(request.getDatasourceId());

        if (CollectionUtils.isEmpty(datasetIds)) {
            mark(trace, TrustedAnswerErrorCode.NO_AUTHORIZED_DATASET);
            traceStore.put(trace);
            return trace;
        }

        List<DataSQLBotAssistantVO> schema = datasetSQLBotManage.getDatasourceList(
                request.getDatasourceId(),
                null,
                joinIds(datasetIds)
        );

        if (CollectionUtils.isEmpty(schema)) {
            mark(trace, TrustedAnswerErrorCode.NO_VISIBLE_FIELD);
            traceStore.put(trace);
            return trace;
        }

        List<Long> datasourceIds = schema.stream()
                .map(DataSQLBotAssistantVO::getId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        context.setDatasourceIds(datasourceIds);
        context.setSchemaTableCount(countTables(schema));
        context.setVisibleFieldCount(countFields(schema));
        trace.getPermissionSteps().add("authorized-datasets-filtered");
        trace.getPermissionSteps().add("visible-schema-built");

        if (request.getDatasourceId() == null && datasourceIds.size() > 1) {
            mark(trace, TrustedAnswerErrorCode.MULTI_DATASOURCE_AMBIGUOUS);
            traceStore.put(trace);
            return trace;
        }

        if (request.getDatasourceId() == null && datasourceIds.size() == 1) {
            context.setDatasourceId(datasourceIds.get(0));
        }

        trace.setState(TrustedAnswerState.TRUSTED);
        traceStore.put(trace);
        return trace;
    }

    private static TrustedAnswerTraceVO baseTrace() {
        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId("ta-" + UUID.randomUUID());
        trace.setState(TrustedAnswerState.FAILED);
        return trace;
    }

    private static void mark(TrustedAnswerTraceVO trace, TrustedAnswerErrorCode errorCode) {
        trace.setState(errorCode.toError().getState());
        trace.setError(errorCode.toError());
    }

    private static List<Long> distinct(List<Long> values) {
        if (values == null) {
            return new ArrayList<>();
        }
        return new ArrayList<>(new LinkedHashSet<>(values));
    }

    private static String joinIds(List<Long> values) {
        return values.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(","));
    }

    private static int countTables(List<DataSQLBotAssistantVO> schema) {
        return schema.stream()
                .filter(Objects::nonNull)
                .map(DataSQLBotAssistantVO::getTables)
                .filter(Objects::nonNull)
                .mapToInt(List::size)
                .sum();
    }

    private static int countFields(List<DataSQLBotAssistantVO> schema) {
        return schema.stream()
                .filter(Objects::nonNull)
                .map(DataSQLBotAssistantVO::getTables)
                .filter(Objects::nonNull)
                .flatMap(List::stream)
                .map(SQLBotAssistanTable::getFields)
                .filter(Objects::nonNull)
                .mapToInt(List::size)
                .sum();
    }
}
```

- [ ] **Step 5: Run the runtime context test and verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest \
  test
```

Expected: PASS. The output includes `Tests run: 5, Failures: 0, Errors: 0`.

- [ ] **Step 6: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerRuntimeContextServiceTest.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerTraceStore.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimeContextService.java
git commit -m "feat: add trusted answer runtime context"
```

## Task 3: Add Trusted-Answer Server And Stub SSE Stream

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java`

- [ ] **Step 1: Extend the backend contract smoke test for server methods**

Append this test method to `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java` and add imports for `io.dataease.ai.query.server.AIQueryTrustedAnswerServer`, `jakarta.servlet.http.HttpServletResponse`, `java.lang.reflect.Method`, and `java.util.List` if they are not already present:

```java
    @Test
    void trustedAnswerServerShouldExposeTypedEndpoints() throws Exception {
        Method streamMethod = AIQueryTrustedAnswerServer.class.getMethod(
                "stream",
                TrustedAnswerRequest.class,
                HttpServletResponse.class
        );
        Method traceMethod = AIQueryTrustedAnswerServer.class.getMethod("trace", String.class);
        Method trustHealthMethod = AIQueryTrustedAnswerServer.class.getMethod("trustHealth");
        Method repairQueueMethod = AIQueryTrustedAnswerServer.class.getMethod("repairQueue");

        assertEquals(Void.TYPE, streamMethod.getReturnType());
        assertEquals(TrustedAnswerTraceVO.class, traceMethod.getReturnType());
        assertNotNull(trustHealthMethod.getReturnType());
        assertEquals(List.class, repairQueueMethod.getReturnType());
    }
```

- [ ] **Step 2: Run the contract test and verify it fails before the server exists**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest \
  test
```

Expected: FAIL during test compilation with errors containing `cannot find symbol` for `AIQueryTrustedAnswerServer`.

- [ ] **Step 3: Create the stub SQLBot SSE proxy**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java`:

```java
package io.dataease.ai.query.trusted;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.api.ai.query.vo.TrustedAnswerSseEventVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class TrustedAnswerStubSqlBotProxy {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void stream(TrustedAnswerTraceVO trace, HttpServletResponse response) throws IOException {
        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        write(response, TrustedAnswerSseEventVO.trace(trace.getTraceId(), trace.getState(), trace));

        if (trace.getState() != TrustedAnswerState.TRUSTED) {
            write(response, TrustedAnswerSseEventVO.error(trace.getTraceId(), trace.getError()));
            response.getWriter().flush();
            return;
        }

        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("text", "已基于可信问数上下文生成模拟答案。");
        answer.put("chart_type", "table");
        answer.put("trusted", true);
        write(response, TrustedAnswerSseEventVO.answer(trace.getTraceId(), answer));
        write(response, TrustedAnswerSseEventVO.done(trace.getTraceId(), trace.getState()));
        response.getWriter().flush();
    }

    private void write(HttpServletResponse response, TrustedAnswerSseEventVO event) throws IOException {
        response.getWriter().write("event: " + event.getEvent() + "\n");
        response.getWriter().write("data: " + objectMapper.writeValueAsString(event) + "\n\n");
    }
}
```

- [ ] **Step 4: Create the trusted-answer server**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java`:

```java
package io.dataease.ai.query.server;

import io.dataease.ai.query.trusted.TrustedAnswerOpsService;
import io.dataease.ai.query.trusted.TrustedAnswerRuntimeContextService;
import io.dataease.ai.query.trusted.TrustedAnswerStubSqlBotProxy;
import io.dataease.ai.query.trusted.TrustedAnswerTraceStore;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerRepairItemVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTrustHealthVO;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/ai/query/trusted-answer")
public class AIQueryTrustedAnswerServer {

    private final TrustedAnswerRuntimeContextService runtimeContextService;
    private final TrustedAnswerStubSqlBotProxy stubSqlBotProxy;
    private final TrustedAnswerTraceStore traceStore;
    private final TrustedAnswerOpsService opsService;

    public AIQueryTrustedAnswerServer(
            TrustedAnswerRuntimeContextService runtimeContextService,
            TrustedAnswerStubSqlBotProxy stubSqlBotProxy,
            TrustedAnswerTraceStore traceStore,
            TrustedAnswerOpsService opsService
    ) {
        this.runtimeContextService = runtimeContextService;
        this.stubSqlBotProxy = stubSqlBotProxy;
        this.traceStore = traceStore;
        this.opsService = opsService;
    }

    @PostMapping("/stream")
    public void stream(@RequestBody TrustedAnswerRequest request, HttpServletResponse response) throws IOException {
        TrustedAnswerTraceVO trace = runtimeContextService.buildTrace(request);
        stubSqlBotProxy.stream(trace, response);
    }

    @GetMapping("/trace/{traceId}")
    public TrustedAnswerTraceVO trace(@PathVariable("traceId") String traceId) {
        return traceStore.get(traceId);
    }

    @GetMapping("/trust-health")
    public TrustedAnswerTrustHealthVO trustHealth() {
        return opsService.trustHealth();
    }

    @GetMapping("/repair-queue")
    public List<TrustedAnswerRepairItemVO> repairQueue() {
        return opsService.repairQueue();
    }
}
```

- [ ] **Step 5: Run the contract test and capture the expected Ops DTO failure**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest \
  test
```

Expected: FAIL during test compilation with errors containing `TrustedAnswerOpsService`, `TrustedAnswerRepairItemVO`, or `TrustedAnswerTrustHealthVO`. That failure is expected because Task 4 creates those files.

Do not commit Task 3 yet. Continue to Task 4, then commit Task 3 and Task 4 together after all tests pass.

## Task 4: Add Trust Health And Repair Queue Backend Contracts

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTrustHealthVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerRepairItemVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerOpsService.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerOpsServiceTest.java`

- [ ] **Step 1: Write the failing ops service test**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerOpsServiceTest.java`:

```java
package io.dataease.ai.query;

import io.dataease.ai.query.trusted.TrustedAnswerOpsService;
import io.dataease.ai.query.trusted.TrustedAnswerTraceStore;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerRepairItemVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTrustHealthVO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrustedAnswerOpsServiceTest {

    @Test
    void trustHealthShouldUseTraceEvidenceOnly() {
        TrustedAnswerTraceStore traceStore = new TrustedAnswerTraceStore();
        traceStore.put(trace("ta-1", TrustedAnswerState.TRUSTED, null));
        traceStore.put(trace("ta-2", TrustedAnswerState.UNSAFE_BLOCKED, TrustedAnswerErrorCode.NO_VISIBLE_FIELD));

        TrustedAnswerOpsService service = new TrustedAnswerOpsService(traceStore);
        TrustedAnswerTrustHealthVO health = service.trustHealth();

        assertEquals(2, health.getTotalTraceCount());
        assertEquals(1, health.getTrustedTraceCount());
        assertEquals(1, health.getBlockingIssueCount());
        assertEquals(50, health.getTrustedRate());
        assertEquals(Boolean.FALSE, health.getTrusted());
    }

    @Test
    void repairQueueShouldContainNonTrustedTraceItems() {
        TrustedAnswerTraceStore traceStore = new TrustedAnswerTraceStore();
        traceStore.put(trace("ta-1", TrustedAnswerState.TRUSTED, null));
        traceStore.put(trace("ta-2", TrustedAnswerState.NO_AUTHORIZED_CONTEXT, TrustedAnswerErrorCode.NO_AUTHORIZED_DATASET));

        TrustedAnswerOpsService service = new TrustedAnswerOpsService(traceStore);
        List<TrustedAnswerRepairItemVO> repairItems = service.repairQueue();

        assertEquals(1, repairItems.size());
        assertEquals("ta-2", repairItems.get(0).getTraceId());
        assertEquals("NO_AUTHORIZED_DATASET", repairItems.get(0).getErrorCode());
        assertEquals("修复权限", repairItems.get(0).getPrimaryAction());
    }

    private static TrustedAnswerTraceVO trace(
            String traceId,
            TrustedAnswerState state,
            TrustedAnswerErrorCode errorCode
    ) {
        TrustedAnswerContextVO context = new TrustedAnswerContextVO();
        context.setThemeId(1001L);
        context.setThemeName("销售分析");

        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId(traceId);
        trace.setState(state);
        trace.setContext(context);
        if (errorCode != null) {
            trace.setError(errorCode.toError());
        }
        return trace;
    }
}
```

- [ ] **Step 2: Run the ops test and verify it fails before files exist**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.TrustedAnswerOpsServiceTest \
  test
```

Expected: FAIL during test compilation with errors containing `TrustedAnswerOpsService` or `TrustedAnswerTrustHealthVO`.

- [ ] **Step 3: Create Trust Health VO**

Create `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTrustHealthVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerTrustHealthVO implements Serializable {

    @Serial
    private static final long serialVersionUID = -2868750541880852416L;

    private Boolean trusted = false;

    @JsonProperty("total_trace_count")
    private Integer totalTraceCount = 0;

    @JsonProperty("trusted_trace_count")
    private Integer trustedTraceCount = 0;

    @JsonProperty("blocking_issue_count")
    private Integer blockingIssueCount = 0;

    @JsonProperty("trusted_rate")
    private Integer trustedRate = 0;
}
```

- [ ] **Step 4: Create Repair Item VO**

Create `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerRepairItemVO.java`:

```java
package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerRepairItemVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 5785323127622941370L;

    @JsonProperty("trace_id")
    private String traceId;

    private TrustedAnswerState state;

    @JsonProperty("theme_name")
    private String themeName;

    @JsonProperty("error_code")
    private String errorCode;

    private String message;

    private String cause;

    private String fix;

    @JsonProperty("primary_action")
    private String primaryAction;
}
```

- [ ] **Step 5: Create Ops Service**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerOpsService.java`:

```java
package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerRepairItemVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTrustHealthVO;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
public class TrustedAnswerOpsService {

    private final TrustedAnswerTraceStore traceStore;

    public TrustedAnswerOpsService(TrustedAnswerTraceStore traceStore) {
        this.traceStore = traceStore;
    }

    public TrustedAnswerTrustHealthVO trustHealth() {
        List<TrustedAnswerTraceVO> traces = traceStore.recent();
        int total = traces.size();
        int trustedCount = (int) traces.stream()
                .filter(trace -> trace.getState() == TrustedAnswerState.TRUSTED)
                .count();
        int blockingCount = total - trustedCount;

        TrustedAnswerTrustHealthVO health = new TrustedAnswerTrustHealthVO();
        health.setTotalTraceCount(total);
        health.setTrustedTraceCount(trustedCount);
        health.setBlockingIssueCount(blockingCount);
        health.setTrustedRate(total == 0 ? 0 : Math.round((trustedCount * 100f) / total));
        health.setTrusted(total > 0 && blockingCount == 0);
        return health;
    }

    public List<TrustedAnswerRepairItemVO> repairQueue() {
        return traceStore.recent().stream()
                .filter(trace -> trace.getState() != TrustedAnswerState.TRUSTED)
                .map(this::toRepairItem)
                .filter(Objects::nonNull)
                .toList();
    }

    private TrustedAnswerRepairItemVO toRepairItem(TrustedAnswerTraceVO trace) {
        TrustedAnswerRepairItemVO item = new TrustedAnswerRepairItemVO();
        item.setTraceId(trace.getTraceId());
        item.setState(trace.getState());
        if (trace.getContext() != null) {
            item.setThemeName(trace.getContext().getThemeName());
        }
        if (trace.getError() != null) {
            item.setErrorCode(trace.getError().getCode());
            item.setMessage(trace.getError().getMessage());
            item.setCause(trace.getError().getCause());
            item.setFix(trace.getError().getFix());
            item.setPrimaryAction(primaryAction(trace.getError().getCode()));
        }
        return item;
    }

    private static String primaryAction(String errorCode) {
        if ("NO_AUTHORIZED_DATASET".equals(errorCode) || "THEME_NOT_VISIBLE".equals(errorCode)) {
            return "修复权限";
        }
        if ("NO_VISIBLE_FIELD".equals(errorCode)) {
            return "修复列权限";
        }
        if ("MULTI_DATASOURCE_AMBIGUOUS".equals(errorCode)) {
            return "选择数据源";
        }
        if ("ROW_PERMISSION_REBUILD_FAILED".equals(errorCode)) {
            return "修复行权限";
        }
        if ("SQLBOT_CONFIG_MISSING".equals(errorCode) || "SQLBOT_UNAVAILABLE".equals(errorCode)) {
            return "检查 SQLBot";
        }
        return "查看 Trace";
    }
}
```

- [ ] **Step 6: Run all backend trusted-answer tests and verify they pass**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest,io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest,io.dataease.ai.query.TrustedAnswerOpsServiceTest \
  test
```

Expected: PASS. The output includes no failures for the three trusted-answer test classes.

- [ ] **Step 7: Commit Task 3 and Task 4 together**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/trusted/TrustedAnswerOpsService.java \
  dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryTrustedAnswerContractSmokeTest.java \
  dataease/core/core-backend/src/test/java/io/dataease/ai/query/TrustedAnswerOpsServiceTest.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerTrustHealthVO.java \
  dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/TrustedAnswerRepairItemVO.java
git commit -m "feat: expose trusted answer stream and ops"
```

## Task 5: Add Frontend Trusted-Answer API Wrapper

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiTrustedAnswer.ts`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-api-contract.spec.ts`

- [ ] **Step 1: Write the failing frontend API source contract**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-api-contract.spec.ts`:

```ts
/**
 * Executable source contract for trusted-answer frontend API wrapper.
 * Build and run with TRUSTED_ANSWER_API_CONTRACTS=1.
 */

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

const source = readSource('src/api/aiTrustedAnswer.ts')

const contractCases: ContractCase[] = [
  {
    name: 'trusted answer wrapper exposes canonical request and state contracts',
    run() {
      assertMatch(source, /export interface TrustedAnswerRequest/, 'request interface')
      assertMatch(source, /theme_id\?: string \| number/, 'theme_id contract')
      assertMatch(source, /datasource_id\?: string \| number/, 'datasource_id contract')
      assertMatch(source, /export type TrustedAnswerState =/, 'state union')
      assertMatch(source, /'UNSAFE_BLOCKED'/, 'unsafe state')
      assertMatch(source, /'NO_AUTHORIZED_CONTEXT'/, 'no authorized context state')
    }
  },
  {
    name: 'trusted answer wrapper calls DataEase backend endpoints only',
    run() {
      assertMatch(source, /\/ai\/query\/trusted-answer\/stream/, 'stream endpoint')
      assertMatch(source, /\/ai\/query\/trusted-answer\/trace\/\\$\\{traceId\\}/, 'trace endpoint')
      assertMatch(source, /\/ai\/query\/trusted-answer\/trust-health/, 'trust health endpoint')
      assertMatch(source, /\/ai\/query\/trusted-answer\/repair-queue/, 'repair queue endpoint')
      assertMatch(source, /fetch\(resolveFetchUrl\('\/ai\/query\/trusted-answer\/stream'\)/, 'stream fetch')
    }
  },
  {
    name: 'trusted answer wrapper parses SSE events and exposes sqlbot-compatible stream adapter',
    run() {
      assertMatch(source, /const parseTrustedAnswerSseMessage = /, 'SSE parser')
      assertMatch(source, /export const streamTrustedAnswer = /, 'stream function')
      assertMatch(source, /export const streamTrustedAnswerQuestion = /, 'sqlbot adapter')
      assertMatch(source, /callbacks\.onMessage\?\.\\(event\.data, event\\)/, 'message callback')
      assertMatch(source, /options\.onEvent\(\{[\s\S]*type: trustedEvent\.event/, 'legacy adapter event')
    }
  }
]

export const runTrustedAnswerApiContracts = () => {
  contractCases.forEach(contractCase => contractCase.run())
}

const shouldRun =
  typeof process !== 'undefined' && process?.env?.TRUSTED_ANSWER_API_CONTRACTS === '1'

if (shouldRun) {
  try {
    runTrustedAnswerApiContracts()
    console.log(`[trusted-answer-api] ${contractCases.length} contract checks passed`)
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    if (typeof process !== 'undefined') {
      process.exitCode = 1
    }
  }
}
```

- [ ] **Step 2: Run the frontend API contract and verify it fails before the wrapper exists**

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
```

Expected: FAIL with `ENOENT` for `src/api/aiTrustedAnswer.ts`.

- [ ] **Step 3: Create the trusted-answer frontend API wrapper**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiTrustedAnswer.ts`:

```ts
import request from '@/config/axios'
import { PATH_URL } from '@/config/axios/service'
import { configHandler } from '@/config/axios/refresh'
import type { SQLBotRequestContext, SQLBotStreamEvent } from '@/views/sqlbot/sqlbotDirect'

export type TrustedAnswerState =
  | 'TRUSTED'
  | 'NEEDS_CLARIFICATION'
  | 'PARTIAL'
  | 'UNSAFE_BLOCKED'
  | 'NO_AUTHORIZED_CONTEXT'
  | 'FAILED'

export interface TrustedAnswerRequest {
  question: string
  theme_id?: string | number
  datasource_id?: string | number
  model_id?: string
  chat_id?: string | number
}

export interface TrustedAnswerError {
  code: string
  state: TrustedAnswerState
  message: string
  cause: string
  fix: string
  trace_step: string
  retryable: boolean
  user_visible_message: string
  admin_visible_detail: string
}

export interface TrustedAnswerSseEvent {
  event: string
  trace_id?: string
  state?: TrustedAnswerState
  data?: any
  error?: TrustedAnswerError
  done?: boolean
}

export interface TrustedAnswerTrustHealth {
  trusted: boolean
  total_trace_count: number
  trusted_trace_count: number
  blocking_issue_count: number
  trusted_rate: number
}

export interface TrustedAnswerRepairItem {
  trace_id: string
  state: TrustedAnswerState
  theme_name?: string
  error_code?: string
  message?: string
  cause?: string
  fix?: string
  primary_action?: string
}

export interface TrustedAnswerStreamCallbacks {
  onOpen?: (response: Response) => void
  onMessage?: (data: string, event: TrustedAnswerSseEvent) => void
  onError?: (error: unknown) => void
  onClose?: () => void
  signal?: AbortSignal
}

const resolveFetchUrl = (url: string) => {
  const base = PATH_URL.endsWith('/') ? PATH_URL.slice(0, -1) : PATH_URL
  return `${base}${url}`
}

const parseTrustedAnswerSseMessage = (message: string): TrustedAnswerSseEvent | null => {
  const data: string[] = []
  let eventName = ''

  message.split('\n').forEach(line => {
    if (!line || line.startsWith(':')) return
    const index = line.indexOf(':')
    const field = index === -1 ? line : line.slice(0, index)
    const rawValue = index === -1 ? '' : line.slice(index + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue
    if (field === 'event') eventName = value
    if (field === 'data') data.push(value)
  })

  if (!data.length) {
    return eventName ? { event: eventName } : null
  }

  try {
    const parsed = JSON.parse(data.join('\n')) as TrustedAnswerSseEvent
    return {
      ...parsed,
      event: parsed.event || eventName
    }
  } catch (error) {
    return {
      event: eventName || 'message',
      data: data.join('\n')
    }
  }
}

const readTrustedAnswerSseStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: TrustedAnswerSseEvent) => void
) => {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    const messages = buffer.split('\n\n')
    buffer = messages.pop() || ''
    messages.forEach(message => {
      const event = parseTrustedAnswerSseMessage(message)
      if (event) onEvent(event)
    })
  }

  if (buffer.trim()) {
    const event = parseTrustedAnswerSseMessage(buffer)
    if (event) onEvent(event)
  }
}

export const streamTrustedAnswer = async (
  payload: TrustedAnswerRequest,
  callbacks: TrustedAnswerStreamCallbacks = {}
) => {
  const config = await configHandler({
    url: '/ai/query/trusted-answer/stream',
    method: 'post',
    headers: {},
    data: payload
  })
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...(config.headers as Record<string, string>)
  }

  try {
    const response = await fetch(resolveFetchUrl('/ai/query/trusted-answer/stream'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: callbacks.signal
    })

    if (!response.ok) throw new Error(await response.text())
    if (!response.body) throw new Error('ReadableStream is not supported by this browser.')

    callbacks.onOpen?.(response)
    await readTrustedAnswerSseStream(response.body.getReader(), event =>
      callbacks.onMessage?.(event.data, event)
    )
  } catch (error) {
    callbacks.onError?.(error)
    throw error
  } finally {
    callbacks.onClose?.()
  }
}

export const streamTrustedAnswerQuestion = async (
  context: SQLBotRequestContext,
  payload: Record<string, any>,
  options: {
    signal?: AbortSignal
    onEvent: (event: SQLBotStreamEvent) => void
  }
) => {
  await streamTrustedAnswer(
    {
      question: String(payload.question || ''),
      theme_id: payload.themeId || context.themeId,
      datasource_id: payload.datasourceId || payload.datasource_id || context.datasourceId,
      model_id: payload.modelId || payload.model_id,
      chat_id: payload.chatId || payload.chat_id
    },
    {
      signal: options.signal,
      onMessage: (_data, trustedEvent) => {
        options.onEvent({
          type: trustedEvent.event,
          content: trustedEvent.data,
          record_id: undefined,
          state: trustedEvent.state,
          trace_id: trustedEvent.trace_id,
          error: trustedEvent.error,
          done: trustedEvent.done
        } as SQLBotStreamEvent)
      }
    }
  )
}

export const getTrustedAnswerTrace = (traceId: string) =>
  request.get({ url: `/ai/query/trusted-answer/trace/${traceId}` })

export const getTrustedAnswerTrustHealth = () =>
  request.get({ url: '/ai/query/trusted-answer/trust-health' })

export const listTrustedAnswerRepairQueue = () =>
  request.get({ url: '/ai/query/trusted-answer/repair-queue' })
```

- [ ] **Step 4: Run the frontend API contract and verify it passes**

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
```

Expected: PASS with `[trusted-answer-api] 3 contract checks passed`.

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-frontend/src/api/aiTrustedAnswer.ts \
  dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-api-contract.spec.ts
git commit -m "feat: add trusted answer frontend api"
```

## Task 6: Route Main SQLBot Question Stream Through DataEase Backend

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-sqlbot-direct-guard.spec.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`

- [ ] **Step 1: Write the failing source guard**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-sqlbot-direct-guard.spec.ts`:

```ts
/**
 * Source guard: the main SQLBot question stream must go through DataEase backend.
 * Build and run with TRUSTED_ANSWER_SQLBOT_DIRECT_GUARD=1.
 */

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
  if (!pattern.test(source)) fail(`${label}: expected source to match ${pattern}`)
}

const assertNotMatch = (source: string, pattern: RegExp, label: string) => {
  if (pattern.test(source)) fail(`${label}: expected source not to match ${pattern}`)
}

const extractFunctionSource = (source: string, functionName: string) => {
  const declarationPattern = new RegExp(`export const ${functionName} = async`)
  const declarationMatch = declarationPattern.exec(source)
  if (!declarationMatch) fail(`${functionName}: declaration not found`)

  const bodyStart = source.indexOf('{', declarationMatch.index)
  if (bodyStart < 0) fail(`${functionName}: body not found`)

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(declarationMatch.index, index + 1)
    }
  }
  fail(`${functionName}: body end not found`)
}

const sqlbotDirectSource = readSource('src/views/sqlbot/sqlbotDirect.ts')
const streamQuestionSource = extractFunctionSource(sqlbotDirectSource, 'streamSQLBotQuestion')

const contractCases: ContractCase[] = [
  {
    name: 'main question stream delegates to trusted answer backend wrapper',
    run() {
      assertMatch(
        sqlbotDirectSource,
        /from '@\/api\/aiTrustedAnswer'/,
        'trusted answer import'
      )
      assertMatch(
        streamQuestionSource,
        /streamTrustedAnswerQuestion\(context, payload, options\)/,
        'trusted answer delegation'
      )
      assertNotMatch(
        streamQuestionSource,
        /fetchSqlBotWithFallback|\/chat\/question|buildAssistantHeaders/,
        'question stream direct SQLBot calls'
      )
    }
  }
]

export const runTrustedAnswerSqlbotDirectGuard = () => {
  contractCases.forEach(contractCase => contractCase.run())
}

const shouldRun =
  typeof process !== 'undefined' && process?.env?.TRUSTED_ANSWER_SQLBOT_DIRECT_GUARD === '1'

if (shouldRun) {
  try {
    runTrustedAnswerSqlbotDirectGuard()
    console.log(`[trusted-answer-sqlbot-direct-guard] ${contractCases.length} contract checks passed`)
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    if (typeof process !== 'undefined') {
      process.exitCode = 1
    }
  }
}
```

- [ ] **Step 2: Run the guard and verify it fails before migration**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
mkdir -p tmp/trusted-answer-sqlbot-direct-guard
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/trusted-answer-sqlbot-direct-guard.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/trusted-answer-sqlbot-direct-guard/trusted-answer-sqlbot-direct-guard.spec.js
TRUSTED_ANSWER_SQLBOT_DIRECT_GUARD=1 node tmp/trusted-answer-sqlbot-direct-guard/trusted-answer-sqlbot-direct-guard.spec.js
```

Expected: FAIL with `trusted answer import: expected source to match` or `question stream direct SQLBot calls`.

- [ ] **Step 3: Add the trusted-answer import to `sqlbotDirect.ts`**

Modify `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts` near the existing imports:

```ts
import { getAIQueryRuntimeModels, type AIQueryRuntimeModelsPayload } from '@/api/aiQueryTheme'
import { streamTrustedAnswerQuestion } from '@/api/aiTrustedAnswer'
```

Keep the existing `getAIQueryRuntimeModels` import; only add `streamTrustedAnswerQuestion`.

- [ ] **Step 4: Replace only `streamSQLBotQuestion(...)` body**

In `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`, replace the full body of `streamSQLBotQuestion` with:

```ts
export const streamSQLBotQuestion = async (
  context: SQLBotRequestContext,
  payload: Record<string, any>,
  options: {
    signal?: AbortSignal
    onEvent: (event: SQLBotStreamEvent) => void
  }
) => {
  await streamTrustedAnswerQuestion(context, payload, options)
}
```

Do not change `streamSQLBotRecordAnalysis`, `streamSQLBotRecordPredict`, chart, usage, history, or recommendation helpers in this task.

- [ ] **Step 5: Run the guard and verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
mkdir -p tmp/trusted-answer-sqlbot-direct-guard
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/trusted-answer-sqlbot-direct-guard.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/trusted-answer-sqlbot-direct-guard/trusted-answer-sqlbot-direct-guard.spec.js
TRUSTED_ANSWER_SQLBOT_DIRECT_GUARD=1 node tmp/trusted-answer-sqlbot-direct-guard/trusted-answer-sqlbot-direct-guard.spec.js
```

Expected: PASS with `[trusted-answer-sqlbot-direct-guard] 1 contract checks passed`.

- [ ] **Step 6: Run TypeScript check for touched API surface**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npm run ts:check
```

Expected: PASS, or FAIL only with already-known baseline errors outside `src/api/aiTrustedAnswer.ts` and `src/views/sqlbot/sqlbotDirect.ts`. If it fails, capture the exact first error and fix any error introduced by this task before committing.

- [ ] **Step 7: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-sqlbot-direct-guard.spec.ts \
  dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts
git commit -m "feat: route sqlbot question stream through dataease"
```

## Task 7: Add Minimal Trust Health / Repair Queue UI Panel

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/TrustedAnswerOverview.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/index.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts`

- [ ] **Step 1: Write the failing UI source contract**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts`:

```ts
/**
 * Source contract for query-config Trust Health / Repair Queue panel.
 * Build and run with TRUSTED_ANSWER_OVERVIEW_UI_CONTRACTS=1.
 */

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
  if (!pattern.test(source)) fail(`${label}: expected source to match ${pattern}`)
}

const overviewSource = readSource('src/views/system/query-config/components/TrustedAnswerOverview.vue')
const indexSource = readSource('src/views/system/query-config/index.vue')

const contractCases: ContractCase[] = [
  {
    name: 'query config renders trust health before resource/theme config tabs',
    run() {
      assertMatch(indexSource, /<trusted-answer-overview/, 'overview component usage')
      assertMatch(indexSource, /import TrustedAnswerOverview/, 'overview import')
      assertMatch(
        indexSource,
        /<trusted-answer-overview[\s\S]*<section class="general-config-content"/,
        'overview before config content'
      )
    }
  },
  {
    name: 'overview component consumes real trusted answer endpoints',
    run() {
      assertMatch(overviewSource, /getTrustedAnswerTrustHealth/, 'trust health API')
      assertMatch(overviewSource, /listTrustedAnswerRepairQueue/, 'repair queue API')
      assertMatch(overviewSource, /可信健康/, 'trust health title')
      assertMatch(overviewSource, /待修复答案/, 'repair queue title')
      assertMatch(overviewSource, /查看 Trace/, 'trace action')
    }
  }
]

export const runTrustedAnswerOverviewUiContracts = () => {
  contractCases.forEach(contractCase => contractCase.run())
}

const shouldRun =
  typeof process !== 'undefined' && process?.env?.TRUSTED_ANSWER_OVERVIEW_UI_CONTRACTS === '1'

if (shouldRun) {
  try {
    runTrustedAnswerOverviewUiContracts()
    console.log(`[trusted-answer-overview-ui] ${contractCases.length} contract checks passed`)
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    if (typeof process !== 'undefined') {
      process.exitCode = 1
    }
  }
}
```

- [ ] **Step 2: Run the UI source contract and verify it fails before the component exists**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
mkdir -p tmp/trusted-answer-overview-ui
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
TRUSTED_ANSWER_OVERVIEW_UI_CONTRACTS=1 node tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
```

Expected: FAIL with `ENOENT` for `TrustedAnswerOverview.vue`.

- [ ] **Step 3: Create the overview component**

Create `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/components/TrustedAnswerOverview.vue`:

```vue
<template>
  <section class="trusted-answer-overview" aria-label="可信答案层总览">
    <div class="trusted-answer-overview__health">
      <div class="trusted-answer-overview__heading">
        <span class="trusted-answer-overview__eyebrow">Trusted Answer Layer</span>
        <h2>可信健康</h2>
      </div>
      <div class="trusted-answer-overview__metrics">
        <article class="trusted-answer-overview__metric">
          <span class="trusted-answer-overview__metric-label">可信状态</span>
          <strong>{{ healthLabel }}</strong>
        </article>
        <article class="trusted-answer-overview__metric">
          <span class="trusted-answer-overview__metric-label">可信率</span>
          <strong>{{ health?.trusted_rate ?? 0 }}%</strong>
        </article>
        <article class="trusted-answer-overview__metric">
          <span class="trusted-answer-overview__metric-label">阻断问题</span>
          <strong>{{ health?.blocking_issue_count ?? 0 }}</strong>
        </article>
      </div>
    </div>

    <div class="trusted-answer-overview__queue">
      <div class="trusted-answer-overview__heading">
        <span class="trusted-answer-overview__eyebrow">Repair Queue</span>
        <h2>待修复答案</h2>
      </div>
      <div v-if="repairItems.length" class="trusted-answer-overview__repair-list">
        <article
          v-for="item in repairItems.slice(0, 3)"
          :key="item.trace_id"
          class="trusted-answer-overview__repair-item"
        >
          <div>
            <strong>{{ item.message || item.error_code || '待处理问题' }}</strong>
            <p>{{ item.fix || item.cause || '查看 Trace 定位原因' }}</p>
          </div>
          <button class="trusted-answer-overview__trace-button" type="button">
            查看 Trace
          </button>
        </article>
      </div>
      <div v-else class="trusted-answer-overview__empty">
        暂无待修复问题，运行一次可信问数后会在这里显示 Trace 证据。
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import {
  getTrustedAnswerTrustHealth,
  listTrustedAnswerRepairQueue,
  type TrustedAnswerRepairItem,
  type TrustedAnswerTrustHealth
} from '@/api/aiTrustedAnswer'

const health = ref<TrustedAnswerTrustHealth | null>(null)
const repairItems = ref<TrustedAnswerRepairItem[]>([])

const healthLabel = computed(() => {
  if (!health.value || health.value.total_trace_count === 0) {
    return '待验证'
  }
  return health.value.trusted ? '可信' : '需修复'
})

const loadOverview = async () => {
  const [healthResult, repairQueueResult] = await Promise.all([
    getTrustedAnswerTrustHealth(),
    listTrustedAnswerRepairQueue()
  ])
  health.value = (healthResult as any)?.data || healthResult || null
  const repairPayload = (repairQueueResult as any)?.data || repairQueueResult || []
  repairItems.value = Array.isArray(repairPayload) ? repairPayload : []
}

onMounted(() => {
  void loadOverview()
})
</script>

<style lang="less" scoped>
.trusted-answer-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 12px;
  margin-bottom: 12px;
}

.trusted-answer-overview__health,
.trusted-answer-overview__queue {
  border: 1px solid #e6ebf2;
  border-radius: 14px;
  background: #fff;
  padding: 14px 16px;
  box-sizing: border-box;
}

.trusted-answer-overview__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.trusted-answer-overview__heading h2 {
  margin: 0;
  color: #1f2733;
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
}

.trusted-answer-overview__eyebrow {
  color: #5f6f89;
  font-size: 13px;
}

.trusted-answer-overview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.trusted-answer-overview__metric {
  border-radius: 12px;
  background: #f5f8ff;
  padding: 12px;
}

.trusted-answer-overview__metric-label {
  display: block;
  color: #5f6f89;
  font-size: 14px;
  line-height: 22px;
}

.trusted-answer-overview__metric strong {
  display: block;
  margin-top: 4px;
  color: #1f2733;
  font-size: 20px;
  line-height: 28px;
}

.trusted-answer-overview__repair-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.trusted-answer-overview__repair-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 12px;
  background: #fff7ed;
  padding: 10px 12px;
}

.trusted-answer-overview__repair-item strong {
  color: #1f2733;
  font-size: 15px;
  line-height: 22px;
}

.trusted-answer-overview__repair-item p {
  margin: 2px 0 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 20px;
}

.trusted-answer-overview__trace-button {
  flex: 0 0 auto;
  border: 1px solid #2f6bff;
  border-radius: 10px;
  background: #fff;
  color: #2f6bff;
  font-size: 14px;
  line-height: 22px;
  padding: 7px 12px;
  cursor: pointer;
}

.trusted-answer-overview__empty {
  margin-top: 12px;
  border-radius: 12px;
  background: #f8fafc;
  color: #5f6f89;
  font-size: 14px;
  line-height: 22px;
  padding: 14px;
}

@media (max-width: 1180px) {
  .trusted-answer-overview {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 4: Render the overview above the existing config content**

Modify `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/system/query-config/index.vue`.

Add the component above `<section class="general-config-content">`:

```vue
      <trusted-answer-overview />

      <section class="general-config-content">
```

Add the import:

```ts
import TrustedAnswerOverview from './components/TrustedAnswerOverview.vue'
```

- [ ] **Step 5: Run the UI source contract and verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
mkdir -p tmp/trusted-answer-overview-ui
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
TRUSTED_ANSWER_OVERVIEW_UI_CONTRACTS=1 node tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
```

Expected: PASS with `[trusted-answer-overview-ui] 2 contract checks passed`.

- [ ] **Step 6: Run targeted lint on touched frontend files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/eslint \
  src/api/aiTrustedAnswer.ts \
  src/views/sqlbot/sqlbotDirect.ts \
  src/views/system/query-config/index.vue \
  src/views/system/query-config/components/TrustedAnswerOverview.vue
```

Expected: PASS with no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add \
  dataease/core/core-frontend/src/views/system/query-config/components/TrustedAnswerOverview.vue \
  dataease/core/core-frontend/src/views/system/query-config/index.vue \
  dataease/core/core-frontend/src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts
git commit -m "feat: add trusted answer overview panel"
```

## Task 8: Add Developer Quickstart And Final Verification

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/docs/smart-query-runtime-dev.md`

- [ ] **Step 1: Create the developer quickstart doc**

Create `/Users/chenliyong/AI/github/StarBI/dataease/docs/smart-query-runtime-dev.md`:

````markdown
# Smart Query Trusted Answer Runtime Developer Guide

This guide verifies the first DataEase Trusted Answer Layer vertical slice.

## Goal

A developer can run one mocked trusted-answer request, receive SSE events with a `trace_id`, inspect the trace, and run the no-leak contract tests in under 15 minutes.

## Runtime Ownership

Frontend sends only:

```json
{
  "question": "本月销售额是多少",
  "theme_id": "1001",
  "datasource_id": "2002",
  "model_id": "default",
  "chat_id": "3003"
}
```

DataEase backend owns:

- theme visibility and enabled-state validation
- authorized dataset resolution
- permission-filtered schema building through `DatasetSQLBotManage.getDatasourceList(...)`
- runtime state classification
- trace creation
- SQLBot adapter/proxy call

Frontend must not send raw schema, SQLBot assistant token, SQLBot domain, or arbitrary dataset scope as final authority.

## Runtime States

| State | Meaning |
| --- | --- |
| `TRUSTED` | Context is authorized and safe to call SQLBot. |
| `NEEDS_CLARIFICATION` | The backend needs a theme or datasource choice before SQL generation. |
| `PARTIAL` | A safe but incomplete answer can be returned. |
| `UNSAFE_BLOCKED` | The backend blocks SQLBot because context could be unsafe. |
| `NO_AUTHORIZED_CONTEXT` | The user has no authorized theme/resource scope. |
| `FAILED` | SQLBot config, proxy, or runtime failed. |

## Error Codes

| Code | State | Fix |
| --- | --- | --- |
| `THEME_REQUIRED` | `NEEDS_CLARIFICATION` | Select a business context or configure a default theme. |
| `SQLBOT_CONFIG_MISSING` | `FAILED` | Configure SQLBot or enable local stub mode. |
| `THEME_NOT_VISIBLE` | `NO_AUTHORIZED_CONTEXT` | Grant theme visibility or choose another theme. |
| `NO_AUTHORIZED_DATASET` | `NO_AUTHORIZED_CONTEXT` | Fix dataset/resource permissions. |
| `NO_VISIBLE_FIELD` | `UNSAFE_BLOCKED` | Fix column permissions or resource semantics. |
| `ROW_PERMISSION_REBUILD_FAILED` | `UNSAFE_BLOCKED` | Fix row permission expression and replay. |
| `MULTI_DATASOURCE_AMBIGUOUS` | `NEEDS_CLARIFICATION` | Select datasource or configure theme default datasource policy. |
| `SQLBOT_UNAVAILABLE` | `FAILED` | Check SQLBot health and retry. |

## 15-Minute Quickstart

### 1. Run backend trusted-answer tests

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest,io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest,io.dataease.ai.query.TrustedAnswerOpsServiceTest \
  test
```

Expected: all trusted-answer backend tests pass.

### 2. Run frontend trusted-answer contracts

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

mkdir -p tmp/trusted-answer-overview-ui
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
TRUSTED_ANSWER_OVERVIEW_UI_CONTRACTS=1 node tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
```

Expected:

- `[trusted-answer-api] 3 contract checks passed`
- `[trusted-answer-sqlbot-direct-guard] 1 contract checks passed`
- `[trusted-answer-overview-ui] 2 contract checks passed`

### 3. Run a local SSE request after the backend is running

```bash
curl -N \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -X POST \
  http://127.0.0.1:8100/ai/query/trusted-answer/stream \
  -d '{"question":"本月销售额是多少","theme_id":"1001","datasource_id":"2002"}'
```

Expected event shape:

```text
event: trace
data: {"event":"trace","trace_id":"ta-...","state":"TRUSTED",...}

event: answer
data: {"event":"answer","trace_id":"ta-...","state":"TRUSTED",...}

event: done
data: {"event":"done","trace_id":"ta-...","state":"TRUSTED","done":true}
```

If the theme or datasource fixture does not exist in the running database, the stream should still return a structured `error` event with one of the trusted-answer error codes.

## SQLBot Direct-Call Migration Matrix

| Current frontend helper | First vertical-slice behavior |
| --- | --- |
| `streamSQLBotQuestion` | Routed through `streamTrustedAnswerQuestion(...)` and DataEase backend. |
| `startSQLBotAssistantChat` | Existing behavior retained in this slice. |
| `getSQLBotRecommendQuestions` | Existing behavior retained in this slice. |
| `streamSQLBotRecordAnalysis` | Existing behavior retained in this slice. |
| chart/history/usage helpers | Existing behavior retained in this slice. |

The next slice should migrate recommendations and follow-up insight streams after this question-stream boundary is stable.

## Developer Acceptance

- Backend context tests prove unauthorized resources are blocked before SQLBot adapter calls.
- Frontend source guard proves the main question stream no longer posts directly to SQLBot.
- Query-config UI shows Trust Health and Repair Queue from DataEase backend.
- A developer can inspect a `trace_id` from SSE output.
````

- [ ] **Step 2: Run backend verification**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest,io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest,io.dataease.ai.query.TrustedAnswerOpsServiceTest \
  test
```

Expected: PASS for trusted-answer backend tests.

- [ ] **Step 3: Run frontend source-contract verification**

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

mkdir -p tmp/trusted-answer-overview-ui
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
TRUSTED_ANSWER_OVERVIEW_UI_CONTRACTS=1 node tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
```

Expected: PASS for all three frontend contracts.

- [ ] **Step 4: Run final formatting checks for touched files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/eslint \
  src/api/aiTrustedAnswer.ts \
  src/views/sqlbot/sqlbotDirect.ts \
  src/views/system/query-config/index.vue \
  src/views/system/query-config/components/TrustedAnswerOverview.vue
node_modules/.bin/stylelint \
  src/views/system/query-config/index.vue \
  src/views/system/query-config/components/TrustedAnswerOverview.vue
```

Expected: PASS with no errors. If stylelint changes files with `--fix`, rerun the source-contract checks.

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI
git add dataease/docs/smart-query-runtime-dev.md
git commit -m "docs: add trusted answer runtime quickstart"
```

## Self-Review Checklist

### Spec Coverage

- Trusted Answer Layer reframing: covered by backend package, frontend panel, docs.
- First vertical trust loop: covered by Tasks 2, 3, 4, 7.
- Backend-owned SQLBot runtime context assembly: covered by Tasks 2 and 3.
- Permission no-leak before SQLBot: covered by Task 2 tests and service design.
- Direct SQLBot frontend migration: covered by Task 6 for the main question stream.
- Fake learning status prevention: not modified in this vertical slice; existing resource-learning work remains in place. This plan avoids adding any new fake success status and makes trust evidence trace-based.
- Developer Contract: covered by Tasks 1, 5, 8.
- 15-minute quickstart: covered by Task 8.

### Intentional Non-Goals

- Full SQLBot recommendation, analysis, predict, chart, history, and usage endpoint migration is not in this first slice.
- Persistent database-backed trace storage is not in this first slice; `TrustedAnswerTraceStore` is in-memory to prove contracts.
- Full replay promotion workflow is not in this first slice; Repair Queue shows trace-backed blockers and primary actions.
- Full Quick BI parity UI is not in this first slice.

### Type Consistency

- Request field names: Java `themeId` serializes to JSON `theme_id`; frontend request uses `theme_id`.
- Runtime states: Java enum and TypeScript union use the same six values.
- Error payload fields: Java `traceStep`, `userVisibleMessage`, `adminVisibleDetail` serialize to `trace_step`, `user_visible_message`, `admin_visible_detail`.
- Trace field names: Java and frontend use `trace_id`, `state`, `context`, `error`.

### Verification Commands Summary

Backend:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl core/core-backend -am \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest,io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest,io.dataease.ai.query.TrustedAnswerOpsServiceTest \
  test
```

Frontend contracts:

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

mkdir -p tmp/trusted-answer-overview-ui
node_modules/.bin/esbuild \
  src/views/system/query-config/__tests__/trusted-answer-overview-ui-contract.spec.ts \
  --bundle \
  --platform=node \
  --outfile=tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
TRUSTED_ANSWER_OVERVIEW_UI_CONTRACTS=1 node tmp/trusted-answer-overview-ui/trusted-answer-overview-ui-contract.spec.js
```

Frontend lint:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/eslint \
  src/api/aiTrustedAnswer.ts \
  src/views/sqlbot/sqlbotDirect.ts \
  src/views/system/query-config/index.vue \
  src/views/system/query-config/components/TrustedAnswerOverview.vue
node_modules/.bin/stylelint \
  src/views/system/query-config/index.vue \
  src/views/system/query-config/components/TrustedAnswerOverview.vue
```
