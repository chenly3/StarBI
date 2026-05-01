<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import SystemSelect from '../../shared/SystemSelect.vue'
import type { IdType, UserOptionItem } from '../types'

const props = withDefaults(
  defineProps<{
    roleName?: string
    systemRole?: boolean
    members?: UserOptionItem[]
    total?: number
    page?: number
    pageSize?: number
    loading?: boolean
    removingMemberId?: IdType | null
    keyword?: string
  }>(),
  {
    roleName: '',
    systemRole: false,
    members: () => [],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: false,
    removingMemberId: null,
    keyword: ''
  }
)

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'remove', member: UserOptionItem): void
  (e: 'search', keyword: string): void
  (e: 'pageChange', page: number): void
  (e: 'pageSizeChange', size: number): void
}>()

const localKeyword = ref(props.keyword)
let searchTimer: number | undefined

const pageSizeOptions = [
  { label: '10条/页', value: '10' },
  { label: '20条/页', value: '20' },
  { label: '50条/页', value: '50' },
  { label: '100条/页', value: '100' }
]

const selectedPageSize = computed({
  get: () => String(props.pageSize),
  set: value => {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      emit('pageSizeChange', parsed)
    }
  }
})

watch(
  () => props.keyword,
  keyword => {
    localKeyword.value = keyword
  }
)

const onSearch = () => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = undefined
  }
  emit('search', localKeyword.value.trim())
}

const scheduleSearch = () => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }
  searchTimer = window.setTimeout(() => {
    onSearch()
  }, 300)
}

onBeforeUnmount(() => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }
})

const isRemoving = (id: IdType): boolean => {
  if (props.removingMemberId === null || props.removingMemberId === undefined) {
    return false
  }
  return String(props.removingMemberId) === String(id)
}
</script>

<template>
  <section class="role-member-table-wrap">
    <header class="role-member-table__header">
      <div class="role-member-table__title">
        <h2>{{ roleName || '角色成员' }}</h2>
        <span v-if="systemRole" class="role-member-table__type-tag">系统</span>
        <span class="role-member-table__count">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 8.4A2.7 2.7 0 1 0 8 3a2.7 2.7 0 0 0 0 5.4Zm0 1.2c-2.7 0-4.8 1.4-4.8 3.1c0 .2.2.3.4.3h8.8c.2 0 .4-.1.4-.3c0-1.7-2.1-3.1-4.8-3.1Z"
              fill="currentColor"
            />
          </svg>
          {{ total }}
        </span>
      </div>
      <button type="button" class="role-member-table__add-button" @click="emit('add')">
        <span class="role-member-table__add-plus">+</span>
        添加用户
        <span class="role-member-table__add-arrow">⌄</span>
      </button>
    </header>

    <div class="role-member-table__toolbar">
      <div class="role-member-table__search">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M7.2 2.2a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm0-1.2a6.2 6.2 0 1 0 3.9 11l3 3a.6.6 0 0 0 .8-.8l-3-3A6.2 6.2 0 0 0 7.2 1Z"
            fill="currentColor"
          />
        </svg>
        <input
          v-model="localKeyword"
          type="text"
          placeholder="搜索姓名、账号"
          @input="scheduleSearch"
          @keyup.enter="onSearch"
        />
      </div>
    </div>

    <table class="role-member-table">
      <thead>
        <tr>
          <th>姓名</th>
          <th>账号</th>
          <th>邮箱</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="4" class="role-member-table__empty">加载中...</td>
        </tr>
        <tr v-else-if="!members.length">
          <td colspan="4" class="role-member-table__empty">暂无成员</td>
        </tr>
        <tr v-for="member in members" v-else :key="String(member.id)">
          <td>{{ member.name || '-' }}</td>
          <td>{{ member.account || '-' }}</td>
          <td>{{ member.email || '-' }}</td>
          <td class="role-member-table__action-cell">
            <button
              type="button"
              class="role-member-table__remove-button"
              :disabled="loading || isRemoving(member.id)"
              :title="isRemoving(member.id) ? '处理中' : '移除当前成员'"
              @click="emit('remove', member)"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M8 2.2a5.8 5.8 0 1 0 5.3 8.2a.6.6 0 1 0-1.1-.4a4.6 4.6 0 1 1-.5-4.7H10a.6.6 0 0 0 0 1.2h3a.6.6 0 0 0 .6-.6v-3a.6.6 0 1 0-1.2 0v1.1A5.8 5.8 0 0 0 8 2.2Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <footer class="role-member-table__pagination">
      <span>共 {{ total }} 条</span>
      <button type="button" :disabled="loading || page <= 1" @click="emit('pageChange', page - 1)">
        ‹
      </button>
      <span> {{ page }} </span>
      <button
        type="button"
        :disabled="loading || page * pageSize >= total"
        @click="emit('pageChange', page + 1)"
      >
        ›
      </button>
      <label>
        <SystemSelect v-model="selectedPageSize" :options="pageSizeOptions" />
      </label>
      <span>跳转至</span>
      <input class="role-member-table__jump" :value="String(page)" type="text" readonly />
      <span>页</span>
    </footer>
  </section>
