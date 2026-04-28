<script lang="ts" setup>
defineProps({
  cardInfo: {
    type: Object,
    default() {
      return {
        name: '',
        icon: ''
      }
    }
  }
})
const emits = defineEmits(['openBlank'])
const openBlank = () => {
  emits('openBlank')
}
</script>

<template>
  <div class="doc-card" @click="openBlank">
    <div class="base-show">
      <Icon><component class="svg-icon item-top-icon" :is="cardInfo.icon"></component></Icon>
    </div>
    <div class="base-show show-content">{{ cardInfo.name }}</div>
  </div>
</template>

<style lang="less" scoped>
.doc-card {
  padding: 10px 8px;
  width: 98px;
  height: 74px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 12px;
  transition: background-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
  &:hover,
  &:active {
    background: rgba(42, 102, 255, 0.08);
    box-shadow: inset 0 0 0 1px rgba(42, 102, 255, 0.08);
    transform: translateY(-1px);
  }
}

.show-content {
  font-size: 14px;
  color: #1e3355;
  line-height: 20px;
  font-weight: 600;
  margin-top: 8px;
  text-align: center;
}

.item-top-icon {
  width: 24px;
  height: 24px;
  color: #2b67d6;
  fill: currentColor;
}
</style>
