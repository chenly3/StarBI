import { computed, onMounted, reactive, ref, toRefs, watch } from 'vue'
import { getDatasetDetails } from '@/api/dataset'
import { getDatasetTree, getDsTree, listDatasourceTables, previewData } from '@/api/datasource'
import {
  getRuntimeDatasources,
  listAIQueryThemes,
  type AIQueryTheme,
  type RuntimeDatasource
} from '@/api/aiQueryTheme'
import { useCache } from '@/hooks/web/useCache'
import { fetchRuntimeModels, type RuntimeQueryModelOption } from '@/views/sqlbot/sqlbotDirect'
import {
  buildFileFieldMetas,
  getDimensionFieldNames,
  getMetricFieldNames,
  uniqueFieldNames as uniqueFileFieldNames
} from './fileFieldMeta'
import { SQLBOT_NEW_DIALOG_TABS, SQLBOT_NEW_SOURCE_KINDS } from './types'
import type {
  DatasetCardItem,
  DialogTab,
  FileCardItem,
  FileFieldMeta,
  SqlbotNewExecutionContext,
  SqlbotNewSelectionChange,
  SqlbotNewSelectionSnapshot,
  SqlbotNewSelectionState,
  SqlbotNewThemeTab,
  SourceKind
} from './types'

interface DatasetTreeItem {
  id: string
  name: string
  leaf?: boolean
  children?: DatasetTreeItem[]
}

const UPLOADED_FILE_STORAGE_KEY = 'STARBI-QUERY-UPLOADED-FILES'
const FILE_ID_STORAGE_KEY = 'STARBI-QUERY-FILE-ID'
const COMBINATION_ID_STORAGE_KEY = 'STARBI-QUERY-COMBINATION-ID'
const COMBINATION_NAME_STORAGE_KEY = 'STARBI-QUERY-COMBINATION-NAME'
const DATASET_TONES: DatasetCardItem['tone'][] = ['blue', 'green', 'purple', 'orange']
const HOME_DATASET_DETAIL_PRELOAD_COUNT = 5

const METRIC_FIELD_PATTERNS = [
  '金额',
  '收入',
  '利润',
  '成本',
  '单价',
  '数量',
  '次数',
  'count',
  'amount',
  'price',
  'profit',
  'cost',
  'sales'
]

const DIMENSION_FIELD_PATTERNS = [
  '日期',
  '时间',
  '地区',
  '区域',
  '省份',
  '城市',
  '客户',
  '用户',
  '名称',
  '类型',
  '编号',
  'id',
  'date',
  'time',
  'name',
  'region',
  'city',
  'customer'
]

const normalizeOptionalId = (value: unknown) => {
  const normalized = String(value ?? '').trim()
  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    return ''
  }
  return normalized
}

const normalizeOptionalIdList = (...values: unknown[]) => {
  for (const value of values) {
    if (!Array.isArray(value)) {
      continue
    }
    return [...new Set(value.map(item => normalizeOptionalId(item)).filter(Boolean))]
  }
  return [] as string[]
}

const areSameIdLists = (left: unknown, right: unknown) => {
  const leftIds = normalizeOptionalIdList(left)
  const rightIds = normalizeOptionalIdList(right)

  if (leftIds.length !== rightIds.length) {
    return false
  }

  return leftIds.every((id, index) => id === rightIds[index])
}

const normalizeTree = (nodes: any[] = []) => {
  const normalized = nodes.map(node => ({
    ...node,
    id: String(node.id),
    name: String(node.name || ''),
    children: node.children?.length ? normalizeTree(node.children) : []
  }))

  if (normalized.length === 1 && normalized[0].id === '0') {
    return normalized[0].children || []
  }

  return normalized
}

const normalizeDatasetTree = (nodes: any[] = []): DatasetTreeItem[] => {
  return normalizeTree(nodes).map(node => ({
    id: String(node.id),
    name: node.name,
    leaf: Boolean(node.leaf),
    children: node.children?.length ? normalizeDatasetTree(node.children) : []
  }))
}

const inferDatasetFields = (name: string, parents: string[]) => {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('销售') || lowerName.includes('sale')) {
    return ['订单ID', '销售额', '店铺', '订单日期']
  }
  if (lowerName.includes('用户') || lowerName.includes('member')) {
    return ['用户ID', '行为时间', '渠道', '页面路径']
  }
  if (lowerName.includes('财务') || lowerName.includes('finance')) {
    return ['会计期间', '收入', '成本', '利润']
  }
  if (lowerName.includes('gdp') || lowerName.includes('地区')) {
    return ['地区', '年份', 'GDP', '同比增速']
  }

  return [...new Set([...parents.slice(-2), '维度', '指标', '时间'])].slice(0, 4)
}

const buildDatasetBadge = (parents: string[]) => {
  if (!parents.length) {
    return '数据集'
  }
  return parents[parents.length - 1].slice(0, 4) || '数据集'
}

const normalizeFieldLabel = (value: unknown) => String(value || '').trim()

const matchesFieldPatterns = (field: string, patterns: string[]) => {
  const lowered = field.toLowerCase()
  return patterns.some(pattern => lowered.includes(pattern.toLowerCase()))
}

const inferMetricFields = (fields: string[]) => {
  return fields.filter(field => matchesFieldPatterns(field, METRIC_FIELD_PATTERNS))
}

const inferDimensionFields = (fields: string[]) => {
  return fields.filter(field => matchesFieldPatterns(field, DIMENSION_FIELD_PATTERNS))
}

const normalizeDatasetFieldName = (field: Record<string, any>) => {
  return normalizeFieldLabel(field?.name || field?.originName || field?.fieldName)
}

const uniqueFieldNames = (fields: string[]) => {
  return [...new Set(fields.map(normalizeFieldLabel).filter(Boolean))]
}

const extractRuntimeDatasourceFieldNames = (datasourceList: RuntimeDatasource[]) => {
  return uniqueFieldNames(
    datasourceList.flatMap(datasource =>
      (datasource.tables || []).flatMap(table =>
        (table.fields || []).map(field => field.comment || field.dataeaseName || field.name || '')
      )
    )
  )
}

const extractDatasetDetailFieldNames = (allFields: Record<string, any>[] = []) => {
  return uniqueFieldNames(allFields.map(field => normalizeDatasetFieldName(field)))
}

const extractDatasetDetailMetricNames = (allFields: Record<string, any>[] = []) => {
  const quotaFields = allFields
    .filter(field => String(field?.groupType || '').toLowerCase() === 'q')
    .map(field => normalizeDatasetFieldName(field))
  const fallback = inferMetricFields(extractDatasetDetailFieldNames(allFields))
  return uniqueFieldNames(quotaFields.length ? quotaFields : fallback)
}

const extractDatasetDetailDimensionNames = (allFields: Record<string, any>[] = []) => {
  const dimensionFields = allFields
    .filter(field => String(field?.groupType || '').toLowerCase() === 'd')
    .map(field => normalizeDatasetFieldName(field))
  const fallback = inferDimensionFields(extractDatasetDetailFieldNames(allFields))
  return uniqueFieldNames(dimensionFields.length ? dimensionFields : fallback)
}

const extractDatasetDetailDatasourceId = (allFields: Record<string, any>[] = []) => {
  for (const field of allFields) {
    const datasourceId = normalizeOptionalId(
      field?.datasourceId || field?.dataSourceId || field?.dsId || field?.sourceId
    )
    if (datasourceId) {
      return datasourceId
    }
  }
  return ''
}

const readUploadedFileItems = (wsCache: ReturnType<typeof useCache>['wsCache']): FileCardItem[] => {
  const raw = wsCache.get(UPLOADED_FILE_STORAGE_KEY)
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map(item => {
      const fieldMetas = Array.isArray(item?.fieldMetas)
        ? item.fieldMetas
            .map(field => {
              const name = normalizeFieldLabel(field?.name)
              if (!name) {
                return null
              }
              return {
                name,
                kind:
                  field?.kind === 'number' || field?.kind === 'date' || field?.kind === 'text'
                    ? field.kind
                    : 'text',
                fieldType: typeof field?.fieldType === 'string' ? field.fieldType : undefined,
                deType: typeof field?.deType === 'number' ? field.deType : undefined,
                deExtractType:
                  typeof field?.deExtractType === 'number' ? field.deExtractType : undefined
              } satisfies FileFieldMeta
            })
            .filter((field): field is FileFieldMeta => Boolean(field))
        : []
      const fields = Array.isArray(item?.fields)
        ? item.fields.map(field => String(field)).filter(Boolean)
        : []
      const normalizedFields = uniqueFileFieldNames(
        fieldMetas.length ? fieldMetas.map(field => field.name) : fields
      )

      const fileItem: FileCardItem = {
        id: normalizeOptionalId(item?.id),
        title: String(item?.title || ''),
        uploadedAt: String(item?.uploadedAt || ''),
        format: item?.format === 'CSV' ? 'CSV' : 'Excel',
        datasourceId: normalizeOptionalId(item?.datasourceId || item?.id),
        pending: false,
        fields: normalizedFields,
        fieldMetas,
        metricFields: uniqueFileFieldNames(
          Array.isArray(item?.metricFields) && item.metricFields.length
            ? item.metricFields.map(field => String(field))
            : getMetricFieldNames(fieldMetas)
        ),
        dimensionFields: uniqueFileFieldNames(
          Array.isArray(item?.dimensionFields) && item.dimensionFields.length
            ? item.dimensionFields.map(field => String(field))
            : getDimensionFieldNames(fieldMetas)
        ),
        fieldsLoaded:
          typeof item?.fieldsLoaded === 'boolean' ? item.fieldsLoaded : fieldMetas.length > 0
      }
      return fileItem
    })
    .filter((item): item is FileCardItem => Boolean(item.id && item.title && item.datasourceId))
}

const resolveFileLookupKey = (file?: Partial<FileCardItem> | null) => {
  return normalizeOptionalId(file?.datasourceId || file?.id)
}

