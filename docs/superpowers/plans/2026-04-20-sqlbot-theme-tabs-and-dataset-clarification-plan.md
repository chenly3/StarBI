# SQLBot Theme Tabs And Dataset Clarification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the existing analysis-theme management backbone, add analysis-theme tabs to the `sqlbot-new` ask flow, and complete candidate-dataset clarification in the current `sqlbot-new` visual style without waiting for new frontend prototypes.

**Architecture:** Keep the existing `aiQueryTheme` management module as the backend/admin source of truth, then thread a lightweight `themeId/themeName` runtime context through `sqlbot-new` selection and conversation state. Reuse the current clarification card and SQLBot SSE flow for `ambiguous_dataset`, and limit new UI to theme tabs on the home/result shells plus lightweight theme-aware filtering in the existing dataset selector.

**Tech Stack:** Vue 3, TypeScript, Element Plus Secondary, existing `sqlbot-new` composables, existing `aiQueryTheme` REST APIs, SQLBot clarification SSE contract, DataEase Java backend APIs.

---

## Scope Boundaries

- This plan covers direct implementation work that does **not** require new prototypes:
  - runtime theme tabs in `sqlbot-new`
  - theme-aware dataset filtering
  - candidate-dataset clarification and continue-analysis flow
  - backend/runtime support needed by the above
- This plan explicitly does **not** cover management-page visual redesign. The admin analysis-theme pages will follow the user's future Calicat prototype.
- Per user instruction, this plan excludes any `git` steps.

## Existing Reuse Points

- Existing admin theme API surface:
  - [AIQueryThemeApi.java](/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/AIQueryThemeApi.java)
  - [aiQueryTheme.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiQueryTheme.ts)
- Existing admin theme page skeleton:
  - [query-theme/index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue)
- Existing runtime ask flow:
  - [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue)
  - [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts)
  - [useSqlbotNewConversation.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts)
  - [SqlbotNewClarificationCard.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewClarificationCard.vue)
- Existing backend clarification support already includes `ambiguous_dataset`:
  - [clarification.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/clarification.py)
  - [llm.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py)

## File Map

### Runtime frontend

- Modify: [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue)
  - add theme tabs in both home and result shells
  - wire theme-change actions
- Modify: [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts)
  - own active theme state and theme-aware dataset filtering
  - expose filtered dataset list and current theme summary
- Modify: [useSqlbotNewConversation.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts)
  - carry `themeId/themeName` in execution context/session payload
  - reset or branch session when theme changes
  - reuse `ambiguous_dataset` clarification continuation
- Modify: [types.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts)
  - add runtime theme context typing
- Modify: [SqlbotNewClarificationCard.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewClarificationCard.vue)
  - ensure option descriptions render cleanly for dataset candidates

### Runtime frontend API bridge

- Modify: [aiQueryTheme.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiQueryTheme.ts)
  - add a runtime-safe list method if current admin list payload needs normalization for tabs

### Backend / API

- Modify: [AIQueryThemeApi.java](/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/AIQueryThemeApi.java)
  - only if a dedicated runtime theme endpoint is needed
- Modify: concrete DataEase theme controller/service files that implement `AIQueryThemeApi`
  - return enabled/sorted theme list and theme datasets for runtime use
- Modify: [clarification.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/clarification.py)
  - refine dataset option labels/descriptions if needed
- Modify: [llm.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py)
  - ensure candidate dataset names/descriptions are passed into `ambiguous_dataset`

### Tests / verification

- Modify or create:
  - SQLBot backend tests around `ambiguous_dataset`
  - frontend targeted checks for theme filtering logic if the repo already uses unit tests there
- Update verification notes after completion:
  - [quick-bi-smart-query-verification-notes.md](/Users/chenliyong/AI/github/StarBI/tmp/quick-bi-smart-query-verification-notes.md)

## Task 1: Lock Reuse Strategy For Analysis Theme Management

**Files:**
- Inspect/Modify: [query-theme/index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/visualized/data/query-theme/index.vue)
- Inspect/Modify: [aiQueryTheme.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiQueryTheme.ts)
- Inspect/Modify: [AIQueryThemeApi.java](/Users/chenliyong/AI/github/StarBI/dataease/sdk/api/api-base/src/main/java/io/dataease/api/ai/query/AIQueryThemeApi.java)

- [ ] Confirm whether the current admin theme page and APIs already support:
  - theme create/edit
  - dataset binding
  - dataset count
  - theme status
  - theme sort
- [ ] If any of the above are missing in the real implementation, patch the existing admin module instead of creating a second theme-management surface.
- [ ] Keep management-page interaction changes minimal until the user's prototype arrives.

**Expected outcome:** the existing admin theme module remains the single source of truth, and runtime work can depend on it safely.

## Task 2: Add Runtime Theme Context To `sqlbot-new`

**Files:**
- Modify: [types.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts)
- Modify: [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts)
- Modify: [useSqlbotNewConversation.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts)

