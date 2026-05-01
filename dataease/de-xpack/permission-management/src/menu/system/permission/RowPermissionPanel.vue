<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
// @ts-ignore DataEase bundles this from the parent frontend workspace.
import { ElMessage } from '../../../../../../core/core-frontend/node_modules/element-plus-secondary/dist/index.full.mjs'
import SystemSelect from '../shared/SystemSelect.vue'
import { useRoute, useRouter } from './useHostRoute'
import RowPermissionDialog from './components/RowPermissionDialog.vue'
import { useDatasetPermissionContext } from './useDatasetPermissionContext'
import {
  deleteRowPermission,
  listFieldsWithPermissions,
  listRowPermissions,
  rowPermissionTargetObjList,
  saveRowPermission,
  whiteListUsersForPermissions
} from './api'
import type {
  ColumnPermissionFieldRule,
  DatasetPermissionAuthObj,
  DatasetPermissionTargetType,
  DatasetPermissionWhiteUser,
  RowPermissionDialogBootstrapState,
  DatasetRowPermissionDTO,
  RowPermissionFilterType,
  RowPermissionListQuery,
  RowDialogType
} from './types'

const route = useRoute()
const router = useRouter()
const { activeTab, datasetId, datasetName, invalidContext } = useDatasetPermissionContext()

const defaultPageSize = 10

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const rows = ref<DatasetRowPermissionDTO[]>([])
const allRows = ref<DatasetRowPermissionDTO[]>([])
const allRowsReady = ref(false)
const allRowsDatasetId = ref<string | null>(null)

const dialogVisible = ref(false)
const dialogType = ref<RowDialogType>('role')
const editRowId = ref<string | null>(null)
const targetOptions = ref<DatasetPermissionAuthObj[]>([])
const whiteListOptions = ref<DatasetPermissionWhiteUser[]>([])
const datasetFields = ref<ColumnPermissionFieldRule[]>([])
const missingTarget = ref(false)
const suppressDialogQueryOpen = ref(false)
const rowsRequestVersion = ref(0)
const fieldsRequestVersion = ref(0)
const targetRequestVersion = ref(0)
const whitelistRequestVersion = ref(0)
const dialogFlowVersion = ref(0)

const listQuery = reactive<RowPermissionListQuery>({
  page: 1,
  size: defaultPageSize,
  authTargetType: 'all',
  keyword: ''
})

const filterTypeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '角色', value: 'role' },
  { label: '用户', value: 'user' },
  { label: '系统变量', value: 'sysParams' }
]

const pageSizeOptions = [
  { label: '10 / 页', value: '10' },
  { label: '20 / 页', value: '20' },
  { label: '50 / 页', value: '50' }
]

const selectedPageSize = computed({
  get: () => String(listQuery.size),
  set: value => {
    void onPageSizeChange(value)
  }
})

const serverPager = reactive({
  total: 0,
  current: 1,
  size: defaultPageSize
})

const form = reactive({
  targetId: null as string | null,
  expressionTree: '',
  whiteListIds: [] as string[],
  enable: true
})

const queryValue = (value: unknown): string | null => {
  const current = Array.isArray(value) ? value[0] : value
  return typeof current === 'string' ? current : null
}

const normalizedKeyword = computed(() => listQuery.keyword.trim().toLowerCase())

const fieldNameById = computed(() => {
  return new Map(datasetFields.value.map(field => [field.id, field.name]))
})

const isDialogType = (value: string | null): value is RowDialogType => {
  return value === 'role' || value === 'user' || value === 'sysVar'
}

const resolveDialogTypeFromQuery = (): RowDialogType | null => {
  const dialog = queryValue(route.query.dialog)
  const targetType = queryValue(route.query.targetType)
  if (dialog === 'row' && isDialogType(targetType)) {
    return targetType
  }
  if (isDialogType(dialog)) {
    return dialog
  }
  return null
}

