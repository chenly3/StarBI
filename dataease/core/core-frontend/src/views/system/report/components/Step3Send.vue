<template>
  <el-form ref="formRef" :model="localForm" :rules="rules" label-position="top" @submit.prevent>
    <el-form-item :label="t('report.schedule_type')" prop="rateType" required>
      <el-radio-group v-model="localForm.rateType" @change="handleRateTypeChange">
        <el-radio :label="0">{{ t('report.type_hourly') }}</el-radio>
        <el-radio :label="1">{{ t('report.type_daily') }}</el-radio>
        <el-radio :label="2">{{ t('report.type_weekly') }}</el-radio>
        <el-radio :label="3">{{ t('report.type_monthly') }}</el-radio>
      </el-radio-group>
    </el-form-item>

    <template v-if="localForm.rateType === 0">
      <el-form-item :label="t('report.interval')" required>
        <div class="input-with-unit">
          <el-input-number v-model="hourInterval" :min="1" :max="24" />
          <span class="unit-label">{{ t('common.hours') || '小时' }}</span>
        </div>
      </el-form-item>
    </template>

    <template v-if="localForm.rateType === 1">
      <el-form-item :label="t('report.execute_time')" required>
        <el-time-picker
          v-model="dailyTime"
          format="HH:mm"
          value-format="HH:mm"
          :placeholder="t('report.select_time')"
          style="width: 100%"
        />
      </el-form-item>
    </template>

    <template v-if="localForm.rateType === 2">
      <el-form-item :label="t('report.day_of_week')" required>
        <el-select v-model="weekDay" :placeholder="t('report.select_day')" style="width: 100%">
          <el-option :label="t('report.monday')" value="1" />
          <el-option :label="t('report.tuesday')" value="2" />
          <el-option :label="t('report.wednesday')" value="3" />
          <el-option :label="t('report.thursday')" value="4" />
          <el-option :label="t('report.friday')" value="5" />
          <el-option :label="t('report.saturday')" value="6" />
          <el-option :label="t('report.sunday')" value="7" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('report.execute_time')" required>
        <el-time-picker
          v-model="weeklyTime"
          format="HH:mm"
          value-format="HH:mm"
          :placeholder="t('report.select_time')"
          style="width: 100%"
        />
      </el-form-item>
    </template>

    <template v-if="localForm.rateType === 3">
      <el-form-item :label="t('report.day_of_month')" required>
        <div class="input-with-unit">
          <el-input-number v-model="monthDay" :min="1" :max="31" />
          <span class="unit-label">{{ t('common.day') || '日' }}</span>
        </div>
      </el-form-item>
      <el-form-item :label="t('report.execute_time')" required>
        <el-time-picker
          v-model="monthlyTime"
          format="HH:mm"
          value-format="HH:mm"
          :placeholder="t('report.select_time')"
          style="width: 100%"
        />
      </el-form-item>
    </template>

    <el-form-item :label="t('report.execute_range')">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        :start-placeholder="t('report.start_date')"
        :end-placeholder="t('report.end_date')"
        format="YYYY-MM-DD"
        value-format="X"
        style="width: 100%"
      />
    </el-form-item>

    <el-form-item :label="t('report.schedule_preview')">
      <div class="schedule-preview">
        <el-icon><Clock /></el-icon>
        <span>{{ scheduleText }}</span>
      </div>
    </el-form-item>
  </el-form>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { Clock } from '@element-plus/icons-vue'
import { useI18n } from '@/hooks/web/useI18n'

const { t } = useI18n()

const props = defineProps<{ formData: any }>()
const emit = defineEmits<{ 'update:formData': [value: any] }>()

const formRef = ref()
const localForm = ref({ ...props.formData })

watch(localForm, newVal => emit('update:formData', newVal), { deep: true })

const hourInterval = ref(1)
const dailyTime = ref('12:00')
const weekDay = ref('1')
const weeklyTime = ref('12:00')
const monthDay = ref(1)
const monthlyTime = ref('12:00')
const dateRange = ref<[number, number] | null>(null)

const rules = {
  rateType: [{ required: true, message: t('report.schedule_type_required'), trigger: 'change' }]
}

const handleRateTypeChange = () => updateRateVal()

const updateRateVal = () => {
  switch (localForm.value.rateType) {
    case 0:
      localForm.value.rateVal = String(hourInterval.value)
      break
    case 1:
      localForm.value.rateVal = dailyTime.value
      break
    case 2:
      localForm.value.rateVal = `${weekDay.value}:${weeklyTime.value}`
      break
    case 3:
      localForm.value.rateVal = `${monthDay.value}:${monthlyTime.value}`
      break
  }
}

const scheduleText = computed(() => {
  switch (localForm.value.rateType) {
    case 0:
      return t('report.preview_hourly', { interval: hourInterval.value })
    case 1:
      return t('report.preview_daily', { time: dailyTime.value })
    case 2:
      return t('report.preview_weekly', {
        day: t('report.weekday_' + weekDay.value),
        time: weeklyTime.value
      })
    case 3:
      return t('report.preview_monthly', { day: monthDay.value, time: monthlyTime.value })
    default:
      return '-'
  }
})

watch([hourInterval, dailyTime, weekDay, weeklyTime, monthDay, monthlyTime], () => updateRateVal())

const validate = () =>
  new Promise(resolve => {
    formRef.value?.validate((valid: boolean) => resolve(valid))
  })
defineExpose({ validate })
</script>

<style lang="less" scoped>
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

.schedule-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f7f9fc;
  border-radius: 8px;
  color: #27364f;
  font-size: 15px;
  line-height: 24px;

  .el-icon {
    color: var(--system-blue, #1f5eff);
  }
}
</style>
