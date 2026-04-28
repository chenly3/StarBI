<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { IdType, RoleQueryItem, UserFormState } from '../types'

const props = withDefaults(
  defineProps<{
    visible: boolean
    currentOrgName: string
    editing: boolean
    modelValue: UserFormState
    roleOptions?: RoleQueryItem[]
    defaultPassword?: string
    submitting?: boolean
  }>(),
  {
    roleOptions: () => [],
    defaultPassword: '',
    submitting: false
  }
)

const emit = defineEmits<{
  (e: 'save', payload: UserFormState): void
  (e: 'cancel'): void
}>()

const localForm = reactive<UserFormState>({
  account: '',
  name: '',
  email: '',
  phonePrefix: '86',
  phone: '',
  roleIds: [],
  enable: true
})

const initialRoleIds = ref<IdType[]>([])
const roleSelectionDirty = ref(false)

const resolveRoleId = (value: string): IdType => {
  const matched = props.roleOptions.find(role => String(role.id) === value)
  return matched?.id ?? value
}

const selectedRoleId = computed({
  get: () => (localForm.roleIds[0] !== undefined ? String(localForm.roleIds[0]) : ''),
  set: value => {
    roleSelectionDirty.value = true
    localForm.roleIds = value ? [resolveRoleId(value)] : []
  }
})

const displayedDefaultPassword = computed(() => props.defaultPassword.trim() || '未获取到默认密码')

