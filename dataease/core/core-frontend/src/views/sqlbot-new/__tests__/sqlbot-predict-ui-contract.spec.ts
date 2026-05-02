/**
 * Executable source contract for the sqlbot-new predict flow.
 * Run with SQLBOT_PREDICT_UI_CONTRACTS=1 after TypeScript compilation.
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

const starbiResultCardSource = readSource('src/views/sqlbot/StarbiResultCard.vue')
const conversationRecordSource = readSource(
  'src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue'
)
const conversationSource = readSource('src/views/sqlbot-new/useSqlbotNewConversation.ts')
const indexSource = readSource('src/views/sqlbot-new/index.vue')
const sqlbotDirectSource = readSource('src/views/sqlbot/sqlbotDirect.ts')
const reasoningPanelSource = readSource('src/views/sqlbot/components/ReasoningPanel.vue')
const derivedQuestionSource = readSource(
  'src/views/sqlbot-new/components/SqlbotDerivedQuestionMessage.vue'
)
const derivedAnswerSource = readSource(
  'src/views/sqlbot-new/components/SqlbotDerivedAnswerMessage.vue'
)

const contractCases: ContractCase[] = [
  {
    name: 'result card gates predict action to sqlbot-new callers',
    run() {
      assertMatch(starbiResultCardSource, /showPredictAction\?: boolean/, 'predict prop')
      assertMatch(starbiResultCardSource, /showPredictAction: false/, 'predict default off')
      assertMatch(
        starbiResultCardSource,
        /v-if="\s*showInsightActions\s*&&\s*showPredictAction\s*&&\s*record\.finish\s*&&\s*!record\.error\s*&&\s*record\.id\s*"/,
        'predict action guard'
      )
      assertMatch(starbiResultCardSource, /emit\('predict'\)/, 'predict emit')
    }
  },
  {
    name: 'sqlbot-new forwards predict events from card to page',
    run() {
      assertMatch(
        conversationRecordSource,
        /:show-predict-action="true"/,
        'sqlbot-new enables predict action'
      )
      assertMatch(
        conversationRecordSource,
        /\(event:\s*'predict',\s*record:\s*SqlbotNewConversationRecord\)/,
        'conversation record predict emit type'
      )
      assertMatch(indexSource, /@predict="handlePredictRecord"/, 'index predict listener')
      assertMatch(
        indexSource,
        /requestDerivedRecordPredict\(record, effectiveExecutionContext\.value\)/,
        'index predict handler'
      )
    }
  },
  {
    name: 'conversation composable consumes SQLBot predict stream',
    run() {
      assertMatch(sqlbotDirectSource, /streamSQLBotRecordPredict/, 'direct predict stream helper')
      assertMatch(sqlbotDirectSource, /\/chat\/record\/\$\{recordId\}\/predict/, 'predict endpoint')
      assertMatch(
        conversationSource,
        /streamSQLBotRecordPredict/,
        'composable imports predict stream'
      )
      assertMatch(conversationSource, /case 'predict-result':/, 'predict result event')
      assertMatch(conversationSource, /case 'predict-success':/, 'predict success event')
      assertMatch(conversationSource, /case 'predict-failed':/, 'predict failed event')
      assertMatch(conversationSource, /case 'predict_finish':/, 'predict finish event')
      assertMatch(
        starbiResultCardSource,
        /watch\(\s*\(\) => props\.record\.predict/,
        'result card watches streamed predict content'
      )
      assertMatch(
        starbiResultCardSource,
        /predictExpanded\.value = true/,
        'result card expands predict panel when content arrives'
      )
    }
  },
  {
    name: 'reasoning panel defines template visibility guard',
    run() {
      assertMatch(
        reasoningPanelSource,
        /const hasContent = computed\(/,
        'hasContent computed guard'
      )
      assertMatch(reasoningPanelSource, /v-if="hasContent"/, 'hasContent template guard')
    }
  },
  {
    name: 'derived messages expose clear user-visible states',
    run() {
      assertMatch(
        derivedQuestionSource,
        /系统根据你的操作自动提问/,
        'derived question system label'
      )
      assertMatch(
        derivedQuestionSource,
        /data-testid="sqlbot-derived-question"/,
        'derived question test id'
      )
      assertMatch(
        derivedAnswerSource,
        /data-testid="sqlbot-derived-answer"/,
        'derived answer test id'
      )
      assertMatch(
        derivedAnswerSource,
        /data-testid="sqlbot-derived-answer-loading"/,
        'derived answer loading test id'
      )
      assertMatch(
        derivedAnswerSource,
        /data-testid="sqlbot-derived-answer-partial"/,
        'derived answer partial test id'
      )
      assertMatch(
        derivedAnswerSource,
        /data-testid="sqlbot-derived-answer-empty"/,
        'derived answer empty test id'
      )
      assertMatch(
        derivedAnswerSource,
        /data-testid="sqlbot-derived-answer-error"/,
        'derived answer error test id'
      )
    }
  }
]

export const runSqlbotPredictUiContracts = async () => {
  for (const contractCase of contractCases) {
    contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' && process?.env?.SQLBOT_PREDICT_UI_CONTRACTS === '1'

if (shouldRunContracts) {
  runSqlbotPredictUiContracts()
    .then(() => {
      console.log(`[sqlbot-predict-ui] ${contractCases.length} contract checks passed`)
    })
    .catch(error => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      console.error(message)
      if (typeof process !== 'undefined') {
        process.exitCode = 1
      }
    })
}
