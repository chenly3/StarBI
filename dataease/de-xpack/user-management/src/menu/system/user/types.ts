export type IdType = string | number

export interface ApiResponse<T> {
  code: number
  data: T
  msg?: string
}

export interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages?: number
}

export interface UserFilterState {
  keyword: string
  originList: number[]
  statusList: number[]
  roleIdList: IdType[]
}

export interface UserGridRow {
  id?: IdType
  account: string
  name: string
  email?: string
  orgName?: string
  enable: boolean
  createTime?: string | number
  origin?: number
  roleItems?: Array<{ id: IdType; name: string }>
}

export interface UserFormState {
  id?: IdType
  account: string
  name: string
  email: string
  phonePrefix?: string
  phone?: string
  roleIds: IdType[]
  enable: boolean
}

export interface RoleListItem {
  id: IdType
  name: string
  typeCode?: number
  system?: boolean
  desc?: string
}

export interface RoleQueryItem {
  id: IdType
  name: string
  readonly?: boolean
  root?: boolean
}

export interface RoleDetailState {
  id: IdType
  name: string
  typeCode: number
  desc?: string
}

export interface ImportResultState {
  dataKey: string
  successCount: number
  errorCount: number
}

export interface UserPagerRequest {
  keyword?: string
  originList?: number[]
  statusList?: Array<number | boolean>
  roleIdList?: IdType[]
  timeDesc?: boolean
}

export interface UserEnableSwitchRequest {
  id: IdType
  enable: boolean
}

export interface UserRoleQueryRequest {
  rid: IdType
  keyword?: string
  order?: string
}

export interface UserRoleMountRequest {
  rid: IdType
  uids: IdType[]
}

export interface UserRoleUnmountRequest {
  rid: IdType
  uid: IdType
}

export interface RoleCreateRequest {
  name: string
  typeCode: number
  desc?: string
}

export interface UserOptionItem {
  id: IdType
  account: string
  name: string
  email?: string
}

export interface MountedOrgItem {
  id: IdType
  name: string
  readOnly?: boolean
  leaf?: boolean
  children?: MountedOrgItem[]
}
