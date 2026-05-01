<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import OrgDeleteDialog from './components/OrgDeleteDialog.vue'
import OrgEditDialog from './components/OrgEditDialog.vue'
import OrgFormDialog from './components/OrgFormDialog.vue'
import { useOrgManagementPage } from './composables/useOrgManagementPage'
import '@/views/system/shared/system-setting-page.less'

const page = useOrgManagementPage()

const hasTable = computed(() => page.tableRows.value.length > 0)
let searchTimer: number | undefined

const formatDate = (value?: number | string) => {
  if (value === undefined || value === null || value === '') {
    return '--'
  }
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) {
    return '--'
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const handleSearch = async () => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = undefined
  }
  await page.search()
}

const scheduleSearch = () => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }
  searchTimer = window.setTimeout(() => {
    void handleSearch()
  }, 300)
}

onBeforeUnmount(() => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }
})

const handleResetSearch = async () => {
  await page.clearSearch()
}

</script>

<template>
  <main class="system-setting-page system-setting-standard org-management-page">
    <section class="system-setting-page__content org-management-content">
      <header class="system-setting-page__title-row org-page__header">
        <h1 class="system-setting-page__title">组织管理</h1>
        <section class="org-toolbar">
          <button type="button" class="org-add-button" @click="page.openAddDialog">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M7.333 3.333a.667.667 0 1 1 1.334 0v4h4a.667.667 0 1 1 0 1.334h-4v4a.667.667 0 1 1-1.334 0v-4h-4a.667.667 0 1 1 0-1.334h4v-4Z"
                fill="currentColor"
              />
            </svg>
            <span>添加</span>
          </button>

          <div class="org-toolbar__search">
            <label class="org-search">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M7 2.667a4.333 4.333 0 1 0 0 8.666A4.333 4.333 0 0 0 7 2.667Zm-5.667 4.333a5.667 5.667 0 1 1 10.24 3.35l2.52 2.52a.667.667 0 0 1-.943.943l-2.52-2.52A5.667 5.667 0 0 1 1.333 7Z"
                  fill="currentColor"
                />
              </svg>
              <input
                v-model="page.keyword.value"
                type="text"
                maxlength="20"
                placeholder="请输入名称搜索"
                @input="scheduleSearch"
                @keyup.enter="handleSearch"
              />
            </label>
            <button
              v-if="page.keyword.value || page.searchEmpty.value"
              type="button"
              class="org-search__clear"
              @click="handleResetSearch"
            >
              重置
            </button>
          </div>
        </section>
      </header>

      <section class="org-table-panel">
        <div v-if="page.loading.value" class="org-empty">加载中...</div>

        <table v-else-if="hasTable" class="org-table">
          <thead>
            <tr>
              <th class="org-col org-col--name">组织名称</th>
              <th class="org-col org-col--count">下属组织数</th>
              <th class="org-col org-col--time">创建时间</th>
              <th class="org-col org-col--actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in page.tableRows.value" :key="row.id">
              <td class="org-col org-col--name">
                <div class="org-name-cell">
                  <span v-if="row.depth > 0" class="org-tree-guides" aria-hidden="true">
                    <span
                      v-for="(hasNextSibling, guideIndex) in row.ancestorHasNextSibling"
                      :key="`${row.id}-ancestor-${guideIndex}`"
                      class="org-tree-guide"
                      :class="{ 'has-line': hasNextSibling }"
                    ></span>
                    <span
                      class="org-tree-guide org-tree-guide--branch"
                      :class="{ 'is-last': row.isLastSibling }"
                    ></span>
                  </span>
                  <button
                    v-if="row.hasChildren"
                    type="button"
                    class="org-expand-button"
                    :title="row.expanded ? '收起子组织' : '展开子组织'"
                    @click="page.toggleExpanded(row.id)"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                      :class="{ 'is-expanded': row.expanded }"
                    >
                      <path
                        d="M6.47 4.97a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06L8.94 8.5 6.47 6.03a.75.75 0 0 1 0-1.06Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <span v-else class="org-expand-placeholder" aria-hidden="true"></span>
                  <span class="org-name-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16">
                      <path
                        d="M2.667 3.333c0-.736.597-1.333 1.333-1.333h2.19c.354 0 .693.14.943.39l.781.781c.25.25.589.39.943.39h3.143c.736 0 1.333.597 1.333 1.333v6.44c0 .736-.597 1.333-1.333 1.333H4c-.736 0-1.333-.597-1.333-1.333v-8Z"
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.2"
                      />
                    </svg>
                  </span>
                  <span class="org-name-text">{{ row.name }}</span>
                </div>
              </td>
              <td class="org-col org-col--count">{{ row.childCount }}</td>
              <td class="org-col org-col--time">{{ formatDate(row.createTime) }}</td>
              <td class="org-col org-col--actions">
                <div class="org-row-actions">
                  <button type="button" title="编辑组织" @click="page.openEditDialog(row)">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        d="m10.907 2.267 2.826 2.826-7.04 7.04a1.333 1.333 0 0 1-.566.33l-2.11.602.602-2.11c.06-.21.173-.402.33-.566l6.958-6.958Zm1.886-.943a1.333 1.333 0 0 1 1.883 1.886l-.471.47-2.826-2.825.47-.471a1.333 1.333 0 0 1 .944-.39Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button
                    v-if="!row.readOnly"
                    type="button"
                    title="删除组织"
                    @click="page.requestDelete(row)"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        d="M6.667 2h2.666a1 1 0 0 1 1 1v.333h2a.667.667 0 1 1 0 1.334h-.666v7a1.333 1.333 0 0 1-1.334 1.333H5.667a1.333 1.333 0 0 1-1.334-1.333v-7h-.666a.667.667 0 1 1 0-1.334h2V3a1 1 0 0 1 1-1Zm2.333 2.667a.667.667 0 1 0-1.333 0V10a.667.667 0 1 0 1.333 0V4.667Zm-2.666 0A.667.667 0 0 0 5 4.667V10a.667.667 0 1 0 1.333 0V4.667Zm5.333 0a.667.667 0 1 0-1.334 0V10a.667.667 0 1 0 1.334 0V4.667Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="org-empty">{{ page.emptyMessage.value }}</div>
      </section>
    </section>

    <OrgFormDialog
      :visible="page.addDialogVisible.value"
      :model-value="page.form"
      :submitting="page.submitting.value"
      :parent-locked="page.addParentLocked.value"
      :parent-options="page.parentOptions.value"
      @save="page.submitCreate"
      @cancel="page.closeAddDialog"
    />
    <OrgEditDialog
      :visible="page.editDialogVisible.value"
      :model-value="page.form"
      :submitting="page.submitting.value"
      @save="page.submitEdit"
      @cancel="page.closeEditDialog"
    />
    <OrgDeleteDialog
      :visible="page.deleteDialogVisible.value"
      :row="page.activeDeleteRow.value"
      :deleting="page.deleting.value"
      @confirm="page.confirmDelete"
      @cancel="page.closeDeleteDialog"
    />
    <OrgDeleteDialog
      :visible="page.deleteBlockerVisible.value"
      :row="null"
      :deleting="false"
      mode="blocked"
      :message="page.deleteBlockerMessage.value"
      @confirm="page.closeDeleteBlocker"
      @cancel="page.closeDeleteBlocker"
    />
  </main>
