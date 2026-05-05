<!-- /autoplan restore point: /Users/chenliyong/.gstack/projects/chenly3-StarBI/main-autoplan-restore-20260503-080046.md -->
# 智能问数资源与分析主题对标重构设计

## 1. 背景

当前 StarBI 已经在 `系统设置 -> 问数配置` 中提供 `问数资源管理` 和 `分析主题管理` 两类功能。两者的共同目标都是提升智能问数准确性，但当前产品表达仍偏向后台列表和分组配置，用户很难理解它们如何影响最终问数结果。

本设计以 Quick BI 小Q问数为参照，但不机械照搬 Quick BI 页面。目标是围绕 StarBI 当前 DataEase + SQLBot 架构，重新定义问数资源、分析主题、权限、运行时策略和反馈学习之间的产品关系。

## 2. 对标结论

Quick BI 的智能问数配置链路可以概括为：

1. 数据准备和数据集问数配置
2. 问数资源管理
3. 分析主题管理
4. 权限、知识、推荐问题和学习状态治理
5. 智能问数消费

其中，问数资源管理用于治理“哪些数据集可问、学习状态如何、是否需要重学”；分析主题管理用于把某个领域或业务线的数据集组织成一个业务问数入口。Quick BI 也明确提醒，单个分析主题下的资源数量会影响计算时长和准确性，因此分析主题不是越大越好，而是要有清晰业务边界。

StarBI 应吸收 Quick BI 的产品逻辑：

- 问数前必须先建立可问资源。
- 主题应按领域或业务线组织资源。
- 资源应展示学习状态、最后学习时间、质量风险和运营动作。
- 问数入口应让用户按主题或资源选择上下文。
- 权限、行权限、列权限必须进入智能问数运行时。

StarBI 不应机械照搬的部分：

- 不能只做页面分组，必须接入 SQLBot 运行时上下文。
- 不能让主题绑定过多无关资源，否则会降低准确性。
- 不能把学习状态写死成“学习成功”。
- 不能让资源、主题、术语、SQL 示例、权限和反馈各自孤立。

## 3. 产品目标

StarBI 的问数配置应从“后台配置页面”升级为“智能问数准确性治理体系”。

最终目标是让系统在每次问数时能稳定回答：

- 用户处在哪个业务场景？
- 当前用户能问哪些主题和资源？
- 当前主题下应该使用哪些数据集、字段、指标和数据源？
- 哪些术语、SQL 示例、学习补丁和历史上下文应该参与本轮问数？
- 如果问题存在歧义，是自动选择、反问澄清，还是提示用户补充？
- 最终 SQL 是否消费了行权限和列权限？

## 4. 准确性问题模型

智能问数不准确通常不是单一模型问题，而是上下文不完整。

### 4.1 数据语义不准

用户问“销售额”，数据集中可能叫 `gmv_amt`、`amount`、`revenue`。如果没有字段别名、字段描述、指标口径和术语映射，模型无法稳定理解用户意图。

### 4.2 指标口径不准

同一个“利润率”可能指毛利率、净利率或经营利润率。如果缺少指标定义、计算逻辑和适用范围，系统容易生成错误 SQL。

### 4.3 资源范围过大

用户问“本月收入”，如果系统在几十个数据集中召回，很容易选错表或组合错误资源。分析主题必须帮助系统收敛业务范围。

### 4.4 多数据源不确定

同一主题下可能存在多个数据源。运行时必须明确执行数据源，或提示用户跨源查询不可直接执行。

### 4.5 权限上下文缺失

用户能看到某个主题，不代表能访问主题下全部资源、字段和行数据。权限配置、行权限和列权限必须参与问数运行时。

### 4.6 反馈无法沉淀

错误 SQL、失败问题、用户踩赞和修正结果如果不能反哺资源学习，问题会重复出现。

## 5. 核心产品定位

### 5.1 问数资源配置

问数资源配置不是数据集列表，而是“可问性治理中心”。

它回答：这个数据集是否适合被问？如果适合，模型应该怎样理解它？

核心职责：

- 控制哪些数据集进入智能问数资源池。
- 展示学习状态、最后学习时间、失败原因、质量评分和反馈摘要。
- 管理字段别名、字段描述、指标口径、业务术语、SQL 示例和维值示例。
- 支持重新学习、批量重学、移除资源、预览数据和任务详情。
- 从资源行进入行权限、列权限、推荐问题和反馈问题。

### 5.2 分析主题配置

分析主题配置不是数据集分组，而是“业务问数场景编排”。

它回答：用户在某个业务场景里，应该问哪些资源？系统应该如何限制上下文？

核心职责：

- 按销售、财务、客户、供应链、运营等业务域组织问数资源。
- 限制主题内可召回资源，降低跨业务域误选资源的风险。
- 指定默认资源、默认数据源策略、欢迎语、主题说明和推荐问题。
- 展示主题内资源质量风险。
- 控制主题可见权限，但不绕过资源权限、行权限和列权限。

### 5.3 两者关系

问数资源配置解决“单个数据集问得准”。
分析主题配置解决“一个业务场景问得准”。

资源解决语义，主题解决范围。资源质量差，主题再清楚也会答错；主题范围乱，资源质量再好也会选错。

## 6. 当前 StarBI 现状与差距

### 6.1 已有基础

当前 StarBI 已有以下基础能力：

- `系统设置 -> 问数配置` 已有 `问数资源管理` 和 `分析主题管理` 入口。
- 分析主题数据模型已支持 `name`、`description`、`status`、`datasetIds`、`defaultDatasetIds`、`welcomeText`、`recommendedQuestions`。
- 问数资源页面已接入 `resource-learning` 接口，包含学习状态、质量摘要、反馈摘要、重学、移除、任务详情等雏形。
- 智能问数运行时已有 `themeId`、`themeName`、`datasetIds`、`datasource`、执行详情等上下文能力。
- 资源行权限、列权限已开始向问数资源场景迁移。

### 6.2 主要差距

- 问数资源管理仍偏资源列表，没有形成完整的资源语义治理入口。
- 分析主题管理仍偏数据集分组，缺少作为业务问数入口的配置能力。
- 部分学习状态仍存在写死或兜底展示，无法真实反映资源质量。
- 资源配置和运行时消费关系不透明，用户不知道配置如何影响 SQLBot。
- 反馈闭环不足，失败问题、踩赞、SQL 修正还没有形成可操作治理流程。
- 权限配置、行权限、列权限尚未被明确表达为智能问数运行时硬约束。

### 6.3 当前实现映射

| 现有模块 | 当前能力 | 目标定位 | 主要补齐点 |
| --- | --- | --- | --- |
| `系统设置 -> 问数配置 -> 问数资源管理` | 展示资源学习状态、质量摘要、反馈摘要、重学、移除、任务详情 | 可问性治理中心 | 补齐字段语义、指标口径、SQL 示例、术语、权限入口和反馈转补丁 |
| `系统设置 -> 问数配置 -> 分析主题管理` | 配置主题名称、描述、状态、数据集、默认数据集、欢迎语、推荐问题 | 业务问数场景编排 | 补齐主题可见范围、主题健康度、资源风险、跨源风险和运行时召回边界 |
| `AIQueryRuntimeServer` 等问数运行时服务 | 已存在主题、数据集、数据源和执行详情上下文雏形 | DataEase 后端统一问数代理 | 补齐权限过滤、语义上下文拼装、澄清策略、反馈记录和 SQLBot 调用边界 |
| 权限配置、行权限配置、列权限配置 | 作为系统设置能力存在，并已开始迁移到问数资源场景 | 智能问数安全边界 | 必须进入主题列表、资源召回、Schema 召回、SQL 生成、SQL 执行、结果展示和数据解读 |
| 术语配置、SQL 示例配置、模型配置 | 已从 SQLBot 能力迁移到 DataEase 配置入口 | SQLBot 能力配置面 | 必须由 DataEase 后端代理消费，不能只停留在独立配置页 |

## 7. 目标信息架构

StarBI 的问数配置建议按 6 个能力区组织。

### 7.1 问数资源治理

目标：让管理员知道哪些数据集可以问、问数质量如何、是否需要处理。

需求：

- 展示资源名称、所属主题、创建者、最近学习时间、学习状态、质量评分、失败原因。
- 状态必须来自真实学习任务或资源学习接口，不能写死。
- 支持单资源重新学习、批量重新学习、移除资源、预览数据、任务详情。
- 对质量低、失败率高、用户踩赞多的资源展示风险标识。
- 支持从资源行进入语义配置、行权限、列权限、推荐问题和反馈问题。

### 7.2 资源语义配置

目标：让模型理解数据集的字段、指标、口径和业务问法。

需求：

- 字段级配置：字段别名、字段描述、字段类型、是否可问、默认聚合方式。
- 指标级配置：指标口径、计算逻辑、适用维度、时间口径。
- 业务术语：把“收入、营收、销售额、GMV”等用户语言映射到具体字段或指标。
- SQL 示例：沉淀高质量问法和 SQL，作为模型生成 SQL 的参考。
- 维值示例：支持常见枚举值、别名和模糊匹配。
- 保存配置后触发或建议重新学习，避免运行时继续使用旧语义。

### 7.3 分析主题编排

目标：把资源组织成业务问数场景，而不是简单数据集分组。

需求：

- 主题基本信息：名称、描述、状态、所属组织、可见范围。
- 主题资源：绑定数据集，展示每个资源学习状态和质量风险。
- 默认资源：主题内至少指定一个默认资源，用于首次问数和歧义处理。
- 推荐问题：主题级推荐问题可配置、可排序，可区分系统推荐和人工推荐。
- 欢迎语和适用说明：告诉用户该主题能问什么、不能问什么。
- 主题规模提示：当主题绑定资源过多、跨数据源过多、字段冲突过多时提示可能影响准确性。
- 主题健康度：综合资源学习状态、反馈失败率、权限完整性，给主题一个可运营状态。

### 7.4 权限与可见范围

目标：避免“用户看得到主题但查不到数据”或“问数绕过权限”。

需求：

- 菜单和功能权限控制用户是否能进入智能问数、问数配置、资源治理和主题管理。
- 主题可见权限控制用户能看到哪些分析主题。
- 资源访问权限控制用户能问哪些数据集。
- 列权限控制哪些字段能进入 Schema 召回、SQL 生成、推荐问题、结果展示和数据解读。
- 行权限控制最终 SQL 的行级过滤条件。
- 主题可见不等于资源可查；资源可见不等于字段可见；字段可见不等于所有行可查。

### 7.5 运行时策略

目标：让配置真实影响问数，而不是只存在后台。

需求：

- 用户进入问数时可选择分析主题；选中主题后只在主题资源范围内召回数据集。
- 如果主题下存在多个数据源，必须要求用户选择执行数据源，或由系统明确提示不能跨源直接查询。
- 如果问题命中多个资源、多个指标或多个维值，系统应触发澄清，而不是直接猜。
- 运行时请求应携带 `themeId`、`themeName`、`datasetIds`、`defaultDatasetIds`、`datasourceId` 和用户权限上下文。
- SQLBot 的术语、SQL 示例、模型配置、资源学习结果应由 DataEase 后端统一拼装或代理调用，不能由前端绕过。
- 问数结果应能展示使用的主题、数据集、SQL 和执行步骤，便于排查准确性问题。

### 7.6 反馈与运营

目标：让错误可以被修复，而不是只被记录。

需求：

- 记录用户踩赞、失败原因、错误 SQL、修正 SQL、重新生成记录。
- 资源详情中展示近期失败问题、失败率、踩赞率、建议重学原因。
- 支持管理员从失败问题生成补丁：术语补充、SQL 示例补充、字段别名补充、权限修正建议。
- 支持重学后对历史失败问题做 replay 验证。
- 提供资源级和主题级运营看板：高风险资源、低质量主题、最近失败问题、待处理反馈。

## 8. 权限消费链路

权限配置、行权限配置、列权限配置如果存在，必须同时被智能问数运行时消费。

### 8.1 入口层

菜单和功能权限决定用户是否能进入：

- 智能问数
- 问数配置
- 问数资源治理
- 分析主题管理
- 权限配置入口

### 8.2 主题层

主题可见权限决定用户能看到哪些分析主题。未授权主题不能出现在：

- 主题入口
- 推荐问题
- 历史对话上下文
- 运行时召回范围

### 8.3 资源层

主题绑定了某些数据集，不代表当前用户都有权访问。运行时必须按当前用户过滤主题内资源。

### 8.4 字段层

列权限控制字段是否可见。不可见字段不得进入：

- Schema 召回
- SQL 生成
- 推荐问题
- 图表字段
- 数据解读
- 结果展示

### 8.5 数据层

行权限控制数据行可见范围。最终 SQL 必须拼接当前用户的行权限过滤条件，且该逻辑必须发生在 DataEase 后端或 SQLBot 代理后端，不能只依赖前端过滤。

### 8.6 运行时顺序

推荐运行时顺序：

1. 用户选择分析主题。
2. 校验主题可见权限。
3. 过滤主题内用户可访问资源。
4. 过滤可见字段。
5. 拼接行权限。
6. 拼装术语、SQL 示例、学习补丁和历史上下文。
7. 调用 SQLBot 生成 SQL。
8. 执行 SQL 并返回结果。
9. 记录反馈和执行详情。

## 9. 智能问数消费链路

推荐链路：

1. 用户进入智能问数，选择或默认进入某个分析主题。
2. 系统根据主题拿到资源范围、默认资源、推荐问题和欢迎语。
3. 用户提问后，DataEase 后端带着主题上下文调用 SQLBot 能力。
4. DataEase 后端或 SQLBot 后端进行术语匹配、SQL 示例匹配、Schema 召回、数据源选择和权限拼接。
5. 如果上下文不足，系统返回澄清问题。
6. 如果成功，返回文本解释、图表或表格、SQL、执行步骤。
7. 用户反馈进入资源学习闭环，管理员在问数资源治理中处理。

关键约束：

- 分析主题不是展示标签，而是运行时召回边界。
- 问数资源不是数据集列表，而是语义质量资产。
- 权限配置不是后台附属能力，而是运行时安全边界。
- 反馈不是日志，而是重学和配置修正入口。

