import type { ChatPlugin, Message } from '@open-chat/chat-core'

/**
 * 日志插件选项
 */
export interface LoggerPluginOptions {
  /** 是否打印发送的消息 */
  logSend?: boolean
  /** 是否打印接收的消息 */
  logReceive?: boolean
  /** 自定义日志函数 */
  logger?: (type: string, data: any) => void
}

/**
 * 日志插件
 */
export function createLoggerPlugin(options: LoggerPluginOptions = {}): ChatPlugin {
  const {
    logSend = true,
    logReceive = true,
    logger = console.log
  } = options

  return {
    name: 'logger',

    beforeSend(message: Message): Message {
      if (logSend) {
        logger('[LoggerPlugin] 发送消息:', {
          id: message.id,
          type: message.type,
          content: message.content,
          senderId: message.senderId
        })
      }
      return message
    },

    afterReceive(message: Message): Message {
      if (logReceive) {
        logger('[LoggerPlugin] 接收消息:', {
          id: message.id,
          type: message.type,
          content: message.content,
          senderId: message.senderId
        })
      }
      return message
    }
  }
}

export default createLoggerPlugin
