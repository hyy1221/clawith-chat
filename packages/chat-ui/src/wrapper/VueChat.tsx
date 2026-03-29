import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ChatSDK, ChatConfig, ClawithConfig, Message, Group, User } from '@open-chat/chat-core'

export interface VueChatProps {
  /** WebSocket URL for the chat server */
  wsUrl?: string
  /** User ID */
  userId: string
  /** User display name */
  userName?: string
  /** User avatar URL */
  userAvatar?: string
  /** Group ID to join */
  groupId?: string
  /** Group name */
  groupName?: string
  /** Session ID for multi-session support */
  sessionId?: string
  /** Clawith configuration (alternative to wsUrl) */
  clawithConfig?: ClawithConfig
  /** CSS class for the container */
  className?: string
  /** Style object */
  style?: React.CSSProperties
  /** Callback when connected */
  onConnect?: () => void
  /** Callback when disconnected */
  onDisconnect?: () => void
  /** Callback when message received */
  onMessage?: (message: Message) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
}

/**
 * VueChat - React wrapper for the Vue ChatWindow component
 *
 * This component initializes the ChatSDK and renders the Vue ChatWindow
 * inside a React component using a custom mount point.
 */
export const VueChat: React.FC<VueChatProps> = ({
  wsUrl = 'ws://localhost:3001',
  userId,
  userName = 'User',
  userAvatar,
  groupId,
  groupName,
  sessionId,
  clawithConfig,
  className = '',
  style,
  onConnect,
  onDisconnect,
  onMessage,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sdkRef = useRef<ChatSDK | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize SDK and Vue app
  useEffect(() => {
    if (!containerRef.current) return

    let mounted = true

    const initChat = async () => {
      try {
        // Create SDK configuration
        let config: ChatConfig

        if (clawithConfig) {
          config = {
            userId,
            userName,
            userAvatar,
            wsUrl: clawithConfig.wsUrl || `${clawithConfig.apiUrl.replace(/^http/, 'ws')}/ws`,
            groupId: groupId || clawithConfig.teamId,
            groupName,
            sessionId
          }
        } else {
          config = {
            userId,
            userName,
            userAvatar,
            wsUrl,
            groupId,
            groupName,
            sessionId
          }
        }

        // Create SDK instance
        const sdk = new ChatSDK(config)
        sdkRef.current = sdk

        // Register event listeners
        sdk.onConnect(() => {
          if (mounted) {
            onConnect?.()
          }
        })

        sdk.onDisconnect(() => {
          if (mounted) {
            onDisconnect?.()
          }
        })

        sdk.onReceive((message) => {
          if (mounted) {
            onMessage?.(message)
          }
        })

        // Connect
        await sdk.connect()
        setIsReady(true)
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize chat'
          setError(errorMessage)
          onError?.(err instanceof Error ? err : new Error(errorMessage))
        }
      }
    }

    initChat()

    return () => {
      mounted = false
      sdkRef.current?.destroy()
    }
  }, [wsUrl, userId, userName, userAvatar, groupId, groupName, sessionId, clawithConfig])

  // Get SDK for external access
  const getSdk = useCallback(() => sdkRef.current, [])

  // Expose SDK methods through ref
  useEffect(() => {
    if (containerRef.current && 'chatSdk' in containerRef.current) {
      (containerRef.current as any).chatSdk = sdkRef.current
    }
  }, [isReady, sdkRef.current])

  if (error) {
    return (
      <div className={`vue-chat-error ${className}`} style={style}>
        <div className="vue-chat-error__content">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <h3>Failed to connect</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
        <style>{`
          .vue-chat-error {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            padding: 24px;
            background: var(--oc-bg-secondary, #18181c);
            border-radius: 16px;
          }
          .vue-chat-error__content {
            text-align: center;
            color: var(--oc-text-secondary, #a1a1aa);
          }
          .vue-chat-error__content svg {
            color: var(--oc-accent-danger, #ef4444);
            margin-bottom: 16px;
          }
          .vue-chat-error__content h3 {
            margin: 0 0 8px;
            color: var(--oc-text-primary, #fafafa);
          }
          .vue-chat-error__content p {
            margin: 0 0 16px;
          }
          .vue-chat-error__content button {
            padding: 8px 16px;
            background: var(--oc-accent-primary, #6366f1);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`vue-chat ${className}`}
      style={{
        ...style,
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {!isReady && (
        <div className="vue-chat-loading">
          <div className="vue-chat-loading__spinner"></div>
          <p>Connecting to chat...</p>
        </div>
      )}
      <div
        id="vue-chat-window"
        className="vue-chat-window"
        style={{
          display: isReady ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100%',
          flex: 1
        }}
      />
      <style>{`
        .vue-chat-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 16px;
          color: var(--oc-text-secondary, #a1a1aa);
        }
        .vue-chat-loading__spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--oc-border-default, rgba(255,255,255,0.08));
          border-top-color: var(--oc-accent-primary, #6366f1);
          border-radius: 50%;
          animation: vue-chat-spin 0.8s linear infinite;
        }
        @keyframes vue-chat-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/**
 * ChatWindow component for embedding in React apps
 *
 * This is a simpler version that renders the chat UI directly.
 * Use VueChat for full SDK integration.
 */
export const ChatWindow: React.FC<Omit<VueChatProps, 'className' | 'style'>> = (props) => {
  return <VueChat {...props} />
}

export default VueChat
