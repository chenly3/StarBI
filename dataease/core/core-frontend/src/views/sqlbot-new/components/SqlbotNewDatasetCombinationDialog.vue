<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus-secondary'
import {
  buildCombinationFieldOptions,
  buildDefaultCombinationName,
  createRelationRowDraft,
  createSecondaryRelationDraft,
  sanitizeRelationRowDraft,
  type DatasetCombinationConfirmPayload,
  type DatasetCombinationDialogDatasetOption,
  type DatasetCombinationSecondaryRelationDraft
} from '../datasetCombinationAdapter'

const props = defineProps<{
  visible: boolean
  datasetOptions: Array<{
    id: string
    title: string
    fields: string[]
    metricFields?: string[]
    dimensionFields?: string[]
  }>
  draft?: DatasetCombinationConfirmPayload | null
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm', payload: DatasetCombinationConfirmPayload): void
}>()

const relationTypeOptions = [
  { label: '左连接', value: 'left' },
  { label: '内连接', value: 'inner' },
  { label: '右连接', value: 'right' },
  { label: '全连接', value: 'full' }
] as const

const combinationName = ref('')
const primaryDatasetId = ref('')
const secondaryDatasetIds = ref<string[]>([])
const relationDrafts = ref<DatasetCombinationSecondaryRelationDraft[]>([])
const lastSuggestedName = ref('')

const normalizedDatasetOptions = computed<DatasetCombinationDialogDatasetOption[]>(() => {
  return (props.datasetOptions || []).filter(item => item?.id && item?.title)
})

