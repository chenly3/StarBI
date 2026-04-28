import { get, post } from './http'
import type {
  ApiResponse,
  DeleteCheckState,
  IdType,
  MountedOrgItem,
  OrgFormState,
  OrgTreeNode
} from '../types'

export const queryOrgTree = (keyword = '') =>
  post<ApiResponse<OrgTreeNode[]>>('/org/page/tree', {
    keyword: keyword || undefined,
    desc: true
  })

export const queryMountedOrgs = () =>
  post<ApiResponse<MountedOrgItem[]>>('/org/mounted', { keyword: undefined })

export const createOrg = (payload: Omit<OrgFormState, 'id'>) =>
  post<ApiResponse<IdType>>('/org/page/create', {
    name: payload.name,
    pid: payload.pid === '' || payload.pid === null ? undefined : payload.pid
  })

export const editOrg = (payload: Required<Pick<OrgFormState, 'id' | 'name'>>) =>
  post<ApiResponse<void>>('/org/page/edit', payload)

export const checkDeleteOrg = (id: IdType) =>
  get<ApiResponse<DeleteCheckState>>(`/org/page/delete-check/${id}`)

export const deleteOrg = (id: IdType) => post<ApiResponse<void>>(`/org/page/delete/${id}`)
