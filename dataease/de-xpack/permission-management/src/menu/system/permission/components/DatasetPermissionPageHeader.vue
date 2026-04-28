<script setup lang="ts">
defineProps<{
  datasetName: string
}>()

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <header class="dataset-permission-page-header">
    <button type="button" class="dataset-permission-page-header__back" @click="emit('back')">
      返回问数资源管理
    </button>
    <div class="dataset-permission-page-header__title">{{ datasetName || '未命名数据集' }}</div>
  </header>
</template>

<style scoped>
.dataset-permission-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-height: 48px;
  padding: 8px 10px 8px 12px;
  border: 1px solid #e7edf7;
  border-radius: 12px;
  background: #f8fbff;
  box-sizing: border-box;
}

.dataset-permission-page-header__back {
  border: none;
  background: transparent;
  color: #2f6bff;
  font-size: 14px;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
}

.dataset-permission-page-header__title {
  color: #0f172a;
  font-size: 17px;
  line-height: 24px;
  font-weight: 700;
  flex: 1 1 420px;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
