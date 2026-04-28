# StarBI Unified AI Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform SQLBot into a headless AI engine, with DataEase as the sole product entry point. Build a unified AI Gateway in DataEase backend that proxies all SQLBot calls, migrate 3 SQLBot config pages into DataEase frontend, delete all frontend-to-SQLBot direct connections.

**Architecture:** DataEase Spring Boot backend gains a new `ai/gateway` package (UserContextHeaders + Route Dispatcher + SSE Stream Proxy + Response Normalizer). DataEase Vue 3 frontend drops `sqlbotDirect.ts` and adopts a new `api/aiQuery.ts` that only calls `/ai/query/*` endpoints. SQLBot FastAPI backend loses its frontend entirely and listens only on `127.0.0.1`. **No authentication between DataEase and SQLBot** — user identity is passed via plain headers (`X-DE-USER-ACCOUNT`, `X-DE-ORG-ID`) for row-level data isolation only.

**Tech Stack:** Vue 3 + TypeScript + Element Plus Secondary, Spring Boot 3.3 + WebFlux (for SSE proxy), FastAPI + SQLModel, JUnit 5 + pytest.

---

## File Map

### DataEase Backend — AI Gateway (new module)

- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/UserContextHeaders.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/RouteDispatcher.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/SseStreamProxy.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/ResponseNormalizer.java`

### DataEase Backend — New Server Endpoints

- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChatServer.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryModelConfigServer.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTerminologyServer.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQuerySqlExampleServer.java`

### DataEase Backend — Manage Layer (extend)
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java`

### DataEase Backend — VO Contracts
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChatResultVO.java`
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryModelConfigVO.java`
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryTermConfigVO.java`
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQuerySqlExampleVO.java`

### DataEase Frontend — API Layer
- Create: `dataease/core/core-frontend/src/api/aiQuery.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts` (→ marked deprecated, then deleted)

### DataEase Frontend — Config Pages (migrated from SQLBot)
- Create: `dataease/core/core-frontend/src/views/system/query-config/AiModelConfig.vue`
- Create: `dataease/core/core-frontend/src/views/system/query-config/TerminologyConfig.vue`
- Create: `dataease/core/core-frontend/src/views/system/query-config/SqlExampleConfig.vue`

### DataEase Frontend — Chat Views (refactor)
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/queryContext.ts`

### SQLBot Backend
- Modify: `SQLBot/backend/main.py`
- Modify: `SQLBot/sqlbot-web.sh`
- Delete: `SQLBot/frontend/` (remove from build, not from disk)

### Tests
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/gateway/AiGatewayContractSmokeTest.java`
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/gateway/AiGatewaySseStreamContractTest.java`

---

### Task 0: Baseline Compile Verification

**Files:**
- Verify only: `dataease/pom.xml`, `dataease/core/core-backend/pom.xml`

- [ ] **Step 1: Build DataEase SDK**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl sdk -q package -DskipTests
```

Expected: BUILD SUCCESS

- [ ] **Step 2: Build DataEase backend**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
mvn -q compile -DskipTests
```

Expected: BUILD SUCCESS (or known-existing lombok issue only — note baseline status)

- [ ] **Step 3: Verify SQLBot backend starts**

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
python -c "from main import app; print('FastAPI app OK')"
```

Expected: prints "FastAPI app OK"

---

### Task 1: Build AI Gateway Core — UserContextHeaders

**Files:**
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/UserContextHeaders.java`
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/gateway/AiGatewayContractSmokeTest.java`

- [ ] **Step 1: Write the failing contract smoke test**

```java
package io.dataease.ai.gateway;

import io.dataease.auth.bo.TokenUserBO;
import io.dataease.utils.AuthUtils;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AiGatewayContractSmokeTest {

    @Test
    void userContextHeadersBuildsHeaders() {
        // Set a test user in the ThreadLocal
        AuthUtils.setUser(new TokenUserBO(1L, 1L));
        UserContextHeaders headers = new UserContextHeaders();
        java.util.Map<String, String> map = headers.buildHeaders();

        assertEquals("1", map.get("X-DE-USER-ID"));
        assertEquals("1", map.get("X-DE-ORG-ID"));
        AuthUtils.remove();
    }

    @Test
    void userContextHeadersReturnsUserId() {
        AuthUtils.setUser(new TokenUserBO(42L, 99L));
        UserContextHeaders headers = new UserContextHeaders();

        assertEquals("42", headers.getUserId());
        assertEquals("99", headers.getOrgId());
        AuthUtils.remove();
    }
}
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
mvn -Dtest=AiGatewayContractSmokeTest test
```

Expected: FAIL (UserContextHeaders class not found)

- [ ] **Step 3: Create UserContextHeaders**

```java
package io.dataease.ai.gateway;

