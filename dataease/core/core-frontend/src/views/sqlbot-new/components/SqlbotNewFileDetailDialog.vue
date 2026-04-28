<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getById, listDatasourceTables, previewData as fetchPreviewData } from '@/api/datasource'

type PreviewTab = 'data' | 'fields'

interface FileItem {
  id: string
  title: string
  uploadedAt: string
  format: 'Excel' | 'CSV'
  fields: string[]
  datasourceId?: string
}

interface PreviewField {
  name?: string
  originName?: string
  fieldType?: string
  deType?: number
  deExtractType?: number
}

const props = defineProps<{
  visible: boolean
  file: FileItem | null
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
const activeTableName = ref('')
const detailFileName = ref('')
const detailFileTime = ref('')

const PREVIEW_LOAD_FAILURE_TITLE = '文件预览暂时不可用'
const PREVIEW_LOAD_FAILURE_COPY =
  '当前文件已上传成功，但暂时无法读取预览数据。请点击重新加载；若多次失败，请检查文件内容后重新上传。'

const datasourceId = computed(() => String(props.file?.datasourceId || props.file?.id || ''))

const formatTime = (value: unknown) => {
  if (!value) {
    return '--'
  }
  if (typeof value === 'string' && /\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(value)) {
    return value
  }

  const date = new Date(Number(value) || String(value))
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const pad = (unit: number) => String(unit).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const getFieldKind = (field: PreviewField) => {
  const fieldType = String(field.fieldType || '').toUpperCase()
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
    key: String(field.originName || field.name || `field_${index}`),
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
  return previewColumns.value.map((column, index) => {
    const values = previewRowValues.value.map(row => row[index]).filter(value => value !== '-')
    return [column.title, column.typeLabel, String(values.length), String(new Set(values).size)]
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
  activeTableName.value = ''
  detailFileName.value = props.file?.title || ''
  detailFileTime.value = props.file?.uploadedAt || '--'
}

const retryPreview = () => {
  if (previewLoading.value) {
    return
  }

  void loadPreviewDetail()
}

const loadPreviewDetail = async () => {
  if (!props.visible || !datasourceId.value) {
    resetPreviewState()
    return
  }

  previewLoading.value = true
  previewError.value = ''
  previewFields.value = []
  previewRows.value = []

  try {
    const [detailRes, tablesRes]: any[] = await Promise.all([
      getById(datasourceId.value, true),
      listDatasourceTables({ datasourceId: datasourceId.value }, true)
    ])

    const detail = detailRes?.data || {}
    const tables = Array.isArray(tablesRes?.data) ? tablesRes.data : []
    const activeTable = tables[0]

    detailFileName.value = detail.fileName || detail.name || props.file?.title || '未命名文件'
    detailFileTime.value = formatTime(
      detail.createTime || detail.lastSyncTime || props.file?.uploadedAt
    )
    activeTableName.value = activeTable?.tableName || activeTable?.name || ''

    if (!activeTable?.name) {
      previewError.value = PREVIEW_LOAD_FAILURE_COPY
      return
    }

    const previewRes: any = await fetchPreviewData(
      {
        table: activeTable.name,
        id: datasourceId.value
      },
      true
    )

    previewFields.value = Array.isArray(previewRes?.data?.fields) ? previewRes.data.fields : []
    previewRows.value = Array.isArray(previewRes?.data?.data) ? previewRes.data.data : []
  } catch (error) {
    console.error('load sqlbot-new file detail failed', error)
    previewError.value = PREVIEW_LOAD_FAILURE_COPY
  } finally {
    previewLoading.value = false
  }
}

watch(
  () => [props.visible, datasourceId.value],
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
    <div v-if="visible && file" class="detail-dialog-mask">
      <section class="detail-dialog">
        <header class="detail-dialog-head">
          <div class="detail-breadcrumb">
            <span class="crumb-muted">数据文件 /</span>
            <span class="crumb-strong">{{ file.title }}</span>
          </div>
          <button class="dialog-close" type="button" @click="emit('close')">×</button>
        </header>

        <div class="detail-dialog-body">
          <div class="detail-file-bar">
            <div class="detail-file-info">
              <div class="detail-file-icon">▦</div>
              <div>
                <div class="detail-file-name">{{ detailFileName || file.title }}</div>
                <div class="detail-file-time">
                  上传时间 {{ detailFileTime || file.uploadedAt || '--' }}
                </div>
                <div v-if="activeTableName" class="detail-file-table">
                  预览表 {{ activeTableName }}
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
              <div class="preview-status-copy">正在加载真实 datasource 预览…</div>
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
                  当前文件暂无可预览数据
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
            <span class="detail-limit">最多预览前1000行数据</span>
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

.detail-file-table {
  margin-top: 4px;
  font-size: 12px;
  line-height: 16px;
  color: #64748b;
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
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.detail-preview-panel {
  margin-top: 12px;
  max-height: calc(100vh - 560px);
  overflow: auto;
}

.preview-status-copy {
  padding: 40px 12px;
  text-align: center;
  font-size: 13px;
  line-height: 20px;
  color: #94a3b8;
}

.preview-status-copy.error {
  color: #dc2626;
}

.detail-status-card {
  padding: 40px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  text-align: center;
}

.detail-status-card.error {
  border-color: #fecaca;
  background: #fef2f2;
}

.detail-status-title {
  font-size: 16px;
  line-height: 24px;
  color: #1e293b;
  font-weight: 600;
}

.detail-status-copy {
  max-width: 420px;
  margin: 8px auto 0;
  font-size: 13px;
  line-height: 20px;
  color: #64748b;
}

.detail-status-action {
  margin-top: 16px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #1e5af2;
  color: #ffffff;
  padding: 0 18px;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  cursor: pointer;
}

.detail-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: auto;
}

.detail-row {
  display: grid;
}

.detail-cell {
  min-height: 33px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  line-height: 17px;
  background: #ffffff;
}

.detail-cell.head {
  background: #f3f4f6;
  color: #1e293b;
  font-weight: 600;
}

.detail-row.striped .detail-cell {
  background: #f9fafb;
}

.detail-row.summary .detail-cell {
  min-height: 81px;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: #f3f4f6;
  color: #64748b;
}

.type-tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: #dbeafe;
  color: #1e5af2;
  font-size: 10px;
  line-height: 12px;
  font-weight: 600;
}

.detail-footer {
  flex-shrink: 0;
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.detail-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 12px;
  line-height: 16px;
}

.legend {
  position: relative;
  padding-left: 18px;
}

.legend::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  width: 13px;
  height: 12px;
  border-radius: 2px;
}

.legend.blue::before {
  background: #3b82f6;
}

.legend.navy::before {
  background: #1d4ed8;
}

.legend.green::before {
  background: #22c55e;
}

.detail-limit {
  color: #94a3b8;
  font-size: 12px;
  line-height: 16px;
}
</style>
