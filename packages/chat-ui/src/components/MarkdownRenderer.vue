<template>
  <div
    class="markdown-renderer"
    :class="{ 'markdown-code-dark': theme === 'dark' }"
    v-html="renderedHtml"
  ></div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'

interface Props {
  content: string
  theme?: 'light' | 'dark'
  showChart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'light',
  showChart: true,
})

const renderedHtml = ref('')

// 防抖函数
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = window.setTimeout(() => func(...args), wait)
  }
}

// 渲染 Markdown
const renderMarkdown = async () => {
  if (!props.content) {
    renderedHtml.value = ''
    return
  }

  try {
    // 使用 marked 渲染 Markdown
    const html = await marked(props.content, {
      highlight: (code, lang) => {
        // 代码高亮
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value
          } catch (error) {
            console.error('Code highlight error:', error)
          }
        }
        return hljs.highlightAuto(code).value
      },
      breaks: true, // 支持换行
      gfm: true, // 支持 GitHub Flavored Markdown
    })

    renderedHtml.value = html

    // 延迟处理图表和代码块样式
    setTimeout(() => {
      processCodeBlocks()
      if (props.showChart) {
        processCharts()
      }
      processLinks()
    }, 100)
  } catch (error) {
    console.error('Markdown render error:', error)
    renderedHtml.value = `<p class="error">Markdown rendering error: ${error}</p>`
  }
}

// 处理代码块
const processCodeBlocks = () => {
  const codeBlocks = document.querySelectorAll('.markdown-renderer pre code')
  codeBlocks.forEach((block) => {
    // 添加复制按钮
    const parent = block.parentElement
    if (parent && !parent.querySelector('.copy-btn')) {
      const copyBtn = document.createElement('button')
      copyBtn.className = 'copy-btn'
      copyBtn.innerHTML = '📋'
      copyBtn.title = '复制代码'
      copyBtn.onclick = () => {
        const text = block.innerText
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.innerHTML = '✓'
          setTimeout(() => {
            copyBtn.innerHTML = '📋'
          }, 2000)
        })
      }
      parent.insertBefore(copyBtn, parent.firstChild)
    }
  })
}

// 处理图表（Mermaid、PlantUML 等）
const processCharts = () => {
  const chartBlocks = document.querySelectorAll(
    '.markdown-renderer pre code.language-mermaid, .markdown-renderer pre code.language-plantuml'
  )

  chartBlocks.forEach((block) => {
    const parent = block.parentElement
    if (!parent) return

    const chartType = block.className.includes('mermaid') ? 'mermaid' : 'plantuml'
    const chartCode = block.innerText

    // 创建图表容器
    const chartContainer = document.createElement('div')
    chartContainer.className = `chart-container chart-${chartType}`
    chartContainer.dataset.code = chartCode

    // 替换代码块为图表容器
    if (parent.parentElement) {
      parent.parentElement.insertBefore(chartContainer, parent)
      parent.remove()
    }
  })

  // 渲染 Mermaid 图表
  if (window.mermaid) {
    window.mermaid
      .run({
        nodes: document.querySelectorAll('.chart-mermaid'),
        theme: props.theme === 'dark' ? 'dark' : 'default',
      })
      .catch((error) => {
        console.error('Mermaid render error:', error)
      })
  }
}

// 处理链接
const processLinks = () => {
  const links = document.querySelectorAll('.markdown-renderer a')
  links.forEach((link) => {
    // 新窗口打开外部链接
    const href = link.getAttribute('href')
    if (href && href.startsWith('http')) {
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
  })
}

// 监听内容变化
watch(() => props.content, () => {
  renderMarkdown()
})

// 组件挂载时渲染
onMounted(() => {
  renderMarkdown()
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理定时器
  if (window.mermaid) {
    window.mermaid.destroy()
  }
})

// 监听主题变化
watch(() => props.theme, (newTheme) => {
  if (window.mermaid) {
    window.mermaid.initialize({
      theme: newTheme === 'dark' ? 'dark' : 'default',
    })
    renderMarkdown()
  }
})

// 使用 Vue 的 watch
import { watch } from 'vue'
</script>

<style scoped>
.markdown-renderer {
  line-height: 1.6;
  word-wrap: break-word;
}

.markdown-renderer :deep(*) {
  box-sizing: border-box;
}

/* 标题 */
.markdown-renderer :deep(h1),
.markdown-renderer :deep(h2),
.markdown-renderer :deep(h3),
.markdown-renderer :deep(h4),
.markdown-renderer :deep(h5),
.markdown-renderer :deep(h6) {
  margin: 1em 0 0.5em;
  font-weight: 600;
  line-height: 1.2;
}

.markdown-renderer :deep(h1) {
  font-size: 1.8em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-renderer :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-renderer :deep(h3) {
  font-size: 1.25em;
}

.markdown-renderer :deep(h4) {
  font-size: 1em;
}

.markdown-renderer :deep(h5) {
  font-size: 0.875em;
}

.markdown-renderer :deep(h6) {
  font-size: 0.85em;
  color: #666;
}

/* 段落 */
.markdown-renderer :deep(p) {
  margin: 0.5em 0;
}

/* 链接 */
.markdown-renderer :deep(a) {
  color: #1a73e8;
  text-decoration: none;
}

.markdown-renderer :deep(a:hover) {
  text-decoration: underline;
}

/* 列表 */
.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  margin: 0.5em 0;
  padding-left: 2em;
}

.markdown-renderer :deep(li) {
  margin: 0.25em 0;
}

/* 引用 */
.markdown-renderer :deep(blockquote) {
  margin: 0.5em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #1a73e8;
  background: #f5f5f5;
  border-radius: 0 4px 4px 0;
}

.markdown-renderer :deep(blockquote) :deep(p) {
  margin: 0;
}

/* 代码 */
.markdown-renderer :deep(code) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  color: #d63384;
}

