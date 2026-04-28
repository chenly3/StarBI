/**
 * This package does not currently expose a real frontend unit-test runner for this area.
 * This file is an executable UI contract harness for Task 5 verification commands that:
 * 1. compile this module with TypeScript, then
 * 2. run it with `QUERY_RESOURCE_LEARNING_UI_CONTRACTS=1`.
 *
 * It intentionally verifies only the Task 5 UI boundaries:
 * - learning drawer failure information and retry affordance
 * - query resource page passthrough and retry wiring
 * - preview row route sync and recommendation user selection binding
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

const learningTaskDrawerSource = readSource(
  'src/views/system/query-config/components/LearningTaskDrawer.vue'
)
const learningFeedbackSummaryCardSource = readSource(
  'src/views/system/query-config/components/LearningFeedbackSummaryCard.vue'
)
const queryResourcePrototypeSource = readSource(
  'src/views/system/query-config/QueryResourcePrototype.vue'
)

const contractCases: ContractCase[] = [
  {
    name: 'renders failure details and exposes a retry action in the drawer',
    run() {
      assertMatch(
        learningTaskDrawerSource,
        /failureReason\?: string/,
        'drawer failureReason prop contract'
      )
      assertMatch(learningTaskDrawerSource, /\(event:\s*'retry'/, 'drawer retry emit contract')
      assertMatch(learningTaskDrawerSource, /失败原因/, 'drawer failure reason copy')
      assertMatch(learningTaskDrawerSource, /emit\('retry'\)/, 'drawer retry event wiring')
      assertMatch(learningTaskDrawerSource, /重新学习|重试学习/, 'drawer retry action label')
    }
  },
  {
    name: 'renders feedback summary block in learning drawer',
    run() {
      assertMatch(
        learningTaskDrawerSource,
        /LearningFeedbackSummaryCard/,
        'drawer feedback summary component'
      )
      assertMatch(
        learningTaskDrawerSource,
        /feedbackSummary\?:/,
        'drawer feedbackSummary prop contract'
      )
      assertMatch(
        learningTaskDrawerSource,
        /:summary="feedbackSummary"/,
        'drawer feedback summary binding'
      )
      assertMatch(learningFeedbackSummaryCardSource, /反馈摘要/, 'feedback summary card title copy')
      assertMatch(
        learningFeedbackSummaryCardSource,
        /recentIssues/,
        'feedback summary relearning suggestion contract'
      )
      assertMatch(
        learningFeedbackSummaryCardSource,
        /relearningAdvice/,
        'feedback summary governance advice contract'
      )
      assertMatch(
        learningFeedbackSummaryCardSource,
        /治理建议|重学建议/,
        'feedback summary governance copy'
      )
    }
  },
  {
    name: 'passes failure reason into the drawer and handles retry on the page',
    run() {
      assertMatch(
        queryResourcePrototypeSource,
        /:failure-reason="selectedLearningRow\?\.failureReason \|\| ''"/,
        'page failure reason passthrough'
      )
      assertMatch(
        queryResourcePrototypeSource,
        /@retry="handleLearningRetry"/,
        'page retry listener wiring'
      )
      assertMatch(
        queryResourcePrototypeSource,
        /selectedLearningFeedbackSummary \|\| selectedLearningRow\?\.feedbackSummary \|\| null/,
        'page feedback summary passthrough'
      )
      assertMatch(
        queryResourcePrototypeSource,
        /getQueryLearningQualitySummary/,
        'page quality summary fetch wiring'
      )
      assertMatch(
        queryResourcePrototypeSource,
        /getQueryLearningFeedbackSummary/,
        'page feedback summary fetch wiring'
      )
      assertMatch(
        queryResourcePrototypeSource,
        /const handleLearningRetry = \(\) =>/,
        'page retry handler'
      )
    }
  },
  {
    name: 'uses real empty lists instead of fallback demo rows when backend returns no resources',
    run() {
      assertMatch(
        queryResourcePrototypeSource,
        /rows\.value = resources\.map\(buildResourceRow\)/,
        'page binds real resource list'
      )
      if (
        /const resources = await listQueryLearningResources\(\)\s*rows\.value = fallbackRows\.map\(row => \(\{ \.\.\.row \}\)\)/.test(
          queryResourcePrototypeSource
        )
      ) {
        fail('empty resource lists should not fall back to demo rows')
      }
    }
  },
  {
    name: 'keeps preview row and recommendation user selection aligned with row data',
    run() {
      assertMatch(
        queryResourcePrototypeSource,
        /const renameAlias = \(row: ResourceRow\) =>/,
        'page rename handler'
      )
      assertMatch(
        queryResourcePrototypeSource,
        /updatePrototypeRoute\(\{ dialog: 'preview', previewId: row\.id \}\)/,
        'preview route uses row id'
      )
      assertMatch(
        queryResourcePrototypeSource,
        /rows\.value\.find\(row => row\.id === previewId\)/,
        'preview route restores clicked row'
      )
      assertMatch(
        queryResourcePrototypeSource,
        /<input v-model="ruleForm\.user" type="radio" :value="user" \/>/,
        'recommendation user uses radio binding'
      )
    }
  }
]

export const runQueryResourceLearningUiContracts = async () => {
  for (const contractCase of contractCases) {
    contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' && process?.env?.QUERY_RESOURCE_LEARNING_UI_CONTRACTS === '1'

if (shouldRunContracts) {
  runQueryResourceLearningUiContracts()
    .then(() => {
      console.log(`[query-resource-learning-ui] ${contractCases.length} contract checks passed`)
    })
    .catch(error => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      console.error(message)
      if (typeof process !== 'undefined') {
        process.exitCode = 1
      }
    })
}
