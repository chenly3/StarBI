# Query Resource Learning Feedback Loop Design

> Scope: StarBI 问数资源学习闭环增强层（反馈持久化 + 人工修正立即生效 + 治理回流）  
> Date: 2026-04-28  
> Related baseline: `2026-04-27-query-resource-learning-product-design.md`

## 1. Goal

在不改变“问数资源学习”主链路定位的前提下，补齐完整版反馈回流闭环，确保：

- 人工修正可在问数对话页直接发起
- 修正提交后立即生效（不等待重学）
- 全链路可追溯（前后对比、回放、审计）
- 反馈可持续反哺质量评分与重学治理

## 2. Locked Decisions

本设计已冻结以下产品决策（来自评审确认）：

1. 反馈版本：完整版（含修正前后对比、回放链路）
2. 人工修正入口：问数对话结果页
3. 生效策略：提交后立即生效（补丁层）
4. 生效范围：仅当前问数资源
5. 冲突策略：补丁层始终优先于学习结果；重学后补丁不自动失效，需人工下线
6. 可见性：问题/命中SQL/修正SQL 明文存储，仅治理管理员可见
7. 首版补丁类型：SQL 覆写 + 字段映射修正 + 过滤值映射修正

## 3. Approaches Compared

### Option 1: 单表直写 + 当前值覆盖

- 优点：实现快
- 缺点：难以满足“回放、审计、前后对比”，后续返工风险高

### Option 2: 事件溯源 + 生效快照（Chosen）

- 优点：兼顾可追溯性与立即生效；支持治理演进
- 缺点：需要新增聚合与快照维护逻辑

### Option 3: 规则 DSL 引擎

- 优点：扩展性强
- 缺点：首版过重，实施风险高

## 4. Architecture

反馈闭环采用四层架构：

1. 反馈事件层（Append-only）
- 所有点赞、点踩、失败、人工修正、补丁下线都写事件表，只新增不覆盖

2. 补丁生效层（Resource scoped snapshot）
- 从事件层生成资源级 `active` 补丁快照，供运行时低延迟读取

3. 运行时接入层（Immediate effect）
- 在资源确认后、SQL 最终执行前应用补丁，确保“问错即改”

4. 治理与重学联动层
- 基于事件聚合输出反馈指标与重学建议/触发信号

## 5. Data Model

## 5.1 反馈事件表（事实源）

Table: `query_resource_learning_feedback_event`

- `id` BIGINT PK
- `event_no` VARCHAR(64) UNIQUE
- `resource_id` VARCHAR(64) NOT NULL INDEX
- `source_chat_id` BIGINT NULL
- `source_chat_record_id` BIGINT NULL INDEX
- `source_trace_id` VARCHAR(64) NULL INDEX
- `actor_uid` BIGINT NULL
- `actor_account` VARCHAR(128) NOT NULL INDEX
- `event_type` VARCHAR(32) NOT NULL INDEX
  - `upvote` / `downvote` / `execution_failure` / `manual_fix_submit` / `manual_fix_disable`
- `question_text` TEXT NULL
- `question_hash` VARCHAR(64) NULL INDEX
- `matched_sql` TEXT NULL
- `error_code` VARCHAR(64) NULL
- `error_message` TEXT NULL
- `before_snapshot` JSONB NOT NULL DEFAULT `{}`
- `after_snapshot` JSONB NOT NULL DEFAULT `{}`
- `patch_types` JSONB NOT NULL DEFAULT `[]`
- `visibility` VARCHAR(16) NOT NULL DEFAULT `admin_only`
- `created_at` DATETIME NOT NULL INDEX

约束：

- 应用层禁止 UPDATE/DELETE（append-only）
- `manual_fix_submit` 必须有 `before_snapshot` 与 `after_snapshot`

## 5.2 补丁快照表（运行时读取）

Table: `query_resource_learning_patch_snapshot`

- `id` BIGINT PK
- `resource_id` VARCHAR(64) NOT NULL INDEX
- `patch_type` VARCHAR(32) NOT NULL INDEX
  - `sql_override` / `field_mapping_fix` / `value_mapping_fix`
- `match_fingerprint` VARCHAR(128) NOT NULL INDEX
- `match_rule` JSONB NOT NULL DEFAULT `{}`
- `patch_payload` JSONB NOT NULL DEFAULT `{}`
- `priority` INT NOT NULL DEFAULT 100
- `status` VARCHAR(16) NOT NULL INDEX
  - `active` / `inactive`
- `source_event_id` BIGINT NOT NULL
- `enabled_by` VARCHAR(128) NOT NULL
- `disabled_by` VARCHAR(128) NULL
- `disable_reason` TEXT NULL
- `activated_at` DATETIME NOT NULL
- `deactivated_at` DATETIME NULL
- `version` INT NOT NULL DEFAULT 1

约束：

- 同资源下，同 `patch_type + match_fingerprint` 仅允许一条 `active`

## 5.3 补丁应用流水表（回放证据）

Table: `query_resource_learning_patch_apply_log`

- `id` BIGINT PK
- `resource_id` VARCHAR(64) NOT NULL INDEX
- `chat_record_id` BIGINT NULL INDEX
- `trace_id` VARCHAR(64) NOT NULL INDEX
- `question_text` TEXT NULL
- `question_hash` VARCHAR(64) NULL INDEX
- `pre_sql` TEXT NULL
- `post_sql` TEXT NULL
- `applied_patch_ids` JSONB NOT NULL DEFAULT `[]`
- `apply_result` VARCHAR(16) NOT NULL INDEX
  - `applied` / `missed` / `error`
