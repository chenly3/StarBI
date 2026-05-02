/**
 * Executable state contract for SQLBot New Quick BI-style message flow.
 * Run with SQLBOT_MESSAGE_FLOW_STATE_CONTRACTS=1 after TypeScript compilation.
 */

import {
  buildDerivedQuestionText,
  createLegacyInsightDerivedMessagesForRestore,
  findLatestOriginalQuestionInRecords,
  getDerivedActionKey,
  hasUnfinishedDerivedAnswer,
  isDerivedAnswerRecord,
  isDerivedQuestionRecord,
  isFactAnswerRecord,
  sortRestoredMessageFlowRecords,
  stripInlineInsightsFromFactRecord,
  type SqlbotMessageFlowRecord
} from '../sqlbotMessageFlow'

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

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    fail(message)
  }
}

const baseFactRecord = (overrides: Partial<SqlbotMessageFlowRecord> = {}) =>
  ({
    kind: 'fact-answer',
    localId: 'fact-1',
    id: 101,
    question: '按品线统计销售金额',
    chartAnswer: '销售金额按品线统计完成。',
    sqlAnswer: 'select product_line, sum(amount) from sales group by product_line',
    analysis: '',
    analysisThinking: '',
    analysisLoading: false,
    predict: '',
    predictThinking: '',
    predictLoading: false,
    createTime: 1000,
    finish: true,
    recommendQuestions: [],
    ...overrides
  }) satisfies SqlbotMessageFlowRecord & Partial<SqlbotMessageFlowRecord>

