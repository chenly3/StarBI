export type PermissionViewMode = 'by-user' | 'by-resource'

export type PermissionTab = 'menu' | 'resource'

export type PermissionPanelTab = 'menu' | 'resource'

export type PermissionSubjectType = 'user' | 'role'

export type PermissionResourceFlag = 'panel' | 'screen' | 'dataset' | 'datasource'

export type PermissionColumnKey = 'view' | 'export' | 'manage' | 'authorize'

export interface PermissionColumnDefinition {
  key: PermissionColumnKey
  label: string
  bit: number
}

export interface PermissionColumnState {
  view: boolean
  export: boolean
  manage: boolean
  authorize: boolean
}

export const PERMISSION_COLUMN_DEFINITIONS: PermissionColumnDefinition[] = [
  { key: 'view', label: '查看', bit: 1 << 0 },
  { key: 'export', label: '导出', bit: 1 << 1 },
  { key: 'manage', label: '管理', bit: 1 << 2 },
  { key: 'authorize', label: '授权', bit: 1 << 3 }
]

export const createEmptyPermissionColumns = (): PermissionColumnState => ({
  view: false,
  export: false,
  manage: false,
  authorize: false
})

export const clonePermissionColumns = (
  value?: Partial<PermissionColumnState> | null
): PermissionColumnState => ({
  ...createEmptyPermissionColumns(),
  ...(value || {})
})

export const decodePermissionColumns = (ext: number): PermissionColumnState => {
  return PERMISSION_COLUMN_DEFINITIONS.reduce((acc, column) => {
    acc[column.key] = (ext & column.bit) === column.bit
    return acc
  }, createEmptyPermissionColumns())
}

export const encodePermissionColumns = (permissions: PermissionColumnState): number => {
  return PERMISSION_COLUMN_DEFINITIONS.reduce((ext, column) => {
    return permissions[column.key] ? ext | column.bit : ext
  }, 0)
}

export interface PermissionSubjectOption {
  id: number
  name: string
  type: PermissionSubjectType
}

export interface PermissionResourceTreeNode {
  id: number
  name: string
  leaf: boolean
  children: PermissionResourceTreeNode[]
}

export interface PermissionMatrixItem {
  id: number
  ext: number
  permissions: PermissionColumnState
}

export interface PermissionOriginItem {
  id: number
  name: string
  permissions: PermissionMatrixItem[]
}

export interface PermissionMatrixState {
  root: boolean
  readonly: boolean
  permissions: PermissionMatrixItem[]
  permissionOrigins: PermissionOriginItem[]
}

export interface PermissionTreeRow {
  id: number
  name: string
  level: number
  leaf: boolean
  permissions: PermissionColumnState
}

export interface PermissionOriginRow {
  id: number
  name: string
  permissions: PermissionColumnState
}

export interface PermissionPanelState {
  loading: boolean
  tree: PermissionResourceTreeNode[]
  rows: PermissionTreeRow[]
  originRows: PermissionOriginRow[]
}

