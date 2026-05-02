<script lang="ts" setup>
import icon_add_outlined from '@/assets/svg/icon_add_outlined.svg'
import icon_dataset_outlined from '@/assets/svg/icon_dataset_outlined.svg'
import icon_deleteTrash_outlined from '@/assets/svg/icon_delete-trash_outlined.svg'
import icon_info_outlined from '@/assets/svg/icon_info_outlined.svg'
import icon_moreVertical_outlined from '@/assets/svg/icon_more-vertical_outlined.svg'
import icon_searchOutline_outlined from '@/assets/svg/icon_search-outline_outlined.svg'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import {
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElMessage,
  ElMessageBox
} from 'element-plus-secondary'
import type { FormInstance, FormRules } from 'element-plus-secondary'
import { useI18n } from '@/hooks/web/useI18n'
import { getDatasetPreview, getDatasetTree } from '@/api/dataset'
import {
  createAIQueryTheme,
  deleteAIQueryTheme,
  listAIQueryThemes,
  type AIQueryTheme,
  type AIQueryThemeSaveRequest,
  updateAIQueryTheme
} from '@/api/aiQueryTheme'

interface DatasetTreeNode {
  id: string
  name: string
  leaf?: boolean
  children?: DatasetTreeNode[]
}

interface DatasetOption {
  id: string
  name: string
}

type DatasetRowActionKey = 'assign-themes'

interface DatasetRowAction {
  key: DatasetRowActionKey
  label: string
  disabled?: boolean
}

interface PreviewField {
  dataeaseName?: string
  name?: string
  originName?: string
  fieldType?: string
  type?: string
  deType?: number
  deExtractType?: number
}

type ManageMode = 'resources' | 'themes'

const { t } = useI18n()
const props = withDefaults(
  defineProps<{
    modeLocked?: ManageMode | ''
    showModeTabs?: boolean
  }>(),
  {
    modeLocked: '',
    showModeTabs: true
  }
)
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const themeList = ref<AIQueryTheme[]>([])
const datasetTree = ref<DatasetTreeNode[]>([])
const manageMode = ref<ManageMode>(props.modeLocked || 'themes')
const selectedThemeId = ref('')
const themeKeyword = ref('')
const themeResourceKeyword = ref('')
const resourceKeyword = ref('')

const themeDialogVisible = ref(false)
const resourceDialogVisible = ref(false)
const resourceThemeDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const editingId = ref('')
const editingResourceId = ref('')
const editingResourceTitle = ref('')

const previewLoading = ref(false)
const previewFields = ref<PreviewField[]>([])
const previewRows = ref<Array<Record<string, unknown> | unknown[]>>([])
const previewDatasetTitle = ref('')

const resourceSelection = ref<string[]>([])
const resourceThemeSelection = ref<string[]>([])
const activeThemeMenuId = ref('')
const activeResourceMenuId = ref('')

const form = reactive({
  name: '',
  description: ''
})

const rules = reactive<FormRules>({
  name: [
    {
      required: true,
      message: '请输入分析主题名称',
      trigger: 'blur'
    }
  ],
  description: [
    {
      required: true,
      message: '请输入分析主题描述',
      trigger: 'blur'
    }
  ]
})

const normalizeTree = (nodes: any[] = []): DatasetTreeNode[] => {
  return nodes.map(node => ({
    ...node,
    id: String(node.id),
    name: String(node.name || ''),
    leaf: Boolean(node.leaf),
    children: Array.isArray(node.children) ? normalizeTree(node.children) : []
  }))
}

const flattenDatasetTree = (nodes: DatasetTreeNode[] = []) => {
  const options: DatasetOption[] = []

  const walk = (items: DatasetTreeNode[]) => {
    items.forEach(item => {
      if (item.leaf) {
        options.push({
          id: item.id,
          name: item.name
        })
      }
      if (item.children?.length) {
        walk(item.children)
      }
    })
  }

  walk(nodes)
  return options
}

const datasetOptions = computed(() => flattenDatasetTree(datasetTree.value))

const filteredThemeList = computed(() => {
  const keyword = themeKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return themeList.value
  }

  return themeList.value.filter(item => {
    return [item.name, item.description]
      .map(value => String(value || '').toLowerCase())
      .some(value => value.includes(keyword))
  })
})

const selectedTheme = computed(() => {
  return themeList.value.find(item => item.id === selectedThemeId.value) || null
})

const filteredResourceOptions = computed(() => {
  const keyword = resourceKeyword.value.trim().toLowerCase()
  const currentDatasetIds = new Set(selectedTheme.value?.datasetIds || [])

  return datasetOptions.value.filter(item => {
    if (currentDatasetIds.has(item.id)) {
      return false
    }
    if (!keyword) {
      return true
    }
    return item.name.toLowerCase().includes(keyword)
  })
})

const themeResources = computed(() => {
  const datasetMap = new Map(datasetOptions.value.map(item => [item.id, item.name]))
  return (selectedTheme.value?.datasetIds || []).map((datasetId, index) => ({
    id: datasetId,
    name:
      selectedTheme.value?.datasets?.find(item => item.id === datasetId)?.name ||
      datasetMap.get(datasetId) ||
      datasetId,
    updateTime: selectedTheme.value?.updateTime,
    statusLabel: '学习成功',
    sort: index
  }))
})

const resourceRows = computed(() => {
  return datasetOptions.value.map(item => {
    const matchedThemes = themeList.value.filter(theme =>
      (theme.datasetIds || []).includes(item.id)
    )
    const latestUpdateTime = matchedThemes
      .map(theme => theme.updateTime || 0)
      .sort((left, right) => right - left)[0]

    return {
      id: item.id,
      name: item.name,
      creator: '-',
      themeNames: matchedThemes.map(theme => theme.name),
      latestUpdateTime: latestUpdateTime || undefined,
      statusLabel: '学习成功'
    }
  })
})

const handleResourceMenuVisibleChange = (visible: boolean, item: DatasetOption) => {
  if (!visible) {
    activeResourceMenuId.value = ''
    return
  }

  activeResourceMenuId.value = item.id
}

const buildRowActions = (): DatasetRowAction[] => {
  return [
    {
      key: 'assign-themes',
      label: t('starbi.adjust_theme_assignment')
    }
  ]
}

const handleResourceAction = (key: string, item: DatasetOption) => {
  if (key === 'assign-themes') {
    openResourceThemeDialog(item.id)
  }
}

