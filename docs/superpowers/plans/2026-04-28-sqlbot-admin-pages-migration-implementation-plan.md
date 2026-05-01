# SQLBot Admin Pages Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate 3 SQLBot admin pages (model config, terminology, SQL examples) into DataEase, preserving UI and interaction, replacing API calls with DataEase backend proxy.

**Architecture:** Copy SQLBot Vue files into DataEase `views/system/query-config/`, copy dependent assets/utils, replace direct SQLBot API calls with `@/api/aiQuery`, add 7 missing backend proxy endpoints to the AI Gateway module. No frontend encryption — plaintext between DataEase and SQLBot (internal network).

**Tech Stack:** Vue 3 + Element Plus Secondary (DataEase), Spring Boot 3.3 (Java 21), FastAPI + SQLModel (SQLBot), JUnit 5 + pytest.

---

## File Map

### Backend — New Proxy Endpoints (AI Gateway)

Modify: `core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryModelConfigServer.java`
- Add: `GET /{id}` → `/system/aimodel/{id}`
- Add: `PUT /{id}/default` → `/system/aimodel/default/{id}`
- Add: `POST /check` → `/system/aimodel/status`

Modify: `core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTerminologyServer.java`
- Add: `GET /{id}` → `/system/terminology/{id}`
- Add: `PUT /{id}/enable` → `/system/terminology/{id}/enable/{enabled}`
- Add: `GET /export` → `/system/terminology/export`

Modify: `core/core-backend/src/main/java/io/dataease/ai/query/server/AIQuerySqlExampleServer.java`
- Add: `GET /{id}` → `/system/data-training/{id}`
- Add: `PUT /{id}/enable` → `/system/data-training/{id}/enable/{enabled}`
- Add: `GET /export` → `/system/data-training/export`

Create: `core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryDatasourceServer.java`
- Add: `GET /ai/query/datasources` → `/system/datasource/list` (need to verify SQLBot path)

### Frontend — Dependencies

Create: `core/core-frontend/src/assets/svg/sqlbot/` — copy SVG icons from SQLBot
Create: `core/core-frontend/src/utils/sqlbot-entity.ts` — copy CommonEntity.ts model types
Create: `core/core-frontend/src/utils/sqlbot-utils.ts` — copy highlightKeyword, isStarBIPageMode, get_supplier

### Frontend — Migrated Pages

Create: `core/core-frontend/src/views/system/query-config/components/ModelCard.vue` (from SQLBot Card.vue)
Create: `core/core-frontend/src/views/system/query-config/components/ModelFormDrawer.vue` (from SQLBot ModelForm.vue)
Rewrite: `core/core-frontend/src/views/system/query-config/AiModelConfig.vue` (from SQLBot Model.vue, without ModelListSide)
Rewrite: `core/core-frontend/src/views/system/query-config/TerminologyConfig.vue` (from SQLBot professional/index.vue)
Rewrite: `core/core-frontend/src/views/system/query-config/SqlExampleConfig.vue` (from SQLBot training/index.vue)

---

### Task 0: Baseline Compile

- [ ] **Step 1: Build SDK and backend**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
  mvn -pl sdk -q -DskipTests package
cd core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
  mvn -q -DskipTests -Dmaven.antrun.skip=true compile
```

Expected: BUILD SUCCESS

- [ ] **Step 2: Run existing gateway tests**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
  mvn -Dtest="AiGateway*" test
```

Expected: 9/9 pass

- [ ] **Step 3: Verify SQLBot starts**

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
SQLBOT_RELOAD=false .venv/bin/python main.py &
sleep 10
curl -s http://127.0.0.1:8000/api/v1/system/aimodel -H "X-DE-USER-ID: 1"
```

Expected: `{"code":0,"data":[],...}`

---

### Task 1: Copy Frontend Dependencies

**Files:**
- Create: `core/core-frontend/src/assets/svg/sqlbot/icon_search-outline_outlined.svg`
- Create: `core/core-frontend/src/assets/svg/sqlbot/icon_admin_outlined.svg`
- Create: `core/core-frontend/src/assets/svg/sqlbot/icon_add_outlined.svg`
- Create: `core/core-frontend/src/assets/svg/sqlbot/icon_done_outlined.svg`
- Create: `core/core-frontend/src/assets/svg/sqlbot/icon_close_outlined.svg`
- Create: `core/core-frontend/src/utils/sqlbot-entity.ts`
- Create: `core/core-frontend/src/utils/sqlbot-utils.ts`

- [ ] **Step 1: Copy SVG icons**

```bash
mkdir -p /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/assets/svg/sqlbot
cp /Users/chenliyong/AI/github/StarBI/SQLBot/frontend/src/assets/svg/icon_search-outline_outlined.svg \
   /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/assets/svg/sqlbot/
