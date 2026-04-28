import {
  clonePermissionColumns,
  decodePermissionColumns,
  encodePermissionColumns
} from './types'
import type {
  ColumnPermissionFieldRule,
  DatasetColumnPermissionDTO,
  DatasetPermissionAuthObj,
  DatasetPreviewResponseDTO,
  DatasetPermissionTreeNode,
  DatasetPermissionTreeNodeDTO,
  DatasetPermissionTreeRequestDTO,
  DatasetPermissionTargetType,
  DatasetPermissionWhiteUser,
  DatasetRowPermissionDTO,
  PermissionPager,
  PermissionMatrixState,
  PermissionPanelTab,
  PermissionResourceFlag,
  PermissionResourceTreeNode,
  PermissionSubjectOption,
  SubjectPermissionQuery,
  SubjectPermissionSavePayload,
  TargetPermissionQuery,
  TargetPermissionSavePayload
} from './types'

type ApiResponse<T = unknown> = {
  code?: number
  data?: T
  msg?: string
}

const apiBasePath = import.meta.env.VITE_API_BASEPATH || '/api'
const localeMapping: Record<string, string> = {
  'zh-CN': 'zh-CN',
  en: 'en-US',
  tw: 'zh-TW'
}

const getBrowserLocale = (): string => {
  if (typeof navigator === 'undefined') {
    return 'zh-CN'
  }
  const language =
    navigator.language || (Array.isArray(navigator.languages) ? navigator.languages[0] : '')
  return language || 'zh-CN'
}

const getLocale = (): string => {
  const locale = readCachedValue('user.language')
  if (typeof locale === 'string' && locale) {
    return locale
  }
  return getBrowserLocale()
}

const readCachedValue = (key: string): unknown => {
  if (typeof window === 'undefined') {
    return null
  }
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return null
  }
  try {
    const outer = JSON.parse(raw) as { e?: number; v?: string }
    if (
      outer &&
      typeof outer === 'object' &&
      typeof outer.e === 'number' &&
      typeof outer.v === 'string'
    ) {
      if (Date.now() >= outer.e) {
        window.localStorage.removeItem(key)
        return null
      }
      return JSON.parse(outer.v)
    }
  } catch {
    return raw
  }
  return raw
}

const isMobile = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false
  }
  return Boolean(
    navigator.userAgent.match(
      /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
    )
  )
}

const resolveApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (typeof window === 'undefined') {
    return `${apiBasePath.replace(/\/$/, '')}${normalizedPath}`
  }
  const normalizedBase = apiBasePath.endsWith('/') ? apiBasePath : `${apiBasePath}/`
  const baseUrl = new URL(normalizedBase, window.location.href)
  return new URL(normalizedPath.slice(1), baseUrl).toString()
}

const buildHeaders = (headers?: HeadersInit): HeadersInit => {
  const locale = getLocale()
  const token = readCachedValue('user.token')
  return {
    'Content-Type': 'application/json',
    'Accept-Language': localeMapping[locale] || locale,
    ...(isMobile() ? { 'X-DE-MOBILE': 'true' } : {}),
    ...(typeof token === 'string' && token ? { 'X-DE-TOKEN': token } : {}),
    ...(headers || {})
  }
}

const requestJson = async <T = unknown>(
  url: string,
  init?: RequestInit & { data?: unknown }
): Promise<ApiResponse<T>> => {
  const { data, headers, ...rest } = init || {}
  const response = await fetch(resolveApiUrl(url), {
    credentials: 'same-origin',
    ...rest,
    headers: buildHeaders(headers),
    body: data === undefined ? rest.body : JSON.stringify(data)
  })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  const payload = (await response.json()) as ApiResponse<T>
  if (payload?.code != null && payload.code !== 0 && payload.code !== 50002) {
    throw new Error(payload.msg || 'Request failed')
  }
  return payload
}

const getJson = <T = unknown>(url: string) => requestJson<T>(url, { method: 'GET' })

const postJson = <T = unknown>(url: string, data?: unknown) =>
  requestJson<T>(url, { method: 'POST', data })

