<template>
  <div class="chat-window">
    <header class="chat-header">
      <div class="chat-header__main">
        <div class="chat-avatar">
          <img v-if="groupAvatar" :src="groupAvatar" alt="group avatar" />
          <span v-else>{{ (groupName || 'Chat').charAt(0) }}</span>
        </div>
        <div class="chat-header__copy">
          <div class="chat-title-row">
            <div class="chat-title">{{ groupName || 'OpenChat' }}</div>
            <span class="chat-chip">{{ memberCount }} members</span>
          </div>
          <div class="chat-subtitle">
            <span class="chat-status-dot" :class="{ 'is-connected': isConnected }"></span>
            <span>{{ isConnected ? 'Ready for collaboration' : 'Waiting for connection' }}</span>
          </div>
        </div>
      </div>

      <button class="chat-search-toggle" type="button" @click="toggleSearch">
        {{ showSearch ? 'Done' : 'Search' }}
      </button>
    </header>

    <section v-if="showSearch" class="chat-search-panel">
      <SearchPanel
        :results="searchResults"
        :isSearching="isSearching"
        @close="toggleSearch"
        @search="handleGlobalSearch"
        @select="handleSearchSelect"
      />
    </section>

    <section v-else class="chat-sessions">
      <button class="chat-session chat-session--new" type="button" @click="handleCreateSession">
        New Session
      </button>
      <button
        v-for="session in sessions"
        :key="session.id"
        type="button"
        :class="['chat-session', { 'is-active': session.id === activeSessionId }]"
        @click="handleSelectSession(session.id)"
      >
        <span class="chat-session__title">{{ session.title }}</span>
        <span v-if="session.unreadCount > 0" class="chat-session__badge">
          {{ session.unreadCount > 99 ? '99+' : session.unreadCount }}
        </span>
      </button>
    </section>

    <section ref="messageListRef" class="chat-messages">
      <div v-if="!visibleMessages.length" class="chat-empty">
        <div class="chat-empty__icon">{{ (groupName || 'C').charAt(0) }}</div>
        <h3>No messages yet</h3>
        <p>
          Join the room, say hello, and start the thread for {{ groupName || 'your team' }}.
        </p>
      </div>

      <MessageItem
        v-for="message in visibleMessages"
        :key="message.id"
        :message="message"
        :currentUserId="currentUserId"
        :quoteContent="getQuoteContent(message.quoteId)"
        @recall="handleRecall"
        @reply="handleReply"
        @react="handleReaction"
        @edit="handleEdit"
        @delete="handleDelete"
        @quote-click="handleQuoteClick"
      />

      <!-- Typing Indicator -->
      <div v-if="typingUsers.length > 0" class="typing-indicator">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="typing-text">{{ typingText }}</span>
      </div>
    </section>

    <section v-if="replyMessage" class="chat-reply">
      <div class="chat-reply__content">
        <div class="chat-reply__meta">Replying to {{ replyMessage.senderName || 'Unknown' }}</div>
        <div class="chat-reply__text">{{ replyMessage.content?.text || '' }}</div>
      </div>
      <button class="chat-reply__clear" type="button" @click="replyMessage = null">Clear</button>
    </section>

    <section class="chat-composer">
      <div class="chat-toolbar">
        <button class="chat-toolbar__btn" type="button" @click="toggleMention">
          @ Mention
        </button>
        <div class="chat-toolbar__hint">
          {{ isConnected ? 'Enter to send' : 'Connect to start' }}
        </div>
      </div>

      <MentionPanel
        v-if="showMention"
        :members="members"
        @select="handleMentionSelect"
        @close="showMention = false"
      />

      <textarea
        ref="inputRef"
        v-model="inputText"
        class="chat-input"
        placeholder="Write a message"
        :disabled="!isConnected"
        @input="handleInput"
        @keydown="handleKeydown"
      ></textarea>

      <div class="chat-composer__footer">
        <div class="chat-composer__hint">Shift + Enter for a new line</div>
        <button class="chat-send" type="button" :disabled="!canSend || !isConnected" @click="handleSend">
          Send
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { Group, Message, User } from '@open-chat/chat-core'
import MentionPanel from './MentionPanel.vue'
import MessageItem from './MessageItem.vue'
import SearchPanel from './SearchPanel.vue'

