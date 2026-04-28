# SQLBot Home Analysis Theme Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the intelligent Q&A home page so it uses a left navigation + analysis-theme dataset selection layout, while preserving the existing question/answer flow and adding an in-chat multi-dataset clarification card when the current theme scope hits multiple datasets.

**Architecture:** Keep the existing `sqlbot-new` route and conversation engine. Introduce a layout-focused home structure on top of the current page, move the current selection entrypoint into an upper “analysis theme / dataset selection” area, and add a chat-stream clarification card that reuses the existing selection and conversation state rather than creating a second execution path.

**Tech Stack:** Vue 3, Vite, Element Plus Secondary, existing `sqlbot-new` composables, agent-browser for browser verification

**Execution Note:** The user explicitly forbids git operations in this workspace. Do not add, commit, amend, reset, checkout, or otherwise use git during execution of this plan.

---

## File Structure

- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
  - Responsibility: home page layout, left navigation, upper selection area, lower retained ask area, clarification card placement
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  - Responsibility: theme tabs, selected theme/dataset/file state, home selection area data, clarification-card option sources
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
  - Responsibility: page title/subtitle, ask-context text, clarification-card insertion, continue-analysis flow after dataset selection
- Modify if needed: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts`
  - Responsibility: typed data for new nav items / clarification records if existing types are insufficient
- Optional create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewHomeNav.vue`
  - Responsibility: left vertical home nav only
- Optional create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewThemeDatasetChooser.vue`
  - Responsibility: upper analysis theme / dataset selection area only
- Optional create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewDatasetClarificationCard.vue`
  - Responsibility: in-chat multi-dataset clarification card only

## Task 1: Capture Current Home Baseline And Lock Scope

**Files:**
- Modify: none
- Reference:  
  - `https://www.calicat.cn/design/2043250442777505792?node-id=0e162c76-e133-4e44-b9db-bcda0883bb82&node-type=group`
  - `https://www.calicat.cn/design/2043250442777505792?node-id=bd513881-da3f-4aec-abf6-2d25f65f9118&node-type=group`

- [ ] **Step 1: Capture the two Calicat reference screenshots for the home layout**

Run:

```bash
agent-browser close --all
agent-browser --profile Default open 'https://www.calicat.cn/design/2043250442777505792?node-id=0e162c76-e133-4e44-b9db-bcda0883bb82&node-type=group'
agent-browser wait 3000
agent-browser screenshot /tmp/sqlbot-home-layout-calicat-nav.png

agent-browser open 'https://www.calicat.cn/design/2043250442777505792?node-id=bd513881-da3f-4aec-abf6-2d25f65f9118&node-type=group'
agent-browser wait 3000
agent-browser screenshot /tmp/sqlbot-home-layout-calicat-chooser.png
```

- [ ] **Step 2: Capture the current live home page baseline**

Run:

```bash
agent-browser open 'http://localhost:8080/#/sqlbotnew'
agent-browser wait 3000
agent-browser screenshot /tmp/sqlbot-home-layout-live-before.png
```

- [ ] **Step 3: Lock the exact in-scope home behavior**

Use this checklist:

```text
- remove top-level ask/report/build tab strip
- add left vertical menu only for the home page
- 小星问数 active and real
- 小星报告 / 小星搭建 clickable visual states only, no real page switch
- 历史对话 keeps existing behavior
- upper main area becomes theme/dataset chooser
- lower ask area and recommended questions remain
- add in-chat multi-dataset clarification card for current theme/all scope
```

## Task 2: Restructure The Home Page Layout

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Locate and remove the old top ask/report/build switching strip from the home layout**

Target result:

```vue
<!-- old horizontal switch strip removed from the home page shell -->
```

- [ ] **Step 2: Introduce the new left-nav + right-content skeleton**

Target structure:

```vue
<section class="sqlbot-home-shell">
  <aside class="sqlbot-home-side">
    <!-- product card -->
    <!-- left vertical nav -->
    <!-- recent/history area -->
  </aside>

  <main class="sqlbot-home-main">
    <section class="sqlbot-home-chooser">
      <!-- analysis theme + dataset chooser -->
    </section>

    <section class="sqlbot-home-chat-entry">
      <!-- existing ask area -->
    </section>

    <section class="sqlbot-home-recommendations">
      <!-- existing recommended questions -->
    </section>
  </main>
</section>
```

- [ ] **Step 3: Preserve all current lower-page question-entry blocks in place under the new chooser**

Run:

```bash
./dataease-web.sh
agent-browser close --all
agent-browser open 'http://localhost:8080/#/sqlbotnew'
agent-browser wait 3000
agent-browser screenshot /tmp/sqlbot-home-layout-after-task2.png
```

Expected: page now has left-nav skeleton and upper chooser placeholder while lower ask area still exists.

## Task 3: Add The Left Vertical Navigation

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Optional create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewHomeNav.vue`

- [ ] **Step 1: Define the four left-nav items**

Required items:

```ts
const homeNavItems = [
  { key: 'qa', label: '小星问数', interactive: true },
  { key: 'report', label: '小星报告', interactive: false },
  { key: 'build', label: '小星搭建', interactive: false },
  { key: 'history', label: '历史对话', interactive: true }
]
```

- [ ] **Step 2: Make only `小星问数` and `历史对话` carry real behavior**

Rules:

```text
- 小星问数: active by default, shows full home content
- 小星报告: only visual active state on click, does not switch route or replace main content
- 小星搭建: only visual active state on click, does not switch route or replace main content
- 历史对话: continue using the existing history panel / history interactions
```

- [ ] **Step 3: Style the nav to match the Calicat left column reference**

Target:

```text
- compact vertical item list
- active blue highlight for 小星问数
- icon + label alignment
- no real page navigation for report/build
```

- [ ] **Step 4: Verify the left nav on the live page**

Run:

```bash
agent-browser open 'http://localhost:8080/#/sqlbotnew'
agent-browser wait 3000
agent-browser screenshot /tmp/sqlbot-home-left-nav-after-task3.png
```

Expected: left nav visually matches the Calicat nav pattern and report/build do not switch real pages.

## Task 4: Build The Analysis Theme + Dataset Chooser Area

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Optional create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewThemeDatasetChooser.vue`

- [ ] **Step 1: Add the upper chooser area with `全部` first**

Target behavior:

```text
- default selected theme context = 全部
- themes listed after 全部
- one active context at a time
```

- [ ] **Step 2: Preserve the dataset/file mode switch**

Target behavior:

```text
- dataset mode and file mode both remain available
- chooser cards update based on current mode and selected theme
```

- [ ] **Step 3: Show only theme-scoped datasets when a theme is active**

Rules:

```text
- 全部: show cross-theme available datasets
- 具体主题: show only datasets bound to that theme
- if selected dataset is not in the next theme, clear it when switching theme
```

- [ ] **Step 4: Keep the lower ask area synchronized with chooser state**

Rules:

```text
- no dataset selected: ask area still visible with guidance copy
- theme selected, no dataset selected: ask area has theme-only context
- dataset selected: ask area has theme + dataset context
```

- [ ] **Step 5: Verify the chooser area visually**

Run:

```bash
agent-browser open 'http://localhost:8080/#/sqlbotnew'
agent-browser wait 3000
agent-browser screenshot /tmp/sqlbot-home-chooser-after-task4.png
```

Expected: upper chooser matches the Calicat chooser reference while lower ask area remains present.