const decodeOriginNames = (items: unknown): void => {
  if (!Array.isArray(items)) {
    return
  }
  items.forEach(item => {
    if (!item || typeof item !== 'object') {
      return
    }
    const record = item as { extField?: unknown; originName?: unknown }
    if (record.extField === 2 && typeof record.originName === 'string') {
      try {
        record.originName = atob(record.originName)
      } catch {
        record.originName = record.originName
      }
    }
  })
}

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toIdString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'bigint') {
    return String(value)
  }
  return null
}

const normalizeTree = (nodes: unknown): PermissionResourceTreeNode[] => {
  if (!Array.isArray(nodes)) {
    return []
  }
  return nodes
    .map(node => {
      const id = toNumber((node as { id?: unknown }).id)
      if (id === null) {
        return null
      }
      return {
        id,
        name: String((node as { name?: unknown }).name || ''),
        leaf: Boolean((node as { leaf?: unknown }).leaf),
        children: normalizeTree((node as { children?: unknown }).children)
      }
    })
    .filter(Boolean) as PermissionResourceTreeNode[]
}

const normalizeMatrix = (payload: unknown): PermissionMatrixState => {
  const source = (payload || {}) as {
    root?: unknown
    readonly?: unknown
    permissions?: Array<{ id?: unknown; ext?: unknown; checked?: unknown }>
    permissionOrigins?: Array<{
      id?: unknown
      name?: unknown
      permissions?: Array<{ id?: unknown; ext?: unknown; checked?: unknown }>
    }>
  }
  return {
    root: Boolean(source.root),
    readonly: Boolean(source.readonly),
    permissions: Array.isArray(source.permissions)
      ? source.permissions
          .map(item => {
            const id = toNumber(item?.id)
            if (id === null) {
              return null
            }
            const ext = Math.max(toNumber(item?.ext) ?? (item?.checked ? 1 : 0), 0)
            return {
              id,
              ext,
              permissions: decodePermissionColumns(ext)
            }
          })
          .filter(Boolean) as PermissionMatrixState['permissions']
      : [],
    permissionOrigins: Array.isArray(source.permissionOrigins)
      ? source.permissionOrigins
          .map(origin => {
            const id = toNumber(origin?.id)
            if (id === null) {
              return null
            }
            return {
              id,
              name: String(origin?.name || ''),
              permissions: Array.isArray(origin?.permissions)
                ? origin.permissions
                    .map(item => {
                      const itemId = toNumber(item?.id)
                      if (itemId === null) {
                        return null
                      }
                      const ext = Math.max(toNumber(item?.ext) ?? (item?.checked ? 1 : 0), 0)
                      return {
                        id: itemId,
                        ext,
                        permissions: decodePermissionColumns(ext)
                      }
                    })
                    .filter(Boolean)
                : []
            }
          })
          .filter(Boolean) as PermissionMatrixState['permissionOrigins']
      : []
  }
}

const toSubjectQueryPayload = (query: SubjectPermissionQuery) => {
  return {
    id: query.id,
    type: query.type,
    flag: query.flag
  }
}

const toTargetQueryPayload = (query: TargetPermissionQuery) => {
  return {
    id: query.id,
    type: query.type,
    flag: query.flag
  }
}

const toSavePermissions = (permissions: SubjectPermissionSavePayload['permissions']) => {
  return permissions.map(item => ({
    id: item.id,
    weight: 1,
    ext: encodePermissionColumns(clonePermissionColumns(item.permissions))
  }))
}

const normalizePermissionSubjects = (
  users: unknown,
  roles: unknown
): PermissionSubjectOption[] => {
  const result: PermissionSubjectOption[] = []
  const seen = new Set<string>()

  if (Array.isArray(users)) {
    users.forEach(user => {
      const id = toNumber((user as { id?: unknown }).id)
      if (id === null) {
        return
      }
      const account = String((user as { account?: unknown }).account || '').trim()
      const name = account || String((user as { name?: unknown }).name || '').trim() || String(id)
      const key = `user:${id}`
      if (seen.has(key)) {
        return
      }
      seen.add(key)
      result.push({
        id,
        name,
        type: 'user'
      })
    })
  }

  if (Array.isArray(roles)) {
    roles.forEach(role => {
      const id = toNumber((role as { id?: unknown }).id)
      if (id === null) {
        return
      }
      const name = String((role as { name?: unknown }).name || '').trim() || String(id)
      const key = `role:${id}`
      if (seen.has(key)) {
        return
      }
      seen.add(key)
      result.push({
        id,
        name,
        type: 'role'
      })
    })
  }

  return result
}

