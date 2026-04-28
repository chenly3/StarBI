<script setup lang="ts">
defineProps<{
  visible: boolean
  targets: Array<{ id: string | number; name: string; canvasType: string }>
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'choose', target: { id: string | number; name: string; canvasType: string }): void
}>()
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="插入目标"
    width="640px"
    @update:model-value="value => emit('update:visible', value)"
  >
    <div class="sqlbot-insert-target-list">
      <button
        v-for="item in targets"
        :key="item.id"
        class="sqlbot-insert-target-item"
        type="button"
        @click="emit('choose', item)"
      >
        <strong>{{ item.name }}</strong>
        <span>{{ item.canvasType }}</span>
      </button>

      <div v-if="!targets.length" class="sqlbot-insert-target-empty">暂无可插入目标</div>
    </div>
  </el-dialog>
</template>

<style scoped lang="less">
.sqlbot-insert-target-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sqlbot-insert-target-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(214, 225, 245, 0.9);
  border-radius: 12px;
  background: #fff;
  color: #1d2b4f;
  padding: 12px 14px;
  cursor: pointer;
}

.sqlbot-insert-target-empty {
  color: #667b9f;
  font-size: 14px;
  line-height: 1.6;
  padding: 12px 0;
}
</style>
