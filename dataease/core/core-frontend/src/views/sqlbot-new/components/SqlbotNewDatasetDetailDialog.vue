<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getDatasetPreview, getDatasetTotal } from '@/api/dataset'

type PreviewTab = 'data' | 'fields'

interface PreviewField {
  dataeaseName?: string
  name?: string
  originName?: string
  fieldType?: string
  type?: string
  deType?: number
  deExtractType?: number
  groupType?: string
}

const props = defineProps<{
  visible: boolean
  datasetId?: string
  title: string
  datasourceName?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'ask'): void
}>()

const previewTab = ref<PreviewTab>('data')
const previewLoading = ref(false)
const previewError = ref('')
const previewFields = ref<PreviewField[]>([])
const previewRows = ref<Array<Record<string, unknown> | unknown[]>>([])
const previewTotal = ref<number | string>('--')

const PREVIEW_LOAD_FAILURE_TITLE = '数据集预览暂时不可用'
const PREVIEW_LOAD_FAILURE_COPY =
  '当前数据集已可用于问数，但暂时无法读取预览数据。请重新加载；若多次失败，请检查数据集配置后重试。'

const normalizedDatasetId = computed(() => String(props.datasetId || '').trim())

const getFieldKind = (field: PreviewField) => {
  const fieldType = String(field.fieldType || field.type || '').toUpperCase()
  const deType =
    typeof field.deExtractType === 'number'
      ? field.deExtractType
      : typeof field.deType === 'number'
      ? field.deType
      : 0

  if (fieldType.includes('DATE') || fieldType.includes('TIME')) {
    return 'date'
  }
  if (deType === 2 || deType === 3) {
    return 'number'
  }
  return 'text'
}