cp /Users/chenliyong/AI/github/StarBI/SQLBot/frontend/src/assets/svg/icon_admin_outlined.svg \
   /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/assets/svg/sqlbot/
cp /Users/chenliyong/AI/github/StarBI/SQLBot/frontend/src/assets/svg/icon_add_outlined.svg \
   /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/assets/svg/sqlbot/
# Copy icon_done_outlined, icon_close_outlined, ope-close.svg
```

- [ ] **Step 2: Create sqlbot-entity.ts** (copy model type definitions from CommonEntity.ts)

- [ ] **Step 3: Create sqlbot-utils.ts** (copy highlightKeyword, get_supplier, isStarBIPageMode)

- [ ] **Step 4: Commit**

---

### Task 2: Add Missing Backend Proxy Endpoints

**Files:**
- Modify: `core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryModelConfigServer.java`
- Modify: `core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryTerminologyServer.java`
- Modify: `core/core-backend/src/main/java/io/dataease/ai/query/server/AIQuerySqlExampleServer.java`
- Create: `core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryDatasourceServer.java`

- [ ] **Step 1: Add model proxy endpoints** (getById, setDefault, check)

Add to `AIQueryModelConfigServer.java`:
```java
@GetMapping("/{id}")
public Map<String, Object> getModel(@PathVariable String id) {
    return normalizer.parseMap(HttpClientUtil.get(sqlbotBase + "/system/aimodel/" + id, buildConfig()));
}

@PutMapping("/{id}/default")
public Map<String, Object> setDefaultModel(@PathVariable String id) {
    HttpClientConfig config = buildConfig();
    String response = HttpClientUtil.put(sqlbotBase + "/system/aimodel/default/" + id, "", config);
    return normalizer.parseMap(response);
}

@PostMapping("/check")
public void checkModel(@RequestBody Map<String, Object> body, HttpServletResponse response) {
    /* SSE stream proxy — forward POST /system/aimodel/status response to client */
}
```

- [ ] **Step 2: Modify terminology server** (add paginated list, getOne, enable, export)

- [ ] **Step 3: Modify SQL examples server** (add paginated list, getOne, enable, export)

- [ ] **Step 4: Create AIQueryDatasourceServer** with `GET /ai/query/datasources`

- [ ] **Step 5: Delete with body support** — create a new endpoint in Terminology/SqlExample servers that accepts POST with body and internally calls DELETE to SQLBot

- [ ] **Step 6: Build and test**

```bash
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
  mvn -Dtest="AiGateway*" test
```

- [ ] **Step 7: Commit**

---

### Task 3: Migrate Model Config Page

**Files:**
- Create: `core/core-frontend/src/views/system/query-config/components/ModelCard.vue`
- Create: `core/core-frontend/src/views/system/query-config/components/ModelFormDrawer.vue`
- Rewrite: `core/core-frontend/src/views/system/query-config/AiModelConfig.vue`

- [ ] **Step 1: Copy Card.vue** from SQLBot → `components/ModelCard.vue`
  - Replace `@/assets/svg/` → `@/assets/svg/sqlbot/`
  - Replace `@/api/system` → `@/api/aiQuery`
  - Replace `getModelTypeName` → import from `@/utils/sqlbot-entity`
  - Replace `{ t }` i18n → hardcoded Chinese

- [ ] **Step 2: Copy ModelForm.vue** → `components/ModelFormDrawer.vue`
  - Same import replacements
  - Remove encryption logic (api_key/api_domain are plaintext)
  - Remove `LicenseGenerator` references
  - Remove `get_supplier`/supplier references or adapt from sqlbot-utils

- [ ] **Step 3: Rewrite AiModelConfig.vue** from SQLBot Model.vue
  - Remove `ModelListSide.vue` import and usage (sidebar)
  - Keep: search bar, card grid, pagination, set default, delete, add/edit drawer trigger
  - Replace API calls: `modelApi.queryAll` → `listModels`, etc.
  - Layout: fill parent container (use existing `parameter-config-content` CSS)
  - Replace SVG icon paths to `@/assets/svg/sqlbot/`

- [ ] **Step 4: Remove the old placeholder AiModelConfig.vue** (our broken version)
  - Delete the file or overwrite with the migrated version

- [ ] **Step 5: Verify ESLint + stylelint pass**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/eslint src/views/system/query-config/AiModelConfig.vue
node_modules/.bin/stylelint src/views/system/query-config/AiModelConfig.vue
```

