import { onMounted, reactive, ref } from 'vue'
import {
  createRole,
  mountRoleUsers,
  preflightUnmountRoleUser,
  queryRoleDetail,
  queryRoleMembers,
  queryRoles,
  queryRoleUserOptions,
  unmountRoleUser
} from '../api/userManagement'
import type { IdType, RoleQueryItem, UserOptionItem } from '../types'

export interface RoleTemplateOption {
  id: IdType
  name: string
  typeCode: number
}

export interface RoleCreateFormState {
  name: string
  templateRoleId: IdType | null
}

const DEFAULT_PAGE_SIZE = 10
const BEFORE_UNMOUNT_INFO_COPY: Record<number, string> = {
  0: '确认将用户「{user}」从当前角色中移除吗？',
  1: '移除用户「{user}」后，该用户将失去当前组织下的全部角色，并从当前组织中移除。是否继续？',
  2: '移除用户「{user}」后，该用户将失去系统内的全部角色，并从系统中移除。是否继续？'
}

const createDefaultCreateForm = (): RoleCreateFormState => ({
  name: '',
  templateRoleId: null
})

const isId = (value: unknown): value is IdType => typeof value === 'string' || typeof value === 'number'

const isSameId = (left: IdType | null | undefined, right: IdType | null | undefined): boolean => {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false
  }
  return String(left) === String(right)
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '请求失败，请稍后重试。'
}

const getUserLabel = (user: UserOptionItem): string => user.name || user.account || String(user.id)

const resolveBeforeUnmountInfo = (payload: unknown): 0 | 1 | 2 | null => {
  const value = Number(payload)
  if (value === 0 || value === 1 || value === 2) {
    return value
  }
  return null
}

const buildBeforeUnmountConfirmText = (impact: 0 | 1 | 2, user: UserOptionItem): string =>
  BEFORE_UNMOUNT_INFO_COPY[impact].replace('{user}', getUserLabel(user))

const getBuiltinRoleOrder = (role: Pick<RoleQueryItem, 'name'>): number => {
  const normalizedName = String(role.name || '').trim()
  if (normalizedName.includes('组织管理员')) {
    return 0
  }
  if (normalizedName.includes('分析')) {
    return 1
  }
  if (normalizedName.includes('系统管理员')) {
    return 2
  }
  return 99
}

const normalizeRoleItems = (payload: unknown): RoleQueryItem[] => {
  if (!Array.isArray(payload)) {
    return []
  }
  const normalized: RoleQueryItem[] = []
  payload.forEach(item => {
    const raw = item as Partial<RoleQueryItem>
    if (!isId(raw.id)) {
      return
    }
    normalized.push({
      id: raw.id,
      name: String(raw.name || ''),
      readonly: Boolean(raw.readonly),
      root: Boolean(raw.root)
    })
  })
  return normalized.sort((left, right) => {
    const leftBuiltin = left.readonly || left.root
    const rightBuiltin = right.readonly || right.root
    if (leftBuiltin !== rightBuiltin) {
      return leftBuiltin ? -1 : 1
    }
    if (leftBuiltin && rightBuiltin) {
      const leftRank = getBuiltinRoleOrder(left)
      const rightRank = getBuiltinRoleOrder(right)
      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }
    }
    return left.name.localeCompare(right.name, 'zh-CN')
  })
}

const normalizeUserItems = (payload: unknown): UserOptionItem[] => {
  if (!Array.isArray(payload)) {
    return []
  }
  const normalized: UserOptionItem[] = []
  payload.forEach(item => {
    const raw = item as Partial<UserOptionItem>
    if (!isId(raw.id)) {
      return
    }
    normalized.push({
      id: raw.id,
      account: String(raw.account || ''),
      name: String(raw.name || ''),
      email: raw.email ? String(raw.email) : undefined
    })
  })
  return normalized
}

