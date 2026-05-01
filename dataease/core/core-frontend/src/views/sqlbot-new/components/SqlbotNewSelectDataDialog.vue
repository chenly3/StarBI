<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUpdated, ref, watch } from 'vue'
import type { FileCardItem } from '../types'

type DialogTab = 'dataset' | 'file'

interface DatasetItem {
  id: string
  title: string
  tone: 'blue' | 'green' | 'purple' | 'orange'
  badge: string
  fields: string[]
  metricFields?: string[]
  dimensionFields?: string[]
  fieldsLoaded?: boolean
  selectedPreview?: boolean
}

type FileItem = FileCardItem
type FieldPreviewItem = DatasetItem | FileItem

const props = defineProps<{
  visible: boolean
  activeTab: DialogTab
  datasetKeyword: string
  fileKeyword: string
  totalFileItems: number
  selectedDatasetId: string
  selectedDatasetTitle: string
  selectedDatasetDatasourceName: string
  selectedDatasetDatasourcePending: boolean
  selectedFileId: string
  selectedFileTitle: string
  datasetItems: DatasetItem[]
  fileItems: FileItem[]
}>()

const instance = getCurrentInstance()
const renderVisible = ref(props.visible)
const activeTabState = computed(() => props.activeTab)
const datasetKeywordState = computed(() => props.datasetKeyword)
const fileKeywordState = computed(() => props.fileKeyword)
const datasetItemsState = computed(() => props.datasetItems)
const fileItemsState = computed(() => props.fileItems)
const selectedDatasetIdState = computed(() => props.selectedDatasetId)
const selectedFileIdState = computed(() => props.selectedFileId)
const selectedDatasetDatasourcePendingState = computed(() => props.selectedDatasetDatasourcePending)

watch(
  () => props.visible,
  visible => {
    renderVisible.value = visible
  },
  { immediate: true }
)

watch(
  () => ({
    visible: props.visible,
    activeTab: props.activeTab,
    datasetCount: props.datasetItems.length,
    fileCount: props.fileItems.length
  }),
  state => {
    if (typeof window !== 'undefined') {
      ;(window as any).__sqlbotNewSelectDataDialogPropDebug = {
        ...state,
        at: Date.now()
      }
    }
  },
  { deep: true, immediate: true }
)

const updateRenderDebug = () => {
  if (typeof window === 'undefined') {
    return
  }
  const el = instance?.subTree?.el as HTMLElement | Comment | undefined
  ;(window as any).__sqlbotNewSelectDataDialogRenderDebug = {
    at: Date.now(),
    nodeName: el?.nodeName || '',
    nodeType: el?.nodeType || 0,
    className: (el as HTMLElement | undefined)?.className || '',
    text: el && 'textContent' in el ? String(el.textContent || '').slice(0, 200) : '',
    outerHTML:
      el && 'outerHTML' in el ? String((el as HTMLElement).outerHTML || '').slice(0, 400) : ''
  }
}

onMounted(() => {
  updateRenderDebug()
})

onUpdated(() => {
  updateRenderDebug()
})

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'change-tab', tab: DialogTab): void
  (event: 'search-dataset', keyword: string): void
  (event: 'search-file', keyword: string): void
  (event: 'open-dataset-preview', id: string): void
  (event: 'ask-dataset', id: string): void
  (event: 'select-dataset', id: string): void
  (event: 'select-file', id: string): void
  (event: 'confirm'): void
  (event: 'open-upload'): void
  (event: 'open-file-preview', id: string): void
  (event: 'ask-file', id: string): void
}>()

const datasetFilters = [{ key: 'all', label: '全部' }]

const METRIC_FIELD_PATTERNS = [
  '金额',
  '收入',
  '利润',
  '成本',
  '单价',
  '数量',
  '次数',
  'count',
  'amount',
  'price',
  'profit',
  'cost',
  'sales'
]

const DIMENSION_FIELD_PATTERNS = [
  '日期',
  '时间',
  '地区',
  '区域',
  '省份',
  '城市',
  '客户',
  '用户',
  '名称',
  '类型',
  '编号',
  'id',
  'date',
  'time',
  'name',
  'region',
  'city',
  'customer'
]

