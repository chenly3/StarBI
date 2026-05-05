import {
  listQueryLearningResources,
  triggerQueryLearning
} from '../../../../api/queryResourceLearning'

/**
 * This package does not currently expose a real frontend unit-test runner for this area.
 * This file keeps the Task 4 API wrapper contract checks separate from the Task 5 UI checks.
 */

type RequestCall = {
  url: string
}

type RequestMockState = {
  getCalls: RequestCall[]
  getResponses: unknown[]
  postCalls: RequestCall[]
  postResponses: unknown[]
}

type ContractCase = {
  name: string
  run: () => Promise<void>
}

type QueryResourceLearningGlobal = typeof globalThis & {
  __QUERY_RESOURCE_LEARNING_REQUEST_MOCK__?: RequestMockState
}

const requestGlobal = globalThis as QueryResourceLearningGlobal

declare const process:
  | {
      env?: Record<string, string | undefined>
      exitCode?: number
    }
  | undefined

const createRequestMockState = (): RequestMockState => ({
  getCalls: [],
  getResponses: [],
  postCalls: [],
  postResponses: []
})

const getRequestMockState = (): RequestMockState => {
  if (!requestGlobal.__QUERY_RESOURCE_LEARNING_REQUEST_MOCK__) {
    requestGlobal.__QUERY_RESOURCE_LEARNING_REQUEST_MOCK__ = createRequestMockState()
  }
  return requestGlobal.__QUERY_RESOURCE_LEARNING_REQUEST_MOCK__
}

const resetRequestMockState = (): RequestMockState => {
  requestGlobal.__QUERY_RESOURCE_LEARNING_REQUEST_MOCK__ = createRequestMockState()
  return getRequestMockState()
}

const fail = (message: string): never => {
  throw new Error(message)
}

const assertDeepEqual = (actual: unknown, expected: unknown, label: string) => {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)

  if (actualJson !== expectedJson) {
    fail(`${label}: expected ${expectedJson}, received ${actualJson}`)
  }
}

const contractCases: ContractCase[] = [
  {
    name: 'normalizes snake_case payloads returned by the list wrapper',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: [
          {
            id: 1,
            name: '销售数据',
            learning_status: '学习成功',
            quality_grade: 'A'
          }
        ]
      })

      const result = await listQueryLearningResources()

      assertDeepEqual(
        result,
        [
          {
            id: '1',
            name: '销售数据',
            learningStatus: '学习成功',
            qualityGrade: 'A'
          }
        ],
        'snake_case normalization'
      )
      assertDeepEqual(
        requestMock.getCalls,
        [{ url: '/ai/query/resource-learning/resources' }],
        'listQueryLearningResources request contract'
      )
    }
  },
  {
    name: 'normalizes camelCase payloads without swallowing falsy values',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: [
          {
            id: 0,
            name: 0,
            learningStatus: '',
            qualityGrade: ''
          }
        ]
      })

      const result = await listQueryLearningResources()

      assertDeepEqual(
        result,
        [
          {
            id: '0',
            name: '0',
            learningStatus: '',
            qualityGrade: ''
          }
        ],
        'camelCase normalization with falsy values'
      )
    }
  },
  {
    name: 'falls back cleanly when optional fields are missing',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: [{}]
      })

      const result = await listQueryLearningResources()

      assertDeepEqual(
        result,
        [
          {
            id: '',
            name: '',
            learningStatus: ''
          }
        ],
        'missing field fallback behavior'
      )
    }
  },
  {
    name: 'returns an empty list when the backend response is not an array',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: {
          id: 7,
          learning_status: 'ignored'
        }
      })

      const result = await listQueryLearningResources()

      assertDeepEqual(result, [], 'non-array response handling')
    }
  },
  {
    name: 'posts the expected learning trigger request contract',
    async run() {
      const requestMock = resetRequestMockState()
      const triggerResponse = {
        data: {
          task_id: 'task-1'
        }
      }
      requestMock.postResponses.push(triggerResponse)

      const result = await triggerQueryLearning('42')

      assertDeepEqual(
        requestMock.postCalls,
        [{ url: '/ai/query/resource-learning/resources/42/learn' }],
        'triggerQueryLearning request contract'
      )
      assertDeepEqual(
        result,
        {
          taskId: 'task-1',
          resourceId: '42',
          taskStatus: ''
        },
        'triggerQueryLearning normalized response'
      )
    }
  }
]

export const runQueryResourceLearningApiContracts = async () => {
  for (const contractCase of contractCases) {
    await contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' && process?.env?.QUERY_RESOURCE_LEARNING_RUN_API_CONTRACTS === '1'

if (shouldRunContracts) {
  runQueryResourceLearningApiContracts()
    .then(() => {
      console.log(`[query-resource-learning-api] ${contractCases.length} contract checks passed`)
    })
    .catch(error => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      console.error(message)
      if (typeof process !== 'undefined') {
        process.exitCode = 1
      }
    })
}