const contractCases: ContractCase[] = [
  {
    name: 'record kind helpers classify fact and derived messages',
    run() {
      assert(isFactAnswerRecord(baseFactRecord()), 'fact-answer should be a fact record')
      assert(isFactAnswerRecord({ ...baseFactRecord(), kind: 'answer' }), 'legacy answer is fact')
      assert(
        isDerivedQuestionRecord({ ...baseFactRecord(), kind: 'derived-question' }),
        'derived-question should be derived question'
      )
      assert(
        isDerivedAnswerRecord({ ...baseFactRecord(), kind: 'derived-answer' }),
        'derived-answer should be derived answer'
      )
    }
  },
  {
    name: 'derived question text mirrors Quick BI-style automatic user question',
    run() {
      const text = buildDerivedQuestionText('analysis', baseFactRecord())
      assert(text === '对“按品线统计销售金额”做数据解读', `unexpected analysis text: ${text}`)
      const predictText = buildDerivedQuestionText('predict', baseFactRecord())
      assert(predictText === '对“按品线统计销售金额”做趋势预测', `unexpected predict text: ${predictText}`)
    }
  },
  {
    name: 'fact records strip inline insights before fact card rendering',
    run() {
      const record = baseFactRecord({
        analysis: '这是旧的内联解读',
        analysisThinking: '旧推理',
        analysisError: '旧错误',
        analysisLoading: true,
        predict: '这是旧的内联预测',
        predictThinking: '旧预测推理',
        predictError: '旧预测错误',
        predictLoading: true
      })
      stripInlineInsightsFromFactRecord(record)
      assert(record.analysis === '', 'analysis should be stripped')
      assert(record.analysisThinking === '', 'analysis thinking should be stripped')
      assert(record.analysisError === '', 'analysis error should be stripped')
      assert(record.analysisLoading === false, 'analysis loading should be false')
      assert(record.predict === '', 'predict should be stripped')
      assert(record.predictThinking === '', 'predict thinking should be stripped')
      assert(record.predictError === '', 'predict error should be stripped')
      assert(record.predictLoading === false, 'predict loading should be false')
    }
  },
  {
    name: 'legacy inline insights convert to alternating derived messages once',
    run() {
      const fact = baseFactRecord({
        analysis: '华东品线贡献最高，建议优先补货。',
        analysisThinking: '先比较品线销售金额。',
        predict: '预计下周仍保持增长。',
        predictThinking: '根据趋势外推。'
      })
      const restored = createLegacyInsightDerivedMessagesForRestore([fact])
      assert(restored.length === 5, `expected fact + 4 derived records, got ${restored.length}`)
      assert(restored[0].kind === 'fact-answer', 'fact should stay first')
      assert(restored[1].kind === 'derived-question', 'analysis question should be second')
      assert(restored[2].kind === 'derived-answer', 'analysis answer should be third')
      assert(restored[3].kind === 'derived-question', 'predict question should be fourth')
      assert(restored[4].kind === 'derived-answer', 'predict answer should be fifth')
      assert(restored[0].analysis === '', 'fact inline analysis should be stripped after conversion')
      assert(restored[0].predict === '', 'fact inline predict should be stripped after conversion')
    }
  },
  {
    name: 'persisted derived answers win over legacy inline fields',
    run() {
      const fact = baseFactRecord({
        analysis: '旧解读不应重复展示。',
        predict: '旧预测不应重复展示。'
      })
      const persistedAnalysisAnswer: SqlbotMessageFlowRecord = {
        ...baseFactRecord({
          kind: 'derived-answer',
          localId: 'analysis-answer-1',
          sourceRecordId: 101,
          sourceLocalId: 'fact-1',
          derivedAction: 'analysis',
          analysis: '已保存的新解读。',
          createTime: 1200,
          finish: true
        })
      }
      const restored = createLegacyInsightDerivedMessagesForRestore([fact, persistedAnalysisAnswer])
      const analysisAnswers = restored.filter(
        item => item.kind === 'derived-answer' && item.derivedAction === 'analysis'
      )
      const predictAnswers = restored.filter(
        item => item.kind === 'derived-answer' && item.derivedAction === 'predict'
      )
      assert(analysisAnswers.length === 1, `expected one analysis answer, got ${analysisAnswers.length}`)
      assert(predictAnswers.length === 1, `expected one converted predict answer, got ${predictAnswers.length}`)
      assert(analysisAnswers[0].analysis === '已保存的新解读。', 'persisted analysis should win')
    }
  },
  {
    name: 'restore sorting keeps fact before derived question before derived answer at same timestamp',
    run() {
      const records = sortRestoredMessageFlowRecords([
        { ...baseFactRecord(), kind: 'derived-answer', localId: 'a', createTime: 1000 },
        { ...baseFactRecord(), kind: 'derived-question', localId: 'q', createTime: 1000 },
        { ...baseFactRecord(), kind: 'fact-answer', localId: 'f', createTime: 1000 }
      ])
      assert(
        records.map(item => item.kind).join(',') === 'fact-answer,derived-question,derived-answer',
        'unexpected order'
      )
    }
  },
  {
    name: 'duplicate derived action lock detects unfinished answer for same source and action',
    run() {
      const fact = baseFactRecord()
      const unfinished: SqlbotMessageFlowRecord = {
        ...baseFactRecord({
          kind: 'derived-answer',
          localId: 'analysis-loading',
          sourceRecordId: 101,
          sourceLocalId: 'fact-1',
          derivedAction: 'analysis',
          analysisLoading: true,
          finish: false
        })
      }
      assert(
        hasUnfinishedDerivedAnswer([fact, unfinished], fact, 'analysis'),
        'unfinished analysis should block duplicate action'
      )
      assert(
        !hasUnfinishedDerivedAnswer([fact, unfinished], fact, 'predict'),
        'unfinished analysis should not block predict'
      )
    }
  },
  {
    name: 'latest original question ignores derived messages',
    run() {
      const latest = findLatestOriginalQuestionInRecords([
        baseFactRecord({ localId: 'first', question: '第一问', createTime: 1000 }),
        baseFactRecord({
          kind: 'derived-question',
          localId: 'derived',
          question: '对“第二问”做数据解读',
          createTime: 3000
        }),
        baseFactRecord({ localId: 'second', question: '第二问', createTime: 2000 })
      ])
      assert(latest === '第二问', `unexpected latest original question: ${latest}`)
    }
  },
  {
    name: 'derived action key is stable by source record id then local id',
    run() {
      assert(getDerivedActionKey(baseFactRecord(), 'analysis') === '101:analysis', 'id key mismatch')
      assert(
        getDerivedActionKey(baseFactRecord({ id: undefined, localId: 'local-only' }), 'predict') === 'local-only:predict',
        'local key mismatch'
      )
    }
  }
]

export const runSqlbotMessageFlowStateContracts = async () => {
  for (const contractCase of contractCases) {
    contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' && process?.env?.SQLBOT_MESSAGE_FLOW_STATE_CONTRACTS === '1'

if (shouldRunContracts) {
  runSqlbotMessageFlowStateContracts()
    .then(() => {
      console.log(`[sqlbot-message-flow-state] ${contractCases.length} contract checks passed`)
    })
    .catch(error => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      console.error(message)
      if (typeof process !== 'undefined') {
        process.exitCode = 1
      }
    })
}