const selectedDataset = computed(() => {
  return props.selectedDatasetTitle
    ? { id: props.selectedDatasetId, title: props.selectedDatasetTitle }
    : null
})

const selectedFile = computed(() => {
  return props.selectedFileTitle
    ? { id: props.selectedFileId, title: props.selectedFileTitle }
    : null
})

const selectedSummary = computed(() => {
  if (props.activeTab === 'dataset') {
    if (!selectedDataset.value) {
      return ''
    }

    if (props.selectedDatasetDatasourceName) {
      return `已选：${selectedDataset.value.title} / 数据源：${props.selectedDatasetDatasourceName}`
    }

    if (props.selectedDatasetDatasourcePending) {
      return `已选：${selectedDataset.value.title} / 数据源：待确认`
    }

    return `已选：${selectedDataset.value.title}`
  }

  return selectedFile.value ? `已选：${selectedFile.value.title}` : ''
})

const hasFiles = computed(() => props.totalFileItems > 0)
const hasVisibleFiles = computed(() => props.fileItems.length > 0)

const inferMetricFields = (fields: string[]) => {
  return fields.filter(field =>
    METRIC_FIELD_PATTERNS.some(pattern => field.toLowerCase().includes(pattern.toLowerCase()))
  )
}

const inferDimensionFields = (fields: string[]) => {
  return fields.filter(field =>
    DIMENSION_FIELD_PATTERNS.some(pattern => field.toLowerCase().includes(pattern.toLowerCase()))
  )
}

const getMetricFields = (item: FieldPreviewItem) => {
  const explicitFields = (item.metricFields || []).filter(Boolean)
  if (explicitFields.length) {
    return explicitFields.slice(0, 3)
  }
  if (item.fieldsLoaded) {
    return []
  }

  const inferred = inferMetricFields(item.fields)
  return (inferred.length ? inferred : item.fields.slice(0, 2)).slice(0, 3)
}

const getDimensionFields = (item: FieldPreviewItem) => {
  const explicitFields = (item.dimensionFields || []).filter(Boolean)
  if (explicitFields.length) {
    return explicitFields.slice(0, 4)
  }
  if (item.fieldsLoaded) {
    return []
  }

  const inferred = inferDimensionFields(item.fields)
  const fallback = item.fields.filter(field => !getMetricFields(item).includes(field))
  return (inferred.length ? inferred : fallback).slice(0, 4)
}

const handleDatasetSelect = (id: string) => {
  emit('select-dataset', id)
}

const handleFileSelect = (id: string) => {
  emit('select-file', id)
}
</script>

