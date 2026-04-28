import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from './useHashRoute'

const queryValue = (value: unknown): string => {
  const current = Array.isArray(value) ? value[0] : value
  return typeof current === 'string' ? current : ''
}

const firstValue = (value: unknown): unknown => {
  return Array.isArray(value) ? value[0] : value
}

export type DatasetPermissionTab = 'preview' | 'structure' | 'row' | 'column'

export interface DatasetPermissionSelection {
  id: string
  name: string
}

export type DatasetPermissionSelectionSyncReason = 'matched' | 'missing' | 'invalid' | 'empty'

export interface DatasetPermissionSelectionSyncResult {
  reason: DatasetPermissionSelectionSyncReason
  dataset: DatasetPermissionSelection | null
  invalidDatasetId: string
}

const DATASET_PERMISSION_PAGE_PATH = '/sys-setting/row-column-permission'
const datasetSelectionCache = reactive<Record<string, string>>({})

export const useDatasetPermissionContext = () => {
  const route = useRoute()
  const router = useRouter()

  const datasetId = computed(
    () => String(firstValue(route.params.datasetId) || firstValue(route.query.datasetId) || '')
  )
  const datasetName = computed(
    () => queryValue(route.query.datasetName) || datasetSelectionCache[datasetId.value] || ''
  )
  const activeTab = computed<DatasetPermissionTab>(() => {
    const tab = queryValue(route.query.tab)
    if (tab === 'preview' || tab === 'structure' || tab === 'row' || tab === 'column') {
      return tab
    }
    return 'row'
  })
  const hasDataset = computed(() => !!datasetId.value)
  const invalidContext = computed(() => !hasDataset.value)

  const buildPermissionQuery = (
    overrides: Partial<{
      datasetId: string
      datasetName: string
      tab: DatasetPermissionTab
    }> = {}
  ) => {
    const nextQuery = { ...route.query } as Record<string, unknown>
    const nextDatasetId = overrides.datasetId ?? datasetId.value
    const nextDatasetName = overrides.datasetName ?? datasetName.value
    const nextTab = overrides.tab ?? activeTab.value

    nextQuery.tab = nextTab
    delete nextQuery.sheet
    delete nextQuery.mode

    if (nextDatasetId) {
      nextQuery.datasetId = nextDatasetId
    } else {
      delete nextQuery.datasetId
    }

    if (nextDatasetName) {
      nextQuery.datasetName = nextDatasetName
    } else {
      delete nextQuery.datasetName
    }

    return nextQuery
  }

  watch(
    () => route.query.tab,
    async tab => {
      if (tab === 'preview' || tab === 'structure' || tab === 'row' || tab === 'column') {
        return
      }
      await router.replace({
        path: DATASET_PERMISSION_PAGE_PATH,
        query: buildPermissionQuery({ tab: activeTab.value })
      })
    },
    { immediate: true }
  )

  const setActiveTab = (tab: DatasetPermissionTab) => {
    if (activeTab.value === tab) {
      return Promise.resolve()
    }
    const nextQuery = buildPermissionQuery({ tab })
    delete nextQuery.dialog
    delete nextQuery.mask
    return router.replace({ path: DATASET_PERMISSION_PAGE_PATH, query: nextQuery })
  }

  const setSelectedDataset = (
    selection: DatasetPermissionSelection,
    options?: { replace?: boolean; preserveDialogState?: boolean }
  ) => {
    const replace = options?.replace === true
    const preserveDialogState = options?.preserveDialogState === true
    if (
      datasetId.value === selection.id &&
      datasetName.value === selection.name &&
      route.path === DATASET_PERMISSION_PAGE_PATH
    ) {
      return Promise.resolve()
    }
    if (selection.id && selection.name) {
      datasetSelectionCache[selection.id] = selection.name
    }
    const nextQuery = buildPermissionQuery({
      datasetId: selection.id,
      datasetName: selection.name
    })
    if (!preserveDialogState) {
      delete nextQuery.dialog
      delete nextQuery.mask
    }
    return replace
      ? router.replace({ path: DATASET_PERMISSION_PAGE_PATH, query: nextQuery })
      : router.push({ path: DATASET_PERMISSION_PAGE_PATH, query: nextQuery })
  }

  const syncDatasetSelection = async (
    datasets: DatasetPermissionSelection[]
  ): Promise<DatasetPermissionSelectionSyncResult> => {
    if (!datasets.length) {
      const nextQuery = buildPermissionQuery({
        datasetId: '',
        datasetName: ''
      })
      delete nextQuery.dialog
      delete nextQuery.mask
      if (datasetId.value || datasetName.value || route.path !== DATASET_PERMISSION_PAGE_PATH) {
        await router.replace({ path: DATASET_PERMISSION_PAGE_PATH, query: nextQuery })
      }
      return {
        reason: 'empty',
        dataset: null,
        invalidDatasetId: datasetId.value
      }
    }

    const matchedDataset = datasets.find(item => item.id === datasetId.value) || null
    if (matchedDataset) {
      datasetSelectionCache[matchedDataset.id] = matchedDataset.name
      if (datasetName.value !== matchedDataset.name || route.path !== DATASET_PERMISSION_PAGE_PATH) {
        await setSelectedDataset(matchedDataset, {
          replace: true,
          preserveDialogState: true
        })
      }
      return {
        reason: 'matched',
        dataset: matchedDataset,
        invalidDatasetId: ''
      }
    }

    const fallbackDataset = datasets[0]
    const reason: DatasetPermissionSelectionSyncReason = datasetId.value ? 'invalid' : 'missing'
    const invalidDatasetId = datasetId.value
    await setSelectedDataset(fallbackDataset, { replace: true })
    return {
      reason,
      dataset: fallbackDataset,
      invalidDatasetId
    }
  }

  const backToResources = () =>
    router.push({ path: '/sys-setting/query-config', query: { tab: 'query_resources' } })

  return {
    datasetId,
    datasetName,
    activeTab,
    setActiveTab,
    setSelectedDataset,
    syncDatasetSelection,
    hasDataset,
    invalidContext,
    backToResources
  }
}
