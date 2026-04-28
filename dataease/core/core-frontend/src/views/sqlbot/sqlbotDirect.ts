// DEPRECATED: use @/api/aiQuery.ts instead. Will be removed after migrate config pages.

import { normalizeSqlBotDomain } from '@/views/sqlbot/queryContext'
import { useCache } from '@/hooks/web/useCache'
import {
  getAIQueryRuntimeModels,
  type AIQueryRuntimeModel,
  type AIQueryRuntimeModelsPayload
} from '@/api/aiQueryTheme'
import type {
  SQLBotNewContextSwitchCreatePayload,
  SQLBotNewPersistedContextEvent,
  SQLBotNewPersistedContextPayload,
  SQLBotNewPersistedHistoryEntry,
  SQLBotNewPersistedSnapshot,
  SQLBotNewSnapshotUpsertPayload
} from '@/views/sqlbot-new/types'

export interface SQLBotStreamEvent {
  type?: string
  [key: string]: any
}

export interface SQLBotRequestContext {
  domain: string
  assistantId: string
  assistantToken: string
  certificate: string
  hostOrigin?: string
  locale?: string
}

interface SQLBotEnvelope<T = any> {
  code?: number
  data?: T
  message?: string
  msg?: string
  success?: boolean
}

export type SQLBotRuntimeModel = AIQueryRuntimeModel

export interface RuntimeQueryModelOption {
  id: string
  name: string
  provider?: string
  isDefault?: boolean
  available?: boolean
}

export interface RuntimeQueryModelsResult {
  models: RuntimeQueryModelOption[]
  defaultModelId?: string
}

export interface SQLBotChatSummary {
  id: number
  brief?: string
  create_time?: string
  datasource?: number
  engine_type?: string
}

export interface SQLBotChatDetail {
  id?: number
  brief?: string
  datasource?: number
  datasource_name?: string
  ds_type?: string
  records?: Record<string, any>[]
}

const { wsCache } = useCache('localStorage')
const SQLBOT_ASSISTANT_VIRTUAL_USER_KEY_PREFIX = 'STARBI-SQLBOT-ASSISTANT-VIRTUAL-USER'

const unwrapSqlBotResponse = async <T = any>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`SQLBot request failed: ${response.status}`)
  }

  const payload = (await response.json()) as SQLBotEnvelope<T> | T
  if (payload && typeof payload === 'object' && 'code' in (payload as SQLBotEnvelope<T>)) {
    const envelope = payload as SQLBotEnvelope<T>
    if (envelope.code === 0) {
      return (envelope.data ?? null) as T
    }
    throw new Error(envelope.message || envelope.msg || 'SQLBot business error')
  }
  return payload as T
}

const normalizeOptionalString = (...values: unknown[]) => {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return String(value)
    }
  }
  return ''
}

const normalizeOptionalNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue
    }
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

const normalizeOptionalBoolean = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value
    }
  }
  return undefined
}

const normalizeSourceKind = (...values: unknown[]): 'dataset' | 'file' | 'dataset-combination' => {
  for (const value of values) {
    if (value === 'dataset' || value === 'file' || value === 'dataset-combination') {
      return value
    }
  }
  return 'dataset'
}

const normalizeSQLBotNewPersistedHistoryEntry = (
  payload: Record<string, any>
): SQLBotNewPersistedHistoryEntry => ({
  chatId: normalizeOptionalNumber(payload.chatId, payload.chat_id) || 0,
  title: normalizeOptionalString(payload.title),
  subtitle: normalizeOptionalString(payload.subtitle),
  updatedAt: normalizeOptionalString(payload.updatedAt, payload.updated_at),
  queryMode: normalizeSourceKind(payload.queryMode, payload.query_mode),
  sourceId: normalizeOptionalString(payload.sourceId, payload.source_id),
  sourceIds: Array.isArray(payload.sourceIds || payload.source_ids)
    ? (payload.sourceIds || payload.source_ids).map((item: unknown) => String(item))
    : [],
  combinationId:
    normalizeOptionalString(payload.combinationId, payload.combination_id) || undefined,
  combinationName:
    normalizeOptionalString(payload.combinationName, payload.combination_name) || undefined,
  datasourceId: normalizeOptionalString(payload.datasourceId, payload.datasource_id),
  modelId: normalizeOptionalString(payload.modelId, payload.model_id),
  selectionTitle: normalizeOptionalString(payload.selectionTitle, payload.selection_title),
  selectionMeta: normalizeOptionalString(payload.selectionMeta, payload.selection_meta),
  latestQuestion: normalizeOptionalString(payload.latestQuestion, payload.latest_question),
  datasourcePending:
    normalizeOptionalBoolean(payload.datasourcePending, payload.datasource_pending) || false
})

