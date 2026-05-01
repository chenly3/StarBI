/**
 * Executable source-level contract for the system permission menu page.
 * The permission-management package has no dedicated unit-test runner, so this
 * keeps the UX regression covered by checking the source contract directly.
 */

type ContractCase = {
  name: string
  run: () => void
}

import fs from 'node:fs'
import path from 'node:path'

declare const process:
  | {
      env?: Record<string, string | undefined>
      exitCode?: number
    }
  | undefined

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

const menuPermissionPanelSource = readSource(
  '../../de-xpack/permission-management/src/menu/system/permission/MenuPermissionPanel.vue'
)

const contractCases: ContractCase[] = [
  {
    name: 'menu permission page defaults to full menu tree instead of one top-level group',
    run() {
      assertMatch(
        menuPermissionPanelSource,
        /selectedMenuGroupId\s*=\s*ref<number \| null>\(null\)/,
        'full menu default selection'
      )
      assertMatch(
        menuPermissionPanelSource,
        /selectedMenuRows/,
        'separate menu group filter contract'
      )
      assertMatch(menuPermissionPanelSource, /全部菜单/, 'all menu entry copy')
      assertMatch(
        menuPermissionPanelSource,
        /@click="selectMenuGroup\(null\)"/,
        'all menu entry click contract'
      )
    }
  }
]

export const runPermissionMenuUiContracts = async () => {
  for (const contractCase of contractCases) {
    contractCase.run()
  }
}

const shouldRunContracts =
  typeof process !== 'undefined' && process?.env?.PERMISSION_MENU_UI_CONTRACTS === '1'

if (shouldRunContracts) {
  runPermissionMenuUiContracts()
    .then(() => {
      console.log(`[permission-menu-ui] ${contractCases.length} contract checks passed`)
    })
    .catch(error => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      console.error(message)
      if (typeof process !== 'undefined') {
        process.exitCode = 1
      }
    })
}
