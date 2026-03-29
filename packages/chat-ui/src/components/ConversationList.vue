<template>
  <div class="conversation-list">
    <div class="conversation-list__header">
      <h3 class="conversation-list__title">Conversations</h3>
      <button class="conversation-list__add" @click="$emit('create-group')">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
    </div>

    <div class="conversation-list__search">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search conversations..."
        class="conversation-list__search-input"
      />
    </div>

    <div class="conversation-list__items">
      <!-- Pinned conversations -->
      <div v-if="pinnedConversations.length > 0" class="conversation-section">
        <div class="conversation-section__title">Pinned</div>
        <div
          v-for="conv in filteredPinnedConversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ 'is-active': conv.id === activeConversationId }"
          @click="$emit('select', conv)"
        >
          <div class="conversation-item__avatar">
            <img v-if="conv.avatar" :src="conv.avatar" :alt="conv.name" />
            <span v-else>{{ conv.name.charAt(0) }}</span>
            <span v-if="conv.onlineCount > 0" class="online-indicator"></span>
          </div>
          <div class="conversation-item__content">
            <div class="conversation-item__header">
              <span class="conversation-item__name">{{ conv.name }}</span>
              <span class="conversation-item__time">{{ formatTime(conv.lastMessageTime) }}</span>
            </div>
            <div class="conversation-item__preview">
              <span class="conversation-item__sender" v-if="conv.lastMessageSender">{{ conv.lastMessageSender }}:</span>
              <span class="conversation-item__text">{{ conv.lastMessagePreview }}</span>
            </div>
          </div>
          <div v-if="conv.unreadCount > 0" class="conversation-item__badge">
            {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
          </div>
          <button class="conversation-item__pin" @click.stop="$emit('unpin', conv.id)">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Regular conversations -->
      <div class="conversation-section">
        <div v-if="pinnedConversations.length > 0" class="conversation-section__title">All</div>
        <div
          v-for="conv in filteredRegularConversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ 'is-active': conv.id === activeConversationId }"
          @click="$emit('select', conv)"
        >
          <div class="conversation-item__avatar">
            <img v-if="conv.avatar" :src="conv.avatar" :alt="conv.name" />
            <span v-else>{{ conv.name.charAt(0) }}</span>
            <span v-if="conv.onlineCount > 0" class="online-indicator"></span>
          </div>
          <div class="conversation-item__content">
            <div class="conversation-item__header">
              <span class="conversation-item__name">{{ conv.name }}</span>
              <span class="conversation-item__time">{{ formatTime(conv.lastMessageTime) }}</span>
            </div>
            <div class="conversation-item__preview">
              <span class="conversation-item__sender" v-if="conv.lastMessageSender">{{ conv.lastMessageSender }}:</span>
              <span class="conversation-item__text">{{ conv.lastMessagePreview }}</span>
            </div>
          </div>
          <div v-if="conv.unreadCount > 0" class="conversation-item__badge">
            {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
          </div>
          <button class="conversation-item__pin" @click.stop="$emit('pin', conv.id)">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="filteredConversations.length === 0" class="conversation-list__empty">
        <p v-if="searchQuery">No conversations found</p>
        <p v-else>No conversations yet</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export interface Conversation {
  id: string
  name: string
  avatar?: string
  lastMessagePreview?: string
  lastMessageSender?: string
  lastMessageTime?: number
  unreadCount: number
  isPinned: boolean
  onlineCount: number
}

interface Props {
  conversations: Conversation[]
  activeConversationId?: string
}

const props = withDefaults(defineProps<Props>(), {
  conversations: () => [],
  activeConversationId: ''
})

defineEmits<{
  'select': [conversation: Conversation]
  'pin': [conversationId: string]
  'unpin': [conversationId: string]
  'create-group': []
}>()

const searchQuery = ref('')

const filteredConversations = computed(() => {
  if (!searchQuery.value) return props.conversations
  const query = searchQuery.value.toLowerCase()
  return props.conversations.filter(conv =>
    conv.name.toLowerCase().includes(query)
  )
})

const pinnedConversations = computed(() =>
  filteredConversations.value.filter(conv => conv.isPinned)
)

const filteredPinnedConversations = computed(() =>
  filteredConversations.value.filter(conv => conv.isPinned)
)

const filteredRegularConversations = computed(() =>
  filteredConversations.value.filter(conv => !conv.isPinned)
)

function formatTime(timestamp?: number): string {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const oneDay = 24 * 60 * 60 * 1000

  if (diff < 60000) {
    return 'now'
  }

  if (diff < oneDay && date.toDateString() === now.toDateString()) {
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${hour}:${minute}`
  }

  if (diff < 2 * oneDay) {
    return 'Yesterday'
  }

  if (diff < 7 * oneDay) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[date.getDay()]
  }

  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}
</script>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.conversation-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.conversation-list__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.conversation-list__add {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #111827;
  border-radius: 8px;
  cursor: pointer;
  color: white;
  transition: background 0.2s;
}

.conversation-list__add:hover {
  background: #1f2937;
}

.conversation-list__search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 16px;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.04);
  border-radius: 10px;
  color: #9ca3af;
}

.conversation-list__search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: #111827;
}

.conversation-list__search-input::placeholder {
  color: #9ca3af;
}

.conversation-list__items {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.conversation-section {
  margin-bottom: 8px;
}

.conversation-section__title {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.conversation-item:hover {
  background: rgba(15, 23, 42, 0.04);
}

.conversation-item.is-active {
  background: rgba(17, 24, 39, 0.06);
}

.conversation-item__avatar {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  color: #6b7280;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  overflow: hidden;
}

.conversation-item__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #34c759;
  border: 2px solid white;
  border-radius: 50%;
}

.conversation-item__content {
  flex: 1;
  min-width: 0;
}

.conversation-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.conversation-item__name {
  font-weight: 600;
  font-size: 14px;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-item__time {
  font-size: 11px;
  color: #9ca3af;
  flex-shrink: 0;
}

.conversation-item__preview {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #6b7280;
}

.conversation-item__sender {
  margin-right: 4px;
  font-weight: 500;
}

.conversation-item__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #9ca3af;
}

.conversation-item__badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.conversation-item__pin {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #9ca3af;
  opacity: 0;
  transition: opacity 0.2s;
}

.conversation-item:hover .conversation-item__pin {
  opacity: 1;
}

.conversation-item__pin:hover {
  background: rgba(15, 23, 42, 0.05);
  color: #6b7280;
}

.conversation-list__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
}
</style>
