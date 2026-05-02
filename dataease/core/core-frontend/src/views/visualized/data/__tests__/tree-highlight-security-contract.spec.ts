/**
 * Source security contract for visualized data tree search highlighting.
 * Run with VISUALIZED_DATA_TREE_HIGHLIGHT_SECURITY_CONTRACTS=1 after TypeScript compilation.
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

const datasetGroupSource = readSource(
  'src/views/visualized/data/dataset/form/CreatDsGroup.vue'
)
const datasourceGroupSource = readSource(
  'src/views/visualized/data/datasource/form/CreatDsGroup.vue'
)

const assertSafeTreeHighlight = (source: string, label: string) => {
  assertNotMatch(source, /\.innerHTML\s*=/, `${label} tree search highlight`)
  assertMatch(source, /document\.createTextNode/, `${label} tree search text node escaping`)
  assertMatch(source, /document\.createElement\('span'\)/, `${label} tree search span node`)
  assertMatch(source, /className = 'highLight'/, `${label} tree search highlight class`)
  assertMatch(source, /appendChild/, `${label} tree search DOM composition`)
}

const assertDatasourceTreeSelectFilterReturnsMatch = (source: string) => {
  assertMatch(
    source,
    /const filterMethod = \(value, data\) => \{[\s\S]*if \(!data\) return false[\s\S]*return data\.name\.includes\(value\)[\s\S]*\}/,
    'datasource tree-select filter returns match result'
  )
}

const contractCases: ContractCase[] = [
  {
    name: 'dataset tree highlight does not inject resource names as HTML',
    run() {
      assertSafeTreeHighlight(datasetGroupSource, 'dataset')
    }
  },
  {
    name: 'datasource tree highlight does not inject resource names as HTML',
    run() {
      assertSafeTreeHighlight(datasourceGroupSource, 'datasource')
    }
  },
  {
    name: 'datasource tree-select filter returns matching datasource folders',
    run() {
      assertDatasourceTreeSelectFilterReturnsMatch(datasourceGroupSource)
    }
  }
]

export const runVisualizedDataTreeHighlightSecurityContracts = async () => {
  for (const contractCase of contractCases) {
    contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' &&
  process?.env?.VISUALIZED_DATA_TREE_HIGHLIGHT_SECURITY_CONTRACTS === '1'

if (shouldRunContracts) {
  runVisualizedDataTreeHighlightSecurityContracts()
    .then(() => {
      console.log(`[visualized-data-tree-highlight-security] ${contractCases.length} checks passed`)
    })
    .catch(error => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      console.error(message)
      if (typeof process !== 'undefined') {
        process.exitCode = 1
      }
    })
}