const isSameExecutionSource = (
  left: SqlbotNewExecutionContext,
  right: SqlbotNewExecutionContext
) => {
  const leftSourceId = normalizeOptionalId(left.sourceId)
  const rightSourceId = normalizeOptionalId(right.sourceId)
  const leftSourceIds = normalizeOptionalIdList(left.sourceIds)
  const rightSourceIds = normalizeOptionalIdList(right.sourceIds)
  const leftCombinationId = normalizeOptionalId(left.combinationId)
  const rightCombinationId = normalizeOptionalId(right.combinationId)

  if (left.queryMode !== right.queryMode || leftSourceId !== rightSourceId) {
    return false
  }

  if (
    (leftSourceIds.length || rightSourceIds.length) &&
    !areSameIdLists(leftSourceIds, rightSourceIds)
  ) {
    return false
  }

  if ((leftCombinationId || rightCombinationId) && leftCombinationId !== rightCombinationId) {
    return false
  }

  const leftDatasourceId = normalizeOptionalId(left.datasourceId)
  const rightDatasourceId = normalizeOptionalId(right.datasourceId)

  if (left.queryMode === SQLBOT_NEW_SOURCE_KINDS.dataset) {
    const leftDatasourcePending = Boolean(left.datasourcePending)
    const rightDatasourcePending = Boolean(right.datasourcePending)

    if (leftDatasourceId && rightDatasourceId) {
      return leftDatasourceId === rightDatasourceId
    }

    if (!leftDatasourceId || !rightDatasourceId) {
      return (
        !leftDatasourceId && !rightDatasourceId && leftDatasourcePending === rightDatasourcePending
      )
    }
  }

  return (
    normalizeOptionalId(leftDatasourceId || leftSourceId) ===
    normalizeOptionalId(rightDatasourceId || rightSourceId)
  )
}

interface SelectDialogBaseline {
  selectionState: SqlbotNewSelectionState
  runtimeState: {
    datasetDatasourceId: string
    fileDatasourceId: string
    datasetDatasourcePending: boolean
    datasetDatasourceLoading: boolean
  }
  datasetDatasourceOptions: RuntimeDatasource[]
}

