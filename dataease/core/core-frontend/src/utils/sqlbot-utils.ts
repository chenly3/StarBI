export const highlightKeyword = (text: string, keyword: string) => {
  if (!keyword || !text) return text
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(
    regex,
    '<em style="color: var(--ed-color-primary);font-style:normal;">$1</em>'
  )
}

export const isStarBIPageMode = (pageMode?: string): boolean => {
  return pageMode === 'starbi'
}
