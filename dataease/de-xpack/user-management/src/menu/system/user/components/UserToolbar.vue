<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import SystemSelect from '../../shared/SystemSelect.vue'
import type { RoleQueryItem, UserFilterState } from '../types'

const props = withDefaults(
  defineProps<{
    keyword?: string
    loading?: boolean
    importEnabled?: boolean
    filters: UserFilterState
    roleOptions?: RoleQueryItem[]
  }>(),
  {
    keyword: '',
    loading: false,
    importEnabled: false,
    roleOptions: () => []
  }
)

const emit = defineEmits<{
  (e: 'search', keyword: string): void
  (e: 'applyFilters', filters: Pick<UserFilterState, 'originList' | 'statusList' | 'roleIdList'>): void
  (e: 'resetFilters'): void
  (e: 'add'): void
  (e: 'import'): void
}>()

const localState = reactive({
  keyword: props.keyword,
  origin: '',
  status: '',
  roleId: ''
})
let searchTimer: number | undefined

const originOptions = [
  { label: '全部', value: '' },
  { label: '本地', value: '0' },
  { label: 'LDAP', value: '1' }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: '1' },
  { label: '禁用', value: '0' }
]

const roleFilterOptions = computed(() => [
  { label: '全部', value: '' },
  ...props.roleOptions.map(role => ({
    label: role.name || '-',
    value: String(role.id)
  }))
])

const syncFromProps = () => {
  localState.keyword = props.keyword
  localState.origin = props.filters.originList[0] === 0 ? '0' : props.filters.originList[0] === 1 ? '1' : ''
  localState.status =
    props.filters.statusList[0] === 1 ? '1' : props.filters.statusList[0] === 0 ? '0' : ''
  localState.roleId = props.filters.roleIdList[0] !== undefined ? String(props.filters.roleIdList[0]) : ''
}

watch(
  () => props.keyword,
  () => {
    syncFromProps()
  }
)

watch(
  () => props.filters,
  () => {
    syncFromProps()
  },
  { deep: true, immediate: true }
)

const onSearch = () => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = undefined
  }
  emit('search', localState.keyword.trim())
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

const onApplyFilters = () => {
  emit('applyFilters', {
    originList: localState.origin === '' ? [] : [Number(localState.origin)],
    statusList: localState.status === '' ? [] : [Number(localState.status)],
    roleIdList: localState.roleId === '' ? [] : [localState.roleId]
  })
}

const onResetFilters = () => {
  localState.origin = ''
  localState.status = ''
  localState.roleId = ''
  emit('resetFilters')
}

const onImport = () => {
  if (!props.importEnabled) {
    return
  }
  emit('import')
}
</script>

<template>
  <section class="user-toolbar">
    <div class="user-toolbar__top-row">
      <div class="user-toolbar__actions">
        <button type="button" class="user-toolbar__primary" :disabled="loading" @click="emit('add')">
          <span class="user-toolbar__plus">+</span>
          添加用户
        </button>
        <button
          type="button"
          class="user-toolbar__secondary"
          :disabled="loading || !importEnabled"
          @click="onImport"
        >
          <span class="user-toolbar__icon">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M7.4 2.4a.6.6 0 0 1 1.2 0v5.1l1.7-1.7a.6.6 0 1 1 .8.8L8.4 9.4a.6.6 0 0 1-.8 0L4.9 6.6a.6.6 0 1 1 .8-.8l1.7 1.7V2.4ZM3.2 10a.6.6 0 0 1 .6.6v1.3h8.4v-1.3a.6.6 0 1 1 1.2 0v1.7c0 .4-.3.8-.8.8H3c-.4 0-.8-.3-.8-.8v-1.7a.6.6 0 0 1 .6-.6Z"
                fill="currentColor"
              />
            </svg>
          </span>
          批量导入
        </button>
      </div>

      <div class="user-toolbar__search-row">
        <div class="user-toolbar__search">
          <span class="user-toolbar__search-icon">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M7.2 2.2a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm0-1.2a6.2 6.2 0 1 0 3.9 11l3 3a.6.6 0 0 0 .8-.8l-3-3A6.2 6.2 0 0 0 7.2 1Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input
            v-model="localState.keyword"
            type="text"
            placeholder="搜索姓名、账号、邮箱"
            @input="scheduleSearch"
            @keyup.enter="onSearch"
          />
        </div>
        <button type="button" class="user-toolbar__filter-button">
          <span class="user-toolbar__icon">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2.5 3.2c0-.4.3-.7.7-.7h9.6a.7.7 0 0 1 .5 1.1L9.6 8.1v4a.7.7 0 0 1-1 .6L6.8 11.8a.7.7 0 0 1-.4-.6V8.1L2.7 3.6a.7.7 0 0 1-.2-.4Z"
                fill="currentColor"
              />
            </svg>
          </span>
          筛选
        </button>
      </div>
    </div>

    <div class="user-toolbar__filter-panel">
      <label class="user-toolbar__field">
        <span>用户来源：</span>
        <SystemSelect v-model="localState.origin" :options="originOptions" placeholder="全部" />
      </label>
      <label class="user-toolbar__field">
        <span>启用状态：</span>
        <SystemSelect v-model="localState.status" :options="statusOptions" placeholder="全部" />
      </label>
      <label class="user-toolbar__field">
        <span>角色：</span>
        <SystemSelect v-model="localState.roleId" :options="roleFilterOptions" placeholder="全部" />
      </label>
      <button type="button" class="user-toolbar__ghost-button" :disabled="loading" @click="onResetFilters">
        重置
      </button>
      <button
        type="button"
        class="user-toolbar__confirm-button"
        :disabled="loading"
        @click="onApplyFilters"
      >
        确定
      </button>
    </div>
  </section>
