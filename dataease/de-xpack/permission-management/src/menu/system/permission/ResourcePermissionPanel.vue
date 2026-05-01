<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from './useHostRoute'
import { usePermissionShellStore } from './store'
import { PERMISSION_COLUMN_DEFINITIONS } from './types'
import type {
  PermissionColumnKey,
  PermissionResourceFlag,
  PermissionSubjectOption,
  PermissionSubjectType
} from './types'

const props = withDefaults(
  defineProps<{
    showPrimarySwitch?: boolean
  }>(),
  {
    showPrimarySwitch: true
  }
)

const shell = usePermissionShellStore()
const route = useRoute()
const router = useRouter()
const permissionColumns = PERMISSION_COLUMN_DEFINITIONS
const subjectKeyword = ref('')
const resourceKeyword = ref('')
const originKeyword = ref('')

const normalizeKeyword = (value: string) => value.trim().toLowerCase()

const flagLabelMap: Record<PermissionResourceFlag, string> = {
  panel: '仪表板',
  screen: '数据大屏',
  dataset: '数据集',
  datasource: '数据源'
}

const replaceView = async (mode: 'by-user' | 'by-resource', tab: 'menu' | 'resource') => {
  await router.replace({
    query: {
      ...route.query,
      sheet: mode === 'by-resource' ? 'resource' : 'user',
      mode,
      tab
    }
  })
}

const openMode = async (mode: 'by-user' | 'by-resource') => {
  const nextTab = mode === 'by-user' ? 'menu' : shell.tab.value
  await replaceView(mode, nextTab)
}

const openTab = async (tab: 'menu' | 'resource') => {
  await replaceView(shell.mode.value, tab)
}

const setSubjectType = async (type: PermissionSubjectType) => {
  if (shell.subjectType.value === type) {
    return
  }
  await shell.setSubjectType(type)
}

const panelState = computed(() => shell.resourcePanel.value)
const rows = computed(() => panelState.value.rows || [])
const originRows = computed(() => panelState.value.originRows || [])
const topLevelRows = computed(() => rows.value.filter(row => row.level === 0))
const visibleSubjects = computed(() => {
  const keyword = normalizeKeyword(subjectKeyword.value)
  if (!keyword) {
    return shell.filteredSubjects.value
  }
  return shell.filteredSubjects.value.filter(subject => {
    const name = subject.name.toLowerCase()
    const account = String(subject.account || '').toLowerCase()
    return name.includes(keyword) || account.includes(keyword)
  })
})
const visibleRows = computed(() => {
  const keyword = normalizeKeyword(resourceKeyword.value)
  if (!keyword) {
    return rows.value
  }
  return rows.value.filter(row => row.name.toLowerCase().includes(keyword))
})
const visibleTopLevelRows = computed(() => {
  const keyword = normalizeKeyword(resourceKeyword.value)
  if (!keyword) {
    return topLevelRows.value
  }
  return topLevelRows.value.filter(row => row.name.toLowerCase().includes(keyword))
})
const visibleOriginRows = computed(() => {
  const keyword = normalizeKeyword(originKeyword.value)
  if (!keyword) {
    return originRows.value
  }
  return originRows.value.filter(row => row.name.toLowerCase().includes(keyword))
})
const hasSelectedResource = computed(() => {
  return topLevelRows.value.some(row => row.id === shell.selectedResourceId.value)
})
const duplicatedSubjectNames = computed(() => {
  const counts = new Map<string, number>()
  shell.filteredSubjects.value.forEach(subject => {
    counts.set(subject.name, (counts.get(subject.name) || 0) + 1)
  })
  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
  )
})

const shouldShowSubjectAccount = (subject: PermissionSubjectOption) => {
  return Boolean(
    subject.account &&
      subject.account !== subject.name &&
      duplicatedSubjectNames.value.has(subject.name)
  )
}

const selectSubject = async (subjectId: number) => {
  if (shell.selectedSubjectId.value === subjectId) {
    return
  }
  await shell.setSelectedSubjectId(subjectId)
}

