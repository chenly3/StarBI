/**
 * Behavior contract for trusted-answer to legacy SQLBot stream event mapping.
 * Build and run with TRUSTED_ANSWER_EVENT_ADAPTER=1.
 */

import { toSqlBotCompatibleEvent } from '../../../../api/aiTrustedAnswerEventAdapter'

type ContractCase = {
  name: string
  run: () => void
}

declare const process:
  | {
      env?: Record<string, string | undefined>
      exitCode?: number
    }
  | undefined

const fail = (message: string): never => {
  throw new Error(message)
}

const assertEqual = (actual: unknown, expected: unknown, label: string) => {
  if (actual !== expected) {
    fail(`${label}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

const contractCases: ContractCase[] = [
  {
    name: 'maps trusted answer payloads to chart-result chunks consumed by existing UI',
    run() {
      const mapped = toSqlBotCompatibleEvent({
        event: 'answer',
        trace_id: 'ta-1',
        state: 'TRUSTED',
        data: {
          text: '已基于可信问数上下文生成模拟答案。'
        },
        done: false
      })

      assertEqual(mapped.type, 'chart-result', 'answer type')
      assertEqual(mapped.reasoning_content, '已基于可信问数上下文生成模拟答案。', 'answer text')
      assertEqual(mapped.trace_id, 'ta-1', 'trace id')
      assertEqual(mapped.state, 'TRUSTED', 'state')
    }
  },
  {
    name: 'maps trusted done events to finish so records stop loading',
    run() {
      const mapped = toSqlBotCompatibleEvent({
        event: 'done',
        trace_id: 'ta-2',
        state: 'TRUSTED',
        done: true
      })

      assertEqual(mapped.type, 'finish', 'done type')
      assertEqual(mapped.trace_id, 'ta-2', 'trace id')
      assertEqual(mapped.trusted_answer_done, true, 'trusted done flag')
    }
  },
  {
    name: 'passes real SQLBot stream events through trusted-answer proxy wrappers',
    run() {
      const mapped = toSqlBotCompatibleEvent({
        event: 'sqlbot',
        trace_id: 'ta-real',
        state: 'TRUSTED',
        data: {
          sqlbot_event: {
            type: 'sql',
            content: 'select sum(sales_amount) from codex_qa_retail_sales'
          }
        },
        done: false
      })

      assertEqual(mapped.type, 'sql', 'sqlbot passthrough type')
      assertEqual(
        mapped.content,
        'select sum(sales_amount) from codex_qa_retail_sales',
        'sqlbot passthrough content'
      )
      assertEqual(mapped.trace_id, 'ta-real', 'trace id')
    }
  },
  {
    name: 'preserves trace id on wrapped SQLBot record id events for replay lineage',
    run() {
      const mapped = toSqlBotCompatibleEvent({
        event: 'sqlbot',
        trace_id: 'ta-lineage',
        state: 'TRUSTED',
        data: {
          sqlbot_event: {
            type: 'id',
            id: 68
          }
        },
        done: false
      })

      assertEqual(mapped.type, 'id', 'record id event type')
      assertEqual(mapped.id, 68, 'record id')
      assertEqual(mapped.trace_id, 'ta-lineage', 'lineage trace id')
    }
  },
  {
    name: 'maps trusted errors to user visible SQLBot error content',
    run() {
      const mapped = toSqlBotCompatibleEvent({
        event: 'error',
        trace_id: 'ta-3',
        state: 'NO_AUTHORIZED_CONTEXT',
        error: {
          code: 'NO_AUTHORIZED_DATASET',
          state: 'NO_AUTHORIZED_CONTEXT',
          message: '没有可问资源',
          cause: '当前权限下没有可用数据集',
          fix: '请联系管理员配置资源权限',
          trace_step: 'resolve-authorized-datasets',
          retryable: false,
          user_visible_message: '当前主题没有可问资源，请切换主题或联系管理员。',
          admin_visible_detail: 'No authorized dataset'
        },
        done: true
      })

      assertEqual(mapped.type, 'error', 'error type')
      assertEqual(
        mapped.content,
        '当前主题没有可问资源，请切换主题或联系管理员。',
        'user visible error'
      )
      assertEqual(mapped.trace_id, 'ta-3', 'trace id')
      assertEqual(mapped.error?.code, 'NO_AUTHORIZED_DATASET', 'error code')
    }
  }
]

export const runTrustedAnswerEventAdapterContracts = () => {
  contractCases.forEach(contractCase => contractCase.run())
}

const shouldRun =
  typeof process !== 'undefined' && process?.env?.TRUSTED_ANSWER_EVENT_ADAPTER === '1'

if (shouldRun) {
  try {
    runTrustedAnswerEventAdapterContracts()
    console.log(`[trusted-answer-event-adapter] ${contractCases.length} contract checks passed`)
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    if (typeof process !== 'undefined') {
      process.exitCode = 1
    }
  }
}