const datasetLookup = computed<Record<string, DatasetCombinationDialogDatasetOption>>(() => {
  return normalizedDatasetOptions.value.reduce<
    Record<string, DatasetCombinationDialogDatasetOption>
  >((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
})

const primaryDataset = computed(() => {
  return datasetLookup.value[primaryDatasetId.value] || null
})

const selectedDatasetCount = computed(() => {
  return primaryDatasetId.value
    ? secondaryDatasetIds.value.length + 1
    : secondaryDatasetIds.value.length
})

const availableSecondaryDatasetOptions = computed(() => {
  return normalizedDatasetOptions.value.filter(item => item.id !== primaryDatasetId.value)
})

const getDatasetFields = (datasetId: string) => {
  const dataset = datasetLookup.value[datasetId]
  return dataset ? buildCombinationFieldOptions(dataset) : []
}

const buildRelationDrafts = (
  nextPrimaryId = primaryDatasetId.value,
  nextSecondaryIds = secondaryDatasetIds.value,
  draftSource: DatasetCombinationSecondaryRelationDraft[] = relationDrafts.value
) => {
  const primary = datasetLookup.value[nextPrimaryId]
  const draftLookup = draftSource.reduce<Record<string, DatasetCombinationSecondaryRelationDraft>>(
    (acc, item) => {
      acc[item.datasetId] = item
      return acc
    },
    {}
  )

  return [...new Set(nextSecondaryIds.filter(id => id && id !== nextPrimaryId))]
    .map(datasetId => {
      const secondary = datasetLookup.value[datasetId]
      const existing = draftLookup[datasetId]

      if (!existing) {
        return createSecondaryRelationDraft(datasetId, primary || undefined, secondary || undefined)
      }

      const normalizedRows = (existing.rows?.length ? existing.rows : [undefined]).map(row =>
        sanitizeRelationRowDraft(row, primary || undefined, secondary || undefined)
      )

      return {
        datasetId,
        relationType: existing.relationType || 'left',
        rows: normalizedRows.length
          ? normalizedRows
          : [createRelationRowDraft(primary || undefined, secondary || undefined)]
      } satisfies DatasetCombinationSecondaryRelationDraft
    })
    .filter(Boolean)
}

const updateSuggestedName = (
  nextPrimaryId = primaryDatasetId.value,
  nextSecondaryIds = secondaryDatasetIds.value
) => {
  const options = [nextPrimaryId, ...nextSecondaryIds]
    .map(id => datasetLookup.value[id])
    .filter((item): item is DatasetCombinationDialogDatasetOption => Boolean(item))
  const suggested = buildDefaultCombinationName(options, nextPrimaryId)
  if (!combinationName.value.trim() || combinationName.value === lastSuggestedName.value) {
    combinationName.value = suggested
  }
  lastSuggestedName.value = suggested
}

const syncRelationDrafts = (
  nextPrimaryId = primaryDatasetId.value,
  nextSecondaryIds = secondaryDatasetIds.value
) => {
  relationDrafts.value = buildRelationDrafts(nextPrimaryId, nextSecondaryIds)
}

const initializeState = () => {
  const datasetOptions = normalizedDatasetOptions.value
  const availableDatasetIds = datasetOptions.map(item => item.id)
  const draft = props.draft || null
  const draftPrimaryId =
    draft?.primaryDatasetId && availableDatasetIds.includes(draft.primaryDatasetId)
      ? draft.primaryDatasetId
      : ''
  const initialPrimaryId = draftPrimaryId || datasetOptions[0]?.id || ''
  const draftSecondaryIds = (draft?.secondaryDatasetIds || [])
    .filter(id => id && id !== initialPrimaryId && availableDatasetIds.includes(id))
    .filter((id, index, arr) => arr.indexOf(id) === index)
  const initialSecondaryIds = draftSecondaryIds.length
    ? draftSecondaryIds
    : datasetOptions.map(item => item.id).filter(id => id && id !== initialPrimaryId)

  primaryDatasetId.value = initialPrimaryId
  secondaryDatasetIds.value = initialSecondaryIds
  relationDrafts.value = buildRelationDrafts(
    initialPrimaryId,
    initialSecondaryIds,
    initialSecondaryIds.map(datasetId => {
      const rows = (draft?.relations || [])
        .filter(item => item.rightDatasetId === datasetId)
        .map(item => ({
          leftField: item.leftField,
          rightField: item.rightField
        }))

      return {
        datasetId,
        relationType:
          draft?.relations.find(item => item.rightDatasetId === datasetId)?.relationType || 'left',
        rows
      } satisfies DatasetCombinationSecondaryRelationDraft
    })
  )
  combinationName.value = String(draft?.name || '').trim()
  updateSuggestedName(initialPrimaryId, initialSecondaryIds)
}

const resetState = () => {
  combinationName.value = ''
  primaryDatasetId.value = ''
  secondaryDatasetIds.value = []
  relationDrafts.value = []
  lastSuggestedName.value = ''
}

const handlePrimaryDatasetChange = (value: string) => {
  const nextPrimaryId = String(value || '')
  const previousPrimaryId = primaryDatasetId.value
  primaryDatasetId.value = nextPrimaryId

  let nextSecondaryIds = secondaryDatasetIds.value.filter(id => id && id !== nextPrimaryId)
  if (!nextSecondaryIds.length) {
    const fallbackSecondaryId = [
      previousPrimaryId,
      ...normalizedDatasetOptions.value.map(item => item.id)
    ].find(id => id && id !== nextPrimaryId)
    nextSecondaryIds = fallbackSecondaryId ? [fallbackSecondaryId] : []
  }

  secondaryDatasetIds.value = [...new Set(nextSecondaryIds)]
  syncRelationDrafts(nextPrimaryId, secondaryDatasetIds.value)
  updateSuggestedName(nextPrimaryId, secondaryDatasetIds.value)
}

const toggleSecondaryDataset = (datasetId: string) => {
  if (!datasetId || datasetId === primaryDatasetId.value) {
    return
  }

  const nextSecondaryIds = secondaryDatasetIds.value.includes(datasetId)
    ? secondaryDatasetIds.value.filter(id => id !== datasetId)
    : [...secondaryDatasetIds.value, datasetId]

  secondaryDatasetIds.value = [...new Set(nextSecondaryIds)]
  syncRelationDrafts(primaryDatasetId.value, secondaryDatasetIds.value)
  updateSuggestedName(primaryDatasetId.value, secondaryDatasetIds.value)
}

const addRelationRow = (datasetId: string) => {
  const draft = relationDrafts.value.find(item => item.datasetId === datasetId)
  if (!draft) {
    return
  }

  draft.rows.push(
    createRelationRowDraft(
      primaryDataset.value || undefined,
      datasetLookup.value[datasetId] || undefined
    )
  )
}

const removeRelationRow = (datasetId: string, rowId: string) => {
  const draft = relationDrafts.value.find(item => item.datasetId === datasetId)
  if (!draft || draft.rows.length <= 1) {
    return
  }

  draft.rows = draft.rows.filter(row => row.id !== rowId)
}

const closeDialog = () => {
  emit('close')
}

const handleConfirm = () => {
  if (!combinationName.value.trim()) {
    ElMessage.warning('请填写组合名称后继续')
    return
  }

  if (!primaryDatasetId.value) {
    ElMessage.warning('请先选择主数据集')
    return
  }

  if (!secondaryDatasetIds.value.length) {
    ElMessage.warning('请至少选择 1 个辅助数据集')
    return
  }

  for (const secondaryDatasetId of secondaryDatasetIds.value) {
    const draft = relationDrafts.value.find(item => item.datasetId === secondaryDatasetId)
    const secondaryDataset = datasetLookup.value[secondaryDatasetId]
    const primaryFields = getDatasetFields(primaryDatasetId.value)
    const secondaryFields = getDatasetFields(secondaryDatasetId)

    if (!secondaryDataset) {
      ElMessage.warning('当前辅助数据集不存在，请重新选择')
      return
    }

    if (!draft || !draft.rows.length) {
      ElMessage.warning(`请先为 ${secondaryDataset.title} 配置至少 1 条关联条件`)
      return
    }

    for (const row of draft.rows) {
      if (!row.leftField || !row.rightField) {
        ElMessage.warning(`请补全 ${secondaryDataset.title} 的关联字段`)
        return
      }
      if (!primaryFields.includes(row.leftField) || !secondaryFields.includes(row.rightField)) {
        ElMessage.warning(`请重新选择 ${secondaryDataset.title} 的关联字段，当前字段已失效`)
        return
      }
    }
  }

  emit('confirm', {
    name: combinationName.value.trim(),
    primaryDatasetId: primaryDatasetId.value,
    secondaryDatasetIds: [...secondaryDatasetIds.value],
    relations: relationDrafts.value.flatMap(draft =>
      draft.rows.map(row => ({
        leftDatasetId: primaryDatasetId.value,
        leftField: row.leftField,
        rightDatasetId: draft.datasetId,
        rightField: row.rightField,
        relationType: draft.relationType
      }))
    )
  })
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      initializeState()
      return
    }
    resetState()
  },
  { immediate: true }
)