const selectFlag = async (flag: PermissionResourceFlag) => {
  if (shell.selectedFlag.value === flag) {
    return
  }
  await shell.setSelectedFlag(flag)
}

const selectResource = async (resourceId: number) => {
  if (shell.selectedResourceId.value === resourceId) {
    return
  }
  await shell.setSelectedResourceId(resourceId)
}

const toggleRow = (resourceId: number, permissionKey: PermissionColumnKey) => {
  shell.toggleTreePermission('resource', resourceId, permissionKey)
}

const toggleOrigin = (subjectId: number, permissionKey: PermissionColumnKey) => {
  shell.toggleOriginPermission('resource', subjectId, permissionKey)
}

const save = async () => {
  await shell.saveCurrentPanel()
}
</script>

<template>
  <main class="permission-page">
    <section class="permission-page__content">
      <div class="content__inner">
        <div v-if="props.showPrimarySwitch" class="switch-row">
          <button
            type="button"
            class="switch-row__item"
            :class="{ 'is-active': shell.mode.value === 'by-user' }"
            @click="openMode('by-user')"
          >
            按用户配置
          </button>
          <button
            type="button"
            class="switch-row__item"
            :class="{ 'is-active': shell.mode.value === 'by-resource' }"
            @click="openMode('by-resource')"
          >
            按资源配置
          </button>
        </div>

        <section class="panel">
          <div v-if="shell.mode.value === 'by-user'" class="panel__body panel__body--user">
            <div class="subject-panel">
              <div class="inline-tabs inline-tabs--permission">
                <button type="button" class="inline-tabs__item" @click="openTab('menu')">
                  菜单权限
                </button>
                <button type="button" class="inline-tabs__item is-active">资源权限</button>
              </div>

              <div class="inline-tabs">
                <button
                  type="button"
                  class="inline-tabs__item"
                  :class="{ 'is-active': shell.subjectType.value === 'user' }"
                  @click="setSubjectType('user')"
                >
                  用户
                </button>
                <button
                  type="button"
                  class="inline-tabs__item"
                  :class="{ 'is-active': shell.subjectType.value === 'role' }"
                  @click="setSubjectType('role')"
                >
                  角色
                </button>
              </div>

              <label class="search-box search-box--small">
                <span>⌕</span>
                <input v-model.trim="subjectKeyword" type="search" placeholder="搜索用户或账号" />
              </label>

              <div class="list-card">
                <button
                  v-for="subject in visibleSubjects"
                  :key="subject.id"
                  type="button"
                  class="list-card__item"
                  :class="{ 'is-active': shell.selectedSubjectId.value === subject.id }"
                  @click="selectSubject(subject.id)"
                >
                  <span class="subject-name">{{ subject.name }}</span>
                  <span v-if="shouldShowSubjectAccount(subject)" class="subject-account">
                    {{ subject.account }}
                  </span>
                </button>
              </div>
            </div>

            <div class="flag-panel">
              <div class="section-title">资源权限</div>
              <div class="flag-list">
                <button
                  v-for="flag in shell.resourceFlags.value"
                  :key="flag"
                  type="button"
                  class="flag-list__item"
                  :class="{ 'is-active': shell.selectedFlag.value === flag }"
                  @click="selectFlag(flag)"
                >
                  {{ flagLabelMap[flag] }}
                </button>
              </div>
            </div>

            <div class="table-panel">
              <div class="toolbar-row">
                <label class="search-box search-box--wide">
                  <span>⌕</span>
                  <input v-model.trim="resourceKeyword" type="search" placeholder="搜索资源名称" />
                </label>
                <button
                  type="button"
                  class="save-btn"
                  :class="{ 'save-btn--active': shell.dirty.value }"
                  :disabled="shell.saving.value"
                  @click="save"
                >
                  保存
                </button>
              </div>

              <div class="table-card">
                <div class="table-card__head">
                  <span class="name-col">资源名称</span>
                  <span v-for="column in permissionColumns" :key="column.key">{{ column.label }}</span>
                </div>
                <div v-for="row in visibleRows" :key="row.id" class="table-card__row">
                  <div class="name-col name-cell" :style="{ paddingLeft: `${16 + row.level * 20}px` }">
                    <span class="tree-arrow" :class="{ hidden: row.leaf }">⌄</span>
                    <span class="node-icon" :class="{ file: row.leaf }"></span>
                    <span>{{ row.name }}</span>
                  </div>
                  <button
                    v-for="column in permissionColumns"
                    :key="column.key"
                    type="button"
                    class="check-cell"
                    @click="toggleRow(row.id, column.key)"
                  >
                    <span class="checkbox" :class="{ 'is-checked': row.permissions[column.key] }"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="panel__body panel__body--resource">
            <div class="mode-panel">
              <div class="inline-tabs">
                <button type="button" class="inline-tabs__item is-active">资源权限</button>
                <button type="button" class="inline-tabs__item" @click="openTab('menu')">
                  菜单权限
                </button>
              </div>

              <div class="flag-list flag-list--resource">
                <button
                  v-for="flag in shell.resourceFlags.value"
                  :key="flag"
                  type="button"
                  class="flag-list__item"
                  :class="{ 'is-active': shell.selectedFlag.value === flag }"
                  @click="selectFlag(flag)"
                >
                  {{ flagLabelMap[flag] }}
                </button>
              </div>
            </div>

            <div class="resource-panel">
              <label class="search-box search-box--small">
                <span>⌕</span>
                <input v-model.trim="resourceKeyword" type="search" placeholder="搜索资源名称" />
              </label>

              <div class="resource-list-card">
                <button
                  v-for="row in visibleTopLevelRows"
                  :key="row.id"
                  type="button"
                  class="resource-list-card__item"
                  :class="{ 'is-active': shell.selectedResourceId.value === row.id }"
                  @click="selectResource(row.id)"
                >
                  <span class="tree-arrow">⌄</span>
                  <span class="node-icon"></span>
                  <span>{{ row.name }}</span>
                </button>
                <div v-if="!visibleTopLevelRows.length" class="resource-list-card__empty">
                  {{ resourceKeyword ? '没有匹配的资源' : '当前分类暂无资源' }}
                </div>
              </div>
            </div>

            <div v-if="hasSelectedResource" class="table-panel">
              <div class="toolbar-row toolbar-row--resource">
                <div class="inline-tabs">
                  <button
                    type="button"
                    class="inline-tabs__item"
                    :class="{ 'is-active': shell.subjectType.value === 'user' }"
                    @click="setSubjectType('user')"
                  >
                    用户
                  </button>
                  <button
                    type="button"
                    class="inline-tabs__item"
                    :class="{ 'is-active': shell.subjectType.value === 'role' }"
                    @click="setSubjectType('role')"
                  >
                    角色
                  </button>
                </div>
                <button
                  type="button"
                  class="save-btn"
                  :class="{ 'save-btn--active': shell.dirty.value }"
                  :disabled="shell.saving.value"
                  @click="save"
                >
                  保存
                </button>
              </div>

              <label class="search-box search-box--full">
                <span>⌕</span>
                <input v-model.trim="originKeyword" type="search" placeholder="搜索用户或角色" />
              </label>

              <div class="table-card">
                <div class="table-card__head">
                  <span class="name-col">名称</span>
                  <span v-for="column in permissionColumns" :key="column.key">{{ column.label }}</span>
                </div>
                <div v-for="row in visibleOriginRows" :key="row.id" class="table-card__row">
                  <div class="name-col">{{ row.name }}</div>
                  <button
                    v-for="column in permissionColumns"
                    :key="column.key"
                    type="button"
                    class="check-cell"
                    @click="toggleOrigin(row.id, column.key)"
                  >
                    <span class="checkbox" :class="{ 'is-checked': row.permissions[column.key] }"></span>
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="table-panel table-panel--empty">
              <div class="empty-state">
                <div class="empty-state__title">当前分类暂无可配置资源</div>
                <div class="empty-state__desc">
                  请切换资源类型，或先创建对应资源后再配置用户、角色权限。
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<style scoped>
.permission-page {
  min-height: 0;
  flex: 1 1 auto;
  background: transparent;
  overflow: hidden;
}

