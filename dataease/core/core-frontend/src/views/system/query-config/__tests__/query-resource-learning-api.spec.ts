import {
  createQueryLearningFeedbackEvent,
  disableQueryLearningPatch,
  evaluateQueryLearningRelearning,
  getQueryLearningFeedbackMetric,
  getQueryLearningFeedbackReplay,
  getQueryLearningFeedbackSummary,
  getQueryLearningQualitySummary,
  listQueryLearningFeedbackEvents,
  listQueryLearningPatches,
  listQueryLearningResources,
  triggerQueryLearning
} from '../../../../api/queryResourceLearning'

/**
 * This package does not currently expose a real frontend unit-test runner for this area.
 * This file is an executable contract harness for the Task 4 API wrapper commands that:
 * 1. compile the owned query-resource-learning files with a temporary axios stub, then
 * 2. run this module with `QUERY_RESOURCE_LEARNING_API_RUN_CONTRACTS=1`.
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
    name: 'normalizes DataEase proxy payloads returned by the list wrapper',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: [
          {
            resource_id: 'resource-1',
            name: '销售数据',
            learning_status: 'failed',
            quality_grade: 'B',
            quality_score: 82,
            failure_reason: '字段画像缺失',
            'quality-summary': {
              signals: ['字段完整度高'],
              suggestions: ['补充业务术语']
            },
            'feedback-summary': {
              resource_id: 'resource-1',
              total_feedback_count: 4,
              downvote_count: 1,
              downvote_rate: 25,
              failure_count: 1,
              failure_rate: 25,
              relearning_suggested: true,
              trigger_reason: 'downvote_rate_high',
              relearning_advice: '近期点踩率偏高，建议重新学习并补充推荐问法与术语映射。',
              recent_issues: ['近期连续出现失败问法']
            }
          }
        ]
      })

      const result = await listQueryLearningResources()

      assertDeepEqual(
        result,
        [
          {
            id: 'resource-1',
            name: '销售数据',
            learningStatus: '学习失败',
            qualityGrade: 'B',
            qualityScore: 82,
            failureReason: '字段画像缺失',
            qualitySummary: {
              risks: [],
              signals: ['字段完整度高'],
              suggestions: ['补充业务术语']
            },
            feedbackSummary: {
              resourceId: 'resource-1',
              totalFeedbackCount: 4,
              downvoteCount: 1,
              downvoteRate: 25,
              failureCount: 1,
              failureRate: 25,
              relearningSuggested: true,
              triggerReason: 'downvote_rate_high',
              relearningAdvice: '近期点踩率偏高，建议重新学习并补充推荐问法与术语映射。',
              recentIssues: ['近期连续出现失败问法']
            }
          }
        ],
        'dataease proxy normalization'
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
            qualityGrade: '',
            qualityScore: ''
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
            qualityGrade: '',
            qualityScore: undefined
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
    name: 'gets the expected quality summary request contract',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: {
          resource_id: 'resource-2',
          score: 91,
          grade: 'A',
          risks: [],
          signals: ['字段完整度高'],
          suggestions: ['补充更多 SQL 示例']
        }
      })

      const result = await getQueryLearningQualitySummary('resource-2')

      assertDeepEqual(
        requestMock.getCalls,
        [{ url: '/ai/query/resource-learning/resources/resource-2/quality-summary' }],
        'quality summary request contract'
      )
      assertDeepEqual(
        result,
        {
          resourceId: 'resource-2',
          score: 91,
          grade: 'A',
          risks: [],
          signals: ['字段完整度高'],
          suggestions: ['补充更多 SQL 示例']
        },
        'quality summary normalization'
      )
    }
  },
  {
    name: 'gets the expected feedback summary request contract',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: {
          resource_id: 'resource-3',
          total_feedback_count: 4,
          downvote_count: 1,
          downvote_rate: 25,
          failure_count: 1,
          failure_rate: 25,
          relearning_suggested: true,
          trigger_reason: 'downvote_rate_high',
          relearning_advice: '近期点踩率偏高，建议重新学习并补充推荐问法与术语映射。',
          recent_issues: ['按门店统计销售额']
        }
      })

      const result = await getQueryLearningFeedbackSummary('resource-3')

      assertDeepEqual(
        requestMock.getCalls,
        [{ url: '/ai/query/resource-learning/resources/resource-3/feedback-summary' }],
        'feedback summary request contract'
      )
      assertDeepEqual(
        result,
        {
          resourceId: 'resource-3',
          totalFeedbackCount: 4,
          downvoteCount: 1,
          downvoteRate: 25,
          failureCount: 1,
          failureRate: 25,
          relearningSuggested: true,
          triggerReason: 'downvote_rate_high',
          relearningAdvice: '近期点踩率偏高，建议重新学习并补充推荐问法与术语映射。',
          recentIssues: ['按门店统计销售额']
        },
        'feedback summary normalization'
      )
    }
  },
  {
    name: 'posts the expected learning trigger request contract',
    async run() {
      const requestMock = resetRequestMockState()
      const triggerResponse = {
        data: {
          task_id: 'task-1',
          resource_id: '42',
          task_status: 'pending'
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
          taskStatus: '待学习'
        },
        'triggerQueryLearning response normalization'
      )
    }
  },
  {
    name: 'posts manual fix feedback event contract',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.postResponses.push({
        data: {
          accepted: true,
          event_no: 'qrl_20260428001_abcd',
          resource_id: 'datasource:12',
          active_patch_count: 1,
          metric: {
            lifetime_total_feedback_count: 3,
            lifetime_failure_count: 1,
            relearning_suggested: false
          }
        }
      })

      const result = await createQueryLearningFeedbackEvent('datasource:12', {
        eventType: 'manual_fix_submit',
        questionText: '按区域看 GMV',
        matchedSql: 'select region, gmv from sales',
        beforeSnapshot: {
          sql: 'select region, gmv from sales'
        },
        afterSnapshot: {
          sql: 'select region, sum(gmv) from sales group by region'
        },
        patchTypes: ['sql_override']
      })

      assertDeepEqual(
        requestMock.postCalls,
        [{ url: '/ai/query/resource-learning/resources/datasource:12/feedback/events' }],
        'feedback event post contract'
      )
      assertDeepEqual(
        result,
        {
          accepted: true,
          eventNo: 'qrl_20260428001_abcd',
          resourceId: 'datasource:12',
          activePatchCount: 1,
          metric: {
            lifetimeTotalFeedbackCount: 3,
            lifetimeDownvoteCount: 0,
            lifetimeFailureCount: 1,
            lifetimeCorrectionCount: 0,
            window7dTotalFeedbackCount: 0,
            window7dDownvoteRate: 0,
            window7dFailureRate: 0,
            window7dCorrectionRate: 0,
            relearningSuggested: false,
            triggerReason: undefined,
            relearningAdvice: undefined
          }
        },
        'feedback event normalization'
      )
    }
  },
  {
    name: 'gets patch list contract and normalization',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: [
          {
            id: 1001,
            resource_id: 'datasource:12',
            patch_type: 'sql_override',
            status: 'active',
            priority: 100,
            match_fingerprint: 'fp_1',
            source_event_id: 88,
            activated_at: '2026-04-28T08:00:00'
          }
        ]
      })

      const result = await listQueryLearningPatches('datasource:12', { status: 'active' })

      assertDeepEqual(
        requestMock.getCalls,
        [{ url: '/ai/query/resource-learning/resources/datasource:12/patches' }],
        'patch list request contract'
      )
      assertDeepEqual(
        result,
        [
          {
            id: 1001,
            resourceId: 'datasource:12',
            patchType: 'sql_override',
            status: 'active',
            priority: 100,
            matchFingerprint: 'fp_1',
            sourceEventId: 88,
            activatedAt: '2026-04-28T08:00:00',
            deactivatedAt: undefined
          }
        ],
        'patch list normalization'
      )
    }
  },
  {
    name: 'posts disable patch contract',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.postResponses.push({
        data: {
          patch_id: 1001,
          resource_id: 'datasource:12',
          disabled: true,
          event_no: 'qrl_20260428002_dcba'
        }
      })

      const result = await disableQueryLearningPatch('datasource:12', 1001, {
        reason: '手工下线'
      })

      assertDeepEqual(
        requestMock.postCalls,
        [{ url: '/ai/query/resource-learning/resources/datasource:12/patches/1001/disable' }],
        'disable patch request contract'
      )
      assertDeepEqual(
        result,
        {
          patchId: 1001,
          resourceId: 'datasource:12',
          disabled: true,
          eventNo: 'qrl_20260428002_dcba'
        },
        'disable patch normalization'
      )
    }
  },
  {
    name: 'gets feedback events and replay contracts',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: [
          {
            event_no: 'qrl_20260428001_abcd',
            resource_id: 'datasource:12',
            event_type: 'manual_fix_submit',
            question_text: '按区域看GMV',
            patch_types: ['sql_override'],
            before_snapshot: { sql: 'select region, gmv from sales' },
            after_snapshot: { sql: 'select region, sum(gmv) from sales group by region' }
          }
        ]
      })
      requestMock.getResponses.push({
        data: {
          event_no: 'qrl_20260428001_abcd',
          resource_id: 'datasource:12',
          event_type: 'manual_fix_submit',
          question_text: '按区域看GMV',
          patch_types: ['sql_override'],
          before_snapshot: { sql: 'select region, gmv from sales' },
          after_snapshot: { sql: 'select region, sum(gmv) from sales group by region' }
        }
      })

      const events = await listQueryLearningFeedbackEvents('datasource:12', {
        eventType: 'manual_fix_submit',
        sourceChatRecordId: 345
      })
      const replay = await getQueryLearningFeedbackReplay('datasource:12', 'qrl_20260428001_abcd')

      assertDeepEqual(
        requestMock.getCalls,
        [
          { url: '/ai/query/resource-learning/resources/datasource:12/feedback/events' },
          {
            url: '/ai/query/resource-learning/resources/datasource:12/feedback/replay/qrl_20260428001_abcd'
          }
        ],
        'feedback event/replay request contract'
      )
      assertDeepEqual(events[0]?.eventNo, 'qrl_20260428001_abcd', 'feedback events normalization')
      assertDeepEqual(
        replay.afterSnapshot,
        { sql: 'select region, sum(gmv) from sales group by region' },
        'feedback replay normalization'
      )
    }
  },
  {
    name: 'gets feedback metric and evaluate relearning contracts',
    async run() {
      const requestMock = resetRequestMockState()
      requestMock.getResponses.push({
        data: {
          lifetime_total_feedback_count: 8,
          lifetime_downvote_count: 2,
          lifetime_failure_count: 3,
          lifetime_correction_count: 2,
          window_7d_total_feedback_count: 4,
          window_7d_downvote_rate: 25,
          window_7d_failure_rate: 50,
          window_7d_correction_rate: 25,
          relearning_suggested: true,
          trigger_reason: 'failure_rate_high',
          relearning_advice: '建议重新学习'
        }
      })
      requestMock.postResponses.push({
        data: {
          resource_id: 'datasource:12',
          relearning_suggested: true,
          trigger_reason: 'failure_rate_high',
          relearning_advice: '建议重新学习',
          metric: {
            lifetime_total_feedback_count: 8,
            window_7d_failure_rate: 50
          }
        }
      })

      const metric = await getQueryLearningFeedbackMetric('datasource:12')
      const decision = await evaluateQueryLearningRelearning('datasource:12')

      assertDeepEqual(
        requestMock.getCalls,
        [{ url: '/ai/query/resource-learning/resources/datasource:12/feedback-metric' }],
        'feedback metric request contract'
      )
      assertDeepEqual(
        requestMock.postCalls,
        [
          {
            url: '/ai/query/resource-learning/resources/datasource:12/feedback/evaluate-relearning'
          }
        ],
        'evaluate relearning request contract'
      )
      assertDeepEqual(metric.window7dFailureRate, 50, 'feedback metric normalization')
      assertDeepEqual(
        decision,
        {
          resourceId: 'datasource:12',
          relearningSuggested: true,
          triggerReason: 'failure_rate_high',
          relearningAdvice: '建议重新学习',
          metric: {
            lifetimeTotalFeedbackCount: 8,
            lifetimeDownvoteCount: 0,
            lifetimeFailureCount: 0,
            lifetimeCorrectionCount: 0,
            window7dTotalFeedbackCount: 0,
            window7dDownvoteRate: 0,
            window7dFailureRate: 50,
            window7dCorrectionRate: 0,
            relearningSuggested: false,
            triggerReason: undefined,
            relearningAdvice: undefined
          }
        },
        'evaluate relearning normalization'
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
  typeof process !== 'undefined' && process?.env?.QUERY_RESOURCE_LEARNING_API_RUN_CONTRACTS === '1'

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
