<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import type { UserOptionItem } from '../types'

const props = withDefaults(
  defineProps<{
    visible: boolean
    loading?: boolean
    submitting?: boolean
    keyword?: string
    options?: UserOptionItem[]
    selected?: UserOptionItem[]
  }>(),
  {
    loading: false,
    submitting: false,
    keyword: '',
    options: () => [],
    selected: () => []
  }
)

const emit = defineEmits<{
  (e: 'search', keyword: string): void
  (e: 'add', user: UserOptionItem): void
  (e: 'remove', user: UserOptionItem): void
  (e: 'clear'): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const localKeyword = ref(props.keyword)
const allCheckbox = ref<HTMLInputElement | null>(null)
let searchTimer: number | undefined

watch(
  () => props.keyword,
  keyword => {
    localKeyword.value = keyword
  }
)

watch(
  () => props.visible,
  visible => {
    if (visible) {
      localKeyword.value = props.keyword
    }
  }
)

const selectedIdSet = computed(() => new Set(props.selected.map(item => String(item.id))))

const isSelected = (user: UserOptionItem): boolean => selectedIdSet.value.has(String(user.id))

const allOptionSelected = computed(
  () => props.options.length > 0 && props.options.every(item => selectedIdSet.value.has(String(item.id)))
)

const partialSelected = computed(
  () => props.options.some(item => selectedIdSet.value.has(String(item.id))) && !allOptionSelected.value
)

watchEffect(() => {
  if (allCheckbox.value) {
    allCheckbox.value.indeterminate = partialSelected.value
  }
})

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

const toggleUser = (user: UserOptionItem, checked: boolean) => {
  if (checked) {
    emit('add', user)
    return
  }
  emit('remove', user)
}

const toggleAll = (checked: boolean) => {
  if (checked) {
    props.options.forEach(user => {
      if (!selectedIdSet.value.has(String(user.id))) {
        emit('add', user)
      }
    })
    return
  }
  props.options.forEach(user => {
    if (selectedIdSet.value.has(String(user.id))) {
      emit('remove', user)
    }
  })
}
</script>

<template>
  <div v-if="visible" class="role-assign-dialog-mask" @click.self="emit('cancel')">
    <section class="role-assign-dialog">
      <header class="role-assign-dialog__header">
        <h2>添加组织用户</h2>
        <button type="button" class="role-assign-dialog__close" @click="emit('cancel')">×</button>
      </header>

      <div class="role-assign-dialog__search">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M7.2 2.2a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm0-1.2a6.2 6.2 0 1 0 3.9 11l3 3a.6.6 0 0 0 .8-.8l-3-3A6.2 6.2 0 0 0 7.2 1Z"
            fill="currentColor"
          />
        </svg>
        <input
          v-model="localKeyword"
          type="text"
          placeholder="搜索用户"
          @input="scheduleSearch"
          @keyup.enter="onSearch"
        />
      </div>

      <div class="role-assign-dialog__pane">
        <section class="role-assign-dialog__list">
          <ul>
            <li class="role-assign-dialog__option role-assign-dialog__option--all">
              <label class="role-assign-dialog__checkbox">
                <input
                  ref="allCheckbox"
                  type="checkbox"
                  :checked="allOptionSelected"
                  @change="toggleAll(($event.target as HTMLInputElement).checked)"
                />
                <span>全部</span>
              </label>
            </li>
            <li v-if="loading" class="role-assign-dialog__option role-assign-dialog__state">加载中...</li>
            <li
              v-else-if="!options.length"
              class="role-assign-dialog__option role-assign-dialog__state"
            >
              暂无可选用户
            </li>
            <li v-for="user in options" v-else :key="String(user.id)" class="role-assign-dialog__option">
              <label class="role-assign-dialog__checkbox">
                <input
                  type="checkbox"
                  :checked="isSelected(user)"
                  @change="toggleUser(user, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ user.name || '-' }}({{ user.account || '-' }})</span>
              </label>
            </li>
          </ul>
        </section>

        <section class="role-assign-dialog__list">
          <header>
            <h3>已选: {{ selected.length }} 个用户</h3>
            <button type="button" class="role-assign-dialog__clear" @click="emit('clear')">清空</button>
          </header>
          <ul>
            <li v-if="!selected.length" class="role-assign-dialog__option role-assign-dialog__state">
              暂无已选用户
            </li>
            <li v-for="user in selected" :key="String(user.id)" class="role-assign-dialog__selected-item">
              <span>{{ user.name || '-' }}({{ user.account || '-' }})</span>
              <button type="button" class="role-assign-dialog__remove" @click="emit('remove', user)">
                ×
              </button>
            </li>
          </ul>
        </section>
      </div>

      <footer class="role-assign-dialog__actions">
        <button type="button" :disabled="submitting" @click="emit('cancel')">取消</button>
        <button type="button" :disabled="submitting || !selected.length" @click="emit('submit')">
          {{ submitting ? '提交中...' : '添加' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.role-assign-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 30%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1010;
}

.role-assign-dialog {
  background: #fff;
  width: min(820px, calc(100vw - 24px));
  max-height: calc(100vh - 40px);
  overflow: auto;
  border-radius: 14px;
  padding: 22px 24px;
  box-shadow: 0 20px 48px rgb(15 23 42 / 24%);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 1520px) {
  .role-assign-dialog {
    width: min(920px, calc(100vw - 48px));
  }
}

.role-assign-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.role-assign-dialog__header h2 {
  margin: 0;
  font-size: 18px;
  color: #1d2740;
}

.role-assign-dialog__close {
  border: none;
  background: transparent;
  color: #98a1b4;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.role-assign-dialog__search {
  height: 42px;
  border: 1px solid #d8deea;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: #98a1b4;
}

.role-assign-dialog__search svg {
  width: 16px;
  height: 16px;
}

.role-assign-dialog__search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  background: transparent;
  color: #1f2a44;
}

.role-assign-dialog__pane {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.role-assign-dialog__list {
  border: 1px solid #dfe5ef;
  border-radius: 10px;
  overflow: hidden;
  min-height: 300px;
}

.role-assign-dialog__list header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #eef2f8;
  background: #fbfcff;
}

.role-assign-dialog__list h3 {
  margin: 0;
  font-size: 15px;
  color: #4d5870;
  font-weight: 500;
}

.role-assign-dialog__clear {
  border: none;
  background: transparent;
  color: #1f6dff;
  cursor: pointer;
  font-size: 15px;
}

.role-assign-dialog__list ul {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 300px;
  overflow: auto;
}

.role-assign-dialog__option,
.role-assign-dialog__selected-item {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 14px;
}

.role-assign-dialog__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  font-size: 15px;
  color: #1f2a44;
  cursor: pointer;
}

.role-assign-dialog__checkbox input {
  width: 18px;
  height: 18px;
  accent-color: #3368e8;
  margin: 0;
}

.role-assign-dialog__state {
  color: #97a1b4;
  justify-content: center;
}

.role-assign-dialog__selected-item {
  color: #1f2a44;
  border-bottom: 1px solid #f3f5fa;
}

.role-assign-dialog__selected-item:last-child {
  border-bottom: none;
}

.role-assign-dialog__remove {
  border: none;
  background: transparent;
  color: #98a1b4;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.role-assign-dialog__actions {
  display: flex;
  gap: 12px;
}

.role-assign-dialog__actions button {
  flex: 1;
  height: 42px;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  border: 1px solid #d8deea;
}

.role-assign-dialog__actions button:first-child {
  background: #fff;
  color: #1f2a44;
}

.role-assign-dialog__actions button:last-child {
  background: #3368e8;
  border-color: #3368e8;
  color: #fff;
}

@media (max-width: 900px) {
  .role-assign-dialog__pane {
    grid-template-columns: 1fr;
  }
}
</style>
