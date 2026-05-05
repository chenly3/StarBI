<template>
  <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
    <!-- 调度类型 -->
    <el-form-item :label="t('report.schedule_type')" prop="rateType" required>
      <el-radio-group v-model="formData.rateType" @change="handleRateTypeChange">
        <el-radio :label="0">{{ t('report.type_hourly') }}</el-radio>
        <el-radio :label="1">{{ t('report.type_daily') }}</el-radio>
        <el-radio :label="2">{{ t('report.type_weekly') }}</el-radio>
        <el-radio :label="3">{{ t('report.type_monthly') }}</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- 按小时 -->
    <template v-if="formData.rateType === 0">
      <el-form-item :label="t('report.interval')" required>
        <el-input-number
          v-model="hourInterval"
          :min="1"
          :max="24"
        />
        <span style="margin-left: 10px">{{ t('common.hours') }}</span>
      </el-form-item>
    </template>

    <!-- 按日 -->
    <template v-if="formData.rateType === 1">
      <el-form-item :label="t('report.execute_time')" required>
        <el-time-picker
          v-model="dailyTime"
          format="HH:mm"
          value-format="HH:mm"
          :placeholder="t('report.select_time')"
        />
      </el-form-item>
    </template>

    <!-- 按周 -->
    <template v-if="formData.rateType === 2">
      <el-form-item :label="t('report.day_of_week')" required>
        <el-select v-model="weekDay" :placeholder="t('report.select_day')">
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
        />
      </el-form-item>
    </template>

    <!-- 按月 -->
    <template v-if="formData.rateType === 3">
      <el-form-item :label="t('report.day_of_month')" required>
        <el-input-number
          v-model="monthDay"
          :min="1"
          :max="31"
        />
        <span style="margin-left: 10px">{{ t('common.day') }}</span>
      </el-form-item>
      <el-form-item :label="t('report.execute_time')" required>
        <el-time-picker
          v-model="monthlyTime"
          format="HH:mm"
          value-format="HH:mm"
          :placeholder="t('report.select_time')"
        />
      </el-form-item>
    </template>

    <!-- 执行时间范围 -->
    <el-form-item :label="t('report.execute_range')">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        :start-placeholder="t('report.start_date')"
        :end-placeholder="t('report.end_date')"
        format="YYYY-MM-DD"
        value-format="X"
      />
    </el-form-item>

    <!-- 调度预览 -->
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

const props = defineProps<{
  formData: any
}>()

const formRef = ref()

// 按小时
const hourInterval = ref(1)

// 按日
const dailyTime = ref('12:00')

// 按周
const weekDay = ref('1')
const weeklyTime = ref('12:00')

// 按月
const monthDay = ref(1)
const monthlyTime = ref('12:00')

// 日期范围
const dateRange = ref<[number, number] | null>(null)

// 表单验证规则
const rules = {
  rateType: [{ required: true, message: t('report.schedule_type_required'), trigger: 'change' }]
}

// 监听调度类型变化
const handleRateTypeChange = () => {
  updateRateVal()
}

// 更新rateVal
const updateRateVal = () => {
  const { rateType } = props.formData
  
  switch (rateType) {
    case 0: // 按小时
      props.formData.rateVal = String(hourInterval.value)
      break
    case 1: // 按日
      props.formData.rateVal = dailyTime.value
      break
    case 2: // 按周
      props.formData.rateVal = `${weekDay.value}:${weeklyTime.value}`
      break
    case 3: // 按月
      props.formData.rateVal = `${monthDay.value}:${monthlyTime.value}`
      break
  }
}

// 调度预览文本
const scheduleText = computed(() => {
  const { rateType } = props.formData
  
  switch (rateType) {
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

// 监听所有时间相关变化
watch([hourInterval, dailyTime, weekDay, weeklyTime, monthDay, monthlyTime], () => {
  updateRateVal()
})

// 验证方法
const validate = () => {
  return new Promise((resolve) => {
    formRef.value?.validate((valid: boolean) => {
      resolve(valid)
    })
  })
}

defineExpose({
  validate
})
</script>

<style lang="less" scoped>
.schedule-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  
  .el-icon {
    color: var(--el-color-primary);
  }
}
</style>
