import { computed, reactive, toRefs } from 'vue'
import {
  fetchPermissionSubjects,
  fetchMenuTree,
  fetchResourceTree,
  fetchSubjectPermission,
  fetchTargetPermission,
  saveSubjectPermission,
  saveTargetPermission
} from './api'
import {
  clonePermissionColumns,
  createEmptyPermissionColumns,
  encodePermissionColumns
} from './types'
import type {
  PermissionColumnKey,
  PermissionOriginRow,
  PermissionPanelState,
  PermissionPanelTab,
  PermissionResourceFlag,
  PermissionResourceTreeNode,
  PermissionSubjectOption,
  PermissionSubjectType,
  PermissionTreeRow,
  PermissionViewMode
} from './types'

type PermissionShellTab = 'menu' | 'resource'

interface PermissionShellState {
  mode: PermissionViewMode
  tab: PermissionShellTab
  subjectType: PermissionSubjectType
  subjects: PermissionSubjectOption[]
  selectedSubjectId: number | null
  resourceFlags: PermissionResourceFlag[]
  selectedFlag: PermissionResourceFlag
  selectedResourceId: number | null
  menuPanel: PermissionPanelState
  resourcePanel: PermissionPanelState
  dirty: boolean
  saving: boolean
  lastSavedAt: number | null
}

const SUBJECT_TYPE_VALUE: Record<PermissionSubjectType, number> = {
  user: 1,
  role: 2
}

const modeTabs: Record<PermissionViewMode, PermissionShellTab[]> = {
  'by-user': ['menu', 'resource'],
  'by-resource': ['menu', 'resource']
}

const RESOURCE_FLAGS: PermissionResourceFlag[] = ['panel', 'screen', 'dataset', 'datasource']

const createPanelState = (): PermissionPanelState => ({
  loading: false,
  tree: [],
  rows: [],
  originRows: []
})

const state = reactive<PermissionShellState>({
  mode: 'by-user',
  tab: 'resource',
  subjectType: 'user',
  subjects: [],
  selectedSubjectId: null,
  resourceFlags: RESOURCE_FLAGS,
  selectedFlag: 'panel',
  selectedResourceId: null,
  menuPanel: createPanelState(),
  resourcePanel: createPanelState(),
  dirty: false,
  saving: false,
  lastSavedAt: null
})

const normalizeMode = (mode?: string): PermissionViewMode => {
  return mode === 'by-resource' ? 'by-resource' : 'by-user'
}

const normalizeTab = (tab: unknown, mode: PermissionViewMode): PermissionShellTab => {
  const allowed = modeTabs[mode]
  const defaultTab: PermissionShellTab = 'menu'
  if (typeof tab !== 'string') {
    return defaultTab
  }
  return (allowed.includes(tab as PermissionShellTab) ? tab : defaultTab) as PermissionShellTab
}

const groupRowPermissionsByExt = (rows: PermissionOriginRow[]) => {
  return rows.reduce<Map<number, number[]>>((groups, row) => {
    const ext = encodePermissionColumns(row.permissions)
    const ids = groups.get(ext) || []
    ids.push(row.id)
    groups.set(ext, ids)
    return groups
  }, new Map())
}

const cloneTreeRows = (nodes: PermissionResourceTreeNode[], level = 0): PermissionTreeRow[] => {
  return nodes.flatMap(node => {
    return [
      {
        id: node.id,
        name: node.name,
        level,
        leaf: node.leaf,
        permissions: createEmptyPermissionColumns()
      },
      ...cloneTreeRows(node.children || [], level + 1)
    ]
  })
}

const resolvePanelState = (panel: PermissionPanelTab): PermissionPanelState => {
  return panel === 'menu' ? state.menuPanel : state.resourcePanel
}

const findFirstNodeId = (tree: PermissionResourceTreeNode[]): number | null => {
  for (const node of tree) {
    if (node?.id != null) {
      return node.id
    }
    const childId = findFirstNodeId(node.children || [])
    if (childId != null) {
      return childId
    }
  }
  return null
}

const containsNodeId = (tree: PermissionResourceTreeNode[], id: number | null): boolean => {
  if (id == null) {
    return false
  }
  for (const node of tree) {
    if (node.id === id) {
      return true
    }
    if (containsNodeId(node.children || [], id)) {
      return true
    }
  }
  return false
}