watch(
  () => normalizedDatasetOptions.value.map(item => item.id).join(','),
  () => {
    if (!props.visible) {
      return
    }
    initializeState()
  }
)
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="combination-dialog-mask">
      <section class="combination-dialog">
        <header class="combination-dialog-head">
          <div>
            <div class="combination-dialog-title">数据集组合关系</div>
            <div class="combination-dialog-subtitle">
              已选 {{ selectedDatasetCount }} 个数据集，先确认组合关系，再进入后续提交流程
            </div>
          </div>
          <button class="combination-dialog-close" type="button" @click="closeDialog">×</button>
        </header>

        <div class="combination-dialog-body">
          <section class="combination-form-grid">
            <label class="combination-field">
              <span class="combination-field-label">组合名称</span>
              <input
                v-model="combinationName"
                class="combination-input"
                type="text"
                maxlength="50"
                placeholder="请输入组合名称"
              />
            </label>

            <label class="combination-field">
              <span class="combination-field-label">主数据集</span>
              <select
                :value="primaryDatasetId"
                class="combination-select"
                @change="handlePrimaryDatasetChange(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="item in normalizedDatasetOptions" :key="item.id" :value="item.id">
                  {{ item.title }}
                </option>
              </select>
            </label>
          </section>

          <section class="combination-section">
            <div class="combination-section-head">
              <div class="combination-section-title">辅助数据集</div>
              <div class="combination-section-meta">可多选，后续关系均与主数据集建立关联</div>
            </div>

            <div class="dataset-toggle-grid">
              <button
                v-for="item in availableSecondaryDatasetOptions"
                :key="item.id"
                class="dataset-toggle-card"
                :class="{ selected: secondaryDatasetIds.includes(item.id) }"
                type="button"
                @click="toggleSecondaryDataset(item.id)"
              >
                <span class="dataset-toggle-title">{{ item.title }}</span>
                <span class="dataset-toggle-fields">
                  {{ buildCombinationFieldOptions(item).slice(0, 3).join(' / ') || '暂无字段预览' }}
                </span>
              </button>
            </div>
          </section>

          <section class="combination-section">
            <div class="combination-section-head">
              <div class="combination-section-title">关联条件</div>
              <div class="combination-section-meta">
                复用当前数据集组合编辑思路，按主数据集和各辅助数据集分别配置
              </div>
            </div>

            <div v-if="!relationDrafts.length" class="relation-empty-state">
              请至少选择 1 个辅助数据集后再配置关联关系
            </div>

            <article v-for="draft in relationDrafts" :key="draft.datasetId" class="relation-card">
              <header class="relation-card-head">
                <div>
                  <div class="relation-card-title">
                    {{ primaryDataset?.title || '主数据集' }} ×
                    {{ datasetLookup[draft.datasetId]?.title || '辅助数据集' }}
                  </div>
                  <div class="relation-card-meta">每个辅助数据集至少需要 1 条关联条件</div>
                </div>

                <div class="relation-card-actions">
                  <select v-model="draft.relationType" class="relation-type-select">
                    <option
                      v-for="item in relationTypeOptions"
                      :key="`${draft.datasetId}-${item.value}`"
                      :value="item.value"
                    >
                      {{ item.label }}
                    </option>
                  </select>
                  <button
                    class="relation-action primary"
                    type="button"
                    @click="addRelationRow(draft.datasetId)"
                  >
                    添加关联
                  </button>
                </div>
              </header>

              <div class="relation-table-head">
                <span>{{ primaryDataset?.title || '主数据集' }} 字段</span>
                <span>{{ datasetLookup[draft.datasetId]?.title || '辅助数据集' }} 字段</span>
              </div>

              <div v-for="row in draft.rows" :key="row.id" class="relation-row">
                <select v-model="row.leftField" class="relation-field-select">
                  <option value="">请选择字段</option>
                  <option
                    v-for="field in getDatasetFields(primaryDatasetId)"
                    :key="`${draft.datasetId}-left-${field}`"
                    :value="field"
                  >
                    {{ field }}
                  </option>
                </select>

                <span class="relation-link">=</span>

                <select v-model="row.rightField" class="relation-field-select">
                  <option value="">请选择字段</option>
                  <option
                    v-for="field in getDatasetFields(draft.datasetId)"
                    :key="`${draft.datasetId}-right-${field}`"
                    :value="field"
                  >
                    {{ field }}
                  </option>
                </select>

                <button
                  class="relation-action ghost"
                  type="button"
                  :disabled="draft.rows.length <= 1"
                  @click="removeRelationRow(draft.datasetId, row.id)"
                >
                  删除
                </button>
              </div>
            </article>
          </section>
        </div>

        <footer class="combination-dialog-foot">
          <button class="combination-foot-action ghost" type="button" @click="closeDialog">
            取消
          </button>
          <button class="combination-foot-action primary" type="button" @click="handleConfirm">
            确认组合关系
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.combination-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2200;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}

