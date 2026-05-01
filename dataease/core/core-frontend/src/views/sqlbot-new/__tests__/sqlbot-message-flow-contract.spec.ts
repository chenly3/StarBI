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
const indexSource = readSource('src/views/sqlbot-new/index.vue')
const sqlbotDirectSource = readSource('src/views/sqlbot/sqlbotDirect.ts')
const starbiResultCardSource = readSource('src/views/sqlbot/StarbiResultCard.vue')
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
      assertMatch(conversationSource, /sourceRecordId\?: number/, 'source record id field')
      assertMatch(conversationSource, /sourceLocalId\?: string/, 'source local id field')
      assertMatch(
        conversationSource,
        /derivedAction\?: 'analysis' \| 'predict'/,
        'derived action field'
      )
      assertMatch(conversationSource, /derivedQuestion\?: string/, 'derived question field')
      assertMatch(conversationSource, /const isFactAnswerRecord = /, 'fact answer helper')
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
        conversationSource,
        requiredContracts[3],
        'legacy insight conversion helper exists'
      )
      assertMatch(conversationSource, requiredContracts[4], 'inline insight strip helper exists')
      assertMatch(
        conversationSource,
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
        /requestDerivedRecordAnalysis|requestDerivedRecordPredict|streamSQLBotRecordAnalysis|streamSQLBotRecordPredict/,
        'history restore must not generate analysis or predict'
      )
    }
  },
  {
    name: 'derived records do not affect original title or normal turn counting',
    run() {
      assertMatch(
        conversationSource,
        requiredContracts[6],
        'latest original question helper exists'
      )
      assertMatch(conversationSource, requiredContracts[7], 'fact answer helper used')
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
