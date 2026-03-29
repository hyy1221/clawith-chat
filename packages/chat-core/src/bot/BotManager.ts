import { Bot, Message } from '../types'

/**
 * 机器人管理器
 */
export class BotManager {
  private bots: Map<string, Bot> = new Map()

  /**
   * 注册机器人
   */
  register(bot: Bot): void {
    this.bots.set(bot.id, bot)
    console.log(`[BotManager] Bot "${bot.name}" registered`)
  }

  /**
   * 注销机器人
   */
  unregister(botId: string): boolean {
    return this.bots.delete(botId)
  }

  /**
   * 获取所有机器人
   */
  getAllBots(): Bot[] {
    return Array.from(this.bots.values())
  }

  /**
   * 获取机器人
   */
  getBot(botId: string): Bot | undefined {
    return this.bots.get(botId)
  }

  /**
   * 根据名称获取机器人
   */
  getBotByName(name: string): Bot | undefined {
    for (const bot of this.bots.values()) {
      if (bot.name === name) {
        return bot
      }
    }
    return undefined
  }

  /**
   * 触发机器人
   */
  async trigger(message: Message): Promise<Message | null> {
    const content = message.content
    if (!content || typeof content !== 'object' || !('text' in content)) {
      return null
    }

    const text = content.text as string

    // 检查是否 @ 了某个机器人
    for (const bot of this.bots.values()) {
      const mention = `@${bot.name}`
      if (text.includes(mention)) {
        try {
          const response = await bot.onMessage(message)
          return response
        } catch (error) {
          console.error(`[BotManager] Bot "${bot.name}" error:`, error)
        }
      }
    }

    return null
  }

  /**
   * 触发所有相关机器人（广播模式）
   */
  async triggerAll(message: Message): Promise<Message[]> {
    const responses: Message[] = []
    const content = message.content
    if (!content || typeof content !== 'object' || !('text' in content)) {
      return responses
    }

    const text = content.text as string

    for (const bot of this.bots.values()) {
      const mention = `@${bot.name}`
      if (text.includes(mention)) {
        try {
          const response = await bot.onMessage(message)
          if (response) {
            responses.push(response)
          }
        } catch (error) {
          console.error(`[BotManager] Bot "${bot.name}" error:`, error)
        }
      }
    }

    return responses
  }

  /**
   * 清理
   */
  clear(): void {
    this.bots.clear()
  }
}

export default BotManager