.combination-dialog {
  width: min(1120px, calc(100vw - 56px));
  max-height: calc(100vh - 56px);
  border-radius: 28px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.combination-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 28px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.combination-dialog-title {
  font-size: 22px;
  line-height: 30px;
  font-weight: 700;
  color: #0f172a;
}

.combination-dialog-subtitle {
  margin-top: 6px;
  font-size: 14px;
  line-height: 22px;
  color: #475569;
}

.combination-dialog-close {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: none;
  background: rgba(226, 232, 240, 0.72);
  color: #1e293b;
  font-size: 22px;
  cursor: pointer;
}

.combination-dialog-body {
  padding: 20px 28px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.combination-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 18px;
}

.combination-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.combination-field-label {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: #1e293b;
}

.combination-input,
.combination-select,
.relation-type-select,
.relation-field-select {
  width: 100%;
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.38);
  background: #ffffff;
  padding: 0 14px;
  font-size: 14px;
  line-height: 20px;
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.combination-input:focus,
.combination-select:focus,
.relation-type-select:focus,
.relation-field-select:focus {
  border-color: #1d4ed8;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.combination-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.combination-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.combination-section-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
  color: #0f172a;
}

.combination-section-meta {
  font-size: 13px;
  line-height: 20px;
  color: #64748b;
}

.dataset-toggle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.dataset-toggle-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  background: #ffffff;
  padding: 14px 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.dataset-toggle-card:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.38);
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.12);
}

