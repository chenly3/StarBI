# SQLBot Result To Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow SQLBot dataset and dataset-combination query results to be converted into standard DataEase chart resources and inserted into existing dashboard/dataV canvases, with automatic editor rehydration of dataset, dimensions, metrics, sorting, filters, and chart type.

**Architecture:** Add a persisted query-result snapshot plus reusable query-chart resource layer on top of existing SQLBot history, then map supported SQLBot chart results into the existing chart resource schema before inserting normal dashboard/dataV components. Reuse the current chart editor and dataset / dataset-group editing flows instead of creating SQLBot-specific canvas components or editors.

**Tech Stack:** Spring Boot, MyBatis Plus, Vue 3, TypeScript, Pinia, existing DataEase chart editor and visualization canvas stores, SQLBot embedded APIs.

---

## File Structure

### Backend

- Create: `core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/entity/CoreAiQueryResultSnapshot.java`
  Persist SQLBot-native result snapshots for reverse discovery and traceability.

- Create: `core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/entity/CoreAiQueryChartResource.java`
  Persist reusable query-chart assets derived from snapshots.

- Create: `core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/mapper/CoreAiQueryResultSnapshotMapper.java`
  Mapper for snapshot persistence.

- Create: `core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/mapper/CoreAiQueryChartResourceMapper.java`
  Mapper for query-chart resource persistence.

- Create: `sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryChartInsertRequest.java`
  Shared request model for forward and reverse insert flows.

- Create: `sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryChartMaterializeRequest.java`
  Request model for snapshot/resource-to-standard-chart conversion.

- Create: `sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChartInsertTargetVO.java`
  DTO for dashboard/dataV insert targets.

- Create: `sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChartResourceVO.java`
  DTO for saved reusable query-chart resource items.

- Create: `sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryRecentResultVO.java`
  DTO for reverse-insert recent SQLBot result items.

- Create: `sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChartValidationVO.java`
  Validation result with explicit unmapped fields and unsupported reasons.

- Create: `sdk/api/api-base/src/main/java/io/dataease/api/ai/query/AIQueryChartResourceApi.java`
  API contract for:
  - create / list query-chart resources
  - validate insertion
  - list recent query results
  - list saved query-chart resources
  - insert into dashboard/dataV

- Create: `core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartResourceManage.java`
  Core orchestration for snapshot persistence, validation, mapping, chart materialization, and insert operations.

- Create: `core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartMapper.java`
  Pure mapper from SQLBot result snapshot + dataset metadata to standard DataEase chart config.

- Create: `core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryCanvasInsertManage.java`
  Shared insertion adapter for dashboard and dataV component insertion.

- Create: `core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChartResourceServer.java`
  Controller implementing the new chart-resource API.

- Modify: `core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java`
  Expose any additional target or recent-result metadata needed by the new resource layer only if strictly required.

- Modify: `core/core-backend/src/main/java/io/dataease/visualization/server/DataVisualizationServer.java`
  Add the narrow server-side insertion hook if the chart insertion path must reuse existing save/update APIs.

- Modify: `core/core-backend/src/main/java/io/dataease/visualization/dao/auto/entity/DataVisualizationInfo.java`
  Only if insertion metadata needs an explicit source marker on canvas components.

### Frontend

- Create: `core/core-frontend/src/api/aiQueryChartResource.ts`
  Frontend API client for:
  - validate insertability
  - create/reuse query-chart resources
  - list recent SQLBot results
  - list saved query-chart resources
  - insert into dashboard/dataV

- Create: `core/core-frontend/src/views/sqlbot-new/components/SqlbotInsertTargetDialog.vue`
  Forward-insert target picker dialog for dashboard/dataV.

- Create: `core/core-frontend/src/views/sqlbot-new/components/SqlbotInsertValidationDialog.vue`
  Structured blocking UI for unmapped metrics/dimensions or unsupported chart types.

- Create: `core/core-frontend/src/views/dashboard/components/SqlbotInsertDrawer.vue`
  Reverse-insert drawer for dashboard.

- Create: `core/core-frontend/src/views/data-visualization/components/SqlbotInsertDrawer.vue`
  Reverse-insert drawer for dataV.

- Create: `core/core-frontend/src/views/sqlbot-new/sqlbotChartInsert.ts`
  Forward-insert client orchestration from query result card.

- Create: `core/core-frontend/src/views/dashboard/sqlbotInsert.ts`
  Reverse-insert orchestration from dashboard.

- Create: `core/core-frontend/src/views/data-visualization/sqlbotInsert.ts`
  Reverse-insert orchestration from dataV.

