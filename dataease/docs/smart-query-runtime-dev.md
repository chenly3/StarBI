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

- Theme visibility and enabled-state validation.
- Authorized dataset resolution.
- Permission-filtered schema building through `DatasetSQLBotManage.getDatasourceList(...)`.
- Runtime state classification.
- Trace creation.
- SQLBot adapter or proxy calls.

Frontend must not send raw schema, SQLBot assistant token, SQLBot domain, or arbitrary dataset scope as final authority.

## Runtime States

| State | Meaning |
| --- | --- |
| `TRUSTED` | Context is authorized and safe to call SQLBot. |
| `NEEDS_CLARIFICATION` | Backend needs a theme or datasource choice before SQL generation. |
| `PARTIAL` | A safe but incomplete answer can be returned. |
| `UNSAFE_BLOCKED` | Backend blocks SQLBot because context could be unsafe. |
| `NO_AUTHORIZED_CONTEXT` | User has no authorized theme or resource scope. |
| `FAILED` | SQLBot config, proxy, or runtime failed. |

## Error Codes

| Code | State | Fix |
| --- | --- | --- |
| `THEME_REQUIRED` | `NEEDS_CLARIFICATION` | Select a business context or configure a default theme. |
| `SQLBOT_CONFIG_MISSING` | `FAILED` | Configure SQLBot or enable local stub mode. |
| `THEME_NOT_VISIBLE` | `NO_AUTHORIZED_CONTEXT` | Grant theme visibility or choose another theme. |
| `NO_AUTHORIZED_DATASET` | `NO_AUTHORIZED_CONTEXT` | Fix dataset or resource permissions. |
| `NO_VISIBLE_FIELD` | `UNSAFE_BLOCKED` | Fix column permissions or resource semantics. |
| `ROW_PERMISSION_REBUILD_FAILED` | `UNSAFE_BLOCKED` | Fix row permission expression and replay. |
| `MULTI_DATASOURCE_AMBIGUOUS` | `NEEDS_CLARIFICATION` | Select datasource or configure theme default datasource policy. |
| `SQLBOT_UNAVAILABLE` | `FAILED` | Check SQLBot health and retry. |

## 15-Minute Quickstart

### 1. Run Backend Trusted-Answer Tests

```bash
cd dataease/core/core-backend
JAVA_HOME=/Users/chenliyong/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home \
PATH="$JAVA_HOME/bin:$PATH" \
mvn \
  -DskipTests=false \
  -Dmaven.test.skip=false \
  -DfailIfNoTests=false \
  -Dtest=io.dataease.ai.query.AIQueryTrustedAnswerContractSmokeTest,io.dataease.ai.query.TrustedAnswerRuntimeContextServiceTest,io.dataease.ai.query.TrustedAnswerOpsServiceTest \
  -Dmaven.antrun.skip=true \
  test
```

Expected: all trusted-answer backend tests pass.

### 2. Run Frontend Trusted-Answer Contracts

```bash
cd dataease/core/core-frontend

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

- `[trusted-answer-api] 3 contract checks passed`.
- `[trusted-answer-sqlbot-direct-guard] 1 contract checks passed`.
- `[trusted-answer-overview-ui] 2 contract checks passed`.

### 3. Run a Local SSE Request

After the backend is running:

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
