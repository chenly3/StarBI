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

## Execution Report

Date: 2026-05-02

| Case | Result | Evidence | Notes |
|---|---|---|---|
| Fact answer creates action suggestions | PASS | `tmp/sqlbot-message-flow-qa/01-fact-action-suggestions.png` | Local stack was already running. Logged in as `admin`. The fact question completed with a chart answer, action buttons, and recommendation chips. Screenshot includes restored prior conversation content in the same browser session, so the action-suggestion assertion was verified from the DOM snapshot around the latest fact answer. |
| Data interpretation alternates question then answer | PASS | `tmp/sqlbot-message-flow-qa/02-analysis-derived-flow.png` | Clicking Data Interpretation generated the derived question text starting with `对“按品线统计销售金额”做数据解读`; the next AI content rendered `核心结论`, `关键依据`, and `建议动作`. HAR includes `/api/v1/chat/record/49/analysis`. |
| Trend prediction alternates question then answer | FAIL | `tmp/sqlbot-message-flow-qa/03-predict-derived-flow.png` | Clicking the latest visible `趋势预测` control did not produce a visible `趋势预测` answer title, and the saved HAR had 0 requests. Earlier global network history showed a `/predict` request from a previous attempt, but the isolated required evidence did not prove the case, so this remains FAIL. |
| History restore does not regenerate | PASS | `tmp/sqlbot-message-flow-qa/04-history-restore.har` | Fresh HAR around clicking the latest history entry had no `/analysis` or `/predict` URL matches. The restored page showed the saved fact answer and derived analysis content. |
| Recommendation click prefills composer | PASS | `tmp/sqlbot-message-flow-qa/05-recommend-prefill.png` | Clicking a recommendation prefilled the composer; the screenshot was captured before submit. After clicking submit, HAR recorded `/api/v1/chat/question`; no `/predict` or `/analysis` appeared in the recommendation HAR. |

Residual risks:

- Evidence was gathered in a dirty shared worktree with pre-existing unrelated changes; no unrelated source files were staged or modified.
- The first relative-path screenshot/HAR attempts reported success but did not write into the target repo directory, so cases were rerun or resaved with absolute paths.
- Case 1 and Case 2 screenshots include prior restored conversation content because the acceptance flow was run in one authenticated browser session; assertions were based on the live DOM snapshot and saved HARs, not screenshot isolation alone.
- Case 3 needs follow-up: the visible prediction action did not generate a verifiable prediction answer in the isolated HAR/screenshot evidence.