const syncLocalForm = () => {
  localForm.id = props.modelValue.id
  localForm.account = props.modelValue.account ?? ''
  localForm.name = props.modelValue.name ?? ''
  localForm.email = props.modelValue.email ?? ''
  localForm.phonePrefix = props.modelValue.phonePrefix ?? '86'
  localForm.phone = props.modelValue.phone ?? ''
  localForm.roleIds = Array.isArray(props.modelValue.roleIds) ? [...props.modelValue.roleIds] : []
  initialRoleIds.value = [...localForm.roleIds]
  roleSelectionDirty.value = false
  localForm.enable = props.modelValue.enable ?? true
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      syncLocalForm()
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

const submit = () => {
  if (!localForm.account.trim()) {
    window.alert('账号不能为空。')
    return
  }
  if (!localForm.name.trim()) {
    window.alert('姓名不能为空。')
    return
  }
  if (!localForm.roleIds.length) {
    window.alert('请至少选择一个角色。')
    return
  }

  emit('save', {
    id: localForm.id,
    account: localForm.account.trim(),
    name: localForm.name.trim(),
    email: localForm.email.trim(),
    phonePrefix: localForm.phonePrefix?.trim() || '86',
    phone: localForm.phone?.trim() || '',
    roleIds: roleSelectionDirty.value ? [...localForm.roleIds] : [...initialRoleIds.value],
    enable: localForm.enable
  })
}

const copyDefaultPassword = async () => {
  if (!props.defaultPassword.trim()) {
    window.alert('当前未获取到默认密码。')
    return
  }
  try {
    await navigator.clipboard.writeText(props.defaultPassword)
  } catch {
    window.alert(`默认密码：${props.defaultPassword}`)
  }
}
</script>

<template>
  <div v-if="visible" class="user-form-dialog-mask" @click.self="emit('cancel')">
    <section class="user-form-dialog">
      <header class="user-form-dialog__header">
        <h2>{{ editing ? '编辑用户' : '添加用户' }}</h2>
        <button type="button" class="user-form-dialog__close" @click="emit('cancel')">×</button>
      </header>

      <div class="user-form-dialog__banner">
        <span class="user-form-dialog__banner-icon">i</span>
        <span>默认密码：{{ displayedDefaultPassword }}</span>
        <button type="button" @click="copyDefaultPassword">复制</button>
      </div>

      <div class="user-form-dialog__grid">
        <label class="user-form-dialog__field">
          <span>账号 <i>*</i></span>
          <input
            v-model="localForm.account"
            type="text"
            placeholder="请输入账号"
            :readonly="editing"
            :disabled="editing"
          />
        </label>

        <label class="user-form-dialog__field">
          <span>姓名 <i>*</i></span>
          <input v-model="localForm.name" type="text" placeholder="请输入姓名" />
        </label>

        <label class="user-form-dialog__field">
          <span>邮箱 <i>*</i></span>
          <input v-model="localForm.email" type="email" placeholder="请输入邮箱" />
        </label>

        <label class="user-form-dialog__field">
          <span>手机</span>
          <div class="user-form-dialog__phone">
            <select v-model="localForm.phonePrefix">
              <option value="86">+86</option>
            </select>
            <input v-model="localForm.phone" type="text" placeholder="请输入手机" />
          </div>
        </label>

        <label class="user-form-dialog__field is-full">
          <span>角色 <i>*</i></span>
          <select v-model="selectedRoleId">
            <option value="">请选择角色</option>
            <option v-for="role in roleOptions" :key="String(role.id)" :value="String(role.id)">
              {{ role.name }}
            </option>
          </select>
        </label>
      </div>

      <label class="user-form-dialog__switch-row">
        <span>是否启用</span>
        <button
          type="button"
          class="user-form-dialog__switch"
          :class="{ 'is-on': localForm.enable }"
          @click="localForm.enable = !localForm.enable"
        >
          <span />
        </button>
      </label>

      <footer class="user-form-dialog__actions">
        <button type="button" class="user-form-dialog__ghost" @click="emit('cancel')">取消</button>
        <button type="button" class="user-form-dialog__primary" :disabled="submitting" @click="submit">
          {{ submitting ? '保存中...' : '确定' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.user-form-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgb(15 23 42 / 36%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.user-form-dialog {
  width: min(720px, calc(100vw - 24px));
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 64px rgb(27 44 79 / 18%);
}

@media (min-width: 1520px) {
  .user-form-dialog {
    width: min(820px, calc(100vw - 48px));
  }
}

.user-form-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.user-form-dialog__header h2 {
  margin: 0;
  font-size: 20px;
  color: #1c2740;
}

.user-form-dialog__close {
  border: none;
  background: transparent;
  color: #96a0b5;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.user-form-dialog__banner {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 16px;
  background: #eef5ff;
  border: 1px solid #cfe0ff;
  border-radius: 10px;
  color: #3368e8;
  font-size: 14px;
}

.user-form-dialog__banner-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid currentColor;
  font-size: 12px;
  font-weight: 700;
}

.user-form-dialog__banner button {
  border: none;
  background: transparent;
  color: #3368e8;
  cursor: pointer;
  font-weight: 600;
}

.user-form-dialog__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 14px;
  margin-top: 20px;
}

.user-form-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-form-dialog__field.is-full {
  grid-column: 1 / -1;
}

.user-form-dialog__field span,
.user-form-dialog__switch-row span {
  color: #1f2a44;
  font-size: 14px;
  font-weight: 600;
}

.user-form-dialog__field i {
  color: #ef4444;
  font-style: normal;
}

.user-form-dialog__field input,
.user-form-dialog__field select,
.user-form-dialog__phone {
  width: 100%;
  min-height: 44px;
  border: 1px solid #d8e0ef;
  border-radius: 10px;
  background: #fff;
  box-sizing: border-box;
}

.user-form-dialog__field input,
.user-form-dialog__field select {
  padding: 0 14px;
  font-size: 14px;
  color: #1f2a44;
  outline: none;
}

.user-form-dialog__phone {
  display: grid;
  grid-template-columns: 72px 1fr;
  overflow: hidden;
}

.user-form-dialog__phone select,
.user-form-dialog__phone input {
  border: none;
  border-radius: 0;
  min-height: 42px;
}

.user-form-dialog__phone select {
  border-right: 1px solid #d8e0ef;
}

.user-form-dialog__switch-row {
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  gap: 18px;
}

.user-form-dialog__switch {
  width: 42px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: #cfd6e4;
  padding: 2px;
  cursor: pointer;
}

.user-form-dialog__switch span {
  display: block;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.user-form-dialog__switch.is-on {
  background: #4b7cff;
}

.user-form-dialog__switch.is-on span {
  transform: translateX(18px);
}

.user-form-dialog__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 24px;
}

.user-form-dialog__ghost,
.user-form-dialog__primary {
  height: 42px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.user-form-dialog__ghost {
  border: 1px solid #d8e0ef;
  background: #fff;
  color: #33415c;
}

.user-form-dialog__primary {
  border: 1px solid #3368e8;
  background: #3368e8;
  color: #fff;
  font-weight: 600;
}

.user-form-dialog__primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .user-form-dialog__grid,
  .user-form-dialog__actions {
    grid-template-columns: 1fr;
  }
}
</style>
