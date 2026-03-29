import { Message, MessageType } from '../types'

/**
 * 消息管理器
 */
export class MessageManager {
  private messages: Map<string, Message[]> = new Map()
  private currentGroupId: string | null = null
  private currentSessionId: string | null = null

  /**
   * 设置当前群组
   */
  setCurrentGroup(groupId: string): void {
    this.currentGroupId = groupId
    this.ensureBucket(groupId, this.currentSessionId)
  }

  /**
   * 获取当前群组 ID
   */
  getCurrentGroupId(): string | null {
    return this.currentGroupId
  }

  /**
   * 设置当前会话
   */
  setCurrentSession(sessionId: string | null): void {
    this.currentSessionId = sessionId
    if (this.currentGroupId) {
      this.ensureBucket(this.currentGroupId, sessionId)
    }
  }

  /**
   * 获取当前会话 ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  /**
   * 添加消息
   */
  addMessage(msg: Message): void {
    const groupId = msg.groupId || this.currentGroupId
    if (!groupId) return

    const bucketKey = this.getBucketKey(groupId, msg.sessionId ?? this.currentSessionId)
    const groupMessages = this.messages.get(bucketKey) || []
    groupMessages.push(msg)
    this.messages.set(bucketKey, groupMessages)
  }

  /**
   * 获取当前群组的消息
   */
  getMessages(): Message[] {
    if (!this.currentGroupId) return []
    return this.messages.get(this.getBucketKey(this.currentGroupId, this.currentSessionId)) || []
  }

  /**
   * 获取指定群组的消息
   */
  getMessagesByGroup(groupId: string, sessionId?: string | null): Message[] {
    if (sessionId !== undefined) {
      return this.messages.get(this.getBucketKey(groupId, sessionId)) || []
    }

    const prefix = `${groupId}::`
    return Array.from(this.messages.entries())
      .filter(([key]) => key.startsWith(prefix))
      .flatMap(([, value]) => value)
  }

  /**
   * 根据 ID 获取消息
   */
  getMessageById(messageId: string): Message | undefined {
    for (const messages of this.messages.values()) {
      const msg = messages.find(m => m.id === messageId)
      if (msg) return msg
    }
    return undefined
  }

  /**
   * 更新消息
   */
  updateMessage(messageId: string, updates: Partial<Message>): Message | undefined {
    for (const messages of this.messages.values()) {
      const index = messages.findIndex(m => m.id === messageId)
      if (index !== -1) {
        messages[index] = { ...messages[index], ...updates }
        return messages[index]
      }
    }
    return undefined
  }

  /**
   * 删除消息
   */
  deleteMessage(messageId: string): boolean {
    for (const messages of this.messages.values()) {
      const index = messages.findIndex(m => m.id === messageId)
      if (index !== -1) {
        messages.splice(index, 1)
        return true
      }
    }
    return false
  }

  /**
   * 撤回消息
   */
  recallMessage(messageId: string): boolean {
    return this.updateMessage(messageId, {
      content: { text: '消息已撤回' },
      type: 'system' as MessageType
    }) !== undefined
  }

  /**
   * 搜索消息
   */
  searchMessages(keyword: string, groupId?: string): Message[] {
    const results: Message[] = []
    const targetBuckets = groupId
      ? Array.from(this.messages.keys()).filter((key) => key.startsWith(`${groupId}::`))
      : this.currentGroupId
        ? [this.getBucketKey(this.currentGroupId, this.currentSessionId)]
        : Array.from(this.messages.keys())

    for (const bucketKey of targetBuckets) {
      const messages = this.messages.get(bucketKey) || []
      for (const msg of messages) {
        const content = msg.content
        if (typeof content === 'object' && 'text' in content) {
          if (content.text.toLowerCase().includes(keyword.toLowerCase())) {
            results.push(msg)
          }
        }
      }
    }

    return results
  }

  /**
   * 清空消息
   */
  clearMessages(groupId?: string): void {
    if (groupId) {
      const keys = Array.from(this.messages.keys()).filter((key) => key.startsWith(`${groupId}::`))
      keys.forEach((key) => this.messages.delete(key))
    } else {
      this.messages.clear()
    }
  }

  /**
   * 加载历史消息
   */
  loadHistory(messages: Message[], groupId?: string, sessionId?: string | null): void {
    const targetGroupId = groupId || this.currentGroupId
    if (!targetGroupId) return

    const bucketKey = this.getBucketKey(targetGroupId, sessionId ?? this.currentSessionId)
    const existing = this.messages.get(bucketKey) || []
    const merged = [...messages, ...existing]
    const deduped = new Map<string, Message>()

    for (const message of merged) {
      deduped.set(message.id, message)
    }

    this.messages.set(
      bucketKey,
      Array.from(deduped.values()).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
    )
  }

  /**
   * 获取消息数量
   */
  getMessageCount(groupId?: string): number {
    if (groupId) {
      return this.getMessagesByGroup(groupId).length
    }
    let total = 0
    for (const messages of this.messages.values()) {
      total += messages.length
    }
    return total
  }

  private getBucketKey(groupId: string, sessionId: string | null): string {
    return `${groupId}::${sessionId || '__default__'}`
  }

  private ensureBucket(groupId: string, sessionId: string | null): void {
    const bucketKey = this.getBucketKey(groupId, sessionId)
    if (!this.messages.has(bucketKey)) {
      this.messages.set(bucketKey, [])
    }
  }
}

export default MessageManager
