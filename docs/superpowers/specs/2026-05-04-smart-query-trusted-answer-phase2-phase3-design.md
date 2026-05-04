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
- Resource/theme configuration is treated as runtime governance, not as a
  passive list. Resource count, cross-source risk, knowledge rules, permissions,
  feedback, and replay evidence all affect whether a configuration is safe to
  use for smart query.

## Phase 2 Goal

Phase 2 builds the trusted runtime closure.

Every user-visible action that generates an answer or affects answer correction
must pass through DataEase Trusted Answer Layer, persist a complete trace/result
snapshot, and be restorable without re-running SQLBot.

### Phase 2 In Scope

- First smart-query question.
- Recommended follow-up question.
- Manual follow-up question.
- Data interpretation.
- Trend prediction.
- Continued question after history restore.
- Historical result restore.
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

Phase 2 must maintain an explicit answer-runtime action matrix. Each row defines
the UI entry, DataEase endpoint, SQLBot proxy behavior, trace event, snapshot
behavior, and permission recheck behavior.

| Action | Required gateway behavior | Snapshot | Permission check |
| --- | --- | --- | --- |
| First smart-query question | Build runtime context and stream trusted-answer events | Save full trace/result when execution succeeds or fails | Current user resource, row, and column permissions |
| Recommended follow-up question | Bind to parent trace and inherited context before calling SQLBot | Save child trace with parent trace link | Recheck current permissions before execution |
| Manual follow-up question | Bind to active conversation context and selected theme/resource | Save child trace with inherited context summary | Recheck current permissions before execution |
| Data interpretation | Treat interpretation as an answer-generating action, not a frontend-only text request | Save interpretation text and source result reference | Recheck snapshot visibility before generating interpretation |
| Trend prediction | Treat prediction as an answer-generating action with its own trace event | Save prediction text/config and source result reference | Recheck snapshot visibility before generating prediction |
| Continued question after history restore | Use restored context only after current-permission restore succeeds | Save new trace linked to restored trace | Recheck current permissions before execution |
| Historical result restore | Read stored snapshot and apply restore policy | Do not create a new SQLBot execution snapshot | Recheck current permissions using metadata only |
| Feedback event | Bind praise/complaint to source trace | Save feedback event | Verify user can still see the source trace summary |
| Learning correction submission | Create scoped learning patch candidate from source trace | Save correction draft and source evidence | Verify user can submit correction for that trace |
| Replay validation | Run deterministic replay against selected samples | Save replay result and compared outputs | Use admin/operator permission |
| Repair Queue closure | Require replay evidence before closure | Save closure event | Use admin/operator permission |

Source guard tests must fail the build when answer-runtime frontend code imports
or calls SQLBot directly outside DataEase trusted-answer APIs.

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
- Active learning patches relevant to the selected resource/theme.
- Available Quick BI-style knowledge rules when implemented: business logic,
  regular expression matching, dataset selection, and smart table selection.

Outputs:

- Authorized datasets and datasource.
- User-visible schema after column permission trimming.
- Row permission constraints for SQL safety handling.
- Matched terms and SQL examples.
- Traceable configuration snapshot.
- Knowledge-context snapshot with matched rules and patch versions.

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

Phase 2 supported row-permission SQL patterns:

- Single datasource and single dataset.
- Simple `SELECT`, aggregate `SELECT`, `GROUP BY`, `ORDER BY`, and `LIMIT`.
- No `WHERE`, or simple `WHERE` connected by `AND`/`OR`.
- Row permission constraints that can be safely appended as `AND (...)`.
- Field references that can be mapped back to authorized physical fields.

Phase 2 unsupported row-permission SQL patterns:

- Multi-datasource execution.
- Complex join rewrite.
- Subquery, CTE, or window-function rewrite.
- Expressions or aliases that cannot be mapped back to source fields.
- SQL that already contains permission-sensitive expressions the parser cannot
  classify safely.

Unsupported or ambiguous cases must fail closed. The system blocks the answer,
writes a trace error, and explains that row permission could not be safely
applied. It must not fall back to frontend filtering or best-effort execution.

Column permission rules:

- Before SQLBot, unauthorized fields must be removed from schema, examples, and
  prompt context.
