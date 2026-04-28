<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
// @ts-ignore DataEase bundles this from the parent frontend workspace.
import { ElMessage } from '../../../../../../core/core-frontend/node_modules/element-plus-secondary/dist/index.full.mjs'
import { useRoute, useRouter } from './useHashRoute'
import ColumnPermissionDialog from './components/ColumnPermissionDialog.vue'
import { useDatasetPermissionContext } from './useDatasetPermissionContext'
import {
  deleteColumnPermission,
  listColumnPermissions,
  listFieldsWithPermissions,
  rowPermissionTargetObjList,
  saveColumnPermission,
  whiteListUsersForPermissions
} from './api'
import type {
  BuiltInMaskRule,
  ColumnDesensitizationRule,
  ColumnPermissionDialogBootstrapState,
  ColumnPermissionFieldRule,
  ColumnPermissionFilterType,
  ColumnPermissionListQuery,
  ColumnStrategy,
  DatasetColumnPermissionDTO,
  DatasetPermissionAuthObj,
  DatasetPermissionWhiteUser
} from './types'

const route = useRoute()
const router = useRouter()
const { activeTab, datasetId, datasetName, invalidContext } = useDatasetPermissionContext()

const defaultPageSize = 10

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const loadingTargets = ref(false)
const loadingWhitelist = ref(false)
const loadingFields = ref(false)

const rows = ref<DatasetColumnPermissionDTO[]>([])
const allRows = ref<DatasetColumnPermissionDTO[]>([])
const allRowsReady = ref(false)
const allRowsDatasetId = ref<string | null>(null)

const dialogVisible = ref(false)
const maskVisible = ref(false)
const editRowId = ref<string | null>(null)

const subjectType = ref<'role' | 'user'>('role')
const targetOptions = ref<DatasetPermissionAuthObj[]>([])
const selectedTargetId = ref<string | null>(null)
const fieldRules = ref<ColumnPermissionFieldRule[]>([])
const whiteListOptions = ref<DatasetPermissionWhiteUser[]>([])
const selectedWhiteListIds = ref<string[]>([])
const enable = ref(true)
const missingTarget = ref(false)
const suppressDialogQueryOpen = ref(false)
const rowsRequestVersion = ref(0)
const targetRequestVersion = ref(0)
const whitelistRequestVersion = ref(0)
const fieldRulesRequestVersion = ref(0)
const dialogFlowVersion = ref(0)

const listQuery = reactive<ColumnPermissionListQuery>({
  page: 1,
  size: defaultPageSize,
  authTargetType: 'all',
  keyword: ''
})

const serverPager = reactive({
  total: 0,
  current: 1,
  size: defaultPageSize
})

const queryValue = (value: unknown): string | null => {
  const current = Array.isArray(value) ? value[0] : value
  return typeof current === 'string' ? current : null
}

const parseIdList = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .map(item => {
        if (typeof item === 'string') {
          return item
        }
        if (typeof item === 'number' && Number.isFinite(item)) {
          return String(item)
        }
        if (typeof item === 'bigint') {
          return String(item)
        }
        return null
      })
      .filter(Boolean) as string[]
  } catch {
    return []
  }
}

const normalizedKeyword = computed(() => listQuery.keyword.trim().toLowerCase())

const hasLocalFilters = computed(
  () => listQuery.authTargetType !== 'all' || normalizedKeyword.value.length > 0
)

const normalizeMaskRule = (raw: unknown): ColumnDesensitizationRule => {
  const source = (raw || {}) as {
    builtInRule?: unknown
    customBuiltInRule?: unknown
    m?: unknown
    n?: unknown
    specialCharacter?: unknown
    specialCharacterList?: unknown
  }
  const builtInRule = String(source.builtInRule || 'CompleteDesensitization')
  const builtInRuleSafe: BuiltInMaskRule =
    builtInRule === 'KeepFirstAndLastThreeCharacters' ||
    builtInRule === 'KeepMiddleThreeCharacters' ||
    builtInRule === 'custom'
      ? builtInRule
      : 'CompleteDesensitization'
  const m = Number(source.m)
  const n = Number(source.n)
  return {
    builtInRule: builtInRuleSafe,
    customBuiltInRule:
      String(source.customBuiltInRule || 'RetainBeforeMAndAfterN') === 'RetainMToN'
        ? 'RetainMToN'
        : 'RetainBeforeMAndAfterN',
    m: Number.isFinite(m) && m > 0 ? m : 1,
    n: Number.isFinite(n) && n > 0 ? n : 1,
    specialCharacter: String(source.specialCharacter || '*'),
    specialCharacterList: Array.isArray(source.specialCharacterList)
      ? source.specialCharacterList.map(item => String(item))
      : ['*']
  }
}

