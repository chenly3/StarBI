<script setup lang="ts">
import { computed } from 'vue'
import DOMPurify from 'dompurify'

const props = withDefaults(
  defineProps<{
    message?: string
  }>(),
  {
    message: ''
  }
)

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const renderInline = (value: string) => {
  const tokens: string[] = []
  let nextValue = escapeHtml(value)

  nextValue = nextValue.replace(/`([^`]+)`/g, (_, code) => {
    const placeholder = `@@STARBI-CODE-${tokens.length}@@`
    tokens.push(`<code>${code}</code>`)
    return placeholder
  })

  nextValue = nextValue.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, href) => {
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
  })

  nextValue = nextValue.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  nextValue = nextValue.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  nextValue = nextValue.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  tokens.forEach((token, index) => {
    nextValue = nextValue.replace(`@@STARBI-CODE-${index}@@`, token)
  })

  return nextValue
}

const renderMarkdown = (source: string) => {
  const normalized = String(source || '')
    .replace(/\r\n?/g, '\n')
    .trim()
  if (!normalized) {
    return ''
  }

  const lines = normalized.split('\n')
  const blocks: string[] = []
  let index = 0

  const isTableSeparator = (value?: string) => {
    return Boolean(value && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(value))
  }

  while (index < lines.length) {
    const currentLine = lines[index]
    const trimmedLine = currentLine.trim()

    if (!trimmedLine) {
      index += 1
      continue
    }

    if (trimmedLine.startsWith('```')) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) {
        index += 1
      }
      blocks.push(
        `<pre class="starbi-md-code"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
      )
      continue
    }

    if (/^\s*#{1,6}\s+/.test(currentLine)) {
      const level = Math.min(trimmedLine.match(/^#+/)?.[0].length || 1, 6)
      const content = trimmedLine.replace(/^#{1,6}\s+/, '')
      blocks.push(`<h${level}>${renderInline(content)}</h${level}>`)
      index += 1
      continue
    }

    if (/^\s*[-*+]\s+/.test(currentLine)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*+]\s+/, ''))
        index += 1
      }
      blocks.push(`<ul>${items.map(item => `<li>${renderInline(item)}</li>`).join('')}</ul>`)
      continue
    }

    if (/^\s*\d+\.\s+/.test(currentLine)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ''))
        index += 1
      }
      blocks.push(`<ol>${items.map(item => `<li>${renderInline(item)}</li>`).join('')}</ol>`)
      continue
    }

    if (trimmedLine.startsWith('>')) {
      const quoteLines: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''))
        index += 1
      }
      blocks.push(
        `<blockquote>${quoteLines.map(item => renderInline(item)).join('<br />')}</blockquote>`
      )
      continue
    }

    if (currentLine.includes('|') && isTableSeparator(lines[index + 1])) {
      const headerCells = currentLine
        .split('|')
        .map(cell => cell.trim())
        .filter(Boolean)
      index += 2
      const rows: string[][] = []
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(
          lines[index]
            .split('|')
            .map(cell => cell.trim())
            .filter(Boolean)
        )
        index += 1
      }

      blocks.push(
        `<div class="starbi-md-table-wrap"><table class="starbi-md-table"><thead><tr>${headerCells
          .map(cell => `<th>${renderInline(cell)}</th>`)
          .join('')}</tr></thead><tbody>${rows
          .map(row => `<tr>${row.map(cell => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      )
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const line = lines[index]
      const trimmed = line.trim()
      if (
        !trimmed ||
        trimmed.startsWith('```') ||
        /^\s*#{1,6}\s+/.test(line) ||
        /^\s*[-*+]\s+/.test(line) ||
        /^\s*\d+\.\s+/.test(line) ||
        trimmed.startsWith('>') ||
        (line.includes('|') && isTableSeparator(lines[index + 1]))
      ) {
        break
      }
      paragraphLines.push(trimmed)
      index += 1
    }

    if (paragraphLines.length) {
      blocks.push(`<p>${paragraphLines.map(item => renderInline(item)).join('<br />')}</p>`)
      continue
    }

    index += 1
  }

  return DOMPurify.sanitize(blocks.join(''), {
    USE_PROFILES: { html: true }
  })
}

