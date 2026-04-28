import { onMounted, reactive, ref } from 'vue'
import {
  createUser,
  deleteUser,
  downloadImportErrors as downloadImportErrorsApi,
  editUser,
  importTemplate,
  importUsers,
  pagerUsers,
  queryDefaultPassword,
  queryRoles,
  queryUser,
  resetUserPassword,
  switchUserEnable
} from '../api/userManagement'
import type {
  IdType,
  ImportResultState,
  RoleQueryItem,
  UserFilterState,
  UserFormState,
  UserGridRow,
  UserPagerRequest
} from '../types'

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024
const ACCEPT_IMPORT_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])

const createEmptyFormState = (): UserFormState => ({
  account: '',
  name: '',
  email: '',
  phonePrefix: '86',
  phone: '',
  roleIds: [],
  enable: true
})

const normalizeRoleIds = (value: unknown): IdType[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is IdType => typeof item === 'string' || typeof item === 'number')
}

const buildPagerRequest = (filters: UserFilterState): UserPagerRequest => {
  const keyword = filters.keyword.trim()
  return {
    keyword: keyword || undefined,
    originList: filters.originList.length ? [...filters.originList] : undefined,
    statusList: filters.statusList.length ? [...filters.statusList] : undefined,
    roleIdList: filters.roleIdList.length ? [...filters.roleIdList] : undefined,
    timeDesc: true
  }
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '请求失败，请稍后重试。'
}

const isExcelFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  const typeMatched = !file.type || ACCEPT_IMPORT_TYPES.has(file.type)
  const extMatched = lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')
  return typeMatched && extMatched
}

const validateImportFile = (file: File): boolean => {
  if (!isExcelFile(file)) {
    window.alert('仅支持 Excel 文件（.xls 或 .xlsx）。')
    return false
  }
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    window.alert('文件大小不能超过 10M。')
    return false
  }
  return true
}

const getContentDisposition = (headers: Record<string, unknown>): string => {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'content-disposition' && typeof value === 'string') {
      return value
    }
  }
  return ''
}

const parseFileNameFromContentDisposition = (contentDisposition: string): string => {
  if (!contentDisposition) {
    return ''
  }
  const utf8Matched = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Matched?.[1]) {
    try {
      return decodeURIComponent(utf8Matched[1])
    } catch {
      return utf8Matched[1]
    }
  }
  const normalMatched = contentDisposition.match(/filename="?([^"]+)"?/i)
  return normalMatched?.[1] || ''
}

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl)
  }, 1000)
}

