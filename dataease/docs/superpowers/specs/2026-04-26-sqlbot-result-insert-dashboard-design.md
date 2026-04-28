# SQLBot Result To Dashboard Design

## Context

StarBI already supports:

- `sqlbotnew` multi-turn smart query
- dataset and dataset-combination query flows
- query result rendering as charts/tables inside the SQLBot conversation
- existing DataEase dashboard and dataV editors
- existing chart editor and dataset / dataset-combination editing flows

What is still missing is the Quick BI-style asset conversion path:

- turn a query result into a reusable standard chart asset
- insert that asset into an existing dashboard or dataV canvas
- reopen the inserted chart in the existing editor with the dataset, dimensions, metrics, sorting, filters, and chart type already populated
- support both:
  - forward insertion from `sqlbotnew`
  - reverse insertion from dashboard / dataV by browsing recent query results and saved query chart resources

This design intentionally follows Quick BI’s core product direction:

1. query results are not terminal chat artifacts, they are reusable analysis assets
2. insertion into dashboard / screen is a resource conversion workflow, not a screenshot workflow
3. inserted charts become standard editable chart assets
4. editing defaults to the existing chart editor, with dataset or dataset-group editing reachable from that editor

## Goals

Implement a first version that allows users to:

1. insert a dataset or dataset-group query result from `sqlbotnew` into an existing dashboard or dataV
2. open dashboard / dataV and reverse-pick:
   - current user recent query results
   - workspace-saved query chart resources
3. edit the inserted chart through the existing DataEase editor with automatic binding to:
   - dataset or dataset-group
   - dimensions
   - metrics
   - sorting
   - filters
   - chart type
4. block insertion when the query result cannot be losslessly mapped into the standard chart editor model

## Non-Goals

This version does not try to solve:

- every possible chart type emitted by SQLBot
- bidirectional sync between edited dashboard chart assets and original SQLBot history
- collaborative recent-result sharing across users beyond workspace resource visibility
- direct editing inside the SQLBot result card without entering the standard editor
- preserving every LLM-specific explanation artifact as part of the editable chart schema

## Confirmed Product Decisions

The following were explicitly confirmed:

- Use Quick BI as the reference product direction.
- Inserted charts must become DataEase standard chart assets.
- Inserted charts are independent copies for dashboard / dataV usage.
- Editing after insertion should default to the existing chart editor.
- The editor must automatically preselect the mapped dataset or dataset-group and mapped dimensions / metrics / sort / filters.
- Users must still be able to jump from the chart editor to edit the underlying dataset or dataset-group.
- Support both forward insertion from `sqlbotnew` and reverse insertion from dashboard / dataV.
- Reverse insertion must support:
  - current user recent query results
  - workspace saved query chart resources
- First version must support both:
  - dashboard
  - dataV
- If mapping is incomplete or unsafe, insertion must be blocked with explicit reasons.

## Recommended Approach

### Chosen Approach

Convert SQLBot query results into an intermediate persisted query-chart asset, then materialize that asset into a standard chart resource before inserting a dashboard / dataV component.

### Why This Approach

This is the only approach that cleanly satisfies all confirmed requirements:

- It preserves the SQLBot result as a traceable source artifact.
- It allows reverse discovery from dashboard / dataV.
- It keeps dashboard / dataV editors unaware of SQLBot-specific runtime details.
- It reuses the existing chart editor instead of creating a parallel SQLBot chart editor.
- It allows strict pre-insert mapping validation.

## Architecture

The design uses two persistent layers and two insertion entry points.

### Layer 1: Query Result Snapshot

This stores SQLBot-native result state for replay, traceability, and reverse discovery.

Required fields:

- sqlbot history identifiers:
  - chat id
  - record id
- question and title
- theme id and theme name
- source kind:
  - dataset
  - dataset-combination
  - file if supported later
- source ids:
  - dataset id
  - dataset-group id for combinations
- datasource id
- generated SQL
- generated chart config
- generated chart data metadata
- interpretation / summary metadata when available
- source relation summary for dataset-combination results
- timestamps
- ownership / workspace scope markers