const typeLabel = (type: 'role' | 'user'): string => {
  return type === 'role' ? '角色' : '用户'
}

const whiteListSummary = (row: DatasetColumnPermissionDTO): string => {
  if (row.whiteListUsers?.length) {
    return row.whiteListUsers.map(item => item.name).join('、')
  }
  const ids = parseIdList(row.whiteListUser)
  if (!ids.length) {
    return '-'
  }
  return `${ids.length} 人`
}

const filteredRows = computed(() => {
  if (!hasLocalFilters.value) {
    return rows.value
  }
  return allRows.value.filter(row => {
    if (listQuery.authTargetType !== 'all' && row.authTargetType !== listQuery.authTargetType) {
      return false
    }
    if (!normalizedKeyword.value) {
      return true
    }
    const searchText = [
      typeLabel(row.authTargetType),
      row.authTargetName,
      row.authTargetId,
      whiteListSummary(row)
    ]
      .join(' ')
      .toLowerCase()
    return searchText.includes(normalizedKeyword.value)
  })
})

const totalRows = computed(() =>
  hasLocalFilters.value ? filteredRows.value.length : serverPager.total
)

const emptyStateHint = computed(() =>
  hasLocalFilters.value ? '调整筛选条件后重试' : '可点击左上角“添加”开始配置列权限'
)

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / listQuery.size)))

const pagedRows = computed(() => {
  if (!hasLocalFilters.value) {
    return rows.value
  }
  const start = (listQuery.page - 1) * listQuery.size
  return filteredRows.value.slice(start, start + listQuery.size)
})

