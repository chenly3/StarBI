<script setup lang="ts">
import { useRoute, useRouter } from './useHashRoute'
import StaticTopHeader from './components/StaticTopHeader.vue'

const router = useRouter()
const route = useRoute()

const groups = ['仪表板', '数据大屏', '数据集', '数据源']
const rows = [
  { name: 'docs_admin', checked: [false, false, true, true] },
  { name: 'docs_demo', checked: [false, false, false, false] }
]

const openUserView = () => {
  if (!route.path.startsWith('/prototype/permission/')) {
    window.location.hash = '#/sys-setting/permission?mode=by-user&tab=menu'
    return
  }
  void router.push('/prototype/permission/user')
}
</script>

<template>
  <div class="screen">
    <StaticTopHeader org-name="演示组织" />

    <div class="layout">
      <aside class="sidebar">
        <div class="side-item">
          <span class="side-item__icon user"></span>
          <span>用户管理</span>
        </div>
        <div class="side-item">
          <span class="side-item__icon org"></span>
          <span>组织管理</span>
        </div>
        <div class="side-item is-active">
          <span class="side-item__icon lock"></span>
          <span>权限配置</span>
        </div>
      </aside>

      <main class="content">
        <div class="content__inner">
          <h1 class="page-title">权限配置</h1>

          <div class="switch-row">
            <button type="button" class="switch-row__item" @click="openUserView">按用户配置</button>
            <button type="button" class="switch-row__item is-active">按资源配置</button>
          </div>

          <section class="panel">
            <div class="panel__toolbar">
              <div class="tab-row">
                <button type="button" class="tab-row__item is-active">资源权限</button>
                <button type="button" class="tab-row__item">菜单权限</button>
              </div>
              <div class="search-box"><span>⌕</span><span>搜索名称</span></div>
              <div class="tab-row tab-row--right">
                <button type="button" class="tab-row__item is-active">用户</button>
                <button type="button" class="tab-row__item">角色</button>
              </div>
              <button type="button" class="save-btn">保存</button>
            </div>

            <div class="panel__body">
              <div class="column column--groups">
                <div
                  v-for="group in groups"
                  :key="group"
                  class="group-item"
                  :class="{ 'is-active': group === '仪表板' }"
                >
                  {{ group }}
                </div>
              </div>

              <div class="column column--tree">
                <div class="tree-box">
                  <span class="tree-arrow">⌄</span>
                  <span class="node-icon"></span>
                  <span>仪表板</span>
                </div>
              </div>

              <div class="column column--table">
                <div class="search-box search-box--full"><span>⌕</span><span>搜索</span></div>

                <div class="table-card">
                  <div class="table-card__head">
                    <span class="name-col">名称</span>
                    <span>查看</span>
                    <span>导出</span>
                    <span>管理</span>
                    <span>授权</span>
                  </div>

                  <div v-for="row in rows" :key="row.name" class="table-card__row">
                    <div class="name-col">{{ row.name }}</div>
                    <span v-for="(checked, index) in row.checked" :key="index" class="check-cell">
                      <span class="checkbox" :class="{ 'is-checked': checked }"></span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.screen {
  min-height: 100vh;
  background: #f5f7fb;
}

.layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: calc(100vh - 60px);
}

.sidebar {
  background: rgba(255, 255, 255, 0.88);
  border-right: 1px solid #eef2f7;
  padding-top: 16px;
}

.side-item {
  height: 44px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
}

.side-item__icon {
  width: 16px;
  height: 16px;
  position: relative;
  color: #6b7280;
}

.side-item__icon.user::before,
.side-item__icon.user::after,
.side-item__icon.org::before,
.side-item__icon.org::after,
.side-item__icon.lock::before,
.side-item__icon.lock::after {
  content: '';
  position: absolute;
}

.side-item__icon.user::before {
  width: 6px;
  height: 6px;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  top: 0;
  left: 4px;
}

.side-item__icon.user::after {
  width: 12px;
  height: 6px;
  border: 1.5px solid currentColor;
  border-top: none;
  border-radius: 0 0 8px 8px;
  bottom: 1px;
  left: 1px;
}

