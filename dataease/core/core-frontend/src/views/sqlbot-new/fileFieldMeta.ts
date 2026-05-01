import type { FileFieldKind, FileFieldMeta } from './types'

const normalizeFieldName = (value: unknown) => String(value || '').trim()

export const getFileFieldKind = (field: Record<string, any>): FileFieldKind => {
  const fieldType = String(field?.fieldType || '').toUpperCase()
  let deType = 0

  if (typeof field?.deExtractType === 'number') {
    deType = field.deExtractType
  } else if (typeof field?.deType === 'number') {
    deType = field.deType
  }

  if (fieldType.includes('DATE') || fieldType.includes('TIME')) {
    return 'date'
  }
  if (deType === 2 || deType === 3) {
    return 'number'
  }
  return 'text'
}

export const buildFileFieldMetas = (fields: Record<string, any>[] = []): FileFieldMeta[] => {
  const metas = fields
    .map((field, index) => {
      const name = normalizeFieldName(field?.name || field?.originName || `字段${index + 1}`)
      if (!name) {
        return null
      }

      return {
        name,
        kind: getFileFieldKind(field),
        fieldType: typeof field?.fieldType === 'string' ? field.fieldType : undefined,
        deType: typeof field?.deType === 'number' ? field.deType : undefined,
        deExtractType: typeof field?.deExtractType === 'number' ? field.deExtractType : undefined
      }
    })
    .filter(field => field !== null)
  return metas as FileFieldMeta[]
}

export const uniqueFieldNames = (fields: string[]) => {
  return [...new Set(fields.map(normalizeFieldName).filter(Boolean))]
}

export const getMetricFieldNames = (fieldMetas: FileFieldMeta[] = []) => {
  return uniqueFieldNames(
    fieldMetas.filter(field => field.kind === 'number').map(field => field.name)
  )
}

export const getDimensionFieldNames = (fieldMetas: FileFieldMeta[] = []) => {
  return uniqueFieldNames(
    fieldMetas.filter(field => field.kind !== 'number').map(field => field.name)
  )
}
