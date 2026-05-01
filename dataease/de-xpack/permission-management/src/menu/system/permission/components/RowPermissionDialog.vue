<script setup lang="ts">
import { computed, nextTick, provide, reactive, ref, watch } from 'vue'
import RowAuth from '@/views/visualized/data/dataset/auth-tree/RowAuth.vue'
import SystemSelect from '../../shared/SystemSelect.vue'
import type {
  ColumnPermissionFieldRule,
  DatasetPermissionAuthObj,
  DatasetPermissionTargetType,
  DatasetPermissionWhiteUser,
  RowDialogType
} from '../types'

type RowAuthExpose = {
  init: (expressionTree: { logic: 'or' | 'and'; items: unknown[] }) => void
  submit: () => void
}

type RowAuthSubmitPayload = {
  logic?: 'or' | 'and'
  items?: unknown[]
  errorMessage?: string
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    type: RowDialogType
    saving?: boolean
    deleting?: boolean
    isEdit?: boolean
    targetOptions?: DatasetPermissionAuthObj[]
    selectedTargetId?: string | null
    fieldOptions?: ColumnPermissionFieldRule[]
    whitelistOptions?: DatasetPermissionWhiteUser[]
    selectedWhitelistIds?: string[]
    expressionTree?: string
    missingTarget?: boolean
    enabled?: boolean
  }>(),
  {
    saving: false,
    deleting: false,
    isEdit: false,
    targetOptions: () => [],
    selectedTargetId: null,
    fieldOptions: () => [],
    whitelistOptions: () => [],
    selectedWhitelistIds: () => [],
    expressionTree: '',
    missingTarget: false,
    enabled: true
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'switch-type', value: RowDialogType): void
  (e: 'change-target', value: string | null): void
  (e: 'refresh-whitelist'): void
  (e: 'change-whitelist', value: string[]): void
  (e: 'change-expression', value: string): void
  (e: 'change-enable', value: boolean): void
  (e: 'submit'): void
  (e: 'delete'): void
}>()

const authTreeRef = ref<RowAuthExpose | null>(null)
const authTreeError = ref('')
const renderVisible = ref(props.visible)
const authTargetTypeContext = reactive<{ authTargetType: DatasetPermissionTargetType }>({
  authTargetType: 'role'
})

const objectPlaceholder = computed(() => {
  if (props.type === 'role') return '请选择角色'
  if (props.type === 'user') return '请选择用户'
  return '系统变量'
})

const targetSelectOptions = computed(() =>
  props.targetOptions.map(item => ({
    label: item.name || '-',
    value: item.id
  }))
)

const fieldOptionsForEditor = computed(() =>
  props.fieldOptions.map(field => ({
    id: field.id,
    name: field.name,
    deType: field.deType ?? 0
  }))
)

const fieldOptionsSignature = computed(() =>
  fieldOptionsForEditor.value.map(field => `${field.id}:${field.name}:${field.deType}`).join('|')
)

const hasExpressionItems = computed(() => parseExpressionTree(props.expressionTree).items.length > 0)

const selectedWhitelistSet = computed(() => new Set(props.selectedWhitelistIds))

const selectedWhitelistItems = computed(() => {
  return props.whitelistOptions.filter(item => selectedWhitelistSet.value.has(item.id))
})

provide('filedList', fieldOptionsForEditor)
provide('getAuthTargetType', authTargetTypeContext)

const parseExpressionTree = (raw: string): { logic: 'or' | 'and'; items: unknown[] } => {
  try {
    const parsed = JSON.parse(raw || '{}') as { logic?: unknown; items?: unknown }
    return {
      logic: parsed.logic === 'or' ? 'or' : 'and',
      items: Array.isArray(parsed.items) ? parsed.items : []
    }
  } catch {
    return { logic: 'and', items: [] }
  }
}

const syncAuthTree = async () => {
  if (!props.visible) {
    return
  }
  await nextTick()
  authTreeError.value = ''
  authTreeRef.value?.init(parseExpressionTree(props.expressionTree))
}

watch(
  () => props.type,
  value => {
    authTargetTypeContext.authTargetType = value === 'sysVar' ? 'sysParams' : value
  },
  { immediate: true }
)

watch(
  () => props.visible,
  visible => {
    renderVisible.value = visible
  },
  { immediate: true }
)

watch(
  () => [props.visible, props.expressionTree, props.type, fieldOptionsSignature.value] as const,
  () => {
    void syncAuthTree()
  },
  { immediate: true }
)

const onTargetChange = (value: string | number | null) => {
  emit('change-target', value == null || value === '' ? null : String(value))
}

