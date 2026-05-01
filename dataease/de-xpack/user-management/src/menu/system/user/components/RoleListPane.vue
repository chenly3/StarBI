<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RoleQueryItem } from '../types'

const props = withDefaults(
  defineProps<{
    roles?: RoleQueryItem[]
    activeRoleId?: string | number | null
    loading?: boolean
  }>(),
  {
    roles: () => [],
    activeRoleId: null,
    loading: false
  }
)

const emit = defineEmits<{
  (e: 'select', role: RoleQueryItem): void
  (e: 'create'): void
}>()

const keyword = ref('')
const initializedSelection = ref(false)

const filteredRoles = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  if (!normalizedKeyword) {
    return props.roles
  }
  return props.roles.filter(role => String(role.name || '').toLowerCase().includes(normalizedKeyword))
})

const getBuiltinRoleOrder = (role: RoleQueryItem): number => {
  const normalizedName = String(role.name || '').trim()
  if (normalizedName.includes('组织管理员')) {
    return 0
  }
  if (normalizedName.includes('分析')) {
    return 1
  }
  if (normalizedName.includes('系统管理员')) {
    return 2
  }
  return 99
}

const systemRoles = computed(() =>
  filteredRoles.value
    .filter(role => role.readonly || role.root)
    .slice()
    .sort((left, right) => getBuiltinRoleOrder(left) - getBuiltinRoleOrder(right))
)

const customRoles = computed(() =>
  filteredRoles.value
    .filter(role => !role.readonly && !role.root)
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
)

const isActive = (id: string | number): boolean => {
  if (props.activeRoleId === null || props.activeRoleId === undefined) {
    return false
  }
  return String(props.activeRoleId) === String(id)
}

watch(
  () => props.roles,
  roles => {
    if (initializedSelection.value || !roles.length) {
      return
    }
    const preferredRole = roles.find(role => getBuiltinRoleOrder(role) === 0)
    if (preferredRole && !isActive(preferredRole.id)) {
      emit('select', preferredRole)
    }
    initializedSelection.value = true
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <aside class="role-list-pane">
    <header class="role-list-pane__header">
      <h2>角色列表</h2>
    </header>

    <div class="role-list-pane__search">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M7.2 2.2a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm0-1.2a6.2 6.2 0 1 0 3.9 11l3 3a.6.6 0 0 0 .8-.8l-3-3A6.2 6.2 0 0 0 7.2 1Z"
          fill="currentColor"
        />
      </svg>
      <input v-model="keyword" type="text" placeholder="搜索" />
    </div>

    <div v-if="loading" class="role-list-pane__state">加载中...</div>
    <div v-else-if="!roles.length" class="role-list-pane__state">暂无角色</div>
    <template v-else>
      <section class="role-list-pane__group">
        <div class="role-list-pane__group-title">系统内置角色</div>
        <div v-if="systemRoles.length" class="role-list-pane__list">
          <button
            v-for="role in systemRoles"
            :key="String(role.id)"
            type="button"
            class="role-list-pane__item"
            :class="{ active: isActive(role.id) }"
            :style="{ order: getBuiltinRoleOrder(role) }"
            @click="emit('select', role)"
          >
            <span class="role-list-pane__item-name">{{ role.name || '-' }}</span>
            <span class="role-list-pane__tag">系统</span>
          </button>
        </div>
        <div v-else class="role-list-pane__empty">暂无系统角色</div>
      </section>

      <section class="role-list-pane__group">
        <div class="role-list-pane__group-title role-list-pane__group-title--action">
          <span>自定义角色</span>
          <button type="button" class="role-list-pane__plus" @click="emit('create')">+</button>
        </div>
        <div v-if="customRoles.length" class="role-list-pane__list">
          <button
            v-for="role in customRoles"
            :key="String(role.id)"
            type="button"
            class="role-list-pane__item"
            :class="{ active: isActive(role.id) }"
            @click="emit('select', role)"
          >
            <span class="role-list-pane__item-name">{{ role.name || '-' }}</span>
          </button>
        </div>
        <div v-else class="role-list-pane__empty">暂无自定义角色</div>
      </section>
    </template>
  </aside>
</template>

<style scoped>
.role-list-pane {
  background: #fff;
  border: 1px solid #dde6f2;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 380px;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
}

.role-list-pane__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.role-list-pane__header h2 {
  margin: 0;
  font-size: 16px;
  color: #1d2740;
}

.role-list-pane__search {
  height: 42px;
  border: 1px solid #d8deea;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: #98a1b4;
}

.role-list-pane__search svg {
  width: 16px;
  height: 16px;
}

.role-list-pane__search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  background: transparent;
  color: #1f2a44;
}

.role-list-pane__group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-list-pane__group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #5a657c;
  font-size: 15px;
  font-weight: 600;
}

.role-list-pane__group-title--action {
  padding-top: 6px;
}

.role-list-pane__plus {
  border: none;
  background: transparent;
  color: #5b6780;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.role-list-pane__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-list-pane__item {
  width: 100%;
  min-height: 44px;
  border: 1px solid #e1e6f0;
  background: #fff;
  border-radius: 8px;
  padding: 0 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  color: #23304b;
}

.role-list-pane__item-name {
  min-width: 0;
  flex: 1;
  font-size: 15px;
  font-weight: 600;
}

.role-list-pane__item.active {
  border-color: #bfd3ff;
  background: #edf4ff;
  color: #215fdf;
}

.role-list-pane__tag {
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

.role-list-pane__empty,
.role-list-pane__state {
  color: #97a1b4;
  font-size: 15px;
}

.role-list-pane__empty {
  min-height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
