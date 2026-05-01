import request from '@/config/axios'
import { PATH_URL } from '@/config/axios/service'
import { configHandler } from '@/config/axios/refresh'

// --- Chat ---
export interface ChatStreamPayload {
  question: string
  datasetId?: string
  themeId?: string
}

export interface ChatStreamEvent {
  data: string
  event?: string
  id?: string
  retry?: number
}

export interface ChatStreamCallbacks {
  onOpen?: (response: Response) => void
  onMessage?: (data: string, event: ChatStreamEvent) => void
  onError?: (error: unknown) => void
  onClose?: () => void
  signal?: AbortSignal
}

const resolveFetchUrl = (url: string) => {
  const base = PATH_URL.endsWith('/') ? PATH_URL.slice(0, -1) : PATH_URL
  return `${base}${url}`
}

const unwrapResponseData = (response: any) => {
  let payload = response
  while (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'data' in payload &&
    'code' in payload
  ) {
    payload = payload.data
  }
  return payload
}

const normalizeArrayResponse = (response: any) => {
  const payload = unwrapResponseData(response)
  return Array.isArray(payload) ? payload : []
}

const normalizePageResponse = (response: any) => {
  const payload = unwrapResponseData(response)
  const data = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
  return {
    current_page: payload?.current_page || 1,
    page_size: payload?.page_size || data.length,
    total_count: payload?.total_count || data.length,
    total_pages: payload?.total_pages || 0,
    data
  }
}

const parseSseMessage = (message: string): ChatStreamEvent | null => {
  const event: ChatStreamEvent = { data: '' }
  const data: string[] = []

  message.split('\n').forEach(line => {
    if (!line || line.startsWith(':')) return
    const index = line.indexOf(':')
    const field = index === -1 ? line : line.slice(0, index)
    const rawValue = index === -1 ? '' : line.slice(index + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'data') data.push(value)
    else if (field === 'event') event.event = value
    else if (field === 'id') event.id = value
    else if (field === 'retry' && !Number.isNaN(Number(value))) event.retry = Number(value)
  })

  event.data = data.join('\n')
  return data.length || event.event || event.id || event.retry ? event : null
}

const readSseStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: ChatStreamEvent) => void
) => {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    const messages = buffer.split('\n\n')
    buffer = messages.pop() || ''
    messages.forEach(message => {
      const event = parseSseMessage(message)
      if (event) onEvent(event)
    })
  }
}

export const chatStream = async (
  payload: ChatStreamPayload,
  callbacks: ChatStreamCallbacks = {}
) => {
  const config = await configHandler({
    url: '/ai/query/chat/stream',
    method: 'post',
    headers: {},
    data: payload
  })
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...(config.headers as Record<string, string>)
  }

  try {
    const response = await fetch(resolveFetchUrl('/ai/query/chat/stream'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: callbacks.signal
    })

    if (!response.ok) throw new Error(await response.text())
    if (!response.body) throw new Error('ReadableStream is not supported by this browser.')

    callbacks.onOpen?.(response)
    await readSseStream(response.body.getReader(), event =>
      callbacks.onMessage?.(event.data, event)
    )
  } catch (error) {
    callbacks.onError?.(error)
    throw error
  } finally {
    callbacks.onClose?.()
  }
}

export const chatMessage = (payload: ChatStreamPayload) =>
  request.post({ url: '/ai/query/chat/message', data: payload })

export const chatHistory = (chatId: string) =>
  request.get({ url: '/ai/query/chat/history', params: { chatId } })

export const chatRecommend = (data: Record<string, unknown>) =>
  request.post({ url: '/ai/query/chat/recommend', data })

// --- Models ---
export const listModels = () =>
  request.get({ url: '/ai/query/models', silentError: true }).then(normalizeArrayResponse)
export const getModel = (id: string) =>
  request.get({ url: `/ai/query/models/${id}` }).then(unwrapResponseData)
export const createModel = (data: Record<string, unknown>) =>
  request.post({ url: '/ai/query/models', data }).then(unwrapResponseData)
export const updateModel = (id: string, data: Record<string, unknown>) =>
  request.post({ url: '/ai/query/models/save', data: { ...data, id } }).then(unwrapResponseData)
export const deleteModel = (id: string) =>
  request.delete({ url: `/ai/query/models/${id}` }).then(unwrapResponseData)