export const useUserManagementPage = () => {
  const loading = ref(false)
  const submitting = ref(false)
  const importSubmitting = ref(false)
  const downloadingImportErrors = ref(false)
  const loadingRoles = ref(false)
  const rows = ref<UserGridRow[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const filters = reactive<UserFilterState>({
    keyword: '',
    originList: [],
    statusList: [],
    roleIdList: []
  })

  const dialogVisible = ref(false)
  const editing = ref(false)
  const form = reactive<UserFormState>(createEmptyFormState())
  const roleOptions = ref<RoleQueryItem[]>([])
  const defaultPassword = ref('')
  const loadingDefaultPassword = ref(false)
  const currentOrgName = ref('当前组织范围')
  const importDialogVisible = ref(false)
  const importResultVisible = ref(false)
  const importResult = ref<ImportResultState | null>(null)

  const applyFormState = (source: Partial<UserFormState>) => {
    form.id = source.id
    form.account = source.account ?? ''
    form.name = source.name ?? ''
    form.email = source.email ?? ''
    form.phonePrefix = source.phonePrefix ?? '86'
    form.phone = source.phone ?? ''
    form.roleIds = normalizeRoleIds(source.roleIds)
    form.enable = source.enable ?? true
  }

  const resetFormState = () => {
    applyFormState(createEmptyFormState())
  }

  const loadRoleOptions = async () => {
    loadingRoles.value = true
    try {
      const res = await queryRoles('')
      roleOptions.value = Array.isArray(res.data) ? res.data : []
    } catch (error) {
      roleOptions.value = []
      window.alert(getErrorMessage(error))
    } finally {
      loadingRoles.value = false
    }
  }

  const loadDefaultPassword = async () => {
    if (loadingDefaultPassword.value) {
      return
    }

    loadingDefaultPassword.value = true
    try {
      const res = await queryDefaultPassword()
      defaultPassword.value = typeof res.data === 'string' ? res.data : ''
    } catch {
      defaultPassword.value = ''
    } finally {
      loadingDefaultPassword.value = false
    }
  }

  const loadPage = async () => {
    loading.value = true
    try {
      const res = await pagerUsers(page.value, pageSize.value, buildPagerRequest(filters))
      rows.value = Array.isArray(res.data?.records) ? res.data.records : []
      total.value = Number(res.data?.total ?? 0)
    } catch (error) {
      window.alert(getErrorMessage(error))
    } finally {
      loading.value = false
    }
  }

  const search = async () => {
    page.value = 1
    await loadPage()
  }

  const openCreate = async () => {
    editing.value = false
    resetFormState()
    dialogVisible.value = true
    if (!defaultPassword.value) {
      void loadDefaultPassword()
    }
    if (!roleOptions.value.length) {
      await loadRoleOptions()
    }
  }

  const openEdit = async (row: UserGridRow) => {
    if (row.id === undefined || row.id === null) {
      window.alert('当前记录缺少用户标识，无法编辑。')
      return
    }

    editing.value = true
    resetFormState()
    dialogVisible.value = true
    if (!roleOptions.value.length) {
      await loadRoleOptions()
    }

    try {
      const res = await queryUser(row.id)
      applyFormState({
        ...res.data,
        id: res.data?.id ?? row.id
      })
    } catch (error) {
      dialogVisible.value = false
      window.alert(getErrorMessage(error))
    }
  }

  const validateForm = (payload: UserFormState): boolean => {
    if (!payload.account.trim()) {
      window.alert('账号不能为空。')
      return false
    }
    if (!payload.name.trim()) {
      window.alert('姓名不能为空。')
      return false
    }
    if (!payload.roleIds.length) {
      window.alert('请至少选择一个角色。')
      return false
    }
    return true
  }

  const saveUser = async (nextForm?: UserFormState) => {
    if (nextForm) {
      applyFormState(nextForm)
    }

    const payload: UserFormState = {
      id: form.id,
      account: form.account.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      phonePrefix: form.phonePrefix?.trim() || '86',
      phone: form.phone?.trim() || '',
      roleIds: [...form.roleIds],
      enable: form.enable
    }

    if (!validateForm(payload)) {
      return false
    }

    submitting.value = true
    try {
      if (editing.value) {
        if (payload.id === undefined || payload.id === null) {
          window.alert('缺少用户标识，无法保存。')
          return false
        }
        await editUser(payload)
      } else {
        const { id: _omitId, ...creatorPayload } = payload
        await createUser(creatorPayload)
      }

      dialogVisible.value = false
      await loadPage()
      return true
    } catch (error) {
      window.alert(getErrorMessage(error))
      return false
    } finally {
      submitting.value = false
    }
  }

  const closeDialog = () => {
    dialogVisible.value = false
  }

  const openImportDialog = () => {
    importDialogVisible.value = true
  }

  const closeImportDialog = () => {
    if (importSubmitting.value) {
      return
    }
    importDialogVisible.value = false
  }

  const closeImportResultDialog = () => {
    importResultVisible.value = false
  }

  const continueImport = () => {
    importResultVisible.value = false
    importDialogVisible.value = true
  }

  const downloadTemplate = async () => {
    try {
      const response = await importTemplate()
      const headers = response.headers && typeof response.headers === 'object' ? response.headers : {}
      const contentDisposition = getContentDisposition(headers as Record<string, unknown>)
      const fileName =
        parseFileNameFromContentDisposition(contentDisposition) || '用户导入模板.xlsx'
      triggerBlobDownload(response.data, fileName)
    } catch (error) {
      window.alert(getErrorMessage(error))
    }
  }

  const submitImport = async (file: File | null | undefined) => {
    if (importSubmitting.value) {
      return false
    }
    if (!(file instanceof File)) {
      window.alert('请选择需要导入的 Excel 文件。')
      return false
    }
    if (!validateImportFile(file)) {
      return false
    }

    importSubmitting.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await importUsers(formData)
      importResult.value = {
        dataKey: String(response.data?.dataKey || ''),
        successCount: Number(response.data?.successCount || 0),
        errorCount: Number(response.data?.errorCount || 0)
      }
      importDialogVisible.value = false
      importResultVisible.value = true
      await loadPage()
      return true
    } catch (error) {
      window.alert(getErrorMessage(error))
      return false
    } finally {
      importSubmitting.value = false
    }
  }

  const downloadImportErrors = async (key?: string) => {
    if (downloadingImportErrors.value) {
      return
    }
    const dataKey = (key || importResult.value?.dataKey || '').trim()
    if (!dataKey) {
      window.alert('当前没有可下载的错误报告。')
      return
    }

    downloadingImportErrors.value = true
    try {
      const response = await downloadImportErrorsApi(dataKey)
      const headers = response.headers && typeof response.headers === 'object' ? response.headers : {}
      const contentDisposition = getContentDisposition(headers as Record<string, unknown>)
      const fileName =
        parseFileNameFromContentDisposition(contentDisposition) || '用户导入失败明细.xlsx'
      triggerBlobDownload(response.data, fileName)
    } catch (error) {
      window.alert(getErrorMessage(error))
    } finally {
      downloadingImportErrors.value = false
    }
  }

  const deleteUserRecord = async (row: UserGridRow) => {
    if (row.id === undefined || row.id === null) {
      window.alert('当前记录缺少用户标识，无法删除。')
      return
    }

    const confirmed = window.confirm(`确认删除用户「${row.name || row.account}」吗？`)
    if (!confirmed) {
      return
    }

    try {
      await deleteUser(row.id)
      const remainingCount = rows.value.length - 1
      if (remainingCount <= 0 && page.value > 1) {
        page.value -= 1
      }
      await loadPage()
    } catch (error) {
      window.alert(getErrorMessage(error))
    }
  }

  const toggleUserEnable = async (row: UserGridRow) => {
    if (row.id === undefined || row.id === null) {
      window.alert('当前记录缺少用户标识，无法修改状态。')
      return
    }

    const nextEnable = !row.enable
    const confirmed = window.confirm(
      `${nextEnable ? '启用' : '禁用'}用户「${row.name || row.account}」后立即生效，是否继续？`
    )
    if (!confirmed) {
      return
    }

    try {
      await switchUserEnable({
        id: row.id,
        enable: nextEnable
      })
      await loadPage()
    } catch (error) {
      window.alert(getErrorMessage(error))
    }
  }

  const resetUserPwd = async (row: UserGridRow) => {
    if (row.id === undefined || row.id === null) {
      window.alert('当前记录缺少用户标识，无法重置密码。')
      return
    }

    const confirmed = window.confirm(
      `确认将用户「${row.name || row.account}」的密码恢复为初始密码吗？`
    )
    if (!confirmed) {
      return
    }

    try {
      await resetUserPassword(row.id)
      window.alert('重置成功。')
    } catch (error) {
      window.alert(getErrorMessage(error))
    }
  }

  const setPage = async (nextPage: number) => {
    page.value = Math.max(1, nextPage)
    await loadPage()
  }

  const setPageSize = async (nextSize: number) => {
    const validSize = Number.isFinite(nextSize) && nextSize > 0 ? Math.floor(nextSize) : 20
    pageSize.value = validSize
    page.value = 1
    await loadPage()
  }

  onMounted(() => {
    void loadDefaultPassword()
    void loadRoleOptions()
    void loadPage()
  })

  return {
    loading,
    submitting,
    importSubmitting,
    downloadingImportErrors,
    loadingRoles,
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
    importDialogVisible,
    importResultVisible,
    importResult,
    loadPage,
    search,
    openCreate,
    openEdit,
    saveUser,
    closeDialog,
    openImportDialog,
    closeImportDialog,
    closeImportResultDialog,
    continueImport,
    downloadTemplate,
    submitImport,
    downloadImportErrors,
    deleteUserRecord,
    toggleUserEnable,
    resetUserPwd,
    setPage,
    setPageSize,
    loadRoleOptions
  }
}