<template>
  <div v-if="renderVisible" class="sqlbot-dialog-mask">
    <section
      class="select-data-dialog"
      :class="{
        'is-file': activeTabState === 'file',
        'is-file-empty': activeTabState === 'file' && !hasFiles
      }"
    >
      <header class="select-data-head">
        <div class="select-data-tabbar">
          <button
            class="select-data-tab"
            :class="{ active: activeTabState === 'dataset' }"
            type="button"
            @click="emit('change-tab', 'dataset')"
          >
            数据集
          </button>
          <button
            class="select-data-tab"
            :class="{ active: activeTabState === 'file' }"
            type="button"
            @click="emit('change-tab', 'file')"
          >
            数据文件
          </button>
        </div>

        <button class="dialog-close" type="button" @click="emit('close')">×</button>
      </header>

      <div class="select-data-body">
        <template v-if="activeTabState === 'dataset'">
          <div class="select-search-bar">
            <span class="search-icon">⌕</span>
            <input
              class="search-input"
              :value="datasetKeywordState"
              type="text"
              placeholder="搜索数据集名称、字段、标签"
              @input="emit('search-dataset', ($event.target as HTMLInputElement).value)"
            />
          </div>

          <div class="dialog-filter-row">
            <div class="filter-list">
              <button
                v-for="filter in datasetFilters"
                :key="filter.key"
                class="filter-chip"
                :class="{ active: filter.key === 'all' }"
                type="button"
              >
                {{ filter.label }}
              </button>
            </div>
          </div>

          <div class="dataset-grid">
            <button
              v-for="item in datasetItemsState"
              :key="item.id"
              class="dataset-card"
              :class="{ selected: selectedDatasetIdState === item.id }"
              type="button"
              @click="handleDatasetSelect(item.id)"
            >
              <div class="dataset-card-head">
                <div class="dataset-title-wrap">
                  <span class="dataset-badge" :class="`tone-${item.tone}`">{{ item.badge }}</span>
                  <span class="dataset-title">{{ item.title }}</span>
                </div>
              </div>

              <div class="dataset-fields">
                <div class="field-group">
                  <span class="field-group-label">关键指标</span>
                  <span
                    v-for="field in getMetricFields(item)"
                    :key="`dataset-metric-${item.id}-${field}`"
                    class="field-pill metric"
                  >
                    {{ field }}
                  </span>
                </div>
                <div class="field-group">
                  <span class="field-group-label">分析维度</span>
                  <span
                    v-for="field in getDimensionFields(item)"
                    :key="`dataset-dimension-${item.id}-${field}`"
                    class="field-pill dimension"
                  >
                    {{ field }}
                  </span>
                </div>
              </div>

              <div class="dataset-card-foot">
                <div class="dataset-card-actions">
                  <button
                    class="dataset-action ghost"
                    type="button"
                    @click.stop="emit('open-dataset-preview', item.id)"
                  >
                    预览
                  </button>
                  <button
                    class="dataset-action primary"
                    type="button"
                    @click.stop="emit('ask-dataset', item.id)"
                  >
                    提问
                  </button>
                </div>
                <span v-if="selectedDatasetIdState === item.id" class="dataset-check">
                  {{ '✓ 已选' }}
                </span>
              </div>
            </button>
          </div>
        </template>

        <template v-else>
          <template v-if="hasFiles">
            <div class="file-toolbar">
              <div class="select-search-bar compact">
                <span class="search-icon">⌕</span>
                <input
                  class="search-input"
                  :value="fileKeywordState"
                  type="text"
                  placeholder="搜索文件名称、格式、上传时间"
                  @input="emit('search-file', ($event.target as HTMLInputElement).value)"
                />
              </div>

              <button class="upload-file-button" type="button" @click="emit('open-upload')">
                ＋ 上传文件
              </button>
            </div>

            <div v-if="hasVisibleFiles" class="file-list">
              <article
                v-for="item in fileItemsState"
                :key="item.id"
                class="file-card"
                :class="{ selected: selectedFileIdState === item.id }"
                @click="handleFileSelect(item.id)"
              >
                <div class="file-card-head">
                  <div class="file-card-title-wrap">
                    <span class="file-card-title">{{ item.title }}</span>
                  </div>
                </div>

                <div class="file-fields">
                  <div class="field-group">
                    <span class="field-group-label">关键指标</span>
                    <span
                      v-for="field in getMetricFields(item)"
                      :key="`file-metric-${item.id}-${field}`"
                      class="field-pill light metric"
                    >
                      {{ field }}
                    </span>
                  </div>
                  <div class="field-group">
                    <span class="field-group-label">分析维度</span>
                    <span
                      v-for="field in getDimensionFields(item)"
                      :key="`file-dimension-${item.id}-${field}`"
                      class="field-pill light dimension"
                    >
                      {{ field }}
                    </span>
                  </div>
                </div>

                <div class="file-card-actions">
                  <button
                    class="file-action ghost"
                    type="button"
                    @click.stop="emit('open-file-preview', item.id)"
                  >
                    预览
                  </button>
                  <button
                    class="file-action primary"
                    type="button"
                    @click.stop="emit('ask-file', item.id)"
                  >
                    提问
                  </button>
                </div>
              </article>
            </div>

            <div v-else class="file-filter-empty">
              <div class="empty-file-title">没有匹配的数据文件</div>
              <div class="empty-file-copy">请调整搜索关键词，或上传新的数据文件</div>
            </div>
          </template>

          <template v-else>
            <div class="file-empty-top">
              <div class="file-empty-title">
                <span>数据文件</span>
                <span class="trial-badge">试用</span>
              </div>
              <div class="file-empty-actions">
                <label class="empty-search-box">
                  <span class="search-icon small">⌕</span>
                  <input
                    class="search-input"
                    :value="fileKeywordState"
                    type="text"
                    placeholder="搜索文件名称、格式、上传时间"
                    @input="emit('search-file', ($event.target as HTMLInputElement).value)"
                  />
                </label>
                <button class="upload-empty-button" type="button" @click="emit('open-upload')">
                  上传文件
                </button>
              </div>
            </div>

            <div class="file-empty-state">
              <div class="empty-file-icon">☁</div>
              <div class="empty-file-title">暂无上传的数据文件</div>
              <div class="empty-file-copy">点击右上角按钮上传Excel或CSV文件进行分析</div>
              <button class="upload-guide-button" type="button" @click="emit('open-upload')">
                立即上传
              </button>
            </div>

            <div class="upload-note">
              <div class="upload-note-title">上传说明</div>
              <div class="upload-note-list">
                <span>• 支持 .xlsx、.xls、.csv 格式的文件</span>
                <span>• 单个文件大小不超过 100MB</span>
                <span>• 文件第一行需要是表头列名，数据行不超过 100 万行</span>
                <span>• 上传的文件仅您个人可见，可随时删除</span>
              </div>
            </div>
          </template>
        </template>
      </div>

      <footer class="select-data-foot">
        <template v-if="activeTabState === 'dataset'">
          <div class="dialog-foot-meta">
            <div v-if="selectedSummary" class="selected-summary">{{ selectedSummary }}</div>
            <div v-else class="dialog-foot-spacer"></div>
            <div v-if="selectedDatasetDatasourcePendingState" class="foot-inline-hint">
              当前检测到多个数据源，暂为待确认状态
            </div>
          </div>

          <div class="foot-actions">
            <button class="foot-button ghost" type="button" @click="emit('close')">取消</button>
            <button
              class="foot-button primary"
              type="button"
              :disabled="!selectedDatasetIdState"
              @click="emit('confirm')"
            >
              确认选择
            </button>
          </div>
        </template>

        <template v-else-if="!hasFiles">
          <div class="foot-hint">
            <span class="foot-hint-icon">!</span>
            <span>上传的文件会自动解析为数据集，您可以在后续提问中使用</span>
          </div>
          <div class="foot-actions">
            <button class="foot-button ghost" type="button" @click="emit('close')">取消</button>
          </div>
        </template>

        <template v-else>
          <div v-if="selectedSummary" class="selected-summary">{{ selectedSummary }}</div>
          <div v-else class="dialog-foot-spacer"></div>

          <div class="foot-actions">
            <button class="foot-button ghost" type="button" @click="emit('close')">取消</button>
            <button
              class="foot-button primary"
              type="button"
              :disabled="!selectedFileIdState"
              @click="emit('confirm')"
            >
              确认选择
            </button>
          </div>
        </template>
      </footer>
    </section>
  </div>