.permission-page__content {
  min-height: 0;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.permission-page__header {
  display: none;
}

.permission-page__header h1 {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  font-weight: 700;
  color: #0f172a;
}

.content__inner {
  margin-top: 0;
  width: 100%;
  max-width: 100%;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.switch-row {
  width: fit-content;
  max-width: 100%;
  margin: 0 0 10px;
  display: inline-flex;
  gap: 6px;
  padding: 3px;
  border: 1px solid #dde7f5;
  border-radius: 12px;
  background: #ffffff;
  box-sizing: border-box;
}

.switch-row__item {
  height: 34px;
  min-width: 112px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #5f6b82;
  font-size: 15px;
  font-weight: 600;
}

.switch-row__item.is-active {
  color: #2f6bff;
  background: #eef4ff;
  box-shadow: inset 0 0 0 1px #d9e6ff;
}

.panel {
  width: 100%;
  background: #ffffff;
  border: 1px solid #dde6f2;
  border-radius: 14px;
  padding: 12px;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
  overflow: hidden;
}

.panel__body {
  display: grid;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  gap: 12px;
  overflow: hidden;
}

.panel__body--user {
  grid-template-columns: minmax(204px, 240px) minmax(150px, 168px) minmax(0, 1fr);
}

.panel__body--resource {
  grid-template-columns: minmax(178px, 210px) minmax(190px, 228px) minmax(0, 1fr);
}

.table-panel,
.subject-panel,
.resource-panel,
.flag-panel,
.mode-panel {
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
}

.subject-panel,
.resource-panel,
.flag-panel,
.mode-panel {
  padding: 12px;
  border: 1px solid #e7edf7;
  border-radius: 12px;
  background: #fbfcff;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.inline-tabs {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 34px;
  flex-wrap: wrap;
}

.inline-tabs__item {
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #5f6b82;
  font-size: 15px;
  font-weight: 600;
}

.inline-tabs__item.is-active {
  color: #2f6bff;
  background: #eef4ff;
}

.subject-panel .inline-tabs,
.mode-panel .inline-tabs {
  margin-bottom: 10px;
}

.inline-tabs--permission {
  padding-bottom: 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid #edf1f7;
}

.section-title {
  height: 34px;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  color: #2f6bff;
  font-size: 15px;
  font-weight: 700;
}

.search-box {
  height: 40px;
  border: 1px solid #d7deea;
  border-radius: 10px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #98a2b3;
  font-size: 15px;
  box-sizing: border-box;
  background: #ffffff;
}

.search-box:focus-within {
  border-color: #6f99ff;
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.1);
}

.search-box input {
  width: 100%;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #26364f;
  font: inherit;
}

.search-box input::placeholder {
  color: #98a2b3;
}

.search-box--small {
  width: 100%;
}

.search-box--wide {
  width: min(100%, 420px);
}

.search-box--full {
  width: 100%;
  margin-bottom: 12px;
}

.subject-panel .search-box,
.resource-panel .search-box {
  margin-bottom: 14px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.toolbar-row--resource {
  margin-bottom: 12px;
}

.save-btn {
  height: 40px;
  min-width: 88px;
  border: none;
  border-radius: 8px;
  background: #c7ccd5;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
}

.save-btn--active {
  background: #2f6bff;
}

.list-card,
.resource-list-card {
  border: 1px solid #dfe7f3;
  border-radius: 12px;
  overflow: auto;
  background: #ffffff;
  flex: 1 1 auto;
  min-height: 0;
}

.list-card__item,
.resource-list-card__item {
  width: 100%;
  min-height: 44px;
  border: none;
  text-align: left;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #344054;
  background: #ffffff;
  font-size: 15px;
}

.list-card__item {
  align-items: flex-start;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.resource-list-card__item {
  flex-direction: row;
}

.resource-list-card__empty {
  min-height: 120px;
  padding: 28px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a95a8;
  font-size: 15px;
  line-height: 22px;
  text-align: center;
  box-sizing: border-box;
}

.table-panel--empty {
  border: 1px solid #dfe7f3;
  border-radius: 12px;
  background: #ffffff;
}

.empty-state {
  height: 100%;
  min-height: 240px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  text-align: center;
}

.empty-state__title {
  color: #344054;
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
}

.empty-state__desc {
  max-width: 360px;
  color: #7a8699;
  font-size: 15px;
  line-height: 22px;
}

.list-card__item + .list-card__item,
.resource-list-card__item + .resource-list-card__item {
  border-top: 1px solid #eef2f7;
}

.list-card__item.is-active,
.resource-list-card__item.is-active {
  background: #eaf2ff;
  color: #2f6bff;
  font-weight: 600;
}

.subject-name,
.subject-account {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subject-account {
  color: #7a8699;
  font-size: 13px;
  font-weight: 500;
}

.list-card__item.is-active .subject-account {
  color: #5d7edb;
}

.flag-list {
  display: flex;
  flex-direction: column;
}

.flag-list--resource {
  margin-top: 16px;
}

.flag-list__item {
  width: 100%;
  height: 40px;
  border: none;
  padding: 0 14px;
  display: flex;
  align-items: center;
  background: transparent;
  color: #344054;
  font-size: 15px;
  text-align: left;
  border-radius: 10px;
}
.flag-list__item + .flag-list__item {
  margin-top: 4px;
}

.flag-list__item.is-active {
  background: #eaf2ff;
  color: #2f6bff;
  font-weight: 600;
}

.tree-arrow {
  color: #344054;
  font-size: 12px;
}

.tree-arrow.hidden {
  visibility: hidden;
}

.node-icon {
  width: 14px;
  height: 10px;
  border: 1.5px solid #f4b100;
  border-radius: 2px;
  background: #ffd76a;
  display: inline-block;
}

.node-icon.file {
  border-color: #4b82f0;
  background: #4b82f0;
  border-radius: 3px;
}

.table-card {
  border: 1px solid #dfe7f3;
  border-radius: 12px;
  overflow: auto;
  background: #ffffff;
  min-width: 0;
  height: 100%;
  min-height: 0;
  box-shadow: none;
}

.table-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.table-card__head,
.table-card__row {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) repeat(4, 96px);
  align-items: center;
  min-height: 50px;
  min-width: 644px;
}

.table-card__head {
  background: #f5f8fd;
  color: #243047;
  font-size: 16px;
  font-weight: 700;
}

.table-card__row {
  border-top: 1px solid #eef2f7;
  color: #344054;
  font-size: 16px;
  line-height: 24px;
}
.table-card__row:nth-child(odd) {
  background: #fcfdff;
}

.name-col {
  padding: 0 18px;
}

.table-card__head span:not(.name-col),
.table-card__row > button {
  text-align: center;
  justify-self: stretch;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.check-cell {
  height: 100%;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.checkbox {
  width: 18px;
  height: 18px;
  border: 1px solid #d2d8e4;
  border-radius: 4px;
  background: #fff;
}

.checkbox.is-checked {
  border-color: #2f6bff;
  background: linear-gradient(180deg, #4284ff 0%, #2f6bff 100%);
}

@media (max-width: 1480px) {
  .panel__body--user {
    grid-template-columns: minmax(196px, 220px) minmax(146px, 164px) minmax(0, 1fr);
  }

  .panel__body--resource {
    grid-template-columns: minmax(170px, 196px) minmax(180px, 210px) minmax(0, 1fr);
  }

  .table-card__head,
  .table-card__row {
    grid-template-columns: minmax(240px, 1fr) repeat(4, 88px);
  }
}

@media (max-width: 1100px) {
  .switch-row {
    width: 100%;
  }

  .panel__body--user,
  .panel__body--resource {
    grid-template-columns: minmax(180px, 220px) minmax(180px, 220px);
    overflow: visible;
  }

  .table-panel {
    grid-column: 1 / -1;
  }

  .toolbar-row,
  .toolbar-row--resource {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .search-box--wide {
    width: 100%;
  }

  .table-card__head,
  .table-card__row {
    grid-template-columns: minmax(220px, 1fr) repeat(4, 88px);
  }
}
</style>
