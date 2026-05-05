import request from '@/config/axios'
import { PATH_URL } from '@/config/axios/service'
import { configHandler } from '@/config/axios/refresh'
import { useCache } from '@/hooks/web/useCache'
import {
  toSqlBotCompatibleEvent,
  type SQLBotStreamEventLike
} from '@/api/aiTrustedAnswerEventAdapter'

const { wsCache } = useCache()

export type TrustedAnswerState =
  | 'TRUSTED'
  | 'NEEDS_CLARIFICATION'
  | 'PARTIAL'
  | 'UNSAFE_BLOCKED'
  | 'NO_AUTHORIZED_CONTEXT'
  | 'FAILED'

export type TrustedAnswerActionType =
  | 'ASSISTANT_VALIDATE'
  | 'ASSISTANT_START'
  | 'BASIC_ASK'
  | 'RECOMMENDATION_ASK'
  | 'DATA_INTERPRETATION'
  | 'FORECAST'
  | 'MANUAL_FOLLOW_UP'
  | 'AUTO_FOLLOW_UP'
  | 'HISTORY_LIST'
  | 'HISTORY_RESTORE'
  | 'HISTORY_FOLLOW_UP'
  | 'CHART_DATA'
  | 'USAGE'
  | 'CONTEXT_SWITCH'
  | 'SNAPSHOT'
  | 'DASHBOARD_ASK'
  | 'FILE_ASK'

export interface TrustedAnswerRequest {
  question: string
  theme_id?: string | number
  datasource_id?: string | number
  model_id?: string
  chat_id?: string | number
  action_type?: TrustedAnswerActionType
  entry_scene?: string
  resource_kind?: string
  resource_id?: string
  source_trace_id?: string
  parent_trace_id?: string
  record_id?: string
}

export interface TrustedAnswerError {
  code: string
  state: TrustedAnswerState
  message: string
  cause: string
  fix: string
  trace_step: string
  retryable: boolean
  user_visible_message: string
  admin_visible_detail: string
}

export interface TrustedAnswerSseEvent {
  event: string
  trace_id?: string
  state?: TrustedAnswerState
  data?: any
  error?: TrustedAnswerError
  done?: boolean
}

export interface TrustedAnswerTrustHealth {
  trusted: boolean
  total_trace_count: number
  trusted_trace_count: number
  blocking_issue_count: number
  trusted_rate: number
}

export interface TrustedAnswerRuntimePolicy {
  ask_enabled: boolean
  data_interpretation_enabled: boolean
  forecast_enabled: boolean
  followup_enabled: boolean
  sample_dataset_enabled: boolean
  voice_enabled: boolean
}

export interface TrustedAnswerRepairItem {
  trace_id?: string
  todo_id?: string
  source_type?: 'trace' | 'correction_todo' | string
  state: TrustedAnswerState
  theme_name?: string
  error_code?: string
  message?: string
  cause?: string
  fix?: string
  primary_action?: string
}

export interface TrustedAnswerEndpointContract {
  dataease_endpoint: string
  method: string
  action_type: TrustedAnswerActionType
  required_switch?: string
  sqlbot_upstream?: string
  capability_check?: string
  negative_test?: string
}

export interface TrustedAnswerCorrectionTodo {
  todo_id: string
  tenant_id?: string
  workspace_id?: string
  theme_id?: string
  resource_id?: string
  diagnosis_type?: string
  sanitized_question_summary: string
  duplicate_fingerprint: string
  status: string
  severity?: string
  impact_count: number
  restricted_payload_visible: boolean
}

export interface TrustedAnswerSemanticPatch {
  patch_id: string
  scope: string
  target_id?: string
  theme_id?: string
  resource_id?: string
  patch_type: string
  status: string
  source_todo_id?: string
  audit_event_no?: string
  rollback_to_patch_id?: string
  content?: string
}

export type TrustedAnswerSemanticPatchOperation =
  | 'draft'
  | 'publish'
  | 'disable'
  | 'unpublish'
  | 'rollback'

export interface TrustedAnswerStreamCallbacks {
  onOpen?: (response: Response) => void
  onMessage?: (data: string, event: TrustedAnswerSseEvent) => void
  onError?: (error: unknown) => void
  onClose?: () => void
  signal?: AbortSignal
}

export interface SQLBotRequestContextLike {
  themeId?: string | number
  theme_id?: string | number
  datasourceId?: string | number
  datasource_id?: string | number
}

const resolveFetchUrl = (url: string) => {
  const base = PATH_URL.endsWith('/') ? PATH_URL.slice(0, -1) : PATH_URL
  return `${base}${url}`
}

const firstPresent = (...values: unknown[]) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') {
      return value
    }
  }
  return undefined
}

const normalizeOptionalString = (...values: unknown[]) => {
  const value = firstPresent(...values)
  return value === undefined ? undefined : String(value)
}

const trustedAnswerScopeHeaders = () => {
  const orgId = normalizeOptionalString(wsCache.get('user.oid')) || 'default'
  const userId = normalizeOptionalString(wsCache.get('user.uid')) || 'anonymous'
  return {
    'X-DE-Tenant-Id': orgId,
    'X-DE-Workspace-Id': orgId,
    'X-DE-User-Id': userId
  }
}