const getErrorMessage = (error: unknown, fallback: string): string => {
  const message = (error as Error | undefined)?.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

const upsertDialogQuery = (dialog: boolean, mask: boolean, editingId?: string | null) => {
  const nextQuery = { ...route.query } as Record<string, unknown>
  if (dialog) {
    nextQuery.dialog = 'column'
    if (editingId) {
      nextQuery.editId = editingId
    } else {
      delete nextQuery.editId
    }
    if (mask) {
      nextQuery.mask = '1'
    } else {
      delete nextQuery.mask
    }
  } else {
    delete nextQuery.dialog
    delete nextQuery.mask
    delete nextQuery.editId
  }
  void router.replace({ query: nextQuery })
}

const invalidateDatasetRequests = () => {
  rowsRequestVersion.value += 1
  targetRequestVersion.value += 1
  whitelistRequestVersion.value += 1
  fieldRulesRequestVersion.value += 1
  dialogFlowVersion.value += 1
}

const clampPage = () => {
  const nextPage = Math.min(Math.max(1, listQuery.page), totalPages.value)
  if (nextPage !== listQuery.page) {
    listQuery.page = nextPage
  }
}

const resetListState = () => {
  rows.value = []
  allRows.value = []
  allRowsReady.value = false
  allRowsDatasetId.value = null
  serverPager.total = 0
  serverPager.current = 1
  serverPager.size = listQuery.size
}

const resetDialogForm = () => {
  subjectType.value = 'role'
  selectedTargetId.value = null
  fieldRules.value = []
  whiteListOptions.value = []
  selectedWhiteListIds.value = []
  enable.value = true
  missingTarget.value = false
}

const captureDialogState = (): ColumnPermissionDialogBootstrapState => ({
  subjectType: subjectType.value,
  selectedTargetId: selectedTargetId.value,
  fieldRules: fieldRules.value.map(field => ({
    ...field,
    desensitizationRule: normalizeMaskRule(field.desensitizationRule)
  })),
  selectedWhiteListIds: [...selectedWhiteListIds.value],
  enable: enable.value,
  editRowId: editRowId.value,
  missingTarget: missingTarget.value,
  targetOptions: [...targetOptions.value],
  whiteListOptions: [...whiteListOptions.value]
})

const syncDialogState = (state: ColumnPermissionDialogBootstrapState) => {
  subjectType.value = state.subjectType
  selectedTargetId.value = state.selectedTargetId
  fieldRules.value = state.fieldRules.map(field => ({
    ...field,
    desensitizationRule: normalizeMaskRule(field.desensitizationRule)
  }))
  selectedWhiteListIds.value = [...state.selectedWhiteListIds]
  enable.value = state.enable
  editRowId.value = state.editRowId
  missingTarget.value = state.missingTarget
  targetOptions.value = [...state.targetOptions]
  whiteListOptions.value = [...state.whiteListOptions]
}

const loadRows = async () => {
  const requestVersion = ++rowsRequestVersion.value
  const requestDatasetId = datasetId.value
  loading.value = true
  try {
    const pager = await listColumnPermissions(requestDatasetId, listQuery.page, listQuery.size, {
      authTargetType: listQuery.authTargetType === 'all' ? '' : listQuery.authTargetType,
      keyword: listQuery.keyword.trim()
    })
    if (requestVersion !== rowsRequestVersion.value || requestDatasetId !== datasetId.value) {
      return
    }
    rows.value = pager.records
    serverPager.total = pager.total
    serverPager.current = pager.current
    serverPager.size = pager.size
    allRowsDatasetId.value = requestDatasetId
  } catch (error) {
    if (requestVersion === rowsRequestVersion.value && requestDatasetId === datasetId.value) {
      rows.value = []
      serverPager.total = 0
      ElMessage.error(getErrorMessage(error, '列权限列表加载失败'))
    }
  } finally {
    if (requestVersion === rowsRequestVersion.value && requestDatasetId === datasetId.value) {
      loading.value = false
    }
  }
}

const ensureAllRowsLoaded = async () => {
  if (allRowsReady.value && allRowsDatasetId.value === datasetId.value) {
    return
  }
  const requestVersion = ++rowsRequestVersion.value
  const requestDatasetId = datasetId.value
  const batchSize = Math.max(listQuery.size, 100)
  loading.value = true
  try {
    const firstPage = await listColumnPermissions(requestDatasetId, 1, batchSize)
    if (requestVersion !== rowsRequestVersion.value || requestDatasetId !== datasetId.value) {
      return
    }
    const collected = [...firstPage.records]
    const total = firstPage.total
    const pageCount = Math.max(1, Math.ceil(total / batchSize))
    for (let page = 2; page <= pageCount; page += 1) {
      const pager = await listColumnPermissions(requestDatasetId, page, batchSize)
      if (requestVersion !== rowsRequestVersion.value || requestDatasetId !== datasetId.value) {
        return
      }
      collected.push(...pager.records)
    }
    allRows.value = collected
    allRowsReady.value = true
    allRowsDatasetId.value = requestDatasetId
  } catch (error) {
    if (requestVersion === rowsRequestVersion.value && requestDatasetId === datasetId.value) {
      allRows.value = []
      allRowsReady.value = false
      ElMessage.error(getErrorMessage(error, '列权限列表加载失败'))
    }
  } finally {
    if (requestVersion === rowsRequestVersion.value && requestDatasetId === datasetId.value) {
      loading.value = false
    }
  }
}

const refreshRows = async () => {
  if (hasLocalFilters.value) {
    await ensureAllRowsLoaded()
    clampPage()
    return
  }
  await loadRows()
}

const loadTargetOptions = async (type: 'role' | 'user', preferredId?: string | null) => {
  const requestVersion = ++targetRequestVersion.value
  const requestDatasetId = datasetId.value
  loadingTargets.value = true
  try {
    const options = await rowPermissionTargetObjList(requestDatasetId, type)
    if (requestVersion !== targetRequestVersion.value || requestDatasetId !== datasetId.value) {
      return
    }
    targetOptions.value = options
    if (preferredId !== undefined) {
      const preferredValid = preferredId != null && targetOptions.value.some(item => item.id === preferredId)
      selectedTargetId.value = preferredValid ? preferredId : null
      missingTarget.value = !preferredValid
      return
    }
    missingTarget.value = false
    selectedTargetId.value = targetOptions.value[0]?.id ?? null
  } finally {
    if (requestVersion === targetRequestVersion.value && requestDatasetId === datasetId.value) {
      loadingTargets.value = false
    }
  }
}

const loadWhiteListUsers = async () => {
  const requestVersion = ++whitelistRequestVersion.value
  const requestDatasetId = datasetId.value
  const requestTargetId = selectedTargetId.value
  if (!requestTargetId) {
    loadingWhitelist.value = false
    whiteListOptions.value = []
    return
  }
  const requestSubjectType = subjectType.value
  loadingWhitelist.value = true
  try {
    const users = await whiteListUsersForPermissions({
      datasetId: requestDatasetId,
      authTargetType: requestSubjectType,
      authTargetId: requestTargetId
    })
    if (
      requestVersion !== whitelistRequestVersion.value ||
      requestDatasetId !== datasetId.value ||
      requestTargetId !== selectedTargetId.value ||
      requestSubjectType !== subjectType.value
    ) {
      return
    }
    whiteListOptions.value = users
  } finally {
    if (requestVersion === whitelistRequestVersion.value && requestDatasetId === datasetId.value) {
      loadingWhitelist.value = false
    }
  }
}

const mergeFieldRules = async (permissionsText: string | null) => {
  const requestVersion = ++fieldRulesRequestVersion.value
  const requestDatasetId = datasetId.value
  loadingFields.value = true
  try {
    const baseFields = await listFieldsWithPermissions(requestDatasetId)
    if (requestVersion !== fieldRulesRequestVersion.value || requestDatasetId !== datasetId.value) {
      return
    }
    if (!permissionsText) {
      fieldRules.value = baseFields
      return
    }
    let permissionColumns: Array<{
      id?: unknown
      name?: unknown
      deType?: unknown
      selected?: unknown
      opt?: unknown
      desensitizationRule?: unknown
    }> = []
    try {
      const parsed = JSON.parse(permissionsText) as { columns?: unknown }
      if (Array.isArray(parsed.columns)) {
        permissionColumns = parsed.columns
      }
    } catch {
      permissionColumns = []
    }
    const byId = new Map(
      permissionColumns
        .map(item => {
          const idValue =
            typeof item.id === 'string'
              ? item.id
              : typeof item.id === 'number' && Number.isFinite(item.id)
                ? String(item.id)
                : typeof item.id === 'bigint'
                  ? String(item.id)
                  : null
          if (!idValue) {
            return null
          }
          return [idValue, item] as const
        })
        .filter(Boolean) as Array<
        readonly [
          string,
          {
            id?: unknown
            name?: unknown
            deType?: unknown
            selected?: unknown
            opt?: unknown
            desensitizationRule?: unknown
          }
        ]
      >
    )

    const merged = baseFields.map(field => {
      const saved = byId.get(field.id)
      const strategy: ColumnStrategy =
        String(saved?.opt || field.opt) === 'Desensitization' ? 'Desensitization' : 'Prohibit'
      return {
        ...field,
        selected: Boolean(saved?.selected ?? field.selected),
        opt: strategy,
        desensitizationRule: normalizeMaskRule(saved?.desensitizationRule ?? field.desensitizationRule)
      }
    })

    const appendOnly = permissionColumns
      .map(item => {
        const idValue =
          typeof item.id === 'string'
            ? item.id
            : typeof item.id === 'number' && Number.isFinite(item.id)
              ? String(item.id)
              : typeof item.id === 'bigint'
                ? String(item.id)
                : null
        if (!idValue || merged.some(field => field.id === idValue)) {
          return null
        }
        const strategy: ColumnStrategy =
          String(item.opt) === 'Desensitization' ? 'Desensitization' : 'Prohibit'
        return {
          id: idValue,
          name: String(item.name || idValue),
          deType: Number.isFinite(Number(item.deType)) ? Number(item.deType) : null,
          selected: Boolean(item.selected),
          opt: strategy,
          desensitizationRule: normalizeMaskRule(item.desensitizationRule)
        }
      })
      .filter(Boolean) as ColumnPermissionFieldRule[]

    fieldRules.value = [...merged, ...appendOnly]
  } finally {
    if (requestVersion === fieldRulesRequestVersion.value && requestDatasetId === datasetId.value) {
      loadingFields.value = false
    }
  }
}

const openCreateDialog = async (syncQuery = true) => {
  const requestVersion = ++dialogFlowVersion.value
  const requestDatasetId = datasetId.value
  const previousState = captureDialogState()
  resetDialogForm()
  editRowId.value = null
  try {
    await loadTargetOptions(subjectType.value)
    await loadWhiteListUsers()
    await mergeFieldRules(null)
    if (
      requestVersion !== dialogFlowVersion.value ||
      requestDatasetId !== datasetId.value ||
      invalidContext.value
    ) {
      return
    }
    dialogVisible.value = true
    maskVisible.value = false
    if (syncQuery) {
      upsertDialogQuery(true, false, null)
    }
  } catch (error) {
    syncDialogState(previousState)
    dialogVisible.value = false
    maskVisible.value = false
    if (!syncQuery && route.query.dialog != null) {
      upsertDialogQuery(false, false)
    }
    ElMessage.error(getErrorMessage(error, '列权限配置初始化失败'))
  }
}

const openEditDialog = async (row: DatasetColumnPermissionDTO) => {
  const requestVersion = ++dialogFlowVersion.value
  const requestDatasetId = datasetId.value
  const previousState = captureDialogState()
  subjectType.value = row.authTargetType
  editRowId.value = row.id
  selectedWhiteListIds.value = parseIdList(row.whiteListUser || '[]')
  enable.value = row.enable
  try {
    await loadTargetOptions(subjectType.value, row.authTargetId)
    await loadWhiteListUsers()
    await mergeFieldRules(row.permissions)
    if (
      requestVersion !== dialogFlowVersion.value ||
      requestDatasetId !== datasetId.value ||
      invalidContext.value
    ) {
      return
    }
    dialogVisible.value = true
    maskVisible.value = false
    upsertDialogQuery(true, false, row.id)
  } catch (error) {
    syncDialogState(previousState)
    ElMessage.error(getErrorMessage(error, '列权限配置初始化失败'))
  }
}

const closeDialog = () => {
  dialogVisible.value = false
  maskVisible.value = false
  editRowId.value = null
  missingTarget.value = false
  upsertDialogQuery(false, false)
}

const onSwitchSubjectType = async (type: 'role' | 'user') => {
  const previousState = captureDialogState()
  subjectType.value = type
  selectedWhiteListIds.value = []
  try {
    await loadTargetOptions(type)
    await loadWhiteListUsers()
    await mergeFieldRules(null)
  } catch (error) {
    syncDialogState(previousState)
    ElMessage.error(getErrorMessage(error, '列权限配置初始化失败'))
  }
}

const onChangeTarget = async (targetId: string | null) => {
  const previousState = captureDialogState()
  selectedTargetId.value = targetId
  missingTarget.value = false
  selectedWhiteListIds.value = []
  try {
    await loadWhiteListUsers()
  } catch (error) {
    syncDialogState(previousState)
    ElMessage.error(getErrorMessage(error, '白名单加载失败'))
  }
}

const refreshWhitelistOptions = async () => {
  try {
    await loadWhiteListUsers()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '白名单加载失败'))
  }
}

