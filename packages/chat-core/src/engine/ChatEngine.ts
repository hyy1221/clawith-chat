import { EventBus } from '../event/EventBus'
import { SocketManager, DEFAULT_REACTIONS } from '../transport/SocketManager'
import { PluginManager } from '../plugin/PluginManager'
import { MessageManager } from '../message/MessageManager'
import { GroupManager } from '../group/GroupManager'
import { BotManager } from '../bot/BotManager'
import {
  ChatConfig,
  Message,
  Group,
  User,
  Bot,
  ChatPlugin,
  WSMessage,
  Reaction,
  MessageType
} from '../types'
import { debounce } from '@open-chat/chat-utils'

/**
 * 聊天引擎 - 核心模块
 */
export class ChatEngine {
  // 核心管理器
  public eventBus: EventBus
  public pluginManager: PluginManager
  public messageManager: MessageManager
  public groupManager: GroupManager
  public botManager: BotManager

  // 传输层
  private socketManager: SocketManager

  // 配置
  private config: ChatConfig
  private isConnected = false
  private currentSessionId: string | null
  private typingUsers: Map<string, { userId: string; userName: string; timeout: NodeJS.Timeout }> = new Map()
  private typingDebounceTimer: NodeJS.Timeout | null = null
  private lastTypingSent = 0
  private readonly TYPING_DEBOUNCE_MS = 300
  private readonly TYPING_TIMEOUT_MS = 3000

  constructor(config: ChatConfig) {
    this.config = config
    this.currentSessionId = config.sessionId || null

    // 初始化事件总线
    this.eventBus = new EventBus()

    // 初始化各管理器
    this.pluginManager = new PluginManager(this)
    this.messageManager = new MessageManager()
    this.groupManager = new GroupManager()
    this.botManager = new BotManager()
    this.messageManager.setCurrentSession(this.currentSessionId)

    // 初始化 Socket
    this.socketManager = new SocketManager(config.wsUrl)

    // 初始化
    this.init()
  }

  private init(): void {
    // 监听 Socket 事件
    this.socketManager.onMessage('open', () => {
      this.isConnected = true
      this.eventBus.emit('connection:open')
    })

    this.socketManager.onMessage('close', () => {
      this.isConnected = false
      this.eventBus.emit('connection:close')
    })

    this.socketManager.onMessage('error', (msg) => {
      this.eventBus.emit('connection:error', msg.data)
    })

    // 监听消息
    this.socketManager.onMessage('message_receive', (msg) => {
      this.handleReceiveMessage(msg.data)
    })

    this.socketManager.onMessage('message_recall', (msg) => {
      this.handleRecallMessage(msg.data)
    })

    this.socketManager.onMessage('group_member_update', (msg) => {
      this.handleGroupMemberUpdate(msg.data)
    })

    this.socketManager.onMessage('history', (msg) => {
      this.handleHistory(msg.data)
    })

    this.socketManager.onMessage('pong', () => {
      // 心跳响应
    })

    // 打字事件
    this.socketManager.onMessage('typing_start', (msg) => {
      this.handleTypingStart(msg.data)
    })

    this.socketManager.onMessage('typing_stop', (msg) => {
      this.handleTypingStop(msg.data)
    })

    // 表情回应事件
    this.socketManager.onMessage('message_reaction_add', (msg) => {
      this.handleReactionAdd(msg.data)
    })

    this.socketManager.onMessage('message_reaction_remove', (msg) => {
      this.handleReactionRemove(msg.data)
    })

    // 已读回执
    this.socketManager.onMessage('read_receipt_update', (msg) => {
      this.handleReadReceipt(msg.data)
    })

    // 消息编辑
    this.socketManager.onMessage('message_edit_notify', (msg) => {
      this.handleMessageEdit(msg.data)
    })

    // 消息删除
    this.socketManager.onMessage('message_delete', (msg) => {
      this.handleMessageDelete(msg.data)
    })

    // 在线状态
    this.socketManager.onMessage('presence_update', (msg) => {
      this.handlePresenceUpdate(msg.data)
    })
  }

