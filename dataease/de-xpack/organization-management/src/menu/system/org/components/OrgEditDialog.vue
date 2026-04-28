<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { OrgFormState } from '../types'

const props = defineProps<{
  visible: boolean
  modelValue: OrgFormState
  submitting: boolean
}>()

const emit = defineEmits<{
  (event: 'save', value: OrgFormState): void
  (event: 'cancel'): void
}>()

const state = reactive<OrgFormState>({
  id: '',
  name: ''
})

watch(
  () => props.modelValue,
  value => {
    state.id = value?.id
    state.name = value?.name || ''
  },
  { deep: true, immediate: true }
)

const handleSubmit = () => {
  emit('save', {
    id: state.id,
    name: state.name
  })
}
</script>

<template>
  <div v-if="visible" class="org-modal-mask" @click.self="emit('cancel')">
    <div class="org-modal">
      <header class="org-modal__header">
        <h3>编辑组织</h3>
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
        <label class="org-field">
          <span class="org-field__label">
            <span>组织名称</span>
            <em>*</em>
          </span>
          <input v-model="state.name" type="text" maxlength="20" placeholder="请输入组织名称" />
        </label>
      </div>

      <footer class="org-modal__footer">
        <button type="button" class="org-button org-button--ghost" @click="emit('cancel')">取消</button>
        <button type="button" class="org-button" :disabled="submitting" @click="handleSubmit">
          {{ submitting ? '保存中...' : '确定' }}
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
  width: min(720px, 100%);
  min-height: 259px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(31, 35, 41, 0.18);
  overflow: hidden;
}

@media (min-width: 1520px) {
  .org-modal {
    width: min(820px, 100%);
  }
}

.org-modal__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 28px 24px 20px;
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
  padding: 0 24px 28px;
}

.org-field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: #1f2329;
}

.org-field__label em {
  font-style: normal;
  color: #ef4444;
}

.org-field input {
  width: 100%;
  height: 40px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #ffffff;
  padding: 0 12px;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 20px;
  color: #111827;
  outline: none;
}

.org-field input::placeholder {
  color: #9ca3af;
}

.org-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 28px;
}

.org-button {
  min-width: 72px;
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
