# Task Plan: System Settings Layout Refactor

## Goal
Refactor all StarBI system settings pages into a consistent, readable, adaptive layout. Fix oversized titles, ugly tab/menu hierarchy, nested cards, excessive whitespace, small typography, and the row/column permission route rendering issue.

## Phases
1. Diagnose row/column permission route rendering and current layout defects. Status: complete.
2. Refactor shared system setting shell, menu, spacing, and typography. Status: complete.
3. Refactor affected system setting pages to remove nested-card and empty-space problems. Status: complete.
4. Build, restart frontend, and run browser screenshot regression under `tmp/`. Status: complete.

## Scope
- In scope: system settings layout for query config, general/AI config, font management, user management, organization management, permission config, and row/column permission config.
- In scope: frontend route/menu shell corrections needed for system settings pages.
- Out of scope: backend permission behavior changes and SQLBot permission model changes.

## Decisions
- Keep system settings as a single left-side menu model. No secondary left menu inside user/org/permission pages.
- Put page title, sheet tabs, and primary tools in one compact title row.
- Only functional regions should have borders/cards. Do not wrap sparse content in a full-screen white card.
- Browser evidence must be saved under the project `tmp/` directory.

## Errors Encountered
| Error | Attempt | Resolution |
| --- | --- | --- |
| `/sys-setting/row-column-permission` screenshot rendered SQLBot page | Previous browser verification | Fresh browser reproduction after login renders the row/column page correctly. |
| Login redirect duplicated row/column permission query string | Fresh browser reproduction | Added a guard to avoid appending hash query when the target route already has query parameters. |
| Frontend build failed on Prettier formatting | `npm run build` attempt 1 | Reformatted the new `permission.ts` condition to the project's multiline style. |
| Login redirect appended `?#/sys-setting/parameter` after fresh login | Browser verification after restart | Restricted hash query backfill to real `key=value` query strings and ignored strings containing `#/`. |
| Build verification wrapper failed with `read-only variable: status` | Redirected build log command | Re-ran with `rc` variable; `npm run build` exited 0. |
