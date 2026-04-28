import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourcePath =
  '/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/dashboard/index.vue'

describe('dashboard sqlbot insert wiring', () => {
  it('should mount the reverse insert drawer and open handler', async () => {
    const source = await readFile(sourcePath, 'utf-8')
    expect(source).toContain('SqlbotInsertDrawer')
    expect(source).toContain('@openSqlbotInsert="openSqlbotInsert"')
    expect(source).toContain('listAIQueryRecentResults')
    expect(source).toContain('listAIQueryChartResources')
    expect(source).toContain('insertAIQueryChartIntoCanvas')
  })
})
