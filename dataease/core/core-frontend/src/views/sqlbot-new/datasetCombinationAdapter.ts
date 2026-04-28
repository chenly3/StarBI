import type {
  DatasetCardItem,
  SqlbotNewClarificationOption,
  SqlbotNewDatasetCombinationDraft,
  SqlbotNewDatasetCombinationRelationType
} from './types'

export type DatasetCombinationRelationType = SqlbotNewDatasetCombinationRelationType

export interface DatasetCombinationDialogDatasetOption {
  id: string
  title: string
  fields: string[]
  metricFields?: string[]
  dimensionFields?: string[]
}

export interface DatasetCombinationRelationRowDraft {
  id: string
  leftField: string
  rightField: string
}

export interface DatasetCombinationSecondaryRelationDraft {
  datasetId: string
  relationType: DatasetCombinationRelationType
  rows: DatasetCombinationRelationRowDraft[]
}

export type DatasetCombinationConfirmPayload = SqlbotNewDatasetCombinationDraft

const normalizeFieldName = (value: unknown) => String(value || '').trim()

const uniqueFieldNames = (values: unknown[] = []) => {
  return [...new Set(values.map(normalizeFieldName).filter(Boolean))]
}

const normalizeComparableField = (field: string) => {
  return field.toLowerCase().replace(/[\s_\-()（）]/g, '')
}

let relationRowSeed = 0

export const buildCombinationFieldOptions = (dataset: {
  id: string
  title: string
  metricFields?: string[]
  dimensionFields?: string[]
  fields: string[]
}) => {
  return uniqueFieldNames([
    ...(dataset.dimensionFields || []),
    ...(dataset.metricFields || []),
    ...dataset.fields
  ])
}

const buildFallbackDatasetOption = (
  option: SqlbotNewClarificationOption
): DatasetCombinationDialogDatasetOption => {
  const fields = uniqueFieldNames(option.chips || [])

  return {
    id: String(option.value || ''),
    title: String(option.label || ''),
    fields,
    metricFields: [],
    dimensionFields: fields
  }
}

export const adaptCombinationDatasetOptions = ({
  selectedIds,
  datasetItems,
  clarificationOptions = [],
  allowFallback = true
}: {
  selectedIds: string[]
  datasetItems: DatasetCardItem[]
  clarificationOptions?: SqlbotNewClarificationOption[]
  allowFallback?: boolean
}): DatasetCombinationDialogDatasetOption[] => {
  const datasetLookup = datasetItems.reduce<Record<string, DatasetCardItem>>((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})

  const clarificationLookup = clarificationOptions.reduce<
    Record<string, SqlbotNewClarificationOption>
  >((acc, item) => {
    acc[String(item.value || '')] = item
    return acc
  }, {})

  return [...new Set((selectedIds || []).map(id => String(id || '').trim()).filter(Boolean))]
    .map(id => {
      const dataset = datasetLookup[id]
      if (dataset) {
        return {
          id: dataset.id,
          title: dataset.title,
          fields: buildCombinationFieldOptions(dataset),
          metricFields: uniqueFieldNames(dataset.metricFields || []),
          dimensionFields: uniqueFieldNames(dataset.dimensionFields || [])
        } satisfies DatasetCombinationDialogDatasetOption
      }

      const clarificationOption = clarificationLookup[id]
      if (allowFallback && clarificationOption) {
        return buildFallbackDatasetOption(clarificationOption)
      }

      return null
    })
    .filter((item): item is DatasetCombinationDialogDatasetOption => Boolean(item))
}

export const buildDefaultCombinationName = (
  datasetOptions: DatasetCombinationDialogDatasetOption[],
  primaryDatasetId?: string
) => {
  const now = new Date()
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('')
  const timePart = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('')
  const normalizedOptions = datasetOptions.filter(item => item.id && item.title)
  if (!normalizedOptions.length) {
    return `问数组合_${timestamp}_${timePart}`
  }

  const primaryDataset =
    normalizedOptions.find(item => item.id === primaryDatasetId) || normalizedOptions[0]

  if (normalizedOptions.length === 1) {
    return `${primaryDataset.title}组合_${timestamp}_${timePart}`
  }

  return `${primaryDataset.title}等${normalizedOptions.length}个数据集组合_${timestamp}_${timePart}`
}

export const createRelationRowDraft = (
  primaryDataset?: DatasetCombinationDialogDatasetOption,
  secondaryDataset?: DatasetCombinationDialogDatasetOption
): DatasetCombinationRelationRowDraft => {
  const primaryFields = primaryDataset ? buildCombinationFieldOptions(primaryDataset) : []
  const secondaryFields = secondaryDataset ? buildCombinationFieldOptions(secondaryDataset) : []

  let leftField = ''
  let rightField = ''

  if (primaryFields.length && secondaryFields.length) {
    const secondaryFieldLookup = secondaryFields.reduce<Record<string, string>>((acc, field) => {
      acc[normalizeComparableField(field)] = field
      return acc
    }, {})

    const matchedPrimaryField = primaryFields.find(field => {
      return Boolean(secondaryFieldLookup[normalizeComparableField(field)])
    })

    if (matchedPrimaryField) {
      leftField = matchedPrimaryField
      rightField = secondaryFieldLookup[normalizeComparableField(matchedPrimaryField)] || ''
    }
  }

  relationRowSeed += 1

  return {
    id: `dataset-combination-row-${relationRowSeed}`,
    leftField,
    rightField
  }
}

export const createSecondaryRelationDraft = (
  datasetId: string,
  primaryDataset?: DatasetCombinationDialogDatasetOption,
  secondaryDataset?: DatasetCombinationDialogDatasetOption
): DatasetCombinationSecondaryRelationDraft => {
  return {
    datasetId,
    relationType: 'left',
    rows: [createRelationRowDraft(primaryDataset, secondaryDataset)]
  }
}

const findComparableField = (field: string, candidates: string[]) => {
  const comparable = normalizeComparableField(field)
  if (!comparable) {
    return ''
  }
  return candidates.find(candidate => normalizeComparableField(candidate) === comparable) || ''
}

export const sanitizeRelationRowDraft = (
  row: Partial<DatasetCombinationRelationRowDraft> | undefined,
  primaryDataset?: DatasetCombinationDialogDatasetOption,
  secondaryDataset?: DatasetCombinationDialogDatasetOption
): DatasetCombinationRelationRowDraft => {
  const primaryFields = primaryDataset ? buildCombinationFieldOptions(primaryDataset) : []
  const secondaryFields = secondaryDataset ? buildCombinationFieldOptions(secondaryDataset) : []
  const fallback = createRelationRowDraft(primaryDataset, secondaryDataset)
  const nextId = String(row?.id || fallback.id)
  const leftField = String(row?.leftField || '')
  const rightField = String(row?.rightField || '')
  const hasLeftField = primaryFields.includes(leftField)
  const hasRightField = secondaryFields.includes(rightField)

  if (hasLeftField && hasRightField) {
    return {
      id: nextId,
      leftField,
      rightField
    }
  }

  if (hasLeftField) {
    return {
      id: nextId,
      leftField,
      rightField: findComparableField(leftField, secondaryFields) || fallback.rightField
    }
  }

  if (hasRightField) {
    return {
      id: nextId,
      leftField: findComparableField(rightField, primaryFields) || fallback.leftField,
      rightField
    }
  }

  return {
    id: nextId,
    leftField: fallback.leftField,
    rightField: fallback.rightField
  }
}
