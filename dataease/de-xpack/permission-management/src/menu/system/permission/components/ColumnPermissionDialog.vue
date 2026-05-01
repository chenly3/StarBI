<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MaskRuleDialog from './MaskRuleDialog.vue'
import SystemSelect from '../../shared/SystemSelect.vue'
import type {
  ColumnDesensitizationRule,
  ColumnPermissionFieldRule,
  ColumnStrategy,
  DatasetPermissionAuthObj,
  DatasetPermissionWhiteUser
} from '../types'

const props = withDefaults(
  defineProps<{
    visible: boolean
    maskVisible: boolean
    saving?: boolean
    deleting?: boolean
    isEdit?: boolean
    subjectType?: 'role' | 'user'
    targetOptions?: DatasetPermissionAuthObj[]
    selectedTargetId?: string | null
    fields?: ColumnPermissionFieldRule[]
    whitelistOptions?: DatasetPermissionWhiteUser[]
    selectedWhitelistIds?: string[]
    missingTarget?: boolean
    enabled?: boolean
    targetLoading?: boolean
    fieldLoading?: boolean
    whitelistLoading?: boolean
  }>(),
  {
    saving: false,
    deleting: false,
    isEdit: false,
    subjectType: 'role',
    targetOptions: () => [],
    selectedTargetId: null,
    fields: () => [],
    whitelistOptions: () => [],
    selectedWhitelistIds: () => [],
    missingTarget: false,
    enabled: true,
    targetLoading: false,
    fieldLoading: false,
    whitelistLoading: false
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-mask'): void
  (e: 'close-mask'): void
  (e: 'switch-subject-type', value: 'role' | 'user'): void
  (e: 'change-target', value: string | null): void
  (e: 'change-enable', value: boolean): void
  (e: 'toggle-field', fieldId: string): void
  (e: 'change-strategy', payload: { fieldId: string; strategy: ColumnStrategy }): void
  (e: 'refresh-whitelist'): void
  (e: 'change-whitelist', value: string[]): void
  (e: 'clear-whitelist'): void
  (e: 'update-mask-rule', payload: { fieldId: string; rule: ColumnDesensitizationRule }): void
  (e: 'submit'): void
  (e: 'delete'): void
}>()

const searchText = ref('')
const activeMaskFieldId = ref<string | null>(null)
const selectedWhitelistSet = computed(() => new Set(props.selectedWhitelistIds))
const busy = computed(() => props.saving || props.deleting)

const targetPlaceholder = computed(() => (props.subjectType === 'user' ? '请选择用户' : '请选择角色'))

const targetSelectOptions = computed(() =>
  props.targetOptions.map(item => ({
    label: item.name || '-',
    value: item.id
  }))
)

const selectedWhitelistItems = computed(() =>
  props.whitelistOptions.filter(item => selectedWhitelistSet.value.has(item.id))
)

const filteredFields = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) {
    return props.fields
  }
  return props.fields.filter(field => field.name.toLowerCase().includes(keyword))
})

const previewFromRule = (field: ColumnPermissionFieldRule): string => {
  if (!field.selected || field.opt === 'Prohibit') {
    return '禁止查看'
  }
  const rule = field.desensitizationRule
  if (rule.builtInRule === 'KeepFirstAndLastThreeCharacters') {
    return 'XXX***XXX'
  }
  if (rule.builtInRule === 'KeepMiddleThreeCharacters') {
    return '***XXX***'
  }
  if (rule.builtInRule === 'CompleteDesensitization') {
    return '******'
  }
  return 'X***'
}

const activeMaskField = computed(() => props.fields.find(field => field.id === activeMaskFieldId.value) || null)

watch(
  () => props.maskVisible,
  visible => {
    if (!visible) {
      return
    }
    const fallback =
      props.fields.find(field => field.selected && field.opt === 'Desensitization') || props.fields[0] || null
    if (!activeMaskFieldId.value || !props.fields.some(field => field.id === activeMaskFieldId.value)) {
      activeMaskFieldId.value = fallback?.id || null
    }
  },
  { immediate: true }
)

