<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SystemSelect from '../../shared/SystemSelect.vue'
import type { BuiltInMaskRule, ColumnDesensitizationRule } from '../types'

const props = defineProps<{
  visible: boolean
  fieldName: string
  rule: ColumnDesensitizationRule | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', value: ColumnDesensitizationRule): void
}>()

const builtInRule = ref<BuiltInMaskRule>('CompleteDesensitization')
const customBuiltInRule = ref<'RetainBeforeMAndAfterN' | 'RetainMToN'>('RetainMToN')
const m = ref(1)
const n = ref(1)
const customBuiltInRuleOptions = [
  { label: '保留第M至N位', value: 'RetainMToN' },
  { label: '保留前M后N位', value: 'RetainBeforeMAndAfterN' }
]

const normalizeRule = (rule: ColumnDesensitizationRule | null): ColumnDesensitizationRule => {
  if (!rule) {
    return {
      builtInRule: 'CompleteDesensitization',
      customBuiltInRule: 'RetainMToN',
      m: 1,
      n: 1,
      specialCharacter: '*',
      specialCharacterList: ['*']
    }
  }
  return {
    builtInRule: rule.builtInRule,
    customBuiltInRule: rule.customBuiltInRule === 'RetainBeforeMAndAfterN' ? 'RetainBeforeMAndAfterN' : 'RetainMToN',
    m: Math.max(rule.m || 1, 1),
    n: Math.max(rule.n || 1, 1),
    specialCharacter: rule.specialCharacter || '*',
    specialCharacterList: rule.specialCharacterList?.length ? rule.specialCharacterList : ['*']
  }
}

watch(
  () => props.visible,
  visible => {
    if (!visible) {
      return
    }
    const normalized = normalizeRule(props.rule)
    builtInRule.value = normalized.builtInRule
    customBuiltInRule.value = normalized.customBuiltInRule
    m.value = normalized.m
    n.value = normalized.n
  },
  { immediate: true }
)

const preview = computed(() => {
  const safeM = Number.isFinite(m.value) && m.value > 0 ? m.value : 1
  const safeN = Number.isFinite(n.value) && n.value > 0 ? n.value : 1
  if (builtInRule.value === 'CompleteDesensitization') {
    return '******'
  }
  if (builtInRule.value === 'KeepFirstAndLastThreeCharacters') {
    return 'XXX***XXX'
  }
  if (builtInRule.value === 'KeepMiddleThreeCharacters') {
    return '***XXX***'
  }
  if (customBuiltInRule.value === 'RetainMToN') {
    return `保留第${safeM}至${safeN}位`
  }
  return `保留前${safeM}后${safeN}位`
})

const previewText = computed(() => {
  if (builtInRule.value === 'CompleteDesensitization') {
    return '******'
  }
  if (builtInRule.value === 'KeepFirstAndLastThreeCharacters') {
    return 'XXX***XXX'
  }
  if (builtInRule.value === 'KeepMiddleThreeCharacters') {
    return '***XXX***'
  }
  return 'X***'
})

const customRangeInvalid = computed(() => {
  const safeM = Number.isFinite(m.value) && m.value > 0 ? m.value : 1
  const safeN = Number.isFinite(n.value) && n.value > 0 ? n.value : 1
  return builtInRule.value === 'custom' && customBuiltInRule.value === 'RetainMToN' && safeN < safeM
})

const submit = () => {
  if (customRangeInvalid.value) {
    return
  }
  const safeM = Number.isFinite(m.value) && m.value > 0 ? m.value : 1
  const safeN = Number.isFinite(n.value) && n.value > 0 ? n.value : 1
  emit('submit', {
    builtInRule: builtInRule.value,
    customBuiltInRule: customBuiltInRule.value,
    m: safeM,
    n: safeN,
    specialCharacter: '*',
    specialCharacterList: ['*']
  })
}
</script>

