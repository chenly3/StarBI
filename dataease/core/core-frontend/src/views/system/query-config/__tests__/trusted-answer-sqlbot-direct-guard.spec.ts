/**
 * Source guard: the main SQLBot question stream must go through DataEase backend.
 * Build and run with TRUSTED_ANSWER_SQLBOT_DIRECT_GUARD=1.
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

const assertNotMatch = (source: string, pattern: RegExp, label: string) => {
  if (pattern.test(source)) fail(`${label}: expected source not to match ${pattern}`)
}

const extractFunctionSource = (source: string, functionName: string) => {
  const declarationPattern = new RegExp(`export const ${functionName} = async`)
  const declarationMatch = declarationPattern.exec(source)
  if (!declarationMatch) fail(`${functionName}: declaration not found`)

  const bodyStart = source.indexOf('{', declarationMatch.index)
  if (bodyStart < 0) fail(`${functionName}: body not found`)

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(declarationMatch.index, index + 1)
    }
  }
  fail(`${functionName}: body end not found`)
}

const sqlbotDirectSource = readSource('src/views/sqlbot/sqlbotDirect.ts')
const streamQuestionSource = extractFunctionSource(sqlbotDirectSource, 'streamSQLBotQuestion')

const contractCases: ContractCase[] = [
  {
    name: 'main question stream delegates to trusted answer backend wrapper',
    run() {
      assertMatch(sqlbotDirectSource, /from '@\/api\/aiTrustedAnswer'/, 'trusted answer import')
      assertMatch(
        streamQuestionSource,
        /streamTrustedAnswerQuestion\(context, payload, options\)/,
        'trusted answer delegation'
      )
      assertNotMatch(
        streamQuestionSource,
        /fetchSqlBotWithFallback|\/chat\/question|buildAssistantHeaders/,
        'question stream direct SQLBot calls'
      )
    }
  }
]

export const runTrustedAnswerSqlbotDirectGuard = () => {
  contractCases.forEach(contractCase => contractCase.run())
}

const shouldRun =
  typeof process !== 'undefined' && process?.env?.TRUSTED_ANSWER_SQLBOT_DIRECT_GUARD === '1'

if (shouldRun) {
  try {
    runTrustedAnswerSqlbotDirectGuard()
    console.log(
      `[trusted-answer-sqlbot-direct-guard] ${contractCases.length} contract checks passed`
    )
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    if (typeof process !== 'undefined') {
      process.exitCode = 1
    }
  }
}
