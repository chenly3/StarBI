<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? t('report.edit_task') : t('report.create_task')"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-steps :active="currentStep" finish-status="success" class="wizard-steps">
      <el-step :title="t('report.step_basic')" />
      <el-step :title="t('report.step_recipient')" />
      <el-step :title="t('report.step_send')" />
    </el-steps>

    <div class="wizard-content">
      <!-- 步骤1: 基本信息 -->
      <step1-basic
        v-show="currentStep === 0"
        ref="step1Ref"
        :form-data="formData"
      />

      <!-- 步骤2: 接收人 -->
      <step2-recipient
        v-show="currentStep === 1"
        ref="step2Ref"
        :form-data="formData"
      />

      <!-- 步骤3: 发送设置 -->
      <step3-send
        v-show="currentStep === 2"
        ref="step3Ref"
        :form-data="formData"
      />
    </div>

    <template #footer>
      <div class="wizard-footer">
        <el-button v-if="currentStep > 0" @click="handlePrev">
          {{ t('common.prev') }}
        </el-button>
        <el-button v-if="currentStep < 2" type="primary" @click="handleNext">
          {{ t('common.next') }}
        </el-button>
        <el-button v-else type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? t('common.update') : t('common.create') }}
        </el-button>
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/hooks/web/useI18n'
import Step1Basic from './Step1Basic.vue'
import Step2Recipient from './Step2Recipient.vue'
import Step3Send from './Step3Send.vue'
import { reportCreate, reportUpdate, reportInfo } from '@/api/report'

const { t } = useI18n()

const props = defineProps<{
  taskId: number | null
}>()

const emit = defineEmits(['close', 'success'])

const visible = ref(true)
const currentStep = ref(0)
const submitting = ref(false)
const step1Ref = ref()
const step2Ref = ref()
const step3Ref = ref()

const isEdit = computed(() => props.taskId !== null)

// 表单数据
const formData = ref<any>({
  name: '',
  title: '',
  content: '',
  rtid: 0,
  rid: null,
  showWatermark: false,
  format: 0,
  viewIdList: [],
  viewDataRange: 0,
  pixel: '',
  extWaitTime: 0,
  reciFlagList: [],
  uidList: [],
  ridList: [],
  emailList: [],
  dingtalkGroupList: [],
  larkGroupList: [],
  rateType: 1,
  rateVal: '12:00',
  startTime: null,
  endTime: null,
  retryEnable: false,
  retryLimit: 3,
  retryInterval: 60,
  dataPermission: 0
})

// 加载任务详情
const loadTaskInfo = async () => {
  if (!props.taskId) return
  
  try {
    const res = await reportInfo(props.taskId)
    formData.value = {
      ...formData.value,
      ...res.data
    }
  } catch (error) {
    ElMessage.error(t('report.load_info_failed'))
  }
}

// 上一步
const handlePrev = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 下一步
const handleNext = async () => {
  const currentRef = [step1Ref, step2Ref, step3Ref][currentStep.value]
  if (currentRef && currentRef.value) {
    const valid = await currentRef.value.validate()
    if (valid) {
      currentStep.value++
    }
  }
}

// 提交
const handleSubmit = async () => {
  // 验证所有步骤
  for (const stepRef of [step1Ref, step2Ref, step3Ref]) {
    if (stepRef.value) {
      const valid = await stepRef.value.validate()
      if (!valid) return
    }
  }

  submitting.value = true
  try {
    const data = { ...formData.value }
    
    if (isEdit.value) {
      data.taskId = props.taskId
      await reportUpdate(data)
      ElMessage.success(t('report.update_success'))
    } else {
      await reportCreate(data)
      ElMessage.success(t('report.create_success'))
    }
    
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error(isEdit.value ? t('report.update_failed') : t('report.create_failed'))
  } finally {
    submitting.value = false
  }
}

// 关闭
const handleClose = () => {
  emit('close')
}

watch(() => props.taskId, () => {
  if (props.taskId) {
    loadTaskInfo()
  }
}, { immediate: true })
</script>

<style lang="less" scoped>
.wizard-steps {
  margin-bottom: 30px;
}

.wizard-content {
  min-height: 400px;
  padding: 20px;
}

.wizard-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
