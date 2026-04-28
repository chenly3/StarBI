# Query Resource Learning API Snapshot

> Snapshot date: 2026-04-28  
> Scope: 问数资源学习闭环（反馈事件、补丁快照、回放、重学评估）

## Scope Guardrails

- DataEase frontend uses proxy path: `/ai/query/resource-learning/...`
- DataEase backend proxies to SQLBot source path: `/query-resource-learning/...`
- 本快照覆盖“学习修正即时生效（资源级）+ 可追溯 + 治理建议”闭环能力

## Existing Resource APIs

- `GET /ai/query/resource-learning/resources`
- `POST /ai/query/resource-learning/resources/{resourceId}/learn`
- `DELETE /ai/query/resource-learning/resources/{resourceId}`
- `GET /ai/query/resource-learning/resources/{resourceId}/quality-summary`
- `GET /ai/query/resource-learning/resources/{resourceId}/feedback-summary`

## Feedback Loop APIs

- `POST /ai/query/resource-learning/resources/{resourceId}/feedback/events`
- `GET /ai/query/resource-learning/resources/{resourceId}/patches`
- `POST /ai/query/resource-learning/resources/{resourceId}/patches/{patchId}/disable`
- `GET /ai/query/resource-learning/resources/{resourceId}/feedback/events`
- `GET /ai/query/resource-learning/resources/{resourceId}/feedback/replay/{eventNo}`
- `GET /ai/query/resource-learning/resources/{resourceId}/feedback-metric`
- `POST /ai/query/resource-learning/resources/{resourceId}/feedback/evaluate-relearning`

## Event Submit (Manual Fix)

`POST /ai/query/resource-learning/resources/{resourceId}/feedback/events`

### Request

```json
{
  "eventType": "manual_fix_submit",
  "sourceChatRecordId": 345,
  "questionText": "按区域看GMV",
  "matchedSql": "select region, gmv from sales",
  "beforeSnapshot": {
    "sql": "select region, gmv from sales"
  },
  "afterSnapshot": {
    "sql": "select region, sum(gmv) from sales group by region"
  },
  "patchTypes": ["sql_override"],
  "visibility": "admin_only"
}
```

### Response

```json
{
  "accepted": true,
  "eventNo": "qrl_20260428001_abcd",
  "resourceId": "datasource:12",
  "activePatchCount": 1,
  "metric": {
    "lifetimeTotalFeedbackCount": 8,
    "lifetimeDownvoteCount": 2,
    "lifetimeFailureCount": 3,
    "lifetimeCorrectionCount": 2,
    "window7dTotalFeedbackCount": 4,
    "window7dDownvoteRate": 25,
    "window7dFailureRate": 50,
    "window7dCorrectionRate": 25,
    "relearningSuggested": true,
    "triggerReason": "failure_rate_high",
    "relearningAdvice": "近期失败率偏高，建议重新学习并复核字段语义与样本值。"
  }
}
```

## Patch Query / Disable

### List Patches

`GET /ai/query/resource-learning/resources/{resourceId}/patches?status=active`

```json
[
  {
    "id": 1001,
    "resourceId": "datasource:12",
    "patchType": "sql_override",
    "status": "active",
    "priority": 100,
    "matchFingerprint": "fp_1",
    "sourceEventId": 88,
    "activatedAt": "2026-04-28T08:00:00",
    "deactivatedAt": null
  }
]
```

### Disable Patch

`POST /ai/query/resource-learning/resources/{resourceId}/patches/{patchId}/disable`

```json
{
  "reason": "手工下线"
}
```

```json
{
  "patchId": 1001,
  "resourceId": "datasource:12",
  "disabled": true,
  "eventNo": "qrl_20260428002_dcba"
}
```

## Event List / Replay

### List Events

`GET /ai/query/resource-learning/resources/{resourceId}/feedback/events`

可选查询参数：

- `eventType`
- `sourceChatRecordId`
- `createdFrom`
- `createdTo`

### Replay Event

`GET /ai/query/resource-learning/resources/{resourceId}/feedback/replay/{eventNo}`

```json
{
  "eventNo": "qrl_20260428001_abcd",
  "resourceId": "datasource:12",
  "sourceChatRecordId": 345,
  "eventType": "manual_fix_submit",
  "questionText": "按区域看GMV",
  "matchedSql": "select region, gmv from sales",
  "beforeSnapshot": {
    "sql": "select region, gmv from sales"
  },
  "afterSnapshot": {
    "sql": "select region, sum(gmv) from sales group by region"
  },
  "patchTypes": ["sql_override"],
  "visibility": "admin_only",
  "createdAt": "2026-04-28T08:00:00"
}
```

## Metric / Relearning

### Feedback Metric

`GET /ai/query/resource-learning/resources/{resourceId}/feedback-metric`

### Evaluate Relearning

`POST /ai/query/resource-learning/resources/{resourceId}/feedback/evaluate-relearning`

```json
{
  "resourceId": "datasource:12",
  "relearningSuggested": true,
  "triggerReason": "failure_rate_high",
  "relearningAdvice": "建议重新学习",
  "metric": {
    "lifetimeTotalFeedbackCount": 8,
    "window7dFailureRate": 50
  }
}
```