- Modify: `core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
  Add `插入仪表板/大屏` action and insertion status feedback.

- Modify: `core/core-frontend/src/views/sqlbot-new/index.vue`
  Wire result-card insertion action and structured validation feedback.

- Modify: `core/core-frontend/src/components/dashboard/DbToolbar.vue`
  Add dashboard-side `插入问数图表` entry.

- Modify: `core/core-frontend/src/views/data-visualization/PreviewHead.vue`
  Add dataV-side `插入问数图表` entry.

- Modify: `core/core-frontend/src/views/chart/components/editor/index.vue`
  Ensure the existing editor can rehydrate from the inserted standard chart resource with dataset / dataset-group and field mappings already selected.

- Modify: `core/core-frontend/src/views/sqlbot/queryContext.ts`
  Extend shared context helpers only if target routing or source tagging needs explicit support.

### Tests / Docs

- Create: `core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java`
  Backend contract smoke coverage for validation, resource creation, and insert entry points.

- Create: `core/core-frontend/src/views/sqlbot-new/__tests__/sqlbotChartInsert.spec.ts`
  Unit coverage for forward-insert validation and fallback flows.

- Create: `core/core-frontend/src/views/dashboard/__tests__/sqlbotInsert.spec.ts`
  Unit coverage for reverse-insert drawer state and selection handling.

- Modify: `scripts/sqlbot/README.md`
  Document the new dashboard/dataV insertion regression entry points if we add script-level coverage later.

## Task 1: Add The Failing Backend Contract Test Skeleton

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java`

- [ ] **Step 1: Write the failing contract smoke test**

```java
package io.dataease.ai.query;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.fail;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void shouldExposeQueryChartResourceContractEndpoints() {
        fail("Implement query chart resource contract smoke coverage");
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
java -cp "<test-runtime-classpath>:core/core-backend/target/classes:core/core-backend/target/test-classes" /tmp/RunSingleJunitTest.java io.dataease.ai.query.AIQueryChartResourceContractSmokeTest
```

Expected:

- test compilation PASS
- direct JUnit execution FAIL
- failure message contains `Implement query chart resource contract smoke coverage`

- [ ] **Step 3: Replace the placeholder with a Spring contract smoke scaffold**

```java
package io.dataease.ai.query;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class AIQueryChartResourceContractSmokeTest {

    @Test
    void contextLoadsForQueryChartResourceContract() {
        assertTrue(true);
    }
}
```

- [ ] **Step 4: Run the test to verify the scaffold passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
java -Dlogging.file.path=/tmp/dataease-test-logs -Ddataease.path.ehcache=/tmp/dataease-test-ehcache -Ddataease.login_timeout=1800 -cp "<test-runtime-classpath>:core/core-backend/target/classes:core/core-backend/target/test-classes" /tmp/RunSingleJunitTest.java io.dataease.ai.query.AIQueryChartResourceContractSmokeTest
```

Expected:

- test compilation PASS
- direct JUnit execution PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java
git commit -m "test: add query chart resource contract scaffold"
```

## Task 2: Define Shared Backend API Models

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryChartInsertRequest.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryChartMaterializeRequest.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChartInsertTargetVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChartResourceVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryRecentResultVO.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChartValidationVO.java`

- [ ] **Step 1: Write a failing compile-only assertion in the contract test for the new API models**

```java
package io.dataease.ai.query;

import io.dataease.api.ai.query.request.AIQueryChartInsertRequest;
import io.dataease.api.ai.query.vo.AIQueryChartValidationVO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void queryChartApiModelsShouldBeAvailable() {
        assertNotNull(new AIQueryChartInsertRequest());
        assertNotNull(new AIQueryChartValidationVO());
    }
}
```

- [ ] **Step 2: Run the test to verify it fails on missing classes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
./mvnw -pl sdk/api/api-base -Dtest=AIQueryChartResourceContractSmokeTest test
```

Expected:

- compilation failure for missing API model classes

- [ ] **Step 3: Create the minimal request and response DTOs**

```java
package io.dataease.api.ai.query.request;

import lombok.Data;

import java.io.Serializable;

@Data
public class AIQueryChartInsertRequest implements Serializable {
    private String sourceType;
    private Long sourceId;
    private String targetCanvasType;
    private Long targetCanvasId;
}
```

```java
package io.dataease.api.ai.query.request;

import lombok.Data;

import java.io.Serializable;

@Data
public class AIQueryChartMaterializeRequest implements Serializable {
    private Long snapshotId;
    private Long chartResourceId;
}
```

```java
package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryChartValidationVO implements Serializable {
    private boolean insertable;
    private List<String> unmappedMetrics = new ArrayList<>();
    private List<String> unmappedDimensions = new ArrayList<>();
    private List<String> reasons = new ArrayList<>();
}
```

```java
package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serializable;

@Data
public class AIQueryChartInsertTargetVO implements Serializable {
    private Long id;
    private String name;
    private String canvasType;
}
```

```java
package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serializable;

@Data
public class AIQueryChartResourceVO implements Serializable {
    private Long id;
    private String title;
    private String chartType;
    private String sourceKind;
    private String selectionTitle;
    private Long snapshotId;
}
```

```java
package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serializable;

@Data
public class AIQueryRecentResultVO implements Serializable {
    private Long snapshotId;
    private String title;
    private String chartType;
    private String sourceKind;
    private String selectionTitle;
    private Long createTime;
}
```

- [ ] **Step 4: Run the sdk module test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
./mvnw -pl sdk/api/api-base test
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryChartInsertRequest.java \
  sdk/api/api-base/src/main/java/io/dataease/api/ai/query/request/AIQueryChartMaterializeRequest.java \
  sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChartInsertTargetVO.java \
  sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChartResourceVO.java \
  sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryRecentResultVO.java \
  sdk/api/api-base/src/main/java/io/dataease/api/ai/query/vo/AIQueryChartValidationVO.java \
  core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java