const onToggleField = (fieldId: string) => {
  fieldRules.value = fieldRules.value.map(field =>
    field.id === fieldId
      ? {
          ...field,
          selected: !field.selected
        }
      : field
  )
}

const onChangeStrategy = (payload: { fieldId: string; strategy: ColumnStrategy }) => {
  fieldRules.value = fieldRules.value.map(field => {
    if (field.id !== payload.fieldId) {
      return field
    }
    return {
      ...field,
      selected: true,
      opt: payload.strategy
    }
  })
}

const onOpenMask = () => {
  maskVisible.value = true
  upsertDialogQuery(true, true, editRowId.value)
}

const onCloseMask = () => {
  maskVisible.value = false
  upsertDialogQuery(true, false, editRowId.value)
}

const onUpdateMaskRule = (payload: { fieldId: string; rule: ColumnDesensitizationRule }) => {
  fieldRules.value = fieldRules.value.map(field => {
    if (field.id !== payload.fieldId) {
      return field
    }
    return {
      ...field,
      selected: true,
      opt: 'Desensitization',
      desensitizationRule: normalizeMaskRule(payload.rule)
    }
  })
}

const onChangeWhitelist = (ids: string[]) => {
  selectedWhiteListIds.value = ids
}

const onClearWhitelist = () => {
  selectedWhiteListIds.value = []
}