</template>

<style scoped lang="less">
.sqlbot-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(24px, 3vw, 40px);
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(6px);
}

.select-data-dialog {
  width: min(1260px, calc(100vw - 96px));
  max-height: calc(100vh - 64px);
  min-height: 780px;
  display: flex;
  flex-direction: column;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 28px 48px rgba(15, 23, 42, 0.18), 0 12px 18px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.select-data-dialog.is-file-empty {
  min-height: 814px;
}

.select-data-head {
  min-height: 88px;
  padding: 24px 32px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.select-data-tabbar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border-radius: 10px;
  background: #f1f5f9;
}

.select-data-tab {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 15px;
  line-height: 22px;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
}

.select-data-tab.active {
  background: #ffffff;
  color: #1e293b;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.dialog-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #6b7280;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.select-data-body {
  flex: 1;
  min-height: 0;
  padding: 24px 32px 28px;
  overflow: auto;
}

.select-search-bar,
.empty-search-box {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  border: 1px solid #d7dee8;
  border-radius: 10px;
  background: #ffffff;
  color: #94a3b8;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.select-search-bar {
  width: 100%;
  padding: 0 18px;
}

.select-search-bar.compact {
  width: clamp(480px, 36vw, 620px);
}

.empty-search-box {
  width: 260px;
  padding: 0 14px;
  justify-content: flex-start;
}

.search-icon {
  font-size: 18px;
  color: #9ca3af;
}

.search-icon.small {
  font-size: 14px;
}

.search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #1e293b;
  font-size: 15px;
  line-height: 22px;
  font-weight: 500;
}