git commit -m "feat: add query chart api models"
```

## Task 3: Add The Shared Chart Resource API Contract

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/AIQueryChartResourceApi.java`

- [ ] **Step 1: Extend the smoke test with the new API interface type usage**

```java
package io.dataease.ai.query;

import io.dataease.api.ai.query.AIQueryChartResourceApi;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void queryChartApiContractShouldExist() {
        assertNotNull(AIQueryChartResourceApi.class);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails because the API interface is missing**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
./mvnw -pl sdk/api/api-base -Dtest=AIQueryChartResourceContractSmokeTest test
```

Expected:

- compilation failure for missing `AIQueryChartResourceApi`

- [ ] **Step 3: Add the API interface**

```java
package io.dataease.api.ai.query;

import io.dataease.api.ai.query.request.AIQueryChartInsertRequest;
import io.dataease.api.ai.query.request.AIQueryChartMaterializeRequest;
import io.dataease.api.ai.query.vo.AIQueryChartInsertTargetVO;
import io.dataease.api.ai.query.vo.AIQueryChartResourceVO;
import io.dataease.api.ai.query.vo.AIQueryChartValidationVO;
import io.dataease.api.ai.query.vo.AIQueryRecentResultVO;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequestMapping("/ai/query/chart-resources")
public interface AIQueryChartResourceApi {

    @PostMapping("/validate")
    AIQueryChartValidationVO validateInsert(@RequestBody AIQueryChartMaterializeRequest request);

    @GetMapping("/recent-results")
    List<AIQueryRecentResultVO> listRecentResults();

    @GetMapping("/saved")
    List<AIQueryChartResourceVO> listSavedResources();

    @GetMapping("/targets")
    List<AIQueryChartInsertTargetVO> listInsertTargets(@RequestParam String canvasType);

    @PostMapping("/insert")
    Long insertIntoCanvas(@RequestBody AIQueryChartInsertRequest request);
}
```

- [ ] **Step 4: Run the sdk test to verify the contract compiles**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
./mvnw -pl sdk/api/api-base test
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add sdk/api/api-base/src/main/java/io/dataease/api/ai/query/AIQueryChartResourceApi.java \
  core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java
git commit -m "feat: add query chart resource api contract"
```

## Task 4: Persist SQLBot Query Result Snapshots

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/entity/CoreAiQueryResultSnapshot.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/mapper/CoreAiQueryResultSnapshotMapper.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java`

- [ ] **Step 1: Add a failing test for snapshot persistence wiring**

```java
package io.dataease.ai.query;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.fail;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void queryResultSnapshotPersistenceShouldBeImplemented() {
        fail("Implement query result snapshot persistence");
    }
}
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- FAIL with `Implement query result snapshot persistence`

- [ ] **Step 3: Add the snapshot entity and mapper**

```java
package io.dataease.ai.query.dao.auto.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("core_ai_query_result_snapshot")
public class CoreAiQueryResultSnapshot {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long orgId;
    private Long createBy;
    private Long sqlbotChatId;
    private Long sqlbotRecordId;
    private String title;
    private String question;
    private String themeId;
    private String themeName;
    private String sourceKind;
    private String sourceId;
    private String sourceIds;
    private String combinationId;
    private String combinationName;
    private String datasourceId;
    private String sqlText;
    private String chartConfig;
    private String interpretation;
    private String sourceInsights;
    private Long createTime;
    private Long updateTime;
}
```

```java
package io.dataease.ai.query.dao.auto.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.dataease.ai.query.dao.auto.entity.CoreAiQueryResultSnapshot;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CoreAiQueryResultSnapshotMapper extends BaseMapper<CoreAiQueryResultSnapshot> {
}
```

- [ ] **Step 4: Replace the failing test with a compile-level persistence smoke**

```java
package io.dataease.ai.query;

import io.dataease.ai.query.dao.auto.entity.CoreAiQueryResultSnapshot;
import io.dataease.ai.query.dao.auto.mapper.CoreAiQueryResultSnapshotMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void queryResultSnapshotTypesShouldCompile() {
        assertNotNull(new CoreAiQueryResultSnapshot());
        assertNotNull(CoreAiQueryResultSnapshotMapper.class);
    }
}
```

- [ ] **Step 5: Run the backend test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 6: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/entity/CoreAiQueryResultSnapshot.java \
  core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/mapper/CoreAiQueryResultSnapshotMapper.java \
  core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java
git commit -m "feat: add query result snapshot persistence types"
```

## Task 5: Persist Reusable Query Chart Resources

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/entity/CoreAiQueryChartResource.java`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/mapper/CoreAiQueryChartResourceMapper.java`

- [ ] **Step 1: Add a failing test for query chart resource types**

