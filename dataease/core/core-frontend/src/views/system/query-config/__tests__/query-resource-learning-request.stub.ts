type RequestCall = {
  url: string
}

type RequestMockState = {
  getCalls: RequestCall[]
  getResponses: unknown[]
  postCalls: RequestCall[]
  postResponses: unknown[]
}

type QueryResourceLearningGlobal = typeof globalThis & {
  __QUERY_RESOURCE_LEARNING_REQUEST_MOCK__?: RequestMockState
}

const requestGlobal = globalThis as QueryResourceLearningGlobal

const getRequestMockState = (): RequestMockState => {
  if (!requestGlobal.__QUERY_RESOURCE_LEARNING_REQUEST_MOCK__) {
    requestGlobal.__QUERY_RESOURCE_LEARNING_REQUEST_MOCK__ = {
      getCalls: [],
      getResponses: [],
      postCalls: [],
      postResponses: []
    }
  }
  return requestGlobal.__QUERY_RESOURCE_LEARNING_REQUEST_MOCK__
}

export default {
  async get<T = unknown>(option: { url: string }) {
    const requestMock = getRequestMockState()
    requestMock.getCalls.push({ url: option.url })
    return requestMock.getResponses.shift() as T
  },
  async post<T = unknown>(option: { url: string }) {
    const requestMock = getRequestMockState()
    requestMock.postCalls.push({ url: option.url })
    return requestMock.postResponses.shift() as T
  }
}