const filteredResourceRows = computed(() => {
  const keyword = resourceKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return resourceRows.value
  }

  return resourceRows.value.filter(item => {
    const haystacks = [item.name, item.creator, ...item.themeNames]
    return haystacks.some(value =>
      String(value || '')
        .toLowerCase()
        .includes(keyword)
    )
  })
})

const previewColumns = computed(() => {
  return previewFields.value.map((field, index) => ({
    key: String(field.dataeaseName || field.originName || field.name || `field_${index}`),
    title: String(field.name || field.originName || `字段${index + 1}`)
  }))
})

const previewGridTemplate = computed(() => {
  const count = Math.max(previewColumns.value.length, 1)
  return `repeat(${count}, minmax(96px, 1fr))`
})

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  if (Array.isArray(value)) {
    return value.map(item => formatCellValue(item)).join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

const previewRowValues = computed(() => {
  return previewRows.value.slice(0, 20).map(row => {
    return previewColumns.value.map((column, index) => {
      if (Array.isArray(row)) {
        return formatCellValue(row[index])
      }
      return formatCellValue(row?.[column.key] ?? row?.[column.title])
    })
  })
})

const formatTime = (timestamp?: number) => {
  if (!timestamp) {
    return '-'
  }
  return new Date(timestamp).toLocaleString()
}

const buildThemePayload = (
  overrides: Partial<AIQueryThemeSaveRequest> & {
    name: string
    description: string
    datasetIds: string[]
  }
): AIQueryThemeSaveRequest => {
  const currentTheme = selectedTheme.value
  return {
    id: overrides.id ?? (editingId.value || undefined),
    name: overrides.name,
    description: overrides.description,
    status: overrides.status ?? currentTheme?.status ?? true,
    sort: overrides.sort ?? currentTheme?.sort ?? themeList.value.length,
    defaultDashboardId: overrides.defaultDashboardId ?? currentTheme?.defaultDashboardId,
    welcomeText: overrides.welcomeText ?? currentTheme?.welcomeText ?? '',
    recommendedQuestions:
      overrides.recommendedQuestions ?? currentTheme?.recommendedQuestions ?? [],
    datasetIds: overrides.datasetIds,
    defaultDatasetIds:
      overrides.defaultDatasetIds ??
      currentTheme?.defaultDatasetIds?.filter(id => overrides.datasetIds.includes(id)) ??
      []
  }
}

const buildExistingThemePayload = (
  theme: AIQueryTheme,
  datasetIds: string[]
): AIQueryThemeSaveRequest => {
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description || '',
    status: theme.status !== false,
    sort: theme.sort || 0,
    defaultDashboardId: theme.defaultDashboardId,
    welcomeText: theme.welcomeText || '',
    recommendedQuestions: theme.recommendedQuestions || [],
    datasetIds,
    defaultDatasetIds: (theme.defaultDatasetIds || []).filter(id => datasetIds.includes(id))
  }
}

const loadDatasetTree = async () => {
  const treeData = (await getDatasetTree({})) as unknown as any[]
  datasetTree.value = normalizeTree(treeData || [])
}

const loadThemes = async () => {
  loading.value = true
  try {
    const themes = await listAIQueryThemes()
    themeList.value = themes
    if (!selectedThemeId.value || !themes.some(item => item.id === selectedThemeId.value)) {
      selectedThemeId.value = themes[0]?.id || ''
    }
  } finally {
    loading.value = false
  }
}

const resetFormState = () => {
  editingId.value = ''
  form.name = ''
  form.description = ''
}

const openCreate = () => {
  resetFormState()
  themeDialogVisible.value = true
}

const openEdit = (theme: AIQueryTheme) => {
  editingId.value = theme.id
  form.name = theme.name
  form.description = theme.description || ''
  themeDialogVisible.value = true
}

const toggleThemeMenu = (themeId: string) => {
  activeThemeMenuId.value = activeThemeMenuId.value === themeId ? '' : themeId
}

const closeThemeDialog = () => {
  themeDialogVisible.value = false
  formRef.value?.clearValidate()
}

const saveTheme = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  const payload = buildThemePayload({
    name: form.name.trim(),
    description: form.description.trim(),
    datasetIds: editingId.value ? [...(selectedTheme.value?.datasetIds || [])] : []
  })

  saving.value = true
  try {
    if (editingId.value) {
      await updateAIQueryTheme(payload)
    } else {
      await createAIQueryTheme(payload)
    }
    ElMessage.success(t('common.save_success'))
    closeThemeDialog()
    await loadThemes()
  } finally {
    saving.value = false
  }
}

const removeTheme = (theme: AIQueryTheme) => {
  ElMessageBox.confirm(t('starbi.delete_theme_confirm', { name: theme.name }), {
    confirmButtonType: 'danger',
    type: 'warning',
    autofocus: false,
    showClose: false
  }).then(async () => {
    await deleteAIQueryTheme(theme.id)
    ElMessage.success(t('common.delete_success'))
    await loadThemes()
  })
}

const openResourceDialog = () => {
  if (!selectedTheme.value) {
    ElMessage.info('请先选择分析主题')
    return
  }
  resourceSelection.value = []
  resourceKeyword.value = ''
  resourceDialogVisible.value = true
}

const closeResourceDialog = () => {
  resourceDialogVisible.value = false
  resourceSelection.value = []
  resourceKeyword.value = ''
}

const saveThemeResources = async () => {
  if (!selectedTheme.value || !resourceSelection.value.length) {
    return
  }

  const nextDatasetIds = [
    ...new Set([...(selectedTheme.value.datasetIds || []), ...resourceSelection.value])
  ]
  await updateAIQueryTheme(
    buildThemePayload({
      id: selectedTheme.value.id,
      name: selectedTheme.value.name,
      description: selectedTheme.value.description || '',
      datasetIds: nextDatasetIds
    })
  )
  ElMessage.success('已将数据集分配到当前分析主题')
  closeResourceDialog()
  await loadThemes()
}

const openResourceThemeDialog = (resourceId: string) => {
  const resource = resourceRows.value.find(item => item.id === resourceId)
  if (!resource) {
    return
  }
  editingResourceId.value = resource.id
  editingResourceTitle.value = resource.name
  resourceThemeSelection.value = themeList.value
    .filter(theme => (theme.datasetIds || []).includes(resourceId))
    .map(theme => theme.id)
  resourceThemeDialogVisible.value = true
}

