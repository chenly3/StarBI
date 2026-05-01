<script setup lang="ts">
import { computed, ref } from 'vue'
import RoleAssignOrgUsersDialog from './components/RoleAssignOrgUsersDialog.vue'
import RoleCreateDialog from './components/RoleCreateDialog.vue'
import RoleListPane from './components/RoleListPane.vue'
import RoleMemberTable from './components/RoleMemberTable.vue'
import UserFormDialog from './components/UserFormDialog.vue'
import UserImportDialog from './components/UserImportDialog.vue'
import UserImportResultDialog from './components/UserImportResultDialog.vue'
import UserTable from './components/UserTable.vue'
import UserToolbar from './components/UserToolbar.vue'
import {
  useRoleManagementPage,
  type RoleCreateFormState
} from './composables/useRoleManagementPage'
import { useUserManagementPage } from './composables/useUserManagementPage'
import type { RoleQueryItem, UserFormState, UserGridRow, UserOptionItem } from './types'
import '../shared/system-setting-page.css'

const activeTab = ref<'user' | 'role'>('user')
const userPage = useUserManagementPage()
const rolePage = useRoleManagementPage()
const {
  loading,
  rows,
  total,
  page,
  pageSize,
  filters,
  dialogVisible,
  editing,
  form,
  roleOptions,
  defaultPassword,
  currentOrgName,
  submitting,
  importSubmitting,
  downloadingImportErrors,
  importDialogVisible,
  importResultVisible,
  importResult
} = userPage
const {
  rolesLoading: roleListLoading,
  roleList,
  activeRoleId,
  membersLoading: roleMembersLoading,
  roleMembers,
  memberTotal,
  memberPage,
  memberPageSize,
  memberKeyword,
  removingMemberId,
  assignDialogVisible,
  assignOptionsLoading,
  assignSubmitting,
  assignKeyword,
  assignOptions,
  assignSelectedUsers,
  createDialogVisible,
  createSubmitting,
  loadingRoleTemplates,
  createForm,
  roleTemplateOptions
} = rolePage
const activeRole = computed(() => rolePage.getActiveRole())
const activeRoleName = computed(() => activeRole.value?.name || '')
const activeRoleSystem = computed(() => Boolean(activeRole.value?.readonly || activeRole.value?.root))

const handleSearch = (keyword: string) => {
  userPage.filters.keyword = keyword
  void userPage.search()
}

const handleApplyFilters = (nextFilters: {
  originList: number[]
  statusList: number[]
  roleIdList: Array<string | number>
}) => {
  userPage.filters.originList = [...nextFilters.originList]
  userPage.filters.statusList = [...nextFilters.statusList]
  userPage.filters.roleIdList = [...nextFilters.roleIdList]
  void userPage.search()
}

const handleResetFilters = () => {
  userPage.filters.originList = []
  userPage.filters.statusList = []
  userPage.filters.roleIdList = []
  void userPage.search()
}

const handleAddUser = () => {
  void userPage.openCreate()
}

const handleOpenImport = () => {
  userPage.openImportDialog()
}

const handleDownloadTemplate = () => {
  void userPage.downloadTemplate()
}

const handleImportSubmit = (file: File) => {
  void userPage.submitImport(file)
}

const handleImportCancel = () => {
  userPage.closeImportDialog()
}

const handleDownloadImportErrors = (key?: string) => {
  void userPage.downloadImportErrors(key)
}

const handleImportBack = () => {
  userPage.closeImportResultDialog()
}

const handleContinueImport = () => {
  userPage.continueImport()
}

const handleEdit = (row: UserGridRow) => {
  void userPage.openEdit(row)
}

const handleDelete = (row: UserGridRow) => {
  void userPage.deleteUserRecord(row)
}

const handleToggle = (row: UserGridRow) => {
  void userPage.toggleUserEnable(row)
}

const handleResetPwd = (row: UserGridRow) => {
  void userPage.resetUserPwd(row)
}

const handleSave = (payload: UserFormState) => {
  void userPage.saveUser(payload)
}

const handleCancel = () => {
  userPage.closeDialog()
}

const handlePageChange = (nextPage: number) => {
  void userPage.setPage(nextPage)
}

const handlePageSizeChange = (nextPageSize: number) => {
  void userPage.setPageSize(nextPageSize)
}

const handleRoleSelect = (role: RoleQueryItem) => {
  void rolePage.selectRole(role)
}

const handleOpenUserTab = () => {
  activeTab.value = 'user'
}

const handleOpenRoleTab = () => {
  activeTab.value = 'role'
  const preferredRole =
    roleList.value.find(role => String(role.name || '').includes('组织管理员')) ||
    roleList.value.find(role => role.readonly || role.root) ||
    roleList.value[0]
  if (preferredRole) {
    void rolePage.selectRole(preferredRole)
  }
}

const handleRoleOpenCreate = () => {
  void rolePage.openCreateDialog()
}

const handleRoleOpenAssign = () => {
  void rolePage.openAssignDialog()
}

const handleRoleSearchMembers = (keyword: string) => {
  void rolePage.searchRoleMembers(keyword)
}

const handleRoleRemoveMember = (member: UserOptionItem) => {
  void rolePage.removeRoleMember(member)
}

const handleRoleMemberPageChange = (nextPage: number) => {
  void rolePage.setMemberPage(nextPage)
}

const handleRoleMemberPageSizeChange = (nextSize: number) => {
  void rolePage.setMemberPageSize(nextSize)
}

const handleAssignSearch = (keyword: string) => {
  void rolePage.searchAssignOptions(keyword)
}

