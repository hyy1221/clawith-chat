import WebSocket from 'ws'

/**
 * Clawith Bridge - connects chat-server to Clawith backend
 *
 * When enabled, this bridge:
 * - Forwards messages to Clawith WebSocket endpoint
 * - Receives messages from Clawith agents
 * - Fetches member info from Clawith database
 */

interface ClawithBridgeConfig {
  enabled: boolean
  apiUrl: string
  wsUrl: string
  teamId: string
  token: string
}

interface BridgeMessage {
  type: string
  payload: any
}

export class ClawithBridge {
  private config: ClawithBridgeConfig
  private socket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers: Map<string, (payload: any) => void> = new Map()
  private isConnecting = false

  constructor(config: ClawithBridgeConfig) {
    this.config = config
  }

  /**
   * Connect to Clawith WebSocket
   */
  async connect(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[ClawithBridge] Bridge is disabled')
      return
    }

    if (this.isConnecting || this.socket?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        const url = `${this.config.wsUrl}?token=${this.config.token}&teamId=${this.config.teamId}`
        this.socket = new WebSocket(url)

        this.socket.on('open', () => {
          console.log('[ClawithBridge] Connected to Clawith')
          this.reconnectAttempts = 0
          this.isConnecting = false
          this.startHeartbeat()
          resolve()
        })

        this.socket.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString()) as BridgeMessage
            this.handleMessage(msg)
          } catch (error) {
            console.error('[ClawithBridge] Failed to parse message:', error)
          }
        })

        this.socket.on('close', () => {
          console.log('[ClawithBridge] Disconnected from Clawith')
          this.isConnecting = false
          this.scheduleReconnect()
        })

        this.socket.on('error', (error) => {
          console.error('[ClawithBridge] WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        })
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * Disconnect from Clawith
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  /**
   * Send message to Clawith
   */
  send(type: string, payload: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[ClawithBridge] Not connected, cannot send message')
      return
    }

    const message: BridgeMessage = { type, payload }
    this.socket.send(JSON.stringify(message))
    console.log(`[ClawithBridge] Sent message: ${type}`)
  }

  /**
   * Forward a chat message to Clawith
   */
  forwardMessage(message: any): void {
    this.send('chat_message', {
      teamId: this.config.teamId,
      message
    })
  }

  /**
   * Register a handler for incoming messages
   */
  onMessage(type: string, handler: (payload: any) => void): void {
    this.messageHandlers.set(type, handler)
  }

  /**
   * Fetch team members from Clawith API
   */
  async fetchTeamMembers(): Promise<any[]> {
    if (!this.config.enabled) {
      return []
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/teams/${this.config.teamId}/members`, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.members || []
    } catch (error) {
      console.error('[ClawithBridge] Failed to fetch team members:', error)
      return []
    }
  }

  /**
   * Get agent response from Clawith
   */
  async getAgentResponse(message: any): Promise<any> {
    if (!this.config.enabled) {
      return null
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/agents/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId: this.config.teamId,
          message
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error('[ClawithBridge] Failed to get agent response:', error)
      return null
    }
  }

  /**
   * Check if bridge is connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  private handleMessage(msg: BridgeMessage): void {
    console.log(`[ClawithBridge] Received message: ${msg.type}`)
    const handler = this.messageHandlers.get(msg.type)
    if (handler) {
      handler(msg.payload)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[ClawithBridge] Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    console.log(`[ClawithBridge] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch(() => {
        // Will retry automatically
      })
    }, delay)
  }

  private heartbeatInterval: NodeJS.Timeout | null = null

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send('ping', { timestamp: Date.now() })
      }
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
}

// Default bridge instance (disabled by default)
let bridgeInstance: ClawithBridge | null = null

/**
 * Initialize the Clawith bridge
 */
export function initClawithBridge(config: ClawithBridgeConfig): ClawithBridge {
  bridgeInstance = new ClawithBridge(config)
  return bridgeInstance
}

/**
 * Get the bridge instance
 */
export function getClawithBridge(): ClawithBridge | null {
  return bridgeInstance
}

export default ClawithBridge
