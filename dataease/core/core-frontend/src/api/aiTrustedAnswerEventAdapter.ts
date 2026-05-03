export interface TrustedAnswerEventLike {
  event: string
  trace_id?: string
  state?: string
  data?: any
  error?: {
    code?: string
    user_visible_message?: string
    message?: string
    admin_visible_detail?: string
    [key: string]: any
  }
  done?: boolean
}

export interface SQLBotStreamEventLike {
  type?: string
  [key: string]: any
}

const normalizeTrustedAnswerText = (data: any) => {
  if (typeof data === 'string') {
    return data
  }
  return String(data?.text || data?.answer || data?.content || '')
}

const normalizeTrustedAnswerErrorText = (event: TrustedAnswerEventLike) => {
  return String(
    event.error?.user_visible_message ||
      event.error?.message ||
      event.error?.admin_visible_detail ||
      '可信问数执行失败'
  )
}

export const toSqlBotCompatibleEvent = (
  trustedEvent: TrustedAnswerEventLike
): SQLBotStreamEventLike => {
  const baseEvent = {
    state: trustedEvent.state,
    trace_id: trustedEvent.trace_id,
    trusted_answer_event: trustedEvent.event,
    trusted_answer_done: trustedEvent.done,
    error: trustedEvent.error
  }

  if (trustedEvent.event === 'answer') {
    const text = normalizeTrustedAnswerText(trustedEvent.data)
    return {
      ...baseEvent,
      type: 'chart-result',
      content: text,
      reasoning_content: text
    }
  }

  if (trustedEvent.event === 'done') {
    return {
      ...baseEvent,
      type: 'finish',
      content: trustedEvent.data
    }
  }

  if (trustedEvent.event === 'error') {
    return {
      ...baseEvent,
      type: 'error',
      content: normalizeTrustedAnswerErrorText(trustedEvent)
    }
  }

  return {
    ...baseEvent,
    type: trustedEvent.event,
    content: trustedEvent.data
  }
}