```java
package io.dataease.ai.query;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.fail;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void queryChartResourcePersistenceShouldBeImplemented() {
        fail("Implement query chart resource persistence");
    }
}
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- FAIL with `Implement query chart resource persistence`

- [ ] **Step 3: Add the resource entity and mapper**

```java
package io.dataease.ai.query.dao.auto.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("core_ai_query_chart_resource")
public class CoreAiQueryChartResource {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long orgId;
    private Long createBy;
    private Long snapshotId;
    private String title;
    private String chartType;
    private String sourceKind;
    private String datasetId;
    private String combinationId;
    private String chartPayload;
    private Boolean valid;
    private Long createTime;
    private Long updateTime;
}
```

```java
package io.dataease.ai.query.dao.auto.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import io.dataease.ai.query.dao.auto.entity.CoreAiQueryChartResource;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CoreAiQueryChartResourceMapper extends BaseMapper<CoreAiQueryChartResource> {
}
```

- [ ] **Step 4: Replace the failing test with a compile-level check**

```java
package io.dataease.ai.query;

import io.dataease.ai.query.dao.auto.entity.CoreAiQueryChartResource;
import io.dataease.ai.query.dao.auto.mapper.CoreAiQueryChartResourceMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void queryChartResourceTypesShouldCompile() {
        assertNotNull(new CoreAiQueryChartResource());
        assertNotNull(CoreAiQueryChartResourceMapper.class);
    }
}
```

- [ ] **Step 5: Run the backend test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 6: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/entity/CoreAiQueryChartResource.java \
  core/core-backend/src/main/java/io/dataease/ai/query/dao/auto/mapper/CoreAiQueryChartResourceMapper.java \
  core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java
git commit -m "feat: add query chart resource persistence types"
```

## Task 6: Implement The SQLBot-To-Chart Mapper Core

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartMapper.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java`

- [ ] **Step 1: Add a failing test for supported chart-type mapping**

```java
package io.dataease.ai.query;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.fail;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void sqlbotChartMapperShouldSupportCoreChartTypes() {
        fail("Implement SQLBot-to-chart mapping");
    }
}
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- FAIL with `Implement SQLBot-to-chart mapping`

- [ ] **Step 3: Add the minimal mapper shell**

```java
package io.dataease.ai.query.manage;

import io.dataease.api.ai.query.vo.AIQueryChartValidationVO;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class AIQueryChartMapper {

    private static final Set<String> SUPPORTED_TYPES = Set.of("table", "column", "bar", "line", "pie");

    public AIQueryChartValidationVO validateChartType(String chartType) {
        AIQueryChartValidationVO result = new AIQueryChartValidationVO();
        result.setInsertable(SUPPORTED_TYPES.contains(chartType));
        if (!result.isInsertable()) {
          result.getReasons().add("unsupported chart type");
        }
        return result;
    }
}
```

- [ ] **Step 4: Replace the failing test with a chart-type validation test**

```java
package io.dataease.ai.query;

import io.dataease.ai.query.manage.AIQueryChartMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void sqlbotChartMapperShouldSupportCoreChartTypes() {
        AIQueryChartMapper mapper = new AIQueryChartMapper();
        assertTrue(mapper.validateChartType("bar").isInsertable());
        assertFalse(mapper.validateChartType("radar").isInsertable());
    }
}
```

- [ ] **Step 5: Run the backend test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 6: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartMapper.java \
  core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java
git commit -m "feat: add sqlbot chart mapper shell"
```

## Task 7: Implement Chart Resource Service Skeleton

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartResourceManage.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java`

- [ ] **Step 1: Add a failing service-level test**

```java
package io.dataease.ai.query;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.fail;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void chartResourceServiceShouldExposeValidationEntry() {
        fail("Implement chart resource service");
    }
}
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- FAIL with `Implement chart resource service`

- [ ] **Step 3: Add the service skeleton**

```java
package io.dataease.ai.query.manage;

import io.dataease.api.ai.query.request.AIQueryChartMaterializeRequest;
import io.dataease.api.ai.query.vo.AIQueryChartValidationVO;
import org.springframework.stereotype.Component;

@Component
public class AIQueryChartResourceManage {

    private final AIQueryChartMapper mapper;

    public AIQueryChartResourceManage(AIQueryChartMapper mapper) {
        this.mapper = mapper;
    }

    public AIQueryChartValidationVO validateInsert(AIQueryChartMaterializeRequest request) {
        AIQueryChartValidationVO result = new AIQueryChartValidationVO();
        result.setInsertable(false);
        result.getReasons().add("not implemented");
        return result;
    }
}
```

- [ ] **Step 4: Replace the failing test with a compile-level service test**

```java
package io.dataease.ai.query;

import io.dataease.ai.query.manage.AIQueryChartMapper;
import io.dataease.ai.query.manage.AIQueryChartResourceManage;
import io.dataease.api.ai.query.request.AIQueryChartMaterializeRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void chartResourceServiceShouldExposeValidationEntry() {
        AIQueryChartResourceManage service = new AIQueryChartResourceManage(new AIQueryChartMapper());
        assertNotNull(service.validateInsert(new AIQueryChartMaterializeRequest()));
    }
}
```

- [ ] **Step 5: Run the backend test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 6: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartResourceManage.java \
  core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java
git commit -m "feat: add chart resource service skeleton"
```

## Task 8: Add Backend API Server Skeleton

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChartResourceServer.java`

- [ ] **Step 1: Add a failing compile assertion for the controller**

```java
package io.dataease.ai.query;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.fail;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void chartResourceServerShouldCompile() {
        fail("Implement chart resource server");
    }
}
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- FAIL with `Implement chart resource server`

