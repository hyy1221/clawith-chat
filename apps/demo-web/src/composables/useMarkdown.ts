/**
 * Markdown renderer composable.
 * Lightweight: supports headings, bold, italic, code, links, lists, blockquotes, tables, code blocks.
 */

export function useMarkdown() {
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function renderInline(text: string): string {
    return text
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="md-link">$1</a>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
  }

  function renderMarkdown(md: string): string {
    if (!md) return ''
    const lines = md.split('\n')
    let html = ''
    let inCodeBlock = false
    let codeLines: string[] = []
    let inList: 'ul' | 'ol' | null = null
    let inBlockquote = false
    let inTable = false

    const flushList = () => {
      if (inList) { html += inList === 'ul' ? '</ul>' : '</ol>'; inList = null }
    }
    const flushBlockquote = () => {
      if (inBlockquote) { html += '</blockquote>'; inBlockquote = false }
    }
    const flushTable = () => {
      if (inTable) { html += '</tbody></table>'; inTable = false }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Code block
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          flushList(); flushBlockquote(); flushTable()
          inCodeBlock = true
          codeLines = []
        } else {
          html += `<pre class="code-block"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
          inCodeBlock = false
          codeLines = []
        }
        continue
      }
      if (inCodeBlock) { codeLines.push(line); continue }

      // Blank line
      if (line.trim() === '') {
        flushList(); flushBlockquote(); flushTable()
        continue
      }

      // Headings
      const hMatch = line.match(/^(#{1,6})\s+(.*)/)
      if (hMatch) {
        flushList(); flushBlockquote(); flushTable()
        const level = hMatch[1].length
        html += `<h${level} class="md-h${level}">${renderInline(hMatch[2])}</h${level}>`
        continue
      }

      // Horizontal rule
      if (/^[-*_]{3,}$/.test(line.trim())) {
        flushList(); flushBlockquote(); flushTable()
        html += '<hr class="md-hr">'
        continue
      }

      // Blockquote
      if (line.startsWith('> ')) {
        flushList(); flushTable()
        if (!inBlockquote) {
          html += '<blockquote class="md-blockquote">'
          inBlockquote = true
        }
        html += `<div>${renderInline(line.slice(2))}</div>`
        continue
      } else if (inBlockquote) {
        flushBlockquote()
      }

      // Tables
      if (line.includes('|')) {
        flushList(); flushBlockquote()
        const cols = line.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)
        if (cols.every(c => /^[-:]+$/.test(c))) continue
        if (!inTable) {
          html += '<table class="md-table"><thead><tr>' + cols.map(c => `<th>${renderInline(c)}</th>`).join('') + '</tr></thead><tbody>'
          inTable = true
        } else {
          html += '<tr>' + cols.map(c => `<td>${renderInline(c)}</td>`).join('') + '</tr>'
        }
        continue
      } else if (inTable) {
        flushTable()
      }

      // Unordered list
      const ulMatch = line.match(/^(\s*)[*\-+]\s+(.*)/)
      if (ulMatch) {
        flushBlockquote(); flushTable()
        if (inList !== 'ul') { if (inList) flushList(); html += '<ul class="md-ul">'; inList = 'ul' }
        html += `<li>${renderInline(ulMatch[2])}</li>`
        continue
      }

      // Ordered list
      const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/)
      if (olMatch) {
        flushBlockquote(); flushTable()
        if (inList !== 'ol') { if (inList) flushList(); html += '<ol class="md-ol">'; inList = 'ol' }
        html += `<li>${renderInline(olMatch[2])}</li>`
        continue
      }

      // Regular paragraph
      flushList(); flushBlockquote(); flushTable()
      html += `<p class="md-p">${renderInline(line)}</p>`
    }

    flushList(); flushBlockquote(); flushTable()
    if (inCodeBlock) {
      html += `<pre class="code-block"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
    }

    return html
  }

  return { renderMarkdown, renderInline, escapeHtml }
}