const closeResourceThemeDialog = () => {
  resourceThemeDialogVisible.value = false
  editingResourceId.value = ''
  editingResourceTitle.value = ''
  resourceThemeSelection.value = []
}

const saveResourceThemeAssignments = async () => {
  const resourceId = editingResourceId.value
  if (!resourceId) {
    return
  }

  const selectedThemeIds = new Set(resourceThemeSelection.value)
  const changedThemes = themeList.value.filter(theme => {
    const hasResource = (theme.datasetIds || []).includes(resourceId)
    return hasResource !== selectedThemeIds.has(theme.id)
  })

  for (const theme of changedThemes) {
    const hasResource = (theme.datasetIds || []).includes(resourceId)
    const nextDatasetIds = selectedThemeIds.has(theme.id)
      ? [...new Set([...(theme.datasetIds || []), resourceId])]
      : (theme.datasetIds || []).filter(id => id !== resourceId)

    if (hasResource === selectedThemeIds.has(theme.id)) {
      continue
    }

    await updateAIQueryTheme(buildExistingThemePayload(theme, nextDatasetIds))
  }

  ElMessage.success('已更新数据集归属主题')
  closeResourceThemeDialog()
  await loadThemes()
}

const removeThemeResource = async (datasetId: string) => {
  if (!selectedTheme.value) {
    return
  }

  const nextDatasetIds = (selectedTheme.value.datasetIds || []).filter(id => id !== datasetId)
  await updateAIQueryTheme(buildExistingThemePayload(selectedTheme.value, nextDatasetIds))
  ElMessage.success('已从当前分析主题移除数据集')
  await loadThemes()
}

const openPreview = async (datasetId: string) => {
  const targetTitle =
    themeResources.value.find(item => item.id === datasetId)?.name ||
    datasetOptions.value.find(item => item.id === datasetId)?.name ||
    datasetId
  previewDatasetTitle.value = targetTitle
  previewDialogVisible.value = true
  previewLoading.value = true
  previewFields.value = []
  previewRows.value = []

  try {
    const previewRes = await getDatasetPreview(datasetId)
    previewFields.value = Array.isArray(previewRes?.data?.fields) ? previewRes.data.fields : []
    previewRows.value = Array.isArray(previewRes?.data?.data) ? previewRes.data.data : []
  } catch (error) {
    console.error('load query-theme dataset preview failed', error)
    previewFields.value = []
    previewRows.value = []
    ElMessage.error('数据预览加载失败')
  } finally {
    previewLoading.value = false
  }
}

watch(
  () => filteredThemeList.value.map(item => item.id).join('|'),
  () => {
    if (!filteredThemeList.value.some(item => item.id === selectedThemeId.value)) {
      selectedThemeId.value = filteredThemeList.value[0]?.id || ''
    }
  }
)