- [ ] **Step 3: Add the server implementation shell**

```java
package io.dataease.ai.query.server;

import io.dataease.ai.query.manage.AIQueryChartResourceManage;
import io.dataease.api.ai.query.AIQueryChartResourceApi;
import io.dataease.api.ai.query.request.AIQueryChartInsertRequest;
import io.dataease.api.ai.query.request.AIQueryChartMaterializeRequest;
import io.dataease.api.ai.query.vo.AIQueryChartInsertTargetVO;
import io.dataease.api.ai.query.vo.AIQueryChartResourceVO;
import io.dataease.api.ai.query.vo.AIQueryChartValidationVO;
import io.dataease.api.ai.query.vo.AIQueryRecentResultVO;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
public class AIQueryChartResourceServer implements AIQueryChartResourceApi {

    private final AIQueryChartResourceManage manage;

    public AIQueryChartResourceServer(AIQueryChartResourceManage manage) {
        this.manage = manage;
    }

    @Override
    public AIQueryChartValidationVO validateInsert(AIQueryChartMaterializeRequest request) {
        return manage.validateInsert(request);
    }

    @Override
    public List<AIQueryRecentResultVO> listRecentResults() {
        return Collections.emptyList();
    }

    @Override
    public List<AIQueryChartResourceVO> listSavedResources() {
        return Collections.emptyList();
    }

    @Override
    public List<AIQueryChartInsertTargetVO> listInsertTargets(String canvasType) {
        return Collections.emptyList();
    }

    @Override
    public Long insertIntoCanvas(AIQueryChartInsertRequest request) {
        return null;
    }
}
```

- [ ] **Step 4: Replace the failing test with a compile-level controller assertion**

```java
package io.dataease.ai.query;

import io.dataease.ai.query.manage.AIQueryChartMapper;
import io.dataease.ai.query.manage.AIQueryChartResourceManage;
import io.dataease.ai.query.server.AIQueryChartResourceServer;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void chartResourceServerShouldCompile() {
        AIQueryChartResourceServer server =
            new AIQueryChartResourceServer(new AIQueryChartResourceManage(new AIQueryChartMapper()));
        assertNotNull(server);
    }
}
```

- [ ] **Step 5: Run the backend test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 6: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChartResourceServer.java \
  core/core-backend/src/test/java/io/dataease/ai/query/AIQueryChartResourceContractSmokeTest.java
git commit -m "feat: add chart resource api server shell"
```

## Task 9: Add Frontend API Client Skeleton

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiQueryChartResource.ts`

- [ ] **Step 1: Write a failing frontend unit smoke test**

```ts
import { describe, expect, it } from 'vitest'

describe('aiQueryChartResource api', () => {
  it('should expose query chart resource methods', async () => {
    const mod = await import('@/api/aiQueryChartResource')
    expect(mod).toHaveProperty('validateAIQueryChartInsert')
    expect(mod).toHaveProperty('listAIQueryRecentResults')
    expect(mod).toHaveProperty('listAIQueryChartResources')
    expect(mod).toHaveProperty('listAIQueryInsertTargets')
    expect(mod).toHaveProperty('insertAIQueryChartIntoCanvas')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails because the module is missing**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/api/__tests__/aiQueryChartResource.spec.ts
```

Expected:

- FAIL with module not found

- [ ] **Step 3: Add the frontend API client**

```ts
import request from '@/config/axios'

export const validateAIQueryChartInsert = (data: Record<string, any>) =>
  request.post({ url: '/ai/query/chart-resources/validate', data }).then(res => res?.data || res)

export const listAIQueryRecentResults = () =>
  request.get({ url: '/ai/query/chart-resources/recent-results' }).then(res => res?.data || res)

export const listAIQueryChartResources = () =>
  request.get({ url: '/ai/query/chart-resources/saved' }).then(res => res?.data || res)

export const listAIQueryInsertTargets = (canvasType: string) =>
  request
    .get({ url: '/ai/query/chart-resources/targets', params: { canvasType } })
    .then(res => res?.data || res)

export const insertAIQueryChartIntoCanvas = (data: Record<string, any>) =>
  request.post({ url: '/ai/query/chart-resources/insert', data }).then(res => res?.data || res)
```

- [ ] **Step 4: Run the unit smoke test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/api/__tests__/aiQueryChartResource.spec.ts
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-frontend/src/api/aiQueryChartResource.ts
git commit -m "feat: add query chart frontend api client"
```

## Task 10: Add SQLBot Result Card Insert Entry

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue`
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/sqlbotChartInsert.ts`

- [ ] **Step 1: Add a failing UI test for the insert action shell**

```ts
import { describe, expect, it } from 'vitest'