interface ChatSdk {
  userId?: string
  connected?: boolean
  sessionId?: string | null
  getMessages?: () => Message[]
  getMembers?: () => User[]
  getCurrentGroup?: () => Group | undefined
  getTypingUsers?: () => Array<{ userId: string; userName: string }>
  joinGroup?: (groupId: string, groupName?: string) => void
  sendText?: (text: string, mentions?: string[]) => Promise<Message>
  recallMessage?: (messageId: string) => void
  createSession?: () => string
  setSession?: (sessionId: string | null) => void
  startTyping?: () => void
  stopTyping?: () => void
  addReaction?: (messageId: string, emoji: string) => void
  removeReaction?: (messageId: string, emoji: string) => void
  editMessage?: (messageId: string, content: any) => boolean
  deleteMessage?: (messageId: string) => boolean
  onReceive?: (callback: (message: Message) => void) => () => void
  onRecall?: (callback: (data: { messageId: string }) => void) => () => void
  onMemberUpdate?: (callback: (data: { groupId: string; members: User[] }) => void) => () => void
  onConnect?: (callback: () => void) => () => void
  onDisconnect?: (callback: () => void) => () => void
  onSyncComplete?: (callback: (data: { groupId: string; messages: Message[] }) => void) => () => void
  onTypingStart?: (callback: (data: { groupId: string; userId: string; userName: string }) => void) => () => void
  onTypingStop?: (callback: (data: { groupId: string; userId: string }) => void) => () => void
  onReactionAdd?: (callback: (data: { messageId: string; emoji: string; userId: string }) => void) => () => void
  onReactionRemove?: (callback: (data: { messageId: string; emoji: string; userId: string }) => void) => () => void
  onMessageEdit?: (callback: (data: { messageId: string; content: any; editedAt: number }) => void) => () => void
  onMessageDelete?: (callback: (data: { messageId: string }) => void) => () => void
}

interface Props {
  sdk: ChatSdk | null
  groupId?: string
  groupName?: string
  groupAvatar?: string
}

const props = withDefaults(defineProps<Props>(), {
  groupId: '',
  groupName: 'OpenChat',
  groupAvatar: '',
})

const messages = ref<Message[]>([])
const members = ref<User[]>([])
const inputText = ref('')
const searchKeyword = ref('')
const showSearch = ref(false)
const showMention = ref(false)
const isConnected = ref(false)
const replyMessage = ref<Message | null>(null)
const messageListRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const disposers: Array<() => void> = []
const sessions = ref<Array<{ id: string; title: string; unreadCount: number }>>([])
const activeSessionId = ref<string | null>(null)
const typingUsers = ref<Array<{ userId: string; userName: string }>>([])
const editingMessageId = ref<string | null>(null)
const editContent = ref('')
const searchResults = ref<Message[]>([])
const isSearching = ref(false)
const searchDateFilter = ref('')

const currentUserId = computed(() => props.sdk?.userId || '')
const memberCount = computed(() => members.value.length)
const canSend = computed(() => inputText.value.trim().length > 0 && !editingMessageId.value)
const visibleMessages = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  let msgs = messages.value
  if (!keyword) return msgs

  return msgs.filter((message) => {
    const sender = String(message.senderName || '').toLowerCase()
    const content = String(message.content?.text || '').toLowerCase()
    return sender.includes(keyword) || content.includes(keyword)
  })
})

const typingText = computed(() => {
  const users = typingUsers.value
  if (users.length === 0) return ''
  if (users.length === 1) return `${users[0].userName} 正在输入...`
  if (users.length === 2) return `${users[0].userName} 和 ${users[1].userName} 正在输入...`
  return `${users[0].userName} 等${users.length}人正在输入...`
})

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

function upsertMessage(message: Message) {
  const existingIndex = messages.value.findIndex((item) => item.id === message.id)
  if (existingIndex >= 0) {
    messages.value.splice(existingIndex, 1, message)
  } else {
    messages.value.push(message)
  }

  messages.value.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
  scrollToBottom()
}

function loadCurrentMessages() {
  messages.value = props.sdk?.getMessages?.() || []
  scrollToBottom()
}

function buildSessionTitle(_sessionId: string, index: number): string {
  return `Session ${index + 1}`
}

function ensureSession(sessionId: string | null | undefined, title?: string) {
  const resolvedSessionId = sessionId || '__default__'
  const existing = sessions.value.find((session) => session.id === resolvedSessionId)
  if (existing) {
    if (title && existing.title.startsWith('Session ')) {
      existing.title = title
    }
    return existing
  }

  const session = {
    id: resolvedSessionId,
    title: title || buildSessionTitle(resolvedSessionId, sessions.value.length),
    unreadCount: 0,
  }
  sessions.value.push(session)
  return session
}