This layer is the source for:

- recent query result list in dashboard / dataV
- troubleshooting and replay
- future re-conversion

### Layer 2: Query Chart Resource

This is the persisted reusable asset derived from a query result snapshot.

Required fields:

- query result snapshot reference
- workspace scope
- creator
- display title
- mapped chart type
- mapped dataset binding:
  - dataset id, or
  - dataset-group id
- mapped chart editor payload:
  - dimensions
  - metrics
  - sorting
  - filters
  - legend / axis mapping as needed by supported chart types
- source flags:
  - `source = sqlbot`
  - `source_kind`
  - `source_query_result_id`
- validation state

This layer is the source for:

- saved query chart resource list inside dashboard / dataV reverse-insert dialog
- chart materialization into standard DataEase chart resources

### Materialized Standard Chart Resource

Insertion into dashboard / dataV should not place a special SQLBot runtime card on the canvas.

Instead:

1. query result snapshot is loaded
2. query chart resource is created or reused
3. standard DataEase chart resource is created from the mapped configuration
4. dashboard or dataV component is inserted as a normal chart component referencing that resource

## Entry Flows

### Flow A: Forward Insert From SQLBot Result Card

Entry:

- `sqlbotnew` result card action:
  - `插入仪表板/大屏`

Steps:

1. user clicks insert
2. system validates mapping completeness
3. if no query chart resource exists:
   - create query result snapshot
   - create query chart resource
4. present target selector:
   - current open dashboard / dataV first when available
   - otherwise search existing dashboard / dataV resources
5. user selects target
6. system materializes standard chart resource
7. system inserts canvas component into target
8. success feedback:
   - inserted target name
   - open target
   - insert into another target

### Flow B: Reverse Insert From Dashboard / DataV

Entry:

- dashboard toolbar action:
  - `插入问数图表`
- dataV toolbar action:
  - `插入问数图表`

Dialog sections:

1. recent query results
   - current user recent SQLBot results
2. saved query chart resources
   - workspace visible saved query chart assets

List item data:

- title
- source dataset / dataset-group
- chart type
- generated time
- brief metric / dimension summary
- availability state:
  - insertable
  - mapping incomplete
  - unsupported

Steps:

1. user opens insert dialog
2. user browses recent results or saved assets
3. user selects one item
4. system validates mapping again
5. if item is a raw recent result and no chart resource exists, create it first
6. materialize standard chart resource
7. insert into current canvas

## Mapping Model

### Mapping Input

Primary sources used for conversion:

- SQLBot generated chart config
- SQLBot interpretation metadata
- SQLBot execution summary
- mapped dataset or dataset-group metadata from existing DataEase resources

### Mapping Output

The converter must produce editor-ready chart payload containing:

- chart type
- dataset binding
- dimension field bindings
- metric field bindings
- sorting
- filters
- title

### Supported First-Version Chart Types

- table
- column
- bar
- line
- pie

### Mapping Rules

1. Dataset binding
- single dataset result maps to existing dataset id
- dataset-combination result maps to dataset-group id

2. Dimension binding
- every dimension in SQLBot interpretation or chart axis config must resolve to a dataset field in the bound dataset or dataset-group

3. Metric binding
- every metric must resolve to an existing metric field or compatible field in the target editor model

4. Sorting and filters
- only persist rules that can be represented by the standard editor schema
- no silent dropping

5. Chart type
- only supported first-version types can be inserted

## Strict Validation Policy

Insertion is blocked unless conversion is complete and safe.

Validation must fail when:

- no unique dataset or dataset-group can be resolved
- any metric cannot be mapped
- any dimension cannot be mapped
- sort / filter rules cannot be expressed in the standard chart model
- chart type is unsupported

User-facing failure payload should contain:

- failure category
- failing dataset or dataset-group
- unmapped dimensions
- unmapped metrics
- unsupported chart type if any
- recommended next actions:
  - adjust the query
  - switch chart type
  - edit dataset / dataset-group first
  - retry insertion later