const readStableAssistantVirtualUserId = (assistantId: string, workspaceOid: string) => {
  const cacheKey = `${SQLBOT_ASSISTANT_VIRTUAL_USER_KEY_PREFIX}:${assistantId}:${
    workspaceOid || 'default'
  }`
  const cached = String(wsCache.get(cacheKey) || window.localStorage.getItem(cacheKey) || '').trim()
  if (cached) {
    return cached
  }

  const generated = `${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`
  wsCache.set(cacheKey, generated)
  window.localStorage.setItem(cacheKey, generated)
  return generated
}

const normalizeSQLBotNewPersistedSnapshot = (
  payload: Record<string, any>
): SQLBotNewPersistedSnapshot => ({
  chatId: normalizeOptionalNumber(payload.chatId, payload.chat_id),
  clientType: normalizeOptionalString(payload.clientType, payload.client_type) || undefined,
  activeSourceKind: normalizeSourceKind(payload.activeSourceKind, payload.active_source_kind),
  activeSourceId:
    normalizeOptionalString(payload.activeSourceId, payload.active_source_id) || undefined,
  activeSourceIds: Array.isArray(payload.activeSourceIds || payload.active_source_ids)
    ? (payload.activeSourceIds || payload.active_source_ids).map((item: unknown) => String(item))
    : undefined,
  activeCombinationId:
    normalizeOptionalString(payload.activeCombinationId, payload.active_combination_id) ||
    undefined,
  activeCombinationName:
    normalizeOptionalString(payload.activeCombinationName, payload.active_combination_name) ||
    undefined,
  activeDatasourceId:
    normalizeOptionalString(payload.activeDatasourceId, payload.active_datasource_id) || undefined,
  activeModelId:
    normalizeOptionalString(payload.activeModelId, payload.active_model_id) || undefined,
  activeThemeId:
    normalizeOptionalString(payload.activeThemeId, payload.active_theme_id) || undefined,
  activeThemeName:
    normalizeOptionalString(payload.activeThemeName, payload.active_theme_name) || undefined,
  selectionTitle:
    normalizeOptionalString(payload.selectionTitle, payload.selection_title) || undefined,
  selectionMeta:
    normalizeOptionalString(payload.selectionMeta, payload.selection_meta) || undefined,
  datasourcePending:
    normalizeOptionalBoolean(payload.datasourcePending, payload.datasource_pending) ?? undefined,
  latestRecordId: normalizeOptionalNumber(payload.latestRecordId, payload.latest_record_id),
  latestQuestion:
    normalizeOptionalString(payload.latestQuestion, payload.latest_question) || undefined,
  snapshotVersion: normalizeOptionalNumber(payload.snapshotVersion, payload.snapshot_version),
  createBy: normalizeOptionalNumber(payload.createBy, payload.create_by),
  createTime: normalizeOptionalString(payload.createTime, payload.create_time) || undefined,
  updateTime: normalizeOptionalString(payload.updateTime, payload.update_time) || undefined
})