const parseTrustedAnswerSseMessage = (message: string): TrustedAnswerSseEvent | null => {
  const data: string[] = []
  let eventName = ''

  message.split('\n').forEach(line => {
    if (!line || line.startsWith(':')) return
    const index = line.indexOf(':')
    const field = index === -1 ? line : line.slice(0, index)
    const rawValue = index === -1 ? '' : line.slice(index + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'event') eventName = value
    if (field === 'data') data.push(value)
  })

  if (!data.length) {
    return eventName ? { event: eventName } : null
  }

  try {
    const parsed = JSON.parse(data.join('\n')) as TrustedAnswerSseEvent
    return {
      ...parsed,
      event: parsed.event || eventName || 'message'
    }
  } catch (error) {
    return {
      event: eventName || 'message',
      data: data.join('\n')
    }
  }
}

const readTrustedAnswerSseStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: TrustedAnswerSseEvent) => void
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
      const event = parseTrustedAnswerSseMessage(message)
      if (event) onEvent(event)
    })
  }

  if (buffer.trim()) {
    const event = parseTrustedAnswerSseMessage(buffer)
    if (event) onEvent(event)
  }
}

export const streamTrustedAnswer = async (
  payload: TrustedAnswerRequest,
  callbacks: TrustedAnswerStreamCallbacks = {}
) => {
  const config = await configHandler({
    url: '/ai/query/trusted-answer/stream',
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
    const response = await fetch(resolveFetchUrl('/ai/query/trusted-answer/stream'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: callbacks.signal
    })

    if (!response.ok) throw new Error(await response.text())
    if (!response.body) throw new Error('ReadableStream is not supported by this browser.')

    callbacks.onOpen?.(response)
    await readTrustedAnswerSseStream(response.body.getReader(), event =>
      callbacks.onMessage?.(event.data, event)
    )
  } catch (error) {
    callbacks.onError?.(error)
    throw error
  } finally {
    callbacks.onClose?.()
  }
}

export const streamTrustedAnswerQuestion = async (
  context: SQLBotRequestContextLike,
  payload: Record<string, any>,
  options: {
    signal?: AbortSignal
    onEvent: (event: SQLBotStreamEventLike) => void
  }
) => {
  await streamTrustedAnswer(
    {
      question: String(payload.question || ''),
      theme_id: firstPresent(
        payload.theme_id,
        payload.themeId,
        context.theme_id,
        context.themeId
      ) as string | number | undefined,
      datasource_id: firstPresent(
        payload.datasource_id,
        payload.datasourceId,
        context.datasource_id,
        context.datasourceId
      ) as string | number | undefined,
      model_id: normalizeOptionalString(payload.model_id, payload.modelId, payload.ai_modal_id),
      chat_id: firstPresent(payload.chat_id, payload.chatId) as string | number | undefined,
      action_type: (payload.action_type ||
        payload.actionType ||
        'BASIC_ASK') as TrustedAnswerActionType,
      entry_scene: normalizeOptionalString(payload.entry_scene, payload.entryScene),
      resource_kind: normalizeOptionalString(payload.resource_kind, payload.resourceKind),
      resource_id: normalizeOptionalString(payload.resource_id, payload.resourceId),
      source_trace_id: normalizeOptionalString(payload.source_trace_id, payload.sourceTraceId),
      parent_trace_id: normalizeOptionalString(payload.parent_trace_id, payload.parentTraceId),
      record_id: normalizeOptionalString(payload.record_id, payload.recordId)
    },
    {
      signal: options.signal,
      onMessage: (_data, trustedEvent) => {
        options.onEvent(toSqlBotCompatibleEvent(trustedEvent))
      }
    }
  )
}

export const getTrustedAnswerTrace = (traceId: string) =>
  request.get({ url: `/ai/query/trusted-answer/trace/${traceId}` })

export const getTrustedAnswerTrustHealth = () =>
  request.get({ url: '/ai/query/trusted-answer/trust-health' })

export const listTrustedAnswerRepairQueue = () =>
  request.get({ url: '/ai/query/trusted-answer/repair-queue' })

export const listTrustedAnswerContracts = () =>
  request.get<TrustedAnswerEndpointContract[]>({ url: '/ai/query/trusted-answer/contracts' })

export const getTrustedAnswerRuntimePolicy = () =>
  request.get<TrustedAnswerRuntimePolicy>({ url: '/ai/query/trusted-answer/runtime-policy' })

export const createTrustedAnswerCorrectionTodo = (data: Record<string, unknown>) =>
  request.post<TrustedAnswerCorrectionTodo>({
    url: '/ai/query/trusted-answer/correction-todos',
    headers: trustedAnswerScopeHeaders(),
    data
  })

export const listTrustedAnswerCorrectionTodos = () =>
  request.get<TrustedAnswerCorrectionTodo[]>({
    url: '/ai/query/trusted-answer/correction-todos',
    headers: trustedAnswerScopeHeaders()
  })

export const listTrustedAnswerSemanticPatches = () =>
  request.get<TrustedAnswerSemanticPatch[]>({ url: '/ai/query/trusted-answer/semantic-patches' })

export const createTrustedAnswerHistoryRestoreTrace = (data: TrustedAnswerRequest) =>
  request.post({ url: '/ai/query/trusted-answer/history-restore-trace', data })

export const applyTrustedAnswerSemanticPatch = (data: {
  todo_id?: string
  scope: string
  target_id?: string
  theme_id?: string | number
  resource_id?: string
  patch_type: string
  operation: TrustedAnswerSemanticPatchOperation
  patch_id?: string
  previous_patch_id?: string
  actor_role?: string
  content?: string
}) =>
  request.post<TrustedAnswerSemanticPatch>({
    url: '/ai/query/trusted-answer/semantic-patches',
    data
  })