</template>

<style scoped>
.role-member-table-wrap {
  background: #fff;
  border: 1px solid #dde6f2;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
}

.role-member-table__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 16px 16px 12px;
}

.role-member-table__title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-member-table__title h2 {
  margin: 0;
  font-size: 17px;
  color: #1d2740;
}

.role-member-table__type-tag {
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid #d8e5ff;
  background: #eaf1ff;
  color: #316be8;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
}

.role-member-table__count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #53627d;
  font-size: 15px;
}

.role-member-table__count svg {
  width: 16px;
  height: 16px;
}

.role-member-table__add-button {
  border: none;
  background: #3368e8;
  color: #fff;
  border-radius: 8px;
  height: 40px;
  min-width: 138px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.role-member-table__add-plus {
  font-size: 20px;
  line-height: 1;
}

.role-member-table__add-arrow {
  margin-left: 2px;
  font-size: 12px;
}

.role-member-table__toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 16px 16px;
}

.role-member-table__search {
  width: 320px;
  height: 44px;
  border: 1px solid #d8deea;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: #98a1b4;
}

.role-member-table__search svg {
  width: 16px;
  height: 16px;
}

.role-member-table__search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  background: transparent;
  color: #1f2a44;
}

.role-member-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  flex: 1 1 auto;
}

.role-member-table th,
.role-member-table td {
  border-bottom: 1px solid #eef2f8;
  height: 54px;
  padding: 0 14px;
  text-align: left;
  vertical-align: middle;
}

.role-member-table th {
  background: #fafcff;
  color: #243047;
  font-weight: 600;
  font-size: 16px;
}

.role-member-table td {
  font-size: 16px;
}

.role-member-table__action-cell {
  width: 120px;
  text-align: center;
}

.role-member-table th:last-child {
  width: 120px;
  text-align: center;
}

.role-member-table th:first-child,
.role-member-table td:first-child {
  width: 22%;
}

.role-member-table th:nth-child(2),
.role-member-table td:nth-child(2) {
  width: 24%;
}

.role-member-table th:nth-child(3),
.role-member-table td:nth-child(3) {
  width: auto;
}

.role-member-table__remove-button {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #3368e8;
  cursor: pointer;
}

.role-member-table__remove-button:hover {
  background: #edf4ff;
}

.role-member-table__remove-button svg {
  width: 18px;
  height: 18px;
}

.role-member-table__empty {
  text-align: center;
  color: #97a1b4;
}

.role-member-table__pagination {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  font-size: 15px;
  color: #5a657c;
  border-top: 1px solid #eef2f8;
  background: #fbfcff;
}

.role-member-table__pagination button,
.role-member-table__jump {
  height: 36px;
  border: 1px solid #d8deea;
  border-radius: 8px;
  background: #fff;
  box-sizing: border-box;
}

.role-member-table__pagination label {
  width: 120px;
}

.role-member-table__pagination button {
  width: 32px;
  cursor: pointer;
}

.role-member-table__jump {
  width: 48px;
  text-align: center;
}
</style>
