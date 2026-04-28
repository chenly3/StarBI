<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UserGridRow } from '../types'

const props = withDefaults(
  defineProps<{
    rows?: UserGridRow[]
    total?: number
    page?: number
    pageSize?: number
    loading?: boolean
    currentOrgName?: string
  }>(),
  {
    rows: () => [],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: false,
    currentOrgName: ''
  }
)

const emit = defineEmits<{
  (e: 'edit', row: UserGridRow): void
  (e: 'delete', row: UserGridRow): void
  (e: 'toggle', row: UserGridRow): void
  (e: 'resetPwd', row: UserGridRow): void
  (e: 'pageChange', page: number): void
  (e: 'pageSizeChange', pageSize: number): void
}>()

const selectedAccounts = ref<string[]>([])

const normalizedRows = computed(() =>
  props.rows.map(row => ({
    ...row,
    selectionKey: String(row.id ?? row.account),
    orgName: row.orgName || props.currentOrgName || '演示组织'
  }))
)

const allSelected = computed({
  get: () => normalizedRows.value.length > 0 && normalizedRows.value.every(row => selectedAccounts.value.includes(row.selectionKey)),
  set: value => {
    selectedAccounts.value = value ? normalizedRows.value.map(row => row.selectionKey) : []
  }
})

const formatRoles = (row: UserGridRow): string => {
  if (!Array.isArray(row.roleItems) || row.roleItems.length === 0) {
    return '-'
  }
  return row.roleItems.map(role => role.name).join(' / ')
}

const formatOrigin = (origin?: number): string => {
  if (origin === 1) {
    return 'LDAP'
  }
  return '本地'
}

const formatDateTime = (value: string | number | undefined): string => {
  if (!value && value !== 0) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  const yyyy = date.getFullYear()
  const mm = `${date.getMonth() + 1}`.padStart(2, '0')
  const dd = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mi = `${date.getMinutes()}`.padStart(2, '0')
  const ss = `${date.getSeconds()}`.padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

const onPageSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const parsed = Number(target.value)
  if (Number.isFinite(parsed) && parsed > 0) {
    emit('pageSizeChange', parsed)
  }
}
</script>

<template>
  <section class="user-table-wrap">
    <table class="user-table">
      <thead>
        <tr>
          <th class="user-table__check-col">
            <input v-model="allSelected" type="checkbox" />
          </th>
          <th class="user-table__name-col">姓名</th>
          <th class="user-table__account-col">账号</th>
          <th class="user-table__role-col">角色</th>
          <th class="user-table__email-col">邮箱</th>
          <th class="user-table__org-col">所属组织</th>
          <th class="user-table__origin-col">用户来源</th>
          <th class="user-table__status-col">是否启用</th>
          <th class="user-table__sort-col">创建时间</th>
          <th class="user-table__action-col">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="10" class="user-table__empty">加载中...</td>
        </tr>
        <tr v-else-if="!normalizedRows.length">
          <td colspan="10" class="user-table__empty">暂无数据</td>
        </tr>
        <tr v-for="row in normalizedRows" v-else :key="row.selectionKey">
          <td class="user-table__check-col">
            <input v-model="selectedAccounts" :value="row.selectionKey" type="checkbox" />
          </td>
          <td class="user-table__name-col user-table__single-line">{{ row.name || '-' }}</td>
          <td class="user-table__account-col user-table__single-line">{{ row.account || '-' }}</td>
          <td class="user-table__role-col">
            <span class="user-table__role-tag" :class="{ 'is-blue': formatRoles(row).includes('组织') }">
              {{ formatRoles(row) }}
            </span>
          </td>
          <td class="user-table__email-col user-table__single-line">{{ row.email || '-' }}</td>
          <td class="user-table__org-col user-table__single-line">{{ row.orgName }}</td>
          <td class="user-table__origin-col">
            <span class="user-table__origin-tag" :class="{ 'is-purple': formatOrigin(row.origin) === 'LDAP' }">
              {{ formatOrigin(row.origin) }}
            </span>
          </td>
          <td class="user-table__status-col">
            <button
              type="button"
              class="user-table__switch"
              :class="{ 'is-on': row.enable }"
              @click="emit('toggle', row)"
            >
              <span />
            </button>
          </td>
          <td class="user-table__time user-table__single-line">{{ formatDateTime(row.createTime) }}</td>
          <td class="user-table__actions">
            <button type="button" class="user-table__icon-button" @click="emit('edit', row)">编辑</button>
            <button type="button" class="user-table__icon-button" @click="emit('resetPwd', row)">
              重置密码
            </button>
            <button type="button" class="user-table__icon-button" @click="emit('delete', row)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <footer class="user-table-pagination">
      <button type="button" class="user-table__batch-button" :disabled="!selectedAccounts.length">
        批量操作
      </button>
      <div class="user-table-pagination__right">
        <span>共 {{ total }} 条</span>
        <div class="user-table-pagination__pager">
          <button
            type="button"
            :disabled="page <= 1 || loading"
            @click="emit('pageChange', page - 1)"
          >
            ‹
          </button>
          <span class="user-table-pagination__page">{{ page }}</span>
          <button
            type="button"
            :disabled="loading || page * pageSize >= total"
            @click="emit('pageChange', page + 1)"
          >
            ›
          </button>
        </div>
        <label class="user-table-pagination__size">
          <select :value="String(pageSize)" @change="onPageSizeChange">
            <option value="10">10条/页</option>
            <option value="20">20条/页</option>
            <option value="50">50条/页</option>
            <option value="100">100条/页</option>
          </select>
        </label>
        <label class="user-table-pagination__jump">
          跳转至
          <input :value="String(page)" type="text" readonly />
          页
        </label>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.user-table-wrap {
  background: #fff;
  border: 1px solid #dde6f2;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  color: #1f2a44;
  flex: 0 0 auto;
}

