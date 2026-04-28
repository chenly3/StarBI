import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourcePath =
  '/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/components/dashboard/DbToolbar.vue'

describe('DbToolbar sqlbot insert entry', () => {
  it('should not expose dashboard topbar sqlbot entries', async () => {
    const source = await readFile(sourcePath, 'utf-8')
    expect(source).not.toContain('插入问数图表')
    expect(source).not.toContain("t('starbi.dashboard_query_entry')")
  })
})