export const fetchPermissionSubjects = async (): Promise<PermissionSubjectOption[]> => {
  const [userRes, roleRes] = await Promise.all([
    postJson('/user/pager/1/1000', {}),
    postJson('/role/query', {})
  ])
  const userData = unwrapResponseData<unknown>(userRes)
  const roleData = unwrapResponseData<unknown>(roleRes)
  const users = (userData as { records?: unknown[] })?.records || []
  return normalizePermissionSubjects(users, roleData)
}

export const fetchMenuTree = async (): Promise<PermissionResourceTreeNode[]> => {
  const res = await getJson('/auth/menuResource')
  return normalizeTree(res?.data)
}

export const fetchResourceTree = async (
  flag: PermissionResourceFlag
): Promise<PermissionResourceTreeNode[]> => {
  const res = await getJson(`/auth/busiResource/${flag}`)
  return normalizeTree(res?.data)
}

export const fetchSubjectPermission = async (
  panel: PermissionPanelTab,
  query: SubjectPermissionQuery
): Promise<PermissionMatrixState> => {
  const res =
    panel === 'menu'
      ? await postJson('/auth/menuPermission', { id: query.id })
      : await postJson('/auth/busiPermission', toSubjectQueryPayload(query))
  return normalizeMatrix(res?.data)
}

export const fetchTargetPermission = async (
  panel: PermissionPanelTab,
  query: TargetPermissionQuery
): Promise<PermissionMatrixState> => {
  const res =
    panel === 'menu'
      ? await postJson('/auth/menuTargetPermission', { id: query.id })
      : await postJson('/auth/busiTargetPermission', toTargetQueryPayload(query))
  return normalizeMatrix(res?.data)
}

export const saveSubjectPermission = async (
  panel: PermissionPanelTab,
  payload: SubjectPermissionSavePayload
) => {
  const normalized = {
    ...toSubjectQueryPayload(payload),
    permissions: toSavePermissions(payload.permissions)
  }
  if (panel === 'menu') {
    return postJson('/auth/saveMenuPer', { id: payload.id, permissions: normalized.permissions })
  }
  return postJson('/auth/saveBusiPer', normalized)
}

export const saveTargetPermission = async (
  panel: PermissionPanelTab,
  payload: TargetPermissionSavePayload
) => {
  const normalized = {
    ids: payload.ids,
    type: payload.type,
    flag: payload.flag,
    permissions: toSavePermissions(payload.permissions)
  }
  if (panel === 'menu') {
    return postJson('/auth/saveMenuTargetPer', {
      ids: payload.ids,
      permissions: normalized.permissions
    })
  }
  return postJson('/auth/saveBusiTargetPer', normalized)
}

const unwrapResponseData = <T>(payload: unknown): T => {
  const first = (payload as { data?: unknown })?.data ?? payload
  const second = (first as { data?: unknown })?.data
  if (
    second != null &&
    typeof first === 'object' &&
    !Array.isArray(first) &&
    !Array.isArray(second) &&
    !('records' in (first as Record<string, unknown>))
  ) {
    return second as T
  }
  return first as T
}

const normalizeWhiteListUsers = (users: unknown): DatasetPermissionWhiteUser[] => {
  if (!Array.isArray(users)) {
    return []
  }
  return users
    .map(user => {
      const id = toIdString((user as { id?: unknown }).id)
      if (id === null) {
        return null
      }
      const account = String(
        (user as { account?: unknown }).account ||
          (user as { nickName?: unknown }).nickName ||
          id
      )
      const displayName = String(
        (user as { name?: unknown }).name ||
          (user as { nickName?: unknown }).nickName ||
          (user as { account?: unknown }).account ||
          id
      )
      return {
        id,
        account,
        name: displayName
      }
    })
    .filter(Boolean) as DatasetPermissionWhiteUser[]
}