.markdown-renderer :deep(pre) {
  margin: 0.5em 0;
  padding: 1em;
  background: #1e1e1e;
  border-radius: 6px;
  overflow-x: auto;
  position: relative;
}

.markdown-renderer :deep(pre) :deep(code) {
  background: transparent;
  padding: 0;
  color: #d4d4d4;
}

/* 代码复制按钮 */
.markdown-renderer :deep(.copy-btn) {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #fff;
  transition: background 0.2s;
}

.markdown-renderer :deep(.copy-btn:hover) {
  background: rgba(255, 255, 255, 0.2);
}

/* 表格 */
.markdown-renderer :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5em 0;
  font-size: 0.9em;
}

.markdown-renderer :deep(th),
.markdown-renderer :deep(td) {
  padding: 0.5em 0.75em;
  border: 1px solid #ddd;
  text-align: left;
}

.markdown-renderer :deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}

.markdown-renderer :deep(tr:nth-child(even)) {
  background: #fafafa;
}

/* 图片 */
.markdown-renderer :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 0.5em 0;
}

/* 分割线 */
.markdown-renderer :deep(hr) {
  border: none;
  border-top: 1px solid #eee;
  margin: 1em 0;
}

/* 任务列表 */
.markdown-renderer :deep(.task-list) {
  list-style: none;
  padding-left: 0;
}

.markdown-renderer :deep(.task-list-item) {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.markdown-renderer :deep(.task-list-item input[type='checkbox']) {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* 状态标记 */
.markdown-renderer :deep(.status) {
  display: inline-block;
  padding: 0.2em 0.5em;
  border-radius: 3px;
  font-size: 0.8em;
  font-weight: 500;
}

.markdown-renderer :deep(.status-success) {
  background: #d4edda;
  color: #155724;
}

.markdown-renderer :deep(.status-warning) {
  background: #fff3cd;
  color: #856404;
}

.markdown-renderer :deep(.status-error) {
  background: #f8d7da;
  color: #721c24;
}

/* 暗色主题 */
.markdown-renderer.markdown-code-dark :deep(pre) {
  background: #1e1e1e;
}

.markdown-renderer.markdown-code-dark :deep(code) {
  background: #2d2d2d;
  color: #ce9178;
}

.markdown-renderer.markdown-code-dark :deep(.copy-btn) {
  background: rgba(0, 0, 0, 0.3);
}

.markdown-renderer.markdown-code-dark :deep(blockquote) {
  background: #2d2d2d;
  border-left-color: #4a90e2;
}

.markdown-renderer.markdown-code-dark :deep(th) {
  background: #2d2d2d;
  color: #d4d4d4;
}

.markdown-renderer.markdown-code-dark :deep(tr:nth-child(even)) {
  background: #252526;
}

.markdown-renderer.markdown-code-dark :deep(img) {
  filter: brightness(0.9);
}

/* 图表容器 */
.markdown-renderer :deep(.chart-container) {
  margin: 1em 0;
  padding: 1em;
  background: #f5f5f5;
  border-radius: 6px;
  text-align: center;
}

.markdown-renderer.markdown-code-dark :deep(.chart-container) {
  background: #2d2d2d;
}

.markdown-renderer :deep(.chart-container svg) {
  max-width: 100%;
  height: auto;
}

/* 错误提示 */
.markdown-renderer :deep(.error) {
  color: #dc3545;
  background: #f8d7da;
  padding: 1em;
  border-radius: 4px;
}
</style>