watch(
  () => props.modeLocked,
  mode => {
    if (mode === 'resources' || mode === 'themes') {
      manageMode.value = mode
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await loadDatasetTree()
  await loadThemes()
  await nextTick()
})
</script>

<template>
  <div class="query-theme-page" v-loading="loading">
    <div v-if="showModeTabs" class="manage-tabs">
      <button
        class="manage-tab"
        :class="{ active: manageMode === 'resources' }"
        type="button"
        @click="manageMode = 'resources'"
      >
        问数资源管理
      </button>
      <button
        class="manage-tab"
        :class="{ active: manageMode === 'themes' }"
        type="button"
        @click="manageMode = 'themes'"
      >
        分析主题管理
      </button>
    </div>

    <section v-if="manageMode === 'themes'" class="theme-main-page-layout query-theme-layout">
      <aside class="theme-main-page-sidebar query-theme-panel query-theme-panel--sidebar">
        <div class="theme-main-page-sidebar-head">
          <div class="theme-main-page-sidebar-title">分析主题列表</div>
          <button class="theme-main-page-add-button" type="button" @click="openCreate">
            <Icon name="icon_add_outlined"><icon_add_outlined class="svg-icon" /></Icon>
          </button>
        </div>

        <div class="theme-main-page-search theme-main-page-sidebar-search">
          <Icon name="icon_search-outline_outlined" class-name="theme-main-page-search-icon">
            <icon_searchOutline_outlined class="svg-icon" />
          </Icon>
          <input
            v-model="themeKeyword"
            class="theme-main-page-search-input"
            type="text"
            placeholder="搜索分析主题"
          />
        </div>

        <div v-if="filteredThemeList.length" class="theme-main-page-list">
          <div
            v-for="theme in filteredThemeList"
            :key="theme.id"
            class="theme-main-page-list-item"
            :class="{ active: selectedThemeId === theme.id }"
          >
            <button
              class="theme-main-page-list-select"
              type="button"
              @click="selectedThemeId = theme.id"
            >
              <span class="theme-main-page-drag-handle">⋮⋮</span>
              <span class="theme-main-page-list-name">{{ theme.name }}</span>
            </button>
            <el-dropdown
              trigger="click"
              @visible-change="visible => (activeThemeMenuId = visible ? theme.id : '')"
            >
              <button
                class="theme-main-page-list-more"
                :class="{ active: activeThemeMenuId === theme.id }"
                type="button"
                @click.stop="toggleThemeMenu(theme.id)"
              >
                <Icon name="icon_more-vertical_outlined">
                  <icon_moreVertical_outlined class="svg-icon" />
                </Icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openEdit(theme)">编辑主题</el-dropdown-item>
                  <el-dropdown-item @click="removeTheme(theme)">删除主题</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <div v-else class="theme-main-page-empty">
          <empty-background :description="t('starbi.no_query_theme')" img-type="none" />
        </div>
      </aside>

      <main class="theme-main-page-content query-theme-panel query-theme-panel--workspace">
        <header class="theme-main-page-header">
          <div class="theme-main-page-copy">
            <div class="theme-main-page-title">已分配数据集</div>
          </div>

          <div class="theme-main-page-actions">
            <div class="theme-main-page-search theme-main-page-dataset-search">
              <Icon name="icon_search-outline_outlined" class-name="theme-main-page-search-icon">
                <icon_searchOutline_outlined class="svg-icon" />
              </Icon>
              <input
                v-model="themeResourceKeyword"
                class="theme-main-page-search-input"
                type="text"
                placeholder="搜索已分配数据集"
              />
            </div>
            <button class="theme-main-page-cta" type="button" @click="openResourceDialog">
              <span class="theme-main-page-cta-plus">＋</span>
              <span>分配数据集</span>
            </button>
          </div>
        </header>

        <div v-if="selectedTheme" class="theme-main-page-table">
          <div class="theme-main-page-table-row theme-main-page-table-head">
            <div class="theme-main-page-table-cell theme-main-page-table-cell-checkbox"></div>
            <div class="theme-main-page-table-cell theme-main-page-table-cell-name">名称</div>
            <div class="theme-main-page-table-cell theme-main-page-table-cell-time">
              最后学习时间
            </div>
            <div class="theme-main-page-table-cell theme-main-page-table-cell-status">学习状态</div>
            <div class="theme-main-page-table-cell theme-main-page-table-cell-action">操作</div>
          </div>

          <div
            v-for="item in themeResources.filter(resource => {
              if (!themeResourceKeyword.trim()) return true
              return resource.name.toLowerCase().includes(themeResourceKeyword.trim().toLowerCase())
            })"
            :key="item.id"
            class="theme-main-page-table-row"
          >
            <div class="theme-main-page-table-cell theme-main-page-table-cell-checkbox">
              <input class="theme-main-page-checkbox-input" type="checkbox" />
            </div>
            <div class="theme-main-page-table-cell theme-main-page-table-cell-name">
              <div class="theme-main-page-name-wrap">
                <Icon name="icon_dataset_outlined" class-name="theme-main-page-dataset-icon">
                  <icon_dataset_outlined class="svg-icon" />
                </Icon>
                <span class="theme-main-page-resource-name">{{ item.name }}</span>
                <button
                  class="theme-main-page-info-button"
                  type="button"
                  title="预览数据"
                  @click="openPreview(item.id)"
                >
                  <Icon name="icon_info_outlined">
                    <icon_info_outlined class="svg-icon" />
                  </Icon>
                </button>
              </div>
            </div>
            <div class="theme-main-page-table-cell theme-main-page-table-cell-time">
              {{ formatTime(item.updateTime) }}
            </div>
            <div class="theme-main-page-table-cell theme-main-page-table-cell-status">
              <span class="theme-main-page-status-dot"></span>
              <span>{{ item.statusLabel }}</span>
            </div>
            <div class="theme-main-page-table-cell theme-main-page-table-cell-action">
              <button
                class="theme-main-page-action-button"
                type="button"
                title="移除数据集"
                @click="removeThemeResource(item.id)"
              >
                <Icon name="icon_delete-trash_outlined">
                  <icon_deleteTrash_outlined class="svg-icon" />
                </Icon>
              </button>
            </div>
          </div>

          <div v-if="!themeResources.length" class="theme-main-page-resource-empty">
            <empty-background description="当前分析主题暂未分配数据集" img-type="none" />
          </div>
        </div>

        <div v-else class="theme-main-page-resource-empty">
          <empty-background description="请先选择分析主题" img-type="none" />
        </div>
      </main>
    </section>

    <section v-else class="resource-manage-card query-resource-panel">
      <header class="resource-manage-header">
        <div class="resource-manage-copy">
          <div class="resource-manage-title">问数资源管理</div>
          <div class="resource-manage-subtitle">
            统一查看数据集当前归属的分析主题，并支持调整数据集分配关系。
          </div>
        </div>
        <div class="resource-manage-actions">
          <div class="resource-manage-search-bar">
            <Icon name="icon_search-outline_outlined" class-name="resource-manage-search-icon">
              <icon_searchOutline_outlined class="svg-icon" />
            </Icon>
            <input
              v-model="resourceKeyword"
              class="resource-manage-search-input"
              type="text"
              placeholder="搜索数据集"
            />
          </div>
          <button class="secondary-button" type="button" @click="loadThemes">刷新列表</button>
        </div>
      </header>

      <div class="resource-manage-table">
        <div class="resource-manage-table-head resource-manage-table-row resource-manage-grid">
          <div class="resource-cell checkbox"></div>
          <div class="resource-cell name">名称</div>
          <div class="resource-cell creator">创建者</div>
          <div class="resource-cell themes">已分配分析主题</div>
          <div class="resource-cell time">最后学习时间</div>
          <div class="resource-cell status">学习状态</div>
          <div class="resource-cell action">操作</div>
        </div>

        <div
          v-for="item in filteredResourceRows"
          :key="item.id"
          class="resource-manage-table-row resource-manage-grid"
        >
          <div class="resource-cell checkbox">
            <input type="checkbox" />
          </div>
          <div class="resource-cell name">
            <div class="resource-manage-name-wrap">
              <Icon name="icon_dataset_outlined" class-name="resource-manage-dataset-icon">
                <icon_dataset_outlined class="svg-icon" />
              </Icon>
              <span class="resource-manage-name">{{ item.name }}</span>
              <button
                class="resource-manage-info-button"
                type="button"
                title="预览数据"
                @click="openPreview(item.id)"
              >
                <Icon name="icon_info_outlined">
                  <icon_info_outlined class="svg-icon" />
                </Icon>
              </button>
            </div>
          </div>
          <div class="resource-cell creator">{{ item.creator }}</div>
          <div class="resource-cell themes">
            <div class="theme-name-list">
              <span v-if="item.themeNames.length">
                {{ item.themeNames.join('，') }}
              </span>
              <span v-else class="muted-text">未分配分析主题</span>
            </div>
          </div>
          <div class="resource-cell time">{{ formatTime(item.latestUpdateTime) }}</div>
          <div class="resource-cell status">
            <span class="resource-manage-status-dot success"></span>
            <span>{{ item.statusLabel }}</span>
          </div>
          <div class="resource-cell action">
            <el-dropdown
              trigger="click"
              placement="bottom-end"
              @command="command => handleResourceAction(command, item)"
              @visible-change="visible => handleResourceMenuVisibleChange(visible, item)"
            >
              <button
                class="resource-manage-action-button"
                :class="{ active: activeResourceMenuId === item.id }"
                type="button"
                :title="t('starbi.adjust_theme_assignment')"
              >
                <Icon name="icon_more-vertical_outlined">
                  <icon_moreVertical_outlined class="svg-icon" />
                </Icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="action in buildRowActions(item)"
                    :key="action.key"
                    :command="action.key"
                    :disabled="action.disabled"
                  >
                    {{ action.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <div v-if="!filteredResourceRows.length" class="resource-manage-empty">
          <empty-background description="暂无可管理数据集" img-type="none" />
        </div>
      </div>
    </section>

    <el-dialog
      v-model="themeDialogVisible"
      :class="[
        'theme-dialog',
        'theme-form-dialog',
        { 'theme-create-dialog': !editingId, 'theme-edit-dialog': !!editingId }
      ]"
      width="640px"
      destroy-on-close
      append-to-body
    >
      <template #header>
        <div class="theme-dialog-header">
          <div class="theme-dialog-title">{{ editingId ? '编辑分析主题' : '新建分析主题' }}</div>
        </div>
      </template>

      <div class="theme-dialog-tip">创建分析主题后，可继续为该主题分配现有数据集</div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="theme-form">
        <el-form-item label="分析主题名称" prop="name" required class="theme-form-item">
          <el-input v-model="form.name" maxlength="50" placeholder="请输入分析主题名称" />
        </el-form-item>
        <el-form-item label="分析主题描述" prop="description" required class="theme-form-item">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="5"
            maxlength="300"
            placeholder="请输入对该分析主题的描述，该描述将展示在问数页面，供使用者参考。"
          />
          <div v-if="!editingId" class="theme-create-dialog-counter">
            {{ form.description.length }}/300
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button secondary @click="closeThemeDialog">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveTheme">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="resourceDialogVisible"
      class="theme-dialog theme-resource-dialog theme-assign-dialog"
      width="720px"
      destroy-on-close
      append-to-body
    >
      <template #header>
        <div class="theme-dialog-header">
          <div class="theme-dialog-title">分配数据集</div>
        </div>
      </template>

      <div class="theme-dialog-tip theme-assign-dialog-tip">
        选择现有数据集，并分配到当前分析主题
      </div>

      <div class="theme-dialog-search-bar theme-assign-dialog-search-bar">
        <Icon
          name="icon_search-outline_outlined"
          class-name="theme-dialog-search-icon theme-assign-dialog-search-icon"
        >
          <icon_searchOutline_outlined class="svg-icon" />
        </Icon>
        <input
          v-model="resourceKeyword"
          class="theme-dialog-search-input theme-assign-dialog-search-input"
          type="text"
          placeholder="搜索数据集"
        />
      </div>

      <div class="resource-picker-card theme-assign-dialog-card">
        <div class="resource-picker-head theme-assign-dialog-list-head">
          <div class="resource-picker-cell checkbox"></div>
          <div class="resource-picker-cell name">可分配数据集</div>
        </div>

        <div class="resource-select-list theme-assign-dialog-list">
          <template v-if="filteredResourceOptions.length">
            <label
              v-for="item in filteredResourceOptions"
              :key="item.id"
              class="resource-select-item theme-assign-dialog-item"
            >
              <input
                v-model="resourceSelection"
                class="theme-assign-dialog-checkbox"
                type="checkbox"
                :value="item.id"
              />
              <span class="resource-select-name-wrap theme-assign-dialog-name-wrap">
                <Icon
                  name="icon_dataset_outlined"
                  class-name="dataset-icon theme-assign-dialog-dataset-icon"
                >
                  <icon_dataset_outlined class="svg-icon" />
                </Icon>
                <span class="resource-select-name theme-assign-dialog-name">{{ item.name }}</span>
              </span>
            </label>
          </template>
          <div v-else class="dialog-empty-text theme-assign-dialog-empty">暂无可分配数据集</div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer theme-assign-dialog-footer">
          <el-button secondary @click="closeResourceDialog">取消</el-button>
          <el-button
            type="primary"
            :disabled="!resourceSelection.length"
            @click="saveThemeResources"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="resourceThemeDialogVisible"
      class="theme-dialog theme-resource-dialog"
      width="620px"
      destroy-on-close
      append-to-body
    >
      <template #header>
        <div class="theme-dialog-header">
          <div class="theme-dialog-title">调整分析主题分配</div>
        </div>
      </template>

      <div class="theme-dialog-tip">勾选当前数据集需要归属的分析主题</div>
      <div class="dialog-resource-title">{{ editingResourceTitle }}</div>
      <div class="resource-picker-card simple">
        <div class="resource-picker-head">
          <div class="resource-picker-cell checkbox"></div>
          <div class="resource-picker-cell name">分析主题</div>
        </div>
        <div class="resource-select-list">
          <template v-if="themeList.length">
            <label v-for="theme in themeList" :key="theme.id" class="resource-select-item">
              <input v-model="resourceThemeSelection" type="checkbox" :value="theme.id" />
              <span class="resource-select-name">{{ theme.name }}</span>
            </label>
          </template>
          <div v-else class="dialog-empty-text">暂无分析主题</div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button secondary @click="closeResourceThemeDialog">取消</el-button>
          <el-button type="primary" @click="saveResourceThemeAssignments">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="previewDialogVisible"
      class="theme-dialog theme-preview-dialog"
      width="860px"
      destroy-on-close
      append-to-body
    >
      <template #header>
        <div class="theme-preview-header">
          <div class="theme-preview-title">数据预览</div>
          <div class="theme-preview-subtitle">{{ previewDatasetTitle }}</div>
        </div>
      </template>

      <div v-loading="previewLoading" class="preview-dialog-body">
        <div v-if="previewColumns.length" class="preview-table">
          <div class="preview-row head" :style="{ gridTemplateColumns: previewGridTemplate }">
            <div v-for="column in previewColumns" :key="column.key" class="preview-cell head">
              {{ column.title }}
            </div>
          </div>
          <div
            v-for="(row, index) in previewRowValues"
            :key="`preview-row-${index}`"
            class="preview-row"
            :style="{ gridTemplateColumns: previewGridTemplate }"
          >
            <div
              v-for="(value, columnIndex) in row"
              :key="`${index}-${columnIndex}`"
              class="preview-cell"
            >
              {{ value }}
            </div>
          </div>
        </div>
        <div v-else class="resource-empty">
          <empty-background description="暂无可预览数据" img-type="none" />
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer theme-preview-dialog-footer">
          <el-button secondary @click="previewDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="less" scoped>
.query-theme-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 100%;
  overflow: hidden;
}

