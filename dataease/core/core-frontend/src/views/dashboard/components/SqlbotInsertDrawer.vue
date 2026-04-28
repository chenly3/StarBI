<script setup lang="ts">
defineProps<{
  visible: boolean
  recentItems: Array<{
    snapshotId: string | number
    title: string
    selectionTitle?: string
    chartType?: string
  }>
  savedItems: Array<{
    id: string | number
    title: string
    selectionTitle?: string
    chartType?: string
  }>
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'selectRecent', snapshotId: string | number): void
  (event: 'selectSaved', resourceId: string | number): void
}>()
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="插入问数图表"
    size="520px"
    @update:model-value="value => emit('update:visible', value)"
  >
    <div class="sqlbot-insert-section">
      <h3>最近问数结果</h3>
      <button
        v-for="item in recentItems"
        :key="item.snapshotId"
        class="sqlbot-insert-item"
        type="button"
        @click="emit('selectRecent', item.snapshotId)"
      >
        <strong>{{ item.title }}</strong>
        <span>{{ item.selectionTitle || item.chartType || '最近结果' }}</span>
      </button>
    </div>
    <div class="sqlbot-insert-section">
      <h3>已保存问数图表资源</h3>
      <button
        v-for="item in savedItems"
        :key="item.id"
        class="sqlbot-insert-item"
        type="button"
        @click="emit('selectSaved', item.id)"
      >
        <strong>{{ item.title }}</strong>
        <span>{{ item.selectionTitle || item.chartType || '已保存资源' }}</span>
      </button>
    </div>
  </el-drawer>
</template>

<style scoped lang="less">
.sqlbot-insert-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.sqlbot-insert-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  border: 1px solid rgba(214, 225, 245, 0.9);
  border-radius: 12px;
  background: #fff;
  color: #1d2b4f;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
}
</style>