- [ ] Extend the runtime execution context with:
  - `themeId?: string`
  - `themeName?: string`
- [ ] Store active theme state in the selection composable, not in the page shell.
- [ ] Persist the active theme in the session snapshot/history payload so restored sessions know which theme they belonged to.
- [ ] On theme change, start a new conversation scope rather than silently mutating the current session context.

**Expected outcome:** theme selection becomes a first-class runtime context, similar to dataset/file/model context.

## Task 3: Add Theme Tabs To Home And Result Shells

**Files:**
- Modify: [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue)

- [ ] Add a theme-tab row to the home shell above the dataset cards.
- [ ] Add the same theme-tab row to the result shell so users still perceive the active theme during multi-turn analysis.
- [ ] Always include one synthetic tab: `全部`.
- [ ] Theme tabs should visually reuse the current `sqlbot-new` chip/tab language instead of introducing a new page layout.
- [ ] When a theme changes:
  - clear the current dataset selection if it no longer belongs to the new theme
  - refresh the visible dataset candidates
  - refresh recommended-question content if available

**Expected outcome:** users can manually switch analysis theme on both home and result pages without a separate prototype-driven redesign.

## Task 4: Filter Dataset Candidates By Active Theme

**Files:**
- Modify: [useSqlbotNewSelection.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts)
- Modify: [aiQueryTheme.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiQueryTheme.ts)

- [ ] Load enabled analysis themes for runtime consumption.
- [ ] When active theme is `全部`, keep the current dataset list behavior.
- [ ] When a specific theme is active, only expose datasets that belong to that theme.
- [ ] Reuse existing dataset detail / datasource resolution logic after filtering, rather than duplicating it.
- [ ] If the selected dataset gets filtered out by theme change, show a lightweight reset and require the user to pick a valid dataset again.

**Expected outcome:** theme switching directly constrains the askable dataset scope in the current `sqlbot-new` flow.

## Task 5: Productize `ambiguous_dataset` Clarification

**Files:**
- Modify: [clarification.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/clarification.py)
- Modify: [llm.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/task/llm.py)
- Modify: [SqlbotNewClarificationCard.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewClarificationCard.vue)
- Modify: [index.vue](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue)

- [ ] Keep dataset ambiguity as **single-choice clarification** in this iteration.
- [ ] Prompt format:
  - `这次问题要基于哪个数据集分析？`
- [ ] Option label:
  - dataset name
- [ ] Option description:
  - lightweight match reason only, such as matched metrics/dimensions or theme hint
- [ ] Reuse the existing clarification-card visual style; do not create a new dataset-confirmation page.
- [ ] After the user chooses a dataset, continue the original analysis in the same conversation flow.

**Expected outcome:** dataset ambiguity behaves like the already implemented time/metric/dimension clarification, matching the current `sqlbot-new` interaction style.

## Task 6: Make Theme Context Affect Candidate-Dataset Clarification

**Files:**
- Modify: backend theme runtime query code
- Modify: [useSqlbotNewConversation.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts)

- [ ] If the active theme is `全部`, dataset ambiguity can be resolved against the full accessible runtime set.
- [ ] If a specific theme is active, candidate datasets should be drawn from the theme-constrained set first.
- [ ] The frontend should not show theme-conflict confirmation in this iteration.
- [ ] Instead, theme selection is user-driven via theme tabs; once a theme is chosen, clarification stays inside that scope.

**Expected outcome:** the direct implementation path stays simple: user chooses theme first via tabs, then any dataset ambiguity is resolved inside that chosen scope.

## Task 7: Verification

**Files:**
- Modify: [quick-bi-smart-query-verification-notes.md](/Users/chenliyong/AI/github/StarBI/tmp/quick-bi-smart-query-verification-notes.md)

- [ ] Verify backend theme list and theme dataset APIs return stable, string-safe ids.
- [ ] Verify home page theme tabs render and switching themes changes visible dataset cards.
- [ ] Verify result page theme tabs render and switching themes resets scope safely.
- [ ] Verify `ambiguous_dataset` appears in the real UI with current card style.
- [ ] Verify choosing a dataset candidate continues the question flow.
- [ ] Before every browser verification, use:
  - [browser-verify-preflight.sh](/Users/chenliyong/AI/github/StarBI/browser-verify-preflight.sh)

**Expected browser checks:**
- theme tab on home page
- theme tab on result page
- theme-filtered dataset list
- dataset clarification card
- clarification continuation success

## Deferred Until Prototype

These are intentionally not part of this direct-implementation lane:

- redesign of admin analysis-theme management page
- theme-management visual structure beyond the current reuse path
- frontend theme conflict page
- frontend multi-dataset selection page
- management-side recommendation/strategy visual redesign

## Execution Recommendation

Start with the runtime path first because it is unblocked by prototypes:

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7

Once the user's Calicat prototype for admin analysis-theme management arrives, patch the existing `query-theme` management page to match it rather than building a parallel feature.
