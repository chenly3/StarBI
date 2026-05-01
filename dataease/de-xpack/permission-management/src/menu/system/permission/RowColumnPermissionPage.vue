<script setup lang="ts">
import DatasetDataPanel from './DatasetDataPanel.vue'
import ColumnPermissionPanel from './ColumnPermissionPanel.vue'
import RowPermissionPanel from './RowPermissionPanel.vue'
import DatasetTreePanel from './components/DatasetTreePanel.vue'
import DatasetPermissionPageHeader from './components/DatasetPermissionPageHeader.vue'
import { useDatasetPermissionContext } from './useDatasetPermissionContext'
import '@/views/system/shared/system-setting-page.less'

const { activeTab, datasetName, backToResources, setActiveTab } = useDatasetPermissionContext()
</script>

<template>
  <main class="system-setting-page system-setting-standard row-column-permission-page">
    <section class="system-setting-page__content row-column-permission-page__shell">
      <header class="system-setting-page__title-row">
        <h1 class="system-setting-page__title">行列权限配置</h1>
      </header>

      <div class="row-column-permission-page__layout">
        <DatasetTreePanel />
        <section class="row-column-permission-page__content">
          <DatasetPermissionPageHeader :dataset-name="datasetName" @back="backToResources" />
          <div class="page-tab-switch">
            <button
              type="button"
              :class="{ 'is-active': activeTab === 'preview' }"
              @click="setActiveTab('preview')"
            >
              数据预览
            </button>
            <button
              type="button"
              :class="{ 'is-active': activeTab === 'structure' }"
              @click="setActiveTab('structure')"
            >
              数据结构
            </button>
            <button
              type="button"
              :class="{ 'is-active': activeTab === 'row' }"
              @click="setActiveTab('row')"
            >
              行权限
            </button>
            <button
              type="button"
              :class="{ 'is-active': activeTab === 'column' }"
              @click="setActiveTab('column')"
            >
              列权限
            </button>
          </div>

          <DatasetDataPanel v-if="activeTab === 'preview'" mode="preview" />
          <DatasetDataPanel v-else-if="activeTab === 'structure'" mode="structure" />
          <RowPermissionPanel v-else-if="activeTab === 'row'" />
          <ColumnPermissionPanel v-else />
        </section>
      </div>
    </section>
  </main>
</template>

<style scoped>
.row-column-permission-page {
  min-height: 0;
  height: 100%;
  background: transparent;
  overflow: hidden;
}

.row-column-permission-page__shell {
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.row-column-permission-page__layout {
  min-height: 0;
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  align-items: stretch;
  gap: 12px;
  overflow: hidden;
}

.row-column-permission-page__content {
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #dde6f2;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
  overflow: hidden;
}

.page-tab-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 3px;
  width: fit-content;
  max-width: 100%;
  border: 1px solid #dfe7f3;
  border-radius: 999px;
  background: #edf3fb;
}

.page-tab-switch button {
  height: 34px;
  min-width: 92px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #667085;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.page-tab-switch button.is-active {
  background: #ffffff;
  color: #2f6bff;
  box-shadow: 0 1px 4px rgba(31, 68, 143, 0.12);
}

@media (max-width: 1180px) {
  .row-column-permission-page__layout {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .row-column-permission-page__content {
    padding: 10px;
    gap: 10px;
  }
}
</style>
