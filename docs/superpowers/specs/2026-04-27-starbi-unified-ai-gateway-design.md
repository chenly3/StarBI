# StarBI 统一 AI 网关架构设计

> 目标：DataEase 作为唯一产品主体，SQLBot 退化为无头 AI 引擎，所有页面和服务统一走 DataEase 后端代理。

## 1. 设计意图

当前 StarBI 存在"两套前端、两套认证、混合调用"的问题：

- DataEase 前端直连 SQLBot（SSE 聊天、图表配置），绕过 DataEase 后端
- SQLBot 自带独立前端（模型配置、术语配置、示例 SQL 配置），用户需要理解两套系统
- 前端能拿到 `sqlbot.secret`，存在安全隐患

本次设计的核心目标：

> DataEase 前端是唯一用户入口，DataEase 后端是唯一 API 网关，SQLBot 仅作为内网 AI 引擎服务。

## 2. 目标架构

```
浏览器 (唯一入口)
  │
  ▼
DataEase 前端 (Vue 3, :8080)
  ├── BI 仪表板 / 数据集 / 权限 (已有)
  ├── 问数对话 (重构：去掉 SQLBot 直连)
  ├── 问数配置入口 (已有)
  └── 模型/术语/示例SQL 配置 (从 SQLBot 迁入)
  │  所有请求统一走 DataEase Session Cookie
  ▼
DataEase 后端 (Spring Boot, :8100)
  ├── BI 业务层（已有）
  └── AI Gateway（新建模块）
      ├── Auth Adapter：DE Token → SQLBot Embedded Token
      ├── Route Dispatcher：/ai/query/* → SQLBot 端点
      ├── SSE Stream Proxy：WebClient + Flux 透传
      └── Response Normalizer：SQLBot JSON → DataEase VO
  │  仅内网 HTTP
  ▼
SQLBot (FastAPI, 内网端口，不对外暴露)
  ├── Chat API / Learning API / Terminology API / Data Training API / Model API
  └── 无前端，无公网端口，仅接受 DataEase 后端调用
```

## 3. AI Gateway 模块设计

### 3.1 子模块职责