const removeColumnPermissionRow = async (row: DatasetColumnPermissionDTO) => {
  if (!row.id) {
    return
  }
  const objectName = String(row.authTargetName || '').trim()
  const confirmText = objectName
    ? `确认删除【${objectName}】的列权限规则？删除后不可恢复。`
    : '确认删除该列权限规则？删除后不可恢复。'
  if (!window.confirm(confirmText)) {
    return
  }
  deleting.value = true
  try {
    await deleteColumnPermission({ id: row.id })
    allRowsReady.value = false
    await refreshRows()
    if (editRowId.value === row.id) {
      closeDialog()
    }
    ElMessage.success('删除成功')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '删除失败'))
  } finally {
    deleting.value = false
  }
}

const removeEditingRule = () => {
  const target =
    allRows.value.find(item => item.id === editRowId.value) ??
    rows.value.find(item => item.id === editRowId.value)
  if (target) {
    void removeColumnPermissionRow(target)
  }
}

const onSubmit = async () => {
  if (!selectedTargetId.value) {
    ElMessage.warning('请选择受限对象后再保存')
    return
  }
  const selectedColumns = fieldRules.value.filter(field => field.selected)
  if (!selectedColumns.length) {
    ElMessage.warning('请至少选择一个字段规则后再保存')
    return
  }
  const targetName = targetOptions.value.find(item => item.id === selectedTargetId.value)?.name || ''
  const permissions = {
    enable: enable.value,
    columns: fieldRules.value.map(field => ({
      id: field.id,
      name: field.name,
      deType: field.deType ?? undefined,
      selected: field.selected,
      opt: field.opt,
      desensitizationRule:
        field.selected && field.opt === 'Desensitization'
          ? normalizeMaskRule(field.desensitizationRule)
          : undefined
    }))
  }
  saving.value = true
  try {
    await saveColumnPermission({
      id: editRowId.value,
      enable: enable.value,
      datasetId: datasetId.value,
      datasetName: datasetName.value,
      authTargetType: subjectType.value,
      authTargetId: selectedTargetId.value,
      authTargetName: targetName,
      permissions: JSON.stringify(permissions),
      whiteListUser: JSON.stringify(selectedWhiteListIds.value)
    })
    allRowsReady.value = false
    await refreshRows()
    closeDialog()
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '保存失败'))
  } finally {
    saving.value = false
  }
}

