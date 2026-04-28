<script setup lang="ts">
import { computed } from 'vue'
import type { ImportResultState } from '../types'

const props = withDefaults(
  defineProps<{
    visible: boolean
    result: ImportResultState | null
    downloadingErrors?: boolean
  }>(),
  {
    downloadingErrors: false
  }
)

const emit = defineEmits<{
  (e: 'download-errors', key?: string): void
  (e: 'back'): void
  (e: 'continue-import'): void
}>()

const hasErrors = computed(() => (props.result?.errorCount || 0) > 0)
const title = computed(() => (hasErrors.value ? '数据导入失败' : '数据导入成功'))
</script>

<template>
  <div v-if="visible" class="user-import-result-mask" @click.self="emit('back')">
    <section class="user-import-result">
      <div class="user-import-result__icon" :class="{ 'is-success': !hasErrors }">
        {{ hasErrors ? '×' : '✓' }}
      </div>
      <h2>{{ title }}</h2>
      <p>成功导入数据 {{ result?.successCount || 0 }} 条， 导入失败 {{ result?.errorCount || 0 }} 条</p>
      <p v-if="hasErrors" class="user-import-result__download-line">
        可
        <button type="button" :disabled="downloadingErrors" @click="emit('download-errors', result?.dataKey)">
          {{ downloadingErrors ? '下载中...' : '下载错误报告' }}
        </button>
        ，修改后重新导入
      </p>
      <footer class="user-import-result__actions">
        <button type="button" class="user-import-result__ghost" @click="emit('back')">返回查看</button>
        <button type="button" class="user-import-result__primary" @click="emit('continue-import')">继续导入</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.user-import-result-mask {
  position: fixed;
  inset: 0;
  background: rgb(15 23 42 / 36%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.user-import-result {
  width: min(560px, calc(100vw - 24px));
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px 22px;
  box-shadow: 0 24px 64px rgb(27 44 79 / 18%);
}

@media (min-width: 1520px) {
  .user-import-result {
    width: min(620px, calc(100vw - 48px));
  }
}

.user-import-result__icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffe7e7;
  color: #ef4444;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  line-height: 1;
  font-weight: 300;
}

.user-import-result__icon.is-success {
  background: #e7f9ef;
  color: #18a55b;
}

.user-import-result h2 {
  margin: 18px 0 14px;
  font-size: 18px;
  color: #1c2740;
}

.user-import-result p {
  margin: 0;
  color: #4b5b78;
  font-size: 15px;
  line-height: 1.8;
}

.user-import-result__download-line button {
  border: none;
  background: transparent;
  color: #3368e8;
  cursor: pointer;
  padding: 0;
  font-weight: 600;
}

.user-import-result__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
}

.user-import-result__ghost,
.user-import-result__primary {
  height: 42px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.user-import-result__ghost {
  border: 1px solid #d8e0ef;
  background: #fff;
  color: #33415c;
}

.user-import-result__primary {
  border: 1px solid #3368e8;
  background: #3368e8;
  color: #fff;
  font-weight: 600;
}
</style>