- After SQLBot, generated SQL, chart config, table payload, interpretation text,
  prediction text, and recommended questions must not expose unauthorized fields.
- If text validation cannot confidently determine whether an unauthorized field
  is referenced, normal users receive a reduced/safe explanation and the trace
  records a partial state for administrator review.

### 4. Trace And Result Snapshot Store

Trace storage becomes persistent in Phase 2. Storage has two layers:

- `trace metadata`: action type, trace state, context identifiers, timing,
  permission evidence summary, replay status, and governance fields.
- `result snapshot`: question, generated SQL, chart configuration, result data,
  interpretation/prediction text, recommended questions, raw SQLBot event
  evidence, and user-visible answer payload.

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

Snapshot security policy:

- SQLBot raw SSE events must be redacted before persistence. Tokens, headers,
  connection strings, model keys, datasource secrets, and internal stack traces
  containing sensitive configuration must not be stored in clear text.
- Result snapshots are sensitive business data. Normal users can restore only
  under current permissions. Audit access requires an explicit administrator
  audit permission.
- Default retention target: result snapshots are retained for 180 days and trace
  metadata for 365 days. The implementation plan may expose these values as
  configuration, but it must not hard-code permanent retention.
- Snapshot payloads should be compressed when large. Compression must not happen
  before redaction.
- Deleting users, organizations, resources, themes, or permission rules does not
  immediately erase trace metadata. Restore must still apply current permissions
  and degrade or block as needed.
- Trace export is audit-only and must write an audit log with actor, trace id,
  export time, export scope, and reason.

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

Restore is allowed to read current permission metadata, resource metadata, theme
metadata, and field mappings. Restore must not execute business SQL, call SQLBot,
or regenerate interpretation/prediction text for the old answer.

Restore states:

| State | User-visible behavior | Data access rule |
| --- | --- | --- |
| `FULL_RESTORE` | Restore chart, table, SQL evidence, interpretation, prediction, and recommended questions | Current permissions still cover the stored resources and fields |
| `FIELD_REDUCED` | Show question, time, safe summary, and hidden-field notice. Hide table detail, sensitive chart fields, SQL field names, and text that references hidden fields | Some stored fields are no longer visible |
| `RESOURCE_REVOKED` | Show historical question, time, and unavailable reason only | Theme/resource/dataset is no longer visible |
| `ADMIN_AUDIT` | Show original snapshot and original permission evidence | Actor has administrator audit permission |
| `RESTORE_BLOCKED` | Show restore failure state and trace id | Permission metadata is unavailable, field mapping is invalid, or snapshot integrity check fails |

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

Patch types:

- Terminology patch.
- SQL example patch.
- Field alias patch.
- Business rule patch.
- Permission correction suggestion.

Patch scope and conflict rules:

- Resource-scoped patches have the highest priority and should be preferred for
  ordinary user corrections.
- Theme-scoped patches apply only inside that analysis theme.
- Global patches require administrator approval before activation.
- Resource scope overrides theme scope. Theme scope overrides global scope.
- Same-scope conflicts enter manual review; the system must not auto-pick the
  newest patch silently.

Patch lifecycle:

1. `DRAFT`: correction captured and bound to source trace.
2. `REPLAY_PENDING`: replay job is queued.
3. `REPLAY_FAILED`: replay did not pass source trace or sample checks.
4. `APPROVAL_PENDING`: replay passed but activation requires approval.
5. `ACTIVE`: patch can be used by Runtime Context Builder.
6. `DISABLED`: patch is manually disabled.
7. `ROLLED_BACK`: active patch was reverted to a prior version.

Every patch must keep source trace id, creator, scope, version, replay evidence,
activation actor, activation time, and rollback reason when rolled back.

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

Audit detail views must be permission-gated and logged. Normal user trust
evidence must never expose raw SQLBot payloads, hidden field names, row
permission expressions, datasource secrets, or model configuration details.

## Phase 2 Acceptance Criteria

- No answer-runtime frontend flow calls SQLBot directly.
- Source guard tests prove answer-runtime frontend code cannot import or call
  SQLBot clients directly outside DataEase trusted-answer APIs.