const onApplyFilters = async () => {
  listQuery.page = 1
  await refreshRows()
}

const onFilterTypeChange = (event: Event) => {
  listQuery.authTargetType = (event.target as HTMLSelectElement).value as ColumnPermissionFilterType
}

const onResetFilters = async () => {
  listQuery.authTargetType = 'all'
  listQuery.keyword = ''
  listQuery.page = 1
  await refreshRows()
}

const onPageChange = async (page: number) => {
  if (page < 1 || page === listQuery.page || page > totalPages.value) {
    return
  }
  listQuery.page = page
  await refreshRows()
}

const onPageSizeChange = async (event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value)
  if (!Number.isFinite(value) || value <= 0 || value === listQuery.size) {
    return
  }
  listQuery.size = value
  listQuery.page = 1
  allRowsReady.value = false
  await refreshRows()
}

const findRowByEditId = (id: string) => {
  return (
    allRows.value.find(item => item.id === id) ??
    rows.value.find(item => item.id === id) ??
    null
  )
}

const openDialogFromQuery = async (editId: string | null) => {
  if (!editId) {
    await openCreateDialog(false)
    return
  }
  let targetRow = findRowByEditId(editId)
  if (!targetRow) {
    await ensureAllRowsLoaded()
    targetRow = findRowByEditId(editId)
  }
  if (targetRow) {
    await openEditDialog(targetRow)
    return
  }
  ElMessage.error('未找到要恢复的列权限规则，已切换为新建态')
  await openCreateDialog(false)
}

watch(
  () => totalRows.value,
  () => {
    clampPage()
  }
)

watch(
  () => [invalidContext.value, datasetId.value, datasetName.value] as const,
  (next, prev) => {
    if (next[0]) {
      invalidateDatasetRequests()
      loading.value = false
      loadingTargets.value = false
      loadingWhitelist.value = false
      loadingFields.value = false
      resetListState()
      resetDialogForm()
      targetOptions.value = []
      if (dialogVisible.value || route.query.dialog != null || route.query.mask != null) {
        suppressDialogQueryOpen.value = true
        closeDialog()
        resetDialogForm()
        targetOptions.value = []
        Promise.resolve().then(() => {
          suppressDialogQueryOpen.value = false
        })
      }
      return
    }
    if (prev && (next[1] !== prev[1] || next[2] !== prev[2])) {
      invalidateDatasetRequests()
      listQuery.page = 1
      listQuery.size = defaultPageSize
      listQuery.authTargetType = 'all'
      listQuery.keyword = ''
      resetListState()
      resetDialogForm()
      targetOptions.value = []
      if (dialogVisible.value) {
        suppressDialogQueryOpen.value = true
        closeDialog()
        Promise.resolve().then(() => {
          suppressDialogQueryOpen.value = false
        })
      }
    }
    void refreshRows()
  },
  { immediate: true }
)