| 子模块 | 职责 | 技术实现 |
|--------|------|---------|
| Auth Adapter | 将 DataEase Session 转换为 SQLBot Embedded Token | 读 sqlbot.domain/id/secret → 生成 JWT → 注入请求头 |
| Route Dispatcher | 将 /ai/query/* 路径映射到 SQLBot 端点 | 路由表 + 路径映射 |
| SSE Stream Proxy | 透传 SQLBot SSE 事件流 | Spring WebFlux WebClient + Flux\<ServerSentEvent\> |
| Response Normalizer | SQLBot JSON → DataEase 统一 VO | Jackson ObjectMapper + 字段映射器 |

### 3.2 认证流变化

| 环节 | 改造前 | 改造后 |
|------|--------|--------|
| 前端认证 | 前端读 embed config，生成 Embedded Token 发 SQLBot | 前端只带 DataEase Session Cookie |
| Token 生成 | 浏览器端 (queryContext.ts) | 不需要 Token。DataEase → SQLBot 内网 **零认证** |
| secret 暴露面 | 前端可读 sqlbot.secret | secret 不再需要。SQLBot 只监听 127.0.0.1 |
| 用户身份传递 | JWT 中解析 account | HTTP Header: `X-DE-USER-ACCOUNT` 明文传递（仅用于行权过滤） |
| SQLBot 调用方 | 公网浏览器 IP | 仅 DataEase 内网 IP |

> **核心决策：** DataEase → SQLBot 内网调用不做额外认证。SQLBot 只监听 `127.0.0.1`，来源唯一。需要做个人数据隔离时，通过 `X-DE-USER-ACCOUNT` Header 传递当前登录用户身份，SQLBot 用于行级权限过滤。

### 3.3 SSE 流代理示例

```java
@GetMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<String>> chatStream(@RequestBody Map<String, Object> requestBody) {
    String question = (String) requestBody.get("question");

    return WebClient.create()
        .post()
        .uri("http://127.0.0.1:8000/api/v1/chat/completions/stream")
        .header("X-DE-USER-ACCOUNT", AuthUtils.getUserAccount())
        .bodyValue(requestBody)
        .accept(MediaType.TEXT_EVENT_STREAM)
        .retrieve()
        .bodyToFlux(ServerSentEvent.class)
        .map(event -> ServerSentEvent.builder(event).build());
}
```

## 4. API 契约

所有前端调用统一前缀 `/ai/query/`。

### 4.1 问数对话

| 前端调用 | 后端代理 | SQLBot 内部端点 |
|---------|---------|---------------|
| POST /ai/query/chat/stream | AI Gateway SSE Proxy | POST /chat/completions/stream |
| POST /ai/query/chat/message | Gateway 非流式 | POST /chat/completions |
| GET /ai/query/chat/history | Gateway | GET /chat/history |
| POST /ai/query/chat/recommend | Gateway | POST /chat/recommended |

### 4.2 模型配置（从 SQLBot 迁入）

| 前端调用 | SQLBot 内部端点 |
|---------|---------------|
| GET /ai/query/models | GET /ai-model/list |
| POST /ai/query/models | POST /ai-model/create |
| PUT /ai/query/models/{id} | PUT /ai-model/update/{id} |
| DELETE /ai/query/models/{id} | DELETE /ai-model/delete/{id} |

### 4.3 术语配置（从 SQLBot 迁入）

| 前端调用 | SQLBot 内部端点 |
|---------|---------------|
| GET /ai/query/terminology | GET /system/terminology/list |
| POST /ai/query/terminology | POST /system/terminology/create |
| PUT /ai/query/terminology/{id} | PUT /system/terminology/update/{id} |
| DELETE /ai/query/terminology/{id} | DELETE /system/terminology/delete/{id} |
| POST /ai/query/terminology/upload | POST /system/terminology/upload |

### 4.4 示例 SQL 配置（从 SQLBot 迁入）

| 前端调用 | SQLBot 内部端点 |
|---------|---------------|
| GET /ai/query/sql-examples | GET /data-training/list |
| POST /ai/query/sql-examples | POST /data-training/create |
| PUT /ai/query/sql-examples/{id} | PUT /data-training/update/{id} |
| DELETE /ai/query/sql-examples/{id} | DELETE /data-training/delete/{id} |

### 4.5 问数资源学习

| 前端调用 | SQLBot 内部端点 |
|---------|---------------|
| GET /ai/query/resource-learning/resources | GET /query-resource-learning/resources |
| POST /ai/query/resource-learning/{id}/learn | POST /query-resource-learning/learn |
| GET /ai/query/resource-learning/{id}/quality | GET /query-resource-learning/quality |
| GET /ai/query/resource-learning/{id}/feedback | GET /query-resource-learning/feedback |

## 5. 前端改造计划

### 5.1 砍掉直连调用

| 文件 | 改造动作 |
|------|---------|
| views/sqlbot/sqlbotDirect.ts | 整个文件删除（26KB 直连 SQLBot API 封装） |
| views/sqlbot/queryContext.ts | 简化为只传 DataEase 后端需要的上下文参数 |
| views/sqlbot-new/useSqlbotNewConversation.ts | 改为调 /ai/query/chat/stream，去掉 embed config 读取 |

### 5.2 迁入 SQLBot 配置页

| SQLBot 原页面 | DataEase 目标位置 |
|-------------|-----------------|
| 模型配置 | views/system/query-config/AiModelConfig.vue（新建） |
| 术语配置 | views/system/query-config/TerminologyConfig.vue（新建） |
| 示例 SQL 配置 | views/system/query-config/SqlExampleConfig.vue（新建） |

### 5.3 新建统一 API 封装

新建 `api/aiQuery.ts` 替代 `sqlbotDirect.ts`，所有请求走 `/ai/query/*` 路径。

### 5.4 前端目录最终状态

```
core-frontend/src/
├── api/
│   └── aiQuery.ts                          ← 新建，统一 AI API 封装
├── views/system/query-config/
│   ├── Index.vue                           (已有)
│   ├── QueryResourcePrototype.vue          (已有，问数资源管理)
│   ├── AiModelConfig.vue                   ← 新建
│   ├── TerminologyConfig.vue               ← 新建
│   ├── SqlExampleConfig.vue                ← 新建
│   └── components/
│       ├── LearningTaskDrawer.vue           (已有)
│       └── LearningFeedbackSummaryCard.vue  (已有)
├── views/sqlbot-new/                       (重构)
└── views/sqlbot/
    ├── sqlbotDirect.ts                     → 删除
    └── queryContext.ts                     → 简化
```

## 6. SQLBot 侧改造

- SQLBot/frontend/ 目录整体废弃，不再构建
- SQLBot 后端保持现有 API，新增 CORS 白名单限定为 DataEase 后端地址
- 可选：新增 Internal Auth 模式（共享密钥，比 Embedded Token 更轻量），供 DataEase → SQLBot 内部调用专用

## 7. 部署变更

| 变更项 | 说明 |
|--------|------|
| SQLBot 端口 | 从公网暴露改为仅监听 127.0.0.1 或内网 IP |
| DataEase 后端 | 新增 AI Gateway 模块，无需额外进程 |
| SQLBot 前端 | 不再部署 |
| CORS | SQLBot 关闭公网 CORS，仅允许 DataEase 后端 IP |

## 8. 第一阶段实施范围

与 Quick BI 对齐的 P0 能力，准和可信并行建设：

### 8.1 架构统一（本次设计）
- AI Gateway 模块搭建
- SSE 流代理
- 前端直连砍掉，三个配置页迁入
- SQLBot 前端废弃

### 8.2 问数"准"（后续实施）
- 问数资源学习（学习资产包）
- 分析主题驱动的范围治理
- 语义治理增强（术语/示例SQL/表关联）

### 8.3 问数"可信"（后续实施）
- 结构化澄清式问答
- 结果可验证性与执行摘要
- 围绕结果的连续分析追问

## 9. 边界

本设计不涉及：
- 完整问数知识库平台
- 语音问答
- 复杂 Agent 式多轮编排
- 数据门户 / 自助取数 / 电子表格

---

**相关文档：**
- Quick BI 智能问答对标分析：`docs/superpowers/specs/2026-04-17-quick-bi-smart-query-gap-design.md`
- 问数资源学习产品设计：`docs/superpowers/specs/2026-04-27-query-resource-learning-product-design.md`
- 问数资源学习实施计划：`docs/superpowers/plans/2026-04-27-query-resource-learning-productization-implementation-plan.md`
