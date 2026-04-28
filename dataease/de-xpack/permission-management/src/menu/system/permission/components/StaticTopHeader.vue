<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    orgName: string
    activeNav?: '工作台' | '仪表板' | '数据大屏' | '数据准备'
  }>(),
  {
    activeNav: undefined
  }
)

const navItems = ['工作台', '仪表板', '数据大屏', '数据准备'] as const
</script>

<template>
  <header class="static-top-header">
    <div class="brand">
      <div class="brand__mark">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="brand__text">DataEase</span>
    </div>

    <nav class="nav">
      <button
        v-for="item in navItems"
        :key="item"
        type="button"
        class="nav__item"
        :class="{ 'is-active': props.activeNav === item }"
      >
        {{ item }}
        <span v-if="item === '数据准备'" class="nav__arrow">⌄</span>
      </button>
    </nav>

    <div class="ops">
      <button type="button" class="ops__org">
        {{ orgName }}
        <span>⌄</span>
      </button>
      <span class="ops__icon">?</span>
      <span class="ops__icon">⚙</span>
      <span class="ops__avatar">系</span>
      <button type="button" class="ops__user">
        系统管理员
        <span>⌄</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.static-top-header {
  height: 60px;
  padding: 0 16px;
  display: grid;
  grid-template-columns: 160px 1fr auto;
  align-items: center;
  gap: 24px;
  background: #151c2f;
  box-sizing: border-box;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #ffffff;
}

.brand__mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #2f6bff;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.brand__mark::before {
  content: '';
  width: 18px;
  height: 12px;
  border: 2px solid #ffffff;
  border-top-width: 4px;
  border-radius: 3px;
  transform: skewY(-22deg);
  position: absolute;
}

.brand__mark span {
  position: absolute;
  width: 12px;
  height: 2px;
  background: #ffffff;
  border-radius: 999px;
}

.brand__mark span:nth-child(1) {
  top: 9px;
}

.brand__mark span:nth-child(2) {
  top: 14px;
}

.brand__mark span:nth-child(3) {
  top: 19px;
}

.brand__text {
  font-size: 18px;
  line-height: 24px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.nav__item {
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: default;
}

.nav__item.is-active {
  background: #2f6bff;
}

.nav__arrow {
  font-size: 12px;
}

.ops {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  color: #ffffff;
  justify-self: end;
}

.ops__org,
.ops__user {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  cursor: default;
}

.ops__icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 700;
}

.ops__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2f6bff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}
</style>