</template>

<style scoped>
.org-management-page {
  display: flex;
  height: 100%;
  min-height: 0;
  background: transparent;
  box-sizing: border-box;
  overflow: hidden;
}

.org-management-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.org-page__header h1 {
  margin: 0;
}

.org-toolbar {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0;
}

.org-toolbar__search {
  display: flex;
  align-items: center;
  gap: 12px;
}

.org-add-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--system-control-height);
  padding: 0 18px;
  border: none;
  border-radius: 10px;
  background: #3370ff;
  color: #ffffff;
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
  cursor: pointer;
}

.org-add-button svg {
  width: 14px;
  height: 14px;
}

.org-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 240px;
  min-height: var(--system-control-height);
  padding: 0 14px;
  border: 1px solid #cfd8e8;
  border-radius: 10px;
  background: #ffffff;
  box-sizing: border-box;
  color: #9ca3af;
}

.org-search svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.org-search input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 15px;
  line-height: 22px;
  color: #111827;
  outline: none;
}

.org-search input::placeholder {
  color: #9ca3af;
}

.org-search__clear {
  border: none;
  background: transparent;
  padding: 0;
  color: #64748b;
  font-size: 15px;
  line-height: 22px;
  cursor: pointer;
}

.org-table-panel {
  margin-top: 0;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  border: 1px solid #dde6f2;
  border-radius: 14px;
  background: #ffffff;
  overflow-x: auto;
  overflow-y: auto;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
}

