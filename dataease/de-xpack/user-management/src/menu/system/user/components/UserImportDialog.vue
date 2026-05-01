<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const MAX_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])

const props = withDefaults(
  defineProps<{
    visible: boolean
    submitting?: boolean
  }>(),
  {
    submitting: false
  }
)

const emit = defineEmits<{
  (e: 'download-template'): void
  (e: 'submit', file: File): void
  (e: 'cancel'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

const isExcelFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  const typeMatched = !file.type || ACCEPTED_TYPES.has(file.type)
  const extMatched = lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')
  return typeMatched && extMatched
}

const clearSelection = () => {
  selectedFile.value = null
  if (inputRef.value) {
    inputRef.value.value = ''
  }
}

const validateFile = (file: File): boolean => {
  if (!isExcelFile(file)) {
    window.alert('仅支持 Excel 文件（.xls 或 .xlsx）。')
    return false
  }
  if (file.size > MAX_SIZE) {
    window.alert('文件大小不能超过 10M。')
    return false
  }
  return true
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    clearSelection()
    return
  }
  if (!validateFile(file)) {
    clearSelection()
    return
  }
  selectedFile.value = file
}

const triggerPick = () => {
  if (props.submitting) {
    return
  }
  inputRef.value?.click()
}

const submit = () => {
  if (!selectedFile.value) {
    window.alert('请选择需要导入的 Excel 文件。')
    return
  }
  if (!validateFile(selectedFile.value)) {
    clearSelection()
    return
  }
  emit('submit', selectedFile.value)
}

const uploadLabel = computed(() =>
  selectedFile.value ? `已选择 ${selectedFile.value.name}` : '点击选择文件'
)

watch(
  () => props.visible,
  visible => {
    if (!visible) {
      clearSelection()
    }
  }
)
</script>

<template>
  <div v-if="visible" class="user-import-dialog-mask" @click.self="emit('cancel')">
    <section class="user-import-dialog">
      <header class="user-import-dialog__header">
        <h2>批量导入</h2>
        <button type="button" class="user-import-dialog__close" @click="emit('cancel')">×</button>
      </header>

      <div class="user-import-dialog__banner">
        <span class="user-import-dialog__banner-icon">i</span>
        <span>
          请先
          <button type="button" @click="emit('download-template')">下载模版</button>
          ，按要求填写后上传
        </span>
      </div>

      <button type="button" class="user-import-dialog__picker" :disabled="submitting" @click="triggerPick">
        <span class="user-import-dialog__picker-icon">☁</span>
        <strong>{{ uploadLabel }}</strong>
        <small>仅支持xlsx、xls格式的文件</small>
      </button>

      <input
        ref="inputRef"
        class="user-import-dialog__input"
        type="file"
        :disabled="submitting"
        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        @change="onFileChange"
      />

      <footer class="user-import-dialog__actions">
        <button type="button" class="user-import-dialog__ghost" :disabled="submitting" @click="emit('cancel')">
          取消
        </button>
        <button
          type="button"
          class="user-import-dialog__primary"
          :disabled="submitting || !selectedFile"
          @click="submit"
        >
          {{ submitting ? '导入中...' : '导入' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.user-import-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgb(15 23 42 / 36%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.user-import-dialog {
  width: min(720px, calc(100vw - 24px));
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 64px rgb(27 44 79 / 18%);
}

@media (min-width: 1520px) {
  .user-import-dialog {
    width: min(820px, calc(100vw - 48px));
  }
}

.user-import-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-import-dialog__header h2 {
  margin: 0;
  font-size: 20px;
  color: #1c2740;
}

.user-import-dialog__close {
  border: none;
  background: transparent;
  color: #96a0b5;
  font-size: 28px;
  cursor: pointer;
}

.user-import-dialog__banner {
  margin-top: 18px;
  min-height: 52px;
  border-radius: 10px;
  border: 1px solid #cfe0ff;
  background: #eef5ff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  color: #3368e8;
  font-size: 15px;
}

.user-import-dialog__banner button {
  border: none;
  background: transparent;
  color: #3368e8;
  cursor: pointer;
  font-weight: 600;
}

.user-import-dialog__banner-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid currentColor;
  font-size: 12px;
  font-weight: 700;
}

.user-import-dialog__picker {
  width: 100%;
  margin-top: 22px;
  min-height: 160px;
  border: 1px solid #d8e0ef;
  border-radius: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  color: #8a94ab;
  cursor: pointer;
}

.user-import-dialog__picker-icon {
  font-size: 44px;
  line-height: 1;
}

.user-import-dialog__picker strong {
  color: #5e6b84;
  font-size: 26px;
  font-weight: 500;
}

.user-import-dialog__picker small {
  font-size: 15px;
}

.user-import-dialog__input {
  display: none;
}

.user-import-dialog__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 38px;
}

.user-import-dialog__ghost,
.user-import-dialog__primary {
  height: 42px;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
}

.user-import-dialog__ghost {
  border: 1px solid #d8e0ef;
  background: #fff;
  color: #33415c;
}

.user-import-dialog__primary {
  border: 1px solid #3368e8;
  background: #3368e8;
  color: #fff;
  font-weight: 600;
}

.user-import-dialog__primary:disabled,
.user-import-dialog__picker:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
