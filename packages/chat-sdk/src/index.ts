import { ChatEngine, ChatConfig, Message, Group, User, Bot, ChatPlugin, ChatEvents, ClawithConfig } from '@open-chat/chat-core'

type EventCallback<T> = (data: T) => void

/**
 * ChatSDK - 对外 API 接口
 */
export class ChatSDK {
  private engine: ChatEngine
  private clawithConfig: ClawithConfig | null = null

  constructor(config: ChatConfig)
  constructor(clawithConfig: ClawithConfig)
  constructor(configOrClawith: ChatConfig | ClawithConfig) {
    // Detect configuration type
    if ('wsUrl' in configOrClawith) {
      // Standard ChatConfig
      this.engine = new ChatEngine(configOrClawith)
    } else {
      // ClawithConfig - need to fetch WS URL first
      this.clawithConfig = configOrClawith
      const chatConfig = this.createChatConfigFromClawith(configOrClawith)
      this.engine = new ChatEngine(chatConfig)
    }
  }

  /**
   * Create ChatConfig from ClawithConfig
   */
  private createChatConfigFromClawith(config: ClawithConfig): ChatConfig {
    // In a real implementation, this would fetch the WebSocket URL from the Clawith API
    // For now, we'll use the provided wsUrl or construct it from apiUrl
    const wsUrl = config.wsUrl || `${config.apiUrl.replace(/^http/, 'ws')}/ws`
    return {
      userId: config.teamId, // Will be overridden by actual user ID
      wsUrl,
      groupId: config.teamId
    }
  }

  /**
   * Configure Clawith integration after initialization
   */
  setClawithConfig(config: ClawithConfig): void {
    this.clawithConfig = config
  }

  /**
   * Connect to server
   */
  async connect(): Promise<void> {
    await this.engine.connect()
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.engine.disconnect()
  }

  /**
   * 是否已连接
   */
  get connected(): boolean {
    return this.engine.connected
  }

  /**
   * 获取当前用户 ID
   */
  get userId(): string {
    return this.engine.userId
  }

  /**
   * 获取当前会话 ID
   */
  get sessionId(): string | null {
    return this.engine.getSessionId()
  }

  /**
   * 发送文本消息
   */
  async sendText(text: string, mentions?: string[]): Promise<Message> {
    return this.engine.sendText(text, mentions)
  }

  /**
   * 发送图片消息
   */
  async sendImage(url: string, thumbnail?: string): Promise<Message> {
    return this.engine.sendImage(url, thumbnail)
  }

  /**
   * 发送文件消息
   */
  async sendFile(file: { name: string; url: string; size: number; type: string }): Promise<Message> {
    return this.engine.sendFile(file)
  }

  /**
   * 撤回消息
   */
  recallMessage(messageId: string): void {
    this.engine.recallMessage(messageId)
  }

  /**
   * 加入群组
   */
  joinGroup(groupId: string, groupName?: string): void {
    this.engine.joinGroup(groupId, groupName)
  }

  /**
   * 创建群组
   */
  createGroup(name: string): Group {
    return this.engine.createGroup(name)
  }

  /**
   * 创建新会话
   */
  createSession(): string {
    return this.engine.createSession()
  }

  /**
   * 切换当前会话
   */
  setSession(sessionId: string | null): void {
    this.engine.setSession(sessionId)
  }

  /**
   * 获取当前群组
   */
  getCurrentGroup(): Group | undefined {
    return this.engine.getCurrentGroup()
  }

  /**
   * 获取当前群组成员
   */
  getMembers(): User[] {
    return this.engine.getMembers()
  }

  /**
   * 获取当前群组消息
   */
  getMessages(): Message[] {
    return this.engine.getMessages()
  }

  /**
   * 搜索消息
   */
  searchMessages(keyword: string): Message[] {
    return this.engine.searchMessages(keyword)
  }

