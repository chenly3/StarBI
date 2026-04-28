<script lang="ts" setup>
import StarBILogo from '@/components/brand/StarBILogo.vue'

defineProps<{
  navigate?: string
}>()

const emit = defineEmits<{
  (event: 'click'): void
}>()
</script>

<template>
  <div class="header-brand">
    <button class="header-brand-button" type="button" @click="emit('click')">
      <img v-if="navigate" class="header-brand-image" :src="navigate" alt="" />
      <StarBILogo v-else class="logo" :inverse="true" compact />
    </button>
  </div>
</template>

<style lang="less" scoped>
.header-brand {
  display: flex;
  align-items: center;
  height: 64px;
  min-width: 168px;
}

.header-brand-button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  height: 64px;
  min-width: 168px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  justify-self: start;
}

.header-brand-image {
  display: block;
  height: 34px;
  width: auto;
  object-fit: contain;
}

.header-brand-button :deep(.starbi-logo.compact) {
  display: inline-flex;
  gap: 8px;
  height: 64px;
  align-items: center;
  transform: translateY(1px);
}

.header-brand-button :deep(.starbi-logo.compact .starbi-text) {
  font-size: 22px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.header-brand-button :deep(.starbi-logo.compact .starbi-mark) {
  display: inline-flex;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: center;
}

.header-brand-button :deep(.starbi-logo) {
  --starbi-logo-fg: #ffffff;
  --starbi-logo-mark-bg: transparent;
  --starbi-logo-mark-border: rgba(255, 255, 255, 0.92);
  --starbi-logo-mark-accent: linear-gradient(180deg, #ffffff, #ffffff);
}

.header-brand-button :deep(.starbi-logo.compact .mark-surface) {
  inset: 5px;
  border-radius: 2px;
  background: transparent;
}

.header-brand-button :deep(.starbi-logo.compact .mark-bar) {
  width: 4px;
  bottom: 5px;
  border-radius: 1px;
  box-shadow: none;
}

.header-brand-button :deep(.starbi-logo.compact .mark-bar-1) {
  left: 7px;
  height: 8px;
}

.header-brand-button :deep(.starbi-logo.compact .mark-bar-2) {
  left: 13px;
  height: 14px;
}

.header-brand-button :deep(.starbi-logo.compact .mark-bar-3) {
  left: 19px;
  height: 11px;
}

.header-brand-button :deep(.starbi-logo.compact .mark-dot) {
  display: none;
}
</style>
