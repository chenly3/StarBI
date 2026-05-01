<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

export interface SystemSelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null
    options?: SystemSelectOption[]
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    options: () => [],
    placeholder: '请选择',
    disabled: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
  (e: 'change', value: string | number | null): void
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

const selectedOption = computed(() =>
  props.options.find(option => String(option.value) === String(props.modelValue ?? ''))
)

const displayText = computed(() => selectedOption.value?.label || props.placeholder)

const removeGlobalListeners = () => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', updateDropdownPosition, true)
}

const close = () => {
  open.value = false
  removeGlobalListeners()
}

const onDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node
  if (!rootRef.value?.contains(target) && !dropdownRef.value?.contains(target)) {
    close()
  }
}

const updateDropdownPosition = () => {
  const rect = rootRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }
  dropdownStyle.value = {
    top: `${rect.bottom + 6}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`
  }
}

const toggle = () => {
  if (props.disabled) {
    return
  }
  open.value = !open.value
  if (open.value) {
    void nextTick(updateDropdownPosition)
    document.addEventListener('click', onDocumentClick)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', updateDropdownPosition, true)
  } else {
    removeGlobalListeners()
  }
}

const selectOption = (option: SystemSelectOption) => {
  if (option.disabled) {
    return
  }
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

onBeforeUnmount(() => {
  removeGlobalListeners()
})
</script>

<template>
  <div
    ref="rootRef"
    class="system-select"
    :class="{ 'is-open': open, 'is-disabled': disabled, 'is-placeholder': !selectedOption }"
  >
    <button type="button" class="system-select__trigger" :disabled="disabled" @click.stop="toggle">
      <span class="system-select__text">{{ displayText }}</span>
      <span class="system-select__arrow" aria-hidden="true"></span>
    </button>
    <Teleport to="body">
      <div v-if="open" ref="dropdownRef" class="system-select__dropdown" :style="dropdownStyle">
        <button
          v-for="option in options"
          :key="String(option.value)"
          type="button"
          class="system-select__option"
          :class="{
            'is-selected': String(option.value) === String(modelValue ?? ''),
            'is-disabled': option.disabled
          }"
          :disabled="option.disabled"
          @click.stop="selectOption(option)"
        >
          <span>{{ option.label }}</span>
          <span
            v-if="String(option.value) === String(modelValue ?? '')"
            class="system-select__check"
            aria-hidden="true"
          ></span>
        </button>
        <div v-if="!options.length" class="system-select__empty">暂无选项</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.system-select {
  position: relative;
  width: 100%;
  color: #162033;
  font-size: 15px;
  line-height: 22px;
}

.system-select__trigger {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #cfd8e8;
  border-radius: 11px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background-color 0.16s ease;
}

.system-select__trigger:hover,
.system-select.is-open .system-select__trigger {
  border-color: #6f99ff;
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.12);
}

.system-select.is-disabled .system-select__trigger {
  cursor: not-allowed;
  background: #f3f6fb;
  color: #7b8799;
}

.system-select.is-placeholder .system-select__text {
  color: #7b8799;
}

.system-select__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-select__arrow {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-right: 1.8px solid #5f6f86;
  border-bottom: 1.8px solid #5f6f86;
  transform: rotate(45deg) translateY(-2px);
  transition: transform 0.16s ease;
}

.system-select.is-open .system-select__arrow {
  transform: rotate(225deg) translate(-2px, -1px);
}

.system-select__dropdown {
  position: fixed;
  z-index: 3000;
  max-height: 280px;
  padding: 7px;
  border: 1px solid #d4deec;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
  overflow: auto;
  box-sizing: border-box;
}

.system-select__option {
  width: 100%;
  min-height: 40px;
  padding: 8px 11px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #1f2a44;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.system-select__option:hover {
  background: #f3f7ff;
  color: #1f5eff;
}

.system-select__option.is-selected {
  background: #eaf2ff;
  color: #1f5eff;
  font-weight: 600;
}

.system-select__option.is-disabled {
  cursor: not-allowed;
  color: #a4afbf;
  background: transparent;
}

.system-select__check {
  width: 12px;
  height: 7px;
  flex: 0 0 auto;
  border-left: 2px solid #1f5eff;
  border-bottom: 2px solid #1f5eff;
  transform: rotate(-45deg) translateY(-1px);
}

.system-select__empty {
  min-height: 38px;
  padding: 9px 11px;
  color: #7b8799;
  font-size: 15px;
  line-height: 20px;
}
</style>