  /**
   * 全局搜索（跨群组）
   */
  searchAll(keyword: string, dateFilter?: string): Message[] {
    const allMessages = this.engine.messageManager.getMessagesByGroup('')
    let results = allMessages.filter((msg) => {
      const content = msg.content
      if (typeof content === 'object' && 'text' in content) {
        return content.text.toLowerCase().includes(keyword.toLowerCase())
      }
      return false
    })

    // Apply date filter
    if (dateFilter) {
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000
      const oneWeek = 7 * oneDay
      const oneMonth = 30 * oneDay

      results = results.filter((msg) => {
        const msgTime = msg.createdAt
        switch (dateFilter) {
          case 'today':
            return now - msgTime < oneDay
          case 'week':
            return now - msgTime < oneWeek
          case 'month':
            return now - msgTime < oneMonth
          default:
            return true
        }
      })
    }

    // Sort by time descending
    return results.sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * 安装插件
   */
  use(plugin: ChatPlugin): void {
    this.engine.use(plugin)
  }

  /**
   * 注册机器人
   */
  registerBot(bot: Bot): void {
    this.engine.registerBot(bot)
  }

  /**
   * 监听事件
   */
  on<K extends keyof ChatEvents>(event: K, callback: EventCallback<ChatEvents[K]>): () => void {
    return this.engine.eventBus.on(event, callback as any)
  }

  /**
   * 监听消息发送
   */
  onSend(callback: (message: Message) => void): () => void {
    return this.engine.eventBus.on('message:send', callback)
  }

  /**
   * 监听消息接收
   */
  onReceive(callback: (message: Message) => void): () => void {
    return this.engine.eventBus.on('message:receive', callback)
  }

  /**
   * 监听消息撤回
   */
  onRecall(callback: (data: { messageId: string }) => void): () => void {
    return this.engine.eventBus.on('message:recall', callback)
  }

  /**
   * 监听连接状态
   */
  onConnect(callback: () => void): () => void {
    return this.engine.eventBus.on('connection:open', callback)
  }

  /**
   * 监听断开连接
   */
  onDisconnect(callback: () => void): () => void {
    return this.engine.eventBus.on('connection:close', callback)
  }

  /**
   * 监听群成员更新
   */
  onMemberUpdate(callback: (data: { groupId: string; members: User[] }) => void): () => void {
    return this.engine.eventBus.on('group:member-update', callback)
  }

  /**
   * 监听群创建
   */
  onGroupCreate(callback: (group: Group) => void): () => void {
    return this.engine.eventBus.on('group:create', callback)
  }

  /**
   * 监听历史消息同步完成
   */
  onSyncComplete(callback: (data: { groupId: string; messages: Message[] }) => void): () => void {
    return this.engine.eventBus.on('sync:complete', callback)
  }

  /**
   * 监听打字开始
   */
  onTypingStart(callback: (data: { groupId: string; userId: string; userName: string }) => void): () => void {
    return this.engine.eventBus.on('typing:start', callback)
  }

  /**
   * 监听打字停止
   */
  onTypingStop(callback: (data: { groupId: string; userId: string }) => void): () => void {
    return this.engine.eventBus.on('typing:stop', callback)
  }

  /**
   * 监听表情回应添加
   */
  onReactionAdd(callback: (data: { messageId: string; emoji: string; userId: string }) => void): () => void {
    return this.engine.eventBus.on('message:reaction-add', callback)
  }

  /**
   * 监听表情回应移除
   */
  onReactionRemove(callback: (data: { messageId: string; emoji: string; userId: string }) => void): () => void {
    return this.engine.eventBus.on('message:reaction-remove', callback)
  }

  /**
   * 监听消息已读
   */
  onReadReceipt(callback: (data: { messageId: string; userId: string; readAt: number }) => void): () => void {
    return this.engine.eventBus.on('read:receipt', callback)
  }

  /**
   * 监听消息编辑
   */
  onMessageEdit(callback: (data: { messageId: string; content: any; editedAt: number }) => void): () => void {
    return this.engine.eventBus.on('message:edit', callback)
  }

  /**
   * 监听消息删除
   */
  onMessageDelete(callback: (data: { messageId: string }) => void): () => void {
    return this.engine.eventBus.on('message:delete', callback)
  }

  /**
   * 监听在线状态更新
   */
  onPresenceUpdate(callback: (data: { userId: string; status: string; lastSeen?: number }) => void): () => void {
    return this.engine.eventBus.on('presence:update', callback)
  }

  /**
   * 开始打字
   */
  startTyping(): void {
    this.engine.startTyping()
  }

  /**
   * 停止打字
   */
  stopTyping(): void {
    this.engine.stopTyping()
  }

  /**
   * 添加表情回应
   */
  addReaction(messageId: string, emoji: string): void {
    this.engine.addReaction(messageId, emoji)
  }

  /**
   * 移除表情回应
   */
  removeReaction(messageId: string, emoji: string): void {
    this.engine.removeReaction(messageId, emoji)
  }

  /**
   * 标记消息已读
   */
  markAsRead(messageId: string): void {
    this.engine.markAsRead(messageId)
  }

  /**
   * 编辑消息（5分钟内）
   */
  editMessage(messageId: string, content: any): boolean {
    return this.engine.editMessage(messageId, content)
  }

  /**
   * 删除消息
   */
  deleteMessage(messageId: string): boolean {
    return this.engine.deleteMessage(messageId)
  }

  /**
   * 获取当前正在打字的用户
   */
  getTypingUsers(): Array<{ userId: string; userName: string }> {
    return this.engine.getTypingUsers()
  }

  /**
   * 销毁 SDK
   */
  destroy(): void {
    this.engine.destroy()
  }
}

export default ChatSDK