</template>

<style scoped>
.user-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-toolbar__top-row,
.user-toolbar__actions,
.user-toolbar__search-row,
.user-toolbar__filter-panel {
  display: flex;
  align-items: center;
}

.user-toolbar__top-row {
  justify-content: space-between;
  gap: 12px;
  flex-wrap: nowrap;
  min-height: 58px;
  padding: 8px 12px;
  border: 1px solid #dde6f2;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
  box-sizing: border-box;
}

.user-toolbar__actions {
  gap: 12px;
  flex: 0 0 auto;
  flex-wrap: nowrap;
}

.user-toolbar__search-row {
  gap: 12px;
  flex: 0 1 auto;
  flex-wrap: nowrap;
  margin-left: auto;
}

.user-toolbar__search {
  width: 340px;
  height: 44px;
  border: 1px solid #d8e0ef;
  border-radius: 9px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #fff;
}

.user-toolbar__search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: #1f2a44;
  background: transparent;
}

.user-toolbar__search-icon,
.user-toolbar__icon {
  color: #8a94ab;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.user-toolbar__search-icon svg,
.user-toolbar__icon svg {
  width: 16px;
  height: 16px;
}

.user-toolbar__primary,
.user-toolbar__secondary,
.user-toolbar__filter-button,
.user-toolbar__ghost-button,
.user-toolbar__confirm-button {
  height: 42px;
  min-height: 44px;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  border: 1px solid #d8e0ef;
}

.user-toolbar__primary {
  min-width: 128px;
  padding: 0 18px;
  border-color: #3368e8;
  background: #3368e8;
  color: #fff;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.user-toolbar__plus {
  font-size: 20px;
  line-height: 1;
}

.user-toolbar__secondary,
.user-toolbar__filter-button,
.user-toolbar__ghost-button {
  background: #fff;
  color: #33415c;
  padding: 0 16px;
}

.user-toolbar__secondary {
  min-width: 112px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.user-toolbar__filter-button {
  min-width: 84px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.user-toolbar__confirm-button {
  min-width: 106px;
  border-color: #3368e8;
  background: #3368e8;
  color: #fff;
  font-weight: 600;
}

.user-toolbar__filter-panel {
  gap: 12px;
  min-height: 62px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #dde6f2;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
  flex-wrap: wrap;
  box-sizing: border-box;
}

.user-toolbar__field {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #41506d;
  font-size: 15px;
  font-weight: 600;
}

.user-toolbar__field :deep(.system-select) {
  width: 180px;
}

.user-toolbar__top-row :disabled,
.user-toolbar__search-row :disabled,
.user-toolbar__filter-panel :disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1200px) {
  .user-toolbar__top-row,
  .user-toolbar__actions,
  .user-toolbar__search-row,
  .user-toolbar__filter-panel {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .user-toolbar__top-row {
    flex-direction: column;
    align-items: stretch;
    flex-wrap: wrap;
  }

  .user-toolbar__search {
    width: 100%;
  }

  .user-toolbar__filter-panel {
    padding: 14px 16px;
  }
}
</style>
