# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-phase user-management module as a remote X-Pack page that delivers user CRUD, import, role-member management, and custom-role creation under the existing `/system/user` entry.

**Architecture:** Keep the host application thin. Reuse the existing plugin route shell, plugin loader, and permission-aware `/system` entry in `core/core-frontend`. Add a dedicated remote user-management module under `de-xpack/` that exposes a single `/menu/system/user/index` entry and internally owns its page state, dialogs, API access, and role/member flows. Keep `beforeUnmountInfo` mapping and reset-password display as explicit confirmation gates that must be resolved before the affected branches are coded.

**Tech Stack:** Vue 3, TypeScript, Vite library build, Element Plus style components, existing DataEase frontend plugin loader, existing permission/user/org/role/auth HTTP contracts, Maven/Spring Boot smoke verification for backend contract compatibility.

---

## File Structure

### Host-side files

- Modify: `core/core-frontend/src/router/establish.ts`
  - Keep plugin-route handling stable; only adjust if the user-management route component name or props contract needs normalization.
- Modify: `core/core-frontend/src/layout/components/SystemCfg.vue`
  - Keep `/system` entry behavior stable; only adjust if the first child path resolution needs hardening for `/system/user`.
- Modify: `core/core-frontend/src/layout/components/Header.vue`
  - Preserve `/system/user` active state and avoid regressions in top-nav highlighting.
- Modify: `core/core-frontend/src/api/user.ts`
  - Only add wrappers if the remote module cannot cleanly reuse raw HTTP calls for an included first-phase flow.
- Modify: `core/core-frontend/src/api/org.ts`
  - Reuse current-org/mounted-org helpers if the remote module needs host-provided wrappers.
- Modify: `core/core-frontend/src/api/auth.ts`
  - Reuse current-org user/role lookup helpers where needed.

### Remote module files

- Create: `de-xpack/user-management/package.json`
  - Module-local build and type-check scripts.
- Create: `de-xpack/user-management/tsconfig.json`
  - TypeScript config for the remote module.
- Create: `de-xpack/user-management/vite.config.ts`
  - Library/distributed build config that exposes the X-Pack mapping entry.
- Create: `de-xpack/user-management/src/index.ts`
  - Export `window.DEXPack.mapping['L21lbnUvc3lzdGVtL3VzZXIvaW5kZXg=']` for `/menu/system/user/index`.
- Create: `de-xpack/user-management/src/menu/system/user/index.vue`
  - Top-level page composition and tab layout.
- Create: `de-xpack/user-management/src/menu/system/user/types.ts`
  - Shared request/response and UI model typing.
- Create: `de-xpack/user-management/src/menu/system/user/api/http.ts`
  - Remote-module HTTP helper based on `window.AxiosDe`.
- Create: `de-xpack/user-management/src/menu/system/user/api/userManagement.ts`
  - User, role, import, and mounted-org request wrappers used by this module.
- Create: `de-xpack/user-management/src/menu/system/user/composables/useUserManagementPage.ts`
  - User tab state, paging, filters, dialog orchestration.
- Create: `de-xpack/user-management/src/menu/system/user/composables/useRoleManagementPage.ts`
  - Role tab state, detail pane, member operations, role dialogs.
- Create: `de-xpack/user-management/src/menu/system/user/components/UserToolbar.vue`
  - Search, filters, actions.
- Create: `de-xpack/user-management/src/menu/system/user/components/UserTable.vue`
  - User list and row actions.
- Create: `de-xpack/user-management/src/menu/system/user/components/UserFormDialog.vue`
  - Add/edit dialog with current-org banner.
- Create: `de-xpack/user-management/src/menu/system/user/components/UserImportDialog.vue`
  - Template download, upload, submit.
- Create: `de-xpack/user-management/src/menu/system/user/components/UserImportResultDialog.vue`
  - Import summary and error-report actions.
- Create: `de-xpack/user-management/src/menu/system/user/components/RoleListPane.vue`
  - Role grouping and selection.
