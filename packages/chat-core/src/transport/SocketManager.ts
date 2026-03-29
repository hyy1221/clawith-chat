import { WSMessage } from '../types'

type MessageHandler = (msg: WSMessage) => void

// 默认表情列表
export const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏']

/**
 * WebSocket 管理器
 */
export class SocketManager {
  private socket: WebSocket | null = null
  private url: string
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: number | null = null
  private isManualClose = false
  private userId: string = ''
  private userName: string = ''

  constructor(url: string) {
    this.url = url
  }

  /**
   * 连接 WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isManualClose = false

      try {
        this.socket = new WebSocket(this.url)

        this.socket.onopen = () => {
          console.log('[SocketManager] Connected to', this.url)
          this.reconnectAttempts = 0
          this.startPing()
          this.emit('open', undefined)
          resolve()
        }

        this.socket.onmessage = (event) => {
          try {
            const msg: WSMessage = JSON.parse(event.data)
            this.handleMessage(msg)
          } catch (error) {
            console.error('[SocketManager] Failed to parse message:', error)
          }
        }

        this.socket.onclose = (event) => {
          console.log('[SocketManager] Connection closed', event.code, event.reason)
          this.stopPing()
          this.emit('close', event)

          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect()
          }
        }

        this.socket.onerror = (error) => {
          console.error('[SocketManager] Error:', error)
          this.emit('error', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  /**
   * 发送消息
   */
  send(data: WSMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        ...data,
        timestamp: data.timestamp || Date.now()
      }))
    } else {
      console.warn('[SocketManager] Cannot send message, socket not connected')
    }
  }

  /**
   * 订阅消息
   */
  onMessage(cmd: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(cmd)) {
      this.handlers.set(cmd, new Set())
    }
    this.handlers.get(cmd)!.add(handler)

    return () => {
      this.handlers.get(cmd)?.delete(handler)
    }
  }

  /**
   * 发送并等待响应
   */
  sendAndWait<T = any>(cmd: string, data: any, timeout = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      const clientMsgId = this.generateClientId()

      const cleanup = this.onMessage(cmd + '_response', (msg) => {
        if (msg.data.clientMsgId === clientMsgId) {
          cleanup()
          clearTimeout(timer)
          resolve(msg.data)
        }
      })

      const timer = setTimeout(() => {
        cleanup()
        reject(new Error('Request timeout'))
      }, timeout)

      this.send({ cmd, data: { ...data, clientMsgId } })
    })
  }

  /**
   * 是否连接中
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  private handleMessage(msg: WSMessage): void {
    const handlers = this.handlers.get(msg.cmd)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(msg)
        } catch (error) {
          console.error(`[SocketManager] Error in handler for "${msg.cmd}":`, error)
        }
      })
    }

    // 同时触发所有处理器
    this.emit('message', msg)
  }

  private emit(event: string, data: any): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler({ cmd: event, data }))
    }
  }

  private reconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    console.log(`[SocketManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch(() => {
        // 连接失败，会自动重试
      })
    }, delay)
  }

  private startPing(): void {
    this.pingInterval = window.setInterval(() => {
      this.send({ cmd: 'ping', data: {} })
    }, 30000)
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private generateClientId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 设置用户信息
   */
  setUserInfo(userId: string, userName: string): void {
    this.userId = userId
    this.userName = userName
  }

  /**
   * 发送打字开始
   */
  sendTypingStart(groupId: string): void {
    this.send({
      cmd: 'typing_start',
      data: {
        groupId,
        userId: this.userId,
        userName: this.userName
      }
    })
  }

  /**
   * 发送打字停止
   */
  sendTypingStop(groupId: string): void {
    this.send({
      cmd: 'typing_stop',
      data: {
        groupId,
        userId: this.userId
      }
    })
  }

  /**
   * 发送表情回应
   */
  sendReactionAdd(messageId: string, emoji: string): void {
    this.send({
      cmd: 'message_reaction_add',
      data: {
        messageId,
        emoji,
        userId: this.userId
      }
    })
  }

  /**
   * 移除表情回应
   */
  sendReactionRemove(messageId: string, emoji: string): void {
    this.send({
      cmd: 'message_reaction_remove',
      data: {
        messageId,
        emoji,
        userId: this.userId
      }
    })
  }

  /**
   * 发送已读回执
   */
  sendReadReceipt(messageId: string, groupId: string): void {
    this.send({
      cmd: 'message_read',
      data: {
        messageId,
        groupId,
        userId: this.userId,
        readAt: Date.now()
      }
    })
  }

  /**
   * 发送消息编辑
   */
  sendMessageEdit(messageId: string, content: any): void {
    this.send({
      cmd: 'message_edit',
      data: {
        messageId,
        content,
        editedAt: Date.now(),
        userId: this.userId
      }
    })
  }

  /**
   * 发送消息删除
   */
  sendMessageDelete(messageId: string): void {
    this.send({
      cmd: 'message_delete',
      data: {
        messageId,
        userId: this.userId
      }
    })
  }

  /**
   * 发送在线状态
   */
  sendPresenceUpdate(status: 'online' | 'away' | 'busy'): void {
    this.send({
      cmd: 'presence_update',
      data: {
        userId: this.userId,
        status,
        lastSeen: Date.now()
      }
    })
  }
}

export default SocketManager