const normalizeSQLBotNewPersistedContextEvent = (
  payload: Record<string, any>
): SQLBotNewPersistedContextEvent => ({
  id: normalizeOptionalNumber(payload.id) || 0,
  eventType: normalizeOptionalString(payload.eventType, payload.event_type),
  recordId: normalizeOptionalNumber(payload.recordId, payload.record_id),
  sourceKind: normalizeOptionalString(payload.sourceKind, payload.source_kind)
    ? normalizeSourceKind(payload.sourceKind, payload.source_kind)
    : undefined,
  sourceId: normalizeOptionalString(payload.sourceId, payload.source_id) || undefined,
  sourceIds: Array.isArray(payload.sourceIds || payload.source_ids)
    ? (payload.sourceIds || payload.source_ids).map((item: unknown) => String(item))
    : undefined,
  combinationId:
    normalizeOptionalString(payload.combinationId, payload.combination_id) || undefined,
  combinationName:
    normalizeOptionalString(payload.combinationName, payload.combination_name) || undefined,
  datasourceId: normalizeOptionalString(payload.datasourceId, payload.datasource_id) || undefined,
  modelId: normalizeOptionalString(payload.modelId, payload.model_id) || undefined,
  themeId: normalizeOptionalString(payload.themeId, payload.theme_id) || undefined,
  themeName: normalizeOptionalString(payload.themeName, payload.theme_name) || undefined,
  selectionTitle:
    normalizeOptionalString(payload.selectionTitle, payload.selection_title) || undefined,
  selectionMeta:
    normalizeOptionalString(payload.selectionMeta, payload.selection_meta) || undefined,
  datasourcePending:
    normalizeOptionalBoolean(payload.datasourcePending, payload.datasource_pending) ?? undefined,
  eventPayload: payload.eventPayload ?? payload.event_payload,
  createTime: normalizeOptionalString(payload.createTime, payload.create_time)
})

const normalizeSQLBotNewPersistedContextPayload = (
  payload: Record<string, any> | null | undefined
): SQLBotNewPersistedContextPayload => ({
  snapshot:
    payload?.snapshot && typeof payload.snapshot === 'object'
      ? normalizeSQLBotNewPersistedSnapshot(payload.snapshot)
      : undefined,
  events: Array.isArray(payload?.events)
    ? payload.events.map(item => normalizeSQLBotNewPersistedContextEvent(item))
    : []
})

const serializeSQLBotNewContextSwitchPayload = (payload: SQLBotNewContextSwitchCreatePayload) => ({
  event_type: payload.eventType,
  record_id: payload.recordId,
  source_kind: payload.sourceKind,
  source_id: payload.sourceId,
  source_ids: payload.sourceIds,
  combination_id: payload.combinationId,
  combination_name: payload.combinationName,
  datasource_id: payload.datasourceId,
  model_id: payload.modelId,
  theme_id: payload.themeId,
  theme_name: payload.themeName,
  selection_title: payload.selectionTitle,
  selection_meta: payload.selectionMeta,
  datasource_pending: payload.datasourcePending,
  event_payload: payload.eventPayload
})

const serializeSQLBotNewSnapshotPayload = (payload: SQLBotNewSnapshotUpsertPayload) => ({
  active_source_kind: payload.activeSourceKind,
  active_source_id: payload.activeSourceId,
  active_source_ids: payload.activeSourceIds,
  active_combination_id: payload.activeCombinationId,
  active_combination_name: payload.activeCombinationName,
  active_datasource_id: payload.activeDatasourceId,
  active_model_id: payload.activeModelId,
  active_theme_id: payload.activeThemeId,
  active_theme_name: payload.activeThemeName,
  selection_title: payload.selectionTitle,
  selection_meta: payload.selectionMeta,
  datasource_pending: payload.datasourcePending,
  latest_record_id: payload.latestRecordId,
  latest_question: payload.latestQuestion
})