.user-table th,
.user-table td {
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #eef2f8;
  text-align: left;
  vertical-align: middle;
}

.user-table th {
  background: #fafcff;
  color: #1d2740;
  font-weight: 600;
  font-size: 14px;
}

.user-table td {
  font-size: 15px;
}

.user-table__check-col {
  width: 44px;
}

.user-table__action-col {
  width: 186px;
}

.user-table__name-col {
  width: 100px;
}

.user-table__account-col {
  width: 128px;
}

.user-table__role-col {
  width: 150px;
}

.user-table__email-col {
  width: 206px;
}

.user-table__org-col {
  width: 120px;
}

.user-table__origin-col {
  width: 92px;
}

.user-table__status-col {
  width: 96px;
}

.user-table__single-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-table__sort-col::after {
  content: '⌄';
  margin-left: 6px;
  color: #97a1b8;
  font-size: 12px;
}

.user-table__role-tag,
.user-table__origin-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
}

.user-table__role-tag {
  max-width: 100%;
  background: #f2f5fb;
  color: #4b5b78;
  white-space: normal;
  line-height: 1.25;
}

.user-table__role-tag.is-blue {
  background: #edf4ff;
  color: #3368e8;
  border: 1px solid #cfe0ff;
}

.user-table__origin-tag {
  background: #eafbf0;
  color: #1d8d52;
  border: 1px solid #c7efd7;
}

.user-table__origin-tag.is-purple {
  background: #f5ebff;
  color: #8a39d1;
  border-color: #e5cdfb;
}

.user-table__switch {
  width: 44px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: #cfd6e4;
  padding: 2px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.user-table__switch span {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}

.user-table__switch.is-on {
  background: #4b7cff;
}

.user-table__switch.is-on span {
  transform: translateX(20px);
}

.user-table__icon-button {
  border: none;
  background: transparent;
  color: #4b7cff;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  line-height: 1;
}

.user-table__actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.user-table__time {
  color: #5e6b84;
  line-height: 1.4;
}

.user-table__empty {
  padding: 56px 0;
  text-align: center;
  color: #8994aa;
}

.user-table-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid #eef2f8;
  background: #fbfcff;
}

.user-table__batch-button {
  margin-left: 16px;
  height: 38px;
  padding: 0 18px;
  border: 1px solid #d8e0ef;
  border-radius: 8px;
  background: #fff;
  color: #33415c;
  cursor: pointer;
}

.user-table-pagination__right {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-right: 16px;
  color: #5e6b84;
}

.user-table-pagination__pager {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.user-table-pagination__pager button,
.user-table-pagination__page,
.user-table-pagination__size select,
.user-table-pagination__jump input {
  height: 34px;
  min-width: 34px;
  border: 1px solid #d8e0ef;
  border-radius: 8px;
  background: #fff;
}

.user-table-pagination__pager button {
  cursor: pointer;
}

.user-table-pagination__page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #3368e8;
  font-weight: 600;
  border-color: #aec4ff;
}

.user-table-pagination__size select,
.user-table-pagination__jump input {
  padding: 0 12px;
  font-size: 14px;
  color: #33415c;
}

.user-table-pagination__jump {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.user-table-pagination__jump input {
  width: 60px;
}

@media (max-width: 1200px) {
  .user-table-wrap {
    overflow-x: auto;
  }

  .user-table {
    min-width: 1180px;
  }

  .user-table-pagination {
    min-width: 1180px;
  }
}
</style>
