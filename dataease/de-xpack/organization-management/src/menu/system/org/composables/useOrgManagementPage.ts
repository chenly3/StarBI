import { computed, reactive, ref } from 'vue'
import {
  checkDeleteOrg,
  createOrg,
  deleteOrg,
  editOrg,
  queryMountedOrgs,
  queryOrgTree
} from '../api/organizationManagement'
import type {
  DeleteCheckState,
  IdType,
  MountedOrgItem,
  OrgFormState,
  OrgTableRow,
  OrgTreeNode,
  ParentOption
} from '../types'

const NAME_PATTERN = /^[\u4e00-\u9fa5A-Za-z0-9]{1,20}$/

const createEmptyForm = (): OrgFormState => ({
  name: '',
  pid: ''
})

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data &&
    'msg' in error.response.data &&
    typeof error.response.data.msg === 'string'
  ) {
    return error.response.data.msg
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '请求失败，请稍后重试。'
}

const normalizeNodes = (nodes: OrgTreeNode[] | undefined): OrgTreeNode[] =>
  Array.isArray(nodes)
    ? nodes.map(item => ({
        ...item,
        children: normalizeNodes(item.children)
      }))
    : []

const flattenMountedOptions = (
  nodes: MountedOrgItem[] | undefined,
  trail: string[] = []
): ParentOption[] => {
  if (!Array.isArray(nodes) || !nodes.length) {
    return []
  }
  return nodes.flatMap(node => {
    const nextTrail = [...trail, node.name]
    return [
      {
        value: node.id,
        label: nextTrail.join(' / ')
      },
      ...flattenMountedOptions(node.children, nextTrail)
    ]
  })
}

const collectExpandableIds = (nodes: OrgTreeNode[]): string[] =>
  nodes.flatMap(node => {
    const children = node.children || []
    const currentId = children.length ? [String(node.id)] : []
    return [...currentId, ...collectExpandableIds(children)]
  })

const flattenVisibleRows = (
  nodes: OrgTreeNode[],
  expandedIds: Set<string>,
  depth = 0,
  ancestorHasNextSibling: boolean[] = []
): OrgTableRow[] =>
  nodes.flatMap((node, index) => {
    const children = normalizeNodes(node.children)
    const hasChildren = children.length > 0
    const id = String(node.id)
    const expanded = hasChildren && expandedIds.has(id)
    const isLastSibling = index === nodes.length - 1
    const row: OrgTableRow = {
      id: node.id,
      name: node.name,
      createTime: node.createTime,
      childCount: children.length,
      depth,
      ancestorHasNextSibling,
      isLastSibling,
      hasChildren,
      expanded,
      readOnly: node.readOnly,
      children
    }
    return expanded
      ? [
          row,
          ...flattenVisibleRows(children, expandedIds, depth + 1, [
            ...ancestorHasNextSibling,
            !isLastSibling
          ])
        ]
      : [row]
  })

const formatDeleteBlocker = (check: DeleteCheckState): string => {
  const blockers = new Set(check.blockers || [])
  if (blockers.has('children')) {
    return '当前组织下仍有子组织，请先删除子组织后再删除当前组织。'
  }
  if (blockers.has('users')) {
    return '当前组织下仍有关联用户，暂不支持删除。'
  }
  if (blockers.has('resources')) {
    return '当前组织下仍有关联资源，暂不支持删除。'
  }
  return check.message || '当前组织暂不支持删除。'
}