- First question, recommended follow-up, interpretation, prediction, history
  continuation, learning correction, feedback, replay, and repair closure all
  route through Trusted Gateway.
- Every answer-runtime action gets a persistent `trace_id`.
- The answer-runtime action matrix is implemented and covered by backend or
  frontend contract tests.
- Historical answers restore from snapshot and do not trigger SQLBot or data
  re-execution.
- Normal historical restore is re-checked against current permissions.
- Historical restore supports `FULL_RESTORE`, `FIELD_REDUCED`,
  `RESOURCE_REVOKED`, `ADMIN_AUDIT`, and `RESTORE_BLOCKED` states.
- Snapshot persistence redacts SQLBot raw events, applies retention policy, and
  gates export behind administrator audit permission.
- Admin audit mode can inspect original snapshot and original permission
  evidence.
- Column permissions trim runtime schema before SQLBot and validate returned
  SQL/chart/table payload after SQLBot.
- Row permissions cover single-dataset and common `WHERE` rewrite/validation
  scenarios.
- Unsupported row-permission SQL patterns fail closed with structured trace
  errors.
- Learning correction generates scoped patches and only replay-passed patches
  can become active.
- Global learning patches require administrator approval, and every active patch
  can be disabled or rolled back with audit evidence.
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
- Theme resource count stays within the recommended smart-query operating range.
  Use 10 resources as the first warning/publish-check threshold, aligned with the
  Quick BI-style idea that themes should narrow rather than expand question
  scope.
- Resource fields are sufficient for smart query.
- Field semantics, terminology, SQL examples, business logic rules, regular
  expression matching, dataset selection rules, and smart table selection rules
  have clear gaps listed.
- Current permission configuration shows which users, roles, and organizations
  can ask.
- Row permission can be safely rewritten for supported scenarios.
- Column permission does not remove required metrics/dimensions.
- High-frequency historical questions can still replay.
- Publish impact identifies affected themes, users, datasets, and historical
  questions.
- Cross-source, field-conflict, permission-incomplete, and high-risk learning
  patch conflicts block publish or require explicit administrator override.

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
- Question operation status: submitted, answered, blocked, complained, repaired,
  replayed, and closed.
- Top feedback sources: user complaints, failed SQL, low-confidence resources,
  and permission safety blocks.

The console should help administrators decide what to fix first, not merely show
logs.

## Phase 3 Later Line: Configuration Wizard

After publish checks and governance work, reorganize the configuration
experience into a Quick BI-style guided flow:

1. Select resources.
2. Review field semantics.
3. Add terminology, SQL examples, business logic rules, regular expression
   matching, dataset selection rules, and smart table selection rules.
4. Build analysis theme.
5. Review theme resource count, cross-source risk, field conflicts, and default
   resource strategy.
6. Configure permission scope.
7. Configure row/column permission.
8. Run publish checks.
9. Publish and monitor governance.

This wizard should reuse the same publish checks and governance evidence rather
than inventing a separate configuration path.

## Non-Goals

- Phase 2 does not implement every complex row permission SQL rewrite scenario.
- Phase 2 does not introduce full configuration publish versions.
- Phase 2 does not redesign all configuration pages into a new wizard.
- Phase 2 does not implement the full Quick BI-style knowledge management
  authoring UI. It only reserves the runtime context and trace contracts.
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
7. Source guard and action-matrix contract tests.
8. User trust evidence and admin audit trace views.

### Phase 3 Delivery Slices

1. Publish check engine for resource/theme/permission changes.
2. Replay-based publish validation and impact analysis.
3. Governance console metrics and repair prioritization.
4. Configuration versioning and trace-version binding.
5. Quick BI-style knowledge management expansion.
6. Guided configuration wizard.

## Open Risks

- Snapshot storage can still grow quickly even with retention and compression.
  Implementation planning should estimate payload size and add cleanup jobs.
- Current-permission historical restore depends on stable field mappings. Dataset
  schema changes can force `RESTORE_BLOCKED` until mapping recovery exists.
- SQL parsing and row permission rewrite remain a hard boundary. Unsupported
  patterns must stay fail-closed until Phase 3 expands coverage.
- Text validation for hidden field references may produce false positives. The
  safe default is reduced visibility rather than accidental disclosure.
