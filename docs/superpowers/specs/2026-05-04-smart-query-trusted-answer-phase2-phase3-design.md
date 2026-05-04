# Smart Query Trusted Answer Phase 2 / Phase 3 Design

## Background

Phase 1 upgraded smart query from isolated "query resource and analysis theme
configuration" work into the first DataEase-owned Trusted Answer Layer vertical
slice. The main question stream now routes through DataEase backend, builds a
permission-filtered runtime context, emits trusted-answer SSE events, and exposes
minimal Trust Health / Repair Queue proof.

The next phases should continue that direction. The goal is not only to make
query resource, analysis theme, permission, and row/column permission pages
usable. The goal is to ensure those configurations are consumed by every smart
query answer path so answers are authorized, reproducible, explainable, and
governable.

## Product Positioning

The target model is closer to Quick BI's enterprise BI thinking:

- Smart query uses only resources, themes, and datasets the current user is
  allowed to ask.
- Permission changes continue to matter when users open historical content.
- Administrators can inspect original evidence in audit mode.
- Configuration quality is validated by publish checks and replay, not by page
  appearance alone.

## Phase 2 Goal

Phase 2 builds the trusted runtime closure.

Every user-visible action that generates an answer or affects answer correction
must pass through DataEase Trusted Answer Layer, persist a complete trace/result
snapshot, and be restorable without re-running SQLBot.

### Phase 2 In Scope

- First smart-query question.
- Recommended follow-up question.
- Data interpretation.
- Trend prediction.
- Continued question after history restore.
- Learning correction submission.
- Feedback events.
- Replay validation.
- Repair Queue correction closure.

### Phase 2 Out Of Scope

The following SQLBot admin/configuration operations must still go through
DataEase backend proxy, but they do not enter answer-runtime trace scope in
Phase 2:

- Model configuration CRUD.
- Terminology configuration CRUD.
- SQL example configuration CRUD.
- Background exports.
- Model connectivity checks.

## Phase 2 Architecture

### 1. Trusted Gateway

Trusted Gateway is the single DataEase backend boundary for answer-runtime
requests. It accepts smart-query questions, follow-up questions, interpretation,
prediction, history continuation, feedback, replay, and correction flows.

Responsibilities:

- Generate or attach `trace_id`.
- Bind user, organization, theme, resource, and datasource context.
- Reject frontend attempts to bypass DataEase and call SQLBot directly for
  answer-runtime flows.
- Normalize SQLBot request and response events into trusted-answer events.

### 2. Runtime Context Builder

Runtime Context Builder turns current configuration into an authorized runtime
context.

Inputs:

- Analysis theme configuration.
- Query resource configuration.
- Dataset/resource permissions.
- Row permission rules.
- Column permission rules.
- Terminology and SQL examples relevant to the selected resource/theme.

Outputs:

- Authorized datasets and datasource.
- User-visible schema after column permission trimming.
- Row permission constraints for SQL safety handling.
- Matched terms and SQL examples.
- Traceable configuration snapshot.

### 3. Permission Safety Gate

Permission Safety Gate runs before and after SQLBot.

Before SQLBot:

- Trim schema to fields the current user can use.
- Cover single-dataset and common `WHERE` row-permission scenarios.
- Inject or attach row permission constraints to the SQLBot execution context.

After SQLBot:

- Validate generated SQL does not reference unauthorized fields.
- Validate chart and table payloads do not include unauthorized fields.
- Validate result snapshots can be shown under the current user's permission.
- Block and write a structured trace error when safety checks fail.

Phase 2 intentionally covers single-dataset and common `WHERE` row-permission
patterns first. Complex multi-table, multi-datasource, and expression-conflict
rewrites move to Phase 3.

### 4. Trace And Result Snapshot Store

Trace storage becomes persistent in Phase 2.

Persisted content:

- User question and action type.
- Theme/resource/datasource context.
- Runtime permission snapshot.
- Row and column permission evidence.
- SQLBot SSE raw events.
- Generated SQL.
- Chart configuration.
- Table/result data snapshot.
- Interpretation and prediction text.
- Recommended questions.
- Error details.
- Timing and SQLBot call status.

Historical restore must read the saved snapshot. It must not re-run SQLBot,
re-run data interpretation, or re-query data just to restore the previous answer.

### 5. Current Permission Restore Policy

Phase 2 stores complete snapshots, but normal user restore is governed by
current permissions.

Rules:

- If the user still has permission, restore the full historical answer from the
  snapshot.
- If permission was reduced, show the question and safe summary only. Hide
  detailed data rows, unauthorized fields, and sensitive chart details.
- Administrators with audit permission can inspect the original snapshot and
  original permission evidence in audit mode.
- The trace must record whether restore used full view, reduced view, or admin
  audit view.

This keeps historical reproducibility without turning historical answers into a
permanent permission bypass.

### 6. Learning Patch And Replay Engine

Learning correction must be a real closure, not a saved comment.

Flow:

