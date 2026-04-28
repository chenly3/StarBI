import { get, post } from './http'
import type { HttpResponse } from './http'
import type {
  ApiResponse,
  IdType,
  ImportResultState,
  MountedOrgItem,
  PageResponse,
  RoleCreateRequest,
  RoleDetailState,
  RoleQueryItem,
  UserEnableSwitchRequest,
  UserFormState,
  UserGridRow,
  UserOptionItem,
  UserPagerRequest,
  UserRoleMountRequest,
  UserRoleQueryRequest,
  UserRoleUnmountRequest
} from '../types'

export const pagerUsers = (page: number, limit: number, data: UserPagerRequest) =>
  post<ApiResponse<PageResponse<UserGridRow>>>(`/user/pager/${page}/${limit}`, data)

export const createUser = (data: Omit<UserFormState, 'id'>) =>
  post<ApiResponse<IdType>>('/user/create', data)

export const editUser = (data: UserFormState) => post<ApiResponse<void>>('/user/edit', data)

export const queryUser = (id: IdType) => get<ApiResponse<UserFormState>>(`/user/queryById/${id}`)

export const deleteUser = (id: IdType) => post<ApiResponse<void>>(`/user/delete/${id}`)

export const batchDeleteUsers = (ids: IdType[]) => post<ApiResponse<void>>('/user/batchDel', ids)

export const switchUserEnable = (data: UserEnableSwitchRequest) =>
  post<ApiResponse<void>>('/user/enable', data)

export const resetUserPassword = (id: IdType) => post<ApiResponse<void>>(`/user/resetPwd/${id}`)

export const queryDefaultPassword = () => get<ApiResponse<string>>('/user/defaultPwd')

export const importTemplate = (): Promise<HttpResponse<Blob>> =>
  post<Blob>('/user/excelTemplate', undefined, { responseType: 'blob' })

export const importUsers = (data: FormData) =>
  post<ApiResponse<ImportResultState>>('/user/batchImport', data, {
    headersType: 'multipart/form-data'
  })

export const downloadImportErrors = (key: string): Promise<HttpResponse<Blob>> =>
  get<Blob>(`/user/errorRecord/${key}`, { responseType: 'blob' })

export const queryRoles = (keyword = '') =>
  post<ApiResponse<RoleQueryItem[]>>('/role/query', { keyword })

export const queryRoleDetail = (id: IdType) =>
  get<ApiResponse<RoleDetailState>>(`/role/detail/${id}`)

export const queryRoleMembers = (page: number, limit: number, data: UserRoleQueryRequest) =>
  post<ApiResponse<PageResponse<UserOptionItem>>>(`/user/role/selected/${page}/${limit}`, data)

export const queryRoleUserOptions = (data: UserRoleQueryRequest) =>
  post<ApiResponse<UserOptionItem[]>>('/user/role/option', data)

export const mountRoleUsers = (data: UserRoleMountRequest) =>
  post<ApiResponse<void>>('/role/mountUser', data)

export const preflightUnmountRoleUser = (data: UserRoleUnmountRequest) =>
  post<ApiResponse<number>>('/role/beforeUnmountInfo', data)

export const unmountRoleUser = (data: UserRoleUnmountRequest) =>
  post<ApiResponse<void>>('/role/unMountUser', data)

export const createRole = (data: RoleCreateRequest) => post<ApiResponse<IdType>>('/role/create', data)

export const switchOrg = (id: IdType) => post<ApiResponse<unknown>>(`/user/switch/${id}`)

export const mountedOrg = (keyword = '') =>
  post<ApiResponse<MountedOrgItem[]>>('/org/mounted', { keyword })