function joinResolvedGroup() {
  if (!props.sdk?.joinGroup || !props.groupId) return

  const currentGroupId = props.sdk.getCurrentGroup?.()?.id
  if (currentGroupId === props.groupId) return

  props.sdk.joinGroup(props.groupId, props.groupName)
}

async function handleSend() {
  if (!props.sdk?.sendText || !canSend.value || !isConnected.value) return

  // 如果正在编辑，先提交编辑
  if (editingMessageId.value) {
    handleEditSubmit()
    return
  }

  const text = inputText.value.trim()
  const mentions = members.value
    .filter((member) => text.includes(`@${member.name}`))
    .map((member) => member.id)

  await props.sdk.sendText(text, mentions)
  inputText.value = ''
  replyMessage.value = null
  showMention.value = false
  props.sdk?.stopTyping?.()
  inputRef.value?.focus()
  loadCurrentMessages()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void handleSend()
  }
}

function handleInput() {
  // 开始打字
  if (inputText.value.trim().length > 0) {
    props.sdk?.startTyping?.()
  }

  const value = inputText.value
  const atIndex = value.lastIndexOf('@')
  showMention.value = atIndex >= 0 && !value.slice(atIndex + 1).includes(' ')
}

function handleMentionSelect(user: User) {
  const atIndex = inputText.value.lastIndexOf('@')
  if (atIndex === -1) return
  inputText.value = `${inputText.value.slice(0, atIndex)}@${user.name} `
  showMention.value = false
  inputRef.value?.focus()
}

function handleRecall(messageId: string) {
  props.sdk?.recallMessage?.(messageId)
}

function handleReply(message: Message) {
  replyMessage.value = message
  inputRef.value?.focus()
}

function handleReaction(messageId: string, emoji: string) {
  props.sdk?.addReaction?.(messageId, emoji)
}

function handleEdit(messageId: string, content: string) {
  editingMessageId.value = messageId
  editContent.value = content
  inputText.value = content
  inputRef.value?.focus()
}

function handleDelete(messageId: string) {
  props.sdk?.deleteMessage?.(messageId)
}

function handleEditSubmit() {
  if (!editingMessageId.value || !editContent.value.trim()) return

  const success = props.sdk?.editMessage?.(editingMessageId.value, { text: editContent.value.trim() })
  if (success) {
    editingMessageId.value = null
    editContent.value = ''
    inputText.value = ''
  }
}

function handleQuoteClick(messageId: string) {
  // 滚动到引用的消息
  const element = document.querySelector(`[data-message-id="${messageId}"]`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.classList.add('highlight')
    setTimeout(() => element.classList.remove('highlight'), 2000)
  }
}

function getQuoteContent(quoteId?: string): { senderName?: string; text?: string; type?: string } | undefined {
  if (!quoteId) return undefined
  const quotedMessage = messages.value.find(m => m.id === quoteId)
  if (!quotedMessage) return undefined
  return {
    senderName: quotedMessage.senderName,
    text: quotedMessage.content?.text,
    type: quotedMessage.type
  }
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchKeyword.value = ''
    searchResults.value = []
  }
}

function handleGlobalSearch(keyword: string, dateFilter: string) {
  searchKeyword.value = keyword
  searchDateFilter.value = dateFilter

  if (!keyword.trim()) {
    searchResults.value = []
    return
  }

  isSearching.value = true

  // Use debounced search
  setTimeout(() => {
    const results = props.sdk?.searchAll?.(keyword, dateFilter) || []
    searchResults.value = results
    isSearching.value = false
  }, 300)
}