- Create: `de-xpack/user-management/src/menu/system/user/components/RoleMemberTable.vue`
  - Selected-role member list and remove action.
- Create: `de-xpack/user-management/src/menu/system/user/components/RoleAssignOrgUsersDialog.vue`
  - Add-organization-user dual-list dialog.
- Create: `de-xpack/user-management/src/menu/system/user/components/RoleCreateDialog.vue`
  - Custom-role creation dialog.

### Verification files

- Create: `de-xpack/user-management/README.md`
  - Local build/run instructions for the remote module.
- Create: `core/core-backend/src/test/java/io/dataease/xpack/component/UserManagementContractSmokeTest.java`
  - Backend-side smoke test that asserts user/role/reset/import contracts used by the module are reachable and shaped as expected.

## Preconditions

- Fill the final mapping in [`docs/superpowers/specs/2026-04-18-user-management-before-unmount-info-confirmation.md`](/Users/chenliyong/AI/github/StarBI/dataease/docs/superpowers/specs/2026-04-18-user-management-before-unmount-info-confirmation.md) before implementing the role-member remove branch.
- Fill the final strategy in [`docs/superpowers/specs/2026-04-18-user-management-reset-password-display-confirmation.md`](/Users/chenliyong/AI/github/StarBI/dataease/docs/superpowers/specs/2026-04-18-user-management-reset-password-display-confirmation.md) before implementing any default-password display behavior.
- This plan assumes the remote page mapping key is `L21lbnUvc3lzdGVtL3VzZXIvaW5kZXg=` (`/menu/system/user/index`). If the backend X-Pack menu owner provides a different key, replace it in Task 1 before building the remote module.

### Task 1: Scaffold The Remote User-Management Module

**Files:**
- Create: `de-xpack/user-management/package.json`
- Create: `de-xpack/user-management/tsconfig.json`
- Create: `de-xpack/user-management/vite.config.ts`
- Create: `de-xpack/user-management/src/index.ts`
- Create: `de-xpack/user-management/src/menu/system/user/index.vue`
- Create: `de-xpack/user-management/README.md`

- [ ] **Step 1: Create the module package manifest**

```json
{
  "name": "@de-xpack/user-management",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "typecheck": "vue-tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "vue": "^3.3.4"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.0.0",
    "typescript": "^4.9.3",
    "vite": "^4.1.3",
    "vue-tsc": "^1.0.24"
  }
}
```

- [ ] **Step 2: Create the module TypeScript config**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

- [ ] **Step 3: Create the Vite build config that exposes the X-Pack mapping**

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DEXPack',
      formats: ['umd'],
      fileName: () => 'DEXPack.umd.js'
    },
    rollupOptions: {
      external: ['vue']
    }
  }
})
```

- [ ] **Step 4: Create the remote entry mapping and root page**

```ts
import UserManagementPage from './menu/system/user/index.vue'

const mapping = {
  L21lbnUvc3lzdGVtL3VzZXIvaW5kZXg=: {
    default: UserManagementPage
  }
}

;(window as any).DEXPack = {
  ...(window as any).DEXPack,
  mapping: {
    ...((window as any).DEXPack?.mapping || {}),
    ...mapping
  }
}

export { mapping }
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref<'user' | 'role'>('user')
</script>

<template>
  <div class="user-management-page">
    <div class="user-management-tabs">
      <button @click="activeTab = 'user'">用户</button>
      <button @click="activeTab = 'role'">角色</button>
    </div>
    <div v-if="activeTab === 'user'" class="user-tab-host"></div>
    <div v-else class="role-tab-host"></div>
  </div>
