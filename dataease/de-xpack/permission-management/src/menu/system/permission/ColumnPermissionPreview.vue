<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router_2'
import StaticTopHeader from './components/StaticTopHeader.vue'
import ColumnPermissionDialog from './components/ColumnPermissionDialog.vue'
import { useDatasetPermissionContext } from './useDatasetPermissionContext'

const route = useRoute()
const { datasetName } = useDatasetPermissionContext()
const dialogVisible = ref(false)
const maskVisible = ref(false)

watchEffect(() => {
  dialogVisible.value = route.query.dialog === 'column'
  maskVisible.value = route.query.mask === '1'
})
</script>

<template>
  <div class="screen">
    <StaticTopHeader org-name="docs" active-nav="数据准备" />

    <div class="layout">
      <aside class="dataset-side">
        <div class="dataset-side__header">
          <span>数据集</span>
          <span class="dataset-side__plus">＋</span>
        </div>
        <div class="search-box"><span>⌕</span><span>搜索</span></div>
        <div class="dataset-item is-active">
          <span class="dataset-item__icon"></span>
          <span>公有云账单集合</span>
        </div>
      </aside>

      <main class="content">
        <div class="content__inner">
          <div class="page-head">
            <div>
              <h1>公有云账单集合</h1>
              <p>创建人:系统管理员 <span>ⓘ</span></p>
            </div>
            <div class="page-actions">
              <button type="button" class="ghost-btn">▦ 新建仪表板</button>
              <button type="button" class="ghost-btn">▣ 新建数据大屏</button>
              <button type="button" class="primary-btn">✎ 编辑</button>
            </div>
          </div>

          <div class="dataset-context">当前数据集：{{ datasetName || '未命名数据集' }}</div>

          <div class="tab-switch">
            <button type="button">数据预览</button>
            <button type="button">结构预览</button>
            <button type="button" disabled>行权限</button>
            <button type="button" class="is-active">列权限</button>
          </div>

          <section class="panel">
            <button type="button" class="add-btn" @click="dialogVisible = true">＋ 添加</button>

            <div class="table-head">
              <span>类型</span>
              <span>受限对象</span>
              <span>白名单</span>
              <span>操作</span>
            </div>

            <div class="empty-state">
              <div class="empty-state__icon"></div>
              <div class="empty-state__text">暂无数据</div>
            </div>
          </section>
        </div>
      </main>
    </div>

    <ColumnPermissionDialog
      :visible="dialogVisible"
      :mask-visible="maskVisible"
      @close="dialogVisible = false"
      @open-mask="maskVisible = true"
      @close-mask="maskVisible = false"
    />
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

.dataset-side {
  background: rgba(255, 255, 255, 0.92);
  border-right: 1px solid #eef2f7;
  padding: 16px 0;
}

.dataset-side__header {
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}

.dataset-side__plus {
  color: #2f6bff;
  font-size: 20px;
}

.search-box {
  height: 42px;
  margin: 18px 16px 16px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #98a2b3;
  font-size: 14px;
}

.dataset-item {
  height: 38px;
  padding: 0 14px;
  margin-right: -1px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #344054;
  font-size: 14px;
}

.dataset-item.is-active {
  background: #eef4ff;
  box-shadow: inset 3px 0 0 #2f6bff, inset -1px 0 0 #2f6bff, inset 0 -1px 0 #2f6bff,
    inset 0 1px 0 #2f6bff;
  color: #2f6bff;
  font-weight: 600;
}

.dataset-item__icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: #2f6bff;
}

.content {
  padding: 18px 24px 30px;
}

.content__inner {
  width: min(1624px, calc(100vw - 322px));
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}

.page-head h1 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  line-height: 28px;
  font-weight: 700;
}

.page-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 14px;
}

.page-actions {
  display: inline-flex;
  gap: 12px;
}

.dataset-context {
  margin-top: 8px;
  color: #475467;
  font-size: 14px;
  font-weight: 500;
}

.ghost-btn,
.primary-btn,
.add-btn {
  height: 40px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.ghost-btn {
  border: 1px solid #d7deea;
  background: #ffffff;
  color: #344054;
}

.primary-btn {
  border: none;
  background: #2f6bff;
  color: #ffffff;
}

.tab-switch {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 30px 0 18px;
}

.tab-switch button,
.tab-switch a {
  height: 44px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 16px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.tab-switch button.is-active,
.tab-switch a.is-active {
  color: #2f6bff;
  font-weight: 700;
}

.tab-switch button:disabled,
.tab-switch a:disabled {
  color: #c3cad8;
  cursor: not-allowed;
}

.panel {
  min-height: 426px;
  border: 1px solid #e8edf5;
  border-radius: 12px;
  background: #ffffff;
  padding: 22px 24px;
  box-sizing: border-box;
}

.add-btn {
  border: 1px solid #d7deea;
  background: #ffffff;
  color: #344054;
}

.table-head {
  height: 44px;
  margin-top: 22px;
  padding: 0 16px;
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr 100px;
  align-items: center;
  background: #f6f8fb;
  color: #344054;
  font-size: 14px;
  font-weight: 600;
}

.empty-state {
  height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #98a2b3;
}

.empty-state__icon {
  width: 58px;
  height: 58px;
  position: relative;
}

.empty-state__icon::before,
.empty-state__icon::after {
  content: '';
  position: absolute;
  border-radius: 12px;
  background: #eef3fb;
}

.empty-state__icon::before {
  inset: 8px 10px;
  border: 2px solid #d7deea;
  background: transparent;
}

.empty-state__icon::after {
  width: 18px;
  height: 2px;
  left: 20px;
  bottom: 14px;
  background: #c3cad8;
  box-shadow: 0 -8px 0 #c3cad8, 0 -16px 0 #c3cad8;
}

.empty-state__text {
  font-size: 14px;
}
</style>