const createRoleManagementPage = () => {
  const rolesLoading = ref(false)
  const roleList = ref<RoleQueryItem[]>([])
  const activeRoleId = ref<IdType | null>(null)

  const membersLoading = ref(false)
  const removingMemberId = ref<IdType | null>(null)
  const roleMembers = ref<UserOptionItem[]>([])
  const memberTotal = ref(0)
  const memberPage = ref(1)
  const memberPageSize = ref(DEFAULT_PAGE_SIZE)
  const memberKeyword = ref('')
  const roleMembersRequestSeq = ref(0)

  const assignDialogVisible = ref(false)
  const assignOptionsLoading = ref(false)
  const assignSubmitting = ref(false)
  const assignKeyword = ref('')
  const assignOptions = ref<UserOptionItem[]>([])
  const assignSelectedUsers = ref<UserOptionItem[]>([])
  const assignOptionsRequestSeq = ref(0)

  const createDialogVisible = ref(false)
  const createSubmitting = ref(false)
  const loadingRoleTemplates = ref(false)
  const createForm = reactive<RoleCreateFormState>(createDefaultCreateForm())
  const roleTemplateOptions = ref<RoleTemplateOption[]>([])

  const getActiveRole = (): RoleQueryItem | null =>
    roleList.value.find(item => isSameId(item.id, activeRoleId.value)) || null

  const loadRoleMembers = async () => {
    const rid = activeRoleId.value
    if (!isId(rid)) {
      roleMembersRequestSeq.value += 1
      roleMembers.value = []
      memberTotal.value = 0
      return
    }

    const requestSeq = roleMembersRequestSeq.value + 1
    roleMembersRequestSeq.value = requestSeq
    const requestRoleId = rid
    const requestPage = memberPage.value
    const requestPageSize = memberPageSize.value
    const requestKeyword = memberKeyword.value.trim() || undefined

    membersLoading.value = true
    try {
      const response = await queryRoleMembers(requestPage, requestPageSize, {
        rid: requestRoleId,
        keyword: requestKeyword
      })
      if (requestSeq !== roleMembersRequestSeq.value) {
        return
      }
      if (!isSameId(activeRoleId.value, requestRoleId)) {
        return
      }
      roleMembers.value = normalizeUserItems(response.data?.records)
      memberTotal.value = Number(response.data?.total || 0)
    } catch (error) {
      if (requestSeq !== roleMembersRequestSeq.value) {
        return
      }
      if (!isSameId(activeRoleId.value, requestRoleId)) {
        return
      }
      roleMembers.value = []
      memberTotal.value = 0
      window.alert(getErrorMessage(error))
    } finally {
      if (requestSeq === roleMembersRequestSeq.value) {
        membersLoading.value = false
      }
    }
  }

  const selectRole = async (role: RoleQueryItem | IdType) => {
    const rid = typeof role === 'object' ? role.id : role
    if (!isId(rid)) {
      return
    }
    if (isSameId(activeRoleId.value, rid)) {
      return
    }
    activeRoleId.value = rid
    memberPage.value = 1
    memberKeyword.value = ''
    await loadRoleMembers()
  }

  const loadRoles = async (preferredRoleId?: IdType | null) => {
    rolesLoading.value = true
    try {
      const response = await queryRoles('')
      const roles = normalizeRoleItems(response.data)
      roleList.value = roles

      if (!roles.length) {
        activeRoleId.value = null
        roleMembers.value = []
        memberTotal.value = 0
        return
      }

      const expectedRoleId = preferredRoleId ?? activeRoleId.value
      const matchedRole = roles.find(item => isSameId(item.id, expectedRoleId))
      const preferredBuiltinRole =
        roles.find(item => getBuiltinRoleOrder(item) === 0) ||
        roles.find(item => item.readonly || item.root) ||
        roles[0]
      const nextRole = matchedRole || preferredBuiltinRole
      if (!isSameId(activeRoleId.value, nextRole.id)) {
        activeRoleId.value = nextRole.id
      }
      memberPage.value = 1
      memberKeyword.value = ''
      await loadRoleMembers()
    } catch (error) {
      window.alert(getErrorMessage(error))
      roleList.value = []
      activeRoleId.value = null
      roleMembers.value = []
      memberTotal.value = 0
    } finally {
      rolesLoading.value = false
    }
  }

  const searchRoleMembers = async (keyword: string) => {
    memberKeyword.value = keyword.trim()
    memberPage.value = 1
    await loadRoleMembers()
  }

  const setMemberPage = async (nextPage: number) => {
    memberPage.value = Math.max(1, nextPage)
    await loadRoleMembers()
  }

  const setMemberPageSize = async (nextSize: number) => {
    const parsed = Number(nextSize)
    memberPageSize.value = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_PAGE_SIZE
    memberPage.value = 1
    await loadRoleMembers()
  }

  const openAssignDialog = async () => {
    if (!isId(activeRoleId.value)) {
      window.alert('请先选择角色。')
      return
    }
    assignDialogVisible.value = true
    assignKeyword.value = ''
    assignSelectedUsers.value = []
    await loadAssignOptions('')
  }

  const closeAssignDialog = () => {
    if (assignSubmitting.value) {
      return
    }
    assignDialogVisible.value = false
  }

  const loadAssignOptions = async (keyword?: string) => {
    const rid = activeRoleId.value
    if (!isId(rid)) {
      assignOptionsRequestSeq.value += 1
      assignOptions.value = []
      return
    }

    const nextKeyword = (keyword ?? assignKeyword.value).trim()
    assignKeyword.value = nextKeyword

    const requestSeq = assignOptionsRequestSeq.value + 1
    assignOptionsRequestSeq.value = requestSeq
    const requestRoleId = rid
    const requestKeyword = nextKeyword

    assignOptionsLoading.value = true
    try {
      const response = await queryRoleUserOptions({
        rid: requestRoleId,
        keyword: requestKeyword || undefined
      })
      if (requestSeq !== assignOptionsRequestSeq.value) {
        return
      }
      if (!isSameId(activeRoleId.value, requestRoleId)) {
        return
      }
      if (assignKeyword.value.trim() !== requestKeyword) {
        return
      }
      const selectedMemberIds = new Set(roleMembers.value.map(item => String(item.id)))
      assignOptions.value = normalizeUserItems(response.data).filter(
        item => !selectedMemberIds.has(String(item.id))
      )
    } catch (error) {
      if (requestSeq !== assignOptionsRequestSeq.value) {
        return
      }
      if (!isSameId(activeRoleId.value, requestRoleId)) {
        return
      }
      if (assignKeyword.value.trim() !== requestKeyword) {
        return
      }
      assignOptions.value = []
      window.alert(getErrorMessage(error))
    } finally {
      if (requestSeq === assignOptionsRequestSeq.value) {
        assignOptionsLoading.value = false
      }
    }
  }

  const searchAssignOptions = async (keyword: string) => {
    await loadAssignOptions(keyword)
  }

  const addAssignUser = (user: UserOptionItem) => {
    if (assignSelectedUsers.value.some(item => isSameId(item.id, user.id))) {
      return
    }
    assignSelectedUsers.value = [...assignSelectedUsers.value, user]
  }

  const removeAssignUser = (user: UserOptionItem) => {
    assignSelectedUsers.value = assignSelectedUsers.value.filter(item => !isSameId(item.id, user.id))
  }

  const clearAssignSelected = () => {
    assignSelectedUsers.value = []
  }

  const submitAssignUsers = async () => {
    const rid = activeRoleId.value
    if (!isId(rid)) {
      window.alert('请先选择角色。')
      return false
    }
    const uids = assignSelectedUsers.value.map(item => item.id)
    if (!uids.length) {
      window.alert('请先选择要添加的组织用户。')
      return false
    }

    assignSubmitting.value = true
    try {
      await mountRoleUsers({
        rid,
        uids
      })
      assignDialogVisible.value = false
      assignSelectedUsers.value = []
      await loadRoleMembers()
      return true
    } catch (error) {
      window.alert(getErrorMessage(error))
      return false
    } finally {
      assignSubmitting.value = false
    }
  }

  const resetCreateForm = () => {
    createForm.name = ''
    createForm.templateRoleId = null
  }

  const loadRoleTemplateOptions = async () => {
    loadingRoleTemplates.value = true
    try {
      const builtinCandidates = roleList.value.filter(role => role.readonly || role.root)
      const candidates = builtinCandidates.length ? builtinCandidates : roleList.value
      const details = await Promise.all(
        candidates.map(async role => {
          try {
            const response = await queryRoleDetail(role.id)
            const typeCode = Number(response.data?.typeCode)
            if (!Number.isFinite(typeCode)) {
              return null
            }
            return {
              id: role.id,
              name: role.name || `角色 ${role.id}`,
              typeCode
            } as RoleTemplateOption
          } catch {
            return null
          }
        })
      )

      const usedTypeCodes = new Set<number>()
      roleTemplateOptions.value = details.filter((item): item is RoleTemplateOption => {
        if (!item) {
          return false
        }
        if (usedTypeCodes.has(item.typeCode)) {
          return false
        }
        usedTypeCodes.add(item.typeCode)
        return true
      })

      if (
        createForm.templateRoleId === null &&
        roleTemplateOptions.value.length > 0 &&
        isId(roleTemplateOptions.value[0].id)
      ) {
        createForm.templateRoleId = roleTemplateOptions.value[0].id
      }
    } catch (error) {
      roleTemplateOptions.value = []
      window.alert(getErrorMessage(error))
    } finally {
      loadingRoleTemplates.value = false
    }
  }

  const openCreateDialog = async () => {
    resetCreateForm()
    createDialogVisible.value = true
    if (!roleList.value.length) {
      await loadRoles()
    }
    await loadRoleTemplateOptions()
  }

  const closeCreateDialog = () => {
    if (createSubmitting.value) {
      return
    }
    createDialogVisible.value = false
  }

  const submitCreateRole = async (payload?: RoleCreateFormState) => {
    if (payload) {
      createForm.name = payload.name
      createForm.templateRoleId = payload.templateRoleId
    }

    const name = createForm.name.trim()
    if (!name) {
      window.alert('角色名称不能为空。')
      return false
    }

    const template = roleTemplateOptions.value.find(item =>
      isSameId(item.id, createForm.templateRoleId)
    )
    if (!template) {
      window.alert('请选择角色模板。')
      return false
    }

    createSubmitting.value = true
    try {
      const response = await createRole({
        name,
        typeCode: template.typeCode
      })
      const createdRoleId = response.data
      createDialogVisible.value = false
      resetCreateForm()
      await loadRoles(isId(createdRoleId) ? createdRoleId : undefined)
      return true
    } catch (error) {
      window.alert(getErrorMessage(error))
      return false
    } finally {
      createSubmitting.value = false
    }
  }

  const isRemovingMember = (uid: IdType | null | undefined): boolean =>
    isSameId(removingMemberId.value, uid)

  const removeRoleMember = async (user: UserOptionItem) => {
    const rid = activeRoleId.value
    if (!isId(rid)) {
      window.alert('请先选择角色。')
      return false
    }
    if (!isId(user.id)) {
      window.alert('当前成员缺少用户标识，无法移除。')
      return false
    }
    if (removingMemberId.value !== null) {
      return false
    }

    removingMemberId.value = user.id
    try {
      const response = await preflightUnmountRoleUser({
        rid,
        uid: user.id
      })
      const impact = resolveBeforeUnmountInfo(response.data ?? response)
      if (impact === null) {
        window.alert('移除校验结果无效，请稍后重试。')
        return false
      }
      const confirmed = window.confirm(buildBeforeUnmountConfirmText(impact, user))
      if (!confirmed) {
        return false
      }

      await unmountRoleUser({
        rid,
        uid: user.id
      })

      const remainingCount = roleMembers.value.length - 1
      if (remainingCount <= 0 && memberPage.value > 1) {
        memberPage.value -= 1
      }
      await loadRoleMembers()
      return true
    } catch (error) {
      window.alert(getErrorMessage(error))
      return false
    } finally {
      removingMemberId.value = null
    }
  }

  onMounted(() => {
    void loadRoles()
  })

  return {
    rolesLoading,
    roleList,
    activeRoleId,
    membersLoading,
    removingMemberId,
    roleMembers,
    memberTotal,
    memberPage,
    memberPageSize,
    memberKeyword,
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
    roleTemplateOptions,
    isRemovingMember,
    getActiveRole,
    loadRoles,
    selectRole,
    loadRoleMembers,
    searchRoleMembers,
    setMemberPage,
    setMemberPageSize,
    openAssignDialog,
    closeAssignDialog,
    searchAssignOptions,
    addAssignUser,
    removeAssignUser,
    clearAssignSelected,
    submitAssignUsers,
    openCreateDialog,
    closeCreateDialog,
    submitCreateRole,
    removeRoleMember
  }
}

export const useRoleManagementPage = () => createRoleManagementPage()