.manage-tabs {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-bottom: 16px;
}

.manage-tab {
  border: none;
  background: transparent;
  color: #646a73;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  cursor: pointer;
  padding: 0 0 10px;
}

.manage-tab.active {
  color: #1f2329;
  box-shadow: inset 0 -2px 0 #3370ff;
}

.theme-main-page-layout,
.query-theme-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  flex: 1;
  height: 100%;
  min-height: 0;
}

.theme-main-page-sidebar,
.theme-main-page-content,
.resource-manage-card,
.query-theme-panel,
.query-resource-panel {
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(31, 35, 41, 0.08);
  box-shadow: 0 6px 20px rgba(31, 35, 41, 0.04);
  height: 100%;
  min-height: 0;
}

.theme-main-page-sidebar,
.query-theme-panel--sidebar {
  display: flex;
  flex-direction: column;
  padding: 16px 14px 14px;
}

.theme-main-page-content,
.query-theme-panel--workspace {
  display: flex;
  flex-direction: column;
  padding: 16px 22px 16px;
  min-width: 0;
}

.resource-manage-card {
  padding: 16px 22px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.query-resource-panel {
  flex: 1;
  overflow: hidden;
}

.resource-manage-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.resource-manage-copy {
  flex: 1 1 auto;
  min-width: 0;
}

.resource-manage-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
  color: #1f2329;
}

