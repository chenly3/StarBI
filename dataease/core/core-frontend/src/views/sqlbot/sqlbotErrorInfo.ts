export interface SqlbotErrorInfo {
  title: string
  summary: string
  detail?: string
  suggestions: string[]
}

const PYTHON_EXCEPTION_PATTERN =
  /\b(?:[A-Za-z_][A-Za-z0-9_]*Error|Exception|Traceback)\b|File\s+"[^"]+\.py"/i

const parseSqlbotErrorPayload = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) {
    return {
      raw: '',
      message: '',
      traceback: ''
    }
  }

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        raw,
        message: String((parsed as Record<string, unknown>).message || '').trim(),
        traceback: String((parsed as Record<string, unknown>).traceback || '').trim()
      }
    }
  } catch (error) {
    // Fall through to plain text parsing.
  }

  return {
    raw,
    message: raw,
    traceback: ''
  }
}

export const explainSqlbotError = (value: unknown): SqlbotErrorInfo => {
  const payload = parseSqlbotErrorPayload(value)
  const raw = payload.raw
  const message = payload.message || raw
  const traceback = payload.traceback
  const lowered = `${message}\n${traceback}`.toLowerCase()

  if (
    lowered.includes('只能查询数据') ||
    lowered.includes('不能操作数据库') ||
    lowered.includes('修改表结构') ||
    lowered.includes('清空数据库')
  ) {
    return {
      title: '这个请求不支持直接执行',
      summary:
        '我不能帮你删除表、清空数据，或者修改数据库结构。当前智能问数只支持查询、统计和分析，不会执行会改变数据或表结构的操作。',
      detail: message || raw,
      suggestions: [
        '如果你想了解这张表里的数据，我可以帮你做查询或统计',
        '如果你想确认某张表是否存在，我可以帮你查看相关信息',
        '如有需要，也可以打开“执行详情”看这次问数停在了哪一步'
      ]
    }
  }

  if (
    lowered.includes('connection refused') ||
    lowered.includes('api connection error') ||
    lowered.includes('httpx.connecterror') ||
    lowered.includes('openai.apiconnectionerror') ||
    lowered.includes('connection error')
  ) {
    return {
      title: '模型服务连接失败',
      summary:
        '这轮问数在生成 SQL 的阶段没有拿到模型返回结果，流程因此中断。当前更像是模型服务连接异常，不是你这次提问本身有问题。',
      detail: message || '模型服务返回了连接异常。',
      suggestions: [
        '稍后重试一次',
        '检查模型服务、代理或网关是否在线',
        '如仍失败，可打开“执行详情”确认卡在哪一步'
      ]
    }
  }

  if (
    lowered.includes('failed to fetch') ||
    lowered.includes('network') ||
    lowered.includes('timeout') ||
    lowered.includes('timed out')
  ) {
    return {
      title: '问数服务暂时不可达',
      summary: '这轮问数没有正常连上后端服务，所以没有继续生成 SQL 和图表。',
      detail: message || '服务请求超时或网络连接异常。',
      suggestions: [
        '稍后重试',
        '检查当前环境网络是否稳定',
        '如只在当前环境出现，优先检查本地服务进程'
      ]
    }
  }

  if (
    lowered.includes('assistant token') ||
    lowered.includes('certificate') ||
    lowered.includes('unauthorized') ||
    lowered.includes('forbidden') ||
    lowered.includes('401') ||
    lowered.includes('403')
  ) {
    return {
      title: '问数授权状态异常',
      summary: '这轮问数在调用 SQLBot 时没有通过授权校验，所以流程被提前拦截。',
      detail: message || '当前会话的授权信息无效或已过期。',
      suggestions: ['刷新页面后重试', '重新登录当前系统', '如仍失败，检查 SQLBot 嵌入配置和授权头']
    }
  }

  if (
    lowered.includes('datasource') ||
    lowered.includes('dataset') ||
    lowered.includes('table') ||
    lowered.includes('column') ||
    lowered.includes('schema')
  ) {
    return {
      title: '数据范围无法支撑这轮问数',
      summary: '系统在解析数据集、字段或表结构时遇到了问题，所以没能继续生成结果。',
      detail: message || '当前数据集、字段或表结构与提问不匹配。',
      suggestions: [
        '把问题问得更具体一些，明确维度和指标',
        '稍后重试一次',
        '如需要，可先查看执行详情定位卡住的步骤'
      ]
    }
  }

  if (PYTHON_EXCEPTION_PATTERN.test(raw)) {
    return {
      title: '问数执行过程中出现系统异常',
      summary: '这轮问数已经进入后端执行流程，但服务内部抛出了异常，所以没有正常返回结果。',
      detail: message || '后端执行时出现未预期异常。',
      suggestions: [
        '先重试一次',
        '查看执行详情确认异常发生在哪一步',
        '如果持续复现，需要继续排查后端日志'
      ]
    }
  }

  if (!raw) {
    return {
      title: '本轮问数没有成功完成',
      summary: '当前没有拿到更具体的失败原因，建议先重试一次。',
      suggestions: ['稍后重试', '如再次失败，可查看执行详情']
    }
  }

  return {
    title: '本轮问数没有成功完成',
    summary: '系统收到了失败响应，但当前没有匹配到更明确的异常类型。',
    detail: message || raw,
    suggestions: ['稍后重试一次', '如需要，可打开执行详情查看具体步骤']
  }
}

export const normalizeSqlbotErrorCopy = (value: unknown) => {
  return explainSqlbotError(value).summary
}
