<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getDatasetPreviewData, getDatasetPreviewTotal } from './api'
import { useDatasetPermissionContext } from './useDatasetPermissionContext'
import type { DatasetPreviewFieldDTO } from './types'

const props = defineProps<{
  mode: 'preview' | 'structure'
}>()

interface DisplayField {
  key: string
  name: string
  deType: number
  description: string
  index: number
}

const { datasetId, invalidContext } = useDatasetPermissionContext()

const loading = ref(false)
const total = ref<number | null>(null)
const allFields = ref<DisplayField[]>([])
const previewFields = ref<DisplayField[]>([])
const previewRows = ref<Array<Record<string, unknown>>>([])
const loadedDatasetId = ref('')
const requestVersion = ref(0)

const resolveFieldKey = (
  field: DatasetPreviewFieldDTO | string,
  index: number,
  fieldNames: string[] = []
): string => {
  if (typeof field === 'string') {
    return fieldNames[index] || field || `field_${index}`
  }
  const candidates = [field.dataeaseName, field.fieldShortName, field.originName, field.name]
  const key = candidates.find(item => typeof item === 'string' && item.trim())
  return key?.trim() || `field_${index}`
}

const resolveFieldName = (
  field: DatasetPreviewFieldDTO | string,
  index: number,
  fieldNames: string[] = []
): string => {
  if (typeof field === 'string') {
    return field
  }
  return String(field.name || field.originName || field.fieldShortName || resolveFieldKey(field, index, fieldNames))
}

const normalizeFields = (
  fields: Array<DatasetPreviewFieldDTO | string>,
  fieldNames: string[] = []
): DisplayField[] =>
  fields.map((field, index) => ({
    key: resolveFieldKey(field, index, fieldNames),
    name: resolveFieldName(field, index, fieldNames),
    deType: typeof field === 'string' ? 0 : Number(field.deType) || 0,
    description: typeof field === 'string' ? '' : String(field.description || ''),
    index
  }))

const normalizePreviewRows = (rows: unknown[][] | undefined): Array<Record<string, unknown>> => {
  if (!Array.isArray(rows)) {
    return []
  }
  return rows.map(row => {
    if (!Array.isArray(row)) {
      return {}
    }
    return row.reduce<Record<string, unknown>>((record, value, index) => {
      const field = previewFields.value[index]
      if (field) {
        record[field.key] = value
      }
      record[String(index)] = value
      return record
    }, {})
  })
}

const fieldTypeLabel = (deType: number): string => {
  if (deType === 2) return '整数'
  if (deType === 3) return '浮点数'
  if (deType === 5) return '日期'
  if (deType === 6) return '日期时间'
  if (deType === 7) return '布尔'
  return '文本'
}

const ensurePreviewLoaded = async () => {
  if (!datasetId.value || invalidContext.value) {
    allFields.value = []
    previewFields.value = []
    previewRows.value = []
    total.value = null
    loadedDatasetId.value = ''
    return
  }
  if (loadedDatasetId.value === datasetId.value) {
    return
  }

  const currentVersion = ++requestVersion.value
  const currentDatasetId = datasetId.value
  loading.value = true
  try {
    const [previewData, previewTotal] = await Promise.all([
      getDatasetPreviewData(currentDatasetId),
      getDatasetPreviewTotal(currentDatasetId)
    ])
    if (currentVersion !== requestVersion.value || currentDatasetId !== datasetId.value) {
      return
    }
    allFields.value = normalizeFields(previewData.allFields || [])
    previewFields.value = normalizeFields(
      previewData.data?.fields || [],
      previewData.data?.fieldNames || []
    )
    previewRows.value = Array.isArray(previewData.data?.data) && previewData.data.data.length
      ? previewData.data.data
      : normalizePreviewRows(previewData.data?.rows)
    total.value = previewTotal
    loadedDatasetId.value = currentDatasetId
  } finally {
    if (currentVersion === requestVersion.value && currentDatasetId === datasetId.value) {
      loading.value = false
    }
  }
}

watch(
  () => [datasetId.value, props.mode, invalidContext.value] as const,
  () => {
    if (loadedDatasetId.value !== datasetId.value) {
      allFields.value = []
      previewFields.value = []
      previewRows.value = []
      total.value = null
    }
    void ensurePreviewLoaded()
  },
  { immediate: true }
)

