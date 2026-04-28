<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus-secondary'
import type { QueryLearningPatchType } from '@/api/queryResourceLearning'
import type { SqlbotNewConversationRecord } from '@/views/sqlbot-new/useSqlbotNewConversation'

export interface SqlbotNewLearningFixSubmitPayload {
  questionText: string
  matchedSql: string
  patchTypes: QueryLearningPatchType[]
  beforeSnapshot: Record<string, any>
  afterSnapshot: Record<string, any>
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    record?: SqlbotNewConversationRecord | null
    submitting?: boolean
  }>(),
  {
    record: null,
    submitting: false
  }
)

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'submit', payload: SqlbotNewLearningFixSubmitPayload): void
}>()

const selectedPatchTypes = ref<QueryLearningPatchType[]>(['sql_override'])
const fixedSql = ref('')
const fieldMappingText = ref('')
const valueMappingText = ref('')

const currentQuestion = computed(() => String(props.record?.question || '').trim())
const currentSql = computed(() => String(props.record?.sql || '').trim())
const hasSqlOverride = computed(() => selectedPatchTypes.value.includes('sql_override'))
const hasFieldMappingFix = computed(() => selectedPatchTypes.value.includes('field_mapping_fix'))
const hasValueMappingFix = computed(() => selectedPatchTypes.value.includes('value_mapping_fix'))

const resetDialog = () => {
  selectedPatchTypes.value = ['sql_override']
  fixedSql.value = currentSql.value
  fieldMappingText.value = ''
  valueMappingText.value = ''
}

watch(
  () => [props.visible, props.record?.localId] as const,
  ([visible]) => {
    if (!visible) {
      return
    }
    resetDialog()
  },
  { immediate: true }
)

watch(
  () => hasSqlOverride.value,
  enabled => {
    if (enabled && !fixedSql.value.trim()) {
      fixedSql.value = currentSql.value
    }
  }
)

const parseJsonMapping = (source: string, label: string): Record<string, string> | null => {
  const normalized = String(source || '').trim()
  if (!normalized) {
    return {}
  }
  try {
    const parsed = JSON.parse(normalized)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      ElMessage.warning(`${label} 需为 JSON 对象格式`)
      return null
    }
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedKey = String(key || '').trim()
      const normalizedValue = String(value ?? '').trim()
      if (normalizedKey && normalizedValue) {
        acc[normalizedKey] = normalizedValue
      }
      return acc
    }, {})
  } catch (error) {
    ElMessage.warning(`${label} 不是合法 JSON，请先修正后再提交`)
    return null
  }
}

const closeDialog = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!selectedPatchTypes.value.length) {
    ElMessage.warning('请至少选择一种学习修正类型')
    return
  }

  if (hasSqlOverride.value && !fixedSql.value.trim()) {
    ElMessage.warning('请填写修正后的 SQL')
    return
  }

  const fieldMapping = hasFieldMappingFix.value
    ? parseJsonMapping(fieldMappingText.value, '字段映射修正')
    : {}
  if (fieldMapping === null) {
    return
  }

  const valueMapping = hasValueMappingFix.value
    ? parseJsonMapping(valueMappingText.value, '值映射修正')
    : {}
  if (valueMapping === null) {
    return
  }

  const beforeSnapshot: Record<string, any> = {
    sql: currentSql.value
  }
  const afterSnapshot: Record<string, any> = {}

  if (hasSqlOverride.value) {
    afterSnapshot.sql = fixedSql.value.trim()
  }
  if (hasFieldMappingFix.value) {
    afterSnapshot.field_mapping = fieldMapping
  }
  if (hasValueMappingFix.value) {
    afterSnapshot.value_mapping = valueMapping
  }

  emit('submit', {
    questionText: currentQuestion.value,
    matchedSql: currentSql.value,
    patchTypes: [...selectedPatchTypes.value],
    beforeSnapshot,
    afterSnapshot
  })
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="学习修正"
    width="860px"
    @update:model-value="value => emit('update:visible', value)"
  >
    <div class="learning-fix-body">
      <el-form label-position="top">
        <el-form-item label="当前问题">
          <el-input :model-value="currentQuestion" type="textarea" :rows="2" readonly />
        </el-form-item>

        <el-form-item label="当前命中 SQL">
          <el-input :model-value="currentSql" type="textarea" :rows="4" readonly />
        </el-form-item>

        <el-form-item label="学习修正类型">
          <el-checkbox-group v-model="selectedPatchTypes">
            <el-checkbox label="sql_override">SQL 覆写</el-checkbox>
            <el-checkbox label="field_mapping_fix">字段映射修正</el-checkbox>
            <el-checkbox label="value_mapping_fix">值映射修正</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item v-if="hasSqlOverride" label="修正 SQL">
          <el-input
            v-model="fixedSql"
            type="textarea"
            :rows="6"
            placeholder="请输入修正后的 SQL，提交后仅对当前资源立即生效"
          />
        </el-form-item>

        <el-form-item v-if="hasFieldMappingFix" label="字段映射修正（JSON）">
          <el-input
            v-model="fieldMappingText"
            type="textarea"
            :rows="4"
            placeholder='例如：{"销售额":"gmv","门店":"store_name"}'
          />
        </el-form-item>

        <el-form-item v-if="hasValueMappingFix" label="值映射修正（JSON）">
          <el-input
            v-model="valueMappingText"
            type="textarea"
            :rows="4"
            placeholder='例如：{"华东":"east","华南":"south"}'
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="learning-fix-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交学习</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="less">
.learning-fix-body {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 4px;
}

.learning-fix-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
