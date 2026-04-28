export type IdType = string | number

export interface ApiResponse<T> {
  code: number
  data: T
  msg?: string
}

export interface OrgTreeNode {
  id: IdType
  name: string
  createTime?: number | string
  readOnly?: boolean
  children?: OrgTreeNode[]
}

export interface MountedOrgItem {
  id: IdType
  name: string
  readOnly?: boolean
  leaf?: boolean
  children?: MountedOrgItem[]
}

export interface OrgTableRow {
  id: IdType
  name: string
  createTime?: number | string
  childCount: number
  depth: number
  ancestorHasNextSibling: boolean[]
  isLastSibling: boolean
  hasChildren: boolean
  expanded: boolean
  readOnly?: boolean
  children?: OrgTreeNode[]
}

export interface OrgFormState {
  id?: IdType
  name: string
  pid?: IdType | '' | null
}

export interface ParentOption {
  value: IdType
  label: string
}

export interface DeleteCheckState {
  deletable: boolean
  blockers: string[]
  message: string
}
