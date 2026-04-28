<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus-secondary'
import { Base64 } from 'js-base64'
import { save, uploadFileWithOption } from '@/api/datasource'
import {
  buildFileFieldMetas,
  getDimensionFieldNames,
  getMetricFieldNames
} from '@/views/sqlbot-new/fileFieldMeta'
import type { FileCardItem } from '@/views/sqlbot-new/types'

type UploadStep = 'upload' | 'preview'
type PreviewTab = 'data' | 'fields'

type UploadedFilePayload = FileCardItem

interface ExcelUploadField {
  name?: string
  originName?: string
  fieldType?: string
  deExtractType?: number
  deType?: number
  checked?: boolean
  primaryKey?: boolean
  length?: number
  fieldSize?: number
}

interface ExcelUploadSheet {
  sheet?: boolean
  sheetId?: string
  tableName?: string
  excelLabel?: string
  jsonArray?: Array<Record<string, unknown> | unknown[]>
  fields?: ExcelUploadField[]
}

interface ExcelUploadData {
  excelLabel?: string
  sheets?: ExcelUploadSheet[]
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'save', payload: UploadedFilePayload): void
  (event: 'save-and-use', payload: UploadedFilePayload): void
}>()

const uploadStep = ref<UploadStep>('upload')
const previewTab = ref<PreviewTab>('data')
const fileInputRef = ref<HTMLInputElement | null>(null)
const rawFile = ref<File | null>(null)
const displayName = ref('')
const parseLoading = ref(false)
const saving = ref(false)
const parsedExcelData = ref<ExcelUploadData | null>(null)

const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024
const SUPPORTED_UPLOAD_FILE_PATTERN = /\.(csv|xlsx|xls)$/i
const FILE_PARSE_FAILURE_COPY =
  '文件暂时无法解析，请确认文件格式正确、首行为字段名且内容完整后重新上传'
const FILE_EMPTY_FAILURE_COPY = '未识别到可导入的数据，请确认首行为字段名并至少保留一行数据'