1. User submits learning correction from an answer.
2. DataEase binds the correction to the source trace/result snapshot.
3. The system creates a patch with explicit scope: resource, theme, or global.
4. Replay validates the patch against the source trace and selected samples.
5. Only replay-passed patches can become active.
6. Repair Queue shows pending, failed, and active correction status.

Phase 2 implements the minimal real closure. Phase 3 can add quality scoring,
automatic relearning, and impact analysis.

### 7. Trace Visibility Layer

Normal users see understandable trust evidence:

- Analysis theme.
- Query resource/dataset.
- Authorized field count.
- Permission trimming summary.
- Data update time when available.
- Whether terminology or SQL examples were matched.
- Trusted, blocked, or partial state.

Administrators and developers with audit permission can see full trace details:

- Generated SQL.
- Row/column permission rules.
- SQLBot raw events.
- Error causes and fixes.
- Replay result.
- Stored snapshot payload metadata.

## Phase 2 Acceptance Criteria

- No answer-runtime frontend flow calls SQLBot directly.
- First question, recommended follow-up, interpretation, prediction, history
  continuation, learning correction, feedback, replay, and repair closure all
  route through Trusted Gateway.
- Every answer-runtime action gets a persistent `trace_id`.
- Historical answers restore from snapshot and do not trigger SQLBot or data
  re-execution.
- Normal historical restore is re-checked against current permissions.
- Admin audit mode can inspect original snapshot and original permission
  evidence.
- Column permissions trim runtime schema before SQLBot and validate returned
  SQL/chart/table payload after SQLBot.
- Row permissions cover single-dataset and common `WHERE` rewrite/validation
  scenarios.
- Learning correction generates scoped patches and only replay-passed patches
  can become active.
- Repair Queue items can be moved toward closure through replay evidence.

## Phase 3 Goal

Phase 3 productizes configuration publishing and governance. It makes resource,
theme, permission, and row/column permission configuration understandable,
testable, publishable, and governable.

Phase 3 should not start by making a prettier wizard. It should first make
configuration quality measurable and actionable.

## Phase 3 Main Line 1: Publish Checks

Add publish checks for query resource, analysis theme, permission, and
row/column permission changes.

Checks:

- Theme has valid query resources.
- Resource fields are sufficient for smart query.
- Field semantics, terminology, and SQL examples have clear gaps listed.
- Current permission configuration shows which users, roles, and organizations
  can ask.
- Row permission can be safely rewritten for supported scenarios.
- Column permission does not remove required metrics/dimensions.
- High-frequency historical questions can still replay.
- Publish impact identifies affected themes, users, datasets, and historical
  questions.

Phase 2 keeps configuration save-immediate behavior but persists runtime
snapshots. Phase 3 can introduce explicit published versions and bind traces to
configuration versions.

## Phase 3 Main Line 2: Governance Console

Upgrade Trust Health and Repair Queue into an operational governance console.

Metrics:

- Trusted answer rate.
- Block reason distribution.
- Low-quality theme ranking.
- Low-quality resource ranking.
- High-frequency failed questions.
- Row/column permission block ranking.
- Learning patch activation and failure status.
- Replay pass rate.
- SQLBot call failure rate.
- Administrator pending repair queue.

The console should help administrators decide what to fix first, not merely show
logs.

## Phase 3 Later Line: Configuration Wizard

After publish checks and governance work, reorganize the configuration
experience into a Quick BI-style guided flow:

1. Select resources.
2. Review field semantics.
3. Add terminology and SQL examples.
4. Build analysis theme.
5. Configure permission scope.
6. Configure row/column permission.
7. Run publish checks.
8. Publish and monitor governance.

This wizard should reuse the same publish checks and governance evidence rather
than inventing a separate configuration path.

## Non-Goals

- Phase 2 does not implement every complex row permission SQL rewrite scenario.
- Phase 2 does not introduce full configuration publish versions.
- Phase 2 does not redesign all configuration pages into a new wizard.
- Phase 3 does not replace existing permission systems; it consumes and explains
  them for smart query.

## Recommended Delivery Plan

### Phase 2 Delivery Slices

1. Persistent trace/result snapshot schema and storage.
2. Trusted Gateway coverage for all user answer-runtime flows.
3. Historical restore from snapshot with current-permission recheck.
4. Column permission pre-trim and post-result validation.
5. Row permission single-dataset/common-`WHERE` rewrite and validation.
6. Learning patch, replay, and repair closure.
7. User trust evidence and admin audit trace views.

### Phase 3 Delivery Slices

1. Publish check engine for resource/theme/permission changes.
2. Replay-based publish validation and impact analysis.
3. Governance console metrics and repair prioritization.
4. Configuration versioning and trace-version binding.
5. Guided configuration wizard.

## Open Risks

- Full result snapshots can increase storage size. Retention policy and payload
  compression should be defined during implementation planning.
- Current-permission historical restore needs precise UI states for reduced
  access.
- SQL parsing and row permission rewrite should start with explicit supported
  SQL patterns to avoid false confidence.
- Admin audit mode must be permission-gated and logged.