.resource-manage-subtitle {
  margin-top: 3px;
  color: #8f959e;
  font-size: 14px;
  line-height: 22px;
  max-width: 420px;
}

.resource-manage-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 0;
}

.resource-manage-search-bar {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(31, 35, 41, 0.1);
  border-radius: 999px;
  background: #fff;
  padding: 0 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.resource-manage-search-bar {
  width: 220px;
}

.theme-dialog-search-bar {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(31, 35, 41, 0.1);
  border-radius: 999px;
  background: #fff;
  padding: 0 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  margin-top: 0;
}

.resource-manage-search-bar:focus-within {
  border-color: rgba(51, 112, 255, 0.36);
  box-shadow: 0 0 0 3px rgba(51, 112, 255, 0.08);
}

.theme-dialog-search-bar:focus-within {
  border-color: rgba(51, 112, 255, 0.36);
  box-shadow: 0 0 0 3px rgba(51, 112, 255, 0.08);
}

.resource-manage-search-icon {
  color: #98a2b3;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.theme-dialog-search-icon {
  color: #98a2b3;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.resource-manage-search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #1f2329;
  font-size: 15px;
}

.theme-dialog-search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #1f2329;
  font-size: 13px;
}

.resource-manage-table {
  margin-top: 14px;
  border-top: 1px solid rgba(31, 35, 41, 0.06);
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
}

.resource-manage-table-row {
  display: grid;
  grid-template-columns: 48px minmax(220px, 1.35fr) 108px minmax(220px, 1.25fr) 208px 126px 88px;
  align-items: center;
  min-height: 64px;
  border-bottom: 1px solid rgba(31, 35, 41, 0.08);
  transition: background-color 0.2s ease;
}

.resource-manage-table-row:hover:not(.resource-manage-table-head) {
  background: #fbfcff;
}

.resource-manage-table-head {
  min-height: 52px;
  color: #5f6b7c;
  font-size: 15px;
  font-weight: 600;
  background: #f7f9fc;
}

.resource-cell {
  min-width: 0;
  padding: 0 12px;
  font-size: 15px;
  line-height: 24px;
}

.resource-manage-name-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.resource-manage-dataset-icon {
  color: #7f8ea3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.resource-manage-name {
  color: #1f2329;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-manage-info-button {
  border: none;
  background: transparent;
  color: #98a2b3;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.resource-manage-info-button:hover {
  color: #3370ff;
}

.resource-manage-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 5px;
}

.resource-manage-status-dot.success {
  background: #22c55e;
}