const onWhiteListToggle = (id: string, checked: boolean) => {
  const next = new Set(props.selectedWhitelistIds)
  if (checked) {
    next.add(id)
  } else {
    next.delete(id)
  }
  emit('change-whitelist', Array.from(next))
}

const onWhitelistRowClick = (id: string) => {
  onWhiteListToggle(id, !selectedWhitelistSet.value.has(id))
}

const removeWhitelist = (id: string) => {
  onWhiteListToggle(id, false)
}

const onConfirm = () => {
  authTreeError.value = ''
  authTreeRef.value?.submit()
}

const onRequestClose = () => {
  renderVisible.value = false
  emit('close')
}

const onToggleEnable = () => {
  emit('change-enable', !props.enabled)
}

const onAuthSave = (payload: RowAuthSubmitPayload) => {
  const items = Array.isArray(payload.items) ? payload.items : []
  if (payload.errorMessage) {
    authTreeError.value = payload.errorMessage
    return
  }
  if (!items.length) {
    authTreeError.value = '请至少添加一个有效条件'
    return
  }
  emit(
    'change-expression',
    JSON.stringify({
      logic: payload.logic === 'or' ? 'or' : 'and',
      items
    })
  )
  emit('submit')
}
</script>

<template>
  <div v-if="renderVisible" class="dialog-mask">
    <div class="dialog-card">
      <div class="dialog-card__header">
        <h3>{{ isEdit ? '编辑行权限' : '添加行权限' }}</h3>
        <button type="button" class="dialog-card__close" @click="onRequestClose">×</button>
      </div>

      <div class="dialog-card__body">
        <section class="section-block">
          <div class="section-title">
            <span class="section-title__bar"></span>
            <span>行权限规则</span>
          </div>

          <div class="switch-line">
            <button
              type="button"
              class="switch-line__control"
              :class="{ 'is-off': !enabled }"
              :aria-checked="enabled"
              aria-label="启用行权限"
              role="switch"
              @click="onToggleEnable"
            >
              <span></span>
            </button>
            <span class="switch-line__label">启用行权限</span>
          </div>

          <div class="field-label">类型</div>
          <div class="radio-row">
            <label class="radio-card" :class="{ 'is-active': type === 'role' }">
              <input
                type="radio"
                name="row-rule-type"
                :checked="type === 'role'"
                @change="emit('switch-type', 'role')"
              />
              <span class="radio-card__dot"></span>
              <span>角色</span>
            </label>
            <label class="radio-card" :class="{ 'is-active': type === 'user' }">
              <input
                type="radio"
                name="row-rule-type"
                :checked="type === 'user'"
                @change="emit('switch-type', 'user')"
              />
              <span class="radio-card__dot"></span>
              <span>用户</span>
            </label>
            <label class="radio-card" :class="{ 'is-active': type === 'sysVar' }">
              <input
                type="radio"
                name="row-rule-type"
                :checked="type === 'sysVar'"
                @change="emit('switch-type', 'sysVar')"
              />
              <span class="radio-card__dot"></span>
              <span>系统变量</span>
            </label>
          </div>

          <div v-if="type !== 'sysVar'" class="select-box">
            <SystemSelect
              :model-value="selectedTargetId || ''"
              :options="targetSelectOptions"
              :placeholder="objectPlaceholder"
              @change="onTargetChange"
            />
          </div>
          <div v-else class="select-box select-box--readonly">
            <span>{{ objectPlaceholder }}</span>
          </div>

          <div v-if="missingTarget" class="missing-target-tip">原受限对象不存在，请重新选择</div>

          <div class="field-label field-label--spaced">设置规则</div>
          <div class="rule-builder">
            <div class="rule-builder__canvas">
              <RowAuth ref="authTreeRef" @save="onAuthSave" />
            </div>
            <div v-if="!hasExpressionItems" class="rule-builder__placeholder">
              当前暂无条件，可点击上方按钮开始配置
            </div>
            <div v-if="!fieldOptionsForEditor.length" class="rule-builder__tip">
              当前数据集暂无可配置字段，请先确认字段列表后再设置规则。
            </div>
            <div v-if="authTreeError" class="rule-builder__error">{{ authTreeError }}</div>
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
              <button type="button" class="icon-btn" @click="emit('refresh-whitelist')">⌕</button>
              <span>⌄</span>
            </div>
          </div>

          <div v-if="whitelistOptions.length" class="whitelist-list">
            <button
              v-for="item in whitelistOptions"
              :key="item.id"
              type="button"
              class="whitelist-list__item"
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
          <button type="button" class="ghost-btn" @click="onRequestClose">取消</button>
          <button type="button" class="primary-btn" :disabled="saving" @click="onConfirm">
            {{ saving ? '保存中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
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
  width: 940px;
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
    width: 1020px;
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
  color: #1f2937;
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
}

.section-block {
  margin-bottom: 16px;
  border: 1px solid #e3ebf7;
  border-radius: 12px;
  background: #fbfcff;
  padding: 14px 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  flex-wrap: wrap;
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
  width: 48px;
  height: 28px;
  border-radius: 999px;
  border: none;
  background: #3f7cff;
  padding: 2px;
  box-sizing: border-box;
  display: inline-flex;
  justify-content: flex-end;
  cursor: pointer;
}

.switch-line__control span {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
}

.switch-line__control.is-off {
  background: #cfd7e3;
  justify-content: flex-start;
}

.switch-line__label {
  color: #2f6bff;
  font-size: 15px;
  font-weight: 500;
}

.field-label {
  margin-bottom: 10px;
  color: #344054;
  font-size: 15px;
  font-weight: 600;
}

.field-label--spaced {
  margin-top: 14px;
}

.radio-row {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.radio-card {
  display: inline-flex;
  align-items: center;
  gap: 10px;
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
  background: #ffffff;
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

.select-box {
  min-height: 44px;
  display: flex;
  align-items: center;
  color: #667085;
  width: min(100%, 560px);
}

.select-box--readonly {
  justify-content: space-between;
}

.missing-target-tip {
  margin-top: 8px;
  color: #f04438;
  font-size: 13px;
}

.rule-builder {
  min-height: 196px;
  border: 1px solid #dce6f5;
  border-radius: 10px;
  padding: 10px 12px;
  background: linear-gradient(180deg, #fcfdff 0%, #ffffff 100%);
  overflow: auto;
}

.rule-builder__canvas {
  min-width: max-content;
}

.rule-builder__placeholder {
  margin-top: 6px;
  padding: 10px 0 12px;
  text-align: center;
  color: #b1bbc9;
  font-size: 15px;
  line-height: 22px;
}

.rule-builder__tip,
.rule-builder__error {
  margin-top: 8px;
  font-size: 14px;
  line-height: 18px;
}

.rule-builder__tip {
  color: #667085;
}

.rule-builder__error {
  color: #f04438;
}

.whitelist-box {
  min-height: 46px;
  border: 1px solid #d3deef;
  border-radius: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.whitelist-box__selected {
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: #667085;
  font-size: 15px;
}

.whitelist-box__placeholder {
  color: #98a2b3;
}

.whitelist-tag {
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: #eef2f7;
  color: #475467;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.whitelist-box__icons {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #667085;
}

.icon-btn {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.whitelist-list {
  margin-top: 8px;
  border: 1px solid #dde7f5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  max-height: 148px;
  overflow-y: auto;
}

.whitelist-list__item {
  width: 100%;
  min-height: 40px;
  border: none;
  background: #ffffff;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #344054;
  font-size: 15px;
  text-align: left;
}

.whitelist-list__item + .whitelist-list__item {
  border-top: 1px solid #eef2f7;
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

:deep(.rowAuth) {
  min-width: 820px;
  text-align: left;
  font-size: 15px;
}

:deep(.rowAuth .logic) {
  align-items: flex-start;
  gap: 8px;
}

:deep(.rowAuth .logic-left) {
  width: auto;
}

:deep(.rowAuth .logic-left .operate-title) {
  width: 68px;
  border: 1px solid #dbe4f0;
  border-radius: 8px;
  background: #f8fafc;
  line-height: 30px;
  height: 30px;
  font-size: 14px;
}

:deep(.rowAuth .logic-left .operate-title .mrg-title) {
  margin-left: 12px;
  margin-right: 10px;
  line-height: 30px;
  height: 30px;
}

:deep(.rowAuth .logic-right) {
  flex: 1;
  min-width: 0;
}

:deep(.rowAuth .logic-right-add) {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 30px;
  height: auto;
  align-items: center;
  padding: 0;
}

:deep(.rowAuth .logic-right-add .operand-btn) {
  height: 32px;
  padding: 0 14px;
  margin-right: 0;
  border-radius: 8px;
  border-color: #8fb3ff;
  background: #ffffff;
  box-shadow: none;
  font-size: 14px;
  font-weight: 500;
}

:deep(.rowAuth .logic > .logic-right > .logic-right-add:first-child) {
  padding-top: 2px;
}

@media (max-width: 1480px) {
  .dialog-card__header,
  .dialog-card__footer,
  .dialog-card__body {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>