const getFieldTypeLabel = (field: PreviewField) => {
  const kind = getFieldKind(field)
  if (kind === 'date') {
    return 'Date'
  }
  if (kind === 'number') {
    return 'Num'
  }
  return 'Str'
}

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  if (Array.isArray(value)) {
    return value.map(item => formatCellValue(item)).join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

const previewColumns = computed(() => {
  return previewFields.value.map((field, index) => ({
    key: String(field.dataeaseName || field.originName || field.name || `field_${index}`),
    title: String(field.name || field.originName || `字段${index + 1}`),
    typeLabel: getFieldTypeLabel(field)
  }))
})

const previewRowValues = computed(() => {
  return previewRows.value.slice(0, 20).map(row => {
    return previewColumns.value.map((column, index) => {
      if (Array.isArray(row)) {
        return formatCellValue(row[index])
      }

      return formatCellValue(row?.[column.key] ?? row?.[column.title])
    })
  })
})

const fieldStats = computed(() => {
  return previewFields.value.map((field, index) => {
    const label = String(field.name || field.originName || `字段${index + 1}`)
    const kind = getFieldTypeLabel(field)
    const values = previewRowValues.value.map(row => row[index]).filter(value => value !== '-')
    return [label, kind, String(values.length), String(new Set(values).size)]
  })
})

const previewGridTemplate = computed(() => {
  const count = Math.max(previewColumns.value.length, 1)
  return `repeat(${count}, minmax(120px, 1fr))`
})

const fieldCountSummary = computed(() => {
  return previewFields.value.reduce(
    (summary, field) => {
      const kind = getFieldKind(field)
      if (kind === 'date') {
        summary.date += 1
      } else if (kind === 'number') {
        summary.number += 1
      } else {
        summary.text += 1
      }
      return summary
    },
    { text: 0, date: 0, number: 0 }
  )
})

const resetPreviewState = () => {
  previewLoading.value = false
  previewError.value = ''
  previewFields.value = []
  previewRows.value = []
  previewTotal.value = '--'
}

const retryPreview = () => {
  if (previewLoading.value) {
    return
  }
  void loadPreviewDetail()
}

const loadPreviewDetail = async () => {
  if (!props.visible || !normalizedDatasetId.value) {
    resetPreviewState()
    return
  }

  previewLoading.value = true
  previewError.value = ''
  previewFields.value = []
  previewRows.value = []
  previewTotal.value = '--'

  try {
    const [previewRes, totalRes] = await Promise.all([
      getDatasetPreview(normalizedDatasetId.value),
      getDatasetTotal(normalizedDatasetId.value)
    ])

    previewFields.value = Array.isArray(previewRes?.data?.fields) ? previewRes.data.fields : []
    previewRows.value = Array.isArray(previewRes?.data?.data) ? previewRes.data.data : []
    previewTotal.value =
      typeof totalRes?.total === 'number' || typeof totalRes?.total === 'string'
        ? totalRes.total
        : '--'
  } catch (error) {
    console.error('load sqlbot-new dataset detail failed', error)
    previewError.value = PREVIEW_LOAD_FAILURE_COPY
  } finally {
    previewLoading.value = false
  }
}

watch(
  () => [props.visible, normalizedDatasetId.value],
  ([visible]) => {
    if (visible) {
      previewTab.value = 'data'
      void loadPreviewDetail()
    } else {
      resetPreviewState()
    }
  },
  { immediate: true }
)
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="detail-dialog-mask">
      <section class="detail-dialog">
        <header class="detail-dialog-head">
          <div class="detail-breadcrumb">
            <span class="crumb-muted">数据集 /</span>
            <span class="crumb-strong">{{ title || '未命名数据集' }}</span>
          </div>
          <button class="dialog-close" type="button" @click="emit('close')">×</button>
        </header>

        <div class="detail-dialog-body">
          <div class="detail-file-bar">
            <div class="detail-file-info">
              <div class="detail-file-icon">▦</div>
              <div>
                <div class="detail-file-name">{{ title || '未命名数据集' }}</div>
                <div v-if="datasourceName" class="detail-file-time">
                  数据源 {{ datasourceName }}
                </div>
              </div>
            </div>

            <button class="ask-button" type="button" @click="emit('ask')">提问</button>
          </div>

          <div class="detail-tabbar">
            <button
              class="detail-tab"
              :class="{ active: previewTab === 'data' }"
              type="button"
              @click="previewTab = 'data'"
            >
              数据预览
            </button>
            <button
              class="detail-tab"
              :class="{ active: previewTab === 'fields' }"
              type="button"
              @click="previewTab = 'fields'"
            >
              字段详情
            </button>
          </div>

          <div class="detail-preview-panel">
            <template v-if="previewLoading">
              <div class="preview-status-copy">正在加载真实 dataset 预览…</div>
            </template>

            <template v-else-if="previewError">
              <div class="detail-status-card error">
                <div class="detail-status-title">{{ PREVIEW_LOAD_FAILURE_TITLE }}</div>
                <div class="detail-status-copy">{{ previewError }}</div>
                <button class="detail-status-action" type="button" @click="retryPreview">
                  重新加载预览
                </button>
              </div>
            </template>

            <template v-else-if="previewTab === 'data'">
              <div class="detail-table">
                <div class="detail-row head" :style="{ gridTemplateColumns: previewGridTemplate }">
                  <div v-for="column in previewColumns" :key="column.key" class="detail-cell head">
                    <span class="type-tag">{{ column.typeLabel }}</span>
                    <span>{{ column.title }}</span>
                  </div>
                </div>

                <div
                  v-for="(row, rowIndex) in previewRowValues"
                  :key="`${rowIndex}-${row[0]}`"
                  class="detail-row"
                  :class="{ striped: rowIndex % 2 === 1 }"
                  :style="{ gridTemplateColumns: previewGridTemplate }"
                >
                  <div v-for="cell in row" :key="cell" class="detail-cell">{{ cell }}</div>
                </div>

                <div v-if="!previewRowValues.length" class="preview-status-copy">
                  当前数据集暂无可预览数据
                </div>
              </div>
            </template>

            <template v-else>
              <div class="detail-table">
                <div
                  class="detail-row head field"
                  :style="{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }"
                >
                  <div class="detail-cell head">字段名</div>
                  <div class="detail-cell head">字段类型</div>
                  <div class="detail-cell head">预览计数</div>
                  <div class="detail-cell head">预览去重</div>
                </div>

                <div
                  v-for="(field, fieldIndex) in fieldStats"
                  :key="`${field[0]}-${fieldIndex}`"
                  class="detail-row field"
                  :class="{ striped: fieldIndex % 2 === 1 }"
                  :style="{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }"
                >
                  <div class="detail-cell">{{ field[0] }}</div>
                  <div class="detail-cell">{{ field[1] }}</div>
                  <div class="detail-cell">{{ field[2] }}</div>
                  <div class="detail-cell">{{ field[3] }}</div>
                </div>
              </div>
            </template>
          </div>

          <div v-if="!previewError" class="detail-footer">
            <div class="detail-stats">
              <span>总字段数 {{ previewColumns.length }}</span>
              <span class="legend blue">文本 {{ fieldCountSummary.text }}</span>
              <span class="legend navy">日期 {{ fieldCountSummary.date }}</span>
              <span class="legend green">数值 {{ fieldCountSummary.number }}</span>
            </div>
            <span class="detail-limit">当前总预览行数 {{ previewTotal }}</span>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.detail-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2250;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(6px);
}

