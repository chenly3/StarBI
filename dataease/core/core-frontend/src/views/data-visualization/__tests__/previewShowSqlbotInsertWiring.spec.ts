import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourcePath =
  '/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/data-visualization/PreviewShow.vue'

describe('PreviewShow sqlbot insert wiring', () => {
  it('should mount the reverse insert drawer and current-canvas insert handlers', async () => {
    const source = await readFile(sourcePath, 'utf-8')
    expect(source).toContain('SqlbotInsertDrawer')
    expect(source).toContain('@openSqlbotInsert="openSqlbotInsert"')
    expect(source).toContain('insertAIQueryChartIntoCanvas')
    expect(source).toContain("insertSqlbotChartIntoCurrentCanvas('snapshot'")
    expect(source).toContain("insertSqlbotChartIntoCurrentCanvas('resource'")
  })
})