.search-input::placeholder {
  color: #94a3b8;
}

.dialog-filter-row,
.file-toolbar,
.file-empty-top {
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.filter-list {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-chip {
  border: 1px solid transparent;
  background: #f8fafc;
  color: #64748b;
  font-size: 14px;
  line-height: 20px;
  padding: 7px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.filter-chip.active {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e5af2;
  font-weight: 600;
}

.upload-file-button,
.upload-empty-button,
.upload-guide-button,
.file-action,
.foot-button {
  border: none;
  cursor: pointer;
}

.dataset-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.dataset-card {
  min-height: 156px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.dataset-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.dataset-card.selected {
  border: 2px solid #93c5fd;
  background: #eff6ff;
  box-shadow: none;
  transform: none;
}

.dataset-card-head,
.dataset-card-foot,
.dataset-title-wrap,
.dataset-card-actions,
.file-card-title-wrap,
.file-card-actions,
.foot-actions,
.foot-hint {
  display: flex;
  align-items: center;
}

.dataset-card-head,
.dataset-card-foot {
  justify-content: space-between;
}

.dataset-title-wrap {
  gap: 8px;
  flex-wrap: wrap;
}

.dataset-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 14px;
  font-weight: 600;
}

.dataset-badge.tone-blue {
  background: #dbeafe;
  color: #1e5af2;
}

.dataset-badge.tone-green {
  background: #dcfce7;
  color: #059669;
}

.dataset-badge.tone-purple {
  background: #f3e8ff;
  color: #7c3aed;
}

.dataset-badge.tone-orange {
  background: #ffedd5;
  color: #d97706;
}

.dataset-title,
.file-card-title {
  font-size: 16px;
  line-height: 24px;
  color: #1e293b;
  font-weight: 600;
}

.dataset-fields,
.file-fields {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.field-pill {
  flex: 0 0 auto;
  padding: 4px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #ffffff;
  color: #64748b;
  font-size: 12px;
  line-height: 16px;
}

.field-pill.light {
  background: #f9fafb;
  color: #94a3b8;
}

.field-pill.metric {
  background: #dcfce7;
  border-color: #bbf7d0;
  color: #15803d;
}

.field-pill.dimension {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.field-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.field-group-label {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
}

.dataset-card-foot {
  margin-top: auto;
  padding-top: 10px;
}

.dataset-card-actions {
  gap: 10px;
  opacity: 0;
  pointer-events: none;
}

.dataset-card:hover .dataset-card-actions,
.dataset-card.selected .dataset-card-actions {
  opacity: 1;
  pointer-events: auto;
}

.dataset-action {
  min-width: 88px;
  height: 34px;
  border: none;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  cursor: pointer;
}

.dataset-action.ghost {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #334155;
}

.dataset-action.primary {
  background: linear-gradient(90deg, #4f46e5 0%, #3b82f6 100%);
  color: #ffffff;
}

.dataset-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  margin-left: 12px;
  padding: 0 10px;
  border-radius: 999px;
  background: #1e5af2;
  color: #ffffff;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.file-list {
  margin-top: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.file-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  padding: 14px 16px;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.file-card:hover,
.file-card.selected {
  border-color: #cbd5e1;
  box-shadow: 0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.05);
  transform: translateY(-1px);
}

.file-card-actions {
  margin-top: 14px;
  justify-content: flex-end;
  gap: 10px;
  opacity: 0;
  pointer-events: none;
}

.file-card:hover .file-card-actions,
.file-card.selected .file-card-actions {
  opacity: 1;
  pointer-events: auto;
}

.file-action {
  min-width: 88px;
  height: 34px;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
}

.file-action.ghost {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #334155;
}

.file-action.primary,
.upload-file-button,
.upload-guide-button {
  background: linear-gradient(90deg, #4f46e5 0%, #3b82f6 100%);
  color: #ffffff;
}

.upload-file-button,
.upload-guide-button,
.upload-empty-button {
  height: 42px;
  border-radius: 10px;
  padding: 0 18px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}

.upload-empty-button {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #334155;
}

.file-empty-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  line-height: 24px;
  color: #1e293b;
  font-weight: 600;
}

.trial-badge {
  padding: 2px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #ffffff;
  color: #64748b;
  font-size: 11px;
  line-height: 14px;
  font-weight: 500;
}

.file-empty-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-empty-state {
  margin-top: 28px;
  padding: 56px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-file-icon {
  width: 80px;
  height: 80px;
  border-radius: 999px;
  background: #f9fafb;
  color: #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
}

.empty-file-title {
  margin-top: 16px;
  font-size: 16px;
  line-height: 24px;
  color: #64748b;
  font-weight: 600;
}

.empty-file-copy {
  margin-top: 8px;
  font-size: 14px;
  line-height: 20px;
  color: #94a3b8;
}

.upload-guide-button {
  margin-top: 20px;
}

.upload-note {
  margin-top: 32px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 16px;
}

.upload-note-title {
  font-size: 14px;
  line-height: 20px;
  color: #1e5af2;
  font-weight: 600;
}

.upload-note-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #3b82f6;
  font-size: 13px;
  line-height: 18px;
}

.select-data-foot {
  margin-top: auto;
  flex-shrink: 0;
  min-height: 88px;
  padding: 18px 32px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
}

@media (min-width: 1680px) {
  .select-data-dialog {
    width: min(1460px, calc(100vw - 112px));
  }

  .select-search-bar.compact {
    width: clamp(520px, 34vw, 660px);
  }

  .dataset-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .file-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (min-width: 2200px) {
  .select-data-dialog {
    width: min(1640px, calc(100vw - 136px));
  }

  .dataset-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.dialog-foot-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.selected-summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 8px 14px;
  border-radius: 8px;
  background: #dbeafe;
  color: #1e5af2;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  white-space: normal;
}

.foot-inline-hint {
  font-size: 13px;
  line-height: 18px;
  color: #1d4ed8;
}

.dialog-foot-spacer {
  flex: 1;
}

.foot-actions {
  gap: 12px;
}

.foot-button {
  height: 40px;
  border-radius: 10px;
  padding: 0 22px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}

.foot-button.ghost {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #64748b;
}

.foot-button.primary {
  background: #1e5af2;
  color: #ffffff;
}

.foot-button.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.foot-hint {
  gap: 8px;
  color: #64748b;
  font-size: 14px;
  line-height: 20px;
}

.foot-hint-icon {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #facc15;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

@media (max-width: 1199px) {
  .select-data-dialog {
    width: min(100%, calc(100vw - 48px));
    max-height: calc(100vh - 32px);
    min-height: 0;
  }

  .select-data-head,
  .select-data-body,
  .select-data-foot {
    padding-left: 24px;
    padding-right: 24px;
  }

  .file-toolbar,
  .file-empty-top,
  .select-data-foot {
    flex-wrap: wrap;
  }

  .select-search-bar.compact,
  .empty-search-box {
    width: 100%;
  }
}

@media (max-width: 900px) {
  .sqlbot-dialog-mask {
    padding: 16px;
  }

  .select-data-head {
    min-height: 76px;
    padding: 18px 18px 14px;
  }

  .select-data-body {
    padding: 20px 18px 22px;
  }

  .select-data-foot {
    align-items: stretch;
    padding: 16px 18px 18px;
  }

  .dataset-grid,
  .file-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .foot-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
