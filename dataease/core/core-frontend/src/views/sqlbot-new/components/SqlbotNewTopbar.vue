<script setup lang="ts">
import StarBILogo from '@/components/brand/StarBILogo.vue'

interface NavItem {
  key: string
  label: string
  path: string
}

defineProps<{
  activePath: string
  accountName: string
  navItems: NavItem[]
}>()

const emit = defineEmits<{
  (event: 'navigate', path: string): void
}>()
</script>

<template>
  <header class="sqlbot-new-topbar">
    <button class="topbar-brand" type="button" @click="emit('navigate', '/workbranch/index')">
      <StarBILogo class="topbar-brand-logo" :inverse="true" compact />
    </button>

    <nav class="topbar-nav">
      <button
        v-for="item in navItems"
        :key="item.key"
        class="topbar-nav-item"
        :class="{ active: activePath === item.path }"
        type="button"
        @click="emit('navigate', item.path)"
      >
        {{ item.label }}
      </button>
    </nav>

    <div class="topbar-user">
      <button class="topbar-icon" type="button" aria-label="下载">↓</button>
      <button class="topbar-icon" type="button" aria-label="导出">▣</button>
      <button class="topbar-account" type="button">
        <span class="account-avatar">管</span>
        <span class="account-name">{{ accountName }}</span>
        <span class="account-caret">▾</span>
      </button>
    </div>
  </header>
</template>

<style scoped lang="less">
.sqlbot-new-topbar {
  height: 64px;
  padding: 0 28px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
    linear-gradient(90deg, #0f58b8 0%, #1667cc 52%, #1075d5 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 10px 26px rgba(10, 71, 168, 0.16);
  font-family: 'Avenir Next', 'Segoe UI', var(--de-custom_font, 'PingFang'), sans-serif;
}

.topbar-brand {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  min-width: 168px;
}

.topbar-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.topbar-nav-item {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 0 18px;
  min-height: 40px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 15px;
  line-height: 20px;
  font-weight: 600;
  cursor: pointer;
  min-width: fit-content;
  transition: background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.topbar-nav-item:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.14);
}

.topbar-nav-item.active {
  background: rgba(255, 255, 255, 0.96);
  color: #1757c9;
  font-weight: 700;
  box-shadow: 0 10px 22px rgba(7, 37, 102, 0.22);
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: end;
}

.topbar-icon {
  border: none;
  background: transparent;
  color: #ffffff;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  opacity: 0.96;
  transition: background-color 0.16s ease;
}

.topbar-icon:hover {
  background: rgba(255, 255, 255, 0.14);
}

.topbar-account {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px 0 4px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 36px;
  transition: background-color 0.16s ease;
}

.topbar-account:hover {
  background: rgba(255, 255, 255, 0.24);
}

.account-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.account-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-caret {
  font-size: 12px;
  opacity: 0.92;
}

.topbar-brand-logo {
  --starbi-logo-fg: #ffffff;
  --starbi-logo-mark-bg: rgba(255, 255, 255, 0.14);
  --starbi-logo-mark-border: rgba(255, 255, 255, 0.2);
  --starbi-logo-mark-accent: linear-gradient(180deg, #ffffff, #dbeafe);
}
</style>
