<template>
  <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
    <!-- 报告类型 -->
    <el-form-item :label="t('report.report_type')" prop="rtid" required>
      <el-radio-group v-model="formData.rtid">
        <el-radio :label="0">{{ t('report.type_dashboard') }}</el-radio>
        <el-radio :label="1">{{ t('report.type_spreadsheet') }}</el-radio>
        <el-radio :label="2">{{ t('report.type_query') }}</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- 选择资源 -->
    <el-form-item :label="t('report.select_resource')" prop="rid" required>
      <el-tree-select
        v-model="formData.rid"
        :data="resourceTree"
        :props="{ label: 'name', children: 'children' }"
        :placeholder="t('report.select_resource_placeholder')"
        check-strictly
        clearable
        style="width: 100%"
      />
    </el-form-item>

    <!-- 任务名称 -->
    <el-form-item :label="t('report.task_name')" prop="name" required>
      <el-input
        v-model="formData.name"
        :placeholder="t('report.task_name_placeholder')"
        maxlength="100"
        show-word-limit
      />
    </el-form-item>

    <!-- 任务标题 -->
    <el-form-item :label="t('report.task_title')">
      <el-input
        v-model="formData.title"
        :placeholder="t('report.task_title_placeholder')"
        maxlength="200"
        show-word-limit
      />
    </el-form-item>

    <!-- 报告内容 -->
    <el-form-item :label="t('report.task_content')">
      <el-input
        v-model="formData.content"
        type="textarea"
        :rows="3"
        :placeholder="t('report.task_content_placeholder')"
        maxlength="500"
        show-word-limit
      />
    </el-form-item>

    <!-- 导出格式 -->
    <el-form-item :label="t('report.export_format')" prop="format">
      <el-radio-group v-model="formData.format">
        <el-radio :label="0">{{ t('report.format_pdf') }}</el-radio>
        <el-radio :label="1">{{ t('report.format_excel') }}</el-radio>
        <el-radio :label="2">{{ t('report.format_image') }}</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- 显示水印 -->
    <el-form-item :label="t('report.show_watermark')">
      <el-switch v-model="formData.showWatermark" />
    </el-form-item>

    <!-- 更多设置 -->
    <el-collapse class="more-settings">
      <el-collapse-item :title="t('report.more_settings')" name="1">
        <!-- 像素设置 -->
        <el-form-item :label="t('report.pixel')">
          <el-select v-model="formData.pixel" :placeholder="t('report.select_pixel')">
            <el-option label="1920x1080" value="1920x1080" />
            <el-option label="2560x1440" value="2560x1440" />
            <el-option label="3840x2160" value="3840x2160" />
          </el-select>
        </el-form-item>

        <!-- 扩展等待时间 -->
        <el-form-item :label="t('report.ext_wait_time')">
          <el-input-number
            v-model="formData.extWaitTime"
            :min="0"
            :max="300"
            :step="10"
          />
          <span style="margin-left: 10px">{{ t('common.seconds') }}</span>
        </el-form-item>

        <!-- 出错重试 -->
        <el-form-item :label="t('report.retry_enable')">
          <el-switch v-model="formData.retryEnable" />
        </el-form-item>

        <template v-if="formData.retryEnable">
          <el-form-item :label="t('report.retry_limit')">
            <el-input-number
              v-model="formData.retryLimit"
              :min="1"
              :max="10"
            />
          </el-form-item>

          <el-form-item :label="t('report.retry_interval')">
            <el-input-number
              v-model="formData.retryInterval"
              :min="30"
              :max="600"
              :step="30"
            />
            <span style="margin-left: 10px">{{ t('common.seconds') }}</span>
          </el-form-item>
        </template>
      </el-collapse-item>
    </el-collapse>
  </el-form>
</template>

<script lang="ts" setup>
import { ref, reactive, computed } from 'vue'
import { useI18n } from '@/hooks/web/useI18n'

const { t } = useI18n()

const props = defineProps<{
  formData: any
}>()

const formRef = ref()
const resourceTree = ref<any[]>([])

// 表单验证规则
const rules = reactive({
  rtid: [{ required: true, message: t('report.report_type_required'), trigger: 'change' }],
  rid: [{ required: true, message: t('report.resource_required'), trigger: 'change' }],
  name: [
    { required: true, message: t('report.task_name_required'), trigger: 'blur' },
    { min: 2, max: 100, message: t('report.task_name_length_limit'), trigger: 'blur' }
  ]
})

// 验证方法
const validate = () => {
  return new Promise((resolve) => {
    formRef.value?.validate((valid: boolean) => {
      resolve(valid)
    })
  })
}

// TODO: 加载资源树数据
const loadResourceTree = async () => {
  // 根据rtid加载不同的资源树
  resourceTree.value = []
}

defineExpose({
  validate
})
</script>

<style lang="less" scoped>
.more-settings {
  margin-top: 20px;
  
  :deep(.el-collapse-item__header) {
    font-weight: normal;
  }
}
</style>