const normalizeRowPermission = (item: unknown): DatasetRowPermissionDTO | null => {
  const id = toIdString((item as { id?: unknown }).id)
  const datasetId = toIdString((item as { datasetId?: unknown }).datasetId)
  if (datasetId === null) {
    return null
  }
  return {
    id,
    enable: Boolean((item as { enable?: unknown }).enable ?? true),
    authTargetType: String(
      (item as { authTargetType?: unknown }).authTargetType || 'role'
    ) as DatasetPermissionTargetType,
    authTargetId: toIdString((item as { authTargetId?: unknown }).authTargetId),
    datasetId,
    expressionTree: String((item as { expressionTree?: unknown }).expressionTree || ''),
    whiteListUser: String((item as { whiteListUser?: unknown }).whiteListUser || '[]'),
    whiteListRole: String((item as { whiteListRole?: unknown }).whiteListRole || '[]'),
    whiteListDept: String((item as { whiteListDept?: unknown }).whiteListDept || '[]'),
    updateTime: toNumber((item as { updateTime?: unknown }).updateTime),
    datasetName: String((item as { datasetName?: unknown }).datasetName || ''),
    authTargetName: String((item as { authTargetName?: unknown }).authTargetName || ''),
    whiteListUsers: normalizeWhiteListUsers((item as { whiteListUsers?: unknown }).whiteListUsers)
  }
}

const normalizeColumnPermission = (item: unknown): DatasetColumnPermissionDTO | null => {
  const id = toIdString((item as { id?: unknown }).id)
  const datasetId = toIdString((item as { datasetId?: unknown }).datasetId)
  const authType = String((item as { authTargetType?: unknown }).authTargetType || '')
  if (datasetId === null || (authType !== 'role' && authType !== 'user')) {
    return null
  }
  return {
    id,
    enable: Boolean((item as { enable?: unknown }).enable ?? true),
    authTargetType: authType,
    authTargetId: toIdString((item as { authTargetId?: unknown }).authTargetId),
    datasetId,
    permissions: String((item as { permissions?: unknown }).permissions || ''),
    whiteListUser: String((item as { whiteListUser?: unknown }).whiteListUser || '[]'),
    updateTime: toNumber((item as { updateTime?: unknown }).updateTime),
    datasetName: String((item as { datasetName?: unknown }).datasetName || ''),
    authTargetName: String((item as { authTargetName?: unknown }).authTargetName || ''),
    whiteListUsers: normalizeWhiteListUsers((item as { whiteListUsers?: unknown }).whiteListUsers)
  }
}

const normalizePager = <T>(payload: unknown, normalize: (item: unknown) => T | null): PermissionPager<T> => {
  const page = (payload || {}) as {
    records?: unknown
    total?: unknown
    current?: unknown
    size?: unknown
  }
  return {
    records: Array.isArray(page.records)
      ? (page.records.map(normalize).filter(Boolean) as T[])
      : [],
    total: toNumber(page.total) ?? 0,
    current: toNumber(page.current) ?? 1,
    size: toNumber(page.size) ?? 20
  }
}

const normalizeDatasetPermissionTree = (
  nodes: unknown
): DatasetPermissionTreeNode[] => {
  if (!Array.isArray(nodes)) {
    return []
  }
  return nodes
    .map(node => {
      const id = toIdString((node as DatasetPermissionTreeNodeDTO)?.id)
      if (id === null) {
        return null
      }
      const children = normalizeDatasetPermissionTree(
        (node as DatasetPermissionTreeNodeDTO)?.children
      )
      const hasChildren = children.length > 0
      return {
        id,
        name: String((node as DatasetPermissionTreeNodeDTO)?.name || id),
        leaf: !hasChildren || (node as DatasetPermissionTreeNodeDTO)?.leaf === true,
        children
      }
    })
    .filter(Boolean) as DatasetPermissionTreeNode[]
}

export const listDatasetPermissionTree = async (
  data: DatasetPermissionTreeRequestDTO = {}
): Promise<DatasetPermissionTreeNode[]> => {
  const res = await postJson('/datasetTree/tree', {
    ...data,
    busiFlag: 'dataset'
  })
  return normalizeDatasetPermissionTree(unwrapResponseData<unknown>(res))
}

export const getDatasetPreviewData = async (id: string): Promise<DatasetPreviewResponseDTO> => {
  const res = await postJson<DatasetPreviewResponseDTO>(`/datasetTree/get/${id}`, {})
  const payload = (res?.data || {
    allFields: [],
    data: { fields: [], data: [] }
  }) as DatasetPreviewResponseDTO
  decodeOriginNames(payload.allFields)
  decodeOriginNames(payload.data?.fields)
  return {
    allFields: Array.isArray(payload.allFields) ? payload.allFields : [],
    data: {
      fields: Array.isArray(payload.data?.fields) ? payload.data.fields : [],
      data: Array.isArray(payload.data?.data) ? payload.data.data : []
    }
  }
}

