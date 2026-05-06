<template>
  <el-form ref="formRef" :model="localForm" :rules="rules" label-position="top" @submit.prevent>
    <el-form-item :label="t('report.report_type')" prop="rtid" required>
      <el-radio-group v-model="localForm.rtid">
        <el-radio :label="0">{{ t('report.type_dashboard') }}</el-radio>
        <el-radio :label="1">{{ t('report.type_spreadsheet') }}</el-radio>
        <el-radio :label="2">{{ t('report.type_query') }}</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item :label="t('report.select_resource')" prop="rid" required>
      <el-tree-select
        v-model="localForm.rid"
        :data="resourceTree"
        :props="{ label: 'name', children: 'children' }"
        :placeholder="t('report.select_resource_placeholder')"
        check-strictly
        clearable
        style="width: 100%"
      />
    </el-form-item>

    <el-form-item :label="t('report.task_name')" prop="name" required>
      <el-input
        v-model="localForm.name"
        :placeholder="t('report.task_name_placeholder')"
        maxlength="100"
        show-word-limit
      />
    </el-form-item>

    <el-form-item :label="t('report.task_title')">
      <el-input
        v-model="localForm.title"
        :placeholder="t('report.task_title_placeholder')"
        maxlength="200"
        show-word-limit
      />
    </el-form-item>

    <el-form-item :label="t('report.task_content')">
      <el-input
        v-model="localForm.content"
        type="textarea"
        :autosize="{ minRows: 3, maxRows: 8 }"
        :placeholder="t('report.task_content_placeholder')"
        maxlength="500"
        show-word-limit
      />
    </el-form-item>

    <el-form-item :label="t('report.export_format')" prop="format">
      <el-radio-group v-model="localForm.format">
        <el-radio :label="0">{{ t('report.format_pdf') }}</el-radio>
        <el-radio :label="1">{{ t('report.format_excel') }}</el-radio>
        <el-radio :label="2">{{ t('report.format_image') }}</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item :label="t('report.show_watermark')">
      <el-switch v-model="localForm.showWatermark" />
    </el-form-item>

    <el-collapse class="more-settings">
      <el-collapse-item :title="t('report.more_settings')" name="1">
        <el-form-item :label="t('report.pixel')">
          <el-select v-model="localForm.pixel" :placeholder="t('report.select_pixel')">
            <el-option label="1920x1080" value="1920x1080" />
            <el-option label="2560x1440" value="2560x1440" />
            <el-option label="3840x2160" value="3840x2160" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('report.ext_wait_time')">
          <div class="input-with-unit">
            <el-input-number v-model="localForm.extWaitTime" :min="0" :max="300" :step="10" />
            <span class="unit-label">{{ t('common.seconds') || '秒' }}</span>
          </div>
        </el-form-item>

        <el-form-item :label="t('report.retry_enable')">
          <el-switch v-model="localForm.retryEnable" />
        </el-form-item>

        <template v-if="localForm.retryEnable">
          <el-form-item :label="t('report.retry_limit')">
            <el-input-number v-model="localForm.retryLimit" :min="1" :max="10" />
          </el-form-item>

          <el-form-item :label="t('report.retry_interval')">
            <div class="input-with-unit">
              <el-input-number v-model="localForm.retryInterval" :min="30" :max="600" :step="30" />
              <span class="unit-label">{{ t('common.seconds') || '秒' }}</span>
            </div>
          </el-form-item>
        </template>
      </el-collapse-item>
    </el-collapse>
  </el-form>
</template>

<script lang="ts" setup>
import { ref, reactive, watch } from 'vue'
import { useI18n } from '@/hooks/web/useI18n'

const { t } = useI18n()

const props = defineProps<{ formData: any }>()
const emit = defineEmits<{ 'update:formData': [value: any] }>()

const formRef = ref()
const resourceTree = ref<any[]>([])
const localForm = ref({ ...props.formData })

watch(localForm, newVal => emit('update:formData', newVal), { deep: true })

const rules = reactive({
  rtid: [{ required: true, message: t('report.report_type_required'), trigger: 'change' }],
  rid: [{ required: true, message: t('report.resource_required'), trigger: 'change' }],
  name: [
    { required: true, message: t('report.task_name_required'), trigger: 'blur' },
    { min: 2, max: 100, message: t('report.task_name_length_limit'), trigger: 'blur' }
  ]
})

const validate = () =>
  new Promise(resolve => {
    formRef.value?.validate((valid: boolean) => resolve(valid))
  })

defineExpose({ validate })
</script>

<style lang="less" scoped>
.more-settings {
  margin-top: 20px;
  :deep(.ed-collapse-item__header) {
    font-weight: normal;
  }
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit-label {
  color: #64748b;
  font-size: 15px;
  flex-shrink: 0;
}
</style>