export const useOrgManagementPage = () => {
  const loading = ref(false)
  const submitting = ref(false)
  const deleting = ref(false)
  const treeNodes = ref<OrgTreeNode[]>([])
  const keyword = ref('')
  const searchEmpty = ref(false)
  const expandedIds = ref<string[]>([])

  const addDialogVisible = ref(false)
  const addParentLocked = ref(false)
  const editDialogVisible = ref(false)
  const deleteDialogVisible = ref(false)
  const activeDeleteRow = ref<OrgTableRow | null>(null)
  const deleteBlockerVisible = ref(false)
  const deleteBlockerMessage = ref('')

  const form = reactive<OrgFormState>(createEmptyForm())
  const parentOptions = ref<ParentOption[]>([])

  const tableRows = computed(() =>
    flattenVisibleRows(treeNodes.value, new Set(expandedIds.value))
  )

  const emptyMessage = computed(() => {
    if (searchEmpty.value) {
      return '未搜索到匹配的组织。'
    }
    return '暂无组织数据。'
  })

  const loadParentOptions = async () => {
    try {
      const res = await queryMountedOrgs()
      parentOptions.value = flattenMountedOptions(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      parentOptions.value = []
      window.alert(getErrorMessage(error))
    }
  }

  const loadTree = async (options?: { keepKeyword?: boolean }) => {
    const currentKeyword = options?.keepKeyword === false ? '' : keyword.value
    loading.value = true
    try {
      const res = await queryOrgTree(currentKeyword)
      treeNodes.value = normalizeNodes(Array.isArray(res.data) ? res.data : [])
      expandedIds.value = collectExpandableIds(treeNodes.value)
      searchEmpty.value = treeNodes.value.length === 0 && currentKeyword.trim().length > 0
    } catch (error) {
      window.alert(getErrorMessage(error))
    } finally {
      loading.value = false
    }
  }

  const search = async () => {
    await loadTree()
  }

  const clearSearch = async () => {
    keyword.value = ''
    searchEmpty.value = false
    await loadTree({ keepKeyword: false })
  }

  const toggleExpanded = (nodeId: IdType) => {
    const currentId = String(nodeId)
    if (expandedIds.value.includes(currentId)) {
      expandedIds.value = expandedIds.value.filter(item => item !== currentId)
      return
    }
    expandedIds.value = [...expandedIds.value, currentId]
  }

  const validateForm = (payload: OrgFormState, requireParent: boolean) => {
    const name = payload.name.trim()
    if (!name) {
      window.alert('组织名称不能为空。')
      return false
    }
    if (!NAME_PATTERN.test(name)) {
      window.alert('组织名称仅支持中文、英文、数字，且长度为 1-20。')
      return false
    }
    if (requireParent && (payload.pid === '' || payload.pid === null || payload.pid === undefined)) {
      window.alert('请先选择上级组织。')
      return false
    }
    return true
  }

  const resetForm = () => {
    Object.assign(form, createEmptyForm())
  }

  const openAddDialog = async () => {
    resetForm()
    addParentLocked.value = false
    addDialogVisible.value = true
    if (!parentOptions.value.length) {
      await loadParentOptions()
    }
  }

  const closeAddDialog = () => {
    if (submitting.value) {
      return
    }
    addDialogVisible.value = false
  }

  const submitCreate = async (payload?: OrgFormState) => {
    if (payload) {
      Object.assign(form, payload)
    }
    const nextPayload: OrgFormState = {
      name: form.name.trim(),
      pid: form.pid
    }
    if (!validateForm(nextPayload, addParentLocked.value)) {
      return false
    }
    submitting.value = true
    try {
      await createOrg(nextPayload)
      addDialogVisible.value = false
      await loadParentOptions()
      await loadTree()
      return true
    } catch (error) {
      window.alert(getErrorMessage(error))
      return false
    } finally {
      submitting.value = false
    }
  }

  const openEditDialog = (row: OrgTableRow) => {
    resetForm()
    form.id = row.id
    form.name = row.name
    editDialogVisible.value = true
  }

  const closeEditDialog = () => {
    if (submitting.value) {
      return
    }
    editDialogVisible.value = false
  }

  const submitEdit = async (payload?: OrgFormState) => {
    if (payload) {
      Object.assign(form, payload)
    }
    if (!form.id) {
      window.alert('缺少组织标识，无法保存。')
      return false
    }
    const nextPayload = {
      id: form.id,
      name: form.name.trim()
    }
    if (!validateForm(nextPayload, false)) {
      return false
    }
    submitting.value = true
    try {
      await editOrg(nextPayload)
      editDialogVisible.value = false
      await loadParentOptions()
      await loadTree()
      return true
    } catch (error) {
      window.alert(getErrorMessage(error))
      return false
    } finally {
      submitting.value = false
    }
  }

  const requestDelete = async (row: OrgTableRow) => {
    try {
      const res = await checkDeleteOrg(row.id)
      if (!res.data?.deletable) {
        deleteBlockerMessage.value = formatDeleteBlocker(res.data)
        deleteBlockerVisible.value = true
        return
      }
      activeDeleteRow.value = row
      deleteDialogVisible.value = true
    } catch (error) {
      window.alert(getErrorMessage(error))
    }
  }

  const closeDeleteBlocker = () => {
    deleteBlockerVisible.value = false
    deleteBlockerMessage.value = ''
  }

  const closeDeleteDialog = (force = false) => {
    if (deleting.value && !force) {
      return
    }
    deleteDialogVisible.value = false
    activeDeleteRow.value = null
  }

  const confirmDelete = async () => {
    if (!activeDeleteRow.value) {
      return false
    }
    deleting.value = true
    try {
      await deleteOrg(activeDeleteRow.value.id)
      closeDeleteDialog(true)
      await loadParentOptions()
      await loadTree()
      return true
    } catch (error) {
      window.alert(getErrorMessage(error))
      return false
    } finally {
      deleting.value = false
    }
  }

  void loadParentOptions()
  void loadTree({ keepKeyword: false })

  return {
    loading,
    submitting,
    deleting,
    treeNodes,
    tableRows,
    expandedIds,
    keyword,
    searchEmpty,
    emptyMessage,
    addDialogVisible,
    addParentLocked,
    editDialogVisible,
    deleteDialogVisible,
    activeDeleteRow,
    deleteBlockerVisible,
    deleteBlockerMessage,
    form,
    parentOptions,
    loadTree,
    search,
    clearSearch,
    toggleExpanded,
    openAddDialog,
    closeAddDialog,
    submitCreate,
    openEditDialog,
    closeEditDialog,
    submitEdit,
    requestDelete,
    closeDeleteDialog,
    closeDeleteBlocker,
    confirmDelete
  }
}
