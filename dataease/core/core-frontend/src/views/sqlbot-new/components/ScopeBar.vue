<template>
  <div class="scope-bar">
    <div class="scope-bar__info">
      <div class="scope-bar__theme-icon">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <div class="scope-bar__text">
        <span class="scope-bar__theme-name">{{ themeName || '未选择主题' }}</span>
        <span class="scope-bar__separator">·</span>
        <span class="scope-bar__dataset">{{ datasetName || '--' }}</span>
        <template v-if="timeRange">
          <span class="scope-bar__separator">·</span>
          <span class="scope-bar__timerange">{{ timeRange }}</span>
        </template>
        <span v-if="dashboardName" class="scope-bar__badge">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          {{ dashboardName }}
        </span>
      </div>
    </div>
    <button class="scope-bar__switch" @click="$emit('switch')">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
      切换主题
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  themeName?: string
  datasetName?: string
  timeRange?: string
  dashboardName?: string
}>()

defineEmits<{
  switch: []
}>()
</script>

<style scoped>
.scope-bar {
  display: flex;
  min-height: 40px;
  padding: 8px 16px;
  background: rgb(30 64 175 / 6%);
  border-bottom: 1px solid rgb(30 64 175 / 12%);
  align-items: center;
  justify-content: space-between;
}

.scope-bar__info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.scope-bar__theme-icon {
  display: flex;
  align-items: center;
  color: #1e40af;
  flex-shrink: 0;
}

.scope-bar__text {
  display: flex;
  min-width: 0;
  font-size: 13px;
  color: #475569;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.scope-bar__theme-name {
  font-weight: 600;
  color: #1e3a8a;
  white-space: nowrap;
}

.scope-bar__dataset {
  white-space: nowrap;
}

.scope-bar__separator {
  color: #cbd5e1;
  user-select: none;
}

.scope-bar__timerange {
  color: #64748b;
  white-space: nowrap;
}

.scope-bar__badge {
  display: inline-flex;
  padding: 2px 8px;
  font-size: 11px;
  color: #1e40af;
  white-space: nowrap;
  background: rgb(30 64 175 / 10%);
  border-radius: 10px;
  align-items: center;
  gap: 4px;
}

.scope-bar__switch {
  display: flex;
  padding: 4px 12px;
  font-family: inherit;
  font-size: 12px;
  color: #1e40af;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgb(30 64 175 / 20%);
  border-radius: 6px;
  transition: all 200ms ease-out;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.scope-bar__switch:hover {
  background: rgb(30 64 175 / 10%);
  border-color: rgb(30 64 175 / 40%);
}

.scope-bar__switch:active {
  transform: scale(0.97);
}
</style>
