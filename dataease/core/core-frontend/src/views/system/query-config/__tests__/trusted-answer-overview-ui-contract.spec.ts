/**
 * Source contract for query-config Trust Health / Repair Queue panel.
 * Build and run with TRUSTED_ANSWER_OVERVIEW_UI_CONTRACTS=1.
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
  if (!pattern.test(source)) fail(`${label}: expected source to match ${pattern}`)
}

const overviewSource = readSource(
  'src/views/system/query-config/components/TrustedAnswerOverview.vue'
)
const indexSource = readSource('src/views/system/query-config/index.vue')

const contractCases: ContractCase[] = [
  {
    name: 'query config renders trust health before resource/theme config tabs',
    run() {
      assertMatch(indexSource, /<trusted-answer-overview/, 'overview component usage')
      assertMatch(indexSource, /import TrustedAnswerOverview/, 'overview import')
      assertMatch(
        indexSource,
        /<trusted-answer-overview[\s\S]*<section class="general-config-content"/,
        'overview before config content'
      )
    }
  },
  {
    name: 'overview component consumes real trusted answer endpoints',
    run() {
      assertMatch(overviewSource, /getTrustedAnswerTrustHealth/, 'trust health API')
      assertMatch(overviewSource, /listTrustedAnswerRepairQueue/, 'repair queue API')
      assertMatch(overviewSource, /listTrustedAnswerContracts/, 'contracts API')
      assertMatch(overviewSource, /getTrustedAnswerRuntimePolicy/, 'runtime policy API')
      assertMatch(overviewSource, /listTrustedAnswerCorrectionTodos/, 'correction todo API')
      assertMatch(overviewSource, /listTrustedAnswerSemanticPatches/, 'semantic patch API')
      assertMatch(overviewSource, /可信健康/, 'trust health title')
      assertMatch(overviewSource, /待修复答案/, 'repair queue title')
      assertMatch(overviewSource, /查看 Trace/, 'trace action')
      assertMatch(overviewSource, /动作契约/, 'contract health copy')
      assertMatch(overviewSource, /运行时开关/, 'runtime switch copy')
      assertMatch(overviewSource, /修正待办/, 'correction todo health copy')
      assertMatch(overviewSource, /语义补丁/, 'semantic patch health copy')
      assertMatch(overviewSource, /处理反馈/, 'correction todo action')
    }
  }
]

export const runTrustedAnswerOverviewUiContracts = () => {
  contractCases.forEach(contractCase => contractCase.run())
}

const shouldRun =
  typeof process !== 'undefined' && process?.env?.TRUSTED_ANSWER_OVERVIEW_UI_CONTRACTS === '1'

if (shouldRun) {
  try {
    runTrustedAnswerOverviewUiContracts()
    console.log(`[trusted-answer-overview-ui] ${contractCases.length} contract checks passed`)
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    if (typeof process !== 'undefined') {
      process.exitCode = 1
    }
  }
}
