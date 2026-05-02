# SQLBot Quick BI Message Flow QA

## Routes

- SQLBot New: `http://127.0.0.1:8080/#/sqlbotnew`

## Required Evidence Directory

- `tmp/sqlbot-message-flow-qa/`

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

1. Click `data-testid="sqlbot-action-analysis"`.
2. Verify a `data-testid="sqlbot-derived-question"` node appears.
3. Verify the next AI message contains `data-testid="sqlbot-derived-answer"`.
4. Verify the generated question text starts with `对“按品线统计销售金额”做数据解读`.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.png`
- HAR: `tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.har`

### Case 3: Trend Prediction Alternates Question Then Answer

1. Click `data-testid="sqlbot-action-predict"`.
2. Verify a derived question appears before the prediction answer.
3. Verify prediction answer title is `趋势预测`.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/03-predict-derived-flow.png`
- HAR: `tmp/sqlbot-message-flow-qa/03-predict-derived-flow.har`

### Case 4: History Restore Does Not Regenerate

1. Click the latest history entry created by Case 1 through Case 3.
2. Capture network traffic during restore.
3. Verify no request URL contains `/analysis`.
4. Verify no request URL contains `/predict`.
5. Verify derived question and derived answer messages are restored from saved state.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/04-history-restore.png`
- HAR: `tmp/sqlbot-message-flow-qa/04-history-restore.har`

### Case 5: Recommendation Click Prefills Composer

1. Click a recommended question inside `data-testid="sqlbot-action-suggestions"`.
2. Verify the bottom composer contains the clicked text.
3. Verify no new SQLBot question request starts until the submit button is clicked.

Expected evidence:

- Screenshot: `tmp/sqlbot-message-flow-qa/05-recommend-prefill.png`
- HAR: `tmp/sqlbot-message-flow-qa/05-recommend-prefill.har`

## Pass Criteria

- All screenshots exist.
- All HAR files exist.
- History restore HAR contains no `/analysis` or `/predict`.
- The final test report lists failures, fixes, evidence paths, and residual risks.
