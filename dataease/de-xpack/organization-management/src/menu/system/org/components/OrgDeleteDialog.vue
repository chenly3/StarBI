<script setup lang="ts">
import type { OrgTableRow } from '../types'

defineProps<{
  visible: boolean
  row: OrgTableRow | null
  deleting: boolean
}>()

const emit = defineEmits<{
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()
</script>

<template>
  <div v-if="visible" class="org-modal-mask" @click.self="emit('cancel')">
    <div class="org-modal">
      <header class="org-modal__header">
        <h3>确认删除</h3>
        <button type="button" class="org-modal__close" @click="emit('cancel')">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="m4.47 4.47 7.06 7.06m0-7.06-7.06 7.06"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.5"
            />
          </svg>
        </button>
      </header>

      <div class="org-modal__body">
        <div class="org-delete__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <path
              d="M8 1.667a6.333 6.333 0 1 0 0 12.666A6.333 6.333 0 0 0 8 1.667Zm.667 8.666a.667.667 0 1 1-1.334 0V9a.667.667 0 0 1 1.334 0v1.333Zm0-3.333a.667.667 0 1 1-1.334 0V5.667a.667.667 0 0 1 1.334 0V7Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div class="org-delete__copy">
          <p class="org-delete__title">您确定要删除该组织吗？</p>
          <p class="org-delete__desc">
            删除后组织下的所有子组织和关联数据都会被移除，该操作无法撤销。
          </p>
        </div>
      </div>

      <footer class="org-modal__footer">
        <button type="button" class="org-button org-button--ghost" @click="emit('cancel')">取消</button>
        <button type="button" class="org-button" :disabled="deleting" @click="emit('confirm')">
          {{ deleting ? '删除中...' : '确认删除' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.org-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.36);
  padding: 24px;
}

.org-modal {
  width: min(480px, 100%);
  min-height: 255px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(31, 35, 41, 0.18);
  overflow: hidden;
}

.org-modal__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 28px 24px 18px;
}

.org-modal__header h3 {
  margin: 0;
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
  color: #1e293b;
}

.org-modal__close {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.org-modal__close svg {
  width: 18px;
  height: 18px;
}

.org-modal__body {
  display: flex;
  gap: 16px;
  padding: 12px 24px 28px;
  min-height: 128px;
}

.org-delete__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #ef4444;
  flex: 0 0 auto;
}

.org-delete__icon svg {
  width: 22px;
  height: 22px;
}

.org-delete__copy {
  display: grid;
  gap: 8px;
}

.org-delete__title,
.org-delete__desc {
  margin: 0;
  font-size: 14px;
  line-height: 22px;
}

.org-delete__title {
  color: #1f2329;
  font-weight: 500;
}

.org-delete__desc {
  color: #64748b;
}

.org-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 24px;
}

.org-button {
  min-width: 93px;
  height: 40px;
  border: none;
  border-radius: 8px;
  padding: 0 20px;
  background: #3370ff;
  color: #ffffff;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
}

.org-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.org-button--ghost {
  border: 1px solid #d0d5dd;
  background: #ffffff;
  color: #1f2329;
}
</style>