const onTargetChange = (value: string | number | null) => {
  emit('change-target', value == null || value === '' ? null : String(value))
}

const onToggleEnable = () => {
  if (busy.value) {
    return
  }
  emit('change-enable', !props.enabled)
}

const openMask = (fieldId: string) => {
  if (busy.value) {
    return
  }
  activeMaskFieldId.value = fieldId
  emit('open-mask')
}

const emitStrategyChange = (fieldId: string, strategy: ColumnStrategy) => {
  if (busy.value) {
    return
  }
  emit('change-strategy', { fieldId, strategy })
}

const saveMaskRule = (rule: ColumnDesensitizationRule) => {
  if (!activeMaskFieldId.value) {
    return
  }
  emit('update-mask-rule', { fieldId: activeMaskFieldId.value, rule })
  emit('close-mask')
}

const onWhitelistRowClick = (id: string) => {
  if (busy.value) {
    return
  }
  const next = new Set(props.selectedWhitelistIds)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  emit('change-whitelist', Array.from(next))
}

const removeWhitelist = (id: string) => {
  if (busy.value) {
    return
  }
  const next = new Set(props.selectedWhitelistIds)
  next.delete(id)
  emit('change-whitelist', Array.from(next))
}
</script>

<template>
  <div v-if="visible" class="dialog-mask">
    <div class="dialog-card">
      <div class="dialog-card__header">
        <h3>{{ isEdit ? '编辑列权限' : '添加列权限' }}</h3>
        <button type="button" class="dialog-card__close" @click="emit('close')">×</button>
      </div>

      <div class="dialog-card__body">
        <section class="section-block">
          <div class="section-title">
            <span class="section-title__bar"></span>
            <span>列权限规则</span>
          </div>

          <label class="switch-line">
            <button
              type="button"
              class="switch-line__control"
              :class="{ 'is-off': !enabled }"
              :disabled="busy"
              @click="onToggleEnable"
            >
              <span></span>
            </button>
            <span class="switch-line__label" :class="{ 'is-off': !enabled }">启用列权限</span>
          </label>

          <div class="field-label">类型</div>
          <div class="radio-row">
            <label class="radio-card" :class="{ 'is-active': subjectType === 'role' }">
              <input
                type="radio"
                name="column-rule-type"
                :checked="subjectType === 'role'"
                :disabled="busy"
                @change="emit('switch-subject-type', 'role')"
              />
              <span class="radio-card__dot"></span>
              <span>角色</span>
            </label>
            <label class="radio-card" :class="{ 'is-active': subjectType === 'user' }">
              <input
                type="radio"
                name="column-rule-type"
                :checked="subjectType === 'user'"
                :disabled="busy"
                @change="emit('switch-subject-type', 'user')"
              />
              <span class="radio-card__dot"></span>
              <span>用户</span>
            </label>
          </div>

          <div class="select-box">
            <SystemSelect
              :model-value="selectedTargetId || ''"
              :options="targetSelectOptions"
              :placeholder="targetPlaceholder"
              :disabled="busy || targetLoading"
              @change="onTargetChange"
            />
          </div>
          <div v-if="targetLoading" class="helper-tip">受限对象加载中...</div>
          <div v-if="missingTarget" class="missing-target-tip">原受限对象不存在，请重新选择</div>
        </section>

        <section class="section-block section-block--rules">
          <div class="field-label">设置规则</div>
          <div class="rule-surface">
            <div class="rule-surface__toolbar">
              <input
                v-model="searchText"
                class="search-box"
                type="text"
                placeholder="通过字段名称搜索"
                :disabled="busy || fieldLoading"
              />
            </div>

            <div class="rule-table">
              <div class="rule-table__head">
                <span class="col-check">
                  <span class="collapse-chip">−</span>
                </span>
                <span class="col-name">字段名称</span>
                <span class="col-preview">规则预览</span>
                <span class="col-actions">操作</span>
              </div>

              <template v-if="fieldLoading">
                <div class="rule-table__empty">字段规则加载中...</div>
              </template>
              <template v-else-if="!filteredFields.length">
                <div class="rule-table__empty">{{ searchText.trim() ? '暂无匹配字段' : '暂无字段规则' }}</div>
              </template>
              <div v-for="row in filteredFields" v-else :key="row.id" class="rule-table__row">
                <span class="col-check">
                  <button
                    type="button"
                    class="checkbox"
                    :class="{ 'is-checked': row.selected }"
                    :disabled="busy"
                    @click="emit('toggle-field', row.id)"
                  >
                    ✓
                  </button>
                </span>

                <span class="col-name field-cell">
                  <span class="field-type" :class="{ 'is-number': row.deType === 2 || row.deType === 3 }">
                    {{ row.deType === 2 || row.deType === 3 ? '#' : 'T' }}
                  </span>
                  <span>{{ row.name }}</span>
                </span>

                <span class="col-preview preview-cell">{{ previewFromRule(row) }}</span>

                <span class="col-actions action-cell">
                  <label
                    class="action-radio"
                    :class="{ 'is-active': row.selected && row.opt === 'Prohibit' }"
                    @click="emitStrategyChange(row.id, 'Prohibit')"
                  >
                    <span class="action-radio__dot"></span>
                    <span>禁用</span>
                  </label>
                  <label
                    class="action-radio"
                    :class="{ 'is-active': row.selected && row.opt === 'Desensitization' }"
                    @click="emitStrategyChange(row.id, 'Desensitization')"
                  >
                    <span class="action-radio__dot"></span>
                    <span>脱敏</span>
                  </label>
                  <button
                    type="button"
                    class="setting-btn"
                    :class="{ 'is-active': row.selected && row.opt === 'Desensitization' }"
                    :disabled="busy || !(row.selected && row.opt === 'Desensitization')"
                    @click="row.selected && row.opt === 'Desensitization' && openMask(row.id)"
                  >
                    <span>≡</span>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-title">
            <span class="section-title__bar"></span>
            <span>白名单</span>
            <span class="section-title__desc">以上权限规则对白名单用户不生效</span>
          </div>

          <div class="whitelist-box">
            <div class="whitelist-box__selected">
              <template v-if="selectedWhitelistItems.length">
                <button
                  v-for="item in selectedWhitelistItems"
                  :key="item.id"
                  type="button"
                  class="whitelist-tag"
                  @click="removeWhitelist(item.id)"
                >
                  {{ item.name }} ×
                </button>
              </template>
              <span v-else class="whitelist-box__placeholder">请选择用户</span>
            </div>
            <div class="whitelist-box__icons">
              <button
                type="button"
                class="icon-btn"
                :disabled="busy || whitelistLoading"
                @click="emit('refresh-whitelist')"
              >
                ⌕
              </button>
              <span>⌄</span>
            </div>
          </div>

          <div v-if="whitelistLoading" class="helper-tip">白名单用户加载中...</div>
          <div v-else-if="whitelistOptions.length" class="whitelist-list">
            <button
              v-for="item in whitelistOptions"
              :key="item.id"
              type="button"
              class="whitelist-list__item"
              :disabled="busy"
              @click="onWhitelistRowClick(item.id)"
            >
              <span>{{ item.name }}</span>
              <span v-if="selectedWhitelistSet.has(item.id)" class="whitelist-list__mark">✓</span>
            </button>
          </div>
        </section>
      </div>

      <div class="dialog-card__footer">
        <button v-if="isEdit" type="button" class="danger-btn" :disabled="deleting" @click="emit('delete')">
          删除
        </button>
        <div class="dialog-card__footer-right">
          <button type="button" class="ghost-btn" :disabled="busy" @click="emit('close')">取消</button>
          <button type="button" class="primary-btn" :disabled="saving" @click="emit('submit')">
            {{ saving ? '保存中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <MaskRuleDialog
      :visible="maskVisible"
      :field-name="activeMaskField?.name || ''"
      :rule="activeMaskField?.desensitizationRule || null"
      @close="emit('close-mask')"
      @submit="saveMaskRule"
    />
  </div>
</template>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.24);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  padding: 16px;
  box-sizing: border-box;
  z-index: 40;
}

