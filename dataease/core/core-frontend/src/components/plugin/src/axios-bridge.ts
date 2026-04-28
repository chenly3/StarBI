type RequestConfig = Record<string, unknown>

type RequestExecutor = (option: RequestConfig) => Promise<unknown>

type RequestLike = {
  get: RequestExecutor
  post: RequestExecutor
  put?: RequestExecutor
  delete?: RequestExecutor
}

type AxiosLikeResponse<T = unknown> = {
  data: T
  status: number
  statusText: string
  headers: Record<string, unknown>
  config: RequestConfig
  request?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isAxiosLikeResponse = (value: unknown): value is AxiosLikeResponse =>
  isRecord(value) &&
  'data' in value &&
  'status' in value &&
  'config' in value &&
  typeof value.status === 'number'

const normalizeHeaders = (headers: unknown): Record<string, unknown> => {
  if (!isRecord(headers)) {
    return {}
  }
  if (typeof headers.toJSON === 'function') {
    return headers.toJSON()
  }
  return { ...headers }
}

const normalizeResponse = <T>(
  result: unknown,
  fallbackConfig: RequestConfig
): AxiosLikeResponse<T> => {
  if (isAxiosLikeResponse(result)) {
    return {
      data: result.data as T,
      status: result.status,
      statusText: typeof result.statusText === 'string' ? result.statusText : 'OK',
      headers: normalizeHeaders(result.headers),
      config: isRecord(result.config) ? result.config : fallbackConfig,
      request: result.request
    }
  }

  return {
    data: result as T,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: fallbackConfig
  }
}

const buildConfig = (url: string, config: RequestConfig = {}, data?: unknown): RequestConfig => {
  if (data === undefined) {
    return { url, ...config }
  }
  return { url, data, ...config }
}

const createMethod =
  (executor?: RequestExecutor, method = 'request') =>
  async <T = unknown>(url: string, dataOrConfig?: unknown, maybeConfig?: RequestConfig) => {
    if (!executor) {
      throw new Error(`AxiosDe.${method} is not available in the host runtime.`)
    }

    const hasDataArg = method !== 'get'
    const config = hasDataArg
      ? buildConfig(url, maybeConfig || {}, dataOrConfig)
      : buildConfig(url, (dataOrConfig as RequestConfig) || {})
    const result = await executor(config)
    return normalizeResponse<T>(result, config)
  }

export const createAxiosBridge = (requestLike: RequestLike) => ({
  get: createMethod(requestLike.get, 'get'),
  post: createMethod(requestLike.post, 'post'),
  put: createMethod(requestLike.put, 'put'),
  delete: createMethod(requestLike.delete, 'delete')
})