const applySubjectPermissionRows = async (panel: PermissionPanelTab) => {
  const panelState = resolvePanelState(panel)
  if (!state.selectedSubjectId) {
    panelState.rows = cloneTreeRows(panelState.tree)
    return
  }
  const permission = await fetchSubjectPermission(panel, {
    id: state.selectedSubjectId,
    type: SUBJECT_TYPE_VALUE[state.subjectType],
    flag: panel === 'resource' ? state.selectedFlag : undefined
  })
  const permissionById = new Map(permission.permissions.map(item => [item.id, item.permissions]))
  panelState.rows = cloneTreeRows(panelState.tree).map(row => ({
    ...row,
    permissions: clonePermissionColumns(permissionById.get(row.id))
  }))
}

const applyTargetPermissionRows = async (panel: PermissionPanelTab) => {
  const panelState = resolvePanelState(panel)
  if (!state.selectedResourceId) {
    panelState.originRows = []
    return
  }
  const permission = await fetchTargetPermission(panel, {
    id: state.selectedResourceId,
    type: SUBJECT_TYPE_VALUE[state.subjectType],
    flag: panel === 'resource' ? state.selectedFlag : undefined
  })
  const byId = new Map(
    permission.permissionOrigins.map(origin => {
      const scoped = origin.permissions.find(item => item.id === state.selectedResourceId)
      return [origin.id, clonePermissionColumns(scoped?.permissions)]
    })
  )
  panelState.originRows = state.subjects
    .filter(subject => subject.type === state.subjectType)
    .map<PermissionOriginRow>(subject => ({
      id: subject.id,
      name: subject.name,
      permissions: clonePermissionColumns(byId.get(subject.id))
    }))
}

const loadPanelTree = async (panel: PermissionPanelTab) => {
  const panelState = resolvePanelState(panel)
  panelState.loading = true
  try {
    panelState.tree =
      panel === 'menu' ? await fetchMenuTree() : await fetchResourceTree(state.selectedFlag)
    const firstId = findFirstNodeId(panelState.tree)
    if (panel === (state.tab === 'resource' ? 'resource' : 'menu') && state.selectedResourceId == null) {
      state.selectedResourceId = firstId
    }
  } finally {
    panelState.loading = false
  }
}

const ensureSubjectSelection = () => {
  const candidates = state.subjects.filter(subject => subject.type === state.subjectType)
  if (!candidates.length) {
    state.selectedSubjectId = null
    return
  }
  if (!candidates.some(subject => subject.id === state.selectedSubjectId)) {
    state.selectedSubjectId = candidates[0].id
  }
}

let refreshSubjectsPromise: Promise<void> | null = null

const refreshSubjects = async (force = false) => {
  if (!force && state.subjects.length) {
    ensureSubjectSelection()
    return
  }
  if (!refreshSubjectsPromise) {
    refreshSubjectsPromise = fetchPermissionSubjects()
      .then(subjects => {
        state.subjects = subjects
        ensureSubjectSelection()
      })
      .finally(() => {
        refreshSubjectsPromise = null
      })
  }
  await refreshSubjectsPromise
}

const refreshActivePanel = async (forceTreeReload = false) => {
  if (state.tab !== 'menu' && state.tab !== 'resource') {
    return
  }
  const panel = state.tab
  const panelState = resolvePanelState(panel)
  if (forceTreeReload || !panelState.tree.length) {
    await loadPanelTree(panel)
  }
  if (!containsNodeId(panelState.tree, state.selectedResourceId)) {
    state.selectedResourceId = findFirstNodeId(panelState.tree)
  }
  if (state.mode === 'by-user') {
    await applySubjectPermissionRows(panel)
    return
  }
  await applyTargetPermissionRows(panel)
}

const setModeInternal = (mode: PermissionViewMode) => {
  state.mode = normalizeMode(mode)
  state.tab = normalizeTab(state.tab, state.mode)
}

