/**
 * Executable source contract for sqlbot-new alternating message flow.
 * Run with SQLBOT_MESSAGE_FLOW_CONTRACTS=1 after TypeScript compilation.
 */

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
declare const require: any

const fs = require('fs')
const path = require('path')

const readSource = (relativePath: string): string => {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

const fail = (message: string): never => {
  throw new Error(message)
}

const assertMatch = (source: string, pattern: RegExp, label: string) => {
  if (!pattern.test(source)) {
    fail(`${label}: expected source to match ${pattern}`)
  }
}

const assertNotMatch = (source: string, pattern: RegExp, label: string) => {
  if (pattern.test(source)) {
    fail(`${label}: expected source not to match ${pattern}`)
  }
}

const extractFunctionSource = (source: string, functionName: string) => {
  const declarationPattern = new RegExp(`const\\s+${functionName}\\s*=\\s*(?:async\\s*)?\\(`)
  const declarationMatch = declarationPattern.exec(source)
  if (!declarationMatch) {
    fail(`${functionName}: function declaration not found`)
  }

  const startIndex = declarationMatch.index
  const bodyStart = source.indexOf('{', declarationMatch.index)
  if (bodyStart < 0) {
    fail(`${functionName}: function body not found`)
  }

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') {
      depth += 1
    }
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(startIndex, index + 1)
      }
    }
  }

  fail(`${functionName}: function body end not found`)
}

const typesSource = readSource('src/views/sqlbot-new/types.ts')
const conversationSource = readSource('src/views/sqlbot-new/useSqlbotNewConversation.ts')
const conversationRecordSource = readSource(
  'src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue'
)
const actionSuggestionsSource = readSource(
  'src/views/sqlbot-new/components/SqlbotActionSuggestionsMessage.vue'
)
const indexSource = readSource('src/views/sqlbot-new/index.vue')
const sqlbotDirectSource = readSource('src/views/sqlbot/sqlbotDirect.ts')
const starbiResultCardSource = readSource('src/views/sqlbot/StarbiResultCard.vue')
const messageFlowSource = readSource('src/views/sqlbot-new/sqlbotMessageFlow.ts')
const restoreHistorySource = extractFunctionSource(conversationSource, 'restoreHistorySession')

const requiredContracts = [
  /SqlbotNewConversationRecordKind =[\s\S]*'answer'[\s\S]*'fact-answer'[\s\S]*'derived-question'[\s\S]*'derived-answer'/,
  /disableInlineInsights\?: boolean/,
  /:disable-inline-insights="true"/,
  /createLegacyInsightDerivedMessages/,
  /stripInlineInsightsFromFactRecord/,
  /isDerivedActionPending/,
  /findLatestOriginalQuestionInRecords/,
  /isFactAnswerRecord/,
  /event\.eventType === 'derived_question' \|\| event\.eventType === 'derived_answer'/,
  /restoreHistorySession[\s\S]*createLegacyInsightDerivedMessages/
]