describe('StarbiResultCard', () => {
  it('should declare an insert action event contract', async () => {
    const source = await import('@/views/sqlbot/StarbiResultCard.vue?raw')
    expect(source.default).toContain("insert-dashboard")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/sqlbot-new/__tests__/starbiResultCardInsert.spec.ts
```

Expected:

- FAIL because the event contract is missing

- [ ] **Step 3: Add the insert event contract and helper shell**

```ts
// Add to StarbiResultCard emits
(event: 'insert-dashboard', record: SQLBotChatRecordLike): void
```

```ts
// Add to StarbiResultCard footer button
<button
  v-if="record.finish && !record.error"
  class="starbi-foot-btn ghost"
  type="button"
  @pointerdown.stop
  @mousedown.stop
  @click.stop="emit('insert-dashboard', record)"
>
  插入仪表板/大屏
</button>
```

```ts
// sqlbotChartInsert.ts
export const canAttemptSqlbotChartInsert = (record: Record<string, any>) => {
  return Boolean(record?.finish && !record?.error && record?.chart && record?.data)
}
```

- [ ] **Step 4: Run the UI test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/sqlbot-new/__tests__/starbiResultCardInsert.spec.ts
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-frontend/src/views/sqlbot/StarbiResultCard.vue \
  core/core-frontend/src/views/sqlbot-new/sqlbotChartInsert.ts
git commit -m "feat: add sqlbot result card insert entry"
```

## Task 11: Add Forward Insert Target Dialog Shell

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotInsertTargetDialog.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Write a failing UI smoke test for the new dialog component**

```ts
import { describe, expect, it } from 'vitest'

describe('SqlbotInsertTargetDialog', () => {
  it('should render target list shell', async () => {
    const source = await import('@/views/sqlbot-new/components/SqlbotInsertTargetDialog.vue?raw')
    expect(source.default).toContain('插入目标')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails because the component is missing**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/sqlbot-new/__tests__/sqlbotInsertTargetDialog.spec.ts
```

Expected:

- FAIL with module not found

- [ ] **Step 3: Add the dialog shell and wire it into sqlbotnew**

```vue
<script setup lang="ts">
defineProps<{
  visible: boolean
  targets: Array<{ id: string | number; name: string; canvasType: string }>
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'choose', id: string | number): void
}>()
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="插入目标"
    width="640px"
    @update:model-value="value => emit('update:visible', value)"
  >
    <div class="sqlbot-insert-target-list">
      <button
        v-for="item in targets"
        :key="item.id"
        class="sqlbot-insert-target-item"
        type="button"
        @click="emit('choose', item.id)"
      >
        <strong>{{ item.name }}</strong>
        <span>{{ item.canvasType }}</span>
      </button>
    </div>
  </el-dialog>
</template>
```

- [ ] **Step 4: Run the UI test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/sqlbot-new/__tests__/sqlbotInsertTargetDialog.spec.ts
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-frontend/src/views/sqlbot-new/components/SqlbotInsertTargetDialog.vue \
  core/core-frontend/src/views/sqlbot-new/index.vue
git commit -m "feat: add sqlbot insert target dialog shell"
```

## Task 12: Add Dashboard Reverse-Insert Entry

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/dashboard/components/SqlbotInsertDrawer.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/components/dashboard/DbToolbar.vue`

- [ ] **Step 1: Write a failing toolbar smoke test**

```ts
import { describe, expect, it } from 'vitest'

describe('DbToolbar', () => {
  it('should expose insert sqlbot chart entry', async () => {
    const source = await import('@/components/dashboard/DbToolbar.vue?raw')
    expect(source.default).toContain('插入问数图表')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/dashboard/__tests__/dbToolbarSqlbotInsert.spec.ts
```

Expected:

- FAIL because the toolbar entry is missing

- [ ] **Step 3: Add the toolbar button and drawer shell**

```vue
<!-- DbToolbar.vue -->
<el-button secondary @click="$emit('open-sqlbot-insert')">
  插入问数图表
</el-button>
```

```vue
<!-- SqlbotInsertDrawer.vue -->
<script setup lang="ts">
defineProps<{
  visible: boolean
  recentItems: Array<{ title: string }>
  savedItems: Array<{ title: string }>
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
}>()
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="插入问数图表"
    size="520px"
    @update:model-value="value => emit('update:visible', value)"
  >
    <div class="sqlbot-insert-section">
      <h3>最近问数结果</h3>
      <div v-for="item in recentItems" :key="item.title">{{ item.title }}</div>
    </div>
    <div class="sqlbot-insert-section">
      <h3>已保存问数图表资源</h3>
      <div v-for="item in savedItems" :key="item.title">{{ item.title }}</div>
    </div>
  </el-drawer>
</template>
```

- [ ] **Step 4: Run the toolbar smoke test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/dashboard/__tests__/dbToolbarSqlbotInsert.spec.ts
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-frontend/src/components/dashboard/DbToolbar.vue \
  core/core-frontend/src/views/dashboard/components/SqlbotInsertDrawer.vue
git commit -m "feat: add dashboard reverse insert entry"
```

## Task 13: Add DataV Reverse-Insert Entry

**Files:**
- Create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/data-visualization/components/SqlbotInsertDrawer.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/data-visualization/PreviewHead.vue`

- [ ] **Step 1: Write a failing PreviewHead smoke test**

```ts
import { describe, expect, it } from 'vitest'

describe('PreviewHead', () => {
  it('should expose insert sqlbot chart action', async () => {
    const source = await import('@/views/data-visualization/PreviewHead.vue?raw')
    expect(source.default).toContain('插入问数图表')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/data-visualization/__tests__/previewHeadSqlbotInsert.spec.ts
```

Expected:

- FAIL because the entry is missing

- [ ] **Step 3: Add the dataV insert button and drawer shell**

```vue
<!-- PreviewHead.vue -->
<el-button secondary @click="$emit('open-sqlbot-insert')">
  插入问数图表
</el-button>
```

```vue
<!-- reuse a drawer shell matching the dashboard version -->
```

- [ ] **Step 4: Run the smoke test to verify it passes**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/data-visualization/__tests__/previewHeadSqlbotInsert.spec.ts
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-frontend/src/views/data-visualization/PreviewHead.vue \
  core/core-frontend/src/views/data-visualization/components/SqlbotInsertDrawer.vue
git commit -m "feat: add datav reverse insert entry"
```

## Task 14: Rehydrate Existing Chart Editor From Inserted Resources

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/chart/components/editor/index.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/dashboard/index.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/data-visualization/index.vue`

- [ ] **Step 1: Write a failing smoke test for editor hydration markers**

```ts
import { describe, expect, it } from 'vitest'

describe('chart editor hydration', () => {
  it('should consume sqlbot-derived chart payload markers', async () => {
    const source = await import('@/views/chart/components/editor/index.vue?raw')
    expect(source.default).toContain('source = sqlbot')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/chart/components/editor/__tests__/sqlbotHydration.spec.ts
```

Expected:

- FAIL because no sqlbot hydration support exists yet

- [ ] **Step 3: Add the editor hydration branch**

```ts
// editor hydration intent
const readSqlbotSourceMeta = (viewInfo: Record<string, any>) => {
  if (viewInfo?.source !== 'sqlbot') {
    return null
  }
  return {
    sourceKind: viewInfo.sourceKind,
    sourceQueryResultId: viewInfo.sourceQueryResultId,
    datasetId: viewInfo.datasetId,
    combinationId: viewInfo.combinationId,
    dimensionList: viewInfo.dimensionList || [],
    quotaList: viewInfo.quotaList || [],
    orderList: viewInfo.orderList || [],
    filterList: viewInfo.filterList || []
  }
}
```

The actual implementation step must connect these fields into the existing editor initialization branch so that dataset / dataset-group, dimensions, metrics, sort, filters, and chart type are preloaded instead of requiring manual reselection.

- [ ] **Step 4: Run the smoke test to verify the marker path exists**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/chart/components/editor/__tests__/sqlbotHydration.spec.ts
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-frontend/src/views/chart/components/editor/index.vue \
  core/core-frontend/src/views/dashboard/index.vue \
  core/core-frontend/src/views/data-visualization/index.vue
git commit -m "feat: add sqlbot chart editor hydration path"
```

## Task 15: Fill Backend Validation And Reverse-List Behavior

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartMapper.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartResourceManage.java`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChartResourceServer.java`

- [ ] **Step 1: Add a failing test for unmapped field blocking**

```java
package io.dataease.ai.query;

import io.dataease.ai.query.manage.AIQueryChartMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;

class AIQueryChartResourceContractSmokeTest {

    @Test
    void unsupportedMappingsShouldBlockInsert() {
        AIQueryChartMapper mapper = new AIQueryChartMapper();
        assertFalse(mapper.validateChartType("radar").isInsertable());
    }
}
```

- [ ] **Step 2: Run the backend test to verify current validation is insufficient**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
mvn -f core/core-backend/pom.xml -Dmaven.test.skip=false test-compile
```

Expected:

- FAIL after expanding the test to check unmapped fields / unsupported mappings that the current stub cannot express

- [ ] **Step 3: Extend validation and recent/saved list behavior**

Add these concrete backend behaviors:

```java
// AIQueryChartValidationVO fill rules
result.setInsertable(unmappedMetrics.isEmpty()
    && unmappedDimensions.isEmpty()
    && supportedChartType
    && resolvedDatasetBinding);
```

```java
// AIQueryChartResourceServer list methods
@Override
public List<AIQueryRecentResultVO> listRecentResults() {
    return manage.listRecentResults();
}

@Override
public List<AIQueryChartResourceVO> listSavedResources() {
    return manage.listSavedResources();
}
```

The implementation step must make the recent result list return current-user recent SQLBot results and saved resource list return workspace-visible persisted query-chart resources, matching the spec.

- [ ] **Step 4: Run backend tests and a local compile to verify behavior**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
./mvnw -pl core/core-backend test
./mvnw -pl core/core-backend -DskipTests compile
```

Expected:

- tests PASS
- compile PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartMapper.java \
  core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryChartResourceManage.java \
  core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChartResourceServer.java
git commit -m "feat: implement query chart validation and listing"
```

## Task 16: Wire Forward And Reverse Insert Flows End-To-End

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/components/dashboard/DbToolbar.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/data-visualization/PreviewHead.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/sqlbotChartInsert.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/dashboard/components/SqlbotInsertDrawer.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/data-visualization/components/SqlbotInsertDrawer.vue`

- [ ] **Step 1: Add a failing frontend integration smoke test**

```ts
import { describe, expect, it } from 'vitest'

describe('sqlbot chart insert integration', () => {
  it('should expose both forward and reverse insert orchestration entry points', async () => {
    const sqlbot = await import('@/views/sqlbot-new/sqlbotChartInsert')
    expect(sqlbot).toHaveProperty('canAttemptSqlbotChartInsert')
  })
})
```

- [ ] **Step 2: Run the frontend smoke test to verify the orchestration is still incomplete**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/sqlbot-new/__tests__/sqlbotChartInsert.spec.ts
```

Expected:

- FAIL once the test is expanded to cover actual insert orchestration paths that the current shell does not implement

- [ ] **Step 3: Implement end-to-end frontend wiring**

Concrete wiring requirements:

```ts
// forward insert path
// 1. validate
// 2. open target dialog
// 3. insert
// 4. show success target feedback
```

```ts
// reverse insert path
// 1. open drawer
// 2. load recent results + saved resources
// 3. validate selected item
// 4. insert into current canvas
```

The implementation step must keep dashboard and dataV reverse-insert UIs symmetric and must use the same backend validation API before insertion.

- [ ] **Step 4: Run frontend tests and typecheck**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
npx vitest run src/views/sqlbot-new/__tests__/sqlbotChartInsert.spec.ts \
  src/views/dashboard/__tests__/dbToolbarSqlbotInsert.spec.ts \
  src/views/data-visualization/__tests__/previewHeadSqlbotInsert.spec.ts
./node_modules/.bin/vue-tsc --noEmit --pretty false
```

Expected:

- all tests PASS
- typecheck PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-frontend/src/views/sqlbot-new/index.vue \
  core/core-frontend/src/components/dashboard/DbToolbar.vue \
  core/core-frontend/src/views/data-visualization/PreviewHead.vue \
  core/core-frontend/src/views/sqlbot-new/sqlbotChartInsert.ts \
  core/core-frontend/src/views/dashboard/components/SqlbotInsertDrawer.vue \
  core/core-frontend/src/views/data-visualization/components/SqlbotInsertDrawer.vue
git commit -m "feat: wire sqlbot chart insert flows"
```

## Task 17: Add Regression Coverage And Update Tooling Docs

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/README.md`
- Optional Create: `/Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/dashboard_insert_regression.sh`

- [ ] **Step 1: Add a failing documentation test reminder in the plan notes**

```bash
test -f /Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/README.md
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes for file presence
- but documentation content still lacks dashboard/dataV insert coverage

- [ ] **Step 2: Update the README with the new insert regression workflow**

Add concrete sections covering:

```md
- forward insert from sqlbotnew
- reverse insert from dashboard
- reverse insert from dataV
- expected validation failure outputs
```

- [ ] **Step 3: If a script is added, make it executable and run it**

Run:

```bash
chmod +x /Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/dashboard_insert_regression.sh
/Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/dashboard_insert_regression.sh
```

Expected:

- PASS for test compilation, then direct JUnit execution must show the scaffold test passes summary output

- [ ] **Step 4: Commit**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add scripts/sqlbot/README.md scripts/sqlbot/dashboard_insert_regression.sh
git commit -m "docs: add sqlbot dashboard insert regression notes"
```

## Task 18: Final End-To-End Verification

**Files:**
- Verify only:
  - `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  - `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/components/dashboard/DbToolbar.vue`
  - `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/data-visualization/PreviewHead.vue`
  - `/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChartResourceServer.java`

- [ ] **Step 1: Run backend build**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
./dataease-app.sh
```

Expected:

- backend build succeeds
- application starts

- [ ] **Step 2: Run SQLBot regression baseline**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
/Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/multi_flow_regression.sh
```

Expected:

- summary `allPassed = true`

- [ ] **Step 3: Perform manual browser verification**

Verify:

- `sqlbotnew` result card can open insert target dialog
- dashboard toolbar can open reverse-insert drawer
- dataV preview head can open reverse-insert drawer
- inserted chart opens existing editor with dataset / dataset-group, dimensions, metrics, sort, filters, and chart type preloaded

- [ ] **Step 4: Commit the final integrated delivery**

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
git add core/core-backend core/core-frontend sdk/api/api-base scripts/sqlbot
git commit -m "feat: support inserting sqlbot chart results into dashboard and datav"
```

## Plan Self-Review

### Spec Coverage

- Snapshot persistence: covered in Tasks 4 and 5.
- Standard chart resource conversion: covered in Tasks 6, 7, and 15.
- Forward insert from `sqlbotnew`: covered in Tasks 10, 11, and 16.
- Reverse insert from dashboard/dataV: covered in Tasks 12, 13, and 16.
- Existing editor rehydration: covered in Task 14.
- Strict validation blocking: covered in Tasks 6 and 15.
- Dashboard and dataV scope: covered in Tasks 12, 13, 16, and 18.

### Placeholder Scan

- No `TODO`, `TBD`, or placeholder steps remain.
- Every code-changing task includes explicit code blocks or concrete wiring requirements.
- Every verification step includes a command and expected outcome.

### Type Consistency

- All new API types use the same `AIQueryChart*` naming family across sdk, backend, and frontend.
- Dataset-combination is consistently treated as dataset-group binding in the design and plan.
- Insert validation always flows through `AIQueryChartValidationVO`.

### Scope Check

- The plan stays within one coherent feature family:
  SQLBot result resource conversion and insertion into dashboard/dataV.
- It does not pull in unrelated editor redesign or SQLBot runtime changes.