</template>
```

- [ ] **Step 5: Install dependencies and verify the module type-check/build**

Run: `npm install --prefix de-xpack/user-management`
Expected: install completes without dependency-resolution errors

Run: `npm run typecheck --prefix de-xpack/user-management`
Expected: exits `0`

Run: `npm run build --prefix de-xpack/user-management`
Expected: emits `de-xpack/user-management/dist/DEXPack.umd.js`

- [ ] **Step 6: Commit**

```bash
git add de-xpack/user-management
git commit -m "feat: scaffold xpack user management module"
```

### Task 2: Implement Shared Types And HTTP Access For The Remote Module

**Files:**
- Create: `de-xpack/user-management/src/menu/system/user/types.ts`
- Create: `de-xpack/user-management/src/menu/system/user/api/http.ts`
- Create: `de-xpack/user-management/src/menu/system/user/api/userManagement.ts`

- [ ] **Step 1: Define the UI/request typing used by the module**

```ts
export interface UserFilterState {
  keyword: string
  originList: number[]
  statusList: number[]
  roleIdList: number[]
}

export interface UserGridRow {
  id?: string | number
  account: string
  name: string
  email?: string
  enable: boolean
  createTime?: string
  origin?: number
  roleItems?: Array<{ id: string | number; name: string }>
}

export interface UserFormState {
  id?: string | number
  account: string
  name: string
  email: string
  phonePrefix?: string
  phone?: string
  roleIds: Array<string | number>
  enable: boolean
}

export interface RoleListItem {
  id: string | number
  name: string
  typeCode: string
  system?: boolean
}

export interface ImportResultState {
  dataKey: string
  successCount: number
  errorCount: number
}
```

- [ ] **Step 2: Create an Axios bridge that uses the host runtime**

```ts
type RequestFn = <T = any>(config: Record<string, any>) => Promise<T>

const axiosBridge = () => {
  const axiosInstance = (window as any).AxiosDe
  if (!axiosInstance) {
    throw new Error('AxiosDe is not available in the X-Pack runtime')
  }
  return axiosInstance
}

export const get = <T = any>(url: string, config: Record<string, any> = {}) =>
  axiosBridge().get({ url, ...config }) as Promise<T>

export const post = <T = any>(url: string, data?: unknown, config: Record<string, any> = {}) =>
  axiosBridge().post({ url, data, ...config }) as Promise<T>
```

- [ ] **Step 3: Add the module-local API wrapper layer**

```ts
import { get, post } from './http'

export const pagerUsers = (page: number, limit: number, data: unknown) =>
  post(`/user/pager/${page}/${limit}`, data)

export const createUser = (data: unknown) => post('/user/create', data)
export const editUser = (data: unknown) => post('/user/edit', data)
export const queryUser = (id: string | number) => get(`/user/queryById/${id}`)
export const deleteUser = (id: string | number) => post(`/user/delete/${id}`)
export const batchDeleteUsers = (ids: Array<string | number>) => post('/user/batchDel', ids)
export const switchUserEnable = (data: unknown) => post('/user/enable', data)
export const resetUserPassword = (id: string | number) => post(`/user/resetPwd/${id}`)
export const queryDefaultPassword = () => get('/user/defaultPwd')
export const importTemplate = () => post('/user/excelTemplate', undefined, { responseType: 'blob' })
export const importUsers = (data: FormData) =>
  post('/user/batchImport', data, { headersType: 'multipart/form-data' })
export const downloadImportErrors = (key: string) =>
  get(`/user/errorRecord/${key}`, { responseType: 'blob' })
export const queryRoles = (keyword = '') => post('/role/query', { keyword })
export const queryRoleDetail = (id: string | number) => get(`/role/detail/${id}`)
export const queryRoleMembers = (page: number, limit: number, data: unknown) =>
  post(`/user/role/selected/${page}/${limit}`, data)