const resetDialogState = () => {
  uploadStep.value = 'upload'
  previewTab.value = 'data'
  rawFile.value = null
  displayName.value = ''
  parsedExcelData.value = null
  parseLoading.value = false
  saving.value = false
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const inferDeExtractType = (fieldType?: string) => {
  const normalized = String(fieldType || '').toUpperCase()
  if (
    normalized.includes('DOUBLE') ||
    normalized.includes('FLOAT') ||
    normalized.includes('DECIMAL')
  ) {
    return 3
  }
  if (
    normalized.includes('LONG') ||
    normalized.includes('INT') ||
    normalized.includes('NUMBER') ||
    normalized.includes('BIGINT')
  ) {
    return 2
  }
  return 0
}

const getFieldKind = (field: ExcelUploadField) => {
  const type = String(field.fieldType || '').toUpperCase()
  const deExtractType =
    typeof field.deExtractType === 'number' ? field.deExtractType : inferDeExtractType(type)

  if (type.includes('DATE') || type.includes('TIME')) {
    return 'date'
  }
  if (deExtractType === 2 || deExtractType === 3) {
    return 'number'
  }
  return 'text'
}

const getFieldTypeLabel = (field: ExcelUploadField) => {
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

const normalizeFieldName = (field: ExcelUploadField, index: number) => {
  return String(field.name || field.originName || `字段${index + 1}`)
}

const activeSheet = computed<ExcelUploadSheet | null>(() => {
  const sheets = parsedExcelData.value?.sheets || []
  return sheets.find(sheet => sheet.sheet !== false) || sheets[0] || null
})

const previewColumns = computed(() => {
  return (activeSheet.value?.fields || []).map((field, index) => ({
    key: String(field.originName || field.name || `field_${index}`),
    title: normalizeFieldName(field, index),
    typeLabel: getFieldTypeLabel(field)
  }))
})

const previewRows = computed(() => {
  const rows = activeSheet.value?.jsonArray || []
  return rows.slice(0, 20).map(row => {
    return previewColumns.value.map((column, index) => {
      if (Array.isArray(row)) {
        return formatCellValue(row[index])
      }

      return formatCellValue(
        (row as Record<string, unknown>)?.[column.key] ??
          (row as Record<string, unknown>)?.[column.title]
      )
    })
  })
})

const fieldStats = computed(() => {
  return previewColumns.value.map((column, index) => {
    const values = previewRows.value.map(row => row[index]).filter(value => value !== '-')
    return [column.title, column.typeLabel, String(values.length), String(new Set(values).size)]
  })
})

const previewGridTemplate = computed(() => {
  const count = Math.max(previewColumns.value.length, 1)
  return `repeat(${count}, minmax(94px, 1fr))`
})

const fieldCountSummary = computed(() => {
  return (activeSheet.value?.fields || []).reduce(
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

watch(
  () => props.visible,
  visible => {
    if (!visible) {
      return
    }
    resetDialogState()
  }
)

const dialogWidth = computed(() => (uploadStep.value === 'upload' ? 1120 : 1680))

const activeFormat = computed<'Excel' | 'CSV'>(() => {
  return /\.csv$/i.test(rawFile.value?.name || '') ? 'CSV' : 'Excel'
})

const sourceFileName = computed(() => rawFile.value?.name || '')

const formatUploadedAt = () => {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

const sanitizeFileName = (fileName: string) => {
  return fileName.replace(/\.[^.]+$/, '').trim()
}

const validateUploadFile = (file: File) => {
  if (!SUPPORTED_UPLOAD_FILE_PATTERN.test(file.name)) {
    return '请上传 CSV 或 Excel 文件'
  }
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return '文件不能超过 10MB，请压缩或拆分后重新上传'
  }

  return ''
}

const openFilePicker = () => {
  if (parseLoading.value || saving.value) {
    return
  }
  fileInputRef.value?.click()
}

const parseUploadedFile = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', '')
  formData.append('editType', '0')
  formData.append('id', '0')

  const response = await uploadFileWithOption(formData, true)
  if (!response) {
    throw new Error(FILE_PARSE_FAILURE_COPY)
  }
  if (response.code !== 0) {
    console.error('parse sqlbot-new upload response failed', response)
    throw new Error(FILE_PARSE_FAILURE_COPY)
  }
  if (!response.data?.sheets?.length) {
    throw new Error(FILE_EMPTY_FAILURE_COPY)
  }

  return response.data as ExcelUploadData
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]

  if (!file) {
    return
  }

  const validationMessage = validateUploadFile(file)
  if (validationMessage) {
    ElMessage.error(validationMessage)
    if (input) {
      input.value = ''
    }
    return
  }

  parseLoading.value = true
  try {
    const parsed = await parseUploadedFile(file)
    rawFile.value = file
    parsedExcelData.value = parsed
    displayName.value = sanitizeFileName(file.name) || parsed.excelLabel || '未命名文件'
    uploadStep.value = 'preview'
  } catch (error) {
    console.error('parse sqlbot-new file failed', error)
    ElMessage.error(error instanceof Error ? error.message : FILE_PARSE_FAILURE_COPY)
    resetDialogState()
  } finally {
    parseLoading.value = false
    if (input) {
      input.value = ''
    }
  }
}

const buildSheetsForSave = () => {
  const sheets = parsedExcelData.value?.sheets || []

  return sheets
    .map((sheet, sheetIndex) => ({
      ...sheet,
      sheet: sheet.sheet !== false,
      tableName: String(sheet.tableName || `Sheet${sheetIndex + 1}`),
      excelLabel: String(
        sheet.excelLabel || parsedExcelData.value?.excelLabel || sourceFileName.value
      ),
      data: [],
      jsonArray: [],
      fields: (sheet.fields || []).map((field, fieldIndex) => {
        const deExtractType =
          typeof field.deExtractType === 'number'
            ? field.deExtractType
            : inferDeExtractType(field.fieldType)

        return {
          ...field,
          name: normalizeFieldName(field, fieldIndex),
          originName: String(field.originName || field.name || `field_${fieldIndex + 1}`),
          checked: field.checked !== false,
          primaryKey: Boolean(field.primaryKey),
          deExtractType,
          deType: typeof field.deType === 'number' ? field.deType : deExtractType,
          length: Number(field.length || field.fieldSize || 50)
        }
      })
    }))
    .filter(sheet => sheet.sheet && sheet.fields.some(field => field.checked))
}

const persistDatasource = async (askAfterSave = false) => {
  if (!rawFile.value || !parsedExcelData.value || saving.value) {
    return
  }

  const sheets = buildSheetsForSave()
  if (!sheets.length) {
    ElMessage.error('当前文件没有可保存的字段，请重新上传后再试')
    return
  }

  const fileName =
    sourceFileName.value || displayName.value || parsedExcelData.value.excelLabel || '未命名文件'
  const title = displayName.value.trim() || sanitizeFileName(fileName) || fileName

  saving.value = true
  try {
    const datasource = await save({
      name: title,
      type: 'Excel',
      editType: 0,
      pid: '0',
      sheets,
      configuration: Base64.encode(JSON.stringify(sheets))
    })
    const datasourceId = String(datasource?.id || '')

    if (!datasourceId) {
      throw new Error('文件已解析，但数据源创建失败')
    }

    const fieldMetas = buildFileFieldMetas(activeSheet.value?.fields || [])
    const fields = fieldMetas.map(item => item.name)

    const payload: UploadedFilePayload = {
      id: datasourceId,
      title: title || datasource?.name || '未命名文件',
      uploadedAt: formatUploadedAt(),
      format: activeFormat.value,
      datasourceId,
      pending: false,
      fields,
      fieldMetas,
      metricFields: getMetricFieldNames(fieldMetas),
      dimensionFields: getDimensionFieldNames(fieldMetas),
      fieldsLoaded: fieldMetas.length > 0
    }

    if (askAfterSave) {
      emit('save-and-use', payload)
    } else {
      emit('save', payload)
    }
    ElMessage.success('文件数据源创建成功')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '文件保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="upload-dialog-mask">
      <section class="upload-dialog" :style="{ width: `${dialogWidth}px` }">
        <header class="upload-dialog-head">
          <div class="dialog-title">文件上传</div>
          <button class="dialog-close" type="button" @click="emit('close')">×</button>
        </header>

        <div class="stepper-wrap">
          <div class="stepper-item active">
            <span class="step-dot"></span>
            <span class="step-label">文件上传</span>
          </div>
          <div class="step-line" :class="{ complete: uploadStep === 'preview' }"></div>
          <div class="stepper-item" :class="{ active: uploadStep === 'preview' }">
            <span class="step-dot"></span>
            <span class="step-label">预览数据</span>
          </div>
        </div>

        <template v-if="uploadStep === 'upload'">
          <div class="upload-dialog-body upload-step-one">
            <input
              ref="fileInputRef"
              class="upload-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              @change="handleFileChange"
            />

            <button class="upload-dropzone" type="button" @click="openFilePicker">
              <div class="dropzone-icon">⇪</div>
              <div class="dropzone-title">
                {{ parseLoading ? '正在生成文件预览，请稍候…' : '选择文件开始上传' }}
              </div>
              <div class="dropzone-copy">
                {{
                  parseLoading
                    ? '系统正在读取字段结构和样例数据'
                    : '支持 CSV、XLS、XLSX，默认解析第一个 Sheet'
                }}
              </div>
            </button>

            <div class="upload-hint-wrap">
              <div class="upload-hint-title">上传要求</div>
              <div class="upload-hint-list">
                <span>• 上传前请清理合并单元格、说明行和空表头</span>
                <span>• 系统默认将首行识别为字段名，从第二行开始读取数据</span>
                <span>• 单个文件大小不能超过 10MB</span>
                <span>• 多 Sheet 文件仅解析第一个 Sheet</span>
                <span>• 建议使用Chrome浏览器上传</span>
              </div>

              <div class="upload-example">
                <div class="example-table">
                  <div class="example-row header">
                    <span>Date</span>
                    <span>Header</span>
                    <span>Amount</span>
                  </div>
                  <div class="example-row">
                    <span>2024/02/01</span>
                    <span>lydaas.com</span>
                    <span>40,000</span>
                  </div>
                  <div class="example-row">
                    <span>2024/02/02</span>
                    <span>bi.aliyun.com</span>
                    <span>678,321</span>
                  </div>
                  <div class="example-row muted">
                    <span>-</span>
                    <span>-</span>
                    <span>-</span>
                  </div>
                </div>
                <div class="example-caption">上传示例</div>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="upload-dialog-body upload-step-two">
            <div class="upload-file-info">
              <div class="upload-file-name">{{ sourceFileName || '未选择文件' }}</div>
              <div class="display-name-row">
                <span class="display-name-label">展示名称</span>
                <input v-model="displayName" class="display-name-input" type="text" />
              </div>
            </div>

            <div class="preview-tabbar">
              <button
                class="preview-tab"
                :class="{ active: previewTab === 'data' }"
                type="button"
                @click="previewTab = 'data'"
              >
                数据预览
              </button>
              <button
                class="preview-tab"
                :class="{ active: previewTab === 'fields' }"
                type="button"
                @click="previewTab = 'fields'"
              >
                字段详情
              </button>
            </div>

            <div class="preview-panel">
              <template v-if="previewTab === 'data'">
                <div class="preview-table wide">
                  <div
                    class="preview-row head"
                    :style="{ gridTemplateColumns: previewGridTemplate }"
                  >
                    <div
                      v-for="column in previewColumns"
                      :key="column.key"
                      class="preview-cell head"
                    >
                      <span class="type-tag">{{ column.typeLabel }}</span>
                      <span>{{ column.title }}</span>
                    </div>
                  </div>

                  <div
                    v-for="(row, rowIndex) in previewRows"
                    :key="`${rowIndex}-${row[0]}`"
                    class="preview-row"
                    :class="{ striped: rowIndex % 2 === 1 }"
                    :style="{ gridTemplateColumns: previewGridTemplate }"
                  >
                    <div v-for="cell in row" :key="cell" class="preview-cell">{{ cell }}</div>
                  </div>

                  <div v-if="!previewRows.length" class="preview-empty-copy">
                    当前文件暂无可预览数据
                  </div>
                </div>

                <div class="preview-footer">
                  <div class="preview-stats">
                    <span>总字段数 {{ previewColumns.length }}</span>
                    <span class="legend blue">文本 {{ fieldCountSummary.text }}</span>
                    <span class="legend navy">日期 {{ fieldCountSummary.date }}</span>
                    <span class="legend green">数值 {{ fieldCountSummary.number }}</span>
                  </div>
                  <span class="preview-limit">最多预览前1000行数据</span>
                </div>
              </template>

              <template v-else>
                <div class="preview-table field-detail">
                  <div class="preview-row head field-head">
                    <div class="preview-cell head">字段名</div>
                    <div class="preview-cell head">字段类型</div>
                    <div class="preview-cell head">预览计数</div>
                    <div class="preview-cell head">预览去重</div>
                  </div>

                  <div
                    v-for="(field, fieldIndex) in fieldStats"
                    :key="`${field[0]}-${fieldIndex}`"
                    class="preview-row field-head"
                    :class="{ striped: fieldIndex % 2 === 1 }"
                  >
                    <div class="preview-cell">{{ field[0] }}</div>
                    <div class="preview-cell">{{ field[1] }}</div>
                    <div class="preview-cell">{{ field[2] }}</div>
                    <div class="preview-cell">{{ field[3] }}</div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <footer class="upload-dialog-foot">
            <button
              class="foot-button ghost"
              type="button"
              :disabled="!rawFile || !parsedExcelData || parseLoading || saving"
              @click="persistDatasource(false)"
            >
              {{ saving ? '保存中…' : '仅保存' }}
            </button>
            <button
              class="foot-button primary"
              type="button"
              :disabled="!rawFile || !parsedExcelData || parseLoading || saving"
              @click="persistDatasource(true)"
            >
              {{ saving ? '保存中…' : '保存并使用' }}
            </button>
          </footer>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.upload-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(6px);
}

.upload-dialog {
  max-height: calc(100vh - 280px);
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 20px 25px rgba(15, 23, 42, 0.14), 0 8px 10px rgba(15, 23, 42, 0.08);
}

.upload-file-input {
  display: none;
}

.upload-dialog-head {
  flex-shrink: 0;
  height: 73px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-title {
  font-size: 16px;
  line-height: 24px;
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

.stepper-wrap {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepper-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 13px;
  line-height: 18px;
}

.stepper-item.active {
  color: #1e5af2;
  font-weight: 600;
}

.step-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #e5e7eb;
}

.stepper-item.active .step-dot {
  background: #1e5af2;
}

.step-line {
  width: 200px;
  height: 1px;
  margin: 0 8px;
  background: #e5e7eb;
}

.step-line.complete {
  background: #1e5af2;
}

.upload-dialog-body {
  flex: 1;
  min-height: 0;
  padding: 18px 24px 20px;
  overflow: auto;
}

.upload-dropzone {
  width: 100%;
  border: 2px solid #bfdbfe;
  border-radius: 12px;
  background: #eff6ff;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
}

.dropzone-icon {
  font-size: 34px;
  line-height: 40px;
  color: #1e5af2;
}

.dropzone-title {
  margin-top: 12px;
  font-size: 14px;
  line-height: 20px;
  color: #1e5af2;
  font-weight: 600;
}

.dropzone-copy {
  margin-top: 4px;
  font-size: 12px;
  line-height: 16px;
  color: #64748b;
}

.upload-hint-wrap {
  width: 500px;
  margin: 32px auto 0;
}

.upload-hint-title {
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  color: #64748b;
  font-weight: 600;
}

.upload-hint-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.upload-example {
  margin-top: 32px;
}

.example-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.example-row {
  display: grid;
  grid-template-columns: 169px 192px 139px;
}

.example-row span {
  padding: 8px 16px;
  text-align: center;
  font-size: 12px;
  line-height: 17px;
  color: #64748b;
  background: #ffffff;
}

.example-row.header span {
  font-weight: 600;
  background: #f9fafb;
}

.example-row.muted span {
  color: #94a3b8;
}

.example-caption {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  line-height: 16px;
  color: #94a3b8;
}

.upload-file-info {
  color: #1e293b;
}

.upload-file-name {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}

.display-name-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.display-name-label {
  font-size: 13px;
  line-height: 18px;
  color: #64748b;
}

.display-name-input {
  width: 400px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #334155;
  font-size: 13px;
  outline: none;
}

.preview-tabbar {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: #f3f4f6;
}

.preview-tab {
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  line-height: 18px;
  padding: 6px 16px;
  cursor: pointer;
}

.preview-tab.active {
  background: #ffffff;
  color: #1e293b;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.preview-panel {
  margin-top: 12px;
  max-height: calc(100vh - 600px);
  overflow: auto;
}

.preview-empty-copy {
  padding: 32px 12px;
  text-align: center;
  font-size: 13px;
  line-height: 20px;
  color: #94a3b8;
}

.preview-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: auto;
}

.preview-row {
  display: grid;
}

.preview-row.field-head {
  grid-template-columns: 2fr 1fr 1fr 1fr;
}

.preview-cell {
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

.preview-cell.head {
  background: #f3f4f6;
  color: #1e293b;
  font-weight: 600;
}

.preview-row.striped .preview-cell {
  background: #f9fafb;
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

.preview-footer {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.preview-stats {
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

.preview-limit {
  color: #94a3b8;
  font-size: 12px;
  line-height: 16px;
}

.upload-dialog-foot {
  flex-shrink: 0;
  padding: 14px 20px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f9fafb;
}

.foot-button {
  height: 40px;
  border: none;
  border-radius: 8px;
  padding: 0 24px;
  cursor: pointer;
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
</style>