export const setDefaultModel = (id: string) =>
  request.put({ url: `/ai/query/models/${id}/default` }).then(unwrapResponseData)
export const checkModel = (data: Record<string, unknown>) =>
  request.post({ url: '/ai/query/models/check', data }).then(unwrapResponseData)

// --- Terminology ---
export const listTerminology = (params?: Record<string, unknown>) =>
  request
    .get({ url: '/ai/query/terminology', params, silentError: true })
    .then(normalizePageResponse)
export const getTerm = (id: string) =>
  request.get({ url: `/ai/query/terminology/${id}` }).then(unwrapResponseData)
export const createTerm = (data: Record<string, unknown>) =>
  request.post({ url: '/ai/query/terminology', data }).then(unwrapResponseData)
export const updateTerm = (id: string, data: Record<string, unknown>) =>
  request
    .post({ url: '/ai/query/terminology/save', data: { ...data, id } })
    .then(unwrapResponseData)
export const deleteTerm = (id: string) =>
  request.post({ url: '/ai/query/terminology/delete', data: [id] }).then(unwrapResponseData)
export const createOrUpdateTerm = (data: Record<string, unknown>) =>
  data.id ? updateTerm(String(data.id), data) : createTerm(data)
export const deleteTerms = (ids: Array<string | number>) =>
  Promise.all(ids.map(id => deleteTerm(String(id))))
export const enableTerm = (id: string | number, enabled: string | boolean) =>
  request
    .put({ url: `/ai/query/terminology/${id}/enable`, data: { enabled } })
    .then(unwrapResponseData)
export const exportTerm = (params?: Record<string, unknown>) =>
  request.get({ url: '/ai/query/terminology/export', params, responseType: 'blob' } as any)
export const uploadTerminology = (formData: FormData) =>
  request.post({
    url: '/ai/query/terminology/upload',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })

// --- SQL Examples ---
export const listSqlExamples = (params?: Record<string, unknown>) =>
  request
    .get({ url: '/ai/query/sql-examples', params, silentError: true })
    .then(normalizePageResponse)
export const getSqlExample = (id: string) =>
  request.get({ url: `/ai/query/sql-examples/${id}` }).then(unwrapResponseData)
export const createSqlExample = (data: Record<string, unknown>) =>
  request.post({ url: '/ai/query/sql-examples', data }).then(unwrapResponseData)
export const updateSqlExample = (id: string, data: Record<string, unknown>) =>
  request
    .post({ url: '/ai/query/sql-examples/save', data: { ...data, id } })
    .then(unwrapResponseData)
export const deleteSqlExample = (id: string) =>
  request.post({ url: '/ai/query/sql-examples/delete', data: [id] }).then(unwrapResponseData)
export const createOrUpdateSqlExample = (data: Record<string, unknown>) =>
  data.id ? updateSqlExample(String(data.id), data) : createSqlExample(data)
export const deleteSqlExamples = (ids: Array<string | number>) =>
  Promise.all(ids.map(id => deleteSqlExample(String(id))))
export const enableSqlExample = (id: string | number, enabled: string | boolean) =>
  request
    .put({ url: `/ai/query/sql-examples/${id}/enable`, data: { enabled } })
    .then(unwrapResponseData)
export const exportSqlExample = (params?: Record<string, unknown>) =>
  request.get({ url: '/ai/query/sql-examples/export', params, responseType: 'blob' } as any)

// --- Datasources ---
export const listDatasources = () =>
  request.get({ url: '/ai/query/datasources', silentError: true }).then(normalizeArrayResponse)
export const listAdvancedApplications = () =>
  request
    .get({ url: '/ai/query/advanced-applications', silentError: true })
    .then(normalizeArrayResponse)

// --- Resource Learning ---
export const listLearningResources = () =>
  request.get({ url: '/ai/query/resource-learning/resources', silentError: true })
export const triggerLearning = (resourceId: string) =>
  request.post({ url: `/ai/query/resource-learning/resources/${resourceId}/learn` })
export const getLearningQuality = (resourceId: string) =>
  request.get({ url: `/ai/query/resource-learning/resources/${resourceId}/quality-summary` })
export const getLearningFeedback = (resourceId: string) =>
  request.get({ url: `/ai/query/resource-learning/resources/${resourceId}/feedback-summary` })
