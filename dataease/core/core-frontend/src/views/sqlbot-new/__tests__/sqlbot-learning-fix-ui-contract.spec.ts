/**
 * This package does not currently expose a real frontend unit-test runner for this area.
 * This file is an executable UI contract harness for learning-fix flow checks:
 * 1. compile this module with TypeScript, then
 * 2. run it with `QUERY_RESOURCE_LEARNING_UI_CONTRACTS=1`.
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
    fail(`${label}: expected source to match ${pattern}, received:\n${source}`)
  }
}

const starbiResultCardSource = readSource('src/views/sqlbot/StarbiResultCard.vue')
const conversationRecordSource = readSource(
  'src/views/sqlbot-new/components/SqlbotNewConversationRecord.vue'
)
const conversationSource = readSource('src/views/sqlbot-new/useSqlbotNewConversation.ts')
const historySource = readSource('src/views/sqlbot-new/useSqlbotNewHistory.ts')
const indexSource = readSource('src/views/sqlbot-new/index.vue')

const contractCases: ContractCase[] = [
  {
    name: 'result card exposes learning-fix action contract',
    run() {
      assertMatch(starbiResultCardSource, /学习修正/, 'result action copy')
      assertMatch(starbiResultCardSource, /emit\('learning-fix', record\)/, 'result action emit')
    }
  },
  {
    name: 'conversation record forwards learning-fix event to parent',
    run() {
      assertMatch(
        conversationRecordSource,
        /\(event:\s*'learning-fix',\s*record:\s*SqlbotNewConversationRecord\)/,
        'conversation record emit type'
      )
      assertMatch(
        conversationRecordSource,
        /@learning-fix="emit\('learning-fix', record\)"/,
        'conversation record forward event'
      )
    }
  },
  {
    name: 'index page wires dialog submit to feedback event api',
    run() {
      assertMatch(indexSource, /SqlbotNewLearningFixDialog/, 'index learning-fix dialog import')
      assertMatch(
        indexSource,
        /@learning-fix="openLearningFixDialog"/,
        'index learning-fix listener'
      )
      assertMatch(indexSource, /createQueryLearningFeedbackEvent/, 'index feedback event api')
      assertMatch(indexSource, /eventType:\s*'manual_fix_submit'/, 'index submit event type')
      assertMatch(indexSource, /已生效（仅当前资源）/, 'index success copy')
    }
  },
  {
    name: 'learning fix replay keeps trusted-answer trace as source lineage',
    run() {
      assertMatch(conversationSource, /trustedTraceId\?: string/, 'record trace id field')
      assertMatch(
        conversationSource,
        /record\.trustedTraceId = String\(event\.trace_id \|\| record\.trustedTraceId \|\| ''\)/,
        'stream events should retain trusted trace id on record'
      )
      assertMatch(
        indexSource,
        /sourceTraceId:\s*record\.trustedTraceId/,
        'learning feedback should submit source trace id for replay'
      )
    }
  },
  {
    name: 'index page keeps smart query sidebar focused on q&a and history',
    run() {
      assertMatch(indexSource, /label:\s*'小星问数'/, 'smart query nav copy')
      assertMatch(indexSource, /label:\s*'历史对话'/, 'history nav copy')
      if (/小星报告|小星搭建|我的问题|最近问数/.test(indexSource)) {
        fail(
          'sidebar/result page should not render report/build/recent-question/question-label copy'
        )
      }
    }
  },
  {
    name: 'history restore drops empty backend records before rendering turns',
    run() {
      assertMatch(
        conversationSource,
        /const isMeaningfulConversationRecord = \(/,
        'meaningful restored record guard'
      )
      assertMatch(
        conversationSource,
        /records:\s*rawRecords\s*\.map\(item => normalizeConversationRecord\(item, executionContext\)\)\s*\.filter\(isMeaningfulConversationRecord\)/,
        'normalized chat detail records are filtered'
      )
    }
  },
  {
    name: 'result page does not render an empty user question bubble',
    run() {
      assertMatch(indexSource, /const hasRenderableQuestion = \(/, 'question render guard')
      assertMatch(
        indexSource,
        /<div v-if="hasRenderableQuestion\(record\)" class="conversation-turn-question">/,
        'question bubble conditional render'
      )
    }
  },
  {
    name: 'history list shows the latest asked question as primary title',
    run() {
      assertMatch(
        conversationSource,
        /const title =\s*pickFirstNonEmptyString\(item\.latestQuestion,\s*item\.title,\s*item\.selectionTitle\)/,
        'history title should prefer latest question over resource name'
      )
    }
  },
  {
    name: 'active restored history keeps latest question as primary title',
    run() {
      assertMatch(
        conversationSource,
        /const resourceTitle =[\s\S]*const title = lastQuestion[\s\S]*subtitle: \[resourceTitle, selectionMeta\]\.filter\(Boolean\)\.join\(' \/ '\) \|\| title[\s\S]*selectionTitle: resourceTitle/,
        'active restored history should not replace question title with resource title'
      )
    }
  },
  {
    name: 'history item is marked active only after restore succeeds',
    run() {
      assertMatch(
        historySource,
        /activeHistoryId\.value = restoreActive && targetItem \? targetItem\.id : ''/,
        'initial active history should require restoreActive'
      )
      assertMatch(
        historySource,
        /if \(restored\) \{[\s\S]*await refreshHistory\(false\)\s*activeHistoryId\.value = id/,
        'clicked history should become active after successful restore'
      )
    }
  },
  {
    name: 'stale active history id is cleared when backend restore cannot use it',
    run() {
      assertMatch(
        historySource,
        /const clearActiveSessionId = \(\) => \{/,
        'active id clear helper'
      )
      assertMatch(
        historySource,
        /if \(restoreActive && activeSessionId && !targetItem\) \{[\s\S]*clearActiveSessionId\(\)/,
        'missing active history target should clear stale active id'
      )
      assertMatch(
        conversationSource,
        /restoreHistorySession[\s\S]*catch \(error\) \{[\s\S]*writeActiveSessionId\(''\)/,
        'failed history restore should clear stale active id'
      )
    }
  }
]

export const runSqlbotLearningFixUiContracts = async () => {
  for (const contractCase of contractCases) {
    contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' && process?.env?.QUERY_RESOURCE_LEARNING_UI_CONTRACTS === '1'

if (shouldRunContracts) {
  runSqlbotLearningFixUiContracts()
    .then(() => {
      console.log(`[sqlbot-learning-fix-ui] ${contractCases.length} contract checks passed`)
    })
    .catch(error => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      console.error(message)
      if (typeof process !== 'undefined') {
        process.exitCode = 1
      }
    })
}
