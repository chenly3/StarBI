import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourcePath =
  '/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/api/aiQueryChartResource.ts'

describe('aiQueryChartResource api', () => {
  it('should expose query chart resource methods', async () => {
    const source = await readFile(sourcePath, 'utf-8')
    expect(source).toContain('export const validateAIQueryChartInsert')
    expect(source).toContain('export const listAIQueryRecentResults')
    expect(source).toContain('export const listAIQueryChartResources')
    expect(source).toContain('export const listAIQueryInsertTargets')
    expect(source).toContain('export const insertAIQueryChartIntoCanvas')
  })
})
