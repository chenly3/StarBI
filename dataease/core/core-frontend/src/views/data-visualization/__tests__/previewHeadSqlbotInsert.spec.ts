import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourcePath =
  '/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/data-visualization/PreviewHead.vue'

describe('PreviewHead sqlbot insert entry', () => {
  it('should expose insert sqlbot chart action', async () => {
    const source = await readFile(sourcePath, 'utf-8')
    expect(source).toContain('插入问数图表')
    expect(source).toContain('openSqlbotInsert')
  })
})
