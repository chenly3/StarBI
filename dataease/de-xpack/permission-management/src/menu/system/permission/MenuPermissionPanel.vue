<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from './useHostRoute'
import { usePermissionShellStore } from './store'
import {
  PERMISSION_COLUMN_DEFINITIONS
} from './types'
import type {
  PermissionColumnKey,
  PermissionSubjectOption,
  PermissionSubjectType,
  PermissionTreeRow
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
const selectedMenuGroupId = ref<number | null>(null)

const normalizeKeyword = (value: string) => value.trim().toLowerCase()

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

const panelState = computed(() => shell.menuPanel.value)

const topGroups = computed(() => panelState.value.tree || [])

const findSelectedGroupIds = (
  nodes: PermissionTreeRow[],
  selectedId: number | null
): Set<number> | null => {
  if (selectedId == null) {
    return null
  }
  const selectedIndex = nodes.findIndex(row => row.id === selectedId)
  if (selectedIndex < 0) {
    return null
  }
  const selectedLevel = nodes[selectedIndex].level
  const ids = new Set<number>()
  for (let index = selectedIndex; index < nodes.length; index += 1) {
    const row = nodes[index]
    if (index > selectedIndex && row.level <= selectedLevel) {
      break
    }
    ids.add(row.id)
  }
  return ids
}

const selectedResourceName = computed(() => {
  const findName = (rows: PermissionTreeRow[], id: number | null): string => {
    if (id == null) {
      return ''
    }
    const target = rows.find(row => row.id === id)
    return target?.name || ''
  }
  return findName(panelState.value.rows, shell.selectedResourceId.value)
})

const rows = computed(() => panelState.value.rows || [])
const selectedMenuRows = computed(() => {
  const ids = findSelectedGroupIds(rows.value, selectedMenuGroupId.value)
  return ids ? rows.value.filter(row => ids.has(row.id)) : rows.value
})
const originRows = computed(() => panelState.value.originRows || [])
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
    return selectedMenuRows.value
  }
  return selectedMenuRows.value.filter(row => row.name.toLowerCase().includes(keyword))
})
const visibleOriginRows = computed(() => {
  const keyword = normalizeKeyword(originKeyword.value)
  if (!keyword) {
    return originRows.value
  }
  return originRows.value.filter(row => row.name.toLowerCase().includes(keyword))
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

const selectResource = async (resourceId: number) => {
  if (shell.selectedResourceId.value === resourceId) {
    return
  }
  await shell.setSelectedResourceId(resourceId)
}

const selectMenuGroup = (resourceId: number | null) => {
  selectedMenuGroupId.value = resourceId
}

const toggleRow = (resourceId: number, permissionKey: PermissionColumnKey) => {
  shell.toggleTreePermission('menu', resourceId, permissionKey)
}

const toggleOrigin = (subjectId: number, permissionKey: PermissionColumnKey) => {
  shell.toggleOriginPermission('menu', subjectId, permissionKey)
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
          <div class="panel__toolbar">
            <div class="tab-row">
              <template v-if="shell.mode.value === 'by-user'">
                <button type="button" class="tab-row__item is-active">菜单权限</button>
                <button type="button" class="tab-row__item" @click="openTab('resource')">
                  资源权限
                </button>
                <button
                  type="button"
                  class="tab-row__item"
                  :class="{ 'is-active': shell.subjectType.value === 'user' }"
                  @click="setSubjectType('user')"
                >
                  用户
                </button>
                <button
                  type="button"
                  class="tab-row__item"
                  :class="{ 'is-active': shell.subjectType.value === 'role' }"
                  @click="setSubjectType('role')"
                >
                  角色
                </button>
              </template>
              <template v-else>
                <button type="button" class="tab-row__item is-active">菜单权限</button>
                <button type="button" class="tab-row__item" @click="openTab('resource')">
                  资源权限
                </button>
              </template>
            </div>
            <div class="panel__section-title">菜单权限</div>
            <label class="search-box">
              <span>⌕</span>
              <input v-model.trim="resourceKeyword" type="search" placeholder="搜索菜单名称" />
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

          <div v-if="shell.mode.value === 'by-user'" class="panel__body panel__body--user">
            <div class="column column--subjects">
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

            <div class="column column--groups">
              <button
                type="button"
                class="group-item"
                :class="{ 'is-active': selectedMenuGroupId === null }"
                @click="selectMenuGroup(null)"
              >
                全部菜单
              </button>
              <button
                v-for="group in topGroups"
                :key="group.id"
                type="button"
                class="group-item"
                :class="{ 'is-active': selectedMenuGroupId === group.id }"
                @click="selectMenuGroup(group.id)"
              >
                {{ group.name }}
              </button>
            </div>

            <div class="column column--table">
              <div class="table-card">
                <div class="table-card__head">
                  <span class="name-col">资源名称</span>
                  <span v-for="column in permissionColumns" :key="column.key">{{ column.label }}</span>
                </div>
                <div v-for="row in visibleRows" :key="row.id" class="table-card__row">
                  <div class="name-col name-cell" :style="{ paddingLeft: `${20 + row.level * 22}px` }">
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
            <div class="column column--groups">
              <button
                v-for="group in topGroups"
                :key="group.id"
                type="button"
                class="group-item"
                :class="{ 'is-active': shell.selectedResourceId.value === group.id }"
                @click="selectResource(group.id)"
              >
                {{ group.name }}
              </button>
            </div>
            <div class="column column--tree">
              <div class="tree-box">
                <span class="tree-arrow">⌄</span>
                <span class="node-icon"></span>
                <span>{{ selectedResourceName || '请选择资源' }}</span>
              </div>
            </div>
            <div class="column column--table">
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
  color: #0f172a;
  font-size: 22px;
  line-height: 30px;
  font-weight: 700;
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
  box-sizing: border-box;
  border: 1px solid #dde7f5;
  border-radius: 12px;
  background: #ffffff;
}

.switch-row__item {
  height: 34px;
  min-width: 112px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #6b7280;
  font-size: 15px;
  font-weight: 600;
}
.switch-row__item.is-active {
  color: #2f6bff;
  font-weight: 700;
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

.panel__toolbar {
  display: grid;
  grid-template-columns: minmax(260px, max-content) minmax(220px, 1fr) 88px;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px;
  border: 1px solid #e7edf7;
  border-radius: 12px;
  background: #f8fbff;
}

.tab-row {
  display: inline-flex;
  gap: 12px;
  padding-left: 0;
  flex-wrap: wrap;
}

.tab-row__item {
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #667085;
  font-size: 15px;
  font-weight: 600;
}
.tab-row__item.is-active {
  color: #2f6bff;
  background: #eef4ff;
}
.panel__section-title {
  display: none;
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
  margin-bottom: 14px;
}

.search-box--full {
  width: 100%;
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

.save-btn--active { background: #2f6bff; }

.panel__body {
  display: grid;
  gap: 12px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel__body--user {
  grid-template-columns: minmax(204px, 240px) minmax(150px, 168px) minmax(0, 1fr);
}

.panel__body--resource {
  grid-template-columns: minmax(178px, 210px) minmax(190px, 228px) minmax(0, 1fr);
}

.column--table,
.table-card {
  min-width: 0;
}

.column--table {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.column--subjects,
.column--groups,
.column--tree {
  min-width: 0;
  min-height: 0;
  padding: 12px;
  border: 1px solid #e7edf7;
  border-radius: 12px;
  background: #fbfcff;
  box-sizing: border-box;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-card {
  border: 1px solid #dfe7f3;
  border-radius: 12px;
  overflow: auto;
  background: #ffffff;
  flex: 1 1 auto;
  min-height: 0;
}

.list-card__item {
  width: 100%;
  border: none;
  text-align: left;
  min-height: 44px;
  padding: 6px 14px;
  color: #344054;
  background: #fff;
  font-size: 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}
.list-card__item + .list-card__item {
  border-top: 1px solid #eef2f7;
}
.list-card__item.is-active { background: #eaf2ff; color: #2f6bff; font-weight: 600; }

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

.group-item {
  width: 100%;
  border: none;
  text-align: left;
  height: 40px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  border-radius: 10px;
  color: #344054;
  background: transparent;
  font-size: 15px;
}
.group-item + .group-item {
  margin-top: 4px;
}
.group-item.is-active { background: #eaf2ff; color: #2f6bff; font-weight: 600; }

.tree-box {
  height: 44px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 10px;
  background: #eaf2ff;
  color: #2f6bff;
  font-size: 15px;
  font-weight: 600;
}

.tree-arrow { color: #344054; font-size: 12px; }
.tree-arrow.hidden { visibility: hidden; }
.node-icon { width: 14px; height: 10px; border: 1.5px solid #f4b100; border-radius: 2px; background: #ffd76a; display: inline-block; }
.node-icon.file { border-color: #6b7280; background: #e5e7eb; }

.table-card {
  border: 1px solid #dfe7f3;
  border-radius: 12px;
  overflow: auto;
  background: #ffffff;
  flex: 1 1 auto;
  min-height: 0;
  box-shadow: none;
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
  border: 1px solid #c7d0e0;
  border-radius: 4px;
  background: #fff;
}

.checkbox.is-checked {
  border-color: #2f6bff;
  background: linear-gradient(180deg, #4284ff 0%, #2f6bff 100%);
}

@media (max-width: 1480px) {
  .panel__toolbar {
    grid-template-columns: minmax(260px, max-content) minmax(220px, 1fr) 88px;
    gap: 14px;
  }

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

  .panel__toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'tabs save'
      'title search';
    align-items: center;
  }

  .tab-row {
    grid-area: tabs;
    padding-left: 0;
  }

  .panel__section-title {
    grid-area: title;
    display: none;
  }

  .panel__toolbar > .search-box {
    grid-area: search;
  }

  .panel__toolbar > .save-btn {
    grid-area: save;
    justify-self: end;
  }

  .panel__body--user,
  .panel__body--resource {
    grid-template-columns: minmax(180px, 220px) minmax(180px, 220px);
    overflow: visible;
  }

  .panel__body--user .column--table,
  .panel__body--resource .column--table {
    grid-column: 1 / -1;
  }

  .table-card__head,
  .table-card__row {
    grid-template-columns: minmax(220px, 1fr) repeat(4, 88px);
  }
}
</style>