  /**
   * 连接服务器
   */
  async connect(): Promise<void> {
    this.socketManager.setUserInfo(this.config.userId, this.config.userName || 'User')
    await this.socketManager.connect()

    // 发送在线状态
    this.socketManager.sendPresenceUpdate('online')

    // 发送加入群组消息
    if (this.config.groupId) {
      this.joinGroup(this.config.groupId, this.config.groupName)
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.socketManager.disconnect()
  }

  /**
   * 是否已连接
   */
  get connected(): boolean {
    return this.isConnected
  }

  /**
   * 获取当前用户 ID
   */
  get userId(): string {
    return this.config.userId
  }

  /**
   * 获取当前用户信息
   */
  get currentUser(): User {
    return {
      id: this.config.userId,
      name: this.config.userName || 'User',
      avatar: this.config.userAvatar || '',
      role: 'member'
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(content: any, type: 'text' | 'image' | 'file' = 'text'): Promise<Message> {
    const message: Message = {
      id: this.generateMessageId(),
      groupId: this.groupManager.getCurrentGroupId() || '',
      sessionId: this.currentSessionId || undefined,
      senderId: this.config.userId,
      senderName: this.config.userName,
      senderAvatar: this.config.userAvatar,
      senderRole: 'user',
      type,
      content,
      createdAt: Date.now(),
      status: 'sending'
    }

    // 触发发送前事件
    this.eventBus.emit('message:send', message)

    try {
      // 通过插件处理
      const processedMsg = await this.pluginManager.runBeforeSend(message)

      // 发送消息到服务器
      this.socketManager.send({
        cmd: 'message_send',
        data: processedMsg
      })

      // 添加到本地消息列表
      this.messageManager.addMessage(processedMsg)

      // 更新消息状态
      this.messageManager.updateMessage(processedMsg.id, { status: 'sent' })

      return processedMsg
    } catch (error) {
      // 发送失败
      this.messageManager.updateMessage(message.id, { status: 'failed' })
      throw error
    }
  }

  /**
   * 发送文本消息
   */
  async sendText(text: string, mentions?: string[]): Promise<Message> {
    return this.sendMessage({ text }, 'text')
  }

  /**
   * 发送图片消息
   */
  async sendImage(url: string, thumbnail?: string): Promise<Message> {
    return this.sendMessage({ url, thumbnail }, 'image')
  }

  /**
   * 发送文件消息
   */
  async sendFile(file: { name: string; url: string; size: number; type: string }): Promise<Message> {
    return this.sendMessage(file, 'file')
  }

  /**
   * 开始打字
   */
  startTyping(): void {
    const now = Date.now()
    if (now - this.lastTypingSent < this.TYPING_DEBOUNCE_MS) {
      return
    }
    this.lastTypingSent = now

    const groupId = this.groupManager.getCurrentGroupId()
    if (!groupId) return

    this.socketManager.sendTypingStart(groupId)

    // 设置停止打字定时器
    if (this.typingDebounceTimer) {
      clearTimeout(this.typingDebounceTimer)
    }
    this.typingDebounceTimer = setTimeout(() => {
      this.stopTyping()
    }, this.TYPING_TIMEOUT_MS)
  }

  /**
   * 停止打字
   */
  stopTyping(): void {
    if (this.typingDebounceTimer) {
      clearTimeout(this.typingDebounceTimer)
      this.typingDebounceTimer = null
    }

    const groupId = this.groupManager.getCurrentGroupId()
    if (!groupId) return

    this.socketManager.sendTypingStop(groupId)
  }

  /**
   * 添加表情回应
   */
  addReaction(messageId: string, emoji: string): void {
    this.socketManager.sendReactionAdd(messageId, emoji)

    // 本地立即更新
    const message = this.messageManager.getMessageById(messageId)
    if (message) {
      const reactions = message.reactions || []
      const existing = reactions.find(r => r.emoji === emoji)
      if (existing) {
        if (!existing.userIds.includes(this.config.userId)) {
          existing.userIds.push(this.config.userId)
        }
      } else {
        reactions.push({ emoji, userIds: [this.config.userId] })
      }
      this.messageManager.updateMessage(messageId, { reactions: [...reactions] })
    }
  }

  /**
   * 移除表情回应
   */
  removeReaction(messageId: string, emoji: string): void {
    this.socketManager.sendReactionRemove(messageId, emoji)

    // 本地立即更新
    const message = this.messageManager.getMessageById(messageId)
    if (message && message.reactions) {
      const reactions = message.reactions
      const existing = reactions.find(r => r.emoji === emoji)
      if (existing) {
        existing.userIds = existing.userIds.filter(id => id !== this.config.userId)
        if (existing.userIds.length === 0) {
          const index = reactions.indexOf(existing)
          if (index !== -1) {
            reactions.splice(index, 1)
          }
        }
        this.messageManager.updateMessage(messageId, { reactions: [...reactions] })
      }
    }
  }

  /**
   * 标记消息已读
   */
  markAsRead(messageId: string): void {
    const groupId = this.groupManager.getCurrentGroupId()
    if (!groupId) return

    this.socketManager.sendReadReceipt(messageId, groupId)
  }

  /**
   * 编辑消息
   */
  editMessage(messageId: string, content: any): boolean {
    const message = this.messageManager.getMessageById(messageId)
    if (!message) return false

    // 检查是否是发送者
    if (message.senderId !== this.config.userId) return false

    // 检查是否在5分钟内
    const fiveMinutes = 5 * 60 * 1000
    if (Date.now() - message.createdAt > fiveMinutes) return false

    // 保存编辑历史
    const editHistory = message.editHistory || []
    editHistory.push({
      content: message.content,
      editedAt: message.editedAt || message.createdAt
    })

    const editedAt = Date.now()
    this.socketManager.sendMessageEdit(messageId, content)
    this.messageManager.updateMessage(messageId, { content, editedAt, editHistory })

    return true
  }

  /**
   * 删除消息
   */
  deleteMessage(messageId: string): boolean {
    const message = this.messageManager.getMessageById(messageId)
    if (!message) return false

    // 检查是否是发送者
    if (message.senderId !== this.config.userId) return false

    this.socketManager.sendMessageDelete(messageId)
    this.messageManager.updateMessage(messageId, {
      isDeleted: true,
      content: { text: '消息已删除' },
      type: 'system' as MessageType
    })
    this.eventBus.emit('message:delete', { messageId })

    return true
  }

  /**
   * 获取当前正在打字的用户
   */
  getTypingUsers(): Array<{ userId: string; userName: string }> {
    return Array.from(this.typingUsers.values()).map(t => ({
      userId: t.userId,
      userName: t.userName
    }))
  }

  /**
   * 撤回消息
   */
  recallMessage(messageId: string): void {
    this.socketManager.send({
      cmd: 'message_recall',
      data: { messageId }
    })

    this.messageManager.recallMessage(messageId)
    this.eventBus.emit('message:recall', { messageId })
  }

  /**
   * 加入群组
   */
  joinGroup(groupId: string, groupName?: string): void {
    const currentGroup = this.groupManager.getGroup(groupId)
    const resolvedGroupName = groupName || currentGroup?.name || groupId
    const currentGroupId = this.groupManager.getCurrentGroupId()
    const isSameGroup = currentGroupId === groupId
    const isSameName = currentGroup?.name === resolvedGroupName

    this.ensureGroup(groupId, resolvedGroupName)
    this.groupManager.setCurrentGroup(groupId)
    this.messageManager.setCurrentGroup(groupId)
    this.messageManager.setCurrentSession(this.currentSessionId)

    if (isSameGroup && isSameName) {
      return
    }

    this.socketManager.send({
      cmd: 'group_join',
      data: {
        groupId,
        groupName: resolvedGroupName,
        userId: this.config.userId,
        userName: this.config.userName
      }
    })
  }

  /**
   * 创建群组
   */
  createGroup(name: string): Group {
    const group = this.groupManager.createGroup({
      id: this.generateGroupId(),
      name,
      ownerId: this.config.userId
    })

    // 添加创建者为成员
    this.groupManager.addMember(group.id, this.currentUser)

    // 加入群组
    this.joinGroup(group.id)

    this.eventBus.emit('group:create', group)

    return group
  }

  /**
   * 安装插件
   */
  use(plugin: ChatPlugin): void {
    this.pluginManager.use(plugin)
  }

  /**
   * 注册机器人
   */
  registerBot(bot: Bot): void {
    this.botManager.register(bot)
  }

  /**
   * 创建新会话并切换到该会话
   */
  createSession(): string {
    const sessionId = this.generateSessionId()
    this.setSession(sessionId)
    return sessionId
  }

  /**
   * 切换当前会话
   */
  setSession(sessionId: string | null): void {
    this.currentSessionId = sessionId
    this.messageManager.setCurrentSession(sessionId)
  }

  /**
   * 获取当前会话 ID
   */
  getSessionId(): string | null {
    return this.currentSessionId
  }

  /**
   * 搜索消息
   */
  searchMessages(keyword: string): Message[] {
    return this.messageManager.searchMessages(keyword)
  }

  /**
   * 获取当前群组消息
   */
  getMessages(): Message[] {
    return this.messageManager.getMessages()
  }

  /**
   * 获取当前群组
   */
  getCurrentGroup(): Group | undefined {
    return this.groupManager.getCurrentGroup()
  }

  /**
   * 获取当前群组成员
   */
  getMembers(): User[] {
    const groupId = this.groupManager.getCurrentGroupId()
    if (!groupId) return []
    return this.groupManager.getMembers(groupId)
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    this.disconnect()
    this.pluginManager.destroy()
    this.botManager.clear()
    this.eventBus.clear()
  }

  // 私有方法

  private async handleReceiveMessage(data: any): Promise<void> {
    const message: Message = {
      id: data.id,
      groupId: data.groupId,
      sessionId: data.sessionId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      senderRole: data.senderRole,
      relaySource: data.relaySource,
      type: data.type,
      content: data.content,
      quoteId: data.quoteId,
      mentions: data.mentions,
      createdAt: data.createdAt,
      status: 'sent',
      // IM 增强字段
      reactions: data.reactions,
      readBy: data.readBy,
      editedAt: data.editedAt,
      editHistory: data.editHistory,
      isDeleted: data.isDeleted
    }

    // 通过插件处理
    const processedMsg = await this.pluginManager.runAfterReceive(message)

    // 添加到本地消息列表
    this.messageManager.addMessage(processedMsg)

    // 触发机器人
    this.handleBotTrigger(processedMsg)

    // 触发事件
    this.eventBus.emit('message:receive', processedMsg)
  }

  private handleRecallMessage(data: { messageId: string }): void {
    this.messageManager.recallMessage(data.messageId)
    this.eventBus.emit('message:recall', { messageId: data.messageId })
  }

  private handleGroupMemberUpdate(data: { groupId: string; members: User[] }): void {
    this.ensureGroup(data.groupId, (data as { groupName?: string }).groupName)
    this.groupManager.setMembers(data.groupId, data.members)
    this.eventBus.emit('group:member-update', data)
  }

  private handleHistory(data: { groupId: string; groupName?: string; messages: Message[] }): void {
    this.ensureGroup(data.groupId, data.groupName)
    this.messageManager.loadHistory(data.messages || [], data.groupId)
    this.eventBus.emit('sync:complete', {
      groupId: data.groupId,
      messages: this.messageManager.getMessagesByGroup(data.groupId)
    })
  }

  private async handleBotTrigger(message: Message): Promise<void> {
    const response = await this.botManager.trigger(message)
    if (response) {
      // 发送机器人回复
      this.messageManager.addMessage(response)
      this.eventBus.emit('message:receive', response)
    }
  }

  private handleTypingStart(data: { groupId: string; userId: string; userName: string }): void {
    // 忽略自己的打字事件
    if (data.userId === this.config.userId) return

    const key = `${data.groupId}:${data.userId}`
    const existing = this.typingUsers.get(key)

    if (existing) {
      clearTimeout(existing.timeout)
    }

    const timeout = setTimeout(() => {
      this.typingUsers.delete(key)
      this.eventBus.emit('typing:stop', { groupId: data.groupId, userId: data.userId })
    }, this.TYPING_TIMEOUT_MS)

    this.typingUsers.set(key, {
      userId: data.userId,
      userName: data.userName,
      timeout
    })

    this.eventBus.emit('typing:start', data)
  }

  private handleTypingStop(data: { groupId: string; userId: string }): void {
    // 忽略自己的停止打字事件
    if (data.userId === this.config.userId) return

    const key = `${data.groupId}:${data.userId}`
    const existing = this.typingUsers.get(key)
    if (existing) {
      clearTimeout(existing.timeout)
      this.typingUsers.delete(key)
    }

    this.eventBus.emit('typing:stop', data)
  }

  private handleReactionAdd(data: { messageId: string; emoji: string; userId: string }): void {
    const message = this.messageManager.getMessageById(data.messageId)
    if (!message) return

    const reactions = message.reactions || []
    const existing = reactions.find(r => r.emoji === data.emoji)

    if (existing) {
      if (!existing.userIds.includes(data.userId)) {
        existing.userIds.push(data.userId)
      }
    } else {
      reactions.push({ emoji: data.emoji, userIds: [data.userId] })
    }

    this.messageManager.updateMessage(data.messageId, { reactions: [...reactions] })
    this.eventBus.emit('message:reaction-add', data)
  }

  private handleReactionRemove(data: { messageId: string; emoji: string; userId: string }): void {
    const message = this.messageManager.getMessageById(data.messageId)
    if (!message || !message.reactions) return

    const reactions = message.reactions
    const existing = reactions.find(r => r.emoji === data.emoji)

    if (existing) {
      existing.userIds = existing.userIds.filter(id => id !== data.userId)
      if (existing.userIds.length === 0) {
        const index = reactions.indexOf(existing)
        if (index !== -1) {
          reactions.splice(index, 1)
        }
      }
      this.messageManager.updateMessage(data.messageId, { reactions: [...reactions] })
    }

    this.eventBus.emit('message:reaction-remove', data)
  }

  private handleReadReceipt(data: { messageId: string; userId: string; readAt: number }): void {
    const message = this.messageManager.getMessageById(data.messageId)
    if (!message) return

    const readBy = message.readBy || []
    const existing = readBy.find(r => r.userId === data.userId)

    if (existing) {
      existing.readAt = data.readAt
    } else {
      readBy.push({ userId: data.userId, readAt: data.readAt })
    }

    this.messageManager.updateMessage(data.messageId, { readBy: [...readBy] })
    this.eventBus.emit('read:receipt', data)
  }

  private handleMessageEdit(data: { messageId: string; content: any; editedAt: number; userId: string }): void {
    const message = this.messageManager.getMessageById(data.messageId)
    if (!message) return

    // 保存编辑历史
    const editHistory = message.editHistory || []
    editHistory.push({
      content: message.content,
      editedAt: message.editedAt || message.createdAt
    })

    this.messageManager.updateMessage(data.messageId, {
      content: data.content,
      editedAt: data.editedAt,
      editHistory
    })

    this.eventBus.emit('message:edit', {
      messageId: data.messageId,
      content: data.content,
      editedAt: data.editedAt
    })
  }

  private handleMessageDelete(data: { messageId: string; userId: string }): void {
    const message = this.messageManager.getMessageById(data.messageId)
    if (!message) return

    this.messageManager.updateMessage(data.messageId, {
      isDeleted: true,
      content: { text: '消息已删除' },
      type: 'system' as MessageType
    })

    this.eventBus.emit('message:delete', { messageId: data.messageId })
  }

  private handlePresenceUpdate(data: { userId: string; status: string; lastSeen?: number }): void {
    this.eventBus.emit('presence:update', {
      userId: data.userId,
      status: data.status as any,
      lastSeen: data.lastSeen
    })
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  private generateGroupId(): string {
    return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  private ensureGroup(groupId: string, groupName?: string): Group {
    const existing = this.groupManager.getGroup(groupId)
    if (existing) {
      if (groupName && existing.name !== groupName) {
        this.groupManager.updateGroup(groupId, { name: groupName })
      }
      return existing
    }

    return this.groupManager.createGroup({
      id: groupId,
      name: groupName || groupId,
      ownerId: this.config.userId
    })
  }
}

export default ChatEngine
