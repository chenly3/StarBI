/**
 * Executable source contract for trusted-answer frontend API wrapper.
 * Build and run with TRUSTED_ANSWER_API_CONTRACTS=1.
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

const source = readSource('src/api/aiTrustedAnswer.ts')

const contractCases: ContractCase[] = [
  {
    name: 'trusted answer wrapper exposes canonical request and state contracts',
    run() {
      assertMatch(source, /export interface TrustedAnswerRequest/, 'request interface')
      assertMatch(source, /theme_id\?: string \| number/, 'theme_id contract')
      assertMatch(source, /datasource_id\?: string \| number/, 'datasource_id contract')
      assertMatch(source, /export type TrustedAnswerState =/, 'state union')
      assertMatch(source, /'UNSAFE_BLOCKED'/, 'unsafe state')
      assertMatch(source, /'NO_AUTHORIZED_CONTEXT'/, 'no authorized context state')
    }
  },
  {
    name: 'trusted answer wrapper calls DataEase backend endpoints only',
    run() {
      assertMatch(source, /\/ai\/query\/trusted-answer\/stream/, 'stream endpoint')
      assertMatch(source, /\/ai\/query\/trusted-answer\/trace\/\$\{traceId\}/, 'trace endpoint')
      assertMatch(source, /\/ai\/query\/trusted-answer\/trust-health/, 'trust health endpoint')
      assertMatch(source, /\/ai\/query\/trusted-answer\/repair-queue/, 'repair queue endpoint')
      assertMatch(
        source,
        /fetch\(resolveFetchUrl\('\/ai\/query\/trusted-answer\/stream'\)/,
        'stream fetch'
      )
    }
  },
  {
    name: 'trusted answer wrapper parses SSE events and exposes sqlbot-compatible stream adapter',
    run() {
      assertMatch(source, /const parseTrustedAnswerSseMessage = /, 'SSE parser')
      assertMatch(source, /export const streamTrustedAnswer = /, 'stream function')
      assertMatch(source, /export const streamTrustedAnswerQuestion = /, 'sqlbot adapter')
      assertMatch(source, /callbacks\.onMessage\?\.\(event\.data, event\)/, 'message callback')
      assertMatch(source, /from '@\/api\/aiTrustedAnswerEventAdapter'/, 'legacy adapter import')
      assertMatch(
        source,
        /options\.onEvent\(toSqlBotCompatibleEvent\(trustedEvent\)\)/,
        'legacy adapter usage'
      )
    }
  }
]

export const runTrustedAnswerApiContracts = () => {
  contractCases.forEach(contractCase => contractCase.run())
}

const shouldRun =
  typeof process !== 'undefined' && process?.env?.TRUSTED_ANSWER_API_CONTRACTS === '1'

if (shouldRun) {
  try {
    runTrustedAnswerApiContracts()
    console.log(`[trusted-answer-api] ${contractCases.length} contract checks passed`)
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    if (typeof process !== 'undefined') {
      process.exitCode = 1
    }
  }
}