const getSqlBotApiBaseCandidates = (domain: string) => {
  const normalizedDomain = normalizeSqlBotDomain(domain)
  if (!normalizedDomain) {
    return ['/api/v1']
  }

  try {
    const url = new URL(normalizedDomain)

    // In local integration we often store the SQLBot frontend dev URL (5173) in config,
    // while the real FastAPI service still listens on 8000.
    if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port === '5173') {
      url.port = '8000'
    }
    const primaryOrigin = url.origin
    const candidates = [`${primaryOrigin}/api/v1`]

    // Some local environments expose SQLBot only on one loopback alias.
    // Keep the configured host first, then retry the sibling alias if network fetch fails.
    if (url.hostname === 'localhost') {
      candidates.push(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ''}/api/v1`)
    } else if (url.hostname === '127.0.0.1') {
      candidates.push(`${url.protocol}//localhost${url.port ? `:${url.port}` : ''}/api/v1`)
    }

    return [...new Set(candidates)]
  } catch (error) {
    console.error('resolve SQLBot api base failed', error)
    return [`${normalizedDomain}/api/v1`]
  }
}

const isNetworkFetchError = (error: unknown) => {
  return error instanceof TypeError || String(error).includes('Failed to fetch')
}

const fetchSqlBotWithFallback = async (
  domain: string,
  buildUrl: (base: string) => string,
  init: RequestInit
) => {
  const bases = getSqlBotApiBaseCandidates(domain)
  let lastError: unknown = null

  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index]
    const requestUrl = buildUrl(base)
    try {
      return await fetch(requestUrl, init)
    } catch (error) {
      lastError = error
      const canRetry = index < bases.length - 1 && isNetworkFetchError(error)
      if (!canRetry) {
        throw error
      }
      console.warn(`SQLBot fetch failed for ${requestUrl}, retrying with fallback host`, error)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('SQLBot request failed')
}

const buildAssistantHeaders = (context: SQLBotRequestContext, contentType = 'application/json') => {
  const headers = new Headers()
  headers.set('X-SQLBOT-ASSISTANT-TOKEN', `Assistant ${context.assistantToken}`)
  headers.set(
    'X-SQLBOT-ASSISTANT-CERTIFICATE',
    window.btoa(encodeURIComponent(context.certificate))
  )
  headers.set('Content-Type', contentType)
  headers.set('Accept', 'application/json, text/event-stream')
  if (context.hostOrigin) {
    headers.set('X-SQLBOT-HOST-ORIGIN', context.hostOrigin)
  }
  if (context.locale) {
    headers.set('Accept-Language', context.locale)
  }
  return headers
}

export const validateSQLBotAssistant = async (domain: string, assistantId: string) => {
  const response = await fetchSqlBotWithFallback(
    domain,
    base => {
      const url = new URL(`${base}/system/assistant/validator`)
      url.searchParams.set('id', assistantId)
      const externalUserId = String(wsCache.get('user.uid') || '').trim()
      const workspaceOid = String(wsCache.get('user.oid') || '').trim()
      if (externalUserId) {
        url.searchParams.set('external_user_id', externalUserId)
      } else {
        url.searchParams.set('virtual', readStableAssistantVirtualUserId(assistantId, workspaceOid))
      }
      if (workspaceOid) {
        url.searchParams.set('workspace_oid', workspaceOid)
      }
      return url.toString()
    },
    {
      method: 'GET',
      credentials: 'omit'
    }
  )
  return unwrapSqlBotResponse<{ token?: string } & Record<string, any>>(response)
}

export const startSQLBotAssistantChat = async (
  context: SQLBotRequestContext,
  payload: Record<string, any> = { origin: 2 }
) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/assistant/start`,
    {
      method: 'POST',
      headers: buildAssistantHeaders(context),
      body: JSON.stringify(payload)
    }
  )
  return unwrapSqlBotResponse<Record<string, any>>(response)
}

export const getSQLBotChartData = async (context: SQLBotRequestContext, recordId: number) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/record/${recordId}/data`,
    {
      method: 'GET',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )
  return unwrapSqlBotResponse<Record<string, any>>(response)
}

export const getSQLBotRecordUsage = async (context: SQLBotRequestContext, recordId: number) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/record/${recordId}/usage`,
    {
      method: 'GET',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )
  return unwrapSqlBotResponse<Record<string, any>>(response)
}

export const getSQLBotRecentQuestions = async (
  context: SQLBotRequestContext,
  datasourceId?: number | string
) => {
  if (!datasourceId) {
    return []
  }
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/recent_questions/${datasourceId}`,
    {
      method: 'GET',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )
  return unwrapSqlBotResponse<string[]>(response)
}