const structureRows = computed(() => allFields.value)
const activeColumns = computed(() => previewFields.value)
const previewColumnCount = computed(() => Math.max(activeColumns.value.length, 1))
const previewGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${previewColumnCount.value}, minmax(132px, 1fr))`,
  minWidth: `max(100%, ${previewColumnCount.value * 148}px)`
}))
const panelTitle = computed(() => (props.mode === 'preview' ? '数据预览' : '数据结构'))

const summaryText = computed(() => {
  if (props.mode === 'preview') {
    return `共 ${total.value ?? previewRows.value.length} 条数据`
  }
  return `共 ${structureRows.value.length} 个字段`
})

const previewCellText = (row: Record<string, unknown>, key: string): string => {
  const column = activeColumns.value.find(item => item.key === key)
  const value = row[key] ?? (column ? row[String(column.index)] : undefined)
  if (value == null || value === '') {
    return '-'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}
</script>

<template>
  <section class="dataset-data-panel">
    <div v-if="invalidContext" class="dataset-data-panel__invalid">
      <div class="empty-state">
        <div class="empty-state__icon"></div>
        <div class="empty-state__text">当前数据集不可用</div>
      </div>
    </div>

    <div v-else class="dataset-data-panel__content">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-header__title">{{ panelTitle }}</div>
          <div class="panel-header__summary">{{ summaryText }}</div>
        </div>

        <div class="table-shell">
          <template v-if="loading">
            <div class="empty-state empty-state--panel">
              <div class="empty-state__text">加载中...</div>
            </div>
          </template>

          <template v-else-if="mode === 'preview' && !activeColumns.length">
            <div class="empty-state empty-state--panel">
              <div class="empty-state__icon"></div>
              <div class="empty-state__text">暂无预览数据</div>
            </div>
          </template>

          <template v-else-if="mode === 'structure' && !structureRows.length">
            <div class="empty-state empty-state--panel">
              <div class="empty-state__icon"></div>
              <div class="empty-state__text">暂无字段结构</div>
            </div>
          </template>

          <div v-else class="table-scroll">
            <div
              class="table-head"
              :class="{ 'table-head--structure': mode === 'structure' }"
              :style="mode === 'preview' ? previewGridStyle : undefined"
            >
              <template v-if="mode === 'preview'">
                <span v-for="column in activeColumns" :key="column.key" :title="column.name">
                  {{ column.name }}
                </span>
              </template>
              <template v-else>
                <span>字段名称</span>
                <span>字段类型</span>
                <span>字段备注</span>
              </template>
            </div>

            <template v-if="mode === 'preview'">
              <div
                v-for="(row, rowIndex) in previewRows"
                :key="`preview-${rowIndex}`"
                class="table-row"
                :style="previewGridStyle"
              >
                <span
                  v-for="column in activeColumns"
                  :key="column.key"
                  :title="previewCellText(row, column.key)"
                  class="table-row__cell"
                >
                  {{ previewCellText(row, column.key) }}
                </span>
              </div>
            </template>

            <template v-else>
              <div v-for="field in structureRows" :key="field.key" class="table-row table-row--structure">
                <span class="table-row__cell table-row__cell--name" :title="field.name">{{ field.name }}</span>
                <span class="table-row__cell">{{ fieldTypeLabel(field.deType) }}</span>
                <span class="table-row__cell" :title="field.description || '-'">
                  {{ field.description || '-' }}
                </span>
              </div>
            </template>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.dataset-data-panel {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  overflow: hidden;
}

.dataset-data-panel__content {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  overflow: hidden;
}

.dataset-data-panel__invalid {
  flex: 1;
  min-height: 0;
  border: 1px solid #e8edf5;
  border-radius: 12px;
  background: #ffffff;
  display: flex;
}

.panel {
  min-height: 360px;
  height: 100%;
  flex: 1 1 auto;
  border: 1px solid #dde7f5;
  border-radius: 14px;
  background: #ffffff;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 10px;
  margin-bottom: 12px;
  border: 1px solid #e7edf7;
  border-radius: 12px;
  background: #f8fbff;
}

.panel-header__title {
  color: #101828;
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
}

.panel-header__summary {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #f3f6fb;
  color: #526075;
  font-size: 15px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.table-shell {
  min-height: 0;
  flex: 1;
  border: 1px solid #dbe7f7;
  border-radius: 12px;
  background: linear-gradient(180deg, #f9fbff 0%, #ffffff 100%);
  overflow: hidden;
  display: flex;
}

.table-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  background: #ffffff;
}

.table-head,
.table-row {
  display: grid;
  width: 100%;
}

.table-head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f5f8fd;
  color: #344054;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid #e6edf7;
}

.table-head--structure,
.table-row--structure {
  grid-template-columns: minmax(240px, 1.3fr) minmax(180px, 0.8fr) minmax(320px, 1.7fr);
}

.table-head span,
.table-row__cell {
  min-height: 42px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  border-right: 1px solid #eef3f9;
  box-sizing: border-box;
}

.table-head span:last-child,
.table-row__cell:last-child {
  border-right: none;
}

.table-row {
  border-bottom: 1px solid #eef3f9;
  color: #344054;
  font-size: 15px;
  line-height: 22px;
}

.table-row:nth-child(odd) {
  background: #fcfdff;
}

.table-row__cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-row__cell--name {
  font-weight: 500;
}

.empty-state {
  flex: 1;
  min-height: 0;
  padding: 48px 0 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  color: #98a2b3;
  text-align: center;
}

.empty-state--panel {
  width: 100%;
}

.empty-state__text {
  font-size: 15px;
  line-height: 22px;
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
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  background: #d5dbe5;
}

.empty-state__icon::before {
  width: 32px;
  height: 32px;
  top: 2px;
}

.empty-state__icon::after {
  width: 38px;
  height: 38px;
  top: 16px;
  background: transparent;
  border: 3px solid #d5dbe5;
  box-sizing: border-box;
}

@media (max-width: 1180px) {
  .panel {
    padding: 10px;
  }

  .panel-header {
    padding-bottom: 10px;
  }

  .table-head--structure,
  .table-row--structure {
    grid-template-columns: minmax(180px, 1fr) minmax(132px, 0.7fr) minmax(220px, 1.2fr);
  }
}
</style>
