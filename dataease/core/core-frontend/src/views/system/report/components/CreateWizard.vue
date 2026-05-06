<template>
  <el-drawer
    v-model="visible"
    :title="isEdit ? t('report.edit_task') : t('report.create_task')"
    destroy-on-close
    size="640px"
    :before-close="handleClose"
    modal-class="report-task-drawer"
  >
    <el-steps :active="currentStep" finish-status="success" class="wizard-steps">
      <el-step :title="t('report.step_basic')" />
      <el-step :title="t('report.step_recipient')" />
      <el-step :title="t('report.step_send')" />
    </el-steps>

    <div class="wizard-content">
      <el-scrollbar>
        <step1-basic
          v-show="currentStep === 0"
          ref="step1Ref"
          :form-data="formData"
          @update:form-data="formData = $event"
        />
        <step2-recipient
          v-show="currentStep === 1"
          ref="step2Ref"
          :form-data="formData"
          @update:form-data="formData = $event"
        />
        <step3-send
          v-show="currentStep === 2"
          ref="step3Ref"
          :form-data="formData"
          @update:form-data="formData = $event"
        />
      </el-scrollbar>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="currentStep > 0" secondary @click="handlePrev">
          {{ t('common.prev') }}
        </el-button>
        <el-button v-if="currentStep < 2" type="primary" @click="handleNext">
          {{ t('common.next') }}
        </el-button>
        <el-button
          v-if="currentStep === 2"
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ isEdit ? t('common.save') : t('common.sure') }}
        </el-button>
        <el-button secondary @click="handleClose">{{ t('common.cancel') }}</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus-secondary'
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

const loadTaskInfo = async () => {
  if (!props.taskId) return
  try {
    const res = await reportInfo(props.taskId)
    formData.value = { ...formData.value, ...res.data }
  } catch {
    ElMessage.error(t('report.load_info_failed'))
  }
}

const handlePrev = () => {
  if (currentStep.value > 0) currentStep.value--
}

const handleNext = async () => {
  const currentRef = [step1Ref, step2Ref, step3Ref][currentStep.value]
  if (currentRef?.value) {
    const valid = await currentRef.value.validate()
    if (valid) currentStep.value++
  }
}

const handleSubmit = async () => {
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
  } catch {
    ElMessage.error(isEdit.value ? t('report.update_failed') : t('report.create_failed'))
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  currentStep.value = 0
  emit('close')
}

watch(
  () => props.taskId,
  () => {
    if (props.taskId) loadTaskInfo()
  },
  { immediate: true }
)
</script>

<style lang="less" scoped>
.wizard-steps {
  margin-bottom: 24px;
  padding: 0 4px;
}

.wizard-content {
  min-height: 400px;
  max-height: calc(100vh - 300px);
  overflow: hidden;
}
</style>
<style lang="less">
.report-task-drawer {
  .ed-drawer__header {
    margin-bottom: 0;
    padding: 18px 24px 14px;
    border-bottom: 1px solid #edf0f5;
  }

  .ed-drawer__title {
    color: #111827;
    font-size: 18px;
    line-height: 26px;
    font-weight: 700;
  }

  .ed-drawer__body {
    padding: 18px 24px;
    color: #27364f;
    font-size: 15px;
    line-height: 24px;
  }

  .ed-drawer__footer {
    padding: 14px 24px 20px;
    border-top: 1px solid #edf0f5;
  }

  .ed-form-item__label {
    margin-bottom: 8px;
    color: #344054;
    font-size: 15px;
    line-height: 22px;
    font-weight: 600;
  }

  .ed-input__wrapper,
  .ed-select__wrapper {
    min-height: var(--system-control-height, 44px);
    height: var(--system-control-height, 44px);
    border-radius: 8px;
    font-size: 15px;
    box-sizing: border-box;
  }

  .ed-input__inner,
  .ed-select__input,
  .ed-select__placeholder {
    height: var(--system-control-height, 44px);
    font-size: 15px;
    line-height: 24px;
  }

  .ed-textarea__inner {
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 15px;
    line-height: 24px;
  }

  .ed-radio__label,
  .ed-checkbox__label {
    font-size: 15px;
  }

  .ed-button {
    height: var(--system-control-height, 44px);
    min-height: var(--system-control-height, 44px);
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>