export const getSQLBotChatList = async (context: SQLBotRequestContext) => {
  const response = await fetchSqlBotWithFallback(context.domain, base => `${base}/chat/list`, {
    method: 'GET',
    headers: buildAssistantHeaders(context, 'text/plain')
  })
  return unwrapSqlBotResponse<SQLBotChatSummary[]>(response)
}

export const getSQLBotChatWithData = async (context: SQLBotRequestContext, chatId: number) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/${chatId}/with_data`,
    {
      method: 'GET',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )
  return unwrapSqlBotResponse<SQLBotChatDetail>(response)
}

export const getSQLBotNewHistory = async (context: SQLBotRequestContext) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/sqlbot-new/history`,
    {
      method: 'GET',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )
  const payload = await unwrapSqlBotResponse<Record<string, any>[]>(response)
  return Array.isArray(payload)
    ? payload.map(item => normalizeSQLBotNewPersistedHistoryEntry(item))
    : []
}

export const getSQLBotNewHistoryContext = async (context: SQLBotRequestContext, chatId: number) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/${chatId}/sqlbot-new/context`,
    {
      method: 'GET',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )
  const payload = await unwrapSqlBotResponse<Record<string, any> | null>(response)
  return normalizeSQLBotNewPersistedContextPayload(payload)
}

export const createSQLBotNewContextSwitch = async (
  context: SQLBotRequestContext,
  chatId: number,
  payload: SQLBotNewContextSwitchCreatePayload
) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/${chatId}/sqlbot-new/context-switch`,
    {
      method: 'POST',
      headers: buildAssistantHeaders(context),
      body: JSON.stringify(serializeSQLBotNewContextSwitchPayload(payload))
    }
  )
  const responsePayload = await unwrapSqlBotResponse<Record<string, any>>(response)
  return normalizeSQLBotNewPersistedContextEvent(responsePayload)
}

export const upsertSQLBotNewSnapshot = async (
  context: SQLBotRequestContext,
  chatId: number,
  payload: SQLBotNewSnapshotUpsertPayload
) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/${chatId}/sqlbot-new/snapshot`,
    {
      method: 'POST',
      headers: buildAssistantHeaders(context),
      body: JSON.stringify(serializeSQLBotNewSnapshotPayload(payload))
    }
  )
  const responsePayload = await unwrapSqlBotResponse<Record<string, any>>(response)
  return normalizeSQLBotNewPersistedSnapshot(responsePayload)
}

export const deleteSQLBotChat = async (
  context: SQLBotRequestContext,
  chatId: number,
  brief = 'chat'
) => {
  const safeBrief = encodeURIComponent(String(brief || 'chat'))
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/${chatId}/${safeBrief}`,
    {
      method: 'DELETE',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )

  if (!response.ok) {
    throw new Error(`SQLBot request failed: ${response.status}`)
  }

  const rawText = await response.text()
  if (!rawText.trim()) {
    return ''
  }

  try {
    const payload = JSON.parse(rawText) as SQLBotEnvelope<string> | string
    if (payload && typeof payload === 'object' && 'code' in (payload as SQLBotEnvelope<string>)) {
      const envelope = payload as SQLBotEnvelope<string>
      if (envelope.code === 0) {
        return String(envelope.data ?? '')
      }
      throw new Error(envelope.message || envelope.msg || 'SQLBot business error')
    }
    return String(payload || '')
  } catch (error) {
    if (error instanceof SyntaxError) {
      return rawText
    }
    throw error
  }
}

export const getSQLBotRuntimeModels = async (): Promise<AIQueryRuntimeModelsPayload> => {
  return getAIQueryRuntimeModels()
}

export const fetchRuntimeModels = async (): Promise<RuntimeQueryModelsResult> => {
  const response = await getSQLBotRuntimeModels()
  const models = response.models
    .map(model => ({
      id: String(model.id),
      name: String(model.name || ''),
      isDefault: model.defaultModel === true,
      available: true
    }))
    .filter(model => model.id && model.name)

  return {
    models,
    defaultModelId:
      response.defaultModelId || models.find(model => model.isDefault)?.id || models[0]?.id || ''
  }
}

