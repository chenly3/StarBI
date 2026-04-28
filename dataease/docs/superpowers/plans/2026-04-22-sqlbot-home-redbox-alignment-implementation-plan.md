# SQLBot Home Redbox Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the SQLBot home page so the two red-box regions from the Calicat reference are visually aligned first: the left menu card and the upper analysis-theme/dataset chooser block, while preserving the existing lower ask area and recommendation area.

**Architecture:** Use a static-first but narrowed approach. Phase 1 creates a standalone local Vue reference page that only reproduces the red-box regions for approval. Phase 2 applies those approved visuals to the real `sqlbot-new` home page, keeping lower ask/recommend sections and later adding the multi-dataset clarification card.

**Tech Stack:** Vue 3, Vite, existing `sqlbot-new` composables, agent-browser for browser verification

**Execution Note:** The user explicitly forbids git operations in this workspace. Do not add, commit, amend, reset, checkout, or otherwise use git during execution of this plan.

---

## File Structure

### Static reference phase

- Create or modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-home-prototype/index.vue`
  - Responsibility: standalone local static red-box reference page
- Modify if needed: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/router/index.ts`
  - Responsibility: hidden standalone route for the static reference page only

### Real homepage phase

- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  - Responsibility: apply left red-box nav and upper chooser visuals to the real home page
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  - Responsibility: real theme/dataset chooser state for the upper block
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
  - Responsibility: context messaging and later multi-dataset clarification card
- Optional create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewDatasetClarificationCard.vue`
  - Responsibility: inline clarification card

## Task 1: Capture Redbox-Focused Baselines

**Files:**
- Modify: none
- Output:
  - `/tmp/sqlbot-home-layout-calicat-nav-80.png`
  - `/tmp/sqlbot-home-layout-calicat-chooser-80.png`
  - `/tmp/sqlbot-home-layout-live-before.png`

- [ ] **Step 1: Capture readable Calicat red-box references**

Run:

```bash
agent-browser close --all
agent-browser --profile Default open 'https://www.calicat.cn/design/2043250442777505792?node-id=0e162c76-e133-4e44-b9db-bcda0883bb82&node-type=group'
agent-browser wait 2000
agent-browser screenshot /tmp/sqlbot-home-layout-calicat-nav-80.png

agent-browser open 'https://www.calicat.cn/design/2043250442777505792?node-id=bd513881-da3f-4aec-abf6-2d25f65f9118&node-type=group'
agent-browser wait 2000
agent-browser screenshot /tmp/sqlbot-home-layout-calicat-chooser-80.png
```

- [ ] **Step 2: Capture current live home baseline**

Run:

```bash
agent-browser --profile Default open 'http://localhost:8080/#/sqlbotnew'
agent-browser wait 3000
agent-browser screenshot /tmp/sqlbot-home-layout-live-before.png
```

- [ ] **Step 3: Lock the exact in-scope checklist**

Checklist:

```text
Only align the red-box regions:
- left menu card area
- upper analysis-theme/dataset chooser block

Do not require 1:1 on:
- top global blue header
- lower ask card
- recommendation chips
```

## Task 2: Create The Static Redbox Reference Page

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-home-prototype/index.vue`
- Modify if needed: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/router/index.ts`

- [ ] **Step 1: Keep `/sqlbot-home-prototype` as a standalone hidden route**

Required:

```text
- no shared layout shell
- no global app chrome forced in by the route
```

- [ ] **Step 2: Reduce the static page scope to only the red-box regions**

The static page should render:

```text
Left red box:
- intelligent-q&a product card (only if it visually belongs to the red-box column)
- menu card with 小星问数 / 小星报告 / 小星搭建 / 历史对话
- recent-history block only if it visually belongs to the left red-box composition

