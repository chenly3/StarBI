# Progress: System Settings Layout Refactor

## 2026-04-28
- User approved complete system settings layout refactor.
- Restored prior context and replaced stale permission acceptance planning files with the current layout task.
- Reproduced row/column permission route after login. Current route renders the correct row/column permission page, but login redirect duplicated the query string.
- Fixed login redirect query duplication guard in `core/core-frontend/src/permission.ts`.
- Refactored shared system setting shell/menu/page density and removed several full-height/nested-card layout patterns across user, org, permission, query config, AI config, and row/column permission pages.
- `npm run build` attempt 1 failed on Prettier formatting in `permission.ts`; reformatted the condition.
- `npm run build` attempt 2 passed with existing warnings.
- Next: restart `dataease-web.sh` and capture browser screenshots under `tmp/`.
- Re-ran `npm run build`; full log written to `tmp/system-layout-build.log`, final exit code was 0 with existing warnings.
- Restarted DataEase frontend with `./dataease-web.sh`.
- Ran `agent-browser close --all` before browser verification, logged in as `admin`, and captured final screenshots under `tmp/`.
- Fixed a fresh-login redirect pollution case where `/sys-setting/parameter` became `/sys-setting/parameter?#/sys-setting/parameter`.
- Reduced the general config SQLBot embed host height to avoid a near-full-screen white card on sparse AI model data.
- Final browser evidence:
  - `tmp/system-layout-parameter-refactor-v5.png`
  - `tmp/system-layout-row-column-refactor-v4.png`
  - `tmp/system-layout-query-config-refactor-v2.png`
  - `tmp/system-layout-font-refactor-v2.png`
  - `tmp/system-layout-user-refactor-v2.png`
  - `tmp/system-layout-org-refactor-v2.png`
  - `tmp/system-layout-permission-refactor-v2.png`