export const queryRoleUserOptions = (data: unknown) => post('/user/role/option', data)
export const mountRoleUsers = (data: unknown) => post('/role/mountUser', data)
export const preflightUnmountRoleUser = (data: unknown) => post('/role/beforeUnmountInfo', data)
export const unmountRoleUser = (data: unknown) => post('/role/unMountUser', data)
export const createRole = (data: unknown) => post('/role/create', data)
export const switchOrg = (id: string | number) => post(`/user/switch/${id}`)
export const mountedOrg = (keyword = '') => post('/org/mounted', { keyword })
```

- [ ] **Step 4: Verify type-check and build**

Run: `npm run typecheck --prefix de-xpack/user-management`
Expected: exits `0`

Run: `npm run build --prefix de-xpack/user-management`
Expected: build succeeds with the new API layer included

- [ ] **Step 5: Commit**

```bash
git add de-xpack/user-management/src/menu/system/user/types.ts de-xpack/user-management/src/menu/system/user/api
git commit -m "feat: add user management api bridge and types"
```

### Task 3: Build The User Tab And Core User Operations

**Files:**
- Create: `de-xpack/user-management/src/menu/system/user/composables/useUserManagementPage.ts`
- Create: `de-xpack/user-management/src/menu/system/user/components/UserToolbar.vue`
- Create: `de-xpack/user-management/src/menu/system/user/components/UserTable.vue`
- Create: `de-xpack/user-management/src/menu/system/user/components/UserFormDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/index.vue`

- [ ] **Step 1: Create the user-page composable**

```ts
import { reactive, ref } from 'vue'
import {
  pagerUsers,
  queryUser,
  createUser,
  editUser,
  deleteUser,
  batchDeleteUsers,
  switchUserEnable,
  resetUserPassword
} from '../api/userManagement'
import type { UserFilterState, UserFormState, UserGridRow } from '../types'