.dialog-card {
  width: 960px;
  max-width: calc(100vw - 32px);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: min(calc(100vh - 32px), 860px);
  margin: auto;
}

@media (min-width: 2120px) {
  .dialog-card {
    width: 1040px;
  }
}

.dialog-card__header,
.dialog-card__footer {
  padding: 18px 24px;
}

.dialog-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-card__header h3 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  line-height: 30px;
  font-weight: 700;
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
  padding: 0 24px 4px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.section-block {
  margin-bottom: 14px;
  border: 1px solid #e3ebf7;
  border-radius: 12px;
  background: #fbfcff;
  padding: 14px 16px;
}

.section-block--rules {
  margin-bottom: 16px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: #111827;
  font-size: 16px;
  font-weight: 600;
}

.section-title__bar {
  width: 4px;
  height: 18px;
  border-radius: 999px;
  background: #3f7cff;
}

.section-title__desc {
  color: #9aa4b2;
  font-size: 14px;
  font-weight: 400;
}

.switch-line {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.switch-line__control {
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: #3f7cff;
  padding: 2px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  border: none;
  cursor: pointer;
}

.switch-line__control.is-off {
  background: #cbd5e1;
}

.switch-line__control span {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.14);
  transform: translateX(18px);
}

.switch-line__control.is-off span {
  transform: translateX(0);
}

