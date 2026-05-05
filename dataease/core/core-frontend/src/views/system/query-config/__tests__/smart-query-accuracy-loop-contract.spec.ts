/**
 * Executable source contract for the smart-query accuracy operations loop.
 * Build and run with SMART_QUERY_ACCURACY_LOOP_CONTRACTS=1.
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

const trustedAnswerSource = readSource('src/api/aiTrustedAnswer.ts')
const axiosRequestSource = readSource('src/config/axios/index.ts')
const learningSource = readSource('src/api/queryResourceLearning.ts')
const themeSource = readSource('src/views/visualized/data/query-theme/index.vue')
const resourceSource = readSource('src/views/system/query-config/QueryResourcePrototype.vue')
const legacySqlbotSource = readSource('src/views/sqlbot/index.vue')
const sqlbotDirectSource = readSource('src/views/sqlbot/sqlbotDirect.ts')

const contractCases: ContractCase[] = [
  {
    name: 'trusted answer api exposes action contracts and policy wrappers',
    run() {
      assertMatch(trustedAnswerSource, /export type TrustedAnswerActionType =/, 'action type union')
      assertMatch(trustedAnswerSource, /listTrustedAnswerContracts/, 'contracts wrapper')
      assertMatch(
        trustedAnswerSource,
        /createTrustedAnswerCorrectionTodo/,
        'correction todo wrapper'
      )
      assertMatch(trustedAnswerSource, /applyTrustedAnswerSemanticPatch/, 'semantic patch wrapper')
      assertMatch(
        trustedAnswerSource,
        /\/ai\/query\/trusted-answer\/contracts/,
        'contracts endpoint'
      )
      assertMatch(
        trustedAnswerSource,
        /\/ai\/query\/trusted-answer\/correction-todos/,
        'correction endpoint'
      )
      assertMatch(trustedAnswerSource, /trustedAnswerScopeHeaders/, 'correction scope headers')
      assertMatch(trustedAnswerSource, /X-DE-Tenant-Id/, 'tenant header')
      assertMatch(trustedAnswerSource, /X-DE-Workspace-Id/, 'workspace header')
      assertMatch(trustedAnswerSource, /X-DE-User-Id/, 'user header')
      assertMatch(
        trustedAnswerSource,
        /\/ai\/query\/trusted-answer\/semantic-patches/,
        'semantic patch endpoint'
      )
      assertMatch(
        axiosRequestSource,
        /\.\.\.\(headers \|\| \{\}\)/,
        'axios request wrapper preserves custom headers'
      )
    }
  },
  {
    name: 'trusted answer stream sends action and entry fields',
    run() {
      assertMatch(
        trustedAnswerSource,
        /action_type\?: TrustedAnswerActionType/,
        'request action field'
      )
      assertMatch(trustedAnswerSource, /entry_scene\?: string/, 'request entry scene field')
      assertMatch(trustedAnswerSource, /resource_kind\?: string/, 'request resource kind field')
      assertMatch(trustedAnswerSource, /source_trace_id\?: string/, 'request source trace field')
    }
  },
  {
    name: 'query resource learning exposes readiness and askability fields',
    run() {
      assertMatch(learningSource, /readinessState\?: string/, 'readiness field')
      assertMatch(learningSource, /askabilityState\?: string/, 'askability field')
      assertMatch(learningSource, /recommendationCount\?: number/, 'recommendation count')
      assertMatch(learningSource, /failureRate30d\?: number/, 'failure rate')
      assertMatch(learningSource, /negativeFeedbackRate30d\?: number/, 'negative feedback rate')
    }
  },
  {
    name: 'analysis theme page does not hardcode learning success',
    run() {
      if (/statusLabel:\s*'学习成功'/.test(themeSource)) {
        fail('theme page must not hardcode 学习成功')
      }
      assertMatch(themeSource, /listQueryLearningResources/, 'theme page learning api import')
      assertMatch(themeSource, /learningResourceMap/, 'theme page learning map')
    }
  },
  {
    name: 'analysis theme page scopes learning copy to assigned query resources',
    run() {
      assertMatch(themeSource, /已分配问数资源/, 'assigned query resources title')
      assertMatch(themeSource, /资源最后学习时间/, 'resource learning time copy')
      assertMatch(themeSource, /资源学习状态/, 'resource learning status copy')
      assertMatch(
        themeSource,
        /const learningResource = learningResourceMap\.value\.get\(String\(datasetId\)\)/,
        'assigned resource learning map lookup'
      )
      assertMatch(
        themeSource,
        /lastLearningTime:\s*learningResource\?\.lastLearningTime/,
        'assigned resource learning time source'
      )
      assertMatch(themeSource, /learningResourceLoadError/, 'learning resource load error state')
      assertMatch(themeSource, /学习状态加载失败/, 'learning load failure visible copy')
      if (/updateTime:\s*selectedTheme\.value\?\.updateTime/.test(themeSource)) {
        fail('theme assigned-resource learning time must not use theme update time')
      }
      if (/分析主题[^\\n]{0,20}学习|主题学习|学习主题/.test(themeSource)) {
        fail('analysis theme page must not imply that themes learn by themselves')
      }
    }
  },
  {
    name: 'resource config page keeps density and no demo fallback contract',
    run() {
      assertMatch(resourceSource, /font-size:\s*14px/, 'minimum table font size')
      assertMatch(
        resourceSource,
        /cell--operation[\s\S]*justify-content:\s*center/,
        'operation center alignment'
      )
      assertMatch(resourceSource, /showResourceEmptyState/, 'stable empty state')
      assertMatch(resourceSource, /loadingResources/, 'real loading state')
    }
  },
  {
    name: 'frontend does not directly call SQLBot answer runtime',
    run() {
      assertMatch(
        trustedAnswerSource,
        /\/ai\/query\/trusted-answer\/stream/,
        'trusted stream endpoint'
      )
      if (/fetch\([^)]*\/api\/v1\/chat\/question/.test(trustedAnswerSource)) {
        fail('trusted answer api must not fetch SQLBot /chat/question directly')
      }
    }
  },
  {
    name: 'semantic patch operations include disable unpublish rollback',
    run() {
      assertMatch(trustedAnswerSource, /'disable'/, 'disable operation')
      assertMatch(trustedAnswerSource, /'unpublish'/, 'unpublish operation')
      assertMatch(trustedAnswerSource, /'rollback'/, 'rollback operation')
    }
  },
  {
    name: 'runtime history snapshot and context actions carry trusted trace scope',
    run() {
      assertMatch(
        sqlbotDirectSource,
        /actionType:\s*'HISTORY_RESTORE'[\s\S]*sourceTraceId:\s*context\.sourceTraceId/,
        'history restore trace'
      )
      assertMatch(
        sqlbotDirectSource,
        /actionType:\s*'CONTEXT_SWITCH'[\s\S]*sourceTraceId:\s*context\.sourceTraceId/,
        'context switch trace'
      )
      assertMatch(
        sqlbotDirectSource,
        /actionType:\s*'SNAPSHOT'[\s\S]*sourceTraceId:\s*context\.sourceTraceId/,
        'snapshot trace'
      )
    }
  },
  {
    name: 'legacy sqlbot page sends active analysis theme through trusted runtime',
    run() {
      assertMatch(legacySqlbotSource, /listAIQueryThemes/, 'legacy page loads analysis themes')
      assertMatch(
        legacySqlbotSource,
        /const currentQueryTheme = computed/,
        'legacy page resolves active theme'
      )
      assertMatch(
        legacySqlbotSource,
        /themeId:\s*currentQueryTheme\.value\?\.id/,
        'legacy request context theme id'
      )
      assertMatch(
        legacySqlbotSource,
        /theme_id:\s*currentQueryTheme\.value\?\.id/,
        'legacy stream payload theme id'
      )
    }
  },
  {
    name: 'correction todo payload is sanitized by frontend contract',
    run() {
      assertMatch(trustedAnswerSource, /sanitized_question_summary/, 'sanitized summary field')
      assertMatch(
        trustedAnswerSource,
        /restricted_payload_visible/,
        'restricted payload visibility field'
      )
      assertMatch(trustedAnswerSource, /duplicate_fingerprint/, 'fingerprint field')
    }
  }
]

export const runSmartQueryAccuracyLoopContracts = () => {
  contractCases.forEach(contractCase => contractCase.run())
}

const shouldRun =
  typeof process !== 'undefined' && process?.env?.SMART_QUERY_ACCURACY_LOOP_CONTRACTS === '1'

if (shouldRun) {
  try {
    runSmartQueryAccuracyLoopContracts()
    console.log(`[smart-query-accuracy-loop] ${contractCases.length} contract checks passed`)
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    if (typeof process !== 'undefined') {
      process.exitCode = 1
    }
  }
}