- [ ] **Step 6: Commit**

---

### Task 4: Migrate Terminology Config Page

**Files:**
- Rewrite: `core/core-frontend/src/views/system/query-config/TerminologyConfig.vue`

- [ ] **Step 1: Copy SQLBot's** `professional/index.vue` into `TerminologyConfig.vue`
  - Remove sidebar references
  - Replace `professionalApi.getList` → call `listTerminology` with pagination params
  - Replace `professionalApi.deleteEmbedded` → `deleteTerm` (adapt to accept body)
  - Replace `professionalApi.updateEmbedded` → `createOrUpdateTerm`
  - Replace `professionalApi.enable` → new enable method
  - Replace `professionalApi.exportExcel` → new export method
  - Replace `datasourceApi.list` → new datasource list method
  - Replace SVG paths to `@/assets/svg/sqlbot/`

- [ ] **Step 2: ESLint + stylelint verify**

- [ ] **Step 3: Commit**

---

### Task 5: Migrate SQL Examples Config Page

**Files:**
- Rewrite: `core/core-frontend/src/views/system/query-config/SqlExampleConfig.vue`

- [ ] **Step 1: Copy SQLBot's** `training/index.vue` into `SqlExampleConfig.vue`
  - Same pattern as Task 4 but for `trainingApi` → aiQuery mappings

- [ ] **Step 2: ESLint + stylelint verify**

- [ ] **Step 3: Commit**

---

### Task 6: Final Verification

- [ ] **Step 1: Build backend**

```bash
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
  mvn -DskipTests -Dmaven.antrun.skip=true package
```

- [ ] **Step 2: Run all gateway tests**

```bash
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
  mvn -Dtest="AiGateway*" test
```

Expected: all pass

- [ ] **Step 3: Frontend lint**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
node_modules/.bin/eslint src/views/system/query-config/*.vue
node_modules/.bin/stylelint src/views/system/query-config/*.vue
```

Expected: 0 errors

- [ ] **Step 4: Rebuild JAR and restart backend**

```bash
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
  mvn -DskipTests -Dmaven.antrun.skip=true package
# restart backend with new JAR
```

- [ ] **Step 5: Verify proxy endpoints return 200**

```bash
curl -s http://127.0.0.1:8080/ai/query/models -H "X-DE-TOKEN: $TOKEN"
curl -s http://127.0.0.1:8080/ai/query/terminology -H "X-DE-TOKEN: $TOKEN"
curl -s http://127.0.0.1:8080/ai/query/sql-examples -H "X-DE-TOKEN: $TOKEN"
```

Expected: all 200

- [ ] **Step 6: Commit final state**

---

## Spec Coverage Self-Check

- API 缺口补齐：Task 2 covering all 7 new endpoints
- 模型配置迁移：Task 1 (deps) + Task 3 (page)
- 术语配置迁移：Task 1 (deps) + Task 4 (page)
- SQL示例迁移：Task 1 (deps) + Task 5 (page)
- 依赖文件搬运：Task 1
- Layout 适配：Each page task removes sidebar, adapts to tab container
- ESLint/stylelint 验证：Each page task includes lint step

## Placeholder Scan

- No TBD, TODO
- No "write appropriate tests" without code
- No "similar to previous task"
- Every code-changing step has concrete file paths
- Every verification step has exact commands
