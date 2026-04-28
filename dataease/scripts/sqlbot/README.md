# SQLBot Multi-Flow Regression

## Purpose

This regression verifies the three core StarBI smart-query lanes against the live local stack:

1. Single dataset query
2. Public-cloud theme dataset query
3. Combination dataset query

It checks both theme visibility and real SQLBot query completion.

## Files

- Runner:
  [multi_flow_regression.sh](/Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/multi_flow_regression.sh)
- Cleanup:
  [multi_flow_cleanup.sh](/Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/multi_flow_cleanup.sh)
- Latest summary output:
  [sqlbot_multi_flow_regression_summary.json](/Users/chenliyong/AI/github/StarBI/dataease/tmp/sqlbot_multi_flow_regression_summary.json)

## Preconditions

- DataEase frontend is reachable on `http://127.0.0.1:8080`
- SQLBot backend is reachable on `http://127.0.0.1:8000`
- Browser state file exists:
  [agent-browser-state.json](/Users/chenliyong/AI/github/StarBI/dataease/tmp/agent-browser-state.json)
- The browser state contains an admin `X-DE-TOKEN`

## What The Script Verifies

### Theme visibility

- `Codex 单数据集主题_20260426_013923`
- `Codex 公有云主题_20260426_013923`
- `Codex 组合数据集主题_20260426_013923`

### Query flows

- Single dataset:
  `datasetId = 985189053949415424`
  question: `按店铺统计销售额`
- Public cloud dataset:
  `datasetId = 9001`
  question: `按账号统计应付金额`
- Combination dataset:
  `datasetId = 1245591864501997568`
  question: `按门店统计销售额`

## Run

```bash
/Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/multi_flow_regression.sh
```

Optional overrides:

```bash
STATE_FILE=/abs/path/to/state.json \
DE_BASE=http://127.0.0.1:8080/api \
SQLBOT_BASE=http://127.0.0.1:8000/api/v1 \
/Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/multi_flow_regression.sh
```

## Pass Criteria

- `themeCheck = passed`
- each flow has:
  - `"success": true`
  - `"hasFinish": true`
  - `"hasChart": true`
- summary has:
  - `"allPassed": true`

## Failure Hints

- If theme check fails:
  inspect `/api/ai/query/themes`
- If public-cloud flow fails:
  inspect substitute dataset `9001` theme visibility and `/sqlbot/datasource?datasetIds=9001`
- If combination flow fails:
  inspect the generated SQL in the summary and compare it to the target combination dataset table name
- If the script cannot start:
  verify the admin token inside
  [agent-browser-state.json](/Users/chenliyong/AI/github/StarBI/dataease/tmp/agent-browser-state.json)

## Cleanup

If you want to remove the Codex regression themes and datasets created during this work:

```bash
/Users/chenliyong/AI/github/StarBI/dataease/scripts/sqlbot/multi_flow_cleanup.sh
```

It deletes:

- Codex themes from `/api/ai/query/themes`
- Codex datasets and dataset groups from `/api/datasetTree/delete/{id}`

It only targets names prefixed with `Codex `.