.detail-dialog {
  width: 1520px;
  max-height: calc(100vh - 280px);
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 20px 25px rgba(15, 23, 42, 0.14), 0 8px 10px rgba(15, 23, 42, 0.08);
}

.detail-dialog-head {
  flex-shrink: 0;
  height: 73px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.crumb-muted {
  font-size: 14px;
  line-height: 20px;
  color: #64748b;
}

.crumb-strong {
  font-size: 14px;
  line-height: 20px;
  color: #1e293b;
  font-weight: 600;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #6b7280;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.detail-dialog-body {
  flex: 1;
  min-height: 0;
  padding: 16px 20px 18px;
  overflow: auto;
}

.detail-file-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.detail-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-file-icon {
  color: #1e5af2;
  font-size: 20px;
}

.detail-file-name {
  font-size: 16px;
  line-height: 24px;
  color: #1e293b;
  font-weight: 600;
}

.detail-file-time {
  margin-top: 4px;
  font-size: 12px;
  line-height: 16px;
  color: #94a3b8;
}

.ask-button {
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #1e5af2;
  color: #ffffff;
  padding: 0 20px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  cursor: pointer;
}

.detail-tabbar {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: #f3f4f6;
}

.detail-tab {
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  padding: 6px 16px;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}

.detail-tab.active {
  background: #ffffff;
  color: #1e293b;
  font-weight: 600;
}

.detail-preview-panel {
  margin-top: 12px;
  min-height: 420px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
}

.preview-status-copy {
  padding: 36px 24px;
  color: #94a3b8;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
}

.detail-status-card {
  padding: 40px 24px;
  text-align: center;
}

.detail-status-title {
  font-size: 18px;
  line-height: 28px;
  color: #0f172a;
  font-weight: 700;
}

.detail-status-copy {
  margin-top: 8px;
  color: #64748b;
  font-size: 14px;
  line-height: 22px;
}

.detail-status-action {
  margin-top: 16px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #1e5af2;
  color: #ffffff;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.detail-table {
  min-width: 100%;
}

.detail-row {
  display: grid;
  min-height: 52px;
  border-bottom: 1px solid #eef2f7;
}

.detail-row.head {
  min-height: 54px;
  background: #f8fbff;
}

.detail-row.striped {
  background: #fafcff;
}

.detail-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  color: #334155;
  font-size: 13px;
  line-height: 20px;
  border-right: 1px solid #eef2f7;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.detail-cell:last-child {
  border-right: none;
}

.detail-cell.head {
  color: #0f172a;
  font-weight: 600;
}

.type-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  line-height: 16px;
  font-weight: 700;
}

.detail-footer {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #64748b;
  font-size: 13px;
  line-height: 20px;
}

.detail-stats {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.legend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: currentColor;
}

.legend.blue {
  color: #3b82f6;
}

.legend.navy {
  color: #1d4ed8;
}

.legend.green {
  color: #16a34a;
}

.detail-limit {
  color: #94a3b8;
}
</style>