## Editing Behavior After Insertion

### Default Edit Path

When user clicks edit on the inserted chart:

- open the existing DataEase chart editor
- editor must already contain:
  - dataset or dataset-group binding
  - dimensions
  - metrics
  - sorting
  - filters
  - chart type

No manual re-selection should be required.

### Dataset / Dataset-Group Editing Entry

From the chart editor:

- if chart uses single dataset:
  - expose `编辑数据集`
- if chart uses dataset-combination:
  - expose `编辑数据集组`

This should jump to the existing dataset or dataset-group edit page, not a new SQLBot-specific editor.

### Independence Rule

Inserted chart is a dashboard / dataV-local asset copy in product semantics.

Editing it:

- updates the chart resource used by that inserted component
- does not mutate SQLBot history records
- does not mutate unrelated dashboards / dataV canvases unless the platform later adds explicit shared-resource semantics

## Dashboard / DataV Scope

First version supports both:

- dashboard
- dataV

The insertion logic should share:

- item discovery
- validation
- conversion
- standard chart resource creation

Only the final canvas insertion adapter should differ:

- dashboard canvas insert adapter
- dataV canvas insert adapter

## Error Handling

### Forward Insert Errors

- no current chart resource and conversion fails
- target dashboard / dataV unavailable
- mapping incomplete
- permission denied for target canvas

### Reverse Insert Errors

- stale recent result no longer resolvable
- saved query chart resource references deleted dataset or dataset-group
- target canvas insertion failed

### Editor Reopen Errors

- underlying dataset deleted
- dataset-group schema changed and no longer satisfies stored chart config

When this happens:

- keep the inserted component visible if possible
- mark edit state as degraded
- show a clear repair action

## Data Flow

### Forward Insert

`sqlbotnew result`
-> validate mapping
-> create / reuse query result snapshot
-> create / reuse query chart resource
-> materialize standard chart resource
-> insert dashboard/dataV component
-> open editor on demand

### Reverse Insert

`dashboard/dataV insert dialog`
-> load recent results + saved query chart resources
-> validate selected item
-> create chart resource if needed
-> materialize standard chart resource
-> insert component

## API / Module Boundaries

Recommended module split:

1. `sqlbot result snapshot service`
- read / write SQLBot-derived result snapshots

2. `query chart resource service`
- create / list / validate reusable query chart assets

3. `sqlbot-to-chart mapper`
- convert SQLBot result model to chart editor model

4. `dashboard/dataV insertion adapter`
- insert a standard chart resource into:
  - dashboard
  - dataV

5. `reverse insert query service`
- aggregate:
  - recent query results
  - saved query chart resources

This keeps SQLBot logic, conversion logic, and canvas insertion logic decoupled.

## Testing Scope

### Required Acceptance Scenarios

1. Single dataset result from `sqlbotnew`
- insert into dashboard
- open editor
- confirm dataset, dimensions, metrics, sort, filters are preloaded

2. Dataset-combination result from `sqlbotnew`
- insert into dashboard
- open editor
- confirm dataset-group binding is preloaded
- confirm dimensions / metrics are preloaded

3. Single dataset result into dataV
- insert successfully
- component renders

4. Dataset-combination result into dataV
- insert successfully
- component renders

5. Reverse insert recent query result into dashboard
- create chart resource on demand
- insert successfully

6. Reverse insert saved query chart resource into dashboard
- insert successfully

7. Mapping failure
- insertion blocked
- explicit failure reasons shown

### Regression Risks

- chart editor cannot consume mapped payload
- dashboard/dataV component insertion creates orphan resources
- dataset-group mapping degrades after schema edits
- recent result list and saved resource list diverge in permissions or visibility

## Recommendation

Proceed with a first implementation slice that establishes:

1. query result snapshot persistence
2. SQLBot result -> standard chart mapping for supported chart types
3. forward insertion from `sqlbotnew`
4. reverse insertion from dashboard

Then extend the same insertion adapter to dataV with the same resource model.

This is the closest path to Quick BI’s core product idea while still fitting DataEase’s current architecture.