.switch-line__label {
  color: #2f6bff;
  font-size: 15px;
  font-weight: 500;
}

.switch-line__label.is-off {
  color: #64748b;
}

.field-label {
  margin-bottom: 10px;
  color: #334155;
  font-size: 15px;
  font-weight: 600;
}

.radio-row {
  display: flex;
  gap: 24px;
  margin-bottom: 10px;
}

.radio-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #344054;
  font-size: 15px;
  cursor: pointer;
}

.radio-card input {
  display: none;
}

.radio-card__dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid #cfd7e3;
  box-sizing: border-box;
  position: relative;
}

.radio-card.is-active .radio-card__dot {
  border-color: #2f6bff;
}

.radio-card.is-active .radio-card__dot::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: #2f6bff;
}

.whitelist-box {
  width: 100%;
  min-height: 46px;
  border: 1px solid #d3deef;
  border-radius: 8px;
  background: #ffffff;
  box-sizing: border-box;
}

.select-box {
  position: relative;
  width: 100%;
}

.missing-target-tip {
  margin-top: 8px;
  color: #f04438;
  font-size: 14px;
}

.helper-tip {
  margin-top: 8px;
  color: #667085;
  font-size: 14px;
}

.rule-surface {
  border: 1px solid #dce6f5;
  border-radius: 10px;
  background: linear-gradient(180deg, #fbfcff 0%, #ffffff 100%);
  padding: 10px 12px;
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.rule-surface__toolbar {
  display: flex;
  align-items: center;
  padding-bottom: 8px;
}

.search-box {
  width: 100%;
  height: 42px;
  border: 1px solid #c8dafd;
  border-radius: 8px;
  padding: 0 14px;
  outline: none;
  box-sizing: border-box;
  color: #1f2937;
  font-size: 15px;
  background: #ffffff;
}

.search-box:focus {
  border-color: #7ea7ff;
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.08);
}

.rule-table {
  margin-top: 0;
  border: 1px solid #dce6f5;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
  flex: 1;
  min-height: 184px;
  overflow: auto;
}

.rule-table__empty {
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #98a2b3;
  font-size: 15px;
}

.rule-table__head,
.rule-table__row {
  display: grid;
  grid-template-columns: 56px minmax(240px, 1.25fr) minmax(180px, 0.8fr) 230px;
  align-items: center;
  min-height: 48px;
  padding: 0 14px;
  box-sizing: border-box;
  min-width: 760px;
}

.rule-table__head {
  background: #f5f8fd;
  color: #243047;
  font-size: 15px;
  font-weight: 700;
}

.rule-table__row {
  border-top: 1px solid #eef2f7;
  color: #344054;
  font-size: 15px;
  line-height: 22px;
}

.rule-table__head .col-check,
.rule-table__head .col-actions,
.rule-table__row .col-check {
  text-align: center;
  justify-content: center;
}

.rule-table__row:nth-child(odd) {
  background: #fcfdff;
}

.collapse-chip {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid #d7deea;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #2f6bff;
  background: #ffffff;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 1px solid #d7deea;
  border-radius: 6px;
  background: #ffffff;
  color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.checkbox.is-checked {
  border-color: #7aa2ff;
  background: #eef4ff;
  color: #2f6bff;
}

.checkbox:disabled,
.setting-btn:disabled,
.icon-btn:disabled,
.whitelist-list__item:disabled,
.ghost-btn:disabled,
.switch-line__control:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.field-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.field-type {
  color: #5b8cff;
  font-weight: 700;
  min-width: 12px;
}

.field-type.is-number {
  color: #22c55e;
}

.preview-cell {
  color: #344054;
  font-weight: 500;
}

.action-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: nowrap;
  padding: 8px 0;
}

.action-radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #667085;
  font-size: 15px;
  cursor: pointer;
}

