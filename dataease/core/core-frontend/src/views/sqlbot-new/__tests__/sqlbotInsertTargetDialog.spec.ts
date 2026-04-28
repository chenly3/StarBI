import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourcePath =
  '/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/components/SqlbotInsertTargetDialog.vue'

describe('SqlbotInsertTargetDialog', () => {
  it('should render target list shell', async () => {
    const source = await readFile(sourcePath, 'utf-8')
    expect(source).toContain('插入目标')
    expect(source).toContain('sqlbot-insert-target-list')
    expect(source).toContain("emit('choose'")
  })
})