export const getDatasetPreviewTotal = async (id: string): Promise<number> => {
  const res = await postJson<number>('/datasetData/getDatasetTotal', { id })
  const total = Number(res?.data)
  return Number.isFinite(total) ? total : 0
}

export const listRowPermissions = async (
  datasetId: string | number,
  page = 1,
  size = 20
): Promise<PermissionPager<DatasetRowPermissionDTO>> => {
  const requestDatasetId = String(datasetId)
  const res = await getJson(`/dataset/rowPermissions/pager/${requestDatasetId}/${page}/${size}`)
  const data = unwrapResponseData<unknown>(res)
  return normalizePager(data, normalizeRowPermission)
}

export const listColumnPermissions = async (
  datasetId: string | number,
  page = 1,
  size = 20,
  query: {
    authTargetType?: string
    keyword?: string
  } = {}
): Promise<PermissionPager<DatasetColumnPermissionDTO>> => {
  const requestDatasetId = String(datasetId)
  void query
  const res = await getJson(`/dataset/columnPermissions/pager/${requestDatasetId}/${page}/${size}`)
  const data = unwrapResponseData<unknown>(res)
  return normalizePager(data, normalizeColumnPermission)
}

export const saveRowPermission = async (data: Partial<DatasetRowPermissionDTO>) => {
  return postJson('/dataset/rowPermissions/save', data)
}

export const saveColumnPermission = async (data: Partial<DatasetColumnPermissionDTO>) => {
  return postJson('/dataset/columnPermissions/save', data)
}

export const deleteRowPermission = async (data: Partial<DatasetRowPermissionDTO>) => {
  return postJson('/dataset/rowPermissions/delete', data)
}

export const deleteColumnPermission = async (data: Partial<DatasetColumnPermissionDTO>) => {
  return postJson('/dataset/columnPermissions/delete', data)
}

export const whiteListUsersForPermissions = async (data: {
  authTargetId: string
  authTargetType: DatasetPermissionTargetType
  datasetId: string
}): Promise<DatasetPermissionWhiteUser[]> => {
  const res = await postJson('/dataset/rowPermissions/whiteListUsers', data)
  return normalizeWhiteListUsers(unwrapResponseData<unknown>(res))
}

export const listFieldsWithPermissions = async (
  datasetId: string | number
): Promise<ColumnPermissionFieldRule[]> => {
  const requestDatasetId = String(datasetId)
  const res = await getJson(`/datasetField/listWithPermissions/${requestDatasetId}`)
  decodeOriginNames(res?.data)
  const rows = unwrapResponseData<unknown>(res)
  if (!Array.isArray(rows)) {
    return []
  }
  const normalized = rows
    .map(item => {
      const id = toIdString((item as { id?: unknown }).id)
      if (id === null) {
        return null
      }
      return {
        id,
        name: String((item as { name?: unknown }).name || ''),
        deType: toNumber((item as { deType?: unknown }).deType),
        selected: false,
        opt: 'Prohibit' as const,
        desensitizationRule: {
          builtInRule: 'CompleteDesensitization' as const,
          customBuiltInRule: 'RetainBeforeMAndAfterN' as const,
          m: 1,
          n: 1,
          specialCharacter: '*',
          specialCharacterList: ['*']
        }
      }
    })
    .filter(Boolean) as ColumnPermissionFieldRule[]
  return normalized
}

export const rowPermissionTargetObjList = async (
  datasetId: string | number,
  type: 'role' | 'user'
): Promise<DatasetPermissionAuthObj[]> => {
  const requestDatasetId = String(datasetId)
  const res = await getJson(`/dataset/rowPermissions/authObjs/${requestDatasetId}/${type}`)
  const rows = unwrapResponseData<unknown>(res)
  if (!Array.isArray(rows)) {
    return []
  }
  return rows
    .map(item => {
      const id = toIdString((item as { id?: unknown }).id)
      if (id === null) {
        return null
      }
      return {
        id,
        name: String((item as { name?: unknown }).name || id)
      }
    })
    .filter(Boolean) as DatasetPermissionAuthObj[]
}