const handleAssignAddUser = (user: UserOptionItem) => {
  rolePage.addAssignUser(user)
}

const handleAssignRemoveUser = (user: UserOptionItem) => {
  rolePage.removeAssignUser(user)
}

const handleAssignClear = () => {
  rolePage.clearAssignSelected()
}

const handleAssignSubmit = () => {
  void rolePage.submitAssignUsers()
}

const handleAssignCancel = () => {
  rolePage.closeAssignDialog()
}

const handleCreateRoleSave = (payload: RoleCreateFormState) => {
  void rolePage.submitCreateRole(payload)
}

const handleCreateRoleCancel = () => {
  rolePage.closeCreateDialog()
}
</script>

<template>
  <main class="system-setting-page system-setting-standard user-management-page">
    <section class="system-setting-page__content user-management-content">
      <header class="system-setting-page__title-row user-management-header">
        <h1 class="system-setting-page__title">用户管理</h1>
        <nav class="system-setting-tab-nav user-management-tabs" aria-label="用户管理切换">
          <button
            type="button"
            class="system-setting-tab user-management-tab"
            :class="{
              active: activeTab === 'user',
              'user-management-tab--user': true,
              'user-management-tab--inactive': activeTab !== 'user'
            }"
            @click="handleOpenUserTab"
          >
            用户
          </button>
          <button
            type="button"
            class="system-setting-tab user-management-tab"
            :class="{
              active: activeTab === 'role',
              'user-management-tab--role': true,
              'user-management-tab--inactive': activeTab !== 'role'
            }"
            @click="handleOpenRoleTab"
          >
            角色
          </button>
        </nav>
      </header>

      <section v-if="activeTab === 'user'" class="user-tab-host">
        <UserToolbar
          :keyword="filters.keyword"
          :loading="loading"
          :import-enabled="true"
          :filters="filters"
          :role-options="roleOptions"
          @search="handleSearch"
          @apply-filters="handleApplyFilters"
          @reset-filters="handleResetFilters"
          @add="handleAddUser"
          @import="handleOpenImport"
        />
        <UserTable
          :rows="rows"
          :total="total"
          :page="page"
          :page-size="pageSize"
          :loading="loading"
          :current-org-name="currentOrgName"
          @edit="handleEdit"
          @delete="handleDelete"
          @toggle="handleToggle"
          @reset-pwd="handleResetPwd"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        />
        <UserFormDialog
          :visible="dialogVisible"
          :current-org-name="currentOrgName"
          :editing="editing"
          :model-value="form"
          :role-options="roleOptions"
          :default-password="defaultPassword"
          :submitting="submitting"
          @save="handleSave"
          @cancel="handleCancel"
        />
        <UserImportDialog
          :visible="importDialogVisible"
          :submitting="importSubmitting"
          @download-template="handleDownloadTemplate"
          @submit="handleImportSubmit"
          @cancel="handleImportCancel"
        />
        <UserImportResultDialog
          :visible="importResultVisible"
          :result="importResult"
          :downloading-errors="downloadingImportErrors"
          @download-errors="handleDownloadImportErrors"
          @back="handleImportBack"
          @continue-import="handleContinueImport"
        />
      </section>

      <section v-else class="role-tab-host">
        <RoleListPane
          :roles="roleList"
          :active-role-id="activeRoleId"
          :loading="roleListLoading"
          @select="handleRoleSelect"
          @create="handleRoleOpenCreate"
        />
        <RoleMemberTable
          :role-name="activeRoleName"
          :system-role="activeRoleSystem"
          :members="roleMembers"
          :total="memberTotal"
          :page="memberPage"
          :page-size="memberPageSize"
          :loading="roleMembersLoading"
          :removing-member-id="removingMemberId"
          :keyword="memberKeyword"
          @add="handleRoleOpenAssign"
          @remove="handleRoleRemoveMember"
          @search="handleRoleSearchMembers"
          @page-change="handleRoleMemberPageChange"
          @page-size-change="handleRoleMemberPageSizeChange"
        />
        <RoleAssignOrgUsersDialog
          :visible="assignDialogVisible"
          :loading="assignOptionsLoading"
          :submitting="assignSubmitting"
          :keyword="assignKeyword"
          :options="assignOptions"
          :selected="assignSelectedUsers"
          @search="handleAssignSearch"
          @add="handleAssignAddUser"
          @remove="handleAssignRemoveUser"
          @clear="handleAssignClear"
          @submit="handleAssignSubmit"
          @cancel="handleAssignCancel"
        />
        <RoleCreateDialog
          :visible="createDialogVisible"
          :loading-templates="loadingRoleTemplates"
          :submitting="createSubmitting"
          :model-value="createForm"
          :templates="roleTemplateOptions"
          @save="handleCreateRoleSave"
          @cancel="handleCreateRoleCancel"
        />
      </section>
    </section>
  </main>
</template>

<style scoped>
.user-management-page {
  width: 100%;
  min-height: 0;
  flex: 1;
  background: transparent;
  overflow: hidden;
}

.user-management-content {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.user-management-tabs {
  margin-left: 2px;
}

.user-management-tab {
  position: relative;
}

.user-management-tab--inactive {
  color: #616d85;
}

.user-tab-host {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.role-tab-host {
  display: grid;
  grid-template-columns: 302px minmax(0, 1fr);
  align-items: stretch;
  gap: 12px;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

@media (max-width: 1200px) {
  .role-tab-host {
    grid-template-columns: 1fr;
  }
}
</style>
