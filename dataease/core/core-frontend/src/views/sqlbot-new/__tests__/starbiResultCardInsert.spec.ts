import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const resultCardPath =
  '/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/StarbiResultCard.vue'
const helperPath =
  '/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/sqlbotChartInsert.ts'

describe('StarbiResultCard insert entry', () => {
  it('should expose insert action event contract and helper shell', async () => {
    const [resultCardSource, helperSource] = await Promise.all([
      readFile(resultCardPath, 'utf-8'),
      readFile(helperPath, 'utf-8')
    ])
    expect(resultCardSource).toContain('insert-dashboard')
    expect(resultCardSource).toContain('插入仪表板/大屏')
    expect(helperSource).toContain('export const canAttemptSqlbotChartInsert')
    expect(helperSource).toContain('buildSqlbotChartInsertRequest')
  })
})
