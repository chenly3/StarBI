<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { IdType, OrgFormState, ParentOption } from '../types'

const props = defineProps<{
  visible: boolean
  modelValue: OrgFormState
  submitting: boolean
  parentLocked: boolean
  parentOptions: ParentOption[]
}>()

const emit = defineEmits<{
  (event: 'save', value: OrgFormState): void
  (event: 'cancel'): void
}>()

const state = reactive<OrgFormState>({
  name: '',
  pid: ''
})

watch(
  () => props.modelValue,
  value => {
    state.id = value?.id
    state.name = value?.name || ''
    state.pid = value?.pid ?? ''
  },
  { deep: true, immediate: true }
)

const selectedParentLabel = computed(() => {
  const matched = props.parentOptions.find(item => String(item.value) === String(state.pid))
  return matched?.label || '请选择上级组织(默认根组织)'
})

const handleSubmit = () => {
  emit('save', {
    id: state.id,
    name: state.name,
    pid: state.pid === '' ? '' : (state.pid as IdType)
  })
}
</script>

<template>
  <div v-if="visible" class="org-modal-mask" @click.self="emit('cancel')">
    <div class="org-modal">
      <header class="org-modal__header">
        <h3>添加组织</h3>
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

        <label class="org-field">
          <span class="org-field__label">上级组织</span>
          <div v-if="parentLocked" class="org-select org-select--readonly">
            <span>{{ selectedParentLabel }}</span>
          </div>
          <div v-else class="org-select">
            <select v-model="state.pid">
              <option value="">请选择上级组织(默认根组织)</option>
              <option v-for="option in parentOptions" :key="option.value" :value="String(option.value)">
                {{ option.label }}
              </option>
            </select>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4.47 6.97a.75.75 0 0 1 1.06 0L8 9.44l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
              />
            </svg>
          </div>
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
  min-height: 347px;
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

.org-field + .org-field {
  margin-top: 24px;
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

.org-field input,
.org-select {
  width: 100%;
  height: 40px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #ffffff;
  box-sizing: border-box;
}

.org-field input {
  padding: 0 12px;
  font-size: 14px;
  line-height: 20px;
  color: #111827;
  outline: none;
}

.org-field input::placeholder {
  color: #9ca3af;
}

.org-select {
  position: relative;
  display: flex;
  align-items: center;
}

.org-select select {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 36px 0 12px;
  font-size: 14px;
  line-height: 20px;
  color: #111827;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
}

.org-select svg {
  position: absolute;
  right: 12px;
  width: 16px;
  height: 16px;
  color: #94a3b8;
  pointer-events: none;
}

.org-select--readonly {
  padding: 0 12px;
  color: #111827;
  font-size: 14px;
  line-height: 20px;
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

.org-button--ghost {
  border: 1px solid #d0d5dd;
  background: #ffffff;
  color: #1f2329;
}

.org-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.org-button--ghost {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;
}
</style>