export const usePermissionShellStore = () => {
  const filteredSubjects = computed(() => {
    return state.subjects.filter(subject => subject.type === state.subjectType)
  })

  const currentPanelState = computed(() => {
    if (state.tab === 'menu') {
      return state.menuPanel
    }
    if (state.tab === 'resource') {
      return state.resourcePanel
    }
    return null
  })

  const setView = async (mode?: string, tab?: string) => {
    const nextMode = normalizeMode(mode)
    const nextTab = normalizeTab(tab, nextMode)
    const viewChanged = state.mode !== nextMode || state.tab !== nextTab
    setModeInternal(nextMode)
    state.tab = nextTab
    await refreshSubjects()
    await refreshActivePanel(viewChanged)
  }

  const setSubjectType = async (type: PermissionSubjectType) => {
    state.subjectType = type
    await refreshSubjects()
    ensureSubjectSelection()
    state.dirty = false
    await refreshActivePanel()
  }

  const setSelectedSubjectId = async (subjectId: number) => {
    state.selectedSubjectId = subjectId
    state.dirty = false
    await refreshActivePanel()
  }

  const setSelectedFlag = async (flag: PermissionResourceFlag) => {
    state.selectedFlag = flag
    state.selectedResourceId = null
    state.resourcePanel.tree = []
    state.resourcePanel.rows = []
    state.resourcePanel.originRows = []
    state.dirty = false
    if (state.tab === 'resource') {
      await refreshActivePanel()
    }
  }

  const setSelectedResourceId = async (resourceId: number) => {
    state.selectedResourceId = resourceId
    state.dirty = false
    if (state.mode === 'by-resource' && (state.tab === 'menu' || state.tab === 'resource')) {
      await refreshActivePanel()
    }
  }

  const toggleTreePermission = (
    panel: PermissionPanelTab,
    resourceId: number,
    permissionKey: PermissionColumnKey
  ) => {
    const panelState = resolvePanelState(panel)
    panelState.rows = panelState.rows.map(row =>
      row.id === resourceId
        ? {
            ...row,
            permissions: {
              ...row.permissions,
              [permissionKey]: !row.permissions[permissionKey]
            }
          }
        : row
    )
    state.dirty = true
  }

  const toggleOriginPermission = (
    panel: PermissionPanelTab,
    subjectId: number,
    permissionKey: PermissionColumnKey
  ) => {
    const panelState = resolvePanelState(panel)
    panelState.originRows = panelState.originRows.map(row =>
      row.id === subjectId
        ? {
            ...row,
            permissions: {
              ...row.permissions,
              [permissionKey]: !row.permissions[permissionKey]
            }
          }
        : row
    )
    state.dirty = true
  }

  const saveCurrentPanel = async () => {
    if (state.tab !== 'menu' && state.tab !== 'resource') {
      return
    }
    const panel = state.tab
    const panelState = resolvePanelState(panel)
    if (state.mode === 'by-resource' && !state.selectedResourceId) {
      return
    }
    state.saving = true
    try {
      if (state.mode === 'by-user' && state.selectedSubjectId) {
        await saveSubjectPermission(panel, {
          id: state.selectedSubjectId,
          type: SUBJECT_TYPE_VALUE[state.subjectType],
          flag: panel === 'resource' ? state.selectedFlag : undefined,
          permissions: panelState.rows.map(row => ({
            id: row.id,
            ext: encodePermissionColumns(row.permissions),
            permissions: clonePermissionColumns(row.permissions)
          }))
        })
      } else if (state.mode === 'by-resource') {
        for (const [ext, ids] of groupRowPermissionsByExt(panelState.originRows)) {
          if (!ids.length || state.selectedResourceId == null) {
            continue
          }
          await saveTargetPermission(panel, {
            ids,
            type: SUBJECT_TYPE_VALUE[state.subjectType],
            flag: panel === 'resource' ? state.selectedFlag : undefined,
            permissions: [
              {
                id: state.selectedResourceId,
                ext,
                permissions: clonePermissionColumns(panelState.originRows.find(row => row.id === ids[0])?.permissions)
              }
            ]
          })
        }
      }
      state.dirty = false
      state.lastSavedAt = Date.now()
      await refreshActivePanel()
    } finally {
      state.saving = false
    }
  }

  return {
    ...toRefs(state),
    filteredSubjects,
    currentPanelState,
    setView,
    setSubjectType,
    setSelectedSubjectId,
    setSelectedFlag,
    setSelectedResourceId,
    toggleTreePermission,
    toggleOriginPermission,
    saveCurrentPanel
  }
}
