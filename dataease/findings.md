# Findings: System Settings Layout Refactor

## Current Defects
- System setting pages use the correct left menu model, but page internals still mix title rows, tabs, toolbars, and full-screen content cards inconsistently.
- Query/AI config shows a small model card inside a huge white container, creating a large blank panel and poor visual density.
- Permission config is structurally better after earlier changes, but it still uses multiple bordered panels and sparse columns that feel disconnected.
- Organization management uses the page width better, but the shell still needs a unified menu/content density pass.
- Row/column permission route has evidence of rendering the SQLBot page instead of the row/column permission page and must be fixed before visual validation.

## Layout Principles
- One system setting shell: left nav, compact title row, content directly below.
- Use larger readable 14px body/table text and 20px compact page titles.
- Prefer functional tables/tree panels over decorative full-screen cards.
- Avoid full-height white cards when content is naturally sparse.

## Verification Findings
- User, organization, permission, query config, font, and row/column permission pages now share the same StarBI header and single system-settings left menu.
- Query config, font, user, organization, permission, and row/column pages render as natural-height functional regions instead of stacked full-screen cards.
- General config still depends on the SQLBot embedded iframe internals, but the host container is capped to a natural business height so sparse model data no longer creates a near-full-screen white block.
- Fresh login to `/sys-setting/parameter` no longer leaves `?#/sys-setting/parameter` in the URL after redirect.
- Direct row/column permission entry with `tab=row&datasetId=9001&datasetName=公有云账单集合` no longer keeps stale `sheet/mode` parameters.
