# Browser Verification Restart Design

Date: 2026-04-19

## Goal

Before every browser automation verification in the current StarBI workspace, restart only the services impacted by the latest local code changes, then wait until those services are reachable before running `agent-browser`.

## Constraints

1. Do not use `git` to infer changes.
2. Only rely on explicit local file paths or direct service aliases.
3. Reuse the existing restart scripts:
   - `dataease/dataease-app.sh`
   - `dataease/dataease-web.sh`
   - `SQLBot/sqlbot-app.sh`
   - `SQLBot/sqlbot-web.sh`
4. Browser automation must start only after the required services are restarted and their ports are ready.

## Restart Mapping

- `dataease/core/core-backend/**`, `dataease/sdk/**`, `dataease/de-xpack/**`
  - restart `dataease/dataease-app.sh`
- `dataease/core/core-frontend/**`
  - restart `dataease/dataease-web.sh`
- `SQLBot/backend/**`
  - restart `SQLBot/sqlbot-app.sh`
- `SQLBot/frontend/**`, `SQLBot/g2-ssr/**`
  - restart `SQLBot/sqlbot-web.sh`

## Execution Order

If multiple areas changed, restart in this order:

1. `dataease-app`
2. `sqlbot-app`
3. `dataease-web`
4. `sqlbot-web`

This keeps backend services ready before any dependent frontend browser flow starts.

## Local Entry Point

Use the root script:

```bash
./browser-verify-preflight.sh <changed-path-or-service>...
```

Examples:

```bash
./browser-verify-preflight.sh \
  dataease/core/core-frontend/src/views/sqlbot-new/index.vue \
  SQLBot/backend/apps/chat/task/clarification.py
```

```bash
./browser-verify-preflight.sh dataease-app sqlbot-app dataease-web
```

## Ready Definition

A restart is considered complete only when the expected local port is reachable:

- `dataease-app`: `8100`
- `dataease-web`: `8080`
- `sqlbot-app`: `8000`
- `sqlbot-web`: `5173`

After all impacted ports are ready, browser automation verification can begin.
