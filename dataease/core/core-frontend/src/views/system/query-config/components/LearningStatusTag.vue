<template>
  <span class="learning-status-tag" :class="`is-${tone}`">
    <span class="learning-status-tag__dot"></span>
    {{ status }}
  </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const tone = computed(() => {
  if (props.status.includes('成功') || props.status.includes('完成')) {
    return 'success'
  }
  if (props.status.includes('失败')) {
    return 'danger'
  }
  if (props.status.includes('学习中') || props.status.includes('执行中')) {
    return 'processing'
  }
  return 'default'
})
</script>

<style lang="less" scoped>
.learning-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #475467;
  font-size: 15px;
  line-height: 24px;
  font-weight: 600;
}

.learning-status-tag__dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: currentColor;
}

.learning-status-tag.is-success {
  color: #1f9d57;
}

.learning-status-tag.is-danger {
  color: #d92d20;
}

.learning-status-tag.is-processing {
  color: #2f6bff;
}
</style>
