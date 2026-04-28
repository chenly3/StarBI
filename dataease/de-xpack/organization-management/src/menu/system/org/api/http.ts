import request from '@/config/axios'

export interface HttpResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Record<string, unknown>
  config: Record<string, unknown>
  request?: unknown
}

export type HttpConfig = Record<string, unknown> & {
  responseType?: string
  headers?: Record<string, unknown>
  headersType?: string
  rawResponse?: boolean
}

interface AxiosBridge {
  get<T = unknown>(url: string, config?: Record<string, unknown>): Promise<HttpResponse<T>>
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Record<string, unknown>
  ): Promise<HttpResponse<T>>
}

const buildRequestOption = (
  url: string,
  config: Record<string, unknown> = {},
  data?: unknown
): Record<string, unknown> => {
  const headers = (config.headers as Record<string, unknown> | undefined) || {}
  const contentType = headers['Content-Type']
  return {
    url,
    data,
    params: config.params,
    responseType: config.responseType,
    loading: config.loading,
    silentError: config.silentError,
    headersType: typeof contentType === 'string' ? contentType : undefined
  }
}

const fallbackBridge: AxiosBridge = {
  get: <T = unknown>(url: string, config?: Record<string, unknown>) =>
    request.get<T>(buildRequestOption(url, config || {})) as Promise<HttpResponse<T>>,
  post: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) =>
    request.post<T>(buildRequestOption(url, config || {}, data)) as Promise<HttpResponse<T>>
}

const axiosBridge = (): AxiosBridge => {
  const axiosInstance = (window as Window & { AxiosDe?: AxiosBridge }).AxiosDe
  return axiosInstance || fallbackBridge
}

const normalizeConfig = (config: HttpConfig = {}): HttpConfig => {
  const { headersType, headers, ...rest } = config
  if (!headersType) {
    return config
  }
  return {
    ...rest,
    headers: {
      ...(headers || {}),
      'Content-Type': headersType
    }
  }
}

const shouldKeepRawResponse = (config: HttpConfig) =>
  config.responseType === 'blob' || config.rawResponse === true

const normalizeResponse = <T = unknown>(response: unknown): HttpResponse<T> => {
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    'status' in response &&
    'statusText' in response
  ) {
    return response as HttpResponse<T>
  }

  return {
    data: response as T,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  }
}

export async function get<T = unknown>(url: string, config?: HttpConfig): Promise<T>
export async function get<T = unknown>(
  url: string,
  config: HttpConfig = {}
): Promise<T | HttpResponse<T>> {
  const normalizedConfig = normalizeConfig(config)
  const response = normalizeResponse<T>(await axiosBridge().get<T>(url, normalizedConfig))
  if (shouldKeepRawResponse(normalizedConfig)) {
    return response
  }
  return response.data
}

export async function post<T = unknown>(url: string, data?: unknown, config?: HttpConfig): Promise<T>
export async function post<T = unknown>(
  url: string,
  data?: unknown,
  config: HttpConfig = {}
): Promise<T | HttpResponse<T>> {
  const normalizedConfig = normalizeConfig(config)
  const response = normalizeResponse<T>(await axiosBridge().post<T>(url, data, normalizedConfig))
  if (shouldKeepRawResponse(normalizedConfig)) {
    return response
  }
  return response.data
}