<template>
  <div v-if="visible" class="dialog-mask">
    <div class="dialog-card">
      <div class="dialog-card__header">
        <h3>设置脱敏规则</h3>
        <button type="button" class="dialog-card__close" @click="emit('close')">×</button>
      </div>

      <div class="dialog-card__body">
        <div v-if="fieldName" class="field-name">字段：{{ fieldName }}</div>
        <label class="option-row" :class="{ 'is-active': builtInRule === 'CompleteDesensitization' }">
          <input v-model="builtInRule" type="radio" value="CompleteDesensitization" />
          <span class="option-radio"></span>
          <span>******</span>
        </label>

        <label
          class="option-row"
          :class="{ 'is-active': builtInRule === 'KeepFirstAndLastThreeCharacters' }"
        >
          <input v-model="builtInRule" type="radio" value="KeepFirstAndLastThreeCharacters" />
          <span class="option-radio"></span>
          <span>XXX***XXX</span>
        </label>

        <label class="option-row" :class="{ 'is-active': builtInRule === 'KeepMiddleThreeCharacters' }">
          <input v-model="builtInRule" type="radio" value="KeepMiddleThreeCharacters" />
          <span class="option-radio"></span>
          <span>***XXX***</span>
        </label>

        <label class="option-row" :class="{ 'is-active': builtInRule === 'custom' }">
          <input v-model="builtInRule" type="radio" value="custom" />
          <span class="option-radio"></span>
          <span>自定义</span>
        </label>

        <template v-if="builtInRule === 'custom'">
          <div class="select-box">
            <SystemSelect v-model="customBuiltInRule" :options="customBuiltInRuleOptions" />
          </div>

          <div class="range-row">
            <span class="range-row__label">{{ preview }}</span>
          </div>

          <div class="number-row">
            <span>从M</span>
            <input v-model.number="m" class="number-box" type="number" min="1" />
            <span>至N</span>
            <input v-model.number="n" class="number-box" type="number" min="1" />
          </div>
          <div v-if="customRangeInvalid" class="error-text">自定义区间无效，N 不能小于 M</div>
        </template>

        <div class="preview-text">预览 {{ previewText }}</div>
      </div>

      <div class="dialog-card__footer">
        <button type="button" class="ghost-btn" @click="emit('close')">取消</button>
        <button type="button" class="primary-btn" :disabled="customRangeInvalid" @click="submit">确认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.22);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  padding: 16px;
  box-sizing: border-box;
  z-index: 60;
}

.dialog-card {
  width: min(520px, calc(100vw - 32px));
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: min(calc(100vh - 32px), 720px);
  margin: auto;
}

.dialog-card__header,
.dialog-card__footer {
  padding: 16px 18px;
}

.dialog-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-card__header h3 {
  margin: 0;
  font-size: 18px;
  line-height: 28px;
  color: #111827;
  font-weight: 600;
}

.dialog-card__close {
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.dialog-card__body {
  padding: 0 18px 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.field-name {
  color: #667085;
  font-size: 15px;
}

.option-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #334155;
  font-size: 15px;
}

.option-row input {
  display: none;
}

.option-radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  box-sizing: border-box;
  position: relative;
}

.option-row.is-active .option-radio {
  border-color: #2f6bff;
}

.option-row.is-active .option-radio::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: #2f6bff;
}

.select-box {
  width: 100%;
}

.range-row {
  color: #344054;
  font-size: 15px;
}

.number-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: #334155;
  font-size: 15px;
}

.number-box {
  width: 82px;
  height: 44px;
  border: 1px solid #d7deea;
  border-radius: 10px;
  padding: 0 14px;
  box-sizing: border-box;
  color: #344054;
  font-size: 16px;
}

.preview-text {
  color: #344054;
  font-size: 15px;
  font-weight: 500;
}

.error-text {
  color: #f04438;
  font-size: 13px;
}

.dialog-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.ghost-btn,
.primary-btn {
  min-width: 78px;
  height: 40px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.ghost-btn {
  border: 1px solid #d7deea;
  background: #ffffff;
  color: #344054;
}

.primary-btn {
  border: none;
  background: #2f6bff;
  color: #ffffff;
}

.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 1280px) {
  .dialog-card__header,
  .dialog-card__footer,
  .dialog-card__body {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>