### 9.1 运行时上下文模型

DataEase 后端调用 SQLBot 或内部问数能力时，应把配置收敛成一个明确的运行时上下文。前端只负责传用户选择和提问，不负责拼接 SQLBot 私有上下文。

建议上下文包含：

- `userContext`：用户 ID、组织 ID、角色、菜单权限、功能权限。
- `themeContext`：主题 ID、主题名称、主题描述、可见范围、欢迎语、推荐问题、主题健康度。
- `resourceContext`：主题授权后可用的数据集 ID、默认数据集 ID、资源学习状态、资源质量风险。
- `schemaContext`：经过列权限过滤后的表、字段、字段别名、字段描述、指标口径、维值示例。
- `datasourceContext`：数据源 ID、数据源类型、是否跨源、跨源不可执行原因。
- `knowledgeContext`：术语、SQL 示例、资源学习补丁、历史失败修正、推荐问题。
- `permissionContext`：资源权限、列权限、行权限表达式和最终 SQL 拼接策略。
- `runtimePolicy`：歧义澄清策略、默认资源策略、多数据源处理策略、失败回退策略。
- `traceContext`：本轮使用的主题、资源、字段、SQL、执行步骤、错误原因和反馈入口。

运行时上下文的安全顺序必须是先授权过滤，再拼装可见 Schema 和知识上下文，最后生成和执行 SQL。不能先把完整 Schema 交给模型，再依赖前端或结果层隐藏敏感字段。

### 9.2 安全与准确性验收边界

- 未授权主题不得进入主题列表、推荐问题、历史上下文和运行时召回。
- 未授权资源不得进入主题可问资源集合，即使该资源被主题绑定。
- 未授权字段不得进入 Schema、SQL 示例匹配、推荐问题、图表配置和数据解读。
- 行权限必须体现在最终执行 SQL 或 DataEase 后端执行计划中，不能只在结果集返回后过滤。
- DataEase 后端必须是 SQLBot 调用发起方；前端不得直接调用 SQLBot 服务获取模型、术语、SQL 示例或问数结果。
- 问数结果需要可追踪本轮使用的主题、资源、字段和权限处理结果，方便管理员定位准确性问题。

## 10. 分阶段重构路线

### P0：概念和链路校准

目标：先统一产品口径，不急着大改页面。

- 明确问数资源配置是可问性治理中心。
- 明确分析主题配置是业务问数场景编排。
- 明确权限、行权限、列权限必须进入智能问数运行时。
- 明确 DataEase 后端是所有 SQLBot 调用代理入口，前端不能直接绕过。
- 输出完整 PRD、运行时上下文模型、权限消费链路。

### P1：资源配置从列表升级为治理页

目标：先解决资源是否真的可问、质量如何。

- 问数资源列表接真实学习状态、质量评分、失败原因、反馈摘要。
- 去掉写死的学习成功。
- 增加资源详情入口：字段语义、指标口径、SQL 示例、术语、推荐问题、反馈问题。
- 支持重新学习、任务详情、失败问题查看。
- 支持资源行进入行权限和列权限配置。

### P2：分析主题从分组升级为业务场景

目标：让主题真的影响问数准确性。

- 主题支持欢迎语、推荐问题、默认数据集、默认数据源策略。
- 主题详情展示资源质量风险，而不是只展示已分配数据集。
- 主题资源过多、跨数据源、字段冲突时给出风险提示。
- 问数入口按主题组织，用户选择主题后只在主题范围内问数。
- 主题权限、资源权限、行列权限共同影响可问范围。

### P3：运行时上下文打通

目标：让后台配置真正被 SQLBot 问数消费。

- DataEase 后端调用 SQLBot 时统一带上主题、资源、数据源、权限、术语、SQL 示例、学习补丁。
- Schema 召回前过滤不可见资源和字段。
- SQL 执行前拼接行权限。
- 多资源、多指标、多数据源歧义时触发澄清。
- 问数结果展示使用的主题、数据集、SQL、执行步骤，方便排查。

### P4：反馈运营闭环

目标：让错误可以被修复，而不是只被记录。

- 用户踩赞、失败、SQL 修正进入资源反馈池。
- 管理员能从失败问题生成术语补充、SQL 示例补充、字段别名补充。
- 支持重学后 replay 历史失败问题。
- 提供资源级和主题级质量看板。

## 11. 验收标准

### 11.1 产品验收

管理员能清楚理解：资源配置管“这个数据集怎么问准”，主题配置管“这个业务场景用哪些资源问准”。

### 11.2 配置验收

一个资源从学习失败到修复再学习，应能在页面看到完整状态变化和失败原因。

### 11.3 主题验收

一个主题绑定多个数据集后，问数入口只能在该主题范围内召回资源，不能跨主题乱选。

### 11.4 权限验收

用户无权限的数据集、字段、行数据，不得进入 Schema 召回、SQL 生成、推荐问题、结果展示和数据解读。

### 11.5 运行时验收

同一个问题在不同主题下，应使用不同资源范围；同一主题下资源存在歧义时，应触发澄清而不是直接猜。

### 11.6 反馈验收

用户反馈的问题能回流到资源治理页，并能转化为配置补丁或重新学习建议。

## 12. 非目标

本设计不直接要求一次性实现全部 P0 到 P4 能力。

本设计不要求机械复制 Quick BI 的页面结构、导航名称或后台模块数量。

本设计不修改现有代码，只作为 implementation plan 的产品设计输入。

## 13. 参考资料

