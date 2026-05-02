# SQLBot Quick BI Message Flow QA

## Routes

- SQLBot New: `http://127.0.0.1:8080/#/sqlbotnew`

## Required Evidence Directory

- `tmp/sqlbot-message-flow-qa/`

## Prerequisites

- DataEase frontend is running at `http://127.0.0.1:8080`.
- DataEase backend and SQLBot services are running and reachable from the browser flow.
- Browser has an authenticated DataEase session before opening SQLBot New.
- SQLBot datasource/context required for `按品线统计销售金额` is available and selected or restorable.
- Asking `按品线统计销售金额` must produce a successful fact answer before any derived action cases run.

## Execution Notes

- Run the five cases sequentially in one browser session unless a case explicitly says to reset.
- Case 2 and Case 3 depend on the original fact answer and action suggestions created in Case 1.
- Save each case screenshot and HAR immediately after that case settles.

## Browser Acceptance Cases

### Case 1: Fact Answer Creates Action Suggestions

1. Open SQLBot New.
2. Ask: `按品线统计销售金额`
3. Wait for the fact answer to finish.
4. Verify DOM contains one fact answer and one `data-testid="sqlbot-action-suggestions"` after it.
5. Verify the fact card does not show inline data interpretation content.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/01-fact-action-suggestions.png`
- HAR: `tmp/sqlbot-message-flow-qa/01-fact-action-suggestions.har`

### Case 2: Data Interpretation Alternates Question Then Answer

1. Click `data-testid="sqlbot-action-analysis"` on the action suggestions card from Case 1.
2. Verify a `data-testid="sqlbot-derived-question"` node appears.
3. Verify the next AI message contains `data-testid="sqlbot-derived-answer"`.
4. Verify the generated question text starts with `对“按品线统计销售金额”做数据解读`.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.png`
- HAR: `tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.har`

### Case 3: Trend Prediction Alternates Question Then Answer

1. Click `data-testid="sqlbot-action-predict"` on the same original fact answer/action suggestions card from Case 1, not on a derived answer.
2. Verify a derived question appears before the prediction answer.
3. Verify prediction answer title is `趋势预测`.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/03-predict-derived-flow.png`
- HAR: `tmp/sqlbot-message-flow-qa/03-predict-derived-flow.har`

### Case 4: History Restore Does Not Regenerate

1. Clear or stop any previous network capture.
2. Start a fresh HAR capture immediately before clicking history.
3. Click the latest history entry created by Case 1 through Case 3.
4. Stop capture after the restored conversation settles.
5. Verify only `04-history-restore.har` has no request URL containing `/analysis`.
6. Verify only `04-history-restore.har` has no request URL containing `/predict`.
7. Verify derived question and derived answer messages are restored from saved state.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/04-history-restore.png`
- HAR: `tmp/sqlbot-message-flow-qa/04-history-restore.har`

### Case 5: Recommendation Click Prefills Composer

1. Click a recommended question inside `data-testid="sqlbot-action-suggestions"`.
2. Verify the bottom composer contains the clicked text.
3. Verify no new ask/chat/stream request containing `/chat`, `/ask`, `/query`, or `/predict` starts solely from clicking the recommendation.
4. Verify a SQLBot question request starts only after the submit button is clicked.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/05-recommend-prefill.png`
- HAR: `tmp/sqlbot-message-flow-qa/05-recommend-prefill.har`

## Pass Criteria

- All screenshots exist.
- All HAR files exist.
- History restore HAR contains no `/analysis` or `/predict`.
- The final test report records every DOM/content assertion in Case 1 through Case 5 as PASS or FAIL.
- The final test report lists failures, fixes, evidence paths, and residual risks.