export const useSqlbotNewSelection = () => {
  const { wsCache } = useCache('localStorage')

  const selectionState = reactive<SqlbotNewSelectionState>({
    themeId: '',
    sourceKind: SQLBOT_NEW_SOURCE_KINDS.dataset,
    datasetId: '',
    fileId: '',
    sourceIds: [],
    combinationId: '',
    combinationName: '',
    modelId: ''
  })

  const runtimeState = reactive({
    datasetDatasourceId: '',
    fileDatasourceId: '',
    datasetDatasourcePending: false,
    datasetDatasourceLoading: false,
    initialized: false,
    restoring: false
  })

  const dialogState = reactive({
    selectDialogVisible: false,
    uploadDialogVisible: false,
    fileDetailVisible: false,
    selectDialogTab: SQLBOT_NEW_DIALOG_TABS.dataset as DialogTab,
    detailFileId: '',
    datasetKeyword: '',
    fileKeyword: ''
  })

  const selectionLoading = ref(false)
  const datasetTree = ref<DatasetTreeItem[]>([])
  const datasourceTree = ref<any[]>([])
  const runtimeModels = ref<RuntimeQueryModelOption[]>([])
  const runtimeDefaultModelId = ref('')
  const runtimeThemes = ref<AIQueryTheme[]>([])
  const datasetDatasourceOptions = ref<RuntimeDatasource[]>([])
  const uploadedFileItems = ref<FileCardItem[]>([])
  const datasetDetailLookup = ref<Record<string, Record<string, any>>>({})
  const datasetFieldLookup = ref<Record<string, string[]>>({})
  const datasetFieldsLoadedLookup = ref<Record<string, boolean>>({})
  const datasetMetricLookup = ref<Record<string, string[]>>({})
  const datasetDimensionLookup = ref<Record<string, string[]>>({})
  const datasetDatasourceLookup = ref<Record<string, string>>({})
  const datasetDetailLoadingMap = ref<Record<string, boolean>>({})
  const fileFieldLookup = ref<Record<string, FileFieldMeta[]>>({})
  const fileMetricLookup = ref<Record<string, string[]>>({})
  const fileDimensionLookup = ref<Record<string, string[]>>({})
  const fileDetailLoadingMap = ref<Record<string, boolean>>({})
  const selectDialogBaseline = ref<SelectDialogBaseline | null>(null)
  const skipNextDatasetDatasourceReload = ref(false)
  let datasetDatasourceRequestToken = 0

  const baseDatasetItems = computed<DatasetCardItem[]>(() => {
    const bucket: DatasetCardItem[] = []

    const walk = (nodes: DatasetTreeItem[] = [], parents: string[] = []) => {
      nodes.forEach(node => {
        if (node.leaf) {
          const resolvedFields = datasetFieldLookup.value[node.id]
          const fieldsLoaded = Boolean(datasetFieldsLoadedLookup.value[node.id])
          const metricFields = datasetMetricLookup.value[node.id] || []
          const dimensionFields = datasetDimensionLookup.value[node.id] || []
          const displayFields = resolvedFields?.length
            ? resolvedFields
            : inferDatasetFields(node.name, parents)
          bucket.push({
            id: node.id,
            title: node.name,
            tone: DATASET_TONES[bucket.length % DATASET_TONES.length],
            badge: buildDatasetBadge(parents),
            fields: displayFields,
            fieldsLoaded,
            metricFields: uniqueFieldNames(
              metricFields.length ? metricFields : inferMetricFields(displayFields)
            ),
            dimensionFields: uniqueFieldNames(
              dimensionFields.length ? dimensionFields : inferDimensionFields(displayFields)
            )
          })
          return
        }

        const nextParents = node.name ? [...parents, node.name] : parents
        if (node.children?.length) {
          walk(node.children, nextParents)
        }
      })
    }

    walk(datasetTree.value)
    return bucket
  })

  const themeTabs = computed<SqlbotNewThemeTab[]>(() => {
    const availableThemes = runtimeThemes.value
      .filter(theme => theme.status !== false)
      .map(theme => ({
        id: theme.id,
        name: theme.name,
        description: theme.description || '',
        datasetIds: (theme.datasetIds || []).map(item => String(item)).filter(Boolean),
        defaultDatasetIds: (theme.defaultDatasetIds || [])
          .map(item => String(item))
          .filter(Boolean),
        datasetCount: theme.datasetCount || theme.datasets?.length || theme.datasetIds?.length || 0,
        recommendedQuestions: Array.isArray(theme.recommendedQuestions)
          ? theme.recommendedQuestions.map(item => String(item)).filter(Boolean)
          : []
      }))
      .filter(theme => theme.datasetIds.length > 0)

    return [
      {
        id: '',
        name: '全部',
        description: '',
        datasetIds: [],
        defaultDatasetIds: [],
        datasetCount: baseDatasetItems.value.length,
        recommendedQuestions: []
      },
      ...availableThemes
    ]
  })

  const activeTheme = computed<SqlbotNewThemeTab>(() => {
    return themeTabs.value.find(theme => theme.id === selectionState.themeId) || themeTabs.value[0]
  })

  const themeScopedDatasetItems = computed<DatasetCardItem[]>(() => {
    if (!selectionState.themeId) {
      return baseDatasetItems.value
    }

    const datasetIds = new Set(activeTheme.value?.datasetIds || [])
    return baseDatasetItems.value.filter(item => datasetIds.has(item.id))
  })

  const builtinFileItems = computed<FileCardItem[]>(() => {
    const bucket: FileCardItem[] = []

    const walk = (nodes: any[] = []) => {
      nodes.forEach(node => {
        const datasourceType = String(node.type || '')
        const isFileDatasource = Boolean(node.leaf) && /(excel|csv)/i.test(datasourceType)

        if (isFileDatasource) {
          const lookupKey = normalizeOptionalId(node.id)
          const fieldMetas = fileFieldLookup.value[lookupKey] || []
          bucket.push({
            id: String(node.id),
            title: String(node.name || ''),
            uploadedAt: '',
            format: /csv/i.test(datasourceType) ? 'CSV' : 'Excel',
            datasourceId: String(node.id),
            pending: false,
            fields: fieldMetas.length
              ? fieldMetas.map(field => field.name)
              : uniqueFileFieldNames(fileDimensionLookup.value[lookupKey] || []),
            fieldMetas,
            metricFields: fileMetricLookup.value[lookupKey] || [],
            dimensionFields: fileDimensionLookup.value[lookupKey] || [],
            fieldsLoaded: fieldMetas.length > 0
          })
        }

        if (node.children?.length) {
          walk(node.children)
        }
      })
    }

    walk(datasourceTree.value)
    return bucket
  })

  const mergeFileMetadata = (item: FileCardItem) => {
    const lookupKey = resolveFileLookupKey(item)
    const fieldMetas = lookupKey ? fileFieldLookup.value[lookupKey] || item.fieldMetas || [] : []
    const metricFields = lookupKey
      ? fileMetricLookup.value[lookupKey] || item.metricFields || []
      : item.metricFields || []
    const dimensionFields = lookupKey
      ? fileDimensionLookup.value[lookupKey] || item.dimensionFields || []
      : item.dimensionFields || []
    const fields = uniqueFileFieldNames(
      fieldMetas.length
        ? fieldMetas.map(field => field.name)
        : item.fields?.length
        ? item.fields
        : [...dimensionFields, ...metricFields]
    )

    return {
      ...item,
      fields,
      fieldMetas,
      metricFields,
      dimensionFields,
      fieldsLoaded: item.fieldsLoaded || fieldMetas.length > 0
    }
  }

  const baseFileItems = computed<FileCardItem[]>(() => {
    const merged = new Map<string, FileCardItem>()
    const bucket: FileCardItem[] = []

    uploadedFileItems.value.forEach(item => {
      if (!merged.has(item.id)) {
        const normalizedItem = mergeFileMetadata(item)
        merged.set(item.id, normalizedItem)
        bucket.push(normalizedItem)
      }
    })

    builtinFileItems.value.forEach(item => {
      if (!merged.has(item.id)) {
        const normalizedItem = mergeFileMetadata(item)
        merged.set(item.id, normalizedItem)
        bucket.push(normalizedItem)
      }
    })

    return bucket
  })

  const normalizeKeyword = (value: string) => value.trim().toLowerCase()

  const datasetItems = computed<DatasetCardItem[]>(() => {
    const keyword = normalizeKeyword(dialogState.datasetKeyword)
    if (!keyword) {
      return themeScopedDatasetItems.value
    }

    return themeScopedDatasetItems.value.filter(item => {
      const haystacks = [
        item.title,
        item.badge,
        ...item.fields,
        ...(item.metricFields || []),
        ...(item.dimensionFields || [])
      ]
      return haystacks.some(entry =>
        String(entry || '')
          .toLowerCase()
          .includes(keyword)
      )
    })
  })

  const fileItems = computed(() => {
    const keyword = normalizeKeyword(dialogState.fileKeyword)
    if (!keyword) {
      return baseFileItems.value
    }

    return baseFileItems.value.filter(item => {
      const haystacks = [item.title, item.format, item.uploadedAt, ...item.fields]
      return haystacks.some(entry =>
        String(entry || '')
          .toLowerCase()
          .includes(keyword)
      )
    })
  })

  const selectedFileItem = computed(() => {
    if (!selectionState.fileId) {
      return null
    }
    return baseFileItems.value.find(item => item.id === selectionState.fileId) || null
  })

  const selectedFileLookupKey = computed(() => {
    return resolveFileLookupKey(selectedFileItem.value) || runtimeState.fileDatasourceId
  })

  const activeSelectionFields = computed(() => {
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file) {
      const lookupKey = selectedFileLookupKey.value
      const cachedFields = lookupKey
        ? (fileFieldLookup.value[lookupKey] || []).map(field => field.name)
        : []
      if (cachedFields.length) {
        return cachedFields
      }
      return (selectedFileItem.value?.fields || []).map(normalizeFieldLabel).filter(Boolean)
    }
    const cachedFields = selectionState.datasetId
      ? datasetFieldLookup.value[selectionState.datasetId] || []
      : []
    if (cachedFields.length) {
      return cachedFields
    }
    return (selectedDatasetItem.value?.fields || []).map(normalizeFieldLabel).filter(Boolean)
  })

  const selectedMetricFields = computed(() => {
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file) {
      const lookupKey = selectedFileLookupKey.value
      const hasCachedFields = Boolean(lookupKey && lookupKey in fileMetricLookup.value)
      if (hasCachedFields) {
        return fileMetricLookup.value[lookupKey] || []
      }
      if (selectedFileItem.value?.fieldsLoaded) {
        return selectedFileItem.value.metricFields || []
      }
    }
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.dataset && selectionState.datasetId) {
      const cachedFields = datasetMetricLookup.value[selectionState.datasetId] || []
      if (cachedFields.length) {
        return cachedFields
      }
    }
    const fields = activeSelectionFields.value
    const inferred = inferMetricFields(fields)
    if (inferred.length) {
      return inferred
    }
    return fields
  })

  const selectedDimensionFields = computed(() => {
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file) {
      const lookupKey = selectedFileLookupKey.value
      const hasCachedFields = Boolean(lookupKey && lookupKey in fileDimensionLookup.value)
      if (hasCachedFields) {
        return fileDimensionLookup.value[lookupKey] || []
      }
      if (selectedFileItem.value?.fieldsLoaded) {
        return selectedFileItem.value.dimensionFields || []
      }
    }
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.dataset && selectionState.datasetId) {
      const cachedFields = datasetDimensionLookup.value[selectionState.datasetId] || []
      if (cachedFields.length) {
        return cachedFields
      }
    }
    const fields = activeSelectionFields.value
    const inferred = inferDimensionFields(fields)
    const fallback = fields.filter(item => !selectedMetricFields.value.includes(item))
    return inferred.length ? inferred : fallback
  })

  const selectedRuntimeDatasource = computed(() => {
    return (
      datasetDatasourceOptions.value.find(
        item => normalizeOptionalId(item.id) === runtimeState.datasetDatasourceId
      ) || null
    )
  })

  const datasetDatasourceDebug = computed(() => {
    return {
      count: datasetDatasourceOptions.value.length,
      activeId: runtimeState.datasetDatasourceId,
      activeName: selectedRuntimeDatasource.value?.name || '',
      preferredId: datasetDatasourceLookup.value[selectionState.datasetId] || '',
      options: datasetDatasourceOptions.value.map(item => ({
        id: normalizeOptionalId(item.id),
        name: String(item.name || '')
      }))
    }
  })

  const isAvailableRuntimeModelId = (modelId: unknown) => {
    const normalizedModelId = normalizeOptionalId(modelId)
    return Boolean(
      normalizedModelId && runtimeModels.value.some(item => item.id === normalizedModelId)
    )
  }

  const resolveRestoredModelId = (modelId?: string) => {
    const normalizedModelId = normalizeOptionalId(modelId)
    if (!runtimeModels.value.length && !runtimeDefaultModelId.value) {
      if (normalizedModelId) {
        return normalizedModelId
      }
      const cachedModelId = normalizeOptionalId(wsCache.get('STARBI-QUERY-MODEL-ID'))
      return cachedModelId
    }

    if (isAvailableRuntimeModelId(modelId)) {
      return normalizeOptionalId(modelId)
    }
    if (isAvailableRuntimeModelId(selectionState.modelId)) {
      return normalizeOptionalId(selectionState.modelId)
    }
    if (isAvailableRuntimeModelId(runtimeDefaultModelId.value)) {
      return normalizeOptionalId(runtimeDefaultModelId.value)
    }
    return normalizeOptionalId(runtimeModels.value[0]?.id)
  }

  const ensureRuntimeModelReady = async () => {
    if (selectionState.modelId) {
      return resolveRestoredModelId(selectionState.modelId)
    }

    await loadRuntimeModels()
    if (selectionState.modelId) {
      return resolveRestoredModelId(selectionState.modelId)
    }

    const cachedModelId = normalizeOptionalId(wsCache.get('STARBI-QUERY-MODEL-ID'))
    if (cachedModelId) {
      selectionState.modelId = cachedModelId
      return cachedModelId
    }

    return ''
  }

  const activeSourceTitle = computed(() => {
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file) {
      return selectedFileItem.value?.title || '未选择文件'
    }

    if (selectionState.combinationName) {
      return selectionState.combinationName
    }

    if (selectedDatasetIds.value.length > 1) {
      const titles = getDatasetTitlesByIds(selectedDatasetIds.value)
      if (titles.length > 1) {
        return `${titles[0]} 等 ${titles.length} 个数据集`
      }
      if (titles.length === 1) {
        return titles[0]
      }
    }

    return (
      baseDatasetItems.value.find(item => item.id === selectionState.datasetId)?.title ||
      (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.datasetCombination
        ? '未选择组合数据集'
        : '未选择数据集')
    )
  })

  const activeSourceModeLabel = computed(() => {
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file) {
      return '数据文件问数'
    }
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.datasetCombination) {
      return '组合数据集问数'
    }
    return '数据集问数'
  })

  const currentSelectionTitle = computed(() => {
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file) {
      return selectedFileItem.value?.title || ''
    }

    if (selectionState.combinationName) {
      return selectionState.combinationName
    }

    if (selectedDatasetIds.value.length > 1) {
      const titles = getDatasetTitlesByIds(selectedDatasetIds.value)
      if (titles.length > 1) {
        return `${titles[0]} 等 ${titles.length} 个数据集`
      }
      if (titles.length === 1) {
        return titles[0]
      }
    }

    return selectedDatasetItem.value?.title || ''
  })

  const activeModelLabel = computed(() => {
    const resolvedModelId = resolveRestoredModelId(selectionState.modelId)
    const resolvedModel = runtimeModels.value.find(item => item.id === resolvedModelId)
    if (resolvedModel?.name) {
      return resolvedModel.name
    }
    if (selectionLoading.value) {
      return '模型加载中'
    }
    return '默认模型'
  })

  const activeDatasourceLabel = computed(() => {
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file) {
      return ''
    }
    if (selectedRuntimeDatasource.value?.name) {
      return runtimeState.datasetDatasourcePending
        ? `${selectedRuntimeDatasource.value.name}（待确认）`
        : selectedRuntimeDatasource.value.name
    }
    if (runtimeState.datasetDatasourcePending) {
      return '多数据源待确认'
    }
    if (runtimeState.datasetDatasourceLoading) {
      return '数据源解析中'
    }
    return ''
  })

  const currentSelectionMeta = computed(() => {
    if (!currentSelectionTitle.value) {
      return ''
    }
    return getSelectionMeta(selectionState.sourceKind)
  })

  const hasActiveSelection = computed(() => Boolean(currentSelectionTitle.value))

  const detailFile = computed(() => {
    return baseFileItems.value.find(item => item.id === dialogState.detailFileId) || null
  })

  const selectedDatasetItem = computed(() => {
    if (!selectionState.datasetId) {
      return null
    }
    return baseDatasetItems.value.find(item => item.id === selectionState.datasetId) || null
  })

  const selectedFileDatasource = computed(() => {
    return selectedFileItem.value
  })

  const getDatasetTitlesByIds = (datasetIds: string[]) => {
    const titleMap = new Map(baseDatasetItems.value.map(item => [item.id, item.title]))
    return datasetIds.map(id => titleMap.get(id) || '').filter(Boolean)
  }

  const selectedDatasetIds = computed(() => normalizeOptionalIdList(selectionState.sourceIds))

  const executionContext = computed<SqlbotNewExecutionContext>(() => {
    const isFileMode = selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file
    const sourceId = isFileMode ? selectionState.fileId : selectionState.datasetId
    const sourceIds = isFileMode ? [] : selectedDatasetIds.value
    const datasourceId = isFileMode
      ? normalizeOptionalId(
          selectedFileDatasource.value?.datasourceId || runtimeState.fileDatasourceId
        )
      : runtimeState.datasetDatasourceId

    return {
      themeId: selectionState.themeId,
      themeName: activeTheme.value?.name || '',
      queryMode: selectionState.sourceKind,
      sourceId,
      sourceIds,
      combinationId: isFileMode ? '' : normalizeOptionalId(selectionState.combinationId),
      combinationName: isFileMode ? '' : String(selectionState.combinationName || ''),
      datasourceId,
      modelId: resolveRestoredModelId(selectionState.modelId),
      datasourcePending: isFileMode
        ? !datasourceId
        : runtimeState.datasetDatasourcePending || runtimeState.datasetDatasourceLoading
    }
  })

  const createSelectionSnapshot = (): SqlbotNewSelectionSnapshot => ({
    executionContext: {
      ...executionContext.value,
      sourceIds: [...(executionContext.value.sourceIds || [])]
    },
    selectionTitle: currentSelectionTitle.value,
    selectionMeta: currentSelectionMeta.value
  })

  const committedSelection = ref<SqlbotNewSelectionSnapshot>({
    executionContext: { ...executionContext.value },
    selectionTitle: '',
    selectionMeta: ''
  })

  const commitSelectionSnapshot = () => {
    committedSelection.value = createSelectionSnapshot()
  }

  const captureSelectDialogBaseline = () => {
    if (selectDialogBaseline.value) {
      return
    }

    selectDialogBaseline.value = {
      selectionState: { ...selectionState },
      runtimeState: {
        datasetDatasourceId: runtimeState.datasetDatasourceId,
        fileDatasourceId: runtimeState.fileDatasourceId,
        datasetDatasourcePending: runtimeState.datasetDatasourcePending,
        datasetDatasourceLoading: runtimeState.datasetDatasourceLoading
      },
      datasetDatasourceOptions: datasetDatasourceOptions.value.map(item => ({ ...item }))
    }
  }

  const clearSelectDialogBaseline = () => {
    selectDialogBaseline.value = null
  }

  const invalidateDatasetDatasourceRequests = () => {
    datasetDatasourceRequestToken += 1
  }

  const restoreSelectDialogBaseline = () => {
    if (!selectDialogBaseline.value) {
      return
    }

    const baseline = selectDialogBaseline.value
    invalidateDatasetDatasourceRequests()
    runtimeState.restoring = true

    try {
      selectionState.themeId = baseline.selectionState.themeId
      selectionState.sourceKind = baseline.selectionState.sourceKind
      selectionState.datasetId = baseline.selectionState.datasetId
      selectionState.fileId = baseline.selectionState.fileId
      selectionState.sourceIds = [...(baseline.selectionState.sourceIds || [])]
      selectionState.combinationId = baseline.selectionState.combinationId || ''
      selectionState.combinationName = baseline.selectionState.combinationName || ''
      selectionState.modelId = baseline.selectionState.modelId
      runtimeState.datasetDatasourceId = baseline.runtimeState.datasetDatasourceId
      runtimeState.fileDatasourceId = baseline.runtimeState.fileDatasourceId
      runtimeState.datasetDatasourcePending = baseline.runtimeState.datasetDatasourcePending
      runtimeState.datasetDatasourceLoading = baseline.runtimeState.datasetDatasourceLoading
      datasetDatasourceOptions.value = baseline.datasetDatasourceOptions.map(item => ({ ...item }))
    } finally {
      runtimeState.restoring = false
    }
  }

  const ensureDatasetDetailLoaded = async (datasetId: string) => {
    const normalizedDatasetId = normalizeOptionalId(datasetId)
    if (!normalizedDatasetId || datasetDetailLoadingMap.value[normalizedDatasetId]) {
      return
    }
    if (datasetFieldsLoadedLookup.value[normalizedDatasetId]) {
      return
    }
    if (
      datasetFieldLookup.value[normalizedDatasetId]?.length &&
      datasetMetricLookup.value[normalizedDatasetId]?.length +
        datasetDimensionLookup.value[normalizedDatasetId]?.length >
        0
    ) {
      return
    }

    datasetDetailLoadingMap.value = {
      ...datasetDetailLoadingMap.value,
      [normalizedDatasetId]: true
    }

    try {
      const detail = await getDatasetDetails(normalizedDatasetId)
      const allFields = Array.isArray(detail?.allFields) ? detail.allFields : []
      const fieldNames = extractDatasetDetailFieldNames(allFields)
      const metricNames = extractDatasetDetailMetricNames(allFields)
      const dimensionNames = extractDatasetDetailDimensionNames(allFields)
      const datasourceId = extractDatasetDetailDatasourceId(allFields)

      datasetDetailLookup.value = {
        ...datasetDetailLookup.value,
        [normalizedDatasetId]:
          detail && typeof detail === 'object'
            ? {
                ...detail
              }
            : {}
      }
      datasetFieldLookup.value = {
        ...datasetFieldLookup.value,
        [normalizedDatasetId]: fieldNames.length
          ? fieldNames
          : inferDatasetFields(detail?.name || '', [])
      }
      datasetFieldsLoadedLookup.value = {
        ...datasetFieldsLoadedLookup.value,
        [normalizedDatasetId]: fieldNames.length > 0
      }
      datasetMetricLookup.value = {
        ...datasetMetricLookup.value,
        [normalizedDatasetId]: metricNames
      }
      datasetDimensionLookup.value = {
        ...datasetDimensionLookup.value,
        [normalizedDatasetId]: dimensionNames
      }
      datasetDatasourceLookup.value = {
        ...datasetDatasourceLookup.value,
        [normalizedDatasetId]: datasourceId
      }
    } catch (error) {
      console.error('load sqlbot-new dataset detail failed', error)
    } finally {
      datasetDetailLoadingMap.value = {
        ...datasetDetailLoadingMap.value,
        [normalizedDatasetId]: false
      }
    }
  }

  const preloadHomeDatasetDetails = async () => {
    const datasetIds = [
      ...new Set(
        datasetItems.value
          .slice(0, HOME_DATASET_DETAIL_PRELOAD_COUNT)
          .map(item => normalizeOptionalId(item.id))
          .filter(Boolean)
      )
    ]

    await Promise.all(datasetIds.map(id => ensureDatasetDetailLoaded(id)))
  }

  const syncFileLookupFromItem = (item: FileCardItem | null | undefined) => {
    const lookupKey = resolveFileLookupKey(item)
    if (!lookupKey || !item?.fieldMetas?.length) {
      return
    }

    fileFieldLookup.value = {
      ...fileFieldLookup.value,
      [lookupKey]: item.fieldMetas
    }
    fileMetricLookup.value = {
      ...fileMetricLookup.value,
      [lookupKey]: uniqueFileFieldNames(item.metricFields || getMetricFieldNames(item.fieldMetas))
    }
    fileDimensionLookup.value = {
      ...fileDimensionLookup.value,
      [lookupKey]: uniqueFileFieldNames(
        item.dimensionFields || getDimensionFieldNames(item.fieldMetas)
      )
    }
  }

  const ensureFileDetailLoaded = async (fileId: string) => {
    const normalizedFileId = normalizeOptionalId(fileId)
    if (!normalizedFileId) {
      return
    }

    const fileItem = baseFileItems.value.find(item => item.id === normalizedFileId) || null
    const lookupKey = resolveFileLookupKey(fileItem) || normalizedFileId
    if (!lookupKey || fileDetailLoadingMap.value[lookupKey]) {
      return
    }

    if ((fileFieldLookup.value[lookupKey] || []).length) {
      return
    }

    syncFileLookupFromItem(fileItem)
    if ((fileFieldLookup.value[lookupKey] || []).length) {
      return
    }

    fileDetailLoadingMap.value = {
      ...fileDetailLoadingMap.value,
      [lookupKey]: true
    }

    try {
      const tablesRes: any = await listDatasourceTables({ datasourceId: lookupKey }, true)
      const tables = Array.isArray(tablesRes?.data) ? tablesRes.data : []
      const activeTable = tables[0]

      if (!activeTable?.name) {
        return
      }

      const previewRes: any = await previewData(
        {
          table: activeTable.name,
          id: lookupKey
        },
        true
      )
      const previewPayload = previewRes?.data || previewRes || {}
      const fieldMetas = buildFileFieldMetas(
        Array.isArray(previewPayload?.fields) ? previewPayload.fields : []
      )

      if (!fieldMetas.length) {
        return
      }

      const metricFields = getMetricFieldNames(fieldMetas)
      const dimensionFields = getDimensionFieldNames(fieldMetas)

      fileFieldLookup.value = {
        ...fileFieldLookup.value,
        [lookupKey]: fieldMetas
      }
      fileMetricLookup.value = {
        ...fileMetricLookup.value,
        [lookupKey]: metricFields
      }
      fileDimensionLookup.value = {
        ...fileDimensionLookup.value,
        [lookupKey]: dimensionFields
      }
    } catch (error) {
      console.error('load sqlbot-new file detail failed', error)
    } finally {
      fileDetailLoadingMap.value = {
        ...fileDetailLoadingMap.value,
        [lookupKey]: false
      }
    }
  }

  const getSelectionMeta = (sourceKind: SourceKind) => {
    if (sourceKind === SQLBOT_NEW_SOURCE_KINDS.file) {
      const selectedFile = selectedFileItem.value
      if (selectedFile?.format) {
        return `${selectedFile.format} 文件`
      }
      return '数据文件问数'
    }

    if (sourceKind === SQLBOT_NEW_SOURCE_KINDS.datasetCombination) {
      if (selectedDatasetIds.value.length) {
        return `已选 ${selectedDatasetIds.value.length} 个数据集`
      }
      return '组合数据集'
    }

    if (sourceKind === SQLBOT_NEW_SOURCE_KINDS.dataset && selectedDatasetIds.value.length > 1) {
      return `已选 ${selectedDatasetIds.value.length} 个数据集`
    }

    if (selectedRuntimeDatasource.value?.name) {
      return runtimeState.datasetDatasourcePending
        ? `${selectedRuntimeDatasource.value.name}（待确认）`
        : selectedRuntimeDatasource.value.name
    }
    if (runtimeState.datasetDatasourcePending) {
      return '多数据源待确认'
    }
    return '数据集问数'
  }

  const persistUploadedFiles = () => {
    wsCache.set(
      UPLOADED_FILE_STORAGE_KEY,
      uploadedFileItems.value.map(item => ({ ...item }))
    )
  }

  const persistSelectionState = () => {
    if (!runtimeState.initialized) {
      return
    }

    wsCache.set('STARBI-QUERY-MODE', selectionState.sourceKind)
    wsCache.set('STARBI-QUERY-THEME-ID', selectionState.themeId)
    wsCache.set('STARBI-QUERY-MODEL-ID', selectionState.modelId)
    wsCache.set(
      'STARBI-QUERY-DATASET-IDS',
      selectedDatasetIds.value.length
        ? selectedDatasetIds.value
        : selectionState.datasetId
        ? [selectionState.datasetId]
        : []
    )
    wsCache.set('STARBI-QUERY-DATASET-DSID', runtimeState.datasetDatasourceId)
    wsCache.set('STARBI-QUERY-FILE-DSID', runtimeState.fileDatasourceId)
    wsCache.set(FILE_ID_STORAGE_KEY, selectionState.fileId)
    wsCache.set(COMBINATION_ID_STORAGE_KEY, selectionState.combinationId)
    wsCache.set(COMBINATION_NAME_STORAGE_KEY, selectionState.combinationName)
    persistUploadedFiles()
  }

  const loadRuntimeDatasourceOptions = async (datasetIds: string[], preferredId?: string) => {
    const normalizedDatasetIds = [
      ...new Set(datasetIds.map(id => normalizeOptionalId(id)).filter(Boolean))
    ]
    if (!normalizedDatasetIds.length) {
      invalidateDatasetDatasourceRequests()
      datasetDatasourceOptions.value = []
      runtimeState.datasetDatasourceId = ''
      runtimeState.datasetDatasourcePending = false
      runtimeState.datasetDatasourceLoading = false
      return
    }

    const requestToken = ++datasetDatasourceRequestToken
    runtimeState.datasetDatasourceLoading = true

    try {
      const resolvedPreferredId =
        normalizeOptionalId(preferredId) ||
        datasetDatasourceLookup.value[normalizedDatasetIds[0]] ||
        undefined
      const datasourceList = await getRuntimeDatasources(normalizedDatasetIds, resolvedPreferredId)

      if (requestToken !== datasetDatasourceRequestToken) {
        return
      }

      datasetDatasourceOptions.value = datasourceList

      const runtimeFieldNames = extractRuntimeDatasourceFieldNames(datasourceList)
      if (runtimeFieldNames.length) {
        normalizedDatasetIds.forEach(datasetId => {
          datasetFieldLookup.value = {
            ...datasetFieldLookup.value,
            [datasetId]: runtimeFieldNames
          }
          datasetMetricLookup.value = {
            ...datasetMetricLookup.value,
            [datasetId]: uniqueFieldNames(inferMetricFields(runtimeFieldNames))
          }
          const metricFields = datasetMetricLookup.value[datasetId] || []
          datasetDimensionLookup.value = {
            ...datasetDimensionLookup.value,
            [datasetId]: uniqueFieldNames(
              inferDimensionFields(runtimeFieldNames).length
                ? inferDimensionFields(runtimeFieldNames)
                : runtimeFieldNames.filter(field => !metricFields.includes(field))
            )
          }
        })
      }

      const matchedDatasource = datasourceList.find(
        item => normalizeOptionalId(item.id) === normalizeOptionalId(resolvedPreferredId)
      )
      const resolvedDatasource =
        matchedDatasource || (datasourceList.length === 1 ? datasourceList[0] : null)

      runtimeState.datasetDatasourceId = resolvedDatasource
        ? normalizeOptionalId(resolvedDatasource.id)
        : ''
      runtimeState.datasetDatasourcePending = !resolvedDatasource
    } catch (error) {
      if (requestToken !== datasetDatasourceRequestToken) {
        return
      }
      console.error('load sqlbot-new datasources failed', error)
      datasetDatasourceOptions.value = []
      runtimeState.datasetDatasourceId = ''
      runtimeState.datasetDatasourcePending = true
    } finally {
      if (requestToken !== datasetDatasourceRequestToken) {
        return
      }
      runtimeState.datasetDatasourceLoading = false
    }
  }

  const loadDatasetDatasources = async (datasetId: string, preferredId?: string) => {
    await loadRuntimeDatasourceOptions([datasetId], preferredId)
  }

  const loadRuntimeModels = async () => {
    try {
      const runtimeModelResult = await fetchRuntimeModels()
      runtimeModels.value = runtimeModelResult.models
      runtimeDefaultModelId.value = normalizeOptionalId(runtimeModelResult.defaultModelId)
      const savedModelId = normalizeOptionalId(wsCache.get('STARBI-QUERY-MODEL-ID'))
      const preferredModelId =
        (savedModelId &&
          runtimeModels.value.some(item => item.id === savedModelId) &&
          savedModelId) ||
        runtimeModelResult.defaultModelId ||
        runtimeModels.value[0]?.id ||
        ''

      selectionState.modelId = preferredModelId
    } catch (error) {
      console.error('load sqlbot-new runtime models failed', error)
      runtimeModels.value = []
      runtimeDefaultModelId.value = ''
      selectionState.modelId = ''
    }
  }

  const loadRuntimeThemes = async () => {
    try {
      runtimeThemes.value = await listAIQueryThemes()
      const currentThemeId = normalizeOptionalId(selectionState.themeId)
      if (currentThemeId && !runtimeThemes.value.some(item => item.id === currentThemeId)) {
        selectionState.themeId = ''
      }
    } catch (error) {
      console.error('load sqlbot-new runtime themes failed', error)
      runtimeThemes.value = []
      selectionState.themeId = ''
    }
  }

  const restoreSelectionState = async () => {
    runtimeState.restoring = true

    try {
      const savedThemeId = normalizeOptionalId(wsCache.get('STARBI-QUERY-THEME-ID'))
      const savedMode = String(wsCache.get('STARBI-QUERY-MODE') || '').trim()
      const savedFileId = normalizeOptionalId(wsCache.get(FILE_ID_STORAGE_KEY))
      const savedDatasetIds = Array.isArray(wsCache.get('STARBI-QUERY-DATASET-IDS'))
        ? (wsCache.get('STARBI-QUERY-DATASET-IDS') as unknown[])
            .map(item => normalizeOptionalId(item))
            .filter(Boolean)
        : []
      const savedCombinationId = normalizeOptionalId(wsCache.get(COMBINATION_ID_STORAGE_KEY))
      const savedCombinationName = String(wsCache.get(COMBINATION_NAME_STORAGE_KEY) || '').trim()
      selectionState.themeId = runtimeThemes.value.some(item => item.id === savedThemeId)
        ? savedThemeId
        : ''
      selectionState.sourceKind =
        savedMode === SQLBOT_NEW_SOURCE_KINDS.file
          ? SQLBOT_NEW_SOURCE_KINDS.file
          : savedMode === SQLBOT_NEW_SOURCE_KINDS.datasetCombination
          ? SQLBOT_NEW_SOURCE_KINDS.datasetCombination
          : SQLBOT_NEW_SOURCE_KINDS.dataset
      selectionState.datasetId =
        selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file
          ? ''
          : selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.datasetCombination
          ? savedCombinationId || savedDatasetIds[0] || ''
          : savedDatasetIds[0] || ''
      selectionState.fileId =
        selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file ? savedFileId : ''
      selectionState.sourceIds =
        selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.datasetCombination ||
        (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.dataset &&
          savedDatasetIds.length > 1)
          ? [...savedDatasetIds]
          : []
      selectionState.combinationId =
        selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.datasetCombination
          ? savedCombinationId
          : ''
      selectionState.combinationName =
        selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.datasetCombination
          ? savedCombinationName
          : ''
      runtimeState.datasetDatasourceId = normalizeOptionalId(
        wsCache.get('STARBI-QUERY-DATASET-DSID')
      )
      runtimeState.fileDatasourceId =
        selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file
          ? normalizeOptionalId(wsCache.get('STARBI-QUERY-FILE-DSID'))
          : ''
      runtimeState.datasetDatasourcePending = false
      runtimeState.datasetDatasourceLoading = false
      datasetDatasourceOptions.value = []
    } finally {
      runtimeState.restoring = false
    }
  }

  const initializeSelection = async () => {
    selectionLoading.value = true

    try {
      uploadedFileItems.value = readUploadedFileItems(wsCache)
      uploadedFileItems.value.forEach(item => syncFileLookupFromItem(item))

      const [rawDatasetTree, rawDatasourceTree] = await Promise.all([
        getDatasetTree({}),
        getDsTree({})
      ])

      datasetTree.value = normalizeDatasetTree(
        Array.isArray(rawDatasetTree) ? rawDatasetTree : rawDatasetTree?.data || []
      )
      datasourceTree.value = normalizeTree(
        Array.isArray(rawDatasourceTree) ? rawDatasourceTree : rawDatasourceTree?.data || []
      )

      await loadRuntimeModels()
      await loadRuntimeThemes()
      await restoreSelectionState()
      await preloadHomeDatasetDetails()
      if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file && selectionState.fileId) {
        await ensureFileDetailLoaded(selectionState.fileId)
      } else if (
        selectionState.sourceKind !== SQLBOT_NEW_SOURCE_KINDS.file &&
        selectionState.sourceIds.length
      ) {
        if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.datasetCombination) {
          await Promise.all(selectionState.sourceIds.map(id => ensureDatasetDetailLoaded(id)))
          datasetDatasourceOptions.value = []
          runtimeState.datasetDatasourceLoading = false
        } else {
          if (selectionState.datasetId) {
            await ensureDatasetDetailLoaded(selectionState.datasetId)
          }
          await loadRuntimeDatasourceOptions(
            selectionState.sourceIds,
            runtimeState.datasetDatasourceId
          )
        }
      } else if (selectionState.datasetId) {
        await ensureDatasetDetailLoaded(selectionState.datasetId)
        await loadDatasetDatasources(selectionState.datasetId, runtimeState.datasetDatasourceId)
      }
    } catch (error) {
      console.error('initialize sqlbot-new selection failed', error)
      datasetTree.value = []
      datasourceTree.value = []
      datasetDatasourceOptions.value = []
      runtimeModels.value = []
      runtimeDefaultModelId.value = ''
      selectionState.datasetId = ''
      selectionState.fileId = ''
      selectionState.sourceIds = []
      selectionState.combinationId = ''
      selectionState.combinationName = ''
      selectionState.modelId = ''
      runtimeState.datasetDatasourceId = ''
      runtimeState.fileDatasourceId = ''
      runtimeState.datasetDatasourcePending = false
    } finally {
      runtimeState.initialized = true
      selectionLoading.value = false
      persistSelectionState()
      commitSelectionSnapshot()
    }
  }

  const openSelectDialog = (tab?: DialogTab) => {
    captureSelectDialogBaseline()
    dialogState.selectDialogTab =
      tab ||
      (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file
        ? SQLBOT_NEW_DIALOG_TABS.file
        : SQLBOT_NEW_DIALOG_TABS.dataset)
    dialogState.selectDialogVisible = true

    if (dialogState.selectDialogTab === SQLBOT_NEW_DIALOG_TABS.dataset) {
      datasetItems.value.slice(0, 6).forEach(item => void ensureDatasetDetailLoaded(item.id))
      return
    }

    fileItems.value.slice(0, 6).forEach(item => void ensureFileDetailLoaded(item.id))
  }

  const closeSelectDialog = () => {
    restoreSelectDialogBaseline()
    const shouldReloadRestoredDatasetDatasource =
      selectionState.sourceKind !== SQLBOT_NEW_SOURCE_KINDS.file &&
      (Boolean(selectionState.datasetId) || selectionState.sourceIds.length > 1) &&
      (runtimeState.datasetDatasourcePending || runtimeState.datasetDatasourceLoading)
    clearSelectDialogBaseline()
    dialogState.selectDialogVisible = false
    if (shouldReloadRestoredDatasetDatasource) {
      if (selectionState.sourceIds.length > 1) {
        void loadRuntimeDatasourceOptions(
          selectionState.sourceIds,
          runtimeState.datasetDatasourceId
        )
      } else {
        void loadDatasetDatasources(selectionState.datasetId, runtimeState.datasetDatasourceId)
      }
    }
  }

  const forceCloseDialogs = () => {
    clearSelectDialogBaseline()
    dialogState.selectDialogVisible = false
    dialogState.uploadDialogVisible = false
    dialogState.fileDetailVisible = false
  }

  const setSelectDialogTab = (tab: DialogTab) => {
    dialogState.selectDialogTab = tab
    if (tab === SQLBOT_NEW_DIALOG_TABS.file) {
      fileItems.value.slice(0, 6).forEach(item => void ensureFileDetailLoaded(item.id))
    }
  }

  const setSelectedDatasetId = (id: string) => {
    const normalizedDatasetId = normalizeOptionalId(id)
    const previousDatasetId = normalizeOptionalId(selectionState.datasetId)
    const committedExecutionContext = committedSelection.value.executionContext
    const committedSourceIds = normalizeOptionalIdList(committedExecutionContext.sourceIds)
    const isCommittedDatasetSelection =
      committedExecutionContext.queryMode === SQLBOT_NEW_SOURCE_KINDS.dataset &&
      committedSourceIds.length <= 1 &&
      normalizeOptionalId(committedExecutionContext.sourceId) === normalizedDatasetId
    const canReuseCommittedDatasetResolution =
      isCommittedDatasetSelection &&
      !committedExecutionContext.datasourcePending &&
      Boolean(normalizeOptionalId(committedExecutionContext.datasourceId))

    if (skipNextDatasetDatasourceReload.value && previousDatasetId === normalizedDatasetId) {
      skipNextDatasetDatasourceReload.value = false
    }

    selectionState.sourceIds = []
    selectionState.combinationId = ''
    selectionState.combinationName = ''
    selectionState.datasetId = normalizedDatasetId

    if (canReuseCommittedDatasetResolution) {
      invalidateDatasetDatasourceRequests()
      skipNextDatasetDatasourceReload.value = previousDatasetId !== normalizedDatasetId
      runtimeState.datasetDatasourceId = normalizeOptionalId(committedExecutionContext.datasourceId)
      runtimeState.datasetDatasourcePending = Boolean(committedExecutionContext.datasourcePending)
      runtimeState.datasetDatasourceLoading = false
      if (selectDialogBaseline.value) {
        datasetDatasourceOptions.value = selectDialogBaseline.value.datasetDatasourceOptions.map(
          item => ({ ...item })
        )
      }
      void ensureDatasetDetailLoaded(normalizedDatasetId)
      return
    }

    runtimeState.datasetDatasourceId = ''
    runtimeState.datasetDatasourcePending = true
    runtimeState.datasetDatasourceLoading = true
    void ensureDatasetDetailLoaded(normalizedDatasetId)
  }

  const setActiveThemeId = (themeId: string) => {
    const normalizedThemeId = normalizeOptionalId(themeId)
    selectionState.themeId =
      normalizedThemeId && runtimeThemes.value.some(item => item.id === normalizedThemeId)
        ? normalizedThemeId
        : ''
    dialogState.datasetKeyword = ''

    if (
      selectionState.datasetId &&
      selectionState.themeId &&
      !themeScopedDatasetItems.value.some(item => item.id === selectionState.datasetId)
    ) {
      selectionState.datasetId = ''
      selectionState.sourceIds = []
      selectionState.combinationId = ''
      selectionState.combinationName = ''
      runtimeState.datasetDatasourceId = ''
      runtimeState.datasetDatasourcePending = false
      runtimeState.datasetDatasourceLoading = false
    }
  }

  const setSelectedFileId = (id: string) => {
    const selectedFile = fileItems.value.find(item => item.id === id)
    const selectedBaseFile = baseFileItems.value.find(item => item.id === id)
    selectionState.fileId = id
    selectionState.datasetId = ''
    selectionState.sourceIds = []
    selectionState.combinationId = ''
    selectionState.combinationName = ''
    runtimeState.fileDatasourceId = normalizeOptionalId(
      selectedBaseFile?.datasourceId ||
        selectedBaseFile?.id ||
        selectedFile?.datasourceId ||
        selectedFile?.id
    )
    void ensureFileDetailLoaded(id)
  }

  const confirmSelectDialog = async () => {
    if (
      dialogState.selectDialogTab === SQLBOT_NEW_DIALOG_TABS.dataset &&
      !selectionState.datasetId
    ) {
      return false
    }

    if (dialogState.selectDialogTab === SQLBOT_NEW_DIALOG_TABS.file && !selectionState.fileId) {
      return false
    }

    selectionState.sourceKind =
      dialogState.selectDialogTab === SQLBOT_NEW_DIALOG_TABS.file
        ? SQLBOT_NEW_SOURCE_KINDS.file
        : SQLBOT_NEW_SOURCE_KINDS.dataset
    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.file && selectionState.fileId) {
      await ensureFileDetailLoaded(selectionState.fileId)
    }
    commitSelectionSnapshot()
    clearSelectDialogBaseline()
    dialogState.selectDialogVisible = false
    return true
  }

  const applyConfirmedSelection = async (): Promise<SqlbotNewSelectionChange> => {
    const before = committedSelection.value.executionContext
    const confirmed = await confirmSelectDialog()
    if (!confirmed) {
      return {
        confirmed: false
      }
    }
    const after = createSelectionSnapshot()

    return {
      confirmed: true,
      changed: !isSameExecutionSource(before, after.executionContext),
      executionContext: after.executionContext,
      selectionTitle: after.selectionTitle,
      selectionMeta: after.selectionMeta
    }
  }

  const openUploadDialog = () => {
    dialogState.selectDialogVisible = false
    dialogState.uploadDialogVisible = true
  }

  const upsertFile = (payload: FileCardItem) => {
    const existingIndex = uploadedFileItems.value.findIndex(item => item.id === payload.id)

    if (existingIndex > -1) {
      uploadedFileItems.value.splice(existingIndex, 1, payload)
      return
    }

    uploadedFileItems.value.unshift(payload)
  }

  const handleUploadSave = (payload: FileCardItem) => {
    upsertFile(payload)
    syncFileLookupFromItem(payload)
    selectionState.fileId = payload.id
    selectionState.datasetId = ''
    selectionState.sourceIds = []
    selectionState.combinationId = ''
    selectionState.combinationName = ''
    runtimeState.fileDatasourceId = normalizeOptionalId(payload.datasourceId || payload.id)
    selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.file
    dialogState.uploadDialogVisible = false
    dialogState.selectDialogTab = SQLBOT_NEW_DIALOG_TABS.file
    dialogState.selectDialogVisible = true
  }

  const handleUploadSaveAndUse = (payload: FileCardItem) => {
    upsertFile(payload)
    syncFileLookupFromItem(payload)
    selectionState.fileId = payload.id
    selectionState.datasetId = ''
    selectionState.sourceIds = []
    selectionState.combinationId = ''
    selectionState.combinationName = ''
    runtimeState.fileDatasourceId = normalizeOptionalId(payload.datasourceId || payload.id)
    selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.file
    forceCloseDialogs()
    commitSelectionSnapshot()
  }

  const handleUploadDialogClose = () => {
    dialogState.uploadDialogVisible = false
    dialogState.selectDialogVisible = true
    dialogState.selectDialogTab = SQLBOT_NEW_DIALOG_TABS.file
  }

  const openFileDetail = (id: string) => {
    dialogState.detailFileId = id
    dialogState.selectDialogVisible = false
    dialogState.fileDetailVisible = true
  }

  const askFromDatasetCard = async (id: string) => {
    if (!id) {
      return
    }
    setSelectedDatasetId(id)
    await ensureDatasetDetailLoaded(id)
    await loadDatasetDatasources(id, runtimeState.datasetDatasourceId)
    selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.dataset
    forceCloseDialogs()
    commitSelectionSnapshot()
  }

  const askFromDatasetDetail = async () => {
    if (!datasetDetailId.value) {
      return
    }
    setSelectedDatasetId(datasetDetailId.value)
    await ensureDatasetDetailLoaded(datasetDetailId.value)
    await loadDatasetDatasources(datasetDetailId.value, runtimeState.datasetDatasourceId)
    selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.dataset
    forceCloseDialogs()
    commitSelectionSnapshot()
  }

  const askFromFileCard = async (id: string) => {
    const fileItem = baseFileItems.value.find(item => item.id === id)
    if (!fileItem) {
      return
    }
    selectionState.fileId = fileItem.id
    selectionState.datasetId = ''
    selectionState.sourceIds = []
    selectionState.combinationId = ''
    selectionState.combinationName = ''
    runtimeState.fileDatasourceId = normalizeOptionalId(fileItem.datasourceId || fileItem.id)
    selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.file
    await ensureFileDetailLoaded(fileItem.id)
    forceCloseDialogs()
    commitSelectionSnapshot()
  }

  const askFromFileDetail = async () => {
    if (!detailFile.value) {
      return
    }
    selectionState.fileId = detailFile.value.id
    selectionState.datasetId = ''
    selectionState.sourceIds = []
    selectionState.combinationId = ''
    selectionState.combinationName = ''
    runtimeState.fileDatasourceId = normalizeOptionalId(
      detailFile.value.datasourceId || detailFile.value.id
    )
    selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.file
    await ensureFileDetailLoaded(detailFile.value.id)
    forceCloseDialogs()
    commitSelectionSnapshot()
  }

  const buildDatasetClarificationOptions = (question: string) => {
    const normalizedQuestion = String(question || '')
      .trim()
      .toLowerCase()
    const scoredItems = themeScopedDatasetItems.value
      .map(item => {
        const metricHits = (item.metricFields || []).filter(field =>
          normalizedQuestion.includes(String(field).toLowerCase())
        )
        const dimensionHits = (item.dimensionFields || []).filter(field =>
          normalizedQuestion.includes(String(field).toLowerCase())
        )
        const titleScore = normalizedQuestion.includes(item.title.toLowerCase()) ? 6 : 0
        const score = titleScore + metricHits.length * 3 + dimensionHits.length * 2

        let description = ''
        if (metricHits.length) {
          description = `命中指标：${metricHits.slice(0, 2).join(' / ')}`
        } else if (dimensionHits.length) {
          description = `命中维度：${dimensionHits.slice(0, 2).join(' / ')}`
        } else if (activeTheme.value?.id) {
          description = `当前主题：${activeTheme.value.name}`
        } else if (item.fields.length) {
          description = `包含字段：${item.fields.slice(0, 2).join(' / ')}`
        }

        return {
          label: item.title,
          value: item.id,
          description,
          chips: [
            ...new Set([
              ...(item.metricFields || []),
              ...(item.dimensionFields || []),
              ...(item.fields || [])
            ])
          ].slice(0, 3),
          score
        }
      })
      .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))

    const positiveScoreItems = scoredItems.filter(item => item.score > 0)
    return (positiveScoreItems.length ? positiveScoreItems : scoredItems).slice(0, 5)
  }

  const resolveDatasetClarificationContext = async (datasetId: string) => {
    if (!datasetId) {
      return null
    }

    setSelectedDatasetId(datasetId)
    await ensureDatasetDetailLoaded(datasetId)
    await loadDatasetDatasources(datasetId, runtimeState.datasetDatasourceId)
    selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.dataset
    commitSelectionSnapshot()

    return {
      executionContext: executionContext.value,
      selectionTitle: currentSelectionTitle.value,
      selectionMeta: currentSelectionMeta.value
    }
  }

  const resolveDatasetClarificationContexts = async (datasetIds: string[]) => {
    const normalizedIds = [
      ...new Set(datasetIds.map(id => normalizeOptionalId(id)).filter(Boolean))
    ].slice(0, 6)
    if (!normalizedIds.length) {
      return null
    }

    await Promise.all(normalizedIds.map(id => ensureDatasetDetailLoaded(id)))
    await loadRuntimeDatasourceOptions(normalizedIds, runtimeState.datasetDatasourceId)

    selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.dataset
    selectionState.datasetId = normalizedIds[0]
    selectionState.fileId = ''
    selectionState.sourceIds = normalizedIds
    selectionState.combinationId = ''
    selectionState.combinationName = ''

    const titles = normalizedIds
      .map(id => baseDatasetItems.value.find(item => item.id === id)?.title || '')
      .filter(Boolean)
    const selectionTitle =
      titles.length <= 1 ? titles[0] || '' : `${titles[0]} 等 ${titles.length} 个数据集`
    const selectionMeta =
      titles.length <= 1
        ? currentSelectionMeta.value || getSelectionMeta(SQLBOT_NEW_SOURCE_KINDS.dataset)
        : `已选 ${titles.length} 个数据集`

    const nextExecutionContext: SqlbotNewExecutionContext = {
      themeId: selectionState.themeId,
      themeName: activeTheme.value?.name || '',
      queryMode: SQLBOT_NEW_SOURCE_KINDS.dataset,
      sourceId: normalizedIds[0],
      sourceIds: normalizedIds,
      datasourceId: runtimeState.datasetDatasourceId,
      modelId: resolveRestoredModelId(selectionState.modelId),
      datasourcePending:
        runtimeState.datasetDatasourcePending || runtimeState.datasetDatasourceLoading
    }

    committedSelection.value = {
      executionContext: { ...nextExecutionContext },
      selectionTitle,
      selectionMeta
    }

    return {
      executionContext: {
        ...nextExecutionContext,
        sourceIds: [...normalizedIds]
      },
      selectionTitle,
      selectionMeta
    }
  }

  const applyDatasetCombinationContext = async ({
    sourceIds,
    combinationId,
    combinationName,
    datasourceId,
    datasourcePending
  }: {
    sourceIds: string[]
    combinationId: string
    combinationName?: string
    datasourceId?: string
    datasourcePending?: boolean
  }) => {
    const normalizedSourceIds = [
      ...new Set(sourceIds.map(id => normalizeOptionalId(id)).filter(Boolean))
    ].slice(0, 6)
    const normalizedCombinationId = normalizeOptionalId(combinationId)

    if (!normalizedSourceIds.length || !normalizedCombinationId) {
      return null
    }

    await Promise.all(normalizedSourceIds.map(id => ensureDatasetDetailLoaded(id)))

    selectionState.sourceKind = SQLBOT_NEW_SOURCE_KINDS.datasetCombination
    selectionState.datasetId = normalizedCombinationId
    selectionState.fileId = ''
    selectionState.sourceIds = normalizedSourceIds
    selectionState.combinationId = normalizedCombinationId
    selectionState.combinationName = String(combinationName || '')
    runtimeState.fileDatasourceId = ''
    runtimeState.datasetDatasourceId = normalizeOptionalId(datasourceId)
    runtimeState.datasetDatasourcePending = Boolean(datasourcePending)
    runtimeState.datasetDatasourceLoading = false
    datasetDatasourceOptions.value = []
    commitSelectionSnapshot()

    return {
      executionContext: {
        ...executionContext.value,
        sourceIds: [...(executionContext.value.sourceIds || [])]
      },
      selectionTitle: currentSelectionTitle.value,
      selectionMeta: currentSelectionMeta.value
    }
  }

  const handleFileDetailClose = () => {
    dialogState.fileDetailVisible = false
    dialogState.selectDialogVisible = true
    dialogState.selectDialogTab = SQLBOT_NEW_DIALOG_TABS.file
  }

  const datasetDetailVisible = ref(false)
  const datasetDetailId = ref('')

  const datasetDetailItem = computed(() => {
    return baseDatasetItems.value.find(item => item.id === datasetDetailId.value) || null
  })

  const datasetDetailDatasourceName = computed(() => {
    return datasetDetailId.value === selectionState.datasetId ? activeDatasourceLabel.value : ''
  })

  const openDatasetDetail = (id: string) => {
    datasetDetailId.value = id
    dialogState.selectDialogVisible = false
    datasetDetailVisible.value = true
    void ensureDatasetDetailLoaded(id)
  }

  const closeDatasetDetail = () => {
    datasetDetailVisible.value = false
    dialogState.selectDialogVisible = true
    dialogState.selectDialogTab = SQLBOT_NEW_DIALOG_TABS.dataset
  }

  const applyRestoredSelection = async (
    executionContext: SqlbotNewExecutionContext,
    restoredSelection?: Partial<
      Pick<SqlbotNewSelectionSnapshot, 'selectionTitle' | 'selectionMeta'>
    >
  ) => {
    const restoredTitle = String(restoredSelection?.selectionTitle || '').trim()
    const restoredMeta = String(restoredSelection?.selectionMeta || '')
      .trim()
      .toUpperCase()

    selectionState.themeId = normalizeOptionalId(executionContext.themeId)
    selectionState.sourceKind = executionContext.queryMode
    selectionState.modelId = resolveRestoredModelId(executionContext.modelId)

    if (executionContext.queryMode === SQLBOT_NEW_SOURCE_KINDS.file) {
      let matchedFile = baseFileItems.value.find(item => {
        return (
          item.id === executionContext.sourceId ||
          normalizeOptionalId(item.datasourceId) ===
            normalizeOptionalId(executionContext.datasourceId)
        )
      })

      const fallbackFileId = normalizeOptionalId(
        executionContext.sourceId || executionContext.datasourceId
      )
      if (fallbackFileId && (restoredTitle || restoredMeta || !matchedFile)) {
        const restoredFileItem: FileCardItem = {
          ...(matchedFile || {}),
          id: matchedFile?.id || fallbackFileId,
          title: restoredTitle || matchedFile?.title || '历史文件',
          uploadedAt: matchedFile?.uploadedAt || '',
          format: matchedFile?.format || (restoredMeta.includes('CSV') ? 'CSV' : 'Excel'),
          fields: matchedFile?.fields || [],
          fieldMetas: matchedFile?.fieldMetas,
          metricFields: matchedFile?.metricFields,
          dimensionFields: matchedFile?.dimensionFields,
          fieldsLoaded: matchedFile?.fieldsLoaded,
          datasourceId: normalizeOptionalId(
            matchedFile?.datasourceId || executionContext.datasourceId || fallbackFileId
          ),
          pending: matchedFile?.pending ?? !matchedFile
        }
        uploadedFileItems.value = [
          restoredFileItem,
          ...uploadedFileItems.value.filter(item => item.id !== restoredFileItem.id)
        ]
        matchedFile = restoredFileItem
      }

      selectionState.fileId = matchedFile?.id || ''
      runtimeState.fileDatasourceId = normalizeOptionalId(
        matchedFile?.datasourceId || executionContext.datasourceId
      )
      selectionState.datasetId = ''
      selectionState.sourceIds = []
      selectionState.combinationId = ''
      selectionState.combinationName = ''
      if (selectionState.fileId) {
        await ensureFileDetailLoaded(selectionState.fileId)
      }
      commitSelectionSnapshot()
      return
    }

    selectionState.datasetId = executionContext.sourceId || ''
    selectionState.fileId = ''
    selectionState.sourceIds = normalizeOptionalIdList(executionContext.sourceIds)
    selectionState.combinationId = normalizeOptionalId(executionContext.combinationId)
    selectionState.combinationName = String(executionContext.combinationName || '')
    runtimeState.fileDatasourceId = ''
    runtimeState.datasetDatasourceId = normalizeOptionalId(executionContext.datasourceId)
    runtimeState.datasetDatasourcePending = Boolean(executionContext.datasourcePending)
    runtimeState.datasetDatasourceLoading = false

    if (selectionState.sourceKind === SQLBOT_NEW_SOURCE_KINDS.datasetCombination) {
      await Promise.all(selectionState.sourceIds.map(id => ensureDatasetDetailLoaded(id)))
      datasetDatasourceOptions.value = []
      runtimeState.datasetDatasourceLoading = false
      commitSelectionSnapshot()
      return
    }

    if (
      selectionState.sourceKind !== SQLBOT_NEW_SOURCE_KINDS.file &&
      selectionState.sourceIds.length > 1
    ) {
      if (selectionState.datasetId) {
        await ensureDatasetDetailLoaded(selectionState.datasetId)
      }
      await loadRuntimeDatasourceOptions(selectionState.sourceIds, runtimeState.datasetDatasourceId)
    } else if (selectionState.datasetId) {
      await ensureDatasetDetailLoaded(selectionState.datasetId)
      await loadDatasetDatasources(selectionState.datasetId, runtimeState.datasetDatasourceId)
    }
    commitSelectionSnapshot()
  }

  const clearCurrentSelection = () => {
    selectionState.datasetId = ''
    selectionState.fileId = ''
    selectionState.sourceIds = []
    selectionState.combinationId = ''
    selectionState.combinationName = ''
    runtimeState.datasetDatasourceId = ''
    runtimeState.fileDatasourceId = ''
    runtimeState.datasetDatasourcePending = false
    runtimeState.datasetDatasourceLoading = false
    dialogState.datasetKeyword = ''
    dialogState.fileKeyword = ''
    commitSelectionSnapshot()
  }

  watch(
    () => selectionState.datasetId,
    datasetId => {
      if (!runtimeState.initialized || runtimeState.restoring) {
        return
      }

      if (
        selectionState.sourceKind !== SQLBOT_NEW_SOURCE_KINDS.file &&
        selectionState.sourceIds.length > 1
      ) {
        return
      }

      if (skipNextDatasetDatasourceReload.value) {
        skipNextDatasetDatasourceReload.value = false
        void ensureDatasetDetailLoaded(datasetId)
        return
      }

      void ensureDatasetDetailLoaded(datasetId)
      void loadDatasetDatasources(datasetId, runtimeState.datasetDatasourceId)
    }
  )

  watch(
    () => selectionState.fileId,
    fileId => {
      if (!runtimeState.initialized || runtimeState.restoring || !fileId) {
        return
      }

      void ensureFileDetailLoaded(fileId)
    }
  )

  watch(
    () => [
      selectionState.themeId,
      selectionState.sourceKind,
      selectionState.datasetId,
      selectionState.fileId,
      selectionState.sourceIds.join(','),
      selectionState.combinationId,
      selectionState.combinationName,
      selectionState.modelId,
      runtimeState.datasetDatasourceId,
      runtimeState.fileDatasourceId
    ],
    () => {
      persistSelectionState()
    }
  )

  watch(
    () => [
      dialogState.selectDialogVisible,
      executionContext.value.queryMode,
      executionContext.value.sourceId,
      executionContext.value.sourceIds?.join(','),
      executionContext.value.combinationId,
      executionContext.value.combinationName,
      executionContext.value.datasourceId,
      executionContext.value.modelId,
      executionContext.value.datasourcePending,
      currentSelectionTitle.value,
      currentSelectionMeta.value
    ],
    () => {
      if (dialogState.selectDialogVisible || selectDialogBaseline.value) {
        return
      }
      commitSelectionSnapshot()
    }
  )

  watch(
    () => [
      runtimeState.initialized,
      selectionState.themeId,
      dialogState.datasetKeyword,
      datasetItems.value
        .slice(0, HOME_DATASET_DETAIL_PRELOAD_COUNT)
        .map(item => item.id)
        .join(',')
    ],
    () => {
      if (!runtimeState.initialized || runtimeState.restoring) {
        return
      }

      void preloadHomeDatasetDetails()
    }
  )

  watch(
    () => [
      dialogState.selectDialogVisible,
      dialogState.selectDialogTab,
      dialogState.datasetKeyword
    ],
    () => {
      if (
        !dialogState.selectDialogVisible ||
        dialogState.selectDialogTab !== SQLBOT_NEW_DIALOG_TABS.dataset
      ) {
        return
      }

      datasetItems.value.slice(0, 6).forEach(item => void ensureDatasetDetailLoaded(item.id))
    }
  )

  watch(
    () => [dialogState.selectDialogVisible, dialogState.selectDialogTab, dialogState.fileKeyword],
    () => {
      if (
        !dialogState.selectDialogVisible ||
        dialogState.selectDialogTab !== SQLBOT_NEW_DIALOG_TABS.file
      ) {
        return
      }

      fileItems.value.slice(0, 6).forEach(item => void ensureFileDetailLoaded(item.id))
    }
  )

  const setDatasetKeyword = (keyword: string) => {
    dialogState.datasetKeyword = keyword
  }

  const setFileKeyword = (keyword: string) => {
    dialogState.fileKeyword = keyword
  }

  watch(
    uploadedFileItems,
    () => {
      persistUploadedFiles()
    },
    { deep: true }
  )

  onMounted(() => {
    void initializeSelection()
  })

  return {
    activeTheme,
    activeThemeDescription: computed(() => activeTheme.value?.description || ''),
    activeThemeId: computed(() => selectionState.themeId),
    activeThemeRecommendedQuestions: computed(() => activeTheme.value?.recommendedQuestions || []),
    activeDatasourceLabel,
    activeModelLabel,
    activeSourceModeLabel,
    activeSourceTitle,
    askFromDatasetCard,
    askFromDatasetDetail,
    askFromFileCard,
    askFromFileDetail,
    applyConfirmedSelection,
    buildDatasetClarificationOptions,
    closeSelectDialog,
    clearCurrentSelection,
    confirmSelectDialog,
    currentSelectionMeta,
    currentSelectionTitle,
    datasetItems,
    datasetDetailLookup: computed(() => datasetDetailLookup.value),
    datasetDetailDatasourceName,
    datasetDetailItem,
    detailFile,
    fileItems,
    forceCloseDialogs,
    closeDatasetDetail,
    hasActiveSelection,
    totalFileItems: computed(() => baseFileItems.value.length),
    handleFileDetailClose,
    handleUploadDialogClose,
    handleUploadSave,
    handleUploadSaveAndUse,
    openDatasetDetail,
    openFileDetail,
    openSelectDialog,
    openUploadDialog,
    applyRestoredSelection,
    setDatasetKeyword,
    setFileKeyword,
    selectedDatasetDatasourceName: computed(() => selectedRuntimeDatasource.value?.name || ''),
    selectedDatasetDatasourcePending: computed(() => runtimeState.datasetDatasourcePending),
    selectedDimensionFields,
    selectedDatasetTitle: computed(() => currentSelectionTitle.value),
    selectedMetricFields,
    executionContext,
    isSameExecutionSource,
    filteredDatasetCount: computed(() => themeScopedDatasetItems.value.length),
    selectedSourceKind: computed(() => selectionState.sourceKind),
    ensureDatasetDetailLoaded,
    resolveDatasetClarificationContext,
    resolveDatasetClarificationContexts,
    applyDatasetCombinationContext,
    ensureRuntimeModelReady,
    selectionLoading,
    setActiveThemeId,
    ...toRefs(dialogState),
    selectDialogVisible: computed(() => dialogState.selectDialogVisible),
    uploadDialogVisible: computed(() => dialogState.uploadDialogVisible),
    fileDetailVisible: computed(() => dialogState.fileDetailVisible),
    selectedDatasetId: computed(() => selectionState.datasetId),
    selectedFileId: computed(() => selectionState.fileId),
    selectedFileDatasource,
    selectedFileTitle: computed(() => selectedFileItem.value?.title || ''),
    themeTabs,
    datasetDetailId,
    datasetDetailVisible: computed(() => datasetDetailVisible.value),
    datasetDatasourceDebug,
    setSelectedDatasetId,
    setSelectedFileId,
    setSelectDialogTab,
    selectionState
  }
}