- [Quick BI 小Q问数概述](https://help.aliyun.com/zh/quick-bi/user-guide/chat-bi-overview)
- [Quick BI 数据准备](https://help.aliyun.com/zh/quick-bi/user-guide/prepare-data)
- [Quick BI 问数资源管理](https://help.aliyun.com/zh/quick-bi/user-guide/ask-about-resource-management)
- [Quick BI 分析主题管理](https://help.aliyun.com/zh/quick-bi/user-guide/analysis-topic-management)
- [Quick BI 全局配置](https://www.alibabacloud.com/help/zh/quick-bi/user-guide/global-configuration)

---

## GSTACK AUTOPLAN REVIEW REPORT

### Phase 0：Intake + Scope Detection

Plan file: `dataease/docs/superpowers/specs/2026-05-03-smart-query-resource-theme-benchmark-design.md`

Base branch: `main`

Restore point: `/Users/chenliyong/.gstack/projects/chenly3-StarBI/main-autoplan-restore-20260503-080046.md`

This file is a requirement/spec draft plan, not an executable implementation plan. It is valid input for `/autoplan` because it defines the product direction, target capability map, non-goals, staged roadmap, and acceptance criteria for the later implementation plan.

UI scope: yes. The plan changes system setting pages, smart query entry behavior, resource/theme configuration views, feedback surfaces, and empty/error/loading states.

DX scope: yes. The plan changes DataEase backend proxy contracts, SQLBot runtime context assembly, permission/security boundaries, debugging trace output, and API-level acceptance criteria for implementers.

Loaded review skills from disk: CEO, Design, Eng, DX. Starting full review pipeline with auto-decisions.

### Phase 1：CEO Review

#### 0A. Premise Challenge

| Premise | Status | CEO read | Required correction |
| --- | --- | --- | --- |
| Quick BI is the right benchmark | Mostly valid | Quick BI is the right near-term benchmark because the user explicitly wants to compare against it and the product shape is close. The plan should still avoid treating Quick BI as the ceiling. | Keep Quick BI as baseline, but add a competitive bar: StarBI should win on DataEase + SQLBot integration traceability, not just match resource/theme setup. |
| Accuracy is mainly a context governance problem | Valid | The draft correctly identifies that accuracy failures come from semantic context, resource scope, permissions, and feedback loops, not only model quality. | Keep as core premise. It should become the acceptance spine for implementation. |
| Resource config and theme config both exist and need product reframing | Valid | The repo confirms `query-config/index.vue`, `QueryResourcePrototype.vue`, and `query-theme/index.vue` exist. Current pages behave like resource/theme admin surfaces more than a closed accuracy system. | Keep, but make each config page explain exactly how changes affect runtime. |
| Permissions must be consumed by runtime | Valid and non-negotiable | `DatasetSQLBotManage` already filters accessible datasets and rebuilds SQLBot tables with column and row permissions. The plan is directionally right. | Strengthen plan to require reuse of `DatasetSQLBotManage` permission-filtered datasource/schema path for theme runtime. |
| Learning status must not be fake | Valid | The repo still has local hard-coded `statusLabel: '学习成功'` in `query-theme/index.vue`, while `queryResourceLearning.ts` has real normalization from SQLBot resource-learning responses. | The implementation plan must remove theme-page fake status and source it from `resource-learning`. |
| DataEase backend must initiate SQLBot calls | Valid | Backend classes already proxy SQLBot admin embed, runtime models, resource learning, and execution details. The product premise matches existing direction. | Add a hard acceptance criterion: no new frontend direct SQLBot calls for runtime/config consumption. |
| P0-P4 can be treated as one plan | Risky | The spec covers concept, UI, backend runtime, permission safety, learning feedback, replay, and operations. That is larger than one implementation plan. | Split implementation into milestones after autoplan. P0-P1 should ship first unless user explicitly chooses a larger release. |

Premise verdict: accept the core direction, but do not accept the implicit assumption that all P0-P4 should be implemented in one pass. The draft is a good product strategy spec; implementation must be staged.

#### 0B. Existing Code Leverage

| Sub-problem | Existing code leverage | CEO implication |
| --- | --- | --- |
| Query config shell | `dataease/core/core-frontend/src/views/system/query-config/index.vue` already hosts resource and theme tabs. | Keep the shell. Avoid inventing another settings entry. |
| Resource learning API | `dataease/core/core-frontend/src/api/queryResourceLearning.ts` and `AIQueryResourceLearningServer.java` already expose resources, learn, delete, quality summary, feedback summary, feedback events, patches, replay, metrics, and relearning decisions. | Resource governance can be made real without a ground-up backend rewrite. |
| Theme CRUD | `aiQueryTheme.ts`, `AIQueryThemeServer.java`, and `AIQueryThemeManage.java` already support theme CRUD, dataset binding, default dataset IDs, welcome text, and recommended questions. | Theme product upgrade should build on this model instead of replacing it. |
| Permission-filtered SQLBot schema | `DatasetSQLBotManage.getDatasourceList()` filters dataset access, column permissions, row permissions, and rebuilds SQL for SQLBot-visible tables. | The runtime safety path exists. The plan must mandate reusing this path for theme-scoped schema/context. |
| Runtime execution details | `AIQueryRuntimeServer.java` exposes models and execution details; `AIQueryThemeManage` maps SQLBot execution steps including `GENERATE_SQL_WITH_PERMISSIONS`. | Traceability is already partially present; turn it into user/admin-facing accuracy debugging. |
| SQLBot direct context | `sqlbot/queryContext.ts` and `sqlbotDirect.ts` carry `themeId`, `themeName`, and `datasetIds`. | Frontend context exists, but final authority must be backend-filtered context. |
| Current UI debt | `query-theme/index.vue` still uses fake learning success status for theme/resource rows. | This is a product trust problem. It should be fixed early, not left to P4. |

#### 0C. Dream State Mapping

```text
CURRENT
  Admins see resource/theme lists.
  Some learning and feedback APIs exist.
  Theme pages can still show fake success states.
  Runtime context is partially connected and hard to inspect.

THIS PLAN
  Resource config becomes可问性治理中心.
  Theme config becomes业务问数场景编排.
  Permissions become runtime hard constraints.
  Feedback becomes relearning and semantic patch input.

12-MONTH IDEAL
  Every query has an explainable context card:
  theme, authorized resources, visible fields, row filters, terminology, SQL examples, learning patches, chosen datasource, generated SQL, execution steps, feedback outcome.
  Admins can replay failed questions after semantic/permission fixes and see quality trend by theme and resource.
```

Dream state delta: the draft reaches the right architecture story, but it does not yet define the operator-facing “why did this answer happen?” debugging experience deeply enough. Add that to the implementation plan.

#### 0C-bis. Implementation Alternatives

| Approach | Effort | Risk | Pros | Cons | Autoplan decision |
| --- | --- | --- | --- | --- | --- |
| A. Page-first cleanup | Low | High product risk | Quickly improves visible pages and removes fake state. | May leave runtime disconnected, repeating past mistake of static configuration pages. | Reject as standalone. Useful only as part of P1. |
| B. Runtime-first minimum loop | Medium | Medium | Proves theme/resource/permission context affects SQLBot before polishing all governance UI. | Admin experience may still feel incomplete for resource repair. | Accept for implementation milestone 1. |
| C. Full accuracy governance lake | High | Delivery risk | Covers resource, theme, permissions, trace, feedback, replay, and quality dashboard. | Too broad for one implementation plan; likely creates unfinished surfaces. | Accept as roadmap, split into P0-P4 milestones. |

Recommended direction: B for first executable implementation plan, with C retained as the long-term roadmap. This keeps the product honest: runtime accuracy first, then richer governance UI.

#### 0D. Mode-Specific Analysis

Mode: SELECTIVE EXPANSION.

Accepted scope expansions in blast radius:

- Add an explicit runtime context contract to the implementation plan. It touches direct runtime callers and backend proxy boundaries already in the plan.
- Add permission no-leak tests as P0/P1 acceptance, not later polish. This is inside the runtime/security blast radius.
- Add removal of fake `学习成功` status as an early task. It is already called out by the draft and visible in the current code.
- Add trace/debug card requirements for admins. Existing execution detail mapping makes this feasible and valuable.

Deferred scope:

- Full resource/theme quality dashboard with trends and all operational analytics. This belongs after the first runtime loop works.
- Automated replay suite for every historical failed question. Keep the concept, but build minimal replay verification first.
- Full metric/semantic authoring system if no backend persistence model exists. Start by reusing SQLBot terminology and SQL example configs.

#### 0E. Temporal Interrogation

| Time horizon | What must be true | Failure if omitted |
| --- | --- | --- |
| Hour 1 | Team agrees this is a draft plan and not an implementation plan. | People start coding broad UI changes before runtime scope is reviewed. |
| Hour 6 | Implementation plan has a concrete backend runtime context contract and permission test matrix. | The work regresses into static pages that do not affect SQLBot answers. |
| Day 1 | Fake learning status is removed from target pages or explicitly scheduled in P1. | Admins lose trust because UI says success when data is unknown or failed. |
| Week 1 | Theme-scoped query can prove it filters resources and fields by permission before SQL generation. | The core product promise is unverified. |
| Month 1 | Feedback and trace data can guide a resource repair workflow. | Errors are recorded but still not operationally fixable. |
| Month 6 | StarBI can show “why this answer happened” better than Quick BI-like static setup pages. | Product becomes a weak clone rather than an integrated DataEase advantage. |

#### 0F. Mode Selection Confirmation

Selected mode: SELECTIVE EXPANSION.

Reason: the plan is directionally right, but implementation needs selective hardening around runtime consumption, permission safety, fake state removal, and traceability. Full P0-P4 in one build would be too large.

### Phase 1 Review Sections

#### Section 1: Architecture Review

Examined `query-config/index.vue`, `query-theme/index.vue`, `aiQueryTheme.ts`, `AIQueryThemeManage.java`, `AIQueryRuntimeServer.java`, `AIQueryResourceLearningServer.java`, and `DatasetSQLBotManage.java`.

Finding: the plan names the right layers, but the runtime boundary should be more explicit. DataEase backend must own `theme -> authorized dataset IDs -> permission-filtered datasource/schema -> SQLBot context` assembly. Frontend may pass `themeId` and question text, but it must not decide final dataset/field availability.

Autoplan decision: add this as an implementation-plan hard requirement. Principle: explicit over clever, security boundary first.

#### Section 2: Error & Rescue Map

| Error | User/admin symptom | Rescue behavior required |
| --- | --- | --- |
| SQLBot config disabled or incomplete | Resource/theme pages cannot fetch learning/runtime data. | Show actionable config error and disable learning/runtime actions, not fake success. |
| Theme has zero authorized datasets after permission filtering | User sees a theme but cannot ask useful questions. | Hide theme or show “no authorized resources” based on product decision; never pass empty context silently. |
| Column permission removes all fields | Query cannot be generated safely. | Block query with no-column-permission message and trace reason. |
| Row permission SQL rebuild fails | Query may leak data or fail. | Remove unsafe table from schema and show trace/error reason. Existing `DatasetSQLBotManage` removes tables on rebuild exception; surface this upstream. |
| Multiple data sources in one theme | Generated SQL may be impossible to execute. | Require data source selection or return a clarification/blocking message. |
| Learning task fails | Admin cannot know whether resource is usable. | Persist failure reason and expose task detail. |
| Feedback patch conflicts with permissions | Learning patch suggests fields user cannot access. | Patch application must be permission-aware at runtime. |

#### Section 3: Security & Threat Model

Primary threat: accidental data leakage through AI context, not only final SQL result. The plan correctly says unauthorized fields cannot enter Schema, SQL examples, recommendation, chart config, data interpretation, or result display.

Missing hardening: prompt/knowledge injection via SQL examples, terminology, and feedback patches is not explicitly called out. Since these become model context, implementation must sanitize/label them as controlled knowledge and never let user feedback override permission constraints.

Autoplan decision: add prompt-context safety to implementation acceptance. Principle: completeness and explicit security boundary.

#### Section 4: Data Flow & Interaction Edge Cases

The plan covers the happy-path runtime sequence. It needs explicit edge cases for: no theme selected, disabled theme, theme has only unauthorized datasets, default dataset removed by permission filtering, stale recommended question referencing unavailable fields, resource learning in progress, and SQLBot unavailable.

Autoplan decision: add edge-case matrix to implementation plan. Principle: boil the lake inside blast radius.

#### Section 5: Code Quality Review

No implementation code is proposed in the draft, so no code quality change is reviewed here. Existing code review signal: avoid duplicating resource/theme types across `aiQuery.ts`, `aiQueryTheme.ts`, and `queryResourceLearning.ts` when implementation begins. Use shared types where already practical, but do not create a large abstraction first.

#### Section 6: Test Review

Current draft acceptance criteria are product-level and good, but not yet testable enough. Implementation plan must convert them into tests:

- Unit/contract tests for theme save normalization and permission-filtered theme datasets.
- API tests for resource-learning status/quality/feedback normalization.
- Backend tests for theme runtime context rejecting unauthorized datasets and fields.
- Browser/E2E tests for theme selection changing query resource scope.
- Regression test proving fake `学习成功` status is not rendered without real learning status.
- Security regression proving unauthorized fields are absent before SQLBot call, not only hidden after result.

#### Section 7: Performance Review

The plan correctly warns that too many resources in a theme hurt accuracy and latency. It should define operational thresholds for warning, for example resource count, datasource count, field count, and conflicting metric/field aliases. Exact numbers can be tuned later, but the implementation plan needs measurable warning inputs.

#### Section 8: Observability & Debuggability Review

The trace context section is strong but should become a first-class deliverable. Admins need to inspect: selected theme, authorized resource IDs after filtering, excluded resource/field reason, datasource decision, matched terms, SQL examples, learning patches, generated SQL, row permission step, execution details, and feedback event ID.

Autoplan decision: add an admin-facing trace/debug requirement in P1/P3 split. Principle: user outcome, not hidden logs.

#### Section 9: Deployment & Rollout Review

This work should be rolled out in milestones. Do not ship the full P0-P4 as one release. Suggested rollout:

1. P0/P1A: remove fake statuses, real resource learning state, theme/resource scope display.
2. P1B/P2A: theme runtime boundary and permission-filtered context proof.
3. P2B/P3: traceability and clarification behavior.
4. P4: feedback patch/replay/operations dashboard.

#### Section 10: Long-Term Trajectory Review

The strongest long-term wedge is not matching Quick BI setup pages. It is making StarBI’s answer generation explainable and repairable because DataEase owns datasets, permissions, SQL execution, and SQLBot proxying. The roadmap should state this as the durable differentiation.

#### Section 11: Design & UX Review

UI scope exists. Phase 2 must review layout and flows in detail. CEO-level design concern: the plan names many capabilities but does not yet specify the primary admin journey. The implementation plan should choose the first journey: “发现低质量资源 -> 查看失败/权限/语义原因 -> 修复 -> 重学 -> replay 验证”. Without this, the UI may become another dense settings console.

### Phase 1 Required Outputs

#### NOT in scope

- Rebuilding SQLBot model generation internals.
- Implementing all P0-P4 roadmap items in one coding pass.
- Creating a separate permission system for smart query.
- Letting frontend assemble or filter final SQLBot schema/context.
- Full analytics dashboard before runtime context and permission correctness are proven.

#### What already exists

- Query config shell and tabs.
- Theme CRUD and dataset/default dataset metadata.
- Resource learning API and backend proxy endpoints.
- Permission-filtered SQLBot datasource/schema construction in `DatasetSQLBotManage`.
- Runtime model and execution details endpoints.
- SQLBot frontend context carrying theme and dataset IDs.

#### Dream state delta

The draft gets StarBI from static settings toward accuracy governance. To reach the 12-month ideal, the next implementation plan must add hard runtime context contracts, trace/debug UI, measurable theme health thresholds, and security tests for no data leakage before model invocation.

#### Error & Rescue Registry

| ID | Error | Rescue owner | Must be tested |
| --- | --- | --- | --- |
| E1 | SQLBot disabled/incomplete | DataEase backend + settings UI | Yes |
| E2 | No authorized datasets in theme | Runtime context builder | Yes |
| E3 | Column permissions remove all fields | `DatasetSQLBotManage` caller/runtime UI | Yes |
| E4 | Row permission SQL rebuild failure | `DatasetSQLBotManage` and trace UI | Yes |
| E5 | Multi-datasource ambiguity | Runtime policy + chat UI | Yes |
| E6 | Fake or stale learning status | Resource/theme UI | Yes |
| E7 | Feedback patch conflicts with permissions | Learning patch runtime consumer | Yes |

#### Failure Modes Registry

| ID | Failure mode | Severity | Mitigation |
| --- | --- | --- | --- |
| F1 | Static config page ships but SQLBot ignores it | Critical | Runtime context acceptance tests before UI polish is called done. |
| F2 | Unauthorized schema enters model prompt | Critical | Backend-only permission-filtered context and tests before SQLBot call. |
| F3 | Theme binds too many resources and degrades accuracy | High | Theme health warnings and recommended limits. |
| F4 | Admin cannot diagnose bad answer | High | Execution trace includes resource, schema, permission, knowledge, SQL steps. |
| F5 | Feedback loop records data but cannot create repair action | Medium | First repair workflow converts failed question into one of: term, SQL example, alias, permission review, relearn. |
| F6 | Plan is too broad and stalls | High | Split P0-P4 into executable milestones. |

#### CEO Completion Summary

| Dimension | Verdict | Notes |
| --- | --- | --- |
| Right problem | Confirmed | Accuracy governance is the right product problem. |
| Premises | Mostly confirmed | Core premises valid; one scope premise needs staging. |
| Scope | Needs selective split | Full roadmap is right, one implementation pass is too large. |
| Existing leverage | Strong | Permission-filtered SQLBot schema path already exists. |
| Strategic wedge | Needs sharper statement | Win on explainable/repairable DataEase + SQLBot runtime, not Quick BI mimicry. |
| Blocking issue before plan writing | Premise gate | User must confirm staged implementation premise. |

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Treat current spec as draft plan, not implementation plan | Mechanical | Explicit over clever | The file defines product intent and acceptance criteria, but no executable tasks. | Treating it as ready-to-code plan |
| 2 | CEO | Use SELECTIVE EXPANSION mode | Mechanical | Completeness + pragmatic | The direction is right, but only runtime/security/traceability expansions are needed before implementation planning. | Full scope expansion or scope reduction |
| 3 | CEO | Require backend-owned runtime context assembly | Mechanical | Security boundary | Frontend-selected context cannot be trusted as final authorization scope. | Frontend context assembly |
| 4 | CEO | Reuse `DatasetSQLBotManage` permission-filtered schema path | Mechanical | DRY | Existing code already handles dataset access, column permissions, row permissions, and SQL rebuild. | Building a parallel permission path |
| 5 | CEO | Split P0-P4 into milestones before coding | Taste | Pragmatic completeness | Keeps roadmap whole while preventing a stalled mega-implementation. | Implementing all P0-P4 in one pass |

### Phase 1 Dual Voices

#### CODEX SAYS (CEO — strategy challenge)

Codex flagged twelve strategic blind spots. The core critique: the plan should not center on “resource/theme governance pages.” The real product is trusted, fast, decision-grade answers. It recommends reframing this as a `DataEase Trusted Answer Layer`, with P0 focused on certified metrics/dimensions, permission-safe runtime, golden-question replay, answer trace, and dashboard/theme-scoped asking.

Codex also flagged that Quick BI is too narrow a benchmark; P1/P2 risk becoming UI theater before runtime proof; feedback/replay is too late in P4; ICP is missing; manual governance may destroy adoption; themes may be the wrong primary abstraction; permissions are P0; the moat is not resource/theme UI; workflow distribution beyond the chat page is underplayed; and SQLBot ownership of semantic truth/planner/evaluator/trace is unresolved.

#### CLAUDE SUBAGENT (CEO — strategic independence)

The independent reviewer reached the same center-of-gravity concern: the draft solves governance pages more than answer trust. It recommends adding a benchmark of top 50-100 real user questions with target SQL accuracy, permission-safety pass rate, clarification rate, and time-to-fix.

It also recommends moving a thin runtime spike into P0/P1; adding AI-assisted semantic setup from datasets, dashboards, SQL history, and feedback; adding a 10x wedge around a self-improving BI assistant for existing DataEase assets; choosing a beachhead scenario such as “department BI admin prepares a sales-analysis assistant in under 30 minutes”; adding prompt-injection and metadata poisoning threat cases; comparing resource/theme governance against semantic-layer-first; and proving measurable lift before broad UI rebuild.

#### CEO Dual Voices — Consensus Table

| Dimension | Claude subagent | Codex | Consensus |
| --- | --- | --- | --- |
| Premises valid? | Mostly valid, but manual governance and page-first assumptions are risky | Mostly valid, but resource/theme center is too narrow | CONFIRMED WITH CHANGE |
| Right problem to solve? | Reframe to answer trust and measured accuracy | Reframe to trusted decision-grade answers | CONFIRMED |
| Scope calibration correct? | Runtime spike and benchmark must move earlier | P1/P2 UI before runtime is dangerous | CONFIRMED |
| Alternatives sufficiently explored? | Missing semantic-layer-first and benchmark-first options | Themes may be wrong abstraction; dashboard/contextual asking underplayed | CONFIRMED |
| Competitive/market risks covered? | Quick BI benchmark caps ambition | Market moving toward semantic layers, proactive insights, workflow embedding | CONFIRMED |
| 6-month trajectory sound? | Risk of rich admin UI without quality lift | Risk of UI theater and no moat | CONFIRMED |

Consensus result: 6/6 confirmed concerns, 0 model disagreements. These are not mere taste differences. They require a premise-gate decision before continuing to Phase 2.

### Phase 1 Premise Gate

`/autoplan` does not auto-decide premises. The following premise changes need user confirmation before Design, Eng, and DX review continue:

1. Reframe the draft from `问数资源与分析主题对标重构` to `DataEase Trusted Answer Layer / 智能问数可信答案层`. Resource and theme configuration remain core modules, but they serve measured answer trust, not the other way around.
2. Move runtime proof into P0/P1: one theme, one resource set, permission-filtered schema, SQLBot context, trace output, and replayable evaluation must be proven before broad UI governance polish.
3. Add benchmark-first acceptance: top real user questions, SQL accuracy, permission no-leak pass rate, clarification rate, p95 latency, replay pass rate, and time-to-fix become success gates.
4. Add AI-assisted semantic setup as a required product direction: infer aliases, metric descriptions, SQL examples, and recommended questions from DataEase datasets, dashboards, SQL history, and feedback, with human approval for high-impact diffs.
5. Add semantic-layer comparison to the next implementation plan: decide whether resource/theme governance stays primary or becomes a UI over certified metrics, dimensions, entities, joins, and time grains.
6. Choose a beachhead scenario for first release: recommended default is `部门 BI 管理员在 30 分钟内准备一个销售分析可信问数助手`.

If these premises are approved, Phase 2 should review UX around the answer-trust journey, not just settings-page layout.


Additional Phase 1 decisions to carry forward:

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 6 | CEO | Reframe around trusted answer layer, pending user premise confirmation | User Challenge | Both external voices agree | User originally asked around resource/theme config, but both voices say the product center should be answer trust. | Keeping governance pages as center of gravity |
| 7 | CEO | Move runtime proof and replayable evaluation earlier, pending user premise confirmation | User Challenge | Completeness + security | Both voices agree runtime proof cannot wait until P3/P4. | Page-first roadmap |
| 8 | CEO | Add benchmark-first numeric gates, pending user premise confirmation | Mechanical | Goal-driven execution | Qualitative acceptance cannot prove accuracy lift or safety. | Qualitative-only acceptance |

### Phase 2：Design Review

Premise gate status: user approved the Phase 1 reframing with “统一继续”. Phase 2 therefore reviews the UX as `DataEase Trusted Answer Layer / 智能问数可信答案层`, not as a static resource/theme settings redesign.

#### Step 0：Design Scope Assessment

Design completeness rating: 4/10.

Reason: the draft names the right capabilities, but still describes them in a configuration-first order. A 10/10 plan for this product would define what admins and end users see first, second, and third; specify each loading, empty, error, success, partial, unsafe, permission-denied, learning-running, and replay-failed state; define the trace drawer and repair workflow at wireframe level; and state responsive/accessibility behavior before implementation starts.

DESIGN.md status: no project-level `DESIGN.md` was found. Design decisions must therefore align with existing DataEase enterprise app patterns plus universal app UI principles: readable 16px+ text, dense but scannable layout, blue-white direction, explicit status badges, minimal decorative chrome, and no generic card mosaics.

Existing pattern map:

| Surface | Existing code/pattern | Design implication |
| --- | --- | --- |
| Query config shell | `query-config/index.vue` hosts tabbed configuration | Keep it as entry, but first tab should not be a raw resource list if the product promise is answer trust. |
| Resource learning prototype | `QueryResourcePrototype.vue` has resource status, quality, feedback, relearn, task detail | Reuse concepts, but remove prototype/fallback rows and make real status mandatory. |
| Theme management | `query-theme/index.vue` is list/form oriented | Theme becomes a secondary configuration detail under trusted answer health, not the first mental model for end users. |
| SQLBot answer flow | Existing chat can carry theme/dataset context | User-facing answer needs trust/scope/trace summary, not only chart/table cards. |
| Runtime execution detail | Backend maps SQLBot steps including permission SQL generation | Turn execution detail into an admin trace drawer, not hidden logs. |

Design artifact fallback: gstack designer was available, but image generation was rate-limited and produced no images. A text/HTML wireframe was created instead at `/Users/chenliyong/.gstack/projects/chenly3-StarBI/designs/smart-query-trusted-answer-layer-20260503/trusted-answer-layer-wireframe.html`. It is a review artifact, not production UI.

#### Step 0.5：Design Dual Voices

##### CODEX SAYS (design — UX challenge)

Codex judged the plan as a strong product architecture note but a weak UI/UX plan. Its main critique: the information architecture still serves implementers and BI admin configuration concepts more than the answer-seeking user. The plan admits the current issue is backend-list thinking, then still organizes the target around resource governance, semantic config, themes, permissions, runtime, and feedback.

Codex recommends inverting the hierarchy. The first screen should answer:

1. Can this assistant answer trusted questions now?
2. Which benchmark questions pass or fail?
3. What context was used in the last answer?
4. What is blocked by permission, missing semantics, unsafe context, or learning?
5. What should the admin fix next?

Codex also flagged missing state design for loading, empty, error, partial, unsafe-context, permission-denied, learning-running, and replay-failed; no responsive strategy; no accessibility requirements; and too many generic phrases such as “风险标识”, “主题健康度”, “执行步骤”, “运营看板”, and “反馈转补丁” without screen-level decisions.

##### CLAUDE SUBAGENT (design — independent review)

The independent design reviewer reached the same center-of-gravity issue: after reframing to Trusted Answer Layer, the design hierarchy is still too settings-page first. It should become answer trust first, repair loop second, configuration third.

The strongest required correction is one north-star journey:

`bad answer discovered -> inspect trace -> identify cause -> edit semantic/permission config -> trigger relearn -> replay original question -> compare before/after -> mark fixed or reopen`

The reviewer also recommended:

- Admin first view: `Trust Health Overview`, then `Repair Queue`, then resource/theme/permission/semantic configuration.
- User first view: trusted business context and verified questions, then answer with trust/scope indicators, then trace/SQL/feedback/escalation.
- Add explicit unsafe-context blocker.
- Treat partial success separately from failure.
- Separate empty configuration, no permission, all fields filtered, row permission conflict, disabled theme, and SQLBot unavailable.
- Move replay into the primary repair flow.
- Choose one primary home for repair actions: `Trusted Answer Repair Center`.

#### Design Outside Voices — Litmus Scorecard

| Check | Claude subagent | Codex | Consensus |
| --- | --- | --- | --- |
| Brand/product unmistakable in first screen? | Not specified | Not specified | NOT SPEC'D |
| One strong visual anchor? | Trust Health should be first anchor | Trusted answer journey should be first anchor | CONFIRMED |
| Scannable by headlines only? | Current capability list is too broad | Current IA is developer-shaped | CONFIRMED FAIL |
| Each section has one job? | Repair capabilities are fragmented | Resource/theme governance competes with runtime proof | CONFIRMED FAIL |
| Cards actually necessary? | Cards should not replace repair workflow | Generic card/list UI would become settings-console theater | CONFIRMED |
| Motion improves hierarchy? | Not specified | Not specified | NOT SPEC'D |
| Premium without decorative shadows? | DataEase-like enterprise console recommended | Dense app UI, minimal chrome recommended | CONFIRMED |

Consensus result: 5 confirmed design concerns, 2 not specified, 0 meaningful disagreements. Both voices agree this is not a taste issue. The implementation plan must invert the IA and specify the repair loop.

#### Pass 1：Information Architecture

Rating: 3/10 before review -> 8/10 after required corrections.

Gap: current IA starts from resource/theme configuration, but the approved premise is answer trust. This would cause engineers to build polished settings pages while runtime trust, replay, and repair stay invisible.

Required IA:

```text
系统设置 / 问数配置
  可信答案层总览
    1. Trust Health / 可信健康
       - 是否可标记为可信
       - benchmark 通过率
       - 权限零泄漏状态
       - unsafe context 阻断数
       - 学习失败和语义过期数
    2. Repair Queue / 待修复答案
       - 用户真实失败问题
       - benchmark replay 失败问题
       - 权限阻断问题
       - 语义冲突问题
       - 学习失败资源
    3. Trace Inspector / 答案追踪
       - 问题理解
       - 主题与授权资源
       - 排除资源/字段原因
       - 命中术语和 SQL 示例
       - 生成 SQL 和权限过滤
       - 执行结果和反馈 ID
    4. Configuration Assets / 配置资产
       - 问数资源
       - 分析主题
       - 权限配置
       - 行列权限
       - 术语和 SQL 示例
```

Primary admin layout:

```text
┌──────────────────┬────────────────────────────────────┬──────────────────────┐
│ 可信答案层导航    │ Trust Health                       │ Trace Inspector      │
│ - 总览            │ - 是否可信                         │ - 本次问题理解       │
│ - 修复队列        │ - benchmark/replay/权限指标         │ - 授权/排除资源      │
│ - Benchmark       │                                    │ - SQL/权限/反馈      │
│ - 问数资源        │ Repair Queue                       │                      │
│ - 分析主题        │ - 按影响排序的问题                  │                      │
│ - 权限与语义      │ - 主 CTA：查看 trace 并修复          │                      │
└──────────────────┴────────────────────────────────────┴──────────────────────┘
```

Primary end-user IA:

```text
智能问数
  1. 当前可信业务上下文
     - 主题/业务助手名称
     - 可问范围摘要
     - 已验证推荐问题
  2. 问答消息流
     - 用户问题
     - 文本结论 + 图表/表格事实结果
     - 信任/范围/部分回答提示
  3. 可展开追踪
     - 为什么这样答
     - 使用了哪些数据和权限
     - SQL 和反馈入口
```

Autoplan decision: require answer-trust-first IA in the implementation plan. Classification: User Challenge already accepted in Phase 1. Principle: explicit over clever and user outcome first.

#### Pass 2：Interaction State Coverage

Rating: 2/10 before review -> 8/10 after required corrections.

The implementation plan must include this state matrix at minimum:

| Surface | Loading | Empty | Error | Success | Partial | Unsafe / Permission |
| --- | --- | --- | --- | --- | --- | --- |
| Trust Health overview | Skeleton metrics and “正在加载可信状态” | “还没有可信评估，先选择一个主题并运行 benchmark” + CTA | Show failing source: learning, runtime, replay, SQLBot config | Show trust status only when evidence exists | Show “部分可信” with failed dimensions | Block trusted label and show reason |
| Repair Queue | Row skeletons | Warm empty: “暂无待修复问题，最近一次回放全部通过” | Retry + error ID | Sorted actionable issues | Some issues hidden by admin permission | Security issues pinned above semantic issues |
| Resource list | Table skeleton | “还没有可问资源” + add/learn CTA | Learning API failure, no fake fallback rows | Real learning/quality status | Last successful version in use while relearning | No permission resources hidden or explained by role |
| Theme detail | Loading theme/resource scope | Empty theme means no resources configured | Theme fetch/save failure | Healthy theme with default resource and verified questions | 12 bound resources, 5 authorized for current user | No authorized datasets blocks asking |
| Answer result | Streaming text/table/chart states | No result only after failed generation | SQLBot unavailable or execution error | Text conclusion plus chart/table facts | Partial answer badge and scope summary | Unsafe context blocker before SQLBot call |
| Trace drawer | Step-by-step skeleton | No trace because no query executed | Trace fetch failure with feedback ID | Full context, SQL, permissions, execution | Show included/excluded scope counts | Hide excluded field names from end users; admins see reasons |
| Replay result | Progress by question | No benchmark questions configured | Replay execution failure | Pass with before/after diff | Pass with changed scope warning | Fail if unauthorized schema would enter model |

State copy rules:

- Never display `学习成功` unless it comes from a real learning status or replay evidence.
- “无资源” means no resources configured. “无权限” means resources exist but the user cannot access them. These states need different copy and CTA.
- Unsafe context is not an empty state. It is a blocker.
- Partial answer is not failure. It must show included scope, excluded scope, and the user-facing consequence.

Autoplan decision: make this matrix mandatory input to `writing-plans`. Classification: Mechanical. Principle: completeness.

#### Pass 3：User Journey & Emotional Arc

Rating: 4/10 before review -> 8/10 after required corrections.

Admin storyboard:

| Step | User does | User feels | Plan must specify |
| --- | --- | --- | --- |
| 1 | Opens 问数配置 | Wants to know if 问数 is trustworthy | First screen shows trust health, not raw config tables. |
| 2 | Sees a blocking issue | Needs priority, not a pile of settings | Repair queue sorted by business impact and security severity. |
| 3 | Opens trace | Wants proof, not vague “质量低” labels | Trace shows selected theme, authorized resources, excluded fields, terms, SQL examples, generated SQL, permission filters, result, feedback ID. |
| 4 | Identifies cause | Needs one obvious next action | Each cause maps to one primary CTA: fix permission, edit alias, add metric definition, add SQL example, relearn, replay. |
| 5 | Fixes and relearns | Wants confidence that the fix worked | Last successful version remains visible; learning-running state is explicit. |
| 6 | Replays original question | Needs before/after proof | Replay comparison shows old answer, new answer, SQL diff, pass/fail reason, promote fix. |
| 7 | Marks fixed | Wants durable confidence | Fixed issue leaves queue and updates benchmark/trust evidence. |

End-user storyboard:

| Step | User does | User feels | Plan must specify |
| --- | --- | --- | --- |
| 1 | Enters smart query | Needs to know what can be asked | Show selected trusted business context and verified questions. |
| 2 | Asks a question | Expects answer, not config details | Answer stream stays in Q&A alternation. |
| 3 | Gets result | Needs facts and interpretation separated | Text conclusion + chart/table facts appear as answer result; insight/deep interpretation is a follow-up question/action in the message flow. |
| 4 | Sees partial or unsafe state | Needs clarity without leaking data | Partial scope summary for user; detailed excluded fields only for authorized admins. |
| 5 | Gives feedback | Wants issue to matter | Feedback creates repair queue item with trace link. |

Autoplan decision: choose `Trusted Answer Repair Center` as the primary home for repair actions. Resource/theme detail pages link into it instead of duplicating repair flows. Classification: Mechanical. Principle: one job per surface.

#### Pass 4：AI Slop Risk

Rating: 5/10 before review -> 8/10 after required corrections.

Classifier: APP UI. This is a task-focused enterprise BI/admin workspace.

Hard rules for the implementation plan:

- Avoid stacked decorative cards. Cards are allowed only for trust metrics, queue items, trace sections, or actionable configuration summaries.
- Body text must be at least 16px and meet contrast ratio 4.5:1.
- Keep blue-white DataEase direction; do not introduce purple/indigo gradient AI-app styling.
- Do not use icon bubbles, three-column feature grids, centered hero copy, or decorative blobs.
- Use utility copy: “权限过滤后无可问字段”, not mood copy like “智能发现你的数据价值”.
- Primary CTAs must be action verbs tied to repair: `查看 Trace`, `修复权限`, `补充指标口径`, `重新学习`, `回放验证`, `标记已修复`.

Specific replacement decisions:

| Vague phrase in draft | Required concrete design decision |
| --- | --- |
| 主题健康度 | Trust Health panel with benchmark pass rate, permission leak count, unsafe-context count, learning failures, stale semantics, p95 latency. |
| 风险标识 | Severity badges: 阻断, 高风险, 需关注, 已验证. Each badge has one CTA. |
| 执行步骤 | Trace drawer sections: interpretation, selected theme, authorized resources, excluded resources/fields, matched terms, SQL examples, generated SQL, permission filters, execution result, feedback ID. |
| 反馈转补丁 | Repair wizard: classify cause -> edit config -> relearn -> replay -> promote fix. |
| 运营看板 | Deferred until runtime proof exists; first release uses Trust Health + Repair Queue. |

Autoplan decision: no generic settings table-only implementation. Classification: Mechanical. Principle: explicit over clever.

#### Pass 5：Design System Alignment

Rating: 5/10 before review -> 7/10 after required corrections.

No `DESIGN.md` exists, so the plan cannot bind to exact design tokens. The implementation plan should still align with DataEase conventions already present in the app: Element Plus-style tables/forms/drawers, left navigation or tabbed system settings shell, neutral surfaces, blue action color, and compact enterprise layout.

Component vocabulary:

| Component | Purpose | Constraint |
| --- | --- | --- |
| Trust Health panel | First-screen trust evidence | Must not mark trusted without benchmark/replay/permission evidence. |
| Repair Queue table/list | Prioritized operational work | Columns should be dense but readable: severity, question/resource/theme, cause, impact, status, primary action. |
| Trace drawer | Diagnostic proof | Right-side drawer on desktop, full-screen sheet on mobile/tablet. |
| Replay comparison | Proves repair | Before/after answer, SQL diff, pass/fail reason, promote/reopen actions. |
| Configuration asset cards/table | Secondary navigation to resources/themes/permissions | Do not dominate first screen. |
| State banners | Unsafe/partial/no-permission/learning-running | Must include cause and recovery action. |

Open design system gap: no canonical typography/spacing token source was found. The implementation plan should use existing DataEase style variables where available and explicitly avoid making new global design tokens unless the codebase already has a pattern.

#### Pass 6：Responsive & Accessibility

Rating: 2/10 before review -> 7/10 after required corrections.

Responsive requirements:

| Viewport | Required behavior |
| --- | --- |
| Desktop >= 1200px | Three-zone layout is allowed: navigation, primary trust/repair workspace, right trace drawer. Trace can stay pinned when inspecting an issue. |
| Tablet 768-1199px | Navigation remains, trace becomes bottom or full-screen drawer; metrics wrap into two rows; queue remains primary. |
| Mobile < 768px | End-user answer experience must work. Admin governance can be read-only/limited, but trace opens as full-screen sheet; queue rows become stacked with primary CTA visible. |

Accessibility requirements:

- All status badges must include text, not color-only meaning.
- Keyboard focus order: nav -> trust health -> repair queue -> trace drawer -> primary CTA.
- Every row action must be reachable by keyboard.
- Trace drawer needs title, close control, focus trap, Escape close, and focus return to source row.
- Buttons and row actions need 44px minimum touch target on touch screens.
- Disabled actions must explain why, for example “学习中，当前使用上次成功版本，完成后可回放”.
- SQL blocks need accessible labels and copy buttons with keyboard support.

Autoplan decision: governance can be desktop-optimized, but user answer and trace summary must be mobile-usable. Classification: Mechanical. Principle: user outcome.

#### Pass 7：Unresolved Design Decisions

| Decision needed | If deferred, what happens | Autoplan resolution |
| --- | --- | --- |
| Is the first screen resource/theme lists or trust health? | Engineers build another dense settings console. | Trust Health first. Configuration assets second. |
| Where do repair actions live? | Fix flows fragment across resource detail, theme detail, feedback list, and trace. | Primary home is Trusted Answer Repair Center / Repair Queue. |
| Is replay core or future ops? | Repair cannot be proven; “fixed” becomes manual belief. | Replay is core to first repair flow. Broad historical replay dashboard can be deferred. |
| How is unsafe context shown? | System may silently fail or leak details. | Unsafe context is a blocker before SQLBot call; admins see reasons, end users see safe summary. |
| How are partial answers shown? | Users may trust incomplete answers. | Show partial badge, included scope, excluded count, and admin escalation. |
| What does “trusted” mean? | Learning success gets mistaken for correctness. | Trusted requires real learning status, permission-safe context, benchmark/replay pass evidence. |
| Are themes user-facing? | Users may not understand “analysis theme”. | User UI presents themes as `业务上下文` or `可信问数助手`; admin UI can keep `分析主题`. |

#### Phase 2 Required Additions To The Next Implementation Plan

- Rename the product center in the implementation plan to `DataEase Trusted Answer Layer / 智能问数可信答案层`.
- Make the first milestone ship one vertical trust loop: Trust Health -> Repair Queue -> Trace -> semantic/permission fix -> relearn -> replay -> promote fix.
- Convert the existing P1/P2/P3/P4 roadmap so runtime proof and replay evidence appear before broad page polish.
- Add the interaction state matrix above to the implementation plan.
- Add wireframe-level requirements for Trust Health, Repair Queue, Trace Drawer, Replay Comparison, and Config Assets.
- Treat query result UX as Q&A alternation: user asks, answer returns text conclusion plus chart/table facts; deeper data interpretation is triggered as a follow-up question/action, not a pile of AI cards.

#### Design Completion Summary

| Pass | Before | After | Remaining risk |
| --- | --- | --- | --- |
| Information Architecture | 3/10 | 8/10 | Exact navigation naming can be tuned during implementation. |
| Interaction States | 2/10 | 8/10 | Backend may not expose every state yet; implementation plan must map API gaps. |
| User Journey | 4/10 | 8/10 | Repair wizard details need implementation-level task breakdown. |
| AI Slop Risk | 5/10 | 8/10 | Visual QA still required after UI is built. |
| Design System Alignment | 5/10 | 7/10 | No `DESIGN.md`; rely on existing DataEase patterns. |
| Responsive & Accessibility | 2/10 | 7/10 | Mobile admin capability may remain limited, but answer/trace must work. |
| Unresolved Decisions | 7 open | 7 resolved | None block Eng review. |

Phase 2 complete. Codex: 8 design concern groups. Claude subagent: 18 findings. Consensus: 5/7 litmus checks confirmed or confirmed-fail, 2 not specified, 0 disagreements. Passing to Phase 3.

Additional Phase 2 decisions to carry forward:

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 9 | Design | Put Trust Health before resource/theme lists | Mechanical | Hierarchy serves user outcome | Both design voices agree the current IA is settings-page first. | Resource/theme list as first screen |
| 10 | Design | Choose Trusted Answer Repair Center as primary repair home | Mechanical | One job per surface | Fragmented repair entry points would make bad answers hard to fix. | Duplicating repair flows in every config detail page |
| 11 | Design | Move replay into the primary repair flow | Mechanical | Completeness | A repair is not proven until replay passes. | Treating replay as future operations dashboard only |
| 12 | Design | Treat unsafe context as a blocker state | Mechanical | Security boundary | Unsafe context must not silently enter SQLBot or be hidden as an empty state. | Silent fallback or frontend-only warning |
| 13 | Design | Present themes to end users as business context/trusted assistant | Taste | Clarity over internal terminology | Admins can use analysis-theme terminology; users need concrete business context. | Exposing “分析主题” as the primary user mental model |

### Phase 3：Eng Review

#### Step 0：Scope Challenge

Examined code:

- `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryChatServer.java`
- `dataease/core/core-backend/src/main/java/io/dataease/ai/gateway/SseStreamProxy.java`
- `dataease/core/core-backend/src/main/java/io/dataease/ai/query/manage/AIQueryThemeManage.java`
- `dataease/core/core-backend/src/main/java/io/dataease/ai/query/server/AIQueryResourceLearningServer.java`
- `dataease/core/core-backend/src/main/java/io/dataease/dataset/manage/DatasetSQLBotManage.java`
- `dataease/core/core-frontend/src/api/aiQuery.ts`
- `dataease/core/core-frontend/src/api/aiQueryTheme.ts`
- `dataease/core/core-frontend/src/api/queryResourceLearning.ts`
- `dataease/core/core-frontend/src/views/sqlbot/index.vue`
- `dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
- `dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue`
- `dataease/core/core-frontend/src/views/system/query-config/QueryResourcePrototype.vue`

Existing code leverage:

| Sub-problem | Existing code | Engineering read |
| --- | --- | --- |
| Resource learning, feedback, replay proxy | `AIQueryResourceLearningServer` and `AIQueryThemeManage` expose resource, learn, delete, quality summary, feedback summary, feedback events, patches, replay, metric, relearning decision. | Good leverage. Do not rebuild. Need to aggregate into Trust Health/Repair Queue. |
| Permission-filtered SQLBot datasource/schema | `DatasetSQLBotManage.getDatasourceList(...)` handles accessible datasets, column permissions, row permissions, SQL rebuild, and table removal on failure. | Strong leverage. Must become runtime context builder input, not only datasource endpoint support. |
| Theme CRUD and dataset filtering | `AIQueryThemeManage.buildThemeVO(...)` filters datasets for accessible dataset IDs. | Useful but insufficient. Theme visibility and runtime authorization need explicit contract. |
| Runtime chat proxy | `AIQueryChatServer` + `SseStreamProxy` exist. | Too thin. They currently pass client-derived context to SQLBot and do not construct trusted context. |
| Frontend SQLBot chat | `sqlbot/index.vue` and `sqlbotDirect.ts` already implement full chat, history, chart, recommend, analysis flows. | Major migration risk. Direct SQLBot runtime calls contradict backend-only boundary. |
| Fake status debt | `query-theme/index.vue` still computes `statusLabel: '学习成功'` for resource/theme rows. | Must be first implementation task. |

Minimum complete scope for next implementation plan:

1. Remove fake learning success state from theme/resource surfaces.
2. Add backend-owned trusted runtime context builder.
3. Route runtime SQLBot calls through DataEase backend, not `sqlbotDirect` direct frontend calls.
4. Produce trace states and unsafe/partial blockers from backend, not UI guesses.
5. Use existing resource-learning/replay APIs to power Trust Health and Repair Queue.
6. Add tests proving no unauthorized context reaches SQLBot.

Complexity check: the complete solution will touch more than 8 files and introduce at least one backend service. This is unavoidable because the existing seam is split across SQLBot direct frontend calls, backend proxy endpoints, theme management, resource learning, and dataset permission filtering. Scope should be reduced by vertical slicing, not by skipping runtime proof.

TODOS cross-reference: no repository `TODOS.md` exists. Deferred items are captured below in the Eng TODO section instead of writing a project TODO file during this draft-plan review.

#### Step 0.5：Eng Dual Voices

##### CODEX SAYS (eng — architecture challenge)

Codex reported three Critical issues:

1. The plan is internally inconsistent. The original roadmap still ships resource/theme UI first and delays runtime context to P3 and replay to P4, while Phase 1/2 say Trust Health, runtime proof, repair, and replay must be first milestone.
2. Backend-owned runtime context is not designed as an enforceable boundary. `AIQueryChatServer` removes only `question`, and `SseStreamProxy` forwards a tiny client-derived body to SQLBot.
3. The frontend still directly calls SQLBot runtime endpoints through `sqlbotDirect.ts`, contradicting the backend-only requirement.

Codex also flagged: ID overload between theme/model/datasource IDs, theme visibility being treated as dataset access instead of its own permission boundary, knowledge context leak/poisoning risk, unsafe/partial states existing only as UX copy, large-tenant performance risks, the backend SSE proxy not truly streaming, and replay/promotion needing versioned snapshots.

##### CLAUDE SUBAGENT (eng — independent review)

No new Claude subagent was launched in this phase because the active Codex environment only permits spawning subagents when the user explicitly asks for subagents or parallel agent work. This is a workflow degradation, not a product conclusion. Phase 3 therefore uses local code review plus Codex eng voice. Degradation status: `single external eng voice`.

#### Eng Dual Voices — Consensus Table

| Dimension | Local code review | Codex | Consensus |
| --- | --- | --- | --- |
| Architecture sound? | Runtime boundary not enforceable yet | Runtime context builder missing | CONFIRMED FAIL |
| Test coverage sufficient? | Existing smoke/contract tests do not cover runtime no-leak path | Minimum test gates missing | CONFIRMED FAIL |
| Performance risks addressed? | Theme/list/schema paths can be expensive | Full schema path and N+1 theme relation loading are risks | CONFIRMED FAIL |
| Security threats covered? | Permission-filtered schema exists but is not the chat boundary | Frontend direct SQLBot calls and knowledge poisoning are risks | CONFIRMED FAIL |
| Error paths handled? | Some learning errors are proxied, runtime states absent | Unsafe/partial states are UX-only | CONFIRMED FAIL |
| Deployment risk manageable? | Needs vertical slice and backend proxy migration | Roadmap conflict must be resolved first | CONFIRMED WITH CHANGE |

Consensus result: 6/6 engineering dimensions need corrective changes before writing an implementation plan.

#### Section 1：Architecture Review

Current architecture reality:

```text
Frontend sqlbot/index.vue
  ├─ builds dataset/model/datasource state
  ├─ buildSqlBotCertificate() includes DataEase token + datasetIds/themeId params
  ├─ sqlbotDirect.ts -> SQLBot /chat/assistant/start
  ├─ sqlbotDirect.ts -> SQLBot /chat/question
  ├─ sqlbotDirect.ts -> SQLBot /chat/recommend_questions
  └─ sqlbotDirect.ts -> SQLBot chart/history/usage endpoints

Alternative backend proxy path
  Frontend aiQuery.chatStream()
    -> AIQueryChatServer.chatStream()
      -> SseStreamProxy.proxyChatStream()
        -> SQLBot /chat/question
           (only maps chatId, datasetId, themeId)

Permission schema path
  DatasetSQLBotManage.getDatasourceList(dsId, datasetId, datasetIds)
    -> query accessible datasets
    -> load column permissions
    -> load row permissions
    -> rebuild dataset SQL
    -> remove unsafe/failed tables
    -> return SQLBot datasource/schema payload
```

Target architecture required before coding:

```text
Frontend smart query
  └─ POST /ai/query/trusted-answer/stream
       request: question, themeId, datasourceId?, chatId?, modelId?
       never: raw schema, arbitrary datasetIds, SQLBot token, SQLBot domain

DataEase backend
  ├─ TrustedAnswerRuntimeContextService
  │   ├─ validate current user
  │   ├─ validate theme visible + enabled
  │   ├─ resolve theme datasetIds/defaultDatasetIds
  │   ├─ intersect with authorized dataset IDs
  │   ├─ call DatasetSQLBotManage.getDatasourceList(...)
  │   ├─ filter terminology / SQL examples / patches / recommended questions
  │   ├─ produce runtime state
  │   │   ├─ TRUSTED
  │   │   ├─ NEEDS_CLARIFICATION
  │   │   ├─ PARTIAL
  │   │   ├─ UNSAFE_BLOCKED
  │   │   ├─ NO_AUTHORIZED_CONTEXT
  │   │   └─ FAILED
  │   └─ create trace_id + trace payload
  ├─ SQLBotRuntimeProxy
  │   ├─ adapt canonical DTO to SQLBot-specific fields
  │   ├─ stream response incrementally
  │   └─ persist trace/feedback linkage
  └─ TrustHealthService
      ├─ aggregate resource learning state
      ├─ aggregate benchmark/replay state
      ├─ aggregate permission blockers
      └─ return Trust Health + Repair Queue
```

Top architecture findings:

| Severity | Confidence | Finding | Fix |
| --- | --- | --- | --- |
| Critical | 10/10 | Existing chat path trusts frontend-selected context and direct SQLBot calls still exist. | Backend context builder must be the only runtime path. |
| Critical | 10/10 | Original roadmap contradicts accepted premise by delaying runtime proof/replay. | Replace roadmap in implementation plan with vertical trusted-answer loop. |
| High | 9/10 | `ai_modal_id` and `datasetId -> datasource_id` naming overload can route wrong IDs. | Define canonical runtime DTO and SQLBot adapter boundary. |
| High | 8/10 | Theme visibility is not an explicit runtime permission model. | Add theme visibility/admin/runtime permission checks separate from dataset access. |
| High | 8/10 | Knowledge context can leak unauthorized fields or accept prompt-poisoned feedback patches. | Scope terms/examples/patches by authorized dataset/field IDs and require approval + replay. |
| High | 9/10 | Current backend proxy buffers SSE instead of streaming incrementally. | Implement streaming proxy with cancellation, timeout, and structured trace events. |

Autoplan decision: next implementation plan must start with backend runtime contract, not UI. Classification: Mechanical. Principle: security boundary first.

#### Section 2：Code Quality Review

Code quality risks for implementation:

| Severity | Confidence | Area | Issue | Required plan correction |
| --- | --- | --- | --- | --- |
| High | 9/10 | Frontend APIs | `aiQuery.ts`, `aiQueryTheme.ts`, and `queryResourceLearning.ts` already overlap concepts. | Do not add a fourth duplicate API module. Add shared runtime/trust types or co-locate under one query domain with explicit boundaries. |
| High | 9/10 | Backend manage class | `AIQueryThemeManage` already handles theme CRUD, SQLBot config, runtime models, execution details, and resource learning proxy. | New trusted-answer orchestration should be a separate service, not another large block in `AIQueryThemeManage`. |
| High | 8/10 | Runtime DTO | Current naming mixes model/theme/modal/datasource/dataset. | Add typed request/response classes for trusted runtime. Do not use raw `Map<String,Object>` past controller boundary. |
| Medium | 8/10 | Frontend direct SQLBot helper | `sqlbotDirect.ts` is marked deprecated but still owns runtime behavior. | Implementation plan must define strangler migration: wrap or replace runtime calls one flow at a time with guard tests. |
| Medium | 7/10 | Status labels | UI tests allow `学习成功` as a valid component label, but not whether it came from real data. | Add source-aware tests: status may render success only from real API/replay evidence. |

Autoplan decision: avoid stuffing trusted-answer orchestration into existing god classes. Classification: Mechanical. Principle: explicit over clever.

#### Section 3：Test Review

Detected test infrastructure:

- Backend: Maven/JUnit under `core-backend/src/test`.
- Frontend: package-level scripts plus executable contract harnesses under `core-frontend/src/**/__tests__`.
- Existing relevant tests include `AIQueryResourceLearningContractSmokeTest`, `AIQueryThemeManageTest`, `query-resource-learning-api.spec.ts`, `query-resource-learning-ui-contract.spec.ts`, SQLBot message-flow contract specs.

Existing tests are useful but not sufficient. They mostly validate contracts, wrappers, and source-level UI boundaries. They do not prove that unauthorized schema/knowledge is excluded before SQLBot runtime calls.

Coverage diagram required for the implementation plan:

```text
CODE PATHS                                             TEST PLAN
[+] TrustedAnswerRuntimeContextService                 [NEW]
  ├─ validateTheme(themeId, user)                       [GAP] backend unit: enabled/disabled/invisible/not-found
  ├─ resolveAuthorizedDatasets(themeId, user)           [GAP] backend unit: no authorized datasets
  ├─ buildPermissionFilteredSchema(...)                 [GAP] backend unit: unauthorized fields absent before SQLBot call
  ├─ filterKnowledgeContext(...)                        [GAP] backend unit: terms/examples/patches scoped to visible fields
  ├─ classifyRuntimeState(...)                          [GAP] backend unit: TRUSTED/PARTIAL/UNSAFE/NO_AUTHORIZED_CONTEXT
  └─ buildTrace(...)                                    [GAP] backend unit: redacted user trace + full admin trace

[+] SQLBotRuntimeProxy                                  [NEW]
  ├─ canonical DTO -> SQLBot adapter                    [GAP] backend contract: theme_id != model_id != datasource_id
  ├─ stream question events                             [GAP] backend streaming test: incremental SSE
  ├─ cancellation/timeout                               [GAP] backend integration test
  └─ SQLBot error -> runtime state                      [GAP] backend unit/integration

[+] TrustHealthService                                  [NEW]
  ├─ aggregate learning state                           [GAP] backend unit with empty/error/success/partial
  ├─ aggregate replay/benchmark state                   [GAP] backend unit
  ├─ sort Repair Queue by impact/security               [GAP] backend unit
  └─ fake status prevention                             [GAP] frontend contract + backend fixture

[+] Frontend smart query runtime                         [MODIFIED]
  ├─ no direct runtime import from sqlbotDirect          [GAP] source contract/lint guard
  ├─ Trust Health first-screen layout                    [GAP] UI contract/E2E
  ├─ Repair Queue -> Trace -> Relearn -> Replay          [GAP] E2E
  ├─ unsafe/partial/no-permission states                 [GAP] E2E
  └─ Q&A alternation with text + chart/table facts       [GAP] SQLBot message-flow contract

USER FLOWS
[+] Admin repair loop                                    [GAP] [->E2E]
  ├─ bad answer appears in queue
  ├─ admin opens trace
  ├─ admin applies semantic/permission fix
  ├─ relearn runs
  └─ replay passes and promotes fix

[+] End-user safe query                                  [GAP] [->E2E]
  ├─ chooses business context
  ├─ asks question
  ├─ backend filters context
  ├─ receives trusted/partial/unsafe result
  └─ feedback creates repair event

[+] Benchmark eval                                       [GAP] [->EVAL]
  ├─ top 50-100 questions
  ├─ SQL accuracy
  ├─ permission no-leak
  ├─ clarification rate
  ├─ p95 latency
  ├─ replay pass rate
  └─ time-to-fix
```

Required test plan artifact written:

`/Users/chenliyong/.gstack/projects/chenly3-StarBI/chenliyong-main-eng-review-test-plan-20260503-082912.md`

Minimum test gates before implementation is called safe:

- Backend test proving unauthorized datasets/fields never reach SQLBot request body.
- Backend test proving row-permission rebuild failure removes/blocks unsafe tables and records trace reason.
- Backend test proving disabled/no-authorized-resource themes cannot run.
- Backend test proving canonical DTO separates `theme_id`, `model_id`, `datasource_id`, `dataset_ids`, `default_dataset_ids`, `trace_id`.
- Backend test proving terms, SQL examples, patches, and recommended questions are filtered by visible schema.
- Frontend contract test proving no fake `学习成功` is rendered without real learning/replay evidence.
- Frontend source/lint guard proving runtime chat no longer imports direct SQLBot runtime helpers.
- Browser/E2E path for Trust Health -> Repair Queue -> Trace -> Relearn -> Replay.
- Eval/benchmark suite for SQL accuracy, permission no-leak, clarification rate, p95 latency, replay pass rate, and time-to-fix.

#### Section 4：Performance Review

Performance risks:

| Severity | Confidence | Risk | Fix |
| --- | --- | --- | --- |
| High | 8/10 | Building accessible dataset IDs by constructing full SQLBot datasource/schema is too expensive for every theme/list operation. | Add lightweight accessible dataset ID query and reserve full schema build for runtime context. |
| High | 8/10 | `buildThemeVO` can load theme relations and dataset maps per theme, creating N+1 behavior as theme counts grow. | Batch load relations and dataset names for list pages. |
| High | 8/10 | Permission-filtered schema can be large and expensive under high field/resource cardinality. | Cache by org/user/roles/theme/datasource/permission-version and invalidate on permission/dataset/theme changes. |
| Medium | 7/10 | Trust Health could call resource learning, feedback, replay, and theme APIs separately per row. | Backend aggregate endpoint should fan in once and return page-ready payload. |
| Medium | 7/10 | Replay/benchmark over 50-100 questions can overload SQLBot if run synchronously. | Add async task/progress model with concurrency limits and cancellation. |

#### NOT in scope for the next implementation milestone

- Full multi-month operations dashboard with trend analytics.
- Full semantic-layer authoring suite beyond the first trusted-answer loop.
- Automatic activation of user feedback patches without admin approval and replay.
- Rewriting SQLBot model generation internals.
- Rebuilding DataEase permission system.

#### What already exists for implementation

- Theme CRUD, dataset binding, welcome text, recommended questions.
- Resource learning proxy, feedback events, patches, replay, feedback metrics.
- Permission-filtered SQLBot datasource/schema construction.
- Execution details proxy.
- SQLBot chat UI and message-flow tests.
- Query config shell and resource-learning UI contracts.

#### Eng Failure Modes Registry

| ID | Failure mode | Severity | Critical gap? | Mitigation |
| --- | --- | --- | --- | --- |
| EF1 | UI ships before backend runtime proof | Critical | Yes | Vertical trusted-answer loop as first milestone. |
| EF2 | Frontend-selected dataset/theme enters SQLBot unchecked | Critical | Yes | Backend-owned context builder and no-leak tests. |
| EF3 | Direct SQLBot frontend calls bypass DataEase backend | Critical | Yes | Proxy migration and source guard. |
| EF4 | Model/theme/datasource IDs are confused | High | Yes | Canonical runtime DTO and SQLBot adapter. |
| EF5 | Knowledge context leaks unauthorized fields | High | Yes | Scope knowledge by authorized dataset/field IDs. |
| EF6 | Unsafe context is only a UI label | High | Yes | Backend state machine and blockers. |
| EF7 | Large tenants suffer slow theme/trust pages | High | No | Batch queries and permission-schema caching. |
| EF8 | Replay cannot prove fixes because no versioned snapshot exists | High | Yes | Version semantic config, learning snapshot, permission context, trace. |

#### Eng TODO / Deferred Scope

- Add full trend dashboard after Trust Health and Repair Queue have real runtime data.
- Add broader automatic historical replay after one replay path is proven.
- Add full semantic-layer-first comparison during implementation planning.
- Add design system token cleanup only if implementation touches shared style variables.

#### Eng Completion Summary

| Dimension | Verdict | Notes |
| --- | --- | --- |
| Architecture Review | 6 issues found | Runtime context boundary is the main blocker. |
| Code Quality Review | 5 issues found | Avoid expanding `AIQueryThemeManage`; avoid duplicate API/type modules. |
| Test Review | Diagram produced, 9 required test gates | Existing tests are contract/smoke, not runtime no-leak proof. |
| Performance Review | 5 issues found | Need lightweight permission queries, batching, caching, async replay. |
| Test plan artifact | Written | `/Users/chenliyong/.gstack/projects/chenly3-StarBI/chenliyong-main-eng-review-test-plan-20260503-082912.md` |
| Critical gaps | 6 flagged | Must be resolved in `writing-plans` before code. |

Phase 3 complete. Codex: 10 concerns. Claude subagent: not run due active subagent restrictions. Consensus: local review and Codex agree on 6/6 engineering dimensions. Passing to Phase 3.5 DX Review.

Additional Phase 3 decisions to carry forward:

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 14 | Eng | Replace original P0-P4 roadmap in implementation plan with vertical trusted-answer loop | Mechanical | Goal-driven execution | Appended review and original roadmap currently conflict. | Shipping resource/theme UI before runtime proof |
| 15 | Eng | Add `TrustedAnswerRuntimeContextService` as backend boundary | Mechanical | Security boundary | Current chat proxy trusts frontend context. | More frontend context assembly |
| 16 | Eng | Migrate runtime SQLBot calls behind DataEase backend proxies | Mechanical | Backend owns SQLBot calls | Direct `sqlbotDirect` runtime calls violate accepted premise. | Keeping frontend direct SQLBot runtime calls |
| 17 | Eng | Define canonical runtime DTO and SQLBot adapter | Mechanical | Explicit over clever | Current `ai_modal_id`, `themeId`, `datasetId`, `datasource_id` meanings collide. | Raw map payloads and overloaded IDs |
| 18 | Eng | Add backend runtime state machine | Mechanical | Error paths are product behavior | Unsafe/partial/no-auth states must be enforceable, not UI-only. | UI-only state labels |
| 19 | Eng | Require versioned replay snapshots before promote-fix | Mechanical | Replay must prove repair | Without frozen before/after context, replay evidence is weak. | Manual “fixed” flag without proof |

### Phase 3.5：DX Review

Developer-facing scope: yes. This plan changes backend runtime contracts, SQLBot proxy boundaries, permission/debug behavior, trace output, tests, and developer documentation for implementers.

Mode: `DX POLISH`. This is an enhancement to an existing DataEase + SQLBot product, not a new external SDK. The goal is not to invent a public developer platform; the goal is to make internal feature implementation, debugging, testing, and migration hard to misunderstand.

#### Step 0：DX Scope Assessment

Product type: internal API/service/platform feature for DataEase developers integrating smart query runtime.

Primary developer surface:

- Java backend service contracts for trusted-answer runtime context assembly.
- SQLBot runtime proxy contract and migration away from direct frontend SQLBot calls.
- Vue frontend API wrappers, state handling, trace drawer, and repair flow integration.
- Test fixtures for permission-safe context, mocked SQLBot runtime, replay, and trace states.
- Developer docs for local quickstart, runtime DTOs, error codes, trace debugging, and migration.

Evidence sampled:

- Root `README.md` only points to deployment docs and does not explain local smart-query development.
- `dataease/core/core-frontend/README.md` is still the default Vue 3 + Vite template, not a StarBI/DataEase frontend developer guide.
- Relevant code already has runtime helpers and errors in `sqlbotDirect.ts`, `AIQueryChatServer`, `SseStreamProxy`, `AIQueryResourceLearningServer`, `AIQueryThemeManage`, and `DatasetSQLBotManage`.
- Existing tests are useful smoke/contract tests, but there is no documented one-command mocked trusted-answer flow.

Initial DX completeness: 4/10.

TTHW assessment:

| Target | Current estimate | Reason |
| --- | --- | --- |
| Under 15 minutes for a repo developer to run a mocked trusted-answer request and inspect a trace state | 45-90 minutes | The plan has architecture and test gates, but no quickstart, fixture, curl, expected SSE events, expected `trace_id`, or exact test command sequence. |
| Under 5 minutes | Not realistic for first milestone | This is a multi-service DataEase + SQLBot integration with permissions, schema filtering, and replay. Under 5 minutes can become a later DX target after stub mode and docs exist. |

#### Developer Persona Card

| Field | Description |
| --- | --- |
| Who | DataEase backend/frontend developer implementing the trusted-answer runtime and debugging SQLBot integration. |
| Context | They are asked to make resource/theme/permission configuration affect a real smart-query answer, not only the settings UI. |
| Tolerance | 15 minutes to see a mocked trusted-answer request produce a trace state; 30 minutes to understand where to add tests. |
| Expects | Clear endpoint contract, typed DTOs, fixture data, copy-paste test commands, exact error codes, trace examples, and a safe migration path from `sqlbotDirect.ts`. |

#### Developer Empathy Narrative

I am a DataEase developer picking up this feature after the product and engineering review. I open the root `README.md` and learn this repo is a local DataEase + SQLBot integration, but it sends me to deployment docs rather than a local smart-query development path. I open the frontend README and it is still the Vue/Vite template, so it does not tell me which API wrapper, fixture, or page owns trusted-answer work. The spec tells me the target endpoint should be `POST /ai/query/trusted-answer/stream`, and it tells me the backend must own runtime context, but I still do not have a sample request, sample SSE events, Java DTO names, or trace JSON. I search the code and find `sqlbotDirect.ts`, `AIQueryChatServer`, `SseStreamProxy`, and resource-learning APIs. Now I understand the risk, but I still have to infer the migration sequence and invent local fixtures. At this point the architecture makes sense, but the first successful implementation loop is not obvious. I can build it, but I will waste time deciding contract shapes that should already be fixed by the implementation plan.

#### Competitive DX Benchmark

Search was not used for external competitor claims in this phase; this is an internal platform feature. Reference benchmark tiers from the DX review skill were used instead.

| Tool / product type | TTHW | Notable DX choice | Source |
| --- | --- | --- | --- |
| Stripe-like API | 30 seconds-2 minutes | Copy-paste API request and structured error body. | Reference benchmark |
| Vercel-like platform | 2-5 minutes | One command or one click produces visible output. | Reference benchmark |
| Docker-like local platform | Around 5 minutes | `hello-world` style command proves install/runtime. | Reference benchmark |
| StarBI trusted-answer runtime | Current 45-90 minutes, target under 15 minutes | Needs mocked SQLBot, fixture theme/resource/permission data, exact curl, expected SSE, expected trace. | Current plan and repo evidence |

Competitive tier target: `Needs Work -> Competitive internal platform`. A public API champion tier is not the right first milestone, but an internal developer should be able to run one mocked trusted-answer trace in under 15 minutes.

#### Magical Moment Specification

Magical moment: a developer runs one mocked trusted-answer request and sees the backend emit a trace showing:

```text
question -> theme validated -> authorized datasets resolved -> visible schema built
-> runtime state classified -> SQLBot stub called -> trace_id returned
```

Delivery vehicle: copy-paste local quickstart plus SQLBot stub mode.

Implementation requirements:

- Add a developer doc, recommended path: `dataease/docs/smart-query-runtime-dev.md`.
- Add or document a SQLBot stub mode for local runtime tests.
- Provide fixture names for theme, datasets, datasource, visible fields, row permission, and forbidden field.
- Provide one curl request for `POST /ai/query/trusted-answer/stream`.
- Provide expected SSE events and expected `trace_id`.
- Provide one command for backend tests and one command for frontend/source contract tests.

#### Developer Journey Map

| Stage | Developer does | Current friction | Required resolution |
| --- | --- | --- | --- |
| 1. Discover | Opens root README and spec | README does not point to smart-query runtime development. | Add doc link from spec and implementation plan; optional README link later. |
| 2. Evaluate | Reads trusted-answer target architecture | Target service names exist, but contract is still conceptual. | Define DTOs, endpoint, states, error codes, and migration matrix before coding. |
| 3. Install | Uses existing DataEase local setup | Repo can run, but smart-query-specific prerequisites are scattered. | Document prerequisites: DataEase backend/frontend, SQLBot config or stub mode, test fixtures. |
| 4. Hello World | Sends mocked trusted-answer request | No sample curl, sample SSE, or sample trace exists. | Add 15-minute quickstart with exact request, response, trace, and assertions. |
| 5. Real Usage | Implements runtime context service | Many IDs can be confused: model, theme, datasource, dataset, trace. | Add canonical `TrustedAnswer*` DTOs and explicit adapter to SQLBot fields. |
| 6. Debug | Investigates no-auth/unsafe/partial states | States are named but not lifecycle-defined. | Add state machine with transitions, terminal states, retryability, redaction, and trace visibility. |
| 7. Upgrade | Migrates `sqlbotDirect.ts` calls | Strangler migration is currently one sentence. | Add migration matrix for each direct call and source guard tests. |
| 8. Scale | Handles large tenants and replay | Performance risks are known but not operationalized for devs. | Add cache/batch guidelines, async replay commands, and timeout/concurrency defaults. |
| 9. Migrate / Maintain | Future developer changes DTOs/errors | No migration/version policy exists for these contracts. | Add versioned DTO/error docs, deprecation checklist, and test fixtures as compatibility gate. |

#### First-Time Developer Confusion Report

| Time | Confusion | Addressed by |
| --- | --- | --- |
| T+0:00 | I know this is a DataEase + SQLBot repo, but not where smart-query runtime dev starts. | Add `dataease/docs/smart-query-runtime-dev.md` and reference it from the implementation plan. |
| T+3:00 | I see `POST /ai/query/trusted-answer/stream`, but there is no request schema or DTO. | Add canonical DTO JSON and Java classes. |
| T+8:00 | I see states like `UNSAFE_BLOCKED`, but do not know transitions, HTTP/SSE shape, or user/admin visibility. | Add runtime state machine and trace examples. |
| T+15:00 | I cannot run a mocked first request. | Add SQLBot stub mode, fixtures, curl, expected SSE, and expected `trace_id`. |
| T+25:00 | I see many direct frontend SQLBot calls and do not know migration order. | Add direct-call migration matrix and source guard. |
| T+45:00 | I can write tests, but I have to invent commands and fixtures. | Add copy-paste test command matrix and expected failure messages. |

#### Step 0.5：DX Dual Voices

##### CODEX SAYS (DX — developer experience challenge)

Codex returned a 4/10 DX verdict. The critique is that the plan names the right architecture risks, but a DataEase developer still cannot build or debug the trusted smart-query runtime quickly.

Critical findings:

1. No 15-minute hello-world path exists. The target endpoint is sketched, but there is no runnable mock, fixture, curl, expected SSE, or expected trace payload.
2. The runtime DTO is required but not specified. Naming clarity remains a warning, not a contract.
3. Error handling lacks a machine-readable contract. Rescue cases exist, but there are no error codes, response shape, or SQLBot mapping.

High findings:

1. Trace states are named but not lifecycle-defined.
2. Direct SQLBot frontend migration is too vague.
3. Tests are listed but not developer-runnable because commands, fixtures, and expected outputs are missing.

Medium findings:

1. API defaults are underspecified.
2. Docs/examples are not copy-pasteable.

Codex-required additions before implementation:

- `15-Minute Trusted Answer Quickstart`
- Canonical DTO JSON plus Java class contract
- Runtime state machine table
- Structured error-code contract with cause/fix
- SQLBot direct-call migration matrix
- Mock SQLBot/stub mode and fixture data
- Copy-paste test commands and expected outputs

##### CLAUDE SUBAGENT (DX — independent review)

No new Claude subagent was launched in this phase because the active Codex environment only permits spawning subagents when the user explicitly asks for subagents or parallel agent work. This is the same workflow degradation as Phase 3, not a product conclusion. Phase 3.5 therefore uses local DX audit plus Codex DX voice. Degradation status: `single external DX voice`.

#### DX Dual Voices — Consensus Table

| Dimension | Local DX audit | Codex | Consensus |
| --- | --- | --- | --- |
| Getting started under target? | No 15-minute quickstart exists | Critical gap | CONFIRMED FAIL |
| API/CLI naming guessable? | DTO names proposed but not formalized | Critical gap | CONFIRMED FAIL |
| Error messages actionable? | Error cases exist, no error-code contract | Critical gap | CONFIRMED FAIL |
| Docs findable and complete? | README/docs do not guide smart-query runtime dev | Medium gap | CONFIRMED FAIL |
| Upgrade path safe? | Direct SQLBot migration lacks matrix | High gap | CONFIRMED FAIL |
| Dev environment friction-free? | Tests exist but no fixture/command path | High gap | CONFIRMED FAIL |

Consensus result: 6/6 DX dimensions need corrective changes before `writing-plans` becomes executable.

#### Pass 1：Getting Started Experience

Score: 3/10 -> target 8/10 after implementation-plan additions.

Gap: a developer cannot run a mocked trusted-answer request and see a trace state in under 15 minutes. The plan currently describes target services and tests, but not a runnable path.

Implementation-plan requirement:

```text
15-Minute Trusted Answer Quickstart
  1. Start DataEase backend/frontend or run backend test harness.
  2. Enable SQLBot stub mode.
  3. Load fixture theme/dataset/permission data.
  4. Run curl against /ai/query/trusted-answer/stream.
  5. Verify SSE events include trace_id and one terminal runtime state.
  6. Run one backend no-leak test and one frontend source-guard test.
```

Autoplan decision: make this quickstart a blocking requirement for the next implementation plan. Classification: Mechanical. Principle: goal-driven execution.

#### Pass 2：API / Contract Design

Score: 4/10 -> target 8/10 after contract additions.

Required canonical DTOs:

| DTO | Purpose | Notes |
| --- | --- | --- |
| `TrustedAnswerRequest` | Frontend-to-backend request | Includes `question`, `theme_id`, optional `datasource_id`, optional `model_id`, optional `chat_id`; excludes raw schema and arbitrary SQLBot credentials. |
| `TrustedAnswerContext` | Backend-built authorized context | Includes user, theme, authorized datasets, default datasets, visible schema, datasource decision, knowledge context, permissions, runtime policy. |
| `TrustedAnswerTrace` | Debuggable answer evidence | Includes `trace_id`, runtime state, selected/excluded resources, redacted visible fields, matched knowledge, generated SQL, permission steps, SQLBot request ID, feedback event ID. |
| `TrustedAnswerState` | Backend runtime state enum | `TRUSTED`, `NEEDS_CLARIFICATION`, `PARTIAL`, `UNSAFE_BLOCKED`, `NO_AUTHORIZED_CONTEXT`, `FAILED`. |
| `TrustedAnswerError` | Machine-readable error | Includes `code`, `message`, `cause`, `fix`, `trace_step`, `retryable`, `admin_visible_detail`, `user_visible_message`. |

Contract rule: raw `Map<String,Object>` may exist at adapter edges, but not past controller/service boundaries. The implementation plan must specify Java class names and JSON examples.

#### Pass 3：Error Messages & Debugging

Score: 4/10 -> target 8/10 after error-code and trace-state additions.

Required error-code contract:

| Code | Runtime state | Problem | Cause | Fix |
| --- | --- | --- | --- | --- |
| `SQLBOT_CONFIG_MISSING` | `FAILED` | SQLBot cannot be called. | SQLBot config is disabled, missing, or invalid. | Configure SQLBot or enable stub mode for local tests. |
| `THEME_NOT_VISIBLE` | `NO_AUTHORIZED_CONTEXT` | User cannot use this theme. | Theme is disabled or not visible to current user. | Grant theme visibility or choose an authorized theme. |
| `NO_AUTHORIZED_DATASET` | `NO_AUTHORIZED_CONTEXT` | Theme has no usable resource for this user. | Theme resources exist, but dataset permission filtered all out. | Adjust dataset/resource permissions or choose another theme. |
| `NO_VISIBLE_FIELD` | `UNSAFE_BLOCKED` | Query cannot be generated safely. | Column permissions removed every usable field. | Adjust column permissions or resource semantics. |
| `ROW_PERMISSION_REBUILD_FAILED` | `UNSAFE_BLOCKED` | Row permission could not be safely applied. | SQL rebuild failed or produced unsafe table context. | Remove table from runtime context, show admin trace, fix row permission expression. |
| `MULTI_DATASOURCE_AMBIGUOUS` | `NEEDS_CLARIFICATION` | System cannot choose one datasource safely. | Theme contains multiple datasources and no default/selection was provided. | Ask user to choose datasource or configure theme default datasource policy. |
| `SQLBOT_UNAVAILABLE` | `FAILED` | SQLBot runtime did not respond. | Network, timeout, or SQLBot service failure. | Retry, check SQLBot health, show trace/error ID. |

Error message rule: every runtime error must expose problem + cause + fix. End users get safe summaries; admins get trace details with redaction rules.

#### Pass 4：Documentation & Learning

Score: 3/10 -> target 8/10 after docs additions.

Required developer doc:

`dataease/docs/smart-query-runtime-dev.md`

Minimum sections:

- Overview: what trusted-answer runtime owns.
- Local prerequisites and stub mode.
- 15-minute quickstart.
- DTO JSON examples and Java class mapping.
- Runtime state machine.
- Error-code table.
- Trace JSON examples.
- SQLBot direct-call migration matrix.
- Test commands and expected outputs.
- Troubleshooting by error code.

Autoplan decision: copy-paste docs are part of P0/P1, not after implementation. Classification: Mechanical. Principle: learn by doing.

#### Pass 5：Upgrade & Migration Path

Score: 3/10 -> target 8/10 after migration matrix.

Required migration matrix format:

| Current frontend call | Current SQLBot endpoint | Replacement DataEase endpoint | Compatibility phase | Removal guard |
| --- | --- | --- | --- | --- |
| `startSQLBotAssistantChat` | `/chat/assistant/start` | DataEase backend chat/session endpoint | Keep wrapper, route through backend | Source guard blocks direct SQLBot runtime import. |
| `streamSQLBotQuestion` | `/chat/question` | `/ai/query/trusted-answer/stream` | Replace first because it controls context safety | Test proves no direct runtime stream call. |
| `getSQLBotRecommendQuestions` | `/chat/recommend_questions` | Backend trusted recommendations endpoint | Replace after theme/context service exists | Test proves recommendations are permission-filtered. |
| `streamSQLBotRecordAnalysis` | SQLBot analysis stream | Backend follow-up insight/action endpoint | Replace with Q&A alternation model | Message-flow test proves user question -> assistant answer alternation. |
| chart/history/usage helpers | SQLBot chart/history/usage endpoints | Backend proxy endpoints with trace linkage | Replace one by one | Source guard and browser regression. |

Autoplan decision: strangler migration must be explicit per call. Classification: Mechanical. Principle: safe upgrade path.

#### Pass 6：Developer Environment & Tooling

Score: 4/10 -> target 8/10 after fixture/test command additions.

Required commands in the implementation plan:

| Purpose | Command shape |
| --- | --- |
| Backend runtime context tests | Maven command scoped to trusted-answer tests. |
| Backend no-leak test | Maven test that asserts forbidden datasets/fields are absent before SQLBot adapter call. |
| Backend error-code tests | Maven test for every `TrustedAnswerErrorCode`. |
| Frontend source guard | Script or test that fails if runtime chat imports direct `sqlbotDirect` streaming helpers after migration. |
| Frontend UI contract | Existing contract style for fake-status prevention and runtime state display. |
| Browser/E2E | Agent-browser or Playwright path for Trust Health -> Repair Queue -> Trace -> Relearn -> Replay once UI exists. |

The exact commands should be filled in by `writing-plans` after choosing test file names.

#### Pass 7：Community & Ecosystem

Score: 6/10 -> target 7/10.

This is an internal StarBI feature, not a public developer ecosystem. Community investment is not a blocker. The useful ecosystem move is to make docs and fixtures durable enough that future DataEase developers can extend runtime states, errors, and trace payloads without re-reading the whole SQLBot integration.

Deferred:

- Public SDK/API docs.
- Public playground.
- External hosted playground.

#### Pass 8：DX Measurement & Feedback Loops

Score: 3/10 -> target 8/10 after measurement additions.

Required measurements:

| Metric | Target |
| --- | --- |
| TTHW for mocked trusted-answer request | Under 15 minutes |
| Time to diagnose a no-authorized-context failure | Under 5 minutes with trace/error code |
| Time to migrate one direct SQLBot runtime call | Under 30 minutes using migration matrix |
| Backend no-leak test runtime | Fast enough for normal backend test workflow |
| Frontend source guard runtime | Fast enough for pre-commit/CI source contract |
| Docs findability | Developer can find quickstart and error table in under 2 minutes |

Boomerang requirement: after implementation, run `/devex-review` or `/qa` against the actual quickstart and record measured TTHW, not just planned TTHW.

#### DX Scorecard

| Dimension | Score | Prior | Trend |
| --- | --- | --- | --- |
| Getting Started | 3/10 | n/a | Needs quickstart |
| API/CLI/SDK | 4/10 | n/a | Needs canonical DTOs |
| Error Messages | 4/10 | n/a | Needs error-code contract |
| Documentation | 3/10 | n/a | Needs copy-paste docs |
| Upgrade Path | 3/10 | n/a | Needs migration matrix |
| Dev Environment | 4/10 | n/a | Needs fixtures and commands |
| Community | 6/10 | n/a | Acceptable for internal feature |
| DX Measurement | 3/10 | n/a | Needs TTHW and diagnostic measurements |

| Field | Value |
| --- | --- |
| TTHW | Current 45-90 minutes -> target under 15 minutes |
| Competitive Rank | Needs Work |
| Magical Moment | Missing; target is mocked trusted-answer trace via quickstart |
| Product Type | Internal API/service/platform feature |
| Mode | DX POLISH |
| Overall DX | 4/10 |

DX principle coverage:

| Principle | Coverage |
| --- | --- |
| Zero Friction | Gap |
| Learn by Doing | Gap |
| Fight Uncertainty | Gap |
| Opinionated + Escape Hatches | Partial |
| Code in Context | Partial |
| Magical Moments | Gap |

#### DX Implementation Checklist

- [ ] Add `dataease/docs/smart-query-runtime-dev.md`.
- [ ] Define `TrustedAnswerRequest`, `TrustedAnswerContext`, `TrustedAnswerTrace`, `TrustedAnswerState`, and `TrustedAnswerError`.
- [ ] Add canonical JSON examples for request, SSE event, trace, and error.
- [ ] Add `TrustedAnswerErrorCode` table with problem, cause, fix, trace step, retryability, and user/admin visibility.
- [ ] Add runtime state machine with allowed transitions and terminal states.
- [ ] Add SQLBot stub mode or documented mock harness.
- [ ] Add fixture data for one theme, one datasource, allowed dataset/field, forbidden dataset/field, and row permission.
- [ ] Add 15-minute quickstart with exact commands and expected output.
- [ ] Add migration matrix for every direct `sqlbotDirect.ts` runtime call.
- [ ] Add backend no-leak test command and expected failure message.
- [ ] Add frontend source guard command and expected failure message.
- [ ] Add browser/E2E acceptance path after UI exists.
- [ ] Measure actual TTHW after implementation.

#### NOT in scope for DX

- Public developer portal.
- Public SDK or CLI.
- External hosted playground.
- Full public API versioning policy beyond internal DTO/error compatibility.

#### What already exists for DX

- Existing backend Maven/JUnit structure.
- Existing frontend contract-test patterns under `core-frontend`.
- Existing resource-learning API wrapper and backend proxy.
- Existing SQLBot message-flow contract tests.
- Existing DataEase + SQLBot integration code to migrate rather than replace wholesale.

#### Phase 3.5 Required Additions To The Next Implementation Plan

- Add a `Developer Contract` section before task breakdown.
- Add the 15-minute quickstart as the first verification path.
- Specify canonical DTO classes and JSON examples.
- Specify runtime state machine and error-code contract.
- Specify SQLBot direct-call migration matrix.
- Specify exact tests, fixtures, commands, and expected outputs.
- Add DX measurement gate: implementation is not complete until measured TTHW is recorded.

#### DX Completion Summary

| Dimension | Verdict | Notes |
| --- | --- | --- |
| Developer persona | Completed | Internal DataEase developer integrating trusted smart query runtime. |
| Empathy narrative | Completed | Main pain is inferring runtime contracts and fixtures from scattered code. |
| Competitive benchmark | Completed with reference tiers | Internal target is under 15 minutes, not public API champion tier. |
| Journey map | Completed | 9 stages mapped from discover to maintain. |
| Confusion report | Completed | Six concrete first-time confusion points captured. |
| DX scorecard | Completed | Overall 4/10. |
| Implementation checklist | Completed | 13 checklist items added. |
| Critical DX gaps | 7 flagged | Must be resolved in `writing-plans` before code. |

Phase 3.5 complete. DX overall: 4/10. TTHW: 45-90 minutes -> under 15 minutes. Codex: 8 concerns. Claude subagent: not run due active subagent restrictions. Consensus: local DX audit and Codex agree on 6/6 DX dimensions. Passing to Phase 4 Final Gate.

Additional Phase 3.5 decisions to carry forward:

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 20 | DX | Add 15-minute trusted-answer quickstart as blocking implementation-plan input | Mechanical | Zero friction | Developers need a runnable first trace, not only architecture diagrams. | Leaving hello world to implementation discovery |
| 21 | DX | Define canonical DTO JSON and Java contracts before coding | Mechanical | Explicit over clever | ID and raw map ambiguity is already a critical engineering risk. | Letting services infer DTO shape during coding |
| 22 | DX | Add machine-readable error-code contract | Mechanical | Fight uncertainty | Runtime errors must tell problem, cause, fix, and trace step. | Free-form exceptions and generic `SQLBot request failed` copy |
| 23 | DX | Add runtime state machine with transitions and redaction rules | Mechanical | Debuggability | Named states are not enough to debug SQLBot integration. | UI-only state labels |
| 24 | DX | Add direct SQLBot migration matrix per frontend call | Mechanical | Safe migration | `sqlbotDirect.ts` has many runtime calls and cannot be replaced safely as one vague task. | One-line strangler migration |
| 25 | DX | Add stub/fixture/test command path | Mechanical | Learn by doing | Tests listed without commands are not developer-runnable. | Test gates without fixtures or commands |
| 26 | DX | Measure actual TTHW after implementation | Mechanical | Feedback loop | Planned DX must be verified by running the quickstart. | Claiming DX readiness without timing it |

### Pre-Gate Verification

| Required output | Status |
| --- | --- |
| Phase 1 CEO review written | Done |
| CEO dual voices or degradation noted | Done |
| CEO consensus table written | Done |
| Premise gate surfaced and user approved with “统一继续” | Done |
| Phase 2 Design review written | Done |
| Design dual voices written | Done |
| Design scorecard and required additions written | Done |
| Phase 3 Eng review written | Done |
| Eng dual voice degradation noted | Done |
| Eng test plan artifact written | Done |
| Phase 3.5 DX review written | Done |
| DX dual voice degradation noted | Done |
| DX scorecard and checklist written | Done |
| Decision audit trail contains phase decisions | Done |

Known workflow degradations:

- gstack reported `UPGRADE_AVAILABLE 1.25.0.0 1.26.0.0`; this review continued on the installed version instead of stopping for a tool upgrade.
- Phase 3 and Phase 3.5 did not launch Claude subagents because this Codex environment only allows spawning subagents when the user explicitly asks for subagents or parallel agent work.
- The design artifact is an HTML wireframe fallback because image generation/design tooling was rate-limited earlier.

### Phase 4：Final Approval Gate

## /autoplan Review Complete

### Reviewed plan

`dataease/docs/superpowers/specs/2026-05-03-smart-query-resource-theme-benchmark-design.md`

This file is now a reviewed draft product/spec plan. It is not yet an executable implementation plan.

### Decisions Made: 26 total

| Category | Count |
| --- | --- |
| Auto-decided mechanical decisions | 23 |
| Taste decisions | 2 |
| User-challenge decisions | 1 premise gate, approved by user with “统一继续” |

### Critical Cross-Phase Themes

| Theme | Flagged in | Final decision |
| --- | --- | --- |
| Product center | CEO, Design | Reframe to `DataEase Trusted Answer Layer / 智能问数可信答案层`. |
| First milestone | CEO, Design, Eng | Ship one vertical trust loop: Trust Health -> Repair Queue -> Trace -> fix -> relearn -> replay -> promote. |
| Runtime boundary | CEO, Eng | DataEase backend owns final SQLBot context assembly. |
| Permission safety | CEO, Eng | Unauthorized datasets/fields/rows must be filtered before SQLBot/model context. |
| Direct SQLBot calls | Eng, DX | Runtime calls from frontend must migrate behind DataEase backend proxy. |
| Fake learning status | CEO, Eng | Remove fake `学习成功`; success needs real learning/replay evidence. |
| Developer contract | DX | Add quickstart, DTOs, error codes, state machine, migration matrix, fixtures, and test commands before coding. |

### Blocking Requirements For `writing-plans`

The next step must be `superpowers:writing-plans`, using this reviewed draft spec as input. The implementation plan must include:

- A `Developer Contract` section.
- A 15-minute trusted-answer quickstart.
- Canonical trusted-answer DTOs and JSON examples.
- Runtime state machine and error-code contract.
- SQLBot direct-call migration matrix.
- Test fixture and command matrix.
- First vertical trust loop milestone.
- Permission no-leak tests before UI completion is accepted.
- Browser/E2E acceptance path for Trust Health -> Repair Queue -> Trace -> Relearn -> Replay.

### Final recommendation

Approve this `/autoplan` output as the reviewed draft plan, then proceed to `superpowers:writing-plans` to produce an executable implementation plan under `dataease/docs/superpowers/plans/`.