.resource-manage-action-button {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(31, 35, 41, 0.1);
  border-radius: 10px;
  background: transparent;
  color: #8f959e;
  font-size: 15px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.resource-manage-action-button:hover,
.resource-manage-action-button.active {
  color: #3370ff;
  border-color: rgba(51, 112, 255, 0.18);
  background: rgba(51, 112, 255, 0.08);
}

.resource-manage-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  flex: 0 0 auto;
  border-bottom: 1px solid rgba(31, 35, 41, 0.06);
  background: linear-gradient(180deg, #fff 0%, #fbfdff 100%);
}

.resource-manage-empty :deep(.ed-empty__description),
.theme-main-page-empty :deep(.ed-empty__description),
.theme-main-page-resource-empty :deep(.ed-empty__description) {
  color: #667085;
  font-size: 16px;
  line-height: 24px;
}

.theme-main-page-sidebar-head,
.theme-main-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.theme-main-page-header {
  flex-wrap: nowrap;
}

.theme-main-page-copy {
  flex: 1 1 auto;
  min-width: 0;
  max-width: none;
}

.theme-main-page-sidebar-title,
.theme-main-page-title {
  font-weight: 700;
  color: #1f2329;
  font-size: 18px;
  line-height: 28px;
}

.theme-main-page-add-button {
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #3370ff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}

.theme-main-page-add-button .svg-icon {
  font-size: 13px;
}

.theme-main-page-search {
  display: flex;
  align-items: center;
  height: 48px;
  margin-top: 18px;
  gap: 10px;
  border: 1px solid rgba(31, 35, 41, 0.1);
  border-radius: 24px;
  background: #fff;
  padding: 0 18px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.theme-main-page-search:focus-within {
  border-color: rgba(51, 112, 255, 0.36);
  box-shadow: 0 0 0 3px rgba(51, 112, 255, 0.08);
}

.theme-main-page-sidebar-search {
  margin-top: 24px;
}

.theme-main-page-dataset-search {
  width: 312px;
  height: 44px;
  margin-top: 2px;
}

.theme-main-page-search-icon {
  color: #1f2329;
  font-size: 18px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.theme-main-page-search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #1f2329;
  font-size: 15px;
}

.theme-main-page-search-input::placeholder {
  color: #9ca3af;
}

.theme-main-page-list {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.theme-main-page-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 58px;
  padding: 0 14px 0 16px;
  border: none;
  border-radius: 14px;
  color: #1f2329;
  cursor: pointer;
  border-color: rgba(31, 35, 41, 0.08);
  background: #fff;
  border: 1px solid rgba(31, 35, 41, 0.08);
  transition: all 0.2s ease;
}

.theme-main-page-list-select {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 56px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.theme-main-page-list-item.active {
  background: #eaf2ff;
  border-color: rgba(51, 112, 255, 0.18);
  box-shadow: inset 0 0 0 1px rgba(51, 112, 255, 0.08);
}

.theme-main-page-list-item:hover {
  background: #f8fbff;
  border-color: rgba(51, 112, 255, 0.16);
}

.theme-main-page-drag-handle {
  color: #9aa4b2;
  flex: 0 0 auto;
  font-size: 13px;
  letter-spacing: -1px;
}

.theme-main-page-list-more {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(31, 35, 41, 0.1);
  background: #fff;
  color: #646a73;
  flex: 0 0 auto;
  transition: all 0.2s ease;
}

.theme-main-page-list-more:hover,
.theme-main-page-list-more.active {
  color: #3370ff;
  border-color: rgba(51, 112, 255, 0.22);
  background: #f5f9ff;
}

.theme-main-page-list-name {
  flex: 1 1 auto;
  text-align: left;
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-main-page-empty,
.theme-main-page-resource-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  flex: 0 0 auto;
  border-radius: 12px;
  background: linear-gradient(180deg, #fff 0%, #fbfdff 100%);
}

.theme-main-page-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
  padding-top: 0;
}

.theme-main-page-cta {
  display: inline-flex;
  align-items: center;
  min-width: 118px;
  height: 40px;
  border: none;
  background: #3370ff;
  color: #fff;
  padding: 0 14px;
  gap: 4px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: none;
}

.secondary-button,
.ghost-danger-button {
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.secondary-button {
  border: 1px solid rgba(31, 35, 41, 0.12);
  background: #fff;
  color: #1f2329;
}

.ghost-danger-button {
  border: 1px solid rgba(255, 77, 79, 0.2);
  background: #fff;
  color: #ff4d4f;
}

.theme-main-page-cta-plus {
  font-size: 14px;
  line-height: 1;
}

.theme-main-page-table {
  margin-top: 18px;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
}

.theme-main-page-table-row {
  display: grid;
  grid-template-columns: 54px minmax(260px, 1.75fr) 240px 156px 94px;
  align-items: center;
  min-height: 68px;
  border-bottom: 1px solid rgba(31, 35, 41, 0.08);
  transition: background-color 0.2s ease;
}

.theme-main-page-table-row:hover:not(.theme-main-page-table-head) {
  background: #fbfcff;
}

.theme-main-page-table-head {
  min-height: 54px;
}

.theme-main-page-table-head .theme-main-page-table-cell {
  color: #5f6b7c;
  font-size: 15px;
  font-weight: 600;
}

.theme-main-page-table-cell {
  padding: 0 12px;
  min-width: 0;
  font-size: 15px;
  line-height: 24px;
}

.theme-main-page-table-cell-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-main-page-name-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.theme-main-page-dataset-icon {
  color: #4a5568;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-main-page-resource-name {
  color: #1f2329;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 20px;
  font-size: 15px;
  font-weight: 600;
}

.theme-name-list {
  color: #1f2329;
  font-size: 15px;
  line-height: 24px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-main-page-info-button {
  border: none;
  background: transparent;
  color: #98a2b3;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-main-page-info-button:hover {
  color: #3370ff;
}

.muted-text {
  color: #8f959e;
}

.preview-link {
  border: none;
  background: transparent;
  color: #3370ff;
  cursor: pointer;
  font-size: 15px;
}

.theme-main-page-status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-right: 8px;
}

.theme-main-page-action-button {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(31, 35, 41, 0.1);
  border-radius: 12px;
  background: transparent;
  color: #ff4d4f;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-main-page-status-dot {
  background: #22c55e;
}

.theme-main-page-checkbox-input {
  appearance: none;
  width: 13px;
  height: 13px;
  margin: 0;
  border: 1px solid #c8d0d8;
  border-radius: 3px;
  background: #fff;
  position: relative;
  cursor: pointer;
  flex: 0 0 auto;
}

.theme-main-page-checkbox-input {
  width: 16px;
  height: 16px;
}

.theme-main-page-checkbox-input:checked {
  border-color: #3370ff;
  background: #3370ff;
}

.theme-main-page-checkbox-input:checked::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.theme-main-page-checkbox-input:checked::after {
  left: 4px;
}

.theme-assign-dialog :deep(.el-dialog) {
  border-radius: 14px;
  overflow: hidden;
}

.theme-assign-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 24px 24px 0;
}

.theme-assign-dialog :deep(.el-dialog__headerbtn) {
  top: 22px;
  right: 24px;
  width: 20px;
  height: 20px;
}

.theme-assign-dialog :deep(.el-dialog__close) {
  color: #646a73;
  font-size: 16px;
}

.theme-assign-dialog :deep(.el-dialog__body) {
  padding: 12px 24px 0;
}

.theme-assign-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px 24px;
  border-top: 1px solid #eaedf3;
}

.theme-assign-dialog .theme-dialog-header {
  min-height: 30px;
  padding-right: 28px;
}

.theme-assign-dialog .theme-dialog-title {
  color: #1f2329;
  font-size: 16px;
  line-height: 30px;
  font-weight: 700;
}

.theme-assign-dialog .theme-assign-dialog-tip {
  margin-bottom: 16px;
  color: #8f959e;
  font-size: 14px;
  line-height: 22px;
}

.theme-assign-dialog .theme-assign-dialog-search-bar {
  height: 38px;
  gap: 8px;
  margin-bottom: 14px;
  border-color: #d7dde8;
  border-radius: 20px;
  padding: 0 14px 0 12px;
}

.theme-assign-dialog .theme-assign-dialog-search-bar:focus-within {
  border-color: rgba(51, 112, 255, 0.36);
  box-shadow: 0 0 0 3px rgba(51, 112, 255, 0.08);
}

.theme-assign-dialog .theme-assign-dialog-search-icon {
  color: #1f2329;
  font-size: 18px;
}

.theme-assign-dialog .theme-assign-dialog-search-input {
  color: #1f2329;
  font-size: 14px;
  line-height: 20px;
}

.theme-assign-dialog .theme-assign-dialog-search-input::placeholder {
  color: #a0a9b8;
}

.theme-assign-dialog .theme-assign-dialog-card {
  border: 1px solid #e4e8f0;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.theme-assign-dialog .theme-assign-dialog-list-head,
.theme-assign-dialog .theme-assign-dialog-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  padding: 0 16px;
}

.theme-assign-dialog .theme-assign-dialog-list-head {
  min-height: 40px;
  background: #f7f9fc;
  border-bottom: 1px solid #eaedf3;
}

.theme-assign-dialog .theme-assign-dialog-list-head .resource-picker-cell {
  color: #a0a9b8;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
}

.theme-assign-dialog .theme-assign-dialog-list-head .resource-picker-cell.checkbox {
  width: 16px;
}

.theme-assign-dialog .theme-assign-dialog-list {
  max-height: 258px;
  min-height: 76px;
  overflow-y: auto;
}

.theme-assign-dialog .theme-assign-dialog-item {
  min-height: 44px;
  border-bottom: 1px solid rgba(31, 35, 41, 0.06);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.theme-assign-dialog .theme-assign-dialog-item:last-child {
  border-bottom: none;
}

.theme-assign-dialog .theme-assign-dialog-item:hover {
  background: #fbfcff;
}

.theme-assign-dialog .theme-assign-dialog-checkbox {
  appearance: none;
  width: 16px;
  height: 16px;
  margin: 0;
  border: 1px solid #cfd6e4;
  border-radius: 4px;
  background: #fff;
  position: relative;
  cursor: pointer;
}

.theme-assign-dialog .theme-assign-dialog-checkbox:checked {
  border-color: #3370ff;
  background: #3370ff;
}

.theme-assign-dialog .theme-assign-dialog-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.theme-assign-dialog .theme-assign-dialog-name-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 44px;
}

.theme-assign-dialog .theme-assign-dialog-dataset-icon {
  color: #7f8ea3;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-assign-dialog .theme-assign-dialog-name {
  color: #1f2329;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-assign-dialog .theme-assign-dialog-empty {
  display: flex;
  align-items: center;
  min-height: 76px;
  padding: 0 16px;
  color: #a0a9b8;
  font-size: 13px;
  line-height: 20px;
}

.theme-assign-dialog .theme-assign-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.theme-assign-dialog .theme-assign-dialog-footer :deep(.el-button) {
  min-width: 82px;
  height: 32px;
  margin: 0;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.theme-preview-dialog :deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.16);
}

.theme-preview-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 0;
}

.theme-preview-dialog :deep(.el-dialog__headerbtn) {
  top: 15px;
  right: 18px;
  width: 18px;
  height: 18px;
}

.theme-preview-dialog :deep(.el-dialog__close) {
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
}

.theme-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
  background: #fff;
}