.side-item__icon.org::before {
  inset: 2px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
}

.side-item__icon.org::after {
  width: 8px;
  height: 8px;
  inset: 4px;
  border: 1.5px dashed currentColor;
  border-radius: 50%;
}

.side-item__icon.lock::before {
  width: 10px;
  height: 8px;
  border: 1.5px solid currentColor;
  border-radius: 2px;
  bottom: 1px;
  left: 3px;
}

.side-item__icon.lock::after {
  width: 6px;
  height: 6px;
  border: 1.5px solid currentColor;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  top: 0;
  left: 5px;
}

.side-item.is-active {
  background: #eef4ff;
  box-shadow: inset 3px 0 0 #2f6bff;
  color: #2f6bff;
}

.content {
  padding: 18px 24px 30px;
}

.content__inner {
  width: min(1624px, calc(100vw - 322px));
}

.page-title {
  margin: 4px 0 24px;
  color: #111827;
  font-size: 18px;
  line-height: 28px;
  font-weight: 700;
}

.switch-row {
  width: 100%;
  max-width: 1180px;
  margin: 0 0 22px;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.switch-row__item {
  height: 46px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 16px;
  font-weight: 500;
}

.switch-row__item.is-active {
  color: #2f6bff;
  font-weight: 700;
}

.panel {
  width: 100%;
  background: #ffffff;
  border: 1px solid #e8edf5;
  border-radius: 12px;
  padding: 14px 16px 18px;
  box-sizing: border-box;
}

.panel__toolbar {
  display: grid;
  grid-template-columns: 220px minmax(280px, 1fr) 150px 78px;
  gap: 20px;
  align-items: center;
  margin-bottom: 14px;
}

.tab-row {
  display: inline-flex;
  gap: 28px;
  padding-left: 16px;
}

.tab-row--right {
  justify-content: flex-start;
}

.tab-row__item {
  height: 36px;
  border: none;
  background: transparent;
  color: #667085;
  font-size: 14px;
  font-weight: 600;
}

.tab-row__item.is-active {
  color: #2f6bff;
}

.search-box {
  height: 40px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #98a2b3;
  font-size: 14px;
  box-sizing: border-box;
}

.search-box--full {
  margin-bottom: 14px;
}

.save-btn {
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #c7ccd5;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.panel__body {
  display: grid;
  grid-template-columns: 220px 270px 1fr;
  gap: 30px;
  align-items: start;
}

.group-item {
  height: 36px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  color: #344054;
  font-size: 14px;
}

.group-item.is-active {
  background: #eaf2ff;
}

.tree-box {
  height: 42px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 4px;
  background: #eaf2ff;
  color: #2f6bff;
  font-size: 14px;
  font-weight: 600;
}

.tree-arrow {
  color: #344054;
  font-size: 12px;
}

.node-icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: #fdb022;
}

.table-card {
  border: 1px solid #e8edf5;
}

.table-card__head,
.table-card__row {
  display: grid;
  grid-template-columns: minmax(280px, 1.35fr) repeat(4, minmax(96px, 1fr));
  align-items: center;
}

.table-card__head {
  height: 44px;
  padding: 0 16px;
  background: #f6f8fb;
  color: #344054;
  font-size: 14px;
  font-weight: 600;
}

.table-card__row {
  min-height: 48px;
  padding: 0 16px;
  color: #344054;
  font-size: 14px;
  border-top: 1px solid #eef2f7;
}

.name-col {
  min-width: 0;
}

.table-card__head > span:not(.name-col),
.table-card__row > span:not(.name-col),
.table-card__row > div:not(.name-col) {
  justify-self: center;
}

.check-cell {
  display: flex;
  justify-content: center;
}

.checkbox {
  width: 22px;
  height: 22px;
  border: 1px solid #d7deea;
  border-radius: 6px;
  background: #ffffff;
  box-sizing: border-box;
}

.checkbox.is-checked {
  background: #f2f4f7;
  position: relative;
}

.checkbox.is-checked::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667085;
  font-size: 13px;
  font-weight: 700;
}
</style>
