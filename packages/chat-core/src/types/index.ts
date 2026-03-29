import type { ChatEngine } from '../engine/ChatEngine'

// 消息类型
export type MessageType = 'text' | 'image' | 'file' | 'system'

// 用户角色
export type UserRole = 'owner' | 'admin' | 'member' | 'bot'

// 在线状态
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

// 用户
export interface User {
  id: string
  name: string
  avatar: string
  role: UserRole
  presence?: PresenceStatus
}

// 群
export interface Group {
  id: string
  name: string
  ownerId: string
  members: User[]
  createdAt: number
}

// 消息
export interface Message {
  id: string
  groupId: string
  sessionId?: string
  senderId: string
  senderName?: string
  senderAvatar?: string
  senderRole?: 'user' | 'assistant' | 'system' | 'bot' | string
  relaySource?: string
  type: MessageType
  content: any
  quoteId?: string
  mentions?: string[]
  createdAt: number
  status?: 'sending' | 'sent' | 'failed'
  // IM 增强字段
  reactions?: Reaction[]
  readBy?: ReadReceipt[]
  editedAt?: number
  editHistory?: MessageEdit[]
  isDeleted?: boolean
}

// 消息内容 - 文本
export interface TextContent {
  text: string
}

// 消息内容 - 图片
export interface ImageContent {
  url: string
  width?: number
  height?: number
  thumbnail?: string
}

// 消息内容 - 文件
export interface FileContent {
  name: string
  url: string
  size: number
  type: string
}

// 表情回应
export interface Reaction {
  emoji: string
  userIds: string[]
}

// 消息已读状态
export interface ReadReceipt {
  userId: string
  readAt: number
}

// 用户在线状态
export interface UserPresence {
  userId: string
  status: PresenceStatus
  lastSeen?: number
}

// 打字状态
export interface TypingState {
  userId: string
  userName: string
  groupId: string
  isTyping: boolean
}

// 消息编辑历史
export interface MessageEdit {
  content: any
  editedAt: number
}

// 附件
export interface Attachment {
  id: string
  name: string
  url: string
  size: number
  type: string
}

// 机器人
export interface Bot {
  id: string
  name: string
  avatar: string
  onMessage: (msg: Message) => Promise<Message | null>
}

// 插件
export interface ChatPlugin {
  name: string
  install?: (engine: ChatEngine) => void
  beforeSend?: (msg: Message) => Message | Promise<Message>
  afterReceive?: (msg: Message) => Message | Promise<Message>
  destroy?: () => void
}

// WebSocket 消息格式
export interface WSMessage {
  cmd: string
  data: any
  timestamp?: number
}

// 聊天配置
export interface ChatConfig {
  userId: string
  userName?: string
  userAvatar?: string
  wsUrl: string
  groupId?: string
  groupName?: string
  sessionId?: string
}

// Clawith 集成配置
export interface ClawithConfig {
  apiUrl: string
  wsUrl?: string
  teamId: string
  token: string
}

// 事件类型
export interface ChatEvents {
  'message:send': Message
  'message:receive': Message
  'message:recall': { messageId: string }
  'message:delete': { messageId: string }
  'message:edit': { messageId: string; content: any; editedAt: number }
  'message:reaction-add': { messageId: string; emoji: string; userId: string }
  'message:reaction-remove': { messageId: string; emoji: string; userId: string }
  'typing:start': { groupId: string; userId: string; userName: string }
  'typing:stop': { groupId: string; userId: string }
  'presence:update': UserPresence
  'read:receipt': { messageId: string; userId: string; readAt: number }
  'group:create': Group
  'group:join': { groupId: string; userId: string }
  'group:leave': { groupId: string; userId: string }
  'group:member-update': { groupId: string; members: User[] }
  'bot:trigger': { bot: Bot; message: Message }
  'attachment:upload': Attachment
  'connection:open': void
  'connection:close': void
  'connection:error': Error
  'sync:complete': { groupId: string; messages: Message[] }
}