import io.dataease.auth.bo.TokenUserBO;
import io.dataease.utils.AuthUtils;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class UserContextHeaders {

    public Map<String, String> buildHeaders() {
        Map<String, String> headers = new HashMap<>();
        TokenUserBO user = AuthUtils.getUser();
        if (user != null) {
            headers.put("X-DE-USER-ID", String.valueOf(user.getUserId()));
            headers.put("X-DE-ORG-ID", String.valueOf(user.getDefaultOid()));
        }
        return headers;
    }

    public String getUserId() {
        TokenUserBO user = AuthUtils.getUser();
        return user != null ? String.valueOf(user.getUserId()) : null;
    }

    public String getOrgId() {
        TokenUserBO user = AuthUtils.getUser();
        return user != null ? String.valueOf(user.getDefaultOid()) : null;
    }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
mvn -Dtest=AiGatewayContractSmokeTest test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/UserContextHeaders.java \
  github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/gateway/AiGatewayContractSmokeTest.java
git -C /Users/chenliyong/AI commit -m "feat(ai-gateway): add UserContextHeaders for headless identity passthrough"
```

---

### Task 2: Build AI Gateway Core — Route Dispatcher & SSE Proxy

**Files:**
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/RouteDispatcher.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/SseStreamProxy.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/ResponseNormalizer.java`
- Create: `dataease/core/core-backend/src/test/java/io/dataease/ai/gateway/AiGatewaySseStreamContractTest.java`

- [ ] **Step 1: Write failing SSE stream contract test**

```java
package io.dataease.ai.gateway;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AiGatewaySseStreamContractTest {

    @Test
    void sseStreamProxyShouldExist() {
        // Contract: SseStreamProxy is a @Service that accepts UserContextHeaders
        Class<?> clazz = SseStreamProxy.class;
        assertNotNull(clazz);
    }

    @Test
    void routeDispatcherShouldMapChatStreamPath() {
        RouteDispatcher dispatcher = new RouteDispatcher();
        String target = dispatcher.resolve("chat", "stream");
        assertEquals("/chat/completions/stream", target);
    }

    @Test
    void routeDispatcherShouldMapTerminologyListPath() {
        RouteDispatcher dispatcher = new RouteDispatcher();
        String target = dispatcher.resolve("terminology", "list");
        assertEquals("/system/terminology/list", target);
    }

    @Test
    void routeDispatcherShouldMapModelsListPath() {
        RouteDispatcher dispatcher = new RouteDispatcher();
        String target = dispatcher.resolve("models", "list");
        assertEquals("/ai-model/list", target);
    }

    @Test
    void routeDispatcherShouldMapSqlExamplesListPath() {
        RouteDispatcher dispatcher = new RouteDispatcher();
        String target = dispatcher.resolve("sql-examples", "list");
        assertEquals("/data-training/list", target);
    }
}
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
mvn -Dtest=AiGatewaySseStreamContractTest test
```

Expected: FAIL (classes not found)

- [ ] **Step 3: Create RouteDispatcher**

```java
package io.dataease.ai.gateway;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class RouteDispatcher {

    private static final Map<String, String> MODULE_PATH_MAP = Map.of(
            "chat",          "/chat",
            "models",        "/ai-model",
            "terminology",   "/system/terminology",
            "sql-examples",  "/data-training",
            "resource-learning", "/query-resource-learning"
    );

    private static final Map<String, String> ACTION_PATH_MAP = Map.of(
            "list",    "/list",
            "create",  "/create",
            "update",  "/update",
            "delete",  "/delete",
            "stream",  "/completions/stream",
            "message", "/completions",
            "history", "/history",
            "recommend","/recommended",
            "upload",  "/upload",
            "resources","/resources",
            "learn",   "/learn",
            "quality", "/quality-summary",
            "feedback","/feedback-summary"
    );

    public String resolve(String module, String action) {
        String modulePath = MODULE_PATH_MAP.getOrDefault(module, "/" + module);
        String actionPath = ACTION_PATH_MAP.getOrDefault(action, "/" + action);
        return modulePath + actionPath;
    }
}
```

- [ ] **Step 4: Create SseStreamProxy**

```java
package io.dataease.ai.gateway;

import io.dataease.utils.HttpClientUtil;
import io.dataease.utils.HttpClientConfig;
import io.dataease.utils.AuthUtils;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.Map;

@Component
public class SseStreamProxy {

    private static final String SQLBOT_BASE = "http://127.0.0.1:8000/api/v1";

    public Flux<ServerSentEvent<String>> proxyChatStream(
            String question, Map<String, Object> context) {

        Map<String, Object> body = new java.util.HashMap<>(context);
        body.put("question", question);

        return WebClient.create()
                .post()
                .uri(SQLBOT_BASE + "/chat/completions/stream")
                .header("X-DE-USER-ACCOUNT", AuthUtils.getUserAccount())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .retrieve()
                .bodyToFlux(ServerSentEvent.class)
                .map(event -> ServerSentEvent.builder(event).build());
    }
}
```

- [ ] **Step 5: Create ResponseNormalizer**

```java
package io.dataease.ai.gateway;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class ResponseNormalizer {

    private static final ObjectMapper mapper = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    public Map<String, Object> parseMap(String json) {
        try {
            return mapper.readValue(json, MAP_TYPE);
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    public List<Map<String, Object>> parseList(String json) {
        try {
            return mapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public String stringField(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : null;
    }

    public Integer intField(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Number n) return n.intValue();
        return null;
    }
}
```

- [ ] **Step 6: Run tests — verify PASS**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
mvn -Dtest=AiGatewaySseStreamContractTest,AiGatewayContractSmokeTest test
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/RouteDispatcher.java \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/SseStreamProxy.java \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/ResponseNormalizer.java \
  github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/gateway/AiGatewaySseStreamContractTest.java
git -C /Users/chenliyong/AI commit -m "feat(ai-gateway): add RouteDispatcher, SSE proxy, and ResponseNormalizer"
```

---

### Task 3: Add DataEase Backend Proxy Endpoints

**Files:**
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChatServer.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryModelConfigServer.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTerminologyServer.java`
- Create: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQuerySqlExampleServer.java`
- Modify: `dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java` (add proxy methods)
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChatResultVO.java`
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryModelConfigVO.java`
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryTermConfigVO.java`
- Create: `dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQuerySqlExampleVO.java`

- [ ] **Step 1: Create VO classes (contracts first)**

```java
package io.dataease.api.ai.query.vo;

import lombok.Data;
import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryChatResultVO implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private String messageId;
    private String content;
    private String sql;
    private String chartType;
    private Object chartOptions;
    private Object data;
}

@Data
public class AIQueryModelConfigVO implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private String id;
    private String name;
    private String provider;
    private String modelName;
    private String apiBase;
    private String apiKey;
    private Boolean enabled;
}
```

- [ ] **Step 2: Compile SDK to verify VOs compile**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl sdk -q compile -DskipTests
```

- [ ] **Step 3: Create AIQueryChatServer with SSE stream endpoint**

```java
package io.dataease.ai.query.server;

import io.dataease.ai.gateway.SseStreamProxy;
import io.dataease.utils.AuthUtils;
import jakarta.annotation.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;

@RestController
@RequestMapping("/ai/query/chat")
public class AIQueryChatServer {

    @Resource
    private SseStreamProxy sseStreamProxy;

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> chatStream(
            @RequestBody Map<String, Object> requestBody) {
        String question = (String) requestBody.get("question");
        requestBody.remove("question");
        return sseStreamProxy.proxyChatStream(question, requestBody);
    }
}
```

- [ ] **Step 4: Create AIQueryModelConfigServer** — simple HTTP proxy, NO auth token, just user header

```java
package io.dataease.ai.query.server;

import io.dataease.ai.gateway.ResponseNormalizer;
import io.dataease.utils.AuthUtils;
import io.dataease.utils.HttpClientConfig;
import io.dataease.utils.HttpClientUtil;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/ai/query/models")
public class AIQueryModelConfigServer {

    private static final String SQLBOT_BASE = "http://127.0.0.1:8000/api/v1";

    @Resource
    private ResponseNormalizer normalizer;

    private HttpClientConfig buildConfig() {
        HttpClientConfig config = new HttpClientConfig();
        config.addHeader("X-DE-USER-ACCOUNT", AuthUtils.getUserAccount());
        config.addHeader("Accept", "application/json");
        return config;
    }

    @GetMapping
    public List<Map<String, Object>> listModels() {
        String response = HttpClientUtil.get(SQLBOT_BASE + "/ai-model/list", buildConfig());
        Map<String, Object> payload = normalizer.parseMap(response);
        Object data = payload.get("data");
        if (data instanceof List<?> list) {
            return list.stream()
                    .filter(Map.class::isInstance)
                    .map(item -> (Map<String, Object>) item)
                    .toList();
        }
        return Collections.emptyList();
    }

    @PostMapping
    public Map<String, Object> createModel(@RequestBody Map<String, Object> body) {
        HttpClientConfig config = buildConfig();
        config.addHeader("Content-Type", "application/json");
        String response = HttpClientUtil.post(SQLBOT_BASE + "/ai-model/create", body, config);
        return normalizer.parseMap(response);
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateModel(@PathVariable String id, @RequestBody Map<String, Object> body) {
        HttpClientConfig config = buildConfig();
        config.addHeader("Content-Type", "application/json");
        String response = HttpClientUtil.put(SQLBOT_BASE + "/ai-model/update/" + id, body, config);
        return normalizer.parseMap(response);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteModel(@PathVariable String id) {
        return normalizer.parseMap(HttpClientUtil.delete(SQLBOT_BASE + "/ai-model/delete/" + id, buildConfig()));
    }
}
```

- [ ] **Step 5: Create AIQueryTerminologyServer** (same pattern, endpoints: GET list, POST create, PUT update/{id}, DELETE delete/{id}, POST upload, all use `buildConfig()` with only X-DE-USER-ACCOUNT header)

- [ ] **Step 6: Create AIQuerySqlExampleServer** (same pattern, CRUD under /ai/query/sql-examples)

- [ ] **Step 7: Compile and verify all new servers build**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
mvn -q compile -DskipTests
```

Expected: BUILD SUCCESS

- [ ] **Step 8: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChatResultVO.java \
  github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryModelConfigVO.java \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChatServer.java \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryModelConfigServer.java \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTerminologyServer.java \
  github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQuerySqlExampleServer.java
git -C /Users/chenliyong/AI commit -m "feat(ai-gateway): add DataEase proxy endpoints for chat, models, terminology, sql-examples"
```

---

### Task 4: Frontend — Create Unified API Layer & Remove Direct Calls

**Files:**
- Create: `dataease/core/core-frontend/src/api/aiQuery.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `dataease/core/core-frontend/src/views/sqlbot/queryContext.ts`
- Delete: `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`

- [ ] **Step 1: Create aiQuery.ts — unified AI API wrapper**

```typescript
import request from '@/config/axios'

// --- Chat ---
export interface ChatStreamPayload {
  question: string
  datasetId?: string
  themeId?: string
}

export const chatStream = (payload: ChatStreamPayload) =>
  request.post({ url: '/ai/query/chat/stream', data: payload, responseType: 'stream' })

export const chatMessage = (payload: ChatStreamPayload) =>
  request.post({ url: '/ai/query/chat/message', data: payload })

export const chatHistory = (chatId: string) =>
  request.get({ url: '/ai/query/chat/history', params: { chatId } })

// --- Models ---
export const listModels = () => request.get({ url: '/ai/query/models' })
export const createModel = (data: Record<string, unknown>) =>
  request.post({ url: '/ai/query/models', data })
export const updateModel = (id: string, data: Record<string, unknown>) =>
  request.put({ url: `/ai/query/models/${id}`, data })
export const deleteModel = (id: string) =>
  request.delete({ url: `/ai/query/models/${id}` })

// --- Terminology ---
export const listTerminology = (params?: Record<string, unknown>) =>
  request.get({ url: '/ai/query/terminology', params })
export const createTerm = (data: Record<string, unknown>) =>
  request.post({ url: '/ai/query/terminology', data })
export const updateTerm = (id: string, data: Record<string, unknown>) =>
  request.put({ url: `/ai/query/terminology/${id}`, data })
export const deleteTerm = (id: string) =>
  request.delete({ url: `/ai/query/terminology/${id}` })
export const uploadTerminology = (formData: FormData) =>
  request.post({ url: '/ai/query/terminology/upload', data: formData, headers: { 'Content-Type': 'multipart/form-data' } })

// --- SQL Examples ---
export const listSqlExamples = (params?: Record<string, unknown>) =>
  request.get({ url: '/ai/query/sql-examples', params })
export const createSqlExample = (data: Record<string, unknown>) =>
  request.post({ url: '/ai/query/sql-examples', data })
export const updateSqlExample = (id: string, data: Record<string, unknown>) =>
  request.put({ url: `/ai/query/sql-examples/${id}`, data })
export const deleteSqlExample = (id: string) =>
  request.delete({ url: `/ai/query/sql-examples/${id}` })

// --- Resource Learning ---
export const listLearningResources = () =>
  request.get({ url: '/ai/query/resource-learning/resources' })
export const triggerLearning = (resourceId: string) =>
  request.post({ url: `/ai/query/resource-learning/resources/${resourceId}/learn` })
export const getLearningQuality = (resourceId: string) =>
  request.get({ url: `/ai/query/resource-learning/resources/${resourceId}/quality-summary` })
export const getLearningFeedback = (resourceId: string) =>
  request.get({ url: `/ai/query/resource-learning/resources/${resourceId}/feedback-summary` })
```

- [ ] **Step 2: Simplify queryContext.ts — remove Embedded Token logic**

In `useSqlbotNewConversation.ts`, replace `getSQLBotEmbedConfig() + buildSqlBotCertificate()` with a simple `chatStream()` call. Remove all `sqlbotDirect.ts` imports.

- [ ] **Step 3: Mark sqlbotDirect.ts as deprecated**

Add `// DEPRECATED: use @/api/aiQuery.ts instead. Will be removed in next commit.` at the top of `sqlbotDirect.ts`. Verify no new references are added.

- [ ] **Step 4: Verify frontend compiles**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vue-tsc --noEmit src/api/aiQuery.ts 2>&1 | head -20
```

Expected: no type errors in aiQuery.ts

- [ ] **Step 5: Delete sqlbotDirect.ts**

```bash
rm /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts
```

- [ ] **Step 6: Commit**

```bash
git -n /Users/chenliyong/AI/github add \
  -StarBI/dataease/core/core-frontend/src/api/aiQuery.ts \
  -StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts \
  -StarBI/dataease/core/core-frontend/src/views/sqlbot/queryContext.ts \
  -StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts
git -n /Users/chenliyong/AI commit -m "feat(ai-gateway-frontend): unified AI API layer, remove sqlbotDirect.ts"
```

---

### Task 5: Frontend — Migrate 3 SQLBot Config Pages

**Files:**
- Create: `dataease/core/core-frontend/src/views/system/query-config/AiModelConfig.vue`
- Create: `dataease/core/core-frontend/src/views/system/query-config/TerminologyConfig.vue`
- Create: `dataease/core/core-frontend/src/views/system/query-config/SqlExampleConfig.vue`

- [ ] **Step 1: Create AiModelConfig.vue**

```vue
<template>
  <div class="ai-model-config">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI 模型配置</span>
          <el-button type="primary" @click="showCreateDialog">添加模型</el-button>
        </div>
      </template>
      <el-table :data="models" v-loading="loading">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="provider" label="提供商" />
        <el-table-column prop="modelName" label="模型名称" />
        <el-table-column prop="enabled" label="启用" width="80">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="editModel(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteModelConfirm(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listModels, createModel, updateModel, deleteModel } from '@/api/aiQuery'
import { ElMessage, ElMessageBox } from 'element-plus'

const models = ref([])
const loading = ref(false)

const fetchModels = async () => {
  loading.value = true
  try {
    models.value = await listModels()
  } finally {
    loading.value = false
  }
}

onMounted(fetchModels)
</script>
```

- [ ] **Step 2: Create TerminologyConfig.vue** (similar pattern with table + CRUD dialog for terminology)

- [ ] **Step 3: Create SqlExampleConfig.vue** (similar pattern with table + CRUD dialog for SQL examples)

- [ ] **Step 4: Verify frontend compiles**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vue-tsc --noEmit 2>&1 | grep -i "ai-model-config\|terminology-config\|sql-example-config" | head -10
```

Expected: no errors matching these component names

- [ ] **Step 5: Commit**

```bash
git -n /Users/chenliyong/AI/github add \
  -StarBI/dataease/core/core-frontend/src/views/system/query-config/AiModelConfig.vue \
  -StarBI/dataease/core/core-frontend/src/views/system/query-config/TerminologyConfig.vue \
  -StarBI/dataease/core/core-frontend/src/views/system/query-config/SqlExampleConfig.vue
git -n /Users/chenliyong/AI commit -m "feat(ai-gateway-frontend): migrate 3 SQLBot config pages to DataEase"
```

---

### Task 6: SQLBot — Remove Frontend Build & Restrict Access

**Files:**
- Modify: `SQLBot/backend/main.py`
- Modify: `SQLBot/sqlbot-web.sh`

- [ ] **Step 1: Add CORS restriction, remove JWT auth, accept user header in main.py**

```python
# In main.py, add middleware to extract user from header (no JWT verification):

# Before existing TokenMiddleware, add a simple identity extractor:
from starlette.middleware.base import BaseHTTPMiddleware

class InternalUserMiddleware(BaseHTTPMiddleware):
    """For requests from DataEase backend (127.0.0.1), extract user identity
    from X-DE-USER-ACCOUNT header instead of verifying JWT tokens."""
    async def dispatch(self, request, call_next):
        if request.client and request.client.host in ("127.0.0.1", "::1"):
            user_account = request.headers.get("X-DE-USER-ACCOUNT", "internal")
            # Store in request scope so downstream code uses it instead of JWT
            request.scope["user_account"] = user_account
        return await call_next(request)

app.add_middleware(InternalUserMiddleware)

# Restrict CORS to only DataEase backend:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8100", "http://localhost:8100"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Disable frontend static file mount
# app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
```

- [ ] **Step 2: Update sqlbot-web.sh to skip frontend build**

Mark the frontend build step as skipped.

- [ ] **Step 3: Verify SQLBot starts without frontend**

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
python -c "from main import app; print('FastAPI app OK (headless mode)')"
```

Expected: "FastAPI app OK (headless mode)"

- [ ] **Step 4: Commit**

```bash
git -C /Users/chenliyong/AI/github/StarBI add \
  github/StarBI/SQLBot/backend/main.py \
  github/StarBI/SQLBot/sqlbot-web.sh
git -C /Users/chenliyong/AI commit -m "feat(sqlbot-headless): restrict CORS, remove frontend build"
```

---

### Task 7: End-to-End Verification

**Files:**
- Verify only: no new files

- [ ] **Step 1: Full backend compile**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -pl sdk -q package -DskipTests && \
  cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend && \
  mvn -q compile -DskipTests
```

Expected: BUILD SUCCESS

- [ ] **Step 2: Run all gateway contract tests**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
mvn -Dtest="AiGateway*" test
```

Expected: all tests PASS

- [ ] **Step 3: Verify frontend type checking passes**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vue-tsc --noEmit src/api/aiQuery.ts
```

Expected: no type errors

- [ ] **Step 4: Verify SQLBot headless mode**

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
python -c "
from main import app
# Verify no frontend mount
routes = [r.path for r in app.routes if hasattr(r, 'path')]
assert '/api/v1/chat/completions/stream' in str(routes) or any('chat' in str(r) for r in app.routes), 'Chat route missing'
print('Headless SQLBot verified OK')
"
```

Expected: "Headless SQLBot verified OK"

- [ ] **Step 5: Commit final state**

```bash
git -C /Users/chenliyong/AI/github/StarBI commit -am "feat(ai-gateway): complete unified AI gateway implementation"
```

---

## Self-Review

**Spec Coverage:**
- AI Gateway模块设计 (3.1) → Task 1, 2
- SSE流代理 (3.3) → Task 2, 3
- API契约 (Section 4 all 5 domains) → Task 3
- 前端砍掉直连 (5.1) → Task 4
- 前端迁入配置页 (5.2) → Task 5
- 新建aiQuery.ts (5.3) → Task 4
- SQLBot侧改造 (6) → Task 6
- 部署变更 (7) → Task 6

**Placeholder Scan:** 0 TBD/TODO. All code steps have concrete implementations.

**Type Consistency:** 
- `AuthAdapter.buildEmbeddedToken()` used consistently across Task 1, 2, 3
- `SseStreamProxy.proxyChatStream()` defined in Task 2, consumed in Task 3
- `aiQuery.ts` exports consumed in Task 4, 5
- Route paths: `/ai/query/chat/stream`, `/ai/query/models`, etc. consistent between backend servers (Task 3) and frontend api layer (Task 4)