.dataset-toggle-card.selected {
  border-color: #1d4ed8;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.14);
}

.dataset-toggle-title {
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
  color: #0f172a;
}

.dataset-toggle-fields {
  font-size: 13px;
  line-height: 20px;
  color: #64748b;
}

.relation-empty-state {
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 18px;
  padding: 18px 20px;
  font-size: 14px;
  line-height: 22px;
  color: #64748b;
  background: rgba(248, 250, 252, 0.84);
}

.relation-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 22px;
  background: #ffffff;
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.relation-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.relation-card-title {
  font-size: 15px;
  line-height: 22px;
  font-weight: 700;
  color: #0f172a;
}

.relation-card-meta {
  margin-top: 4px;
  font-size: 13px;
  line-height: 20px;
  color: #64748b;
}

.relation-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.relation-type-select {
  width: 128px;
}

.relation-table-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1fr) 88px;
  gap: 10px;
  font-size: 12px;
  line-height: 18px;
  color: #64748b;
  padding: 0 4px;
}

.relation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1fr) 88px;
  gap: 10px;
  align-items: center;
}

.relation-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 18px;
  font-weight: 700;
}

.relation-action,
.combination-foot-action {
  min-height: 40px;
  border-radius: 12px;
  border: none;
  padding: 0 16px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.relation-action:hover,
.combination-foot-action:hover {
  transform: translateY(-1px);
}

.relation-action.primary,
.combination-foot-action.primary {
  background: #1d4ed8;
  color: #ffffff;
}

.relation-action.ghost,
.combination-foot-action.ghost {
  background: rgba(226, 232, 240, 0.72);
  color: #1e293b;
}

.relation-action:disabled {
  opacity: 0.48;
  cursor: not-allowed;
  transform: none;
}

.combination-dialog-foot {
  padding: 18px 28px 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 960px) {
  .combination-dialog-mask {
    padding: 16px;
  }

  .combination-dialog {
    width: 100%;
    max-height: calc(100vh - 32px);
    border-radius: 22px;
  }

  .combination-form-grid {
    grid-template-columns: 1fr;
  }

  .relation-card-head,
  .combination-section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .relation-card-actions {
    width: 100%;
  }

  .relation-type-select {
    width: 100%;
  }

  .relation-table-head {
    display: none;
  }

  .relation-row {
    grid-template-columns: 1fr;
  }

  .relation-link {
    height: 36px;
  }
}
</style>
