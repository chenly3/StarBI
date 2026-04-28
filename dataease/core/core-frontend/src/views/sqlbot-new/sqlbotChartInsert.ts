export const canAttemptSqlbotChartInsert = (record: Record<string, any>) => {
  return Boolean(record?.finish && !record?.error && record?.chart && record?.data)
}

export const buildSqlbotChartInsertRequest = (
  record: Record<string, any>,
  target: { id: string | number; canvasType: string },
  extra: { sourceInsights?: unknown } = {}
) => {
  const executionContext = record?.executionContext || {}
  return {
    sourceType: 'record',
    targetCanvasType: target.canvasType,
    targetCanvasId: target.id,
    title: String(record?.question || record?.chartAnswer || 'SQLBot 图表'),
    question: String(record?.question || ''),
    sqlText: String(record?.sql || ''),
    chartConfig:
      typeof record?.chart === 'string' ? record.chart : JSON.stringify(record?.chart || {}),
    interpretation: String(record?.analysis || record?.chartAnswer || ''),
    sourceKind: String(executionContext?.queryMode || ''),
    querySourceId: String(executionContext?.sourceId || ''),
    querySourceIds: Array.isArray(executionContext?.sourceIds)
      ? JSON.stringify(executionContext.sourceIds)
      : '',
    combinationId: String(executionContext?.combinationId || ''),
    combinationName: String(executionContext?.combinationName || ''),
    datasourceId: String(executionContext?.datasourceId || ''),
    sourceInsights: extra?.sourceInsights ? JSON.stringify(extra.sourceInsights) : '',
    themeId: String(executionContext?.themeId || ''),
    themeName: String(executionContext?.themeName || '')
  }
}
