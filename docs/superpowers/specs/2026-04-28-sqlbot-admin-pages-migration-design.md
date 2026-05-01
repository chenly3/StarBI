# SQLBot 管理页面迁移设计方案

## 1. 目标

将 SQLBot 的三个管理页面完整迁移到 DataEase 前端工程，保持原有 UI 和交互，仅将 API 调用从 SQLBot 后端替换为 DataEase 后端代理。SQLBot 退化为纯无头服务。

## 2. 范围

### 2.1 迁移页面

| 页面 | SQLBot 源文件 | 行数 | DataEase 目标 |
|------|-------------|------|-------------|
| 模型配置 | `views/system/model/Model.vue` + 5 子组件 | ~642 | `views/system/query-config/AiModelConfig.vue` |
| 术语配置 | `views/system/professional/index.vue` | ~1016 | `views/system/query-config/TerminologyConfig.vue` |
| SQL 示例配置 | `views/system/training/index.vue` | ~868 | `views/system/query-config/SqlExampleConfig.vue` |

### 2.2 依赖文件迁移

| 类型 | SQLBot 源 | DataEase 目标 |
|------|----------|-------------|
| SVG 图标 | `assets/svg/*.svg` | `assets/svg/sqlbot/` |
| API 定义 | `api/system.ts` | → 替换为 `@/api/aiQuery` |
| API 定义 | `api/training.ts` | → 替换为 `@/api/aiQuery` |
| API 定义 | `api/professional.ts` | → 替换为 `@/api/aiQuery` |
| API 定义 | `api/datasource.ts` | → 替换为 `@/api/aiQuery` |
| 实体定义 | `entity/CommonEntity.ts` | `utils/sqlbot-entity.ts` |
| 工具函数 | `utils/utils.ts`, `utils/xss.ts` | `utils/sqlbot-utils.ts` |

### 2.3 不需要迁移

- SQLBot 前端布局壳（侧栏 `ModelListSide`，顶部导航）
- SQLBot 前端多语言（i18n），迁移为硬编码中文
- SQLBot 前端路由、store

## 3. 架构

```
用户操作配置页面
  │
  ▼
DataEase Vue 组件（复制 SQLBot UI，保持交互一致）
  │ 调用 @/api/aiQuery
  ▼
DataEase 后端 AI Gateway（新代理端点）
  │ HTTP 内网（明文，无加密）
  ▼
SQLBot 后端（无头服务，127.0.0.1 仅内网）
```

### 3.1 加密说明

api_key/api_domain 在前端和 DataEase 后端之间明文传输（内网），SQLBot 后端自己加密存储。DataEase `encryption.ts`（AES+RSA）仅用于登录密码，与这三个页面无关。

## 4. API 映射

### 4.1 模型配置

| SQLBot 调用 | DataEase 代理 | 状态 |
|------------|-------------|------|
| `modelApi.queryAll(keyword?)` | `GET /ai/query/models` | ✅ 已有 |
| `modelApi.add(data)` | `POST /ai/query/models` | ✅ 已有 |
| `modelApi.edit(data)` | `PUT /ai/query/models` | ✅ 已有（映射路径已修正） |
| `modelApi.delete(id)` | `DELETE /ai/query/models/{id}` | ✅ 已有 |
| `modelApi.query(id)` | `GET /ai/query/models/{id}` | ❌ 需新增 |
| `modelApi.setDefault(id)` | `PUT /ai/query/models/{id}/default` | ❌ 需新增 |
| `modelApi.check(data)` | `POST /ai/query/models/check`（SSE 流） | ❌ 需新增 |

### 4.2 术语配置

| SQLBot 调用 | DataEase 代理 | 状态 |
|------------|-------------|------|
| `professionalApi.getList(page, size, params)` | `GET /ai/query/terminology?page=&size=` | ⚠️ 需加分页参数 |
| `professionalApi.updateEmbedded(data)` | `PUT /ai/query/terminology` | ✅ 已有 |
| `professionalApi.deleteEmbedded(ids)` | `DELETE /ai/query/terminology`（body params） | ⚠️ 需支持 DELETE body |
| `professionalApi.getOne(id)` | `GET /ai/query/terminology/{id}` | ❌ 需新增 |
| `professionalApi.enable(id, enabled)` | `PUT /ai/query/terminology/{id}/enable` | ❌ 需新增 |
| `professionalApi.exportExcel(params)` | `GET /ai/query/terminology/export` | ❌ 需新增 |

### 4.3 SQL 示例配置

| SQLBot 调用 | DataEase 代理 | 状态 |
|------------|-------------|------|
| `trainingApi.getList(page, size, params)` | `GET /ai/query/sql-examples?page=&size=` | ⚠️ 需加分页参数 |
| `trainingApi.updateEmbedded(data)` | `PUT /ai/query/sql-examples` | ✅ 已有 |
| `trainingApi.deleteEmbedded(ids)` | `DELETE /ai/query/sql-examples`（body params） | ⚠️ 需支持 DELETE body |
| `trainingApi.getOne(id)` | `GET /ai/query/sql-examples/{id}` | ❌ 需新增 |
| `trainingApi.enable(id, enabled)` | `PUT /ai/query/sql-examples/{id}/enable` | ❌ 需新增 |
| `trainingApi.exportExcel(params)` | `GET /ai/query/sql-examples/export` | ❌ 需新增 |

### 4.4 共用

| SQLBot 调用 | DataEase 代理 | 状态 |
|------------|-------------|------|
| `datasourceApi.list()` | `GET /ai/query/datasources` | ❌ 需新增 |

## 5. Layout 适配

- 去掉 SQLBot 左侧数据源侧栏（`ModelListSide.vue`），tab 内容区使用全宽
- 主区域卡片网格 / 表格填满 tab 容器
- 抽屉表单（`ModelFormDrawer`）宽度 `calc(100% - 32px)` 适配 DataEase 布局
- 保留 SQLBot 原有的搜索、卡片展示、分页、开关切换、导出等交互

## 6. 实施顺序

1. **迁移依赖文件**（SVG 图标、实体定义、工具函数）
2. **补齐后端代理端点**（getById、setDefault、check、enable、export、datasource list、DELETE with body）
3. **迁移模型配置页**（AiModelConfig.vue + ModelFormDrawer.vue + ModelCard.vue）
4. **迁移术语配置页**（TerminologyConfig.vue）
5. **迁移 SQL 示例配置页**（SqlExampleConfig.vue）
6. **验证**（确保 UI 一致、CRUD 操作正常、无 ESLint/stylelint 报错）

## 7. 边界

- 不迁移 SQLBot 的数据源管理页面
- 不迁移 SQLBot 的多语言体系
- 不迁移 SQLBot 的权限管理
- 不迁移 SQLBot 的嵌入管理
