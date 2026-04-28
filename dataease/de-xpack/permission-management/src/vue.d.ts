declare module '*.vue' {
  import { defineComponent } from 'vue'

  const component: ReturnType<typeof defineComponent>
  export default component
}

declare module 'vue-router_2' {
  type LocationQueryValue = string | null
  type LocationQueryValueRaw = string | number | null | undefined
  type LocationQuery = Record<string, LocationQueryValue | LocationQueryValue[]>

  export interface RouteLocationNormalizedLoaded {
    query: LocationQuery
    params: Record<string, string | string[]>
    path: string
  }

  export interface Router {
    push(location: string | { path?: string; query?: Record<string, unknown> }): void | Promise<void>
    replace(location: string | { path?: string; query?: Record<string, unknown> }): void | Promise<void>
  }

  export function useRoute(): RouteLocationNormalizedLoaded
  export function useRouter(): Router
}

declare module '@/api/auth' {
  type PermissionResourceFlag =
    import('./menu/system/permission/types').PermissionResourceFlag

  interface PermissionQueryPayload {
    id: number
    type?: number
    flag?: PermissionResourceFlag
  }

  interface PermissionSaveItem {
    id: number
    weight: number
    ext: number
  }

  interface SubjectPermissionSavePayload {
    id: number
    permissions: PermissionSaveItem[]
  }

  interface TargetPermissionSavePayload {
    ids: number[]
    permissions: PermissionSaveItem[]
  }

  interface BusiSubjectPermissionSavePayload extends SubjectPermissionSavePayload {
    type?: number
    flag?: PermissionResourceFlag
  }

  interface BusiTargetPermissionSavePayload extends TargetPermissionSavePayload {
    type?: number
    flag?: PermissionResourceFlag
  }

  interface ApiResponse<T = unknown> {
    data?: T
  }

  export const menuPerApi: (data: { id: number }) => Promise<ApiResponse>
  export const menuPerSaveApi: (data: SubjectPermissionSavePayload) => Promise<ApiResponse>
  export const menuTargetPerApi: (data: { id: number }) => Promise<ApiResponse>
  export const menuTargetPerSaveApi: (data: TargetPermissionSavePayload) => Promise<ApiResponse>
  export const menuTreeApi: () => Promise<ApiResponse>
  export const resourcePerApi: (data: PermissionQueryPayload) => Promise<ApiResponse>
  export const resourceTargetPerApi: (data: PermissionQueryPayload) => Promise<ApiResponse>
  export const resourceTreeApi: (flag: string) => Promise<ApiResponse>
  export const busiPerSaveApi: (data: BusiSubjectPermissionSavePayload) => Promise<ApiResponse>
  export const busiTargetPerSaveApi: (data: BusiTargetPermissionSavePayload) => Promise<ApiResponse>
}

declare module '@/api/dataset' {
  type ColumnPermissionFieldRule =
    import('./menu/system/permission/types').ColumnPermissionFieldRule
  type DatasetColumnPermissionDTO =
    import('./menu/system/permission/types').DatasetColumnPermissionDTO
  type DatasetPermissionTargetType =
    import('./menu/system/permission/types').DatasetPermissionTargetType
  type DatasetRowPermissionDTO =
    import('./menu/system/permission/types').DatasetRowPermissionDTO

  export const rowPermissionList: (
    page: number,
    limit: number,
    datasetId: number
  ) => Promise<unknown>
  export const columnPermissionList: (
    page: number,
    limit: number,
    datasetId: number
  ) => Promise<unknown>
  export const saveRowPermission: (data: Partial<DatasetRowPermissionDTO>) => Promise<unknown>
  export const saveColumnPermission: (data: Partial<DatasetColumnPermissionDTO>) => Promise<unknown>
  export const deleteRowPermission: (data: Partial<DatasetRowPermissionDTO>) => Promise<unknown>
  export const deleteColumnPermission: (data: Partial<DatasetColumnPermissionDTO>) => Promise<unknown>
  export const whiteListUsersForPermissions: (data: {
    authTargetId: string
    authTargetType: DatasetPermissionTargetType
    datasetId: string
  }) => Promise<unknown>
  export const listFieldsWithPermissions: (
    datasetId: number
  ) => Promise<ColumnPermissionFieldRule[] | unknown>
  export const rowPermissionTargetObjList: (
    datasetId: number,
    type: 'role' | 'user'
  ) => Promise<unknown>
}