.org-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
  table-layout: fixed;
}

.org-table thead th {
  height: 52px;
  padding: 0 18px;
  border-bottom: 1px solid #eef2f6;
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
  color: #243047;
  text-align: left;
  white-space: nowrap;
}

.org-table tbody td {
  height: 54px;
  padding: 0 18px;
  border-top: 1px solid #f3f5f8;
  font-size: 16px;
  line-height: 24px;
  color: #27364f;
  vertical-align: middle;
}

.org-col--name {
  width: auto;
}

.org-col--count {
  width: 150px;
  text-align: center !important;
}

.org-col--time {
  width: 220px;
}

.org-col--actions {
  width: 120px;
  text-align: center !important;
}

.org-table tbody .org-col--time {
  white-space: nowrap;
}

.org-name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 52px;
  min-width: 0;
}

.org-tree-guides {
  display: inline-flex;
  align-self: stretch;
  flex: 0 0 auto;
}

.org-tree-guide {
  position: relative;
  width: 16px;
  flex: 0 0 auto;
}

.org-tree-guide.has-line::before {
  content: '';
  position: absolute;
  left: 6px;
  top: -20px;
  bottom: -20px;
  width: 1px;
  background: #eef3fb;
}

.org-tree-guide--branch::before {
  content: '';
  position: absolute;
  left: 6px;
  top: -20px;
  bottom: -20px;
  width: 1px;
  background: #eef3fb;
}

.org-tree-guide--branch::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 50%;
  width: 6px;
  height: 1px;
  background: #eef3fb;
  transform: translateY(-0.5px);
}

.org-tree-guide--branch.is-last::before {
  bottom: 50%;
}

.org-expand-button,
.org-expand-placeholder {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.org-expand-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0;
  color: #8fa1ba;
  cursor: pointer;
}

.org-expand-button svg {
  width: 13px;
  height: 13px;
  transition: transform 0.2s ease;
}

.org-expand-button svg.is-expanded {
  transform: rotate(90deg);
}

.org-name-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: #7b8798;
}

.org-name-icon svg {
  width: 14px;
  height: 14px;
}

.org-name-text {
  min-width: 0;
  color: #27364f;
  font-size: 16px;
  font-weight: 600;
}

.org-row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.org-row-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(51, 112, 255, 0.08);
  padding: 0;
  color: #3370ff;
  cursor: pointer;
}

.org-row-actions button svg {
  width: 16px;
  height: 16px;
}

.org-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  color: #94a3b8;
  font-size: 15px;
}

@media (max-width: 960px) {
  .org-management-page {
    height: auto;
    min-height: calc(100vh - 130px);
    overflow: visible;
  }

  .org-management-content {
    width: 100%;
    height: auto;
  }

  .org-toolbar {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    margin-left: 0;
  }

  .org-toolbar__search {
    width: 100%;
  }

  .org-search {
    width: 100%;
  }

  .org-table {
    min-width: 760px;
  }
}
</style>