function handleSearchSelect(message: Message) {
  // Navigate to the message in the current view
  toggleSearch()

  // Scroll to the message
  nextTick(() => {
    const element = document.querySelector(`[data-message-id="${message.id}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('highlight')
      setTimeout(() => element.classList.remove('highlight'), 2000)
    }
  })
}

function toggleMention() {
  showMention.value = !showMention.value
  inputRef.value?.focus()
}

function handleCreateSession() {
  if (!props.sdk?.createSession) return
  const sessionId = props.sdk.createSession()
  const session = ensureSession(sessionId)
  session.unreadCount = 0
  activeSessionId.value = session.id
  loadCurrentMessages()
}

function handleSelectSession(sessionId: string) {
  activeSessionId.value = sessionId
  props.sdk?.setSession?.(sessionId === '__default__' ? null : sessionId)
  const session = ensureSession(sessionId)
  session.unreadCount = 0
  loadCurrentMessages()
}

function registerListeners() {
  if (!props.sdk) return

  disposers.push(
    props.sdk.onReceive?.((message) => {
      const sessionId = message.sessionId || '__default__'
      const session = ensureSession(sessionId)
      if (sessionId === (activeSessionId.value || '__default__')) {
        upsertMessage(message)
      } else {
        session.unreadCount += 1
      }
    }) || (() => undefined)
  )

  disposers.push(
    props.sdk.onRecall?.(({ messageId }) => {
      const target = messages.value.find((item) => item.id === messageId)
      if (target) {
        target.type = 'system'
        target.content = { text: 'This message was recalled.' }
      }
    }) || (() => undefined)
  )

  disposers.push(
    props.sdk.onMemberUpdate?.((payload) => {
      members.value = payload.members || []
    }) || (() => undefined)
  )

  disposers.push(
    props.sdk.onSyncComplete?.((payload) => {
      if (!props.groupId || payload.groupId === props.groupId) {
        loadCurrentMessages()
      }
    }) || (() => undefined)
  )

  // 打字事件
  disposers.push(
    props.sdk.onTypingStart?.((data) => {
      if (!typingUsers.value.find(u => u.userId === data.userId)) {
        typingUsers.value.push({ userId: data.userId, userName: data.userName })
      }
    }) || (() => undefined)
  )

  disposers.push(
    props.sdk.onTypingStop?.((data) => {
      typingUsers.value = typingUsers.value.filter(u => u.userId !== data.userId)
    }) || (() => undefined)
  )

  // 表情回应
  disposers.push(
    props.sdk.onReactionAdd?.((data) => {
      const message = messages.value.find(m => m.id === data.messageId)
      if (message) {
        if (!message.reactions) message.reactions = []
        const existing = message.reactions.find(r => r.emoji === data.emoji)
        if (existing) {
          if (!existing.userIds.includes(data.userId)) {
            existing.userIds.push(data.userId)
          }
        } else {
          message.reactions.push({ emoji: data.emoji, userIds: [data.userId] })
        }
      }
    }) || (() => undefined)
  )

  disposers.push(
    props.sdk.onReactionRemove?.((data) => {
      const message = messages.value.find(m => m.id === data.messageId)
      if (message && message.reactions) {
        const existing = message.reactions.find(r => r.emoji === data.emoji)
        if (existing) {
          existing.userIds = existing.userIds.filter(id => id !== data.userId)
        }
      }
    }) || (() => undefined)
  )

  // 消息编辑
  disposers.push(
    props.sdk.onMessageEdit?.((data) => {
      const message = messages.value.find(m => m.id === data.messageId)
      if (message) {
        if (!message.editHistory) message.editHistory = []
        message.editHistory.push({ content: message.content, editedAt: message.editedAt || message.createdAt })
        message.content = data.content
        message.editedAt = data.editedAt
      }
    }) || (() => undefined)
  )

  // 消息删除
  disposers.push(
    props.sdk.onMessageDelete?.((data) => {
      const message = messages.value.find(m => m.id === data.messageId)
      if (message) {
        message.isDeleted = true
        message.content = { text: '消息已删除' }
        message.type = 'system'
      }
    }) || (() => undefined)
  )

  disposers.push(props.sdk.onConnect?.(() => { isConnected.value = true }) || (() => undefined))
  disposers.push(props.sdk.onDisconnect?.(() => { isConnected.value = false }) || (() => undefined))
}

onMounted(() => {
  if (!props.sdk) return
  
  let initialSessionId: string | null = null
  if (props.sdk && typeof props.sdk.sessionId === 'string') {
    initialSessionId = props.sdk.sessionId
  } else if (props.sdk && typeof props.sdk.createSession === 'function') {
    initialSessionId = props.sdk.createSession()
  }
  
  activeSessionId.value = initialSessionId || '__default__'
  ensureSession(activeSessionId.value)

  if (initialSessionId) {
    props.sdk?.setSession?.(initialSessionId)
  }

  messages.value = props.sdk?.getMessages?.() || []
  members.value = props.sdk?.getMembers?.() || []
  isConnected.value = Boolean(props.sdk?.connected)

  registerListeners()
  joinResolvedGroup()
  loadCurrentMessages()
})

onUnmounted(() => {
  while (disposers.length) {
    const dispose = disposers.pop()
    dispose?.()
  }
})
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  width: min(100%, 480px);
  height: 720px;
  overflow: hidden;
  border-radius: 32px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 248, 250, 0.98));
  box-shadow:
    0 34px 70px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(28px);
}

.chat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 18px;
  background:
    radial-gradient(circle at top left, rgba(125, 211, 252, 0.2), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(250, 250, 252, 0.84));
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.chat-header__main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.chat-header__copy {
  min-width: 0;
}

.chat-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chat-avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(235, 240, 247, 0.9));
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  overflow: hidden;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #111827;
}

.chat-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.chat-subtitle {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 12px;
}

.chat-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.9);
  box-shadow: 0 0 0 6px rgba(148, 163, 184, 0.12);
}

.chat-status-dot.is-connected {
  background: #34c759;
  box-shadow: 0 0 0 6px rgba(52, 199, 89, 0.15);
}

.chat-search-toggle,
.chat-toolbar__btn,
.chat-reply__clear,
.chat-send,
.chat-session {
  border: none;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.chat-search-toggle,
.chat-toolbar__btn,
.chat-reply__clear {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #374151;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}

.chat-search-toggle:hover,
.chat-toolbar__btn:hover,
.chat-reply__clear:hover {
  transform: translateY(-1px);
  background: #ffffff;
}

.chat-search {
  padding: 14px 18px 0;
}

.chat-search__input,
.chat-input {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  color: #111827;
  font: inherit;
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.chat-search__input {
  min-height: 46px;
  padding: 0 16px;
}

.chat-search__input:focus,
.chat-input:focus {
  border-color: rgba(96, 165, 250, 0.6);
  box-shadow:
    0 0 0 4px rgba(96, 165, 250, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.chat-sessions {
  display: flex;
  gap: 10px;
  padding: 16px 18px 14px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  background: rgba(255, 255, 255, 0.46);
}

.chat-session {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #4b5563;
  white-space: nowrap;
  flex: 0 0 auto;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.chat-session:hover {
  transform: translateY(-1px);
}

.chat-session.is-active {
  background: #111827;
  color: #f9fafb;
  border-color: #111827;
}

.chat-session--new {
  border-style: dashed;
}

.chat-session__title {
  max-width: 132px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-session__badge {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
  font-size: 11px;
  line-height: 20px;
  text-align: center;
}

.chat-messages {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 20px 18px 8px;
  background:
    radial-gradient(circle at top right, rgba(191, 219, 254, 0.22), transparent 25%),
    linear-gradient(180deg, #f8f9fb 0%, #f4f6f8 100%);
}

.chat-empty {
  min-height: 100%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  padding: 40px 24px;
  text-align: center;
  color: #6b7280;
}

.chat-empty__icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #111827;
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
}

.chat-empty h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  letter-spacing: -0.02em;
}

.chat-empty p {
  margin: 0;
  max-width: 28ch;
  line-height: 1.7;
}

.chat-reply {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.82);
}

.chat-reply__content {
  flex: 1;
  min-width: 0;
}

.chat-reply__meta {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #2563eb;
}

.chat-reply__text {
  margin-top: 4px;
  font-size: 12px;
  color: #4b5563;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-composer {
  position: relative;
  padding: 16px 18px 18px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(249, 250, 251, 0.98));
}

.chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.chat-toolbar__hint,
.chat-composer__hint {
  color: #6b7280;
  font-size: 12px;
}

.chat-input {
  min-height: 108px;
  padding: 14px 16px;
  resize: none;
  line-height: 1.6;
}

.chat-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-composer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.chat-send {
  min-width: 92px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 16px;
  background: #111827;
  color: #f9fafb;
  font-weight: 700;
  box-shadow: 0 16px 28px rgba(17, 24, 39, 0.16);
}

.chat-send:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #0f172a;
}

.chat-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 16px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: 0s;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

.typing-text {
  color: #6b7280;
  font-size: 12px;
}

/* Message highlight on scroll-to */
:deep(.highlight) {
  animation: highlight-pulse 2s ease-out;
}

@keyframes highlight-pulse {
  0% {
    background: rgba(96, 165, 250, 0.3);
  }
  100% {
    background: transparent;
  }
}

/* Search Panel */
.chat-search-panel {
  flex: 1;
  overflow: hidden;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}
</style>