.action-radio__dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid #cfd7e3;
  box-sizing: border-box;
  position: relative;
}

.action-radio.is-active {
  color: #344054;
}

.action-radio.is-active .action-radio__dot {
  border-color: #2f6bff;
}

.action-radio.is-active .action-radio__dot::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: #2f6bff;
}

.setting-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #98a2b3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.setting-btn.is-active {
  color: #64748b;
}

.whitelist-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
}

.whitelist-box__selected {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 30px;
}

.whitelist-box__placeholder {
  color: #98a2b3;
  font-size: 15px;
}

.whitelist-box__icons {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
}

.icon-btn {
  border: none;
  background: transparent;
  padding: 0;
  color: inherit;
  cursor: pointer;
}

.whitelist-tag {
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: #eef2f6;
  color: #475467;
  font-size: 15px;
  cursor: pointer;
}

.whitelist-list {
  margin-top: 8px;
  border: 1px solid #dde7f5;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  max-height: 148px;
  overflow-y: auto;
}

.whitelist-list__item {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  border: none;
  border-top: 1px solid #eef2f7;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #344054;
  font-size: 15px;
  cursor: pointer;
}

.whitelist-list__item:first-child {
  border-top: none;
}

.whitelist-list__mark {
  color: #2f6bff;
  font-weight: 700;
}

.dialog-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #e9eff8;
}

.dialog-card__footer-right {
  margin-left: auto;
  display: inline-flex;
  gap: 12px;
}

.ghost-btn,
.primary-btn,
.danger-btn {
  min-width: 84px;
  height: 40px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
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

.danger-btn {
  border: 1px solid #fecaca;
  background: #fff5f5;
  color: #dc2626;
}

@media (max-width: 1480px) {
  .dialog-card__header,
  .dialog-card__footer,
  .dialog-card__body {
    padding-left: 18px;
    padding-right: 18px;
  }

  .radio-row {
    flex-wrap: wrap;
    gap: 12px 18px;
  }
}
</style>