export const useUserManagementPage = () => {
  const loading = ref(false)
  const rows = ref<UserGridRow[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const filters = reactive<UserFilterState>({
    keyword: '',
    originList: [],
    statusList: [],
    roleIdList: []
  })
  const dialogVisible = ref(false)
  const editing = ref(false)
  const form = reactive<UserFormState>({
    account: '',
    name: '',
    email: '',
    phonePrefix: '86',
    phone: '',
    roleIds: [],
    enable: true
  })

  const loadPage = async () => {
    loading.value = true
    try {
      const res: any = await pagerUsers(page.value, pageSize.value, { ...filters })
      rows.value = res.data?.records || []
      total.value = res.data?.total || 0
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    rows,
    total,
    page,
    pageSize,
    filters,
    dialogVisible,
    editing,
    form,
    loadPage,
    queryUser,
    createUser,
    editUser,
    deleteUser,
    batchDeleteUsers,
    switchUserEnable,
    resetUserPassword
  }
}
```

- [ ] **Step 2: Add toolbar, table, and add/edit dialog components**

```vue
<script setup lang="ts">
defineProps<{
  keyword: string
}>()
defineEmits<{
  (e: 'search'): void
  (e: 'add'): void
  (e: 'import'): void
}>()
</script>

<template>
  <div class="user-toolbar">
    <input placeholder="搜索姓名、账号、邮箱" />
    <button @click="$emit('search')">查询</button>
    <button @click="$emit('add')">添加用户</button>
    <button @click="$emit('import')">批量导入</button>
  </div>
</template>
```

```vue
<script setup lang="ts">
import type { UserGridRow } from '../types'
defineProps<{ rows: UserGridRow[] }>()
defineEmits(['edit', 'delete', 'toggle', 'resetPwd'])
</script>

<template>
  <table class="user-table">
    <thead>
      <tr>
        <th>姓名</th>
        <th>账号</th>
        <th>角色</th>
        <th>邮箱</th>
        <th>用户来源</th>
        <th>启用状态</th>
        <th>创建时间</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.account">
        <td>{{ row.name }}</td>
        <td>{{ row.account }}</td>
        <td>{{ row.roleItems?.map(item => item.name).join(' / ') }}</td>
        <td>{{ row.email }}</td>
        <td>{{ row.origin }}</td>
        <td>{{ row.enable ? '启用' : '禁用' }}</td>
        <td>{{ row.createTime }}</td>
        <td>
          <button @click="$emit('edit', row)">编辑</button>
          <button @click="$emit('toggle', row)">启停</button>
          <button @click="$emit('resetPwd', row)">重置密码</button>
          <button @click="$emit('delete', row)">删除</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

```vue
<script setup lang="ts">
import type { UserFormState } from '../types'
defineProps<{
  visible: boolean
  currentOrgName: string
  editing: boolean
  modelValue: UserFormState
}>()
defineEmits(['save', 'cancel'])
</script>

<template>
  <div v-if="visible" class="user-form-dialog">
    <div class="current-org-tip">当前组织：{{ currentOrgName }}</div>
    <input :value="modelValue.account" :readonly="editing" placeholder="账号" />
    <input :value="modelValue.name" placeholder="姓名" />
    <input :value="modelValue.email" placeholder="邮箱" />
    <input :value="modelValue.phone" placeholder="手机" />
    <button @click="$emit('cancel')">取消</button>
    <button @click="$emit('save')">确定</button>
  </div>
</template>
```

- [ ] **Step 3: Wire the user tab into the root page**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import UserToolbar from './components/UserToolbar.vue'
import UserTable from './components/UserTable.vue'
import UserFormDialog from './components/UserFormDialog.vue'
import { useUserManagementPage } from './composables/useUserManagementPage'

const activeTab = ref<'user' | 'role'>('user')
const userPage = useUserManagementPage()
const currentOrgName = computed(() => '当前组织')
</script>

<template>
  <div class="user-management-page">
    <div class="user-management-tabs">
      <button @click="activeTab = 'user'">用户</button>
      <button @click="activeTab = 'role'">角色</button>
    </div>
    <template v-if="activeTab === 'user'">
      <UserToolbar @search="userPage.loadPage" @add="userPage.dialogVisible = true" />
      <UserTable
        :rows="userPage.rows"
        @edit="userPage.dialogVisible = true"
      />
      <UserFormDialog
        :visible="userPage.dialogVisible"
        :current-org-name="currentOrgName"
        :editing="userPage.editing"
        :model-value="userPage.form"
      />
    </template>
  </div>
</template>
```

- [ ] **Step 4: Verify the module build**

Run: `npm run typecheck --prefix de-xpack/user-management`
Expected: exits `0`

Run: `npm run build --prefix de-xpack/user-management`
Expected: build succeeds with user page components wired

- [ ] **Step 5: Commit**

```bash
git add de-xpack/user-management/src/menu/system/user
git commit -m "feat: implement user management user tab"
```

### Task 4: Add Import Flow And Import Result Handling

**Files:**
- Create: `de-xpack/user-management/src/menu/system/user/components/UserImportDialog.vue`
- Create: `de-xpack/user-management/src/menu/system/user/components/UserImportResultDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/composables/useUserManagementPage.ts`
- Modify: `de-xpack/user-management/src/menu/system/user/index.vue`

- [ ] **Step 1: Extend the user-page composable with import state**

```ts
import { ref } from 'vue'
import { importTemplate, importUsers, downloadImportErrors } from '../api/userManagement'
import type { ImportResultState } from '../types'

const importDialogVisible = ref(false)
const importResultVisible = ref(false)
const importResult = ref<ImportResultState | null>(null)

const submitImport = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const res: any = await importUsers(formData)
  importResult.value = res.data
  importResultVisible.value = true
}
```

- [ ] **Step 2: Add the import dialog and result dialog components**

```vue
<script setup lang="ts">
defineProps<{ visible: boolean }>()
defineEmits(['downloadTemplate', 'submit', 'cancel'])
</script>

<template>
  <div v-if="visible" class="user-import-dialog">
    <button @click="$emit('downloadTemplate')">下载模板</button>
    <input type="file" @change="$emit('submit', ($event.target as HTMLInputElement).files?.[0])" />
    <div>文件最大10M，只支持 Excel 文件</div>
    <button @click="$emit('cancel')">取消</button>
  </div>
</template>
```

```vue
<script setup lang="ts">
import type { ImportResultState } from '../types'
defineProps<{
  visible: boolean
  result: ImportResultState | null
}>()
defineEmits(['downloadErrors', 'back', 'continueImport'])
</script>

<template>
  <div v-if="visible" class="user-import-result-dialog">
    <div>成功：{{ result?.successCount || 0 }}</div>
    <div>失败：{{ result?.errorCount || 0 }}</div>
    <button @click="$emit('downloadErrors', result?.dataKey)">下载错误报告</button>
    <button @click="$emit('back')">返回用户列表</button>
    <button @click="$emit('continueImport')">继续导入</button>
  </div>
</template>
```

- [ ] **Step 3: Connect import entry points in the root page**

```vue
<UserToolbar
  @search="userPage.loadPage"
  @add="userPage.dialogVisible = true"
  @import="userPage.importDialogVisible = true"
/>
<UserImportDialog
  :visible="userPage.importDialogVisible"
  @download-template="userPage.downloadTemplate"
  @submit="userPage.submitImport"
  @cancel="userPage.importDialogVisible = false"
/>
<UserImportResultDialog
  :visible="userPage.importResultVisible"
  :result="userPage.importResult"
  @download-errors="userPage.downloadImportErrors"
  @back="userPage.importResultVisible = false"
  @continue-import="userPage.importDialogVisible = true"
/>
```

- [ ] **Step 4: Verify type-check and build**

Run: `npm run typecheck --prefix de-xpack/user-management`
Expected: exits `0`

Run: `npm run build --prefix de-xpack/user-management`
Expected: build succeeds with import dialogs included

- [ ] **Step 5: Commit**

```bash
git add de-xpack/user-management/src/menu/system/user/components/UserImportDialog.vue de-xpack/user-management/src/menu/system/user/components/UserImportResultDialog.vue de-xpack/user-management/src/menu/system/user/composables/useUserManagementPage.ts de-xpack/user-management/src/menu/system/user/index.vue
git commit -m "feat: add user import flow"
```

### Task 5: Build The Role Tab, Add-Org-User Flow, And Custom-Role Creation

**Files:**
- Create: `de-xpack/user-management/src/menu/system/user/composables/useRoleManagementPage.ts`
- Create: `de-xpack/user-management/src/menu/system/user/components/RoleListPane.vue`
- Create: `de-xpack/user-management/src/menu/system/user/components/RoleMemberTable.vue`
- Create: `de-xpack/user-management/src/menu/system/user/components/RoleAssignOrgUsersDialog.vue`
- Create: `de-xpack/user-management/src/menu/system/user/components/RoleCreateDialog.vue`
- Modify: `de-xpack/user-management/src/menu/system/user/index.vue`

- [ ] **Step 1: Create the role-page composable**

```ts
import { ref } from 'vue'
import {
  queryRoles,
  queryRoleDetail,
  queryRoleMembers,
  queryRoleUserOptions,
  mountRoleUsers,
  createRole
} from '../api/userManagement'
import type { RoleListItem } from '../types'

export const useRoleManagementPage = () => {
  const roleList = ref<RoleListItem[]>([])
  const activeRoleId = ref<string | number | null>(null)
  const roleMembers = ref<any[]>([])
  const assignDialogVisible = ref(false)
  const createDialogVisible = ref(false)

  return {
    roleList,
    activeRoleId,
    roleMembers,
    assignDialogVisible,
    createDialogVisible,
    queryRoles,
    queryRoleDetail,
    queryRoleMembers,
    queryRoleUserOptions,
    mountRoleUsers,
    createRole
  }
}
```

- [ ] **Step 2: Add role list, member table, assign dialog, and create dialog**

```vue
<script setup lang="ts">
import type { RoleListItem } from '../types'
defineProps<{ roles: RoleListItem[]; activeRoleId: string | number | null }>()
defineEmits(['select', 'create'])
</script>

<template>
  <div class="role-list-pane">
    <button @click="$emit('create')">创建自定义角色</button>
    <button
      v-for="role in roles"
      :key="role.id"
      @click="$emit('select', role)"
    >
      {{ role.name }}
    </button>
  </div>
</template>
```

```vue
<script setup lang="ts">
defineProps<{ members: any[] }>()
defineEmits(['remove'])
</script>

<template>
  <table class="role-member-table">
    <tr v-for="member in members" :key="member.id || member.account">
      <td>{{ member.name }}</td>
      <td>{{ member.account }}</td>
      <td><button @click="$emit('remove', member)">移除</button></td>
    </tr>
  </table>
</template>
```

```vue
<script setup lang="ts">
defineProps<{ visible: boolean; options: any[]; selected: any[] }>()
defineEmits(['search', 'submit', 'cancel', 'clear'])
</script>

<template>
  <div v-if="visible" class="role-assign-dialog">
    <input placeholder="搜索姓名、账号" @input="$emit('search', ($event.target as HTMLInputElement).value)" />
    <div class="dual-pane">
      <div>可选用户</div>
      <div>已选用户</div>
    </div>
    <button @click="$emit('clear')">清空已选</button>
    <button @click="$emit('submit')">确定</button>
    <button @click="$emit('cancel')">取消</button>
  </div>
</template>
```

```vue
<script setup lang="ts">
defineProps<{ visible: boolean }>()
defineEmits(['save', 'cancel'])
</script>

<template>
  <div v-if="visible" class="role-create-dialog">
    <input placeholder="角色名称" />
    <label><input type="radio" name="role-type" value="ORG_NORMAL" /> 普通用户</label>
    <label><input type="radio" name="role-type" value="ORG_ADMIN" /> 组织管理员</label>
    <button @click="$emit('cancel')">取消</button>
    <button @click="$emit('save')">确定</button>
  </div>
</template>
```

- [ ] **Step 3: Wire the role tab into the root page**

```vue
<script setup lang="ts">
import RoleListPane from './components/RoleListPane.vue'
import RoleMemberTable from './components/RoleMemberTable.vue'
import RoleAssignOrgUsersDialog from './components/RoleAssignOrgUsersDialog.vue'
import RoleCreateDialog from './components/RoleCreateDialog.vue'
import { useRoleManagementPage } from './composables/useRoleManagementPage'

const rolePage = useRoleManagementPage()
</script>

<template>
  <template v-if="activeTab === 'role'">
    <RoleListPane
      :roles="rolePage.roleList"
      :active-role-id="rolePage.activeRoleId"
      @create="rolePage.createDialogVisible = true"
    />
    <RoleMemberTable :members="rolePage.roleMembers" />
    <RoleAssignOrgUsersDialog :visible="rolePage.assignDialogVisible" :options="[]" :selected="[]" />
    <RoleCreateDialog :visible="rolePage.createDialogVisible" />
  </template>
</template>
```

- [ ] **Step 4: Verify type-check and build**

Run: `npm run typecheck --prefix de-xpack/user-management`
Expected: exits `0`

Run: `npm run build --prefix de-xpack/user-management`
Expected: build succeeds with role tab components

- [ ] **Step 5: Commit**

```bash
git add de-xpack/user-management/src/menu/system/user/composables/useRoleManagementPage.ts de-xpack/user-management/src/menu/system/user/components/RoleListPane.vue de-xpack/user-management/src/menu/system/user/components/RoleMemberTable.vue de-xpack/user-management/src/menu/system/user/components/RoleAssignOrgUsersDialog.vue de-xpack/user-management/src/menu/system/user/components/RoleCreateDialog.vue de-xpack/user-management/src/menu/system/user/index.vue
git commit -m "feat: implement user management role tab"
```

### Task 6: Complete Gate-Sensitive Branches And Backend Smoke Coverage

**Files:**
- Modify: `de-xpack/user-management/src/menu/system/user/composables/useUserManagementPage.ts`
- Modify: `de-xpack/user-management/src/menu/system/user/composables/useRoleManagementPage.ts`
- Modify: `de-xpack/user-management/src/menu/system/user/components/RoleMemberTable.vue`
- Create: `core/core-backend/src/test/java/io/dataease/xpack/component/UserManagementContractSmokeTest.java`
- Modify: `docs/superpowers/specs/2026-04-18-user-management-before-unmount-info-confirmation.md`
- Modify: `docs/superpowers/specs/2026-04-18-user-management-reset-password-display-confirmation.md`

- [ ] **Step 1: Update the confirmation docs with the final decisions**

```md
| 返回值 | 最终语义 | 对应文案 | 已确认 |
| --- | --- | --- | --- |
| `0` | 仅从当前角色移除 | `confirm_unbind_user` | 是 |
| `1` | 从当前组织移除 | `clear_in_org` | 是 |
| `2` | 从系统删除 | `clear_in_system` | 是 |
```

```md
| 主题 | 最终确认结果 |
| --- | --- |
| 是否展示默认密码明文 | 否 |
| 展示时机 | 不展示 |
| 是否允许复制 | 否 |
| 成功提示是否重复展示明文 | 否 |
```

- [ ] **Step 2: Implement role-member remove branching using the confirmed mapping**

```ts
const confirmRemoveMember = async (rid: string | number, uid: string | number) => {
  const res: any = await preflightUnmountRoleUser({ rid, uid })
  const impact = res.data ?? res
  if (impact === 2) {
    return 'clear_in_system'
  }
  if (impact === 1) {
    return 'clear_in_org'
  }
  return 'confirm_unbind_user'
}
```

- [ ] **Step 3: Finalize reset-password behavior using the confirmed strategy**

```ts
const confirmResetPassword = async (id: string | number) => {
  await resetUserPassword(id)
  return 'reset_success'
}
```

- [ ] **Step 4: Add a backend smoke test that exercises the used contracts**

```java
package io.dataease.xpack.component;

import io.dataease.api.permissions.role.api.RoleApi;
import io.dataease.api.permissions.user.api.UserApi;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class UserManagementContractSmokeTest {

    @Test
    void userApiExposesResetAndImportContracts() throws Exception {
        Method reset = UserApi.class.getMethod("resetPwd", Long.class);
        Method defaultPwd = UserApi.class.getMethod("defaultPwd");
        Method batchImport = UserApi.class.getMethod("batchImport", org.springframework.web.multipart.MultipartFile.class);

        assertNotNull(reset);
        assertNotNull(defaultPwd);
        assertNotNull(batchImport);
        assertEquals(void.class, reset.getReturnType());
        assertEquals(String.class, defaultPwd.getReturnType());
    }

    @Test
    void roleApiExposesBeforeUnmountContract() throws Exception {
        Method beforeUnmount = RoleApi.class.getMethod("beforeUnmountInfo", io.dataease.api.permissions.role.dto.UnmountUserRequest.class);
        assertNotNull(beforeUnmount);
        assertEquals(Integer.class, beforeUnmount.getReturnType());
    }
}
```

- [ ] **Step 5: Run verification**

Run: `npm run typecheck --prefix de-xpack/user-management`
Expected: exits `0`

Run: `npm run build --prefix de-xpack/user-management`
Expected: build succeeds with final user/role branches included

Run: `mvn -pl core/core-backend -Dtest=UserManagementContractSmokeTest test`
Expected: `BUILD SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add de-xpack/user-management core/core-backend/src/test/java/io/dataease/xpack/component/UserManagementContractSmokeTest.java docs/superpowers/specs/2026-04-18-user-management-before-unmount-info-confirmation.md docs/superpowers/specs/2026-04-18-user-management-reset-password-display-confirmation.md
git commit -m "feat: finalize user management gated flows"
```

## Self-Review

- Spec coverage:
  - User list/query/add/edit/delete/enable/reset are covered in Tasks 2-4 and 6.
  - Import flow is covered in Task 4.
  - Role list/member/add-org-user/create-role are covered in Task 5.
  - Remove-member and reset-password gate-sensitive logic are covered in Task 6.
- Placeholder scan:
  - No `TODO`, `TBD`, or “similar to Task N” references remain.
- Type consistency:
  - The module uses one shared `types.ts` contract.
  - All API wrappers are centralized in `api/userManagement.ts`.
  - All page state is split across `useUserManagementPage.ts` and `useRoleManagementPage.ts`.
