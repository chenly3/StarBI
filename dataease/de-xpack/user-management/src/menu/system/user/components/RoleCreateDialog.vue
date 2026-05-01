<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { IdType } from '../types'
import type { RoleCreateFormState, RoleTemplateOption } from '../composables/useRoleManagementPage'

const props = withDefaults(
  defineProps<{
    visible: boolean
    loadingTemplates?: boolean
    submitting?: boolean
    modelValue: RoleCreateFormState
    templates?: RoleTemplateOption[]
  }>(),
  {
    loadingTemplates: false,
    submitting: false,
    templates: () => []
  }
)

const emit = defineEmits<{
  (e: 'save', payload: RoleCreateFormState): void
  (e: 'cancel'): void
}>()

const localForm = reactive<RoleCreateFormState>({
  name: '',
  templateRoleId: null
})

const syncLocalForm = () => {
  localForm.name = props.modelValue.name ?? ''
  localForm.templateRoleId = props.modelValue.templateRoleId ?? null
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      syncLocalForm()
      if (localForm.templateRoleId === null && props.templates.length > 0) {
        localForm.templateRoleId = props.templates[0].id
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  () => {
    if (props.visible) {
      syncLocalForm()
    }
  },
  { deep: true }
)

watch(
  () => props.templates,
  templates => {
    if (props.visible && localForm.templateRoleId === null && templates.length > 0) {
      localForm.templateRoleId = templates[0].id
    }
  },
  { deep: true }
)

const isTemplateChecked = (id: IdType): boolean => {
  if (localForm.templateRoleId === null || localForm.templateRoleId === undefined) {
    return false
  }
  return String(localForm.templateRoleId) === String(id)
}

const onTemplateChange = (id: IdType) => {
  localForm.templateRoleId = id
}

const submit = () => {
  emit('save', {
    name: localForm.name.trim(),
    templateRoleId: localForm.templateRoleId
  })
}
</script>

<template>
  <div v-if="visible" class="role-create-dialog-mask" @click.self="emit('cancel')">
    <section class="role-create-dialog">
      <header class="role-create-dialog__header">
        <h2>添加角色</h2>
        <button type="button" class="role-create-dialog__close" @click="emit('cancel')">×</button>
      </header>

      <label class="role-create-dialog__field">
        <span>角色名称 <i>*</i></span>
        <input v-model="localForm.name" type="text" maxlength="50" placeholder="请输入角色名称" />
      </label>

      <section class="role-create-dialog__inherit">
        <h3>角色类型 <i>*</i></h3>
        <div v-if="loadingTemplates" class="role-create-dialog__hint">模板加载中...</div>
        <div v-else-if="!templates.length" class="role-create-dialog__hint">暂无可用模板。</div>
        <ul v-else>
          <li v-for="template in templates" :key="String(template.id)">
            <label class="role-create-dialog__radio">
              <input
                type="radio"
                name="role-template"
                :checked="isTemplateChecked(template.id)"
                @change="onTemplateChange(template.id)"
              />
              <span>{{ template.name }}</span>
            </label>
          </li>
        </ul>
      </section>

      <div class="role-create-dialog__tips">提示：自定义角色的权限不能大于被继承角色的权限范围</div>

      <footer class="role-create-dialog__actions">
        <button type="button" :disabled="submitting" @click="emit('cancel')">取消</button>
        <button type="button" :disabled="submitting" @click="submit">
          {{ submitting ? '创建中...' : '确定' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.role-create-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 30%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1020;
}

.role-create-dialog {
  background: #fff;
  width: min(720px, calc(100vw - 24px));
  max-height: calc(100vh - 40px);
  overflow: auto;
  border-radius: 14px;
  padding: 22px 24px 28px;
  box-shadow: 0 20px 48px rgb(15 23 42 / 24%);
}

@media (min-width: 1520px) {
  .role-create-dialog {
    width: min(820px, calc(100vw - 48px));
  }
}

.role-create-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.role-create-dialog__header h2 {
  margin: 0;
  font-size: 18px;
  color: #1d2740;
}

.role-create-dialog__close {
  border: none;
  background: transparent;
  color: #98a1b4;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.role-create-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 18px 0 16px;
}

.role-create-dialog__field span,
.role-create-dialog__inherit h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1f2a44;
}

.role-create-dialog__field i,
.role-create-dialog__inherit i {
  color: #ef4444;
  font-style: normal;
}

.role-create-dialog__field input {
  height: 42px;
  border: 1px solid #d8deea;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 15px;
}

.role-create-dialog__inherit {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.role-create-dialog__inherit h3 {
  margin: 0;
}

.role-create-dialog__hint {
  color: #97a1b4;
  font-size: 15px;
}

.role-create-dialog__inherit ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-create-dialog__radio {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 15px;
  color: #1f2a44;
}

.role-create-dialog__radio input {
  width: 18px;
  height: 18px;
  accent-color: #3368e8;
  margin: 0;
}

.role-create-dialog__tips {
  margin-top: 24px;
  min-height: 46px;
  border: 1px solid #f1d27a;
  background: #fff8e1;
  border-radius: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  color: #9f4a00;
  font-size: 15px;
  font-weight: 600;
}

.role-create-dialog__actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
}

.role-create-dialog__actions button {
  flex: 1;
  border-radius: 8px;
  height: 42px;
  cursor: pointer;
  border: 1px solid #d8deea;
  font-size: 15px;
}

.role-create-dialog__actions button:last-child {
  background: #3368e8;
  border-color: #3368e8;
  color: #fff;
}
</style>