export const getSQLBotRecommendQuestions = async (
  context: SQLBotRequestContext,
  recordId?: number,
  articlesNumber = 4
) => {
  if (!recordId) {
    return []
  }

  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => {
      const url = new URL(`${base}/chat/recommend_questions/${recordId}`)
      url.searchParams.set('articles_number', `${articlesNumber}`)
      return url.toString()
    },
    {
      method: 'POST',
      headers: buildAssistantHeaders(context),
      body: JSON.stringify({})
    }
  )

  if (!response.ok || !response.body) {
    throw new Error(`SQLBot recommend stream failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let result: string[] = []

  const consumeBlock = (chunk: string) => {
    const blocks = chunk
      .split('\n\n')
      .map(item => item.trim())
      .filter(Boolean)

    blocks.forEach(block => {
      const line = block
        .split('\n')
        .find(item => item.startsWith('data:'))
        ?.replace(/^data:\s*/, '')
      if (!line) {
        return
      }
      try {
        const payload = JSON.parse(line)
        if (payload?.type === 'recommended_question' && typeof payload.content === 'string') {
          const parsed = JSON.parse(payload.content)
          result = Array.isArray(parsed)
            ? parsed.map(item => String(item).trim()).filter(Boolean)
            : []
        }
      } catch (error) {
        console.error('parse SQLBot recommend event failed', error, line)
      }
    })
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      if (buffer.trim()) {
        consumeBlock(buffer)
      }
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const segments = buffer.split('\n\n')
    buffer = segments.pop() || ''
    segments.forEach(segment => {
      consumeBlock(segment)
    })
  }

  return result
}

const readStreamChunk = (rawChunk: string, onEvent: (event: SQLBotStreamEvent) => void) => {
  const blocks = rawChunk
    .split('\n\n')
    .map(item => item.trim())
    .filter(Boolean)

  blocks.forEach(block => {
    const line = block
      .split('\n')
      .find(item => item.startsWith('data:'))
      ?.replace(/^data:\s*/, '')

    if (!line) {
      return
    }

    try {
      onEvent(JSON.parse(line))
    } catch (error) {
      console.error('parse SQLBot event failed', error, line)
    }
  })
}

export const streamSQLBotQuestion = async (
  context: SQLBotRequestContext,
  payload: Record<string, any>,
  options: {
    signal?: AbortSignal
    onEvent: (event: SQLBotStreamEvent) => void
  }
) => {
  const response = await fetchSqlBotWithFallback(context.domain, base => `${base}/chat/question`, {
    method: 'POST',
    headers: buildAssistantHeaders(context),
    body: JSON.stringify(payload),
    signal: options.signal
  })

  if (!response.ok || !response.body) {
    throw new Error(`SQLBot stream failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      if (buffer.trim()) {
        readStreamChunk(buffer, options.onEvent)
      }
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const segments = buffer.split('\n\n')
    buffer = segments.pop() || ''
    segments.forEach(segment => {
      readStreamChunk(segment, options.onEvent)
    })
  }
}

export const streamSQLBotRecordAnalysis = async (
  context: SQLBotRequestContext,
  recordId: number,
  options: {
    signal?: AbortSignal
    onEvent: (event: SQLBotStreamEvent) => void
  }
) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/record/${recordId}/analysis`,
    {
      method: 'POST',
      headers: buildAssistantHeaders(context),
      body: JSON.stringify({}),
      signal: options.signal
    }
  )

  if (!response.ok || !response.body) {
    throw new Error(`SQLBot analysis stream failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      if (buffer.trim()) {
        readStreamChunk(buffer, options.onEvent)
      }
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const segments = buffer.split('\n\n')
    buffer = segments.pop() || ''
    segments.forEach(segment => {
      readStreamChunk(segment, options.onEvent)
    })
  }
}
