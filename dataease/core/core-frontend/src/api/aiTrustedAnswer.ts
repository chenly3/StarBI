import request from '@/config/axios'
import { PATH_URL } from '@/config/axios/service'
import { configHandler } from '@/config/axios/refresh'

export type TrustedAnswerState =
  | 'TRUSTED'
  | 'NEEDS_CLARIFICATION'
  | 'PARTIAL'
  | 'UNSAFE_BLOCKED'
  | 'NO_AUTHORIZED_CONTEXT'
  | 'FAILED'

export interface TrustedAnswerRequest {
  question: string
  theme_id?: string | number
  datasource_id?: string | number
  model_id?: string
  chat_id?: string | number
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

export interface TrustedAnswerRepairItem {
  trace_id: string
  state: TrustedAnswerState
  theme_name?: string
  error_code?: string
  message?: string
  cause?: string
  fix?: string
  primary_action?: string
}

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

export interface SQLBotStreamEventLike {
  type?: string
  [key: string]: any
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
      chat_id: firstPresent(payload.chat_id, payload.chatId) as string | number | undefined
    },
    {
      signal: options.signal,
      onMessage: (_data, trustedEvent) => {
        options.onEvent({
          type: trustedEvent.event,
          content: trustedEvent.data,
          state: trustedEvent.state,
          trace_id: trustedEvent.trace_id,
          error: trustedEvent.error,
          done: trustedEvent.done
        })
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