watch(
  () => [activeTab.value, queryValue(route.query.dialog), queryValue(route.query.mask), queryValue(route.query.editId)] as const,
  async ([tab, dialog, mask, editId]) => {
    if (tab !== 'column') {
      dialogVisible.value = false
      maskVisible.value = false
      editRowId.value = null
      return
    }
    if (invalidContext.value) {
      if (dialogVisible.value || dialog != null || mask != null) {
        suppressDialogQueryOpen.value = true
        closeDialog()
        Promise.resolve().then(() => {
          suppressDialogQueryOpen.value = false
        })
      }
      return
    }
    if (suppressDialogQueryOpen.value) {
      return
    }
    if (dialog !== 'column') {
      dialogVisible.value = false
      maskVisible.value = false
      editRowId.value = null
      return
    }
    if (!dialogVisible.value) {
      await openDialogFromQuery(editId)
    } else if ((editRowId.value || null) !== (editId || null)) {
      await openDialogFromQuery(editId)
    }
    maskVisible.value = mask === '1'
  },
  { immediate: true }
)
</script>

<template>
  <section class="permission-page">
    <div v-if="invalidContext" class="permission-page__invalid">
      <div class="empty-state">
        <div class="empty-state__icon"></div>
        <div class="empty-state__text">当前数据集暂不支持列权限配置</div>
      </div>
    </div>

    <div v-else class="content__inner">
      <section class="panel">
        <div class="panel-toolbar">
          <button type="button" class="add-btn" @click="openCreateDialog()">＋ 添加</button>
          <div class="list-controls">
            <select
              class="list-controls__select"
              :value="listQuery.authTargetType"
              @change="onFilterTypeChange"
            >
              <option value="all">全部类型</option>
              <option value="role">角色</option>
              <option value="user">用户</option>
            </select>
            <input
              v-model.trim="listQuery.keyword"
              class="list-controls__input"
              type="text"
              placeholder="搜索对象或白名单"
              @keyup.enter="onApplyFilters"
            />
            <button type="button" class="toolbar-btn" @click="onApplyFilters">查询</button>
            <button type="button" class="toolbar-btn toolbar-btn--ghost" @click="onResetFilters">重置</button>
          </div>
        </div>

        <div class="table-head">
          <span>类型</span>
          <span>受限对象</span>
          <span>白名单</span>
          <span>操作</span>
        </div>

        <template v-if="loading">
          <div class="empty-state">
            <div class="empty-state__text">加载中...</div>
          </div>
        </template>
        <template v-else-if="!totalRows">
          <div class="empty-state">
            <div class="empty-state__icon"></div>
            <div class="empty-state__text">{{ hasLocalFilters ? '暂无匹配数据' : '暂无数据' }}</div>
            <div class="empty-state__desc">{{ emptyStateHint }}</div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="row in pagedRows"
            :key="row.id || `${row.authTargetType}-${row.authTargetId}`"
            class="table-row"
          >
            <span>{{ typeLabel(row.authTargetType) }}</span>
            <span>{{ row.authTargetName || '-' }}</span>
            <span>{{ whiteListSummary(row) }}</span>
            <span class="table-row__ops">
              <button type="button" class="link-btn" @click="openEditDialog(row)">编辑</button>
              <button
                type="button"
                class="link-btn danger"
                :disabled="deleting"
                @click="removeColumnPermissionRow(row)"
              >
                删除
              </button>
            </span>
          </div>
        </template>

        <div v-if="totalRows > 0" class="pagination-bar">
          <div class="pagination-bar__summary">共 {{ totalRows }} 条</div>
          <div class="pagination-bar__controls">
            <select class="pagination-bar__size" :value="listQuery.size" @change="onPageSizeChange">
              <option :value="10">10 / 页</option>
              <option :value="20">20 / 页</option>
              <option :value="50">50 / 页</option>
            </select>
            <button
              type="button"
              class="pager-btn"
              :disabled="listQuery.page <= 1 || loading"
              @click="onPageChange(listQuery.page - 1)"
            >
              上一页
            </button>
            <span class="pagination-bar__page">{{ listQuery.page }} / {{ totalPages }}</span>
            <button
              type="button"
              class="pager-btn"
              :disabled="listQuery.page >= totalPages || loading"
              @click="onPageChange(listQuery.page + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </section>
    </div>

    <ColumnPermissionDialog
      :visible="dialogVisible"
      :mask-visible="maskVisible"
      :saving="saving"
      :deleting="deleting"
      :is-edit="editRowId !== null"
      :subject-type="subjectType"
      :target-options="targetOptions"
      :selected-target-id="selectedTargetId"
      :fields="fieldRules"
      :whitelist-options="whiteListOptions"
      :selected-whitelist-ids="selectedWhiteListIds"
      :missing-target="missingTarget"
      :enabled="enable"
      :target-loading="loadingTargets"
      :field-loading="loadingFields"
      :whitelist-loading="loadingWhitelist"
      @close="closeDialog"
      @open-mask="onOpenMask"
      @close-mask="onCloseMask"
      @switch-subject-type="onSwitchSubjectType"
      @change-target="onChangeTarget"
      @change-enable="enable = $event"
      @toggle-field="onToggleField"
      @change-strategy="onChangeStrategy"
      @refresh-whitelist="refreshWhitelistOptions"
      @change-whitelist="onChangeWhitelist"
      @clear-whitelist="onClearWhitelist"
      @update-mask-rule="onUpdateMaskRule"
      @submit="onSubmit"
      @delete="removeEditingRule"
    />
  </section>