Upper red box:
- analysis-theme tabs with 全部 first
- 数据集 / 数据文件 / 试用
- dataset cards grid
- 查看全部可用数据 card
```

The static page should NOT try to perfectly rebuild the entire home page anymore.

- [ ] **Step 3: Make the static page visually align the two red boxes**

Focus on:

```text
- card width and height
- radius and shadow
- internal spacing
- title sizes
- theme pill spacing
- dataset card grid density
- plus/dataset/file/right-side button positioning inside the upper block
```

- [ ] **Step 4: Capture the static reference screenshot**

Run:

```bash
./dataease-web.sh
agent-browser close --all
agent-browser open 'http://localhost:8080/#/sqlbot-home-prototype'
agent-browser wait 3000
agent-browser screenshot /tmp/sqlbot-home-prototype-reference-approved.png
```

Expected: this screenshot shows only the red-box-aligned static reference page.

## Task 3: Validate The Static Redbox Reference Page

**Files:**
- Modify: none

- [ ] **Step 1: Compare the static page only against the marked red-box regions**

Checklist:

```text
Left menu card:
- width and vertical rhythm
- active row background and icon alignment
- menu item spacing

Upper chooser block:
- block width and placement
- tab row spacing
- dataset/file/trial alignment
- dataset grid layout
- view-all card placement
```

- [ ] **Step 2: Make one focused correction pass on the static page if needed**

Allowed file:

```text
- sqlbot-home-prototype/index.vue
```

## Task 4: Apply The Approved Left Red Box To The Real Home Page

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Rebuild the left menu card to match the approved static reference**

Required behavior:

```text
- 小星问数 active and real
- 小星报告 clickable visual state only
- 小星搭建 clickable visual state only
- 历史对话 keeps existing real behavior
```

- [ ] **Step 2: Keep lower ask area and lower recommendations untouched in this task**

## Task 5: Apply The Approved Upper Chooser Block To The Real Home Page

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`

- [ ] **Step 1: Replace the placeholder chooser shell with the approved static reference structure**

Required behavior:

```text
- 全部 first
- theme pills after 全部
- 数据集 / 数据文件
- dataset cards grid
```

- [ ] **Step 2: Keep lower ask area present below the chooser**

## Task 6: Add The In-Chat Multi-Dataset Clarification Card

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Optional create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewDatasetClarificationCard.vue`

- [ ] **Step 1: Add inline card when the current scope matches multiple datasets**

## Task 7: Restore History Context Into The New Home Layout

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: Mirror restored history state into the chooser**

## Task 8: Final Regression And Delivery Evidence

**Files:**
- Modify: none
- Output:
  - `/tmp/sqlbot-home-prototype-reference-approved.png`
  - `/tmp/sqlbot-home-layout-real-after-task4.png`
  - `/tmp/sqlbot-home-chooser-after-task5.png`
  - `/tmp/sqlbot-home-clarification-card-after-task6.png`
  - `/tmp/sqlbot-home-history-restore-after-task7.png`

- [ ] **Step 1: Validate the final acceptance checklist**

Checklist:

```text
- static page aligns the red-box regions only
- real home left menu card aligns the left red box
- real home upper chooser aligns the upper red box
- lower ask area remains
- multi-dataset clarification card works later in chat flow
- history restore syncs chooser state
```

## Self-Review

### Spec Coverage

- Red-box-only static reference phase: covered by Tasks 1 through 3
- Real left menu card: covered by Task 4
- Real upper chooser block: covered by Task 5
- Clarification card: covered by Task 6
- History restore: covered by Task 7
- Final evidence: covered by Task 8

### Placeholder Scan

- No `TODO`/`TBD`
- Task order now matches the corrected scope: red boxes first, whole-home behavior later

### Type Consistency

- Real homepage logic remains centered on `sqlbot-new`
- Static page remains isolated as visual reference only

## Execution Handoff

Plan complete and saved to `/Users/chenliyong/AI/github/StarBI/dataease/docs/superpowers/plans/2026-04-22-sqlbot-home-redbox-alignment-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session task-by-task

Which approach?*** End Patch