## Task 5: Add The In-Chat Multi-Dataset Clarification Card

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Optional create: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotNewDatasetClarificationCard.vue`

- [ ] **Step 1: Define the trigger condition**

Required trigger:

```text
when current scope = 全部 or one analysis theme
and the user question matches multiple candidate datasets
and the conversation has not already been narrowed to one dataset
then insert clarification card
```

- [ ] **Step 2: Implement the card as a chat-stream record, not a modal**

Required card content:

```text
- clarification message
- multiple dataset options with checkbox selection
- continue-analysis action
```

- [ ] **Step 3: Allow selecting 1 or more datasets**

Required continuation behavior:

```text
- if user confirms selected datasets
- use those selected datasets as current execution context
- continue the same question flow
```

- [ ] **Step 4: Respect explicit dataset selection from the upper chooser**

Rules:

```text
- if homepage already selected one concrete dataset, normally do not trigger clarification card
- clarification card is mainly for 全部 / theme-only contexts
```

- [ ] **Step 5: Verify clarification card insertion**

Run:

```bash
agent-browser open 'http://localhost:8080/#/sqlbotnew'
agent-browser wait 3000
# exercise a prompt that triggers multiple datasets in current scope
# capture result
agent-browser screenshot /tmp/sqlbot-home-clarification-card-after-task5.png
```

Expected: clarification appears inline in the conversation flow instead of using a modal.

## Task 6: Restore History Context Into The New Home Layout

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`

- [ ] **Step 1: When a history session is reopened, restore theme/dataset chooser state**

Required behavior:

```text
- if the saved session had theme context, restore active theme tab
- if the saved session had selected dataset/file, restore chooser selected item
```

- [ ] **Step 2: Do not break current history restore flow**

Required guard:

```text
- existing conversation restoration remains the source of truth
- new chooser UI only mirrors restored state
```

- [ ] **Step 3: Verify with an existing history session**

Run:

```bash
agent-browser open 'http://localhost:8080/#/sqlbotnew'
agent-browser wait 3000
# open a history session if present
agent-browser screenshot /tmp/sqlbot-home-history-restore-after-task6.png
```

Expected: chooser state and chat state are synchronized after history restore.

## Task 7: Final Regression And Delivery Evidence

**Files:**
- Modify: none
- Output screenshots:
  - `/tmp/sqlbot-home-layout-after-task2.png`
  - `/tmp/sqlbot-home-left-nav-after-task3.png`
  - `/tmp/sqlbot-home-chooser-after-task4.png`
  - `/tmp/sqlbot-home-clarification-card-after-task5.png`
  - `/tmp/sqlbot-home-history-restore-after-task6.png`

- [ ] **Step 1: Restart only the touched frontend**

Run:

```bash
./dataease-web.sh
```

- [ ] **Step 2: Capture final home page evidence**

Run:

```bash
agent-browser close --all
agent-browser open 'http://localhost:8080/#/sqlbotnew'
agent-browser wait 3000
agent-browser screenshot /tmp/sqlbot-home-final.png
```

- [ ] **Step 3: Verify the final acceptance checklist**

Checklist:

```text
- top ask/report/build strip removed
- left nav present and visually matches reference
- 小星问数 active and real
- 报告/搭建 not switching real pages
- history still works
- upper chooser has 全部 + themes + dataset/file switch
- lower ask area preserved
- inline multi-dataset clarification card appears in the right scenario
- history restore syncs chooser state
```

## Self-Review

### Spec Coverage

- Home layout restructure: covered by Tasks 2 through 4
- Left nav behavior: covered by Task 3
- Analysis theme + dataset chooser: covered by Task 4
- In-chat multi-dataset clarification card: covered by Task 5
- History restore synchronization: covered by Task 6
- Final end-to-end evidence: covered by Task 7

### Placeholder Scan

- No `TODO`/`TBD`
- Each task has exact file paths, exact expected behavior, and exact verification commands
- No “similar to previous task” shortcuts

### Type Consistency

- Home layout work consistently targets `sqlbot-new` page/composables/components
- Clarification card is consistently defined as an inline chat record rather than a modal/drawer

## Execution Handoff

Plan complete and saved to `/Users/chenliyong/AI/github/StarBI/dataease/docs/superpowers/plans/2026-04-22-sqlbot-home-analysis-theme-layout-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session task-by-task

Which approach?*** End Patch
