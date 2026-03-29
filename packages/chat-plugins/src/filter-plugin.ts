import type { ChatPlugin, Message, ChatEngine } from '@open-chat/chat-core'

/**
 * 敏感词过滤插件配置
 */
export interface FilterPluginOptions {
  /** 敏感词列表 */
  sensitiveWords?: string[]
  /** 是否启用替换 */
  replace?: boolean
  /** 替换字符 */
  replaceChar?: string
  /** 自定义错误消息 */
  errorMessage?: string
}

/**
 * 敏感词过滤插件
 */
export function createFilterPlugin(options: FilterPluginOptions = {}): ChatPlugin {
  const {
    sensitiveWords = [],
    replace = false,
    replaceChar = '*',
    errorMessage = '消息包含敏感词，无法发送'
  } = options

  return {
    name: 'filter',

    install(engine: ChatEngine) {
      console.log('[FilterPlugin] Installed')
    },

    beforeSend(message: Message): Message {
      const content = message.content
      if (!content || typeof content !== 'object' || !('text' in content)) {
        return message
      }

      const text = content.text as string
      const words = sensitiveWords

      // 检查是否包含敏感词
      const foundWord = words.find(word => text.includes(word))

      if (foundWord) {
        if (replace) {
          // 替换敏感词
          let filteredText = text
          words.forEach(word => {
            const regex = new RegExp(word, 'g')
            filteredText = filteredText.replace(regex, replaceChar.repeat(word.length))
          })

          return {
            ...message,
            content: {
              ...content,
              text: filteredText
            }
          }
        } else {
          // 抛出错误阻止发送
          throw new Error(errorMessage)
        }
      }

      return message
    },

    destroy() {
      console.log('[FilterPlugin] Destroyed')
    }
  }
}

/**
 * 创建敏感词列表
 */
export function createSensitiveWordsList(): string[] {
  return [
    '敏感词1',
    '敏感词2',
    '敏感词3'
  ]
}

export default createFilterPlugin