</template>

<style scoped>
.permission-page {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1 1 auto;
  overflow: hidden;
}

.content__inner {
  width: 100%;
  max-width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.permission-page__invalid {
  flex: 1;
  min-height: 420px;
  border: 1px solid #dde7f5;
  border-radius: 14px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn {
  height: 40px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #d7deea;
  background: #ffffff;
  color: #344054;
}

.panel {
  border: 1px solid #dde7f5;
  border-radius: 14px;
  background: #ffffff;
  padding: 12px;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 360px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
}

.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px;
  border: 1px solid #e7edf7;
  border-radius: 12px;
  background: #f8fbff;
}

.list-controls {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.list-controls__select,
.list-controls__input,
.toolbar-btn,
.pagination-bar__size,
.pager-btn {
  height: 38px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #ffffff;
  color: #344054;
  font-size: 14px;
}

.list-controls__select,
.pagination-bar__size {
  padding: 0 12px;
}

.list-controls__input {
  width: 240px;
  padding: 0 12px;
  box-sizing: border-box;
}

.toolbar-btn,
.pager-btn {
  padding: 0 14px;
}

.toolbar-btn--ghost {
  background: #f8fafc;
}

.table-head,
.table-row {
  min-height: 44px;
  padding: 0 16px;
  display: grid;
  grid-template-columns: minmax(92px, 1fr) minmax(180px, 1.4fr) minmax(140px, 1fr) minmax(120px, 140px);
  align-items: center;
  color: #344054;
  font-size: 14px;
  min-width: 640px;
}

.table-head {
  margin-top: 12px;
  background: #f5f8fd;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px 10px 0 0;
}

.table-row {
  border-bottom: 1px solid #eef2f7;
  font-size: 14px;
}

.table-row:nth-child(odd) {
  background: #fcfdff;
}

.table-row__ops {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
}

.link-btn {
  border: none;
  background: transparent;
  color: #2f6bff;
  padding: 0;
  cursor: pointer;
}

.link-btn.danger {
  color: #f04438;
}

.link-btn:disabled {
  cursor: not-allowed;
  color: #98a2b3;
}

.empty-state {
  flex: 1;
  min-height: 0;
  padding: 54px 0 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  color: #98a2b3;
  text-align: center;
}

.empty-state__text {
  font-size: 14px;
  line-height: 22px;
}

.empty-state__desc {
  color: #b3bdca;
  font-size: 13px;
  line-height: 20px;
  max-width: 320px;
}

.empty-state__icon {
  width: 58px;
  height: 58px;
  position: relative;
}

.empty-state__icon::before,
.empty-state__icon::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  background: #d5dbe5;
}

.empty-state__icon::before {
  width: 32px;
  height: 32px;
  top: 2px;
}

.empty-state__icon::after {
  width: 38px;
  height: 38px;
  top: 16px;
  background: transparent;
  border: 3px solid #d5dbe5;
  box-sizing: border-box;
}

.pagination-bar {
  margin-top: auto;
  padding-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.pagination-bar__summary,
.pagination-bar__page {
  color: #667085;
  font-size: 14px;
}

.pagination-bar__controls {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1480px) {
  .table-head,
  .table-row {
    min-width: 600px;
  }
}
</style>