- `error_message` TEXT NULL
- `created_at` DATETIME NOT NULL INDEX

## 5.4 反馈聚合指标表（治理视图）

Table: `query_resource_learning_feedback_metric`

- `resource_id` VARCHAR(64) PK
- `lifetime_total_feedback_count` INT NOT NULL DEFAULT 0
- `lifetime_downvote_count` INT NOT NULL DEFAULT 0
- `lifetime_failure_count` INT NOT NULL DEFAULT 0
- `lifetime_correction_count` INT NOT NULL DEFAULT 0
- `window_7d_total_feedback_count` INT NOT NULL DEFAULT 0
- `window_7d_downvote_rate` INT NOT NULL DEFAULT 0
- `window_7d_failure_rate` INT NOT NULL DEFAULT 0
- `window_7d_correction_rate` INT NOT NULL DEFAULT 0
- `relearning_suggested` BOOLEAN NOT NULL DEFAULT FALSE
- `trigger_reason` VARCHAR(32) NOT NULL DEFAULT `observe`
- `relearning_advice` TEXT NOT NULL DEFAULT `当前反馈稳定，建议持续观察。`
- `last_event_at` DATETIME NULL
- `updated_at` DATETIME NOT NULL

## 5.5 与现有学习模型关系

保留现有：

- `query_resource_learning_task`
- `query_resource_learning_result`
- `query_resource_learning_score`

新增关系：

- `feedback_metric` 参与质量评分中的“问数可用表现”维度
- `patch_snapshot(active)` 直接参与问数运行时执行链路

## 6. API Design

## 6.1 SQLBot Source API

1. `POST /query-resource-learning/resources/{resource_id}/feedback/events`
- 统一写入事件，必要时写入并激活补丁快照

2. `POST /query-resource-learning/resources/{resource_id}/patches/{patch_id}/disable`
- 人工下线补丁（生成 disable 事件）

3. `GET /query-resource-learning/resources/{resource_id}/patches`
- 查询资源补丁列表（支持状态筛选）

4. `GET /query-resource-learning/resources/{resource_id}/feedback/events`
- 查询事件流水（管理员）

5. `GET /query-resource-learning/resources/{resource_id}/feedback/replay/{event_no}`
- 回放单事件完整链路

6. `GET /query-resource-learning/resources/{resource_id}/feedback-metric`
- 查询资源聚合指标

7. `POST /query-resource-learning/resources/{resource_id}/feedback/evaluate-relearning`
- 基于聚合指标给出重学建议/触发结果

## 6.2 DataEase Proxy API

代理提供对应路径：

- `POST /ai/query/resource-learning/resources/{resourceId}/feedback/events`
- `POST /ai/query/resource-learning/resources/{resourceId}/patches/{patchId}/disable`
- `GET /ai/query/resource-learning/resources/{resourceId}/patches`
- `GET /ai/query/resource-learning/resources/{resourceId}/feedback/events`
- `GET /ai/query/resource-learning/resources/{resourceId}/feedback/replay/{eventNo}`
- `GET /ai/query/resource-learning/resources/{resourceId}/feedback-metric`
- `POST /ai/query/resource-learning/resources/{resourceId}/feedback/evaluate-relearning`

## 7. Runtime Patch Execution

切入点：资源确定后、SQL 最终执行前。

执行顺序：

1. 加载 `active` 快照补丁
2. `field_mapping_fix`
3. `value_mapping_fix`
4. `sql_override`（若命中则最终覆盖）

冲突规则：

- 补丁层 > 学习资产层
- 同类补丁按 `priority`，同优先级按最近激活时间

安全规则：

- SQL 覆写仅允许 `SELECT/WITH`
- 补丁应用失败不阻断主链路，写 `apply_log=error` 后回退原链路

可观测性：

- 每次请求写 `patch_apply_log`，保留 `pre_sql/post_sql/applied_patch_ids/trace_id`

## 8. Permission & Visibility

- 明文问题/SQL 可存储
- 仅治理管理员可查看事件明细和回放
- 普通用户只可见聚合摘要，不可见明文细节

## 9. Acceptance Criteria

## 9.1 Product

- 修正提交后 3 秒内返回“已生效（仅当前资源）”
- 同资源同问题立即命中修正；其他资源不受影响
- 支持三类补丁提交与生效
- 管理端可查看并下线补丁

## 9.2 Technical

- 反馈事件写入成功率 >= 99.9%
- 补丁应用日志覆盖率 100%
- SQL 覆写安全拦截有效
- 补丁应用异常不影响主问数可用性
- DataEase 代理与 SQLBot 字段契约一致

## 9.3 Governance

- 按资源/事件类型/chat_record/时间检索事件
- 支持事件级回放前后对比
- 输出 7d + 累计指标与重学建议
- 补丁在重学后仍保留，需人工下线

## 10. Out of Scope

本设计不扩展：

- 数据门户
- 自助取数
- 电子表格
- 数据填报
- 多模型调度总控

## 11. Risks & Mitigations

1. 风险：补丁长期堆积导致策略漂移  
缓解：增加补丁过期巡检与治理看板，定期合并进学习资产并人工下线

2. 风险：明文SQL带来合规压力  
缓解：严格管理员权限、全量审计日志、后续增加脱敏策略开关

3. 风险：补丁命中误伤  
缓解：指纹 + 规则双重约束、灰度启用、回放核验