const contractCases: ContractCase[] = [
  {
    name: 'sqlbot-new record model separates fact and derived messages',
    run() {
      assertMatch(typesSource, requiredContracts[0], 'record kind union')
      assertMatch(messageFlowSource, /sourceRecordId\?: number/, 'source record id field')
      assertMatch(messageFlowSource, /sourceLocalId\?: string/, 'source local id field')
      assertMatch(
        messageFlowSource,
        /SqlbotDerivedAction = 'analysis' \| 'predict'/,
        'derived action union'
      )
      assertMatch(messageFlowSource, /derivedAction\?: SqlbotDerivedAction/, 'derived action field')
      assertMatch(messageFlowSource, /derivedQuestion\?: string/, 'derived question field')
      assertMatch(
        conversationSource,
        /extends SqlbotMessageFlowRecord/,
        'conversation record extends message flow record contract'
      )
      assertMatch(messageFlowSource, /export const isFactAnswerRecord = /, 'fact answer helper')
    }
  },
  {
    name: 'sqlbot-new strips legacy inline insights before rendering fact cards',
    run() {
      assertMatch(starbiResultCardSource, requiredContracts[1], 'disableInlineInsights prop')
      assertMatch(
        conversationRecordSource,
        requiredContracts[2],
        'sqlbot-new disables inline insights'
      )
      assertMatch(
        messageFlowSource,
        requiredContracts[3],
        'legacy insight conversion helper exists'
      )
      assertMatch(messageFlowSource, requiredContracts[4], 'inline insight strip helper exists')
      assertMatch(
        messageFlowSource,
        /stripInlineInsightsFromFactRecord[\s\S]*record\.analysis = ''[\s\S]*record\.predict = ''/,
        'fact strip clears analysis and predict'
      )
      assertMatch(
        conversationSource,
        /restoreHistorySession[\s\S]*stripInlineInsightsFromFactRecord/,
        'history restore strips fact insights'
      )
    }
  },
  {
    name: 'derived action clicks are locked and persisted as alternating messages',
    run() {
      assertMatch(conversationSource, requiredContracts[5], 'derived action pending lock')
      assertMatch(conversationSource, /createDerivedQuestionMessage/, 'derived question factory')
      assertMatch(conversationSource, /createDerivedAnswerMessage/, 'derived answer factory')
      assertMatch(conversationSource, /eventType:\s*'derived_question'/, 'derived question event')
      assertMatch(conversationSource, /eventType:\s*'derived_answer'/, 'derived answer event')
      assertMatch(
        indexSource,
        /requestDerivedRecordAnalysis\(record, effectiveExecutionContext\.value\)/,
        'index routes analysis through derived flow'
      )
      assertMatch(
        indexSource,
        /requestDerivedRecordPredict\(record, effectiveExecutionContext\.value\)/,
        'index routes predict through derived flow'
      )
    }
  },
  {
    name: 'conversation composable delegates message flow rules to pure helper module',
    run() {
      assertMatch(
        conversationSource,
        /from '.\/sqlbotMessageFlow'/,
        'conversation imports sqlbotMessageFlow helpers'
      )
      assertMatch(
        messageFlowSource,
        /export const sortRestoredMessageFlowRecords/,
        'restore sort helper'
      )
      assertMatch(
        messageFlowSource,
        /export const createLegacyInsightDerivedMessagesForRestore/,
        'legacy conversion helper'
      )
      assertMatch(
        conversationSource,
        /hasUnfinishedDerivedAnswer\(/,
        'conversation uses duplicate lock helper'
      )
      assertMatch(
        restoreHistorySource,
        /sortRestoredMessageFlowRecords\(/,
        'restore uses stable message sort helper'
      )
    }
  },
  {
    name: 'history restore recognizes derived events and never regenerates insights',
    run() {
      assertMatch(
        sqlbotDirectSource,
        /value === 'derived_question'/,
        'direct derived question type'
      )
      assertMatch(sqlbotDirectSource, /value === 'derived_answer'/, 'direct derived answer type')
      assertMatch(conversationSource, requiredContracts[8], 'restore handles derived events')
      assertMatch(conversationSource, requiredContracts[9], 'restore converts legacy insights')
      assertNotMatch(
        restoreHistorySource,
        /requestDerivedRecordAnalysis|requestDerivedRecordPredict|requestRecordAnalysis|requestRecordPredict|streamSQLBotRecordAnalysis|streamSQLBotRecordPredict/,
        'history restore must not generate analysis or predict'
      )
    }
  },
  {
    name: 'derived records do not affect original title or normal turn counting',
    run() {
      assertMatch(messageFlowSource, requiredContracts[6], 'latest original question helper exists')
      assertMatch(messageFlowSource, requiredContracts[7], 'fact answer helper exists')
      assertMatch(
        indexSource,
        /conversationAnswerTurnMap[\s\S]*isFactAnswerRecord/,
        'turn count only includes fact answers'
      )
      assertMatch(
        conversationSource,
        /getCurrentConversationHistoryEntry[\s\S]*findLatestOriginalQuestionInRecords/,
        'current history title only uses fact answer questions'
      )
    }
  },
  {
    name: 'action suggestions are a separate bridge before derived messages',
    run() {
      assertMatch(indexSource, /SqlbotActionSuggestionsMessage/, 'index renders action suggestions')
      assertMatch(
        actionSuggestionsSource,
        /data-testid="sqlbot-action-suggestions"/,
        'action suggestions test id'
      )
      assertMatch(
        actionSuggestionsSource,
        /解读\/预测[\s\S]*生成新的问题消息/,
        'derived action suggestions explain message creation'
      )
      assertMatch(
        actionSuggestionsSource,
        /推荐追问[\s\S]*填入输入框/,
        'recommended questions explain composer prefill'
      )
      assertMatch(
        actionSuggestionsSource,
        /@select="question => emit\('prefill-question', question\)"/,
        'recommended questions prefill instead of auto-submit'
      )
      assertMatch(
        indexSource,
        /@prefill-question="handlePrefillQuestion"/,
        'index wires action suggestions recommendations to prefill'
      )
    }
  }
]

export const runSqlbotMessageFlowContracts = async () => {
  for (const contractCase of contractCases) {
    contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' && process?.env?.SQLBOT_MESSAGE_FLOW_CONTRACTS === '1'

if (shouldRunContracts) {
  runSqlbotMessageFlowContracts()
    .then(() => {
      console.log(`[sqlbot-message-flow] ${contractCases.length} contract checks passed`)
    })
    .catch(error => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      console.error(message)
      if (typeof process !== 'undefined') {
        process.exitCode = 1
      }
    })
}
