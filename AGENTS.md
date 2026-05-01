# Repository Guidelines

## Project Structure & Module Organization
This repository is a Codex home workspace rather than a single application. Keep hand-edited content focused on configuration and reusable skills:

- `config.toml` stores local Codex configuration.
- `skills/.system/` contains bundled skills. Each skill follows the pattern `SKILL.md`, `agents/openai.yaml`, optional `scripts/`, `references/`, and `assets/`.
- `memories/`, `sessions/`, `shell_snapshots/`, `log/`, and `tmp/` contain runtime state and should not be treated as source modules.
- `version.json` and `state_5.sqlite*` are local state files; avoid manual edits unless debugging.

## Build, Test, and Development Commands
There is no top-level build pipeline. Use targeted validation commands instead:

- `python3 -m compileall skills/.system` — syntax-check all bundled Python helpers.
- `python3 skills/.system/skill-creator/scripts/quick_validate.py <skill-dir>` — validate a skill’s `SKILL.md` frontmatter and naming. Requires `PyYAML`.
- `find skills -name SKILL.md` — inventory skill entry points before editing.

Run commands from the repository root so relative paths resolve correctly.

## Coding Style & Naming Conventions
Follow the existing file-by-file style:

- Python: 4-space indentation, `snake_case` for functions/files, and small focused scripts.
- Skills: use lowercase hyphen-case directory names that match the `name` field in `SKILL.md` frontmatter.
- Markdown/TOML: keep headings short, examples concrete, and keys ordered logically rather than alphabetically.
- Prefer updating existing scripts or references over creating duplicate helper files.

## Testing Guidelines
This workspace does not currently include a dedicated `tests/` directory. For changes to skill scripts, use `python3 -m compileall skills/.system` first, then run the smallest relevant script directly against a sample skill path. For new automated tests, place them near the affected script or add a focused `tests/` directory within the relevant skill.

## Commit & Pull Request Guidelines
Local Git history is not present in this checkout, so use clear imperative commit messages such as `docs: refresh repository guide` or `feat(skill-installer): add repo filter`. PRs should summarize changed paths, describe validation performed, and link related issues. Include screenshots only when updating visual assets or rendered docs.

## Security & Configuration Tips
Do not commit secrets or machine-specific state. Treat `auth.json`, `history.jsonl`, `sessions/`, and `state_5.sqlite*` as local artifacts. When documenting config, reference environment variables such as `CRS_OAI_KEY` instead of hard-coding values.

## User Preferences
- For automation testing, integration debugging, and result verification that involve browser interactions, prefer using `agent-browser`.
- Frontend projects are usually based on `Vue 3`; prefer Vue 3 and Vite oriented solutions unless the project clearly uses another stack.
- For Vue frontend optimization, prioritize `frontend-design`, `vue-pinia-best-practices`, and `vite` when they apply.
- For product concepts, demo scenarios, and exploratory UI design, prefer mobile carrier style and a blue-and-white visual direction unless an existing design system should be preserved.
- For all coding, code review, refactoring, and implementation planning tasks, MUST invoke the global `karpathy-guidelines` skill before writing or modifying code. Treat it as a required constraint unless it conflicts with explicit user instructions, repository instructions, or existing project conventions.

## Feature Development Workflow
For non-trivial feature work, default to the combined Superpowers + gstack workflow below, while keeping changes surgical and verifiable:

- Start with `karpathy-guidelines`, then `superpowers:brainstorming` to clarify intent, assumptions, scope, and success criteria.
- Use `gstack` `/autoplan` when a draft plan exists and multi-angle plan review would reduce risk.
- Use `superpowers:writing-plans` to turn the reviewed idea into an executable implementation plan.
- Use `superpowers:using-git-worktrees` for large or risky changes that need an isolated workspace.
- Use `superpowers:subagent-driven-development` only when the user explicitly asks for subagents or parallel agent work.
- Use `superpowers:test-driven-development` for feature and bugfix implementation whenever practical.
- Use `gstack` `/qa` for browser-based end-to-end validation, screenshots, interaction regression, and UI bug evidence.
- Use `superpowers:verification-before-completion` before claiming completion, passing tests, or readiness to commit.
- Use `superpowers:requesting-code-review`, then `gstack` `/review`, before landing substantial changes.
- Use `superpowers:finishing-a-development-branch` for final branch/commit/PR decisions.
- Use `gstack` `/ship`, `/land-and-deploy`, and `/canary` only when the user explicitly asks to release, merge/deploy, or monitor after deployment.