const isLegacyDialogQuery = () => {
  return isDialogType(queryValue(route.query.dialog))
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

const inferSysVarFieldId = (): string | null => {
  if (!datasetFields.value.length) {
    return null
  }
  const preferred = datasetFields.value.find(field => field.name === '账号')
  return preferred?.id ?? datasetFields.value[0]?.id ?? null
}

const defaultExpression = (type: RowDialogType): string => {
  if (type === 'sysVar') {
    const fieldId = inferSysVarFieldId()
    if (fieldId == null) {
      return '{"logic":"and","items":[]}'
    }
    return JSON.stringify({
      logic: 'and',
      items: [{ type: 'item', fieldId, filterType: 'logic', term: 'eq', value: '${sysParams.userId}' }]
    })
  }
  return '{"logic":"and","items":[]}'
}

const toAuthTargetType = (type: RowDialogType): DatasetPermissionTargetType => {
  if (type === 'sysVar') {
    return 'sysParams'
  }
  return type
}

const toDialogType = (type: DatasetPermissionTargetType): RowDialogType => {
  if (type === 'sysParams') {
    return 'sysVar'
  }
  return type
}

const whiteListSummary = (row: DatasetRowPermissionDTO): string => {
  if (row.whiteListUsers?.length) {
    return row.whiteListUsers.map(item => item.name).join('、')
  }
  const ids = parseIdList(row.whiteListUser)
  if (!ids.length) {
    return '-'
  }
  return `${ids.length} 人`
}

const collectExpressionFieldIds = (source: unknown): string[] => {
  if (!source || typeof source !== 'object') {
    return []
  }
  const record = source as { items?: unknown; fieldId?: unknown; subTree?: unknown }
  const ids: string[] = []
  if (record.fieldId != null && String(record.fieldId).trim()) {
    ids.push(String(record.fieldId))
  }
  if (Array.isArray(record.items)) {
    record.items.forEach(item => {
      ids.push(...collectExpressionFieldIds(item))
    })
  }
  if (record.subTree) {
    ids.push(...collectExpressionFieldIds(record.subTree))
  }
  return ids
}

const rowRuleSummary = (row: DatasetRowPermissionDTO): string => {
  try {
    const parsed = JSON.parse(row.expressionTree || '{}')
    const fieldIds = Array.from(new Set(collectExpressionFieldIds(parsed)))
    if (!fieldIds.length) {
      return '未设置条件'
    }
    const names = fieldIds
      .map(id => fieldNameById.value.get(id) || id)
      .filter(Boolean)
    const preview = names.slice(0, 3).join('、')
    return fieldIds.length > 3 ? `${fieldIds.length} 个条件：${preview}...` : `${fieldIds.length} 个条件：${preview}`
  } catch {
    return '规则解析失败'
  }
}

const typeLabel = (type: DatasetPermissionTargetType): string => {
  if (type === 'role') return '角色'
  if (type === 'user') return '用户'
  return '系统变量'
}

const hasLocalFilters = computed(
  () => listQuery.authTargetType !== 'all' || normalizedKeyword.value.length > 0
)

const filteredRows = computed(() => {
  if (!hasLocalFilters.value) {
    return rows.value
  }
  return allRows.value.filter(row => {
    if (
      listQuery.authTargetType !== 'all' &&
      row.authTargetType !== listQuery.authTargetType
    ) {
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
  hasLocalFilters.value ? '调整筛选条件后重试' : '可点击左上角“添加”开始配置行权限'
)

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / listQuery.size)))

const pagedRows = computed(() => {
  if (!hasLocalFilters.value) {
    return rows.value
  }
  const start = (listQuery.page - 1) * listQuery.size
  return filteredRows.value.slice(start, start + listQuery.size)
})

const upsertDialogQuery = (dialog: boolean, type?: RowDialogType | null) => {
  const nextQuery = { ...route.query } as Record<string, unknown>
  if (dialog && type) {
    nextQuery.dialog = 'row'
    nextQuery.targetType = type
  } else {
    delete nextQuery.dialog
    delete nextQuery.targetType
    delete nextQuery.mask
  }
  void router.replace({ query: nextQuery })
}

const invalidateDatasetRequests = () => {
  rowsRequestVersion.value += 1
  fieldsRequestVersion.value += 1
  targetRequestVersion.value += 1
  whitelistRequestVersion.value += 1
  dialogFlowVersion.value += 1
}

const resetRowListState = () => {
  rows.value = []
  allRows.value = []
  allRowsReady.value = false
  allRowsDatasetId.value = null
  serverPager.total = 0
  serverPager.current = 1
  serverPager.size = listQuery.size
}

const syncDialogState = (state: RowPermissionDialogBootstrapState) => {
  dialogType.value = state.type
  editRowId.value = state.editRowId
  form.targetId = state.targetId
  form.expressionTree = state.expressionTree
  form.whiteListIds = [...state.whiteListIds]
  form.enable = state.enable
  missingTarget.value = state.missingTarget
  targetOptions.value = [...state.targetOptions]
  whiteListOptions.value = [...state.whiteListOptions]
}

const captureDialogState = (): RowPermissionDialogBootstrapState => ({
  type: dialogType.value,
  targetId: form.targetId,
  expressionTree: form.expressionTree,
  whiteListIds: [...form.whiteListIds],
  enable: form.enable,
  editRowId: editRowId.value,
  missingTarget: missingTarget.value,
  targetOptions: [...targetOptions.value],
  whiteListOptions: [...whiteListOptions.value]
})

const getErrorMessage = (error: unknown, fallback: string): string => {
  const message = (error as Error | undefined)?.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

const clampPage = () => {
  const nextPage = Math.min(Math.max(1, listQuery.page), totalPages.value)
  if (nextPage !== listQuery.page) {
    listQuery.page = nextPage
  }
}

const loadRows = async () => {
  const requestVersion = ++rowsRequestVersion.value
  const requestDatasetId = datasetId.value
  loading.value = true
  try {
    const pager = await listRowPermissions(requestDatasetId, listQuery.page, listQuery.size)
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
      ElMessage.error((error as Error)?.message || '行权限列表加载失败')
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
    const firstPage = await listRowPermissions(requestDatasetId, 1, batchSize)
    if (requestVersion !== rowsRequestVersion.value || requestDatasetId !== datasetId.value) {
      return
    }
    const collected = [...firstPage.records]
    const total = firstPage.total
    const pageCount = Math.max(1, Math.ceil(total / batchSize))
    for (let page = 2; page <= pageCount; page += 1) {
      const pager = await listRowPermissions(requestDatasetId, page, batchSize)
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
      ElMessage.error((error as Error)?.message || '行权限列表加载失败')
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

const loadDatasetFields = async () => {
  const requestVersion = ++fieldsRequestVersion.value
  const requestDatasetId = datasetId.value
  const fields = await listFieldsWithPermissions(requestDatasetId)
  if (requestVersion !== fieldsRequestVersion.value || requestDatasetId !== datasetId.value) {
    return
  }
  datasetFields.value = fields
}

const loadTargetOptions = async (type: RowDialogType, preferredId?: string | null) => {
  const requestVersion = ++targetRequestVersion.value
  const requestDatasetId = datasetId.value
  if (type === 'sysVar') {
    targetOptions.value = []
    form.targetId = '0'
    missingTarget.value = false
    return
  }
  const options = await rowPermissionTargetObjList(requestDatasetId, type)
  if (requestVersion !== targetRequestVersion.value || requestDatasetId !== datasetId.value) {
    return
  }
  targetOptions.value = options
  if (preferredId !== undefined) {
    const preferredValid = preferredId != null && targetOptions.value.some(item => item.id === preferredId)
    form.targetId = preferredValid ? preferredId : null
    missingTarget.value = !preferredValid
    return
  }
  missingTarget.value = false
  form.targetId = targetOptions.value[0]?.id ?? null
}

const loadWhiteListUsers = async () => {
  const requestVersion = ++whitelistRequestVersion.value
  const requestDatasetId = datasetId.value
  const requestDialogType = dialogType.value
  const authTargetType = toAuthTargetType(requestDialogType)
  const authTargetId = requestDialogType === 'sysVar' ? '0' : (form.targetId ?? '0')
  if (dialogType.value !== 'sysVar' && !form.targetId) {
    whiteListOptions.value = []
    return
  }
  const users = await whiteListUsersForPermissions({
    datasetId: requestDatasetId,
    authTargetType,
    authTargetId
  })
  if (
    requestVersion !== whitelistRequestVersion.value ||
    requestDatasetId !== datasetId.value ||
    requestDialogType !== dialogType.value
  ) {
    return
  }
  whiteListOptions.value = users
}

const resetForm = () => {
  form.targetId = null
  form.expressionTree = defaultExpression(dialogType.value)
  form.whiteListIds = []
  form.enable = true
}

const openCreateDialog = async (type: RowDialogType, syncQuery = true) => {
  const requestVersion = ++dialogFlowVersion.value
  const requestDatasetId = datasetId.value
  const previousState = captureDialogState()
  dialogType.value = type
  editRowId.value = null
  missingTarget.value = false
  try {
    if (type === 'sysVar' && !datasetFields.value.length) {
      await loadDatasetFields()
    }
    resetForm()
    await loadTargetOptions(type)
    await loadWhiteListUsers()
    if (
      requestVersion !== dialogFlowVersion.value ||
      requestDatasetId !== datasetId.value ||
      invalidContext.value
    ) {
      return
    }
    dialogVisible.value = true
    if (syncQuery) {
      upsertDialogQuery(true, type)
    }
  } catch (error) {
    syncDialogState(previousState)
    dialogVisible.value = false
    if (!syncQuery && (route.query.dialog != null || route.query.targetType != null)) {
      upsertDialogQuery(false)
    }
    ElMessage.error(getErrorMessage(error, '行权限配置初始化失败'))
  }
}

const openEditDialog = async (row: DatasetRowPermissionDTO) => {
  const requestVersion = ++dialogFlowVersion.value
  const requestDatasetId = datasetId.value
  const previousState = captureDialogState()
  dialogType.value = toDialogType(row.authTargetType)
  editRowId.value = row.id
  form.whiteListIds = parseIdList(row.whiteListUser)
  form.enable = row.enable
  try {
    if (dialogType.value === 'sysVar' && !datasetFields.value.length) {
      await loadDatasetFields()
    }
    form.expressionTree = row.expressionTree || defaultExpression(dialogType.value)
    await loadTargetOptions(dialogType.value, row.authTargetId)
    await loadWhiteListUsers()
    if (
      requestVersion !== dialogFlowVersion.value ||
      requestDatasetId !== datasetId.value ||
      invalidContext.value
    ) {
      return
    }
    dialogVisible.value = true
    upsertDialogQuery(true, dialogType.value)
  } catch (error) {
    syncDialogState(previousState)
    ElMessage.error(getErrorMessage(error, '行权限配置初始化失败'))
  }
}

const closeDialog = () => {
  dialogFlowVersion.value += 1
  dialogVisible.value = false
  editRowId.value = null
  missingTarget.value = false
  upsertDialogQuery(false)
}

const onSwitchType = async (type: RowDialogType) => {
  const requestVersion = ++dialogFlowVersion.value
  const requestDatasetId = datasetId.value
  const previousState = captureDialogState()
  dialogType.value = type
  try {
    if (type === 'sysVar' && !datasetFields.value.length) {
      await loadDatasetFields()
    }
    form.expressionTree = defaultExpression(type)
    form.whiteListIds = []
    await loadTargetOptions(type)
    await loadWhiteListUsers()
    if (
      requestVersion !== dialogFlowVersion.value ||
      requestDatasetId !== datasetId.value ||
      invalidContext.value ||
      !dialogVisible.value
    ) {
      return
    }
    upsertDialogQuery(true, type)
  } catch (error) {
    if (requestVersion !== dialogFlowVersion.value || requestDatasetId !== datasetId.value) {
      return
    }
    syncDialogState(previousState)
    ElMessage.error(getErrorMessage(error, '行权限配置初始化失败'))
  }
}

const onChangeTarget = async (id: string | null) => {
  const previousState = captureDialogState()
  form.targetId = id
  form.whiteListIds = []
  missingTarget.value = false
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

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0
}

const noValueTerms = new Set(['null', 'not_null', 'empty', 'not_empty'])

const isExpressionItemShapeValid = (source: unknown): boolean => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return false
  }
  const item = source as {
    type?: unknown
    fieldId?: unknown
    term?: unknown
    value?: unknown
    timeValue?: unknown
    enumValue?: unknown
    subTree?: unknown
  }
  if (!isNonEmptyString(item.type)) {
    return false
  }
  if (item.type === 'tree' || item.subTree != null) {
    return isExpressionTreeShapeValid(item.subTree)
  }
  if (item.fieldId === undefined || item.fieldId === null || String(item.fieldId).trim() === '') {
    return false
  }
  if (!isNonEmptyString(item.term)) {
    return false
  }
  if (isNonEmptyString(item.term) && noValueTerms.has(item.term)) {
    return true
  }
  if (isNonEmptyString(item.value) || isNonEmptyString(item.timeValue)) {
    return true
  }
  if (Array.isArray(item.enumValue)) {
    return item.enumValue.some(isNonEmptyString)
  }
  return false
}

const isExpressionTreeShapeValid = (source: unknown): boolean => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return false
  }
  const tree = source as { logic?: unknown; items?: unknown }
  if (!Array.isArray(tree.items)) {
    return false
  }
  if (tree.logic !== undefined && typeof tree.logic !== 'string') {
    return false
  }
  return tree.items.every(isExpressionItemShapeValid)
}

const removeRowPermission = async (row: DatasetRowPermissionDTO) => {
  if (!row.id) {
    return
  }
  const objectName = String(row.authTargetName || '').trim()
  const confirmText = objectName
    ? `确认删除【${objectName}】的行权限规则？删除后不可恢复。`
    : '确认删除该行权限规则？删除后不可恢复。'
  if (!window.confirm(confirmText)) {
    return
  }
  deleting.value = true
  try {
    await deleteRowPermission({ id: row.id })
    allRowsReady.value = false
    await refreshRows()
    if (editRowId.value === row.id) {
      closeDialog()
    }
    ElMessage.success('删除成功')
  } catch (error) {
    ElMessage.error((error as Error)?.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

const removeEditingRule = () => {
  const target = allRows.value.find(item => item.id === editRowId.value) ?? rows.value.find(item => item.id === editRowId.value)
  if (target) {
    void removeRowPermission(target)
  }
}

const onSubmit = async () => {
  if (dialogType.value !== 'sysVar' && !form.targetId) {
    ElMessage.warning('请选择受限对象后再保存')
    return
  }
  const expressionText = String(form.expressionTree || '').trim()
  if (!expressionText) {
    ElMessage.warning('请先设置规则后再保存')
    return
  }
  let parsedTree: unknown = null
  try {
    parsedTree = JSON.parse(expressionText)
  } catch {
    ElMessage.error('规则表达式不是有效的 JSON，请检查后重试')
    return
  }
  if (!isExpressionTreeShapeValid(parsedTree)) {
    ElMessage.error('规则表达式结构无效，请检查 items 节点、tree 子树和操作符取值是否完整')
    return
  }
  const authTargetType = toAuthTargetType(dialogType.value)
  const authTargetId = dialogType.value === 'sysVar' ? '0' : form.targetId
  const targetName =
    dialogType.value === 'sysVar'
      ? '系统变量'
      : targetOptions.value.find(item => item.id === authTargetId)?.name || ''
  saving.value = true
  try {
    await saveRowPermission({
      id: editRowId.value,
      enable: form.enable,
      datasetId: datasetId.value,
      datasetName: datasetName.value,
      authTargetType,
      authTargetId,
      authTargetName: targetName,
      expressionTree: JSON.stringify(parsedTree),
      whiteListUser: JSON.stringify(form.whiteListIds),
      whiteListRole: '[]',
      whiteListDept: '[]'
    })
    allRowsReady.value = false
    await refreshRows()
    closeDialog()
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error((error as Error)?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const onApplyFilters = async () => {
  listQuery.page = 1
  await refreshRows()
}

const onFilterTypeChange = (value: string | number | null) => {
  listQuery.authTargetType = String(value || 'all') as RowPermissionFilterType
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

const onPageSizeChange = async (value: string | number | null) => {
  const nextSize = Number(value)
  if (!Number.isFinite(nextSize) || nextSize <= 0 || nextSize === listQuery.size) {
    return
  }
  listQuery.size = nextSize
  listQuery.page = 1
  allRowsReady.value = false
  await refreshRows()
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
      resetRowListState()
      datasetFields.value = []
      targetOptions.value = []
      whiteListOptions.value = []
      if (dialogVisible.value || route.query.dialog != null || route.query.targetType != null) {
        suppressDialogQueryOpen.value = true
        closeDialog()
        resetForm()
        targetOptions.value = []
        whiteListOptions.value = []
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
      resetForm()
      resetRowListState()
      targetOptions.value = []
      whiteListOptions.value = []
      if (dialogVisible.value) {
        suppressDialogQueryOpen.value = true
        closeDialog()
        Promise.resolve().then(() => {
          suppressDialogQueryOpen.value = false
        })
      }
    }
    void refreshRows()
    void loadDatasetFields()
  },
  { immediate: true }
)

watch(
  () => [activeTab.value, resolveDialogTypeFromQuery(), isLegacyDialogQuery()] as const,
  async ([tab, value, legacy]) => {
    if (tab !== 'row') {
      dialogVisible.value = false
      editRowId.value = null
      return
    }
    if (invalidContext.value) {
      if (dialogVisible.value || value != null) {
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
    if (!value) {
      dialogVisible.value = false
      editRowId.value = null
      return
    }
    if (dialogVisible.value && dialogType.value === value) {
      return
    }
    await openCreateDialog(value, legacy)
  },
  { immediate: true }
)
</script>

<template>
  <section class="permission-page">
    <div v-if="invalidContext" class="permission-page__invalid">
      <div class="empty-state">
        <div class="empty-state__icon"></div>
        <div class="empty-state__text">当前数据集暂不支持行权限配置</div>
      </div>
    </div>

    <div v-else class="content__inner">
      <section class="panel">
        <div class="panel-toolbar">
          <button type="button" class="add-btn" @click="openCreateDialog('role')">＋ 添加</button>
          <div class="list-controls">
            <SystemSelect
              v-model="listQuery.authTargetType"
              class="list-controls__select"
              :options="filterTypeOptions"
              @change="onFilterTypeChange"
            />
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
          <span>规则摘要</span>
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
            <span class="table-row__summary" :title="rowRuleSummary(row)">{{ rowRuleSummary(row) }}</span>
            <span>{{ whiteListSummary(row) }}</span>
            <span class="table-row__ops">
              <button type="button" class="link-btn" @click="openEditDialog(row)">编辑</button>
              <button type="button" class="link-btn danger" :disabled="deleting" @click="removeRowPermission(row)">
                删除
              </button>
            </span>
          </div>
        </template>

        <div v-if="totalRows > 0" class="pagination-bar">
          <div class="pagination-bar__summary">共 {{ totalRows }} 条</div>
          <div class="pagination-bar__controls">
            <SystemSelect v-model="selectedPageSize" class="pagination-bar__size" :options="pageSizeOptions" />
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

    <RowPermissionDialog
      :visible="dialogVisible"
      :type="dialogType"
      :saving="saving"
      :deleting="deleting"
      :is-edit="editRowId !== null"
      :target-options="targetOptions"
      :selected-target-id="form.targetId"
      :field-options="datasetFields"
      :whitelist-options="whiteListOptions"
      :selected-whitelist-ids="form.whiteListIds"
      :expression-tree="form.expressionTree"
      :missing-target="missingTarget"
      :enabled="form.enable"
      @close="closeDialog"
      @switch-type="onSwitchType"
      @change-target="onChangeTarget"
      @change-whitelist="form.whiteListIds = $event"
      @change-expression="form.expressionTree = $event"
      @change-enable="form.enable = $event"
      @refresh-whitelist="refreshWhitelistOptions"
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
  height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
}

.panel {
  border: 1px solid #dde7f5;
  border-radius: 14px;
  background: #ffffff;
  padding: 12px;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
}

.add-btn {
  border: 1px solid #d7deea;
  background: #ffffff;
  color: #344054;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 6px;
  border: 1px solid #e7edf7;
  border-radius: 12px;
  background: #f8fbff;
}

.list-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.list-controls__input,
.toolbar-btn,
.pager-btn {
  height: 40px;
  border: 1px solid #d7deea;
  border-radius: 10px;
  background: #ffffff;
  color: #344054;
  font-size: 15px;
}

.list-controls__select,
.pagination-bar__size {
  width: 144px;
}

.list-controls__input {
  width: 280px;
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
  min-height: 48px;
  padding: 0 12px;
  display: grid;
  grid-template-columns: 92px minmax(160px, 0.85fr) minmax(260px, 1.3fr) minmax(170px, 0.8fr) 128px;
  align-items: center;
  column-gap: 12px;
  color: #243047;
  font-size: 16px;
  line-height: 24px;
  min-width: 860px;
}

.table-head {
  flex: 0 0 auto;
}

.table-row {
  flex: 0 0 auto;
}

.table-head {
  margin-top: 10px;
  background: #f5f8fd;
  font-size: 16px;
  font-weight: 700;
  border-radius: 10px 10px 0 0;
}

.table-row {
  border-bottom: 1px solid #eef2f7;
  font-size: 16px;
}

.table-head span:last-child {
  text-align: center;
}

.table-head span,
.table-row > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-row:nth-child(odd) {
  background: #fcfdff;
}

.table-row__ops {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: nowrap;
  overflow: visible;
  white-space: nowrap;
  text-align: center;
}

.table-row__summary {
  color: #475467;
}

.link-btn {
  border: none;
  background: transparent;
  color: #2f6bff;
  padding: 0;
  cursor: pointer;
  font-size: 15.5px;
  line-height: 24px;
}

.link-btn.danger {
  color: #f04438;
}

.link-btn:disabled {
  cursor: not-allowed;
  color: #98a2b3;
}

.empty-state {
  flex: 0 0 auto;
  min-height: 0;
  padding: 54px 0 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  color: #98a2b3;
  text-align: center;
}

.empty-state__text {
  font-size: 15px;
  line-height: 20px;
}

.empty-state__desc {
  color: #b3bdca;
  font-size: 14px;
  line-height: 20px;
  max-width: 280px;
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
  margin-top: 8px;
  padding-top: 8px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  color: #667085;
  font-size: 15px;
}

.pagination-bar__controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-bar__page {
  min-width: 64px;
  text-align: center;
}

@media (max-width: 1480px) {
  .table-head,
  .table-row {
    min-width: 820px;
  }
}
</style>