const renderedHtml = computed(() => renderMarkdown(props.message))
</script>

<template>
  <div class="starbi-markdown" v-html="renderedHtml"></div>
</template>

<style scoped lang="less">
.starbi-markdown {
  color: #34415f;
  font-size: 14px;
  line-height: 1.9;
}

.starbi-markdown :deep(h1),
.starbi-markdown :deep(h2),
.starbi-markdown :deep(h3),
.starbi-markdown :deep(h4) {
  margin: 0 0 12px;
  color: #1f2d53;
  line-height: 1.45;
  font-weight: 700;
}

.starbi-markdown :deep(h1) {
  font-size: 22px;
}

.starbi-markdown :deep(h2) {
  font-size: 18px;
}

.starbi-markdown :deep(h3),
.starbi-markdown :deep(h4) {
  font-size: 16px;
}

.starbi-markdown :deep(p),
.starbi-markdown :deep(blockquote),
.starbi-markdown :deep(ul),
.starbi-markdown :deep(ol) {
  margin: 0;
}

.starbi-markdown :deep(p + p),
.starbi-markdown :deep(p + ul),
.starbi-markdown :deep(p + ol),
.starbi-markdown :deep(ul + p),
.starbi-markdown :deep(ol + p),
.starbi-markdown :deep(blockquote + p),
.starbi-markdown :deep(p + blockquote),
.starbi-markdown :deep(.starbi-md-table-wrap),
.starbi-markdown :deep(pre) {
  margin-top: 12px;
}

.starbi-markdown :deep(ul),
.starbi-markdown :deep(ol) {
  padding-left: 20px;
}

.starbi-markdown :deep(li + li) {
  margin-top: 6px;
}

.starbi-markdown :deep(strong) {
  color: #1c2d5a;
  font-weight: 700;
}

.starbi-markdown :deep(code) {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #2d61e6;
  background: rgba(43, 103, 255, 0.08);
}

.starbi-markdown :deep(.starbi-md-code) {
  margin: 0;
  overflow: auto;
  padding: 14px 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #111a32 0%, #162346 100%);
}

.starbi-markdown :deep(.starbi-md-code code) {
  display: block;
  padding: 0;
  color: #dbe7ff;
  font-size: 13px;
  line-height: 1.75;
  background: transparent;
  font-family: Monaco, Menlo, Consolas, 'Liberation Mono', monospace;
}

.starbi-markdown :deep(blockquote) {
  padding: 12px 14px;
  border-radius: 16px;
  border-left: 4px solid rgba(43, 103, 255, 0.48);
  background: rgba(243, 247, 255, 0.96);
  color: #52627f;
}

.starbi-markdown :deep(a) {
  color: #2a67ff;
  text-decoration: none;
}

.starbi-markdown :deep(.starbi-md-table-wrap) {
  overflow-x: auto;
}

.starbi-markdown :deep(.starbi-md-table) {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  overflow: hidden;
  border-radius: 16px;
  box-shadow: inset 0 0 0 1px rgba(145, 179, 255, 0.18);
}

.starbi-markdown :deep(.starbi-md-table th),
.starbi-markdown :deep(.starbi-md-table td) {
  padding: 12px 14px;
  text-align: left;
  font-size: 13px;
  line-height: 1.7;
  border-bottom: 1px solid rgba(145, 179, 255, 0.14);
}

.starbi-markdown :deep(.starbi-md-table th) {
  color: #21418d;
  background: rgba(236, 244, 255, 0.92);
  font-weight: 700;
}

.starbi-markdown :deep(.starbi-md-table td) {
  color: #435271;
  background: rgba(255, 255, 255, 0.92);
}
</style>
