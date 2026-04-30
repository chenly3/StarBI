import request from '@/config/axios'

export interface AIQueryThemeDataset {
  id: string
  name: string
  sort: number
}

export interface AIQueryTheme {
  id: string
  name: string
  description?: string
  status: boolean
  sort: number
  orgId?: string
  defaultDashboardId?: string
  welcomeText?: string
  recommendedQuestions: string[]
  datasetIds: string[]
  defaultDatasetIds: string[]
  datasets: AIQueryThemeDataset[]
  datasetCount: number
  createTime?: number
  updateTime?: number
}

export interface AIQueryThemeSaveRequest {
  id?: string
  name: string
  description?: string
  status: boolean
  sort: number
  defaultDashboardId?: string
  welcomeText?: string
  recommendedQuestions: string[]
  datasetIds: string[]
  defaultDatasetIds: string[]
}

export interface SQLBotEmbedConfig {
  domain?: string
  id?: string
  enabled?: boolean
  valid?: boolean
}

export interface SQLBotAdminEmbedConfig extends SQLBotEmbedConfig {
  pageKey: string
  token?: string
}

export interface AIQueryRuntimeModel {
  id: string
  name: string
  defaultModel: boolean
}

export interface AIQueryRuntimeModelsPayload {
  models: AIQueryRuntimeModel[]
  defaultModelId?: string
}

export interface AIQueryExecutionOverview {
  startTime?: string
  finishTime?: string
  duration?: number
  totalTokens?: number
}

export interface AIQueryExecutionStep {
  operateKey?: string
  operateLabel?: string
  startTime?: string
  finishTime?: string
  duration?: number
  totalTokens?: number
  localOperation?: boolean
  error?: boolean
  message?: any
}

export interface AIQueryExecutionDetails {
  overview: AIQueryExecutionOverview
  steps: AIQueryExecutionStep[]
}

export interface RuntimeDatasource {
  id: string | number
  name: string
  type?: string
  tables?: Array<{
    name: string
    comment?: string
    fields?: Array<{
      name?: string
      dataeaseName?: string
      comment?: string
      type?: string
    }>
  }>
}

const normalizeTheme = (theme: any): AIQueryTheme => {
  const datasets = (theme?.datasets || []).map((dataset: any) => ({
    id: String(dataset.id),
    name: dataset.name,
    sort: dataset.sort || 0
  }))

  return {
    id: String(theme.id),
    name: theme.name,
    description: theme.description,
    status: theme.status !== false,
    sort: theme.sort || 0,
    orgId: theme.orgId ? String(theme.orgId) : undefined,
    defaultDashboardId: theme.defaultDashboardId ? String(theme.defaultDashboardId) : undefined,
    welcomeText: theme.welcomeText,
    recommendedQuestions: theme.recommendedQuestions || [],
    datasetIds: (theme.datasetIds || []).map(item => String(item)),
    defaultDatasetIds: (theme.defaultDatasetIds || []).map(item => String(item)),
    datasets,
    datasetCount: theme.datasetCount || datasets.length,
    createTime: theme.createTime,
    updateTime: theme.updateTime
  }
}

const normalizeThemeSaveRequest = (data: AIQueryThemeSaveRequest): AIQueryThemeSaveRequest => {
  const datasetIds = [
    ...new Set((data.datasetIds || []).map(item => String(item)).filter(Boolean))
  ]

  if (!datasetIds.length) {
    throw new Error('分析主题至少需要绑定一个数据集')
  }

  const defaultDatasetIds = [
    ...new Set(
      (data.defaultDatasetIds || [])
        .map(item => String(item))
        .filter(item => item && datasetIds.includes(item))
    )
  ]

  return {
    ...data,
    datasetIds,
    defaultDatasetIds: defaultDatasetIds.length ? defaultDatasetIds : [datasetIds[0]]
  }
}

export const listAIQueryThemes = async (): Promise<AIQueryTheme[]> => {
  return request.get({ url: '/ai/query/themes' }).then((res: any) => {
    return (res?.data || res || []).map(normalizeTheme)
  })
}

export const getAIQueryTheme = async (id: string): Promise<AIQueryTheme> => {
  return request.get({ url: `/ai/query/themes/${id}` }).then((res: any) => {
    return normalizeTheme(res?.data || res)
  })
}

export const createAIQueryTheme = async (data: AIQueryThemeSaveRequest): Promise<AIQueryTheme> => {
  return request
    .post({ url: '/ai/query/themes', data: normalizeThemeSaveRequest(data) })
    .then((res: any) => {
      return normalizeTheme(res?.data || res)
    })
}

export const updateAIQueryTheme = async (data: AIQueryThemeSaveRequest): Promise<AIQueryTheme> => {
  return request
    .put({ url: '/ai/query/themes', data: normalizeThemeSaveRequest(data) })
    .then((res: any) => {
      return normalizeTheme(res?.data || res)
    })
}

export const deleteAIQueryTheme = async (id: string) => {
  return request.delete({ url: `/ai/query/themes/${id}` })
}

export const getSQLBotEmbedConfig = async (): Promise<SQLBotEmbedConfig> => {
  return request.get({ url: '/ai/query/sqlbot/embed-config' }).then((res: any) => {
    return res?.data || res || {}
  })
}

export const getSQLBotOldEmbedConfig = async (): Promise<SQLBotEmbedConfig> => {
  return request.get({ url: '/ai/query/sqlbotOld/embed-config' }).then((res: any) => {
    return res?.data || res || {}
  })
}

export const getSQLBotAdminEmbedConfig = async (
  pageKey: string
): Promise<SQLBotAdminEmbedConfig> => {
  return request.get({ url: `/ai/query/sqlbot/admin-embed-config/${pageKey}` }).then((res: any) => {
    return res?.data || res || {}
  })
}

export const getAIQueryRuntimeModels = async (): Promise<AIQueryRuntimeModelsPayload> => {
  return request.get({ url: '/ai/query/runtime/models' }).then((res: any) => {
    const payload = res?.data || res || {}
    const rawModels = Array.isArray(payload?.models) ? payload.models : []
    return {
      models: rawModels.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        defaultModel: item.defaultModel === true || item.isDefault === true
      })),
      defaultModelId: payload?.defaultModelId ? String(payload.defaultModelId) : undefined
    }
  })
}

export const getRuntimeDatasources = async (
  datasetIds: string[],
  dsId?: string
): Promise<RuntimeDatasource[]> => {
  return request
    .get({
      url: '/sqlbot/datasource',
      params: {
        datasetIds: datasetIds.join(','),
        dsId
      }
    })
    .then((res: any) => {
      return (res?.data || res || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        tables: item.tables || []
      }))
    })
}

export const getExecutionDetails = async (
  recordId: number | string
): Promise<AIQueryExecutionDetails> => {
  return request
    .get({ url: `/ai/query/runtime/records/${recordId}/execution-details` })
    .then((res: any) => {
      const payload = res?.data || res || {}
      return {
        overview: payload?.overview || {},
        steps: Array.isArray(payload?.steps) ? payload.steps : []
      }
    })
}
