<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SqlbotNewClarificationState } from '@/views/sqlbot-new/types'

const props = defineProps<{
  clarification: SqlbotNewClarificationState
}>()

const emit = defineEmits<{
  (event: 'choose', value: string | string[]): void
  (event: 'selection-change', value: string[]): void
}>()

const visibleOptions = computed(() => {
  return (props.clarification.options || []).slice(0, 6)
})

const isMultiple = computed(() => props.clarification.selectionMode === 'multiple')
const isPending = computed(() => props.clarification.pending !== false)

const visibleOptionValues = computed(() => {
  return new Set(visibleOptions.value.map(item => item.value))
})

const normalizeSelectedValues = (values?: string[]) => {
  return [...new Set((values || []).filter(value => visibleOptionValues.value.has(value)))]
}

const draftSelectedValues = ref<string[]>([])

watch(
  [() => props.clarification.selectedValues, () => visibleOptions.value.map(item => item.value)],
  () => {
    draftSelectedValues.value = normalizeSelectedValues(props.clarification.selectedValues)
  },
  {
    immediate: true
  }
)

const selectedValues = computed({
  get: () => draftSelectedValues.value,
  set: value => {
    const nextValue = normalizeSelectedValues(value)
    draftSelectedValues.value = nextValue
    emit('selection-change', nextValue)
  }
})

const toggleOption = (value: string) => {
  if (!isPending.value) {
    return
  }
  if (!isMultiple.value) {
    emit('choose', value)
    return
  }

  selectedValues.value = selectedValues.value.includes(value)
    ? selectedValues.value.filter(item => item !== value)
    : [...selectedValues.value, value]
}

const confirmSelection = () => {
  if (!isPending.value || !selectedValues.value.length) {
    return
  }
  emit('choose', [...selectedValues.value])
}
</script>

<template>
  <section class="clarification-card">
    <div class="clarification-kicker">需要确认</div>
    <div class="clarification-title">{{ clarification.prompt }}</div>
    <div class="clarification-options" :class="{ 'is-grid': isMultiple }">
      <button
        v-for="item in visibleOptions"
        :key="item.value"
        class="clarification-option"
        :class="{ selected: selectedValues.includes(item.value), 'is-card': isMultiple }"
        type="button"
        :disabled="!isPending"
        @click="toggleOption(item.value)"
      >
        <span class="option-label">{{ item.label }}</span>
        <div v-if="item.chips?.length" class="option-chip-row">
          <span v-for="chip in item.chips" :key="`${item.value}-${chip}`" class="option-chip">
            {{ chip }}
          </span>
        </div>
        <span v-else-if="item.description" class="option-desc">{{ item.description }}</span>
      </button>
    </div>

    <div v-if="isMultiple" class="clarification-foot">
      <div class="clarification-selection-copy">
        <span v-if="selectedValues.length">已选 {{ selectedValues.length }} 个数据集</span>
        <span v-else>请选择 1 个或多个数据集后继续</span>
      </div>
      <button
        class="clarification-confirm"
        type="button"
        :disabled="!isPending || !selectedValues.length"
        @click="confirmSelection"
      >
        {{ clarification.confirmLabel || '按所选数据集继续' }}
      </button>
    </div>
  </section>
</template>

<style scoped lang="less">
.clarification-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(70, 114, 214, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(243, 247, 255, 0.98) 100%);
}

.clarification-kicker {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #4a6ee0;
}

.clarification-title {
  font-size: 16px;
  line-height: 1.6;
  color: #20315f;
  font-weight: 600;
}

.clarification-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.clarification-options.is-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 16px;
}

.clarification-option {
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 12px 14px;
  border: 1px solid rgba(74, 110, 224, 0.16);
  border-radius: 16px;
  background: #fff;
  color: #1f3161;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clarification-option:hover {
  transform: translateY(-1px);
  border-color: rgba(74, 110, 224, 0.38);
  box-shadow: 0 10px 20px rgba(53, 87, 170, 0.08);
}

.clarification-option:disabled {
  cursor: default;
  transform: none;
  box-shadow: none;
}

.clarification-option.is-card {
  min-width: 0;
  min-height: 84px;
  padding: 14px 16px;
  border-radius: 12px;
}

.clarification-option.selected {
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.2), 0 10px 20px rgba(53, 87, 170, 0.08);
  background: linear-gradient(180deg, #ffffff 0%, #f6f9ff 100%);
}

.option-label {
  font-size: 14px;
  font-weight: 600;
}

.option-chip-row {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.option-chip {
  height: 18px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  line-height: 16px;
}

.option-desc {
  font-size: 12px;
  line-height: 1.5;
  color: #6a7696;
}

.clarification-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.clarification-selection-copy {
  font-size: 13px;
  line-height: 20px;
  color: #60708d;
}

.clarification-confirm {
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.clarification-confirm:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