.theme-preview-dialog :deep(.el-dialog__footer) {
  padding: 10px 16px 12px;
  border-top: 1px solid #e9edf5;
  background: #fff;
}

.theme-preview-dialog .theme-preview-header {
  min-height: 72px;
  padding: 14px 24px 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(90deg, #2f70f6 0%, #3f83fb 100%);
}

.theme-preview-dialog .theme-preview-title {
  color: #fff;
  font-size: 18px;
  line-height: 26px;
  font-weight: 700;
}

.theme-preview-dialog .theme-preview-subtitle {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-preview-dialog .preview-dialog-body {
  padding: 14px 16px 0;
  height: 360px;
  background: #fff;
  overflow: hidden;
}

.theme-preview-dialog .preview-table {
  width: 100%;
  height: 100%;
  border: 1px solid #e6ebf2;
  border-radius: 10px;
  background: #fff;
  overflow: auto;
}

.theme-preview-dialog .preview-row {
  display: grid;
  min-height: 42px;
}

.theme-preview-dialog .preview-row.head {
  min-height: 42px;
  background: #f6f8fc;
}

.theme-preview-dialog .preview-cell {
  min-width: 0;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  color: #3f4754;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 1px solid #edf1f6;
  border-bottom: 1px solid #edf1f6;
}

.theme-preview-dialog .preview-cell.head {
  color: #6b7280;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
}

.theme-preview-dialog .preview-row .preview-cell:last-child {
  border-right: none;
}

.theme-preview-dialog .preview-table .preview-row:last-child .preview-cell {
  border-bottom: none;
}

.theme-preview-dialog .resource-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.theme-preview-dialog .theme-preview-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.theme-preview-dialog .theme-preview-dialog-footer :deep(.el-button) {
  min-width: 52px;
  height: 24px;
  margin: 0;
  padding: 0 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.theme-create-dialog :deep(.el-dialog) {
  border-radius: 14px;
}

.theme-create-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 24px 24px 0;
  border-bottom: none;
}

.theme-create-dialog :deep(.el-dialog__headerbtn) {
  top: 22px;
  right: 22px;
  width: 20px;
  height: 20px;
}

.theme-create-dialog :deep(.el-dialog__close) {
  color: #646a73;
  font-size: 16px;
}

.theme-create-dialog :deep(.el-dialog__body) {
  padding: 12px 24px 0;
}

.theme-create-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px 24px;
  border-top: 1px solid #eaedf3;
}

.theme-create-dialog .theme-dialog-header {
  min-height: 30px;
  padding-right: 28px;
}

.theme-create-dialog .theme-dialog-title {
  color: #1f2329;
  font-size: 16px;
  line-height: 30px;
  font-weight: 700;
}

.theme-create-dialog .theme-dialog-tip {
  margin-bottom: 20px;
  color: #8f959e;
  font-size: 14px;
  line-height: 22px;
}

.theme-create-dialog .theme-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.theme-create-dialog .theme-form-item {
  position: relative;
  margin-bottom: 0;
}

.theme-create-dialog :deep(.theme-form-item .el-form-item__label) {
  display: inline-flex;
  align-items: center;
  margin-bottom: 10px;
  color: #1f2329;
  font-size: 14px;
  line-height: 22px;
  font-weight: 500;
}

.theme-create-dialog :deep(.theme-form-item.is-required .el-form-item__label::before) {
  margin-right: 4px;
  color: #f54a45;
}

.theme-create-dialog :deep(.theme-form-item .el-input__wrapper) {
  min-height: 36px;
  border-radius: 6px;
  padding: 0 12px;
  box-shadow: 0 0 0 1px #d0d7e2 inset;
}

.theme-create-dialog :deep(.theme-form-item .el-input__inner) {
  height: 36px;
  font-size: 14px;
  line-height: 20px;
}

.theme-create-dialog :deep(.theme-form-item .el-textarea__inner) {
  min-height: 118px !important;
  border-radius: 6px;
  padding: 11px 12px 28px;
  font-size: 14px;
  line-height: 22px;
  box-shadow: 0 0 0 1px #d0d7e2 inset;
}

.theme-create-dialog .theme-create-dialog-counter {
  position: absolute;
  right: 12px;
  bottom: 8px;
  color: #8f959e;
  font-size: 12px;
  line-height: 18px;
  pointer-events: none;
}

.theme-create-dialog .dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.theme-create-dialog .dialog-footer :deep(.el-button) {
  min-width: 82px;
  height: 32px;
  margin: 0;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}
</style>