export interface PermissionShellState {
  mode: PermissionViewMode
  tab: PermissionTab
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

export interface SubjectPermissionQuery {
  id: number
  type?: number
  flag?: PermissionResourceFlag
}

export interface TargetPermissionQuery {
  id: number
  type?: number
  flag?: PermissionResourceFlag
}

export interface SubjectPermissionSavePayload extends SubjectPermissionQuery {
  permissions: PermissionMatrixItem[]
}

export interface TargetPermissionSavePayload {
  ids: number[]
  permissions: PermissionMatrixItem[]
  type?: number
  flag?: PermissionResourceFlag
}

export interface PermissionPager<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export type DatasetPermissionTargetType = 'role' | 'user' | 'sysParams'

export type RowDialogType = 'role' | 'user' | 'sysVar'

export type RowPermissionFilterType = 'all' | DatasetPermissionTargetType

export interface RowPermissionListQuery {
  page: number
  size: number
  authTargetType: RowPermissionFilterType
  keyword: string
}

export interface DatasetPermissionAuthObj {
  id: string
  name: string
}

export interface DatasetPermissionWhiteUser {
  id: string
  account: string
  name: string
}

export interface DatasetPermissionTreeRequestDTO {
  busiFlag?: 'dataset'
  leaf?: boolean
  weight?: number
  sortType?: string
  resourceTable?: string
}

export interface DatasetPermissionTreeNodeDTO {
  id: string | number
  pid?: string | number
  name: string
  leaf?: boolean
  weight?: number
  ext?: number
  extraFlag?: number
  extraFlag1?: number
  children?: DatasetPermissionTreeNodeDTO[]
}

export interface DatasetPermissionTreeNode {
  id: string
  name: string
  leaf: boolean
  children: DatasetPermissionTreeNode[]
}

export interface DatasetPreviewFieldDTO {
  fieldShortName?: string
  name?: string
  dataeaseName?: string
  originName?: string
  deType?: number
  description?: string
}

export interface DatasetPreviewTableDTO {
  fields: DatasetPreviewFieldDTO[]
  data: Array<Record<string, unknown>>
}

export interface DatasetPreviewResponseDTO {
  allFields: DatasetPreviewFieldDTO[]
  data: DatasetPreviewTableDTO
}

export interface DatasetRowPermissionDTO {
  id: string | null
  enable: boolean
  authTargetType: DatasetPermissionTargetType
  authTargetId: string | null
  datasetId: string
  expressionTree: string
  whiteListUser: string
  whiteListRole?: string
  whiteListDept?: string
  updateTime: number | null
  datasetName: string
  authTargetName: string
  whiteListUsers: DatasetPermissionWhiteUser[]
}

export interface RowPermissionDialogBootstrapState {
  type: RowDialogType
  targetId: string | null
  expressionTree: string
  whiteListIds: string[]
  enable: boolean
  editRowId: string | null
  missingTarget: boolean
  targetOptions: DatasetPermissionAuthObj[]
  whiteListOptions: DatasetPermissionWhiteUser[]
}

export type ColumnStrategy = 'Prohibit' | 'Desensitization'

export type ColumnPermissionFilterType = 'all' | 'role' | 'user'

export interface ColumnPermissionListQuery {
  page: number
  size: number
  authTargetType: ColumnPermissionFilterType
  keyword: string
}

export type BuiltInMaskRule =
  | 'CompleteDesensitization'
  | 'KeepFirstAndLastThreeCharacters'
  | 'KeepMiddleThreeCharacters'
  | 'custom'

export type CustomBuiltInMaskRule = 'RetainBeforeMAndAfterN' | 'RetainMToN'

export interface ColumnDesensitizationRule {
  builtInRule: BuiltInMaskRule
  customBuiltInRule: CustomBuiltInMaskRule
  m: number
  n: number
  specialCharacter: string
  specialCharacterList: string[]
}

export interface ColumnPermissionFieldRule {
  id: string
  name: string
  deType: number | null
  selected: boolean
  opt: ColumnStrategy
  desensitizationRule: ColumnDesensitizationRule
}

export interface DatasetColumnPermissionDTO {
  id: string | null
  enable: boolean
  authTargetType: 'role' | 'user'
  authTargetId: string | null
  datasetId: string
  permissions: string
  whiteListUser: string
  updateTime: number | null
  datasetName: string
  authTargetName: string
  whiteListUsers: DatasetPermissionWhiteUser[]
}

export interface ColumnPermissionDialogBootstrapState {
  subjectType: 'role' | 'user'
  selectedTargetId: string | null
  fieldRules: ColumnPermissionFieldRule[]
  selectedWhiteListIds: string[]
  enable: boolean
  editRowId: string | null
  missingTarget: boolean
  targetOptions: DatasetPermissionAuthObj[]
  whiteListOptions: DatasetPermissionWhiteUser[]
}
