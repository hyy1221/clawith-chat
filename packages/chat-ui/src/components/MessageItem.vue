<template>
  <div
    class="message-item"
    :class="{ 'message-self': isSelf, 'message-system': isSystem }"
    :data-message-id="message.id"
  >
    <template v-if="isSystem">
      <div class="message-system-content">
        {{ message.content?.text || 'System message' }}
      </div>
    </template>

    <template v-else>
      <div class="message-avatar">
        <img v-if="message.senderAvatar" :src="message.senderAvatar" :alt="message.senderName" />
        <span v-else>{{ message.senderName?.charAt(0) || '?' }}</span>
      </div>

      <div class="message-content-wrapper">
        <div v-if="!isSelf" class="message-sender">
          <span class="message-sender__name">{{ message.senderName || 'Unknown' }}</span>
          <span v-if="message.senderRole && message.senderRole !== 'user'" class="message-role">
            {{ formatSenderRole(message.senderRole) }}
          </span>
          <span class="message-time">{{ formatTime(message.createdAt) }}</span>
        </div>

        <div class="message-shell">
          <div v-if="message.quoteId" class="message-quote" @click="$emit('quote-click', message.quoteId)">
            <span class="quote-icon">
              <svg viewBox="0 0 24 24" width="12" height="12">
                <path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
              </svg>
            </span>
            <span v-if="quoteContent" class="quote-name">{{ quoteContent.senderName || 'Unknown' }}:</span>
            <span v-if="quoteContent" class="quote-text">{{ getQuotePreview(quoteContent) }}</span>
            <span v-else class="quote-text">引用消息</span>
          </div>

          <div class="message-content">
            <template v-if="message.type === 'text'">
              <div class="message-text message-rich-text">
                <MarkdownRenderer :content="textContent" />
              </div>
            </template>

            <template v-else-if="message.type === 'image'">
              <div class="message-image">
                <img
                  :src="message.content?.url"
                  :alt="message.content?.text || 'Image'"
                  @click="previewImage(message.content?.url)"
                />
              </div>
            </template>

            <template v-else-if="message.type === 'file'">
              <div class="message-file" @click="downloadFile(message.content)">
                <div class="file-icon">
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <path
                      fill="currentColor"
                      d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
                    />
                  </svg>
                </div>
                <div class="file-info">
                  <div class="file-name">{{ message.content?.name }}</div>
                  <div class="file-size">{{ formatFileSize(message.content?.size) }}</div>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="message-text">{{ JSON.stringify(message.content) }}</div>
            </template>
          </div>
        </div>

        <div class="message-actions" v-if="!isSystem">
          <button class="action-btn" @click="$emit('reply', message)" title="Reply">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
            </svg>
          </button>
          <button class="action-btn reaction-btn" @click="toggleReactions" title="React">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
          <button v-if="canEdit" class="action-btn" @click="$emit('edit', message.id, message.content?.text)" title="Edit">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button class="action-btn" v-if="canRecall" @click="$emit('recall', message.id)" title="Recall">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
          </button>
          <button v-if="canDelete" class="action-btn" @click="$emit('delete', message.id)" title="Delete">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>

        <!-- Reactions -->
        <div v-if="message.reactions?.length" class="message-reactions">
          <button
            v-for="reaction in message.reactions"
            :key="reaction.emoji"
            class="reaction-badge"
            :class="{ 'is-active': hasReacted(reaction) }"
            @click="toggleReaction(reaction.emoji)"
          >
            <span class="reaction-emoji">{{ reaction.emoji }}</span>
            <span class="reaction-count">{{ reaction.userIds.length }}</span>
          </button>
        </div>

        <!-- Read Receipt -->
        <div v-if="readCount > 0 && isSelf" class="read-receipt">
          <svg viewBox="0 0 24 24" width="12" height="12">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span>{{ readCount }}人已读</span>
        </div>

        <!-- Edited indicator -->
        <div v-if="message.editedAt" class="message-edited">（已编辑）</div>

        <!-- Reaction Picker -->
        <div v-if="showReactionPicker" class="reaction-picker" @mouseleave="showReactionPicker = false">
          <button
            v-for="emoji in defaultReactions"
            :key="emoji"
            class="reaction-picker__emoji"
            @click="pickReaction(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Message, Reaction } from '@open-chat/chat-core'
import MarkdownRenderer from './MarkdownRenderer.vue'

interface Props {
  message: Message
  currentUserId: string
  recallable?: boolean
  quoteContent?: { senderName?: string; text?: string; type?: string }
}

const props = withDefaults(defineProps<Props>(), {
  recallable: true
})

defineEmits<{
  recall: [messageId: string]
  reply: [message: Message]
  react: [messageId: string, emoji: string]
  edit: [messageId: string, content: string]
  delete: [messageId: string]
  'quote-click': [messageId: string]
}>()

const showReactionPicker = ref(false)

const defaultReactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏']

const isSelf = computed(() => props.message.senderId === props.currentUserId)
const isSystem = computed(() => props.message.type === 'system')
const isDeleted = computed(() => props.message.isDeleted)

const canRecall = computed(() => {
  if (!props.recallable) return false
  const twoMinutes = 2 * 60 * 1000
  return isSelf.value && !isDeleted.value && (Date.now() - props.message.createdAt) < twoMinutes
})

const canEdit = computed(() => {
  if (!isSelf.value || isDeleted.value) return false
  const fiveMinutes = 5 * 60 * 1000
  return props.message.type === 'text' && (Date.now() - props.message.createdAt) < fiveMinutes
})

const canDelete = computed(() => {
  return isSelf.value && !isDeleted.value
})

const readCount = computed(() => {
  if (!props.message.readBy || props.message.readBy.length === 0) return 0
  return props.message.readBy.filter(r => r.userId !== props.currentUserId).length
})

const hasReacted = (reaction: Reaction): boolean => {
  return reaction.userIds.includes(props.currentUserId)
}

const toggleReaction = (emoji: string) => {
  const reaction = props.message.reactions?.find(r => r.emoji === emoji)
  if (reaction && hasReacted(reaction)) {
    // Remove reaction - handled by parent
  } else {
    // Add reaction
  }
}

const toggleReactions = () => {
  showReactionPicker.value = !showReactionPicker.value
}

const pickReaction = (emoji: string) => {
  showReactionPicker.value = false
}

const getQuotePreview = (content: { text?: string; url?: string; name?: string }): string => {
  if (!content) return ''
  if (content.text) {
    return content.text.length > 50 ? content.text.substring(0, 50) + '...' : content.text
  }
  if (content.url) return '[图片]'
  if (content.name) return `[文件] ${content.name}`
  return ''
}

const textContent = computed(() => String(props.message.content?.text || ''))

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  if (isToday) {
    return `${hour}:${minute}`
  }

  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day} ${hour}:${minute}`
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return ''
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i]
}

const previewImage = (url?: string) => {
  if (url) {
    window.open(url, '_blank')
  }
}

const downloadFile = (content?: any) => {
  if (content?.url) {
    const link = document.createElement('a')
    link.href = content.url
    link.download = content.name
    link.click()
  }
}

const formatSenderRole = (role?: string): string => {
  if (role === 'assistant') return 'Assistant'
  if (role === 'bot') return 'Bot'
  if (role === 'system') return 'System'
  return role || ''
}
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  position: relative;
}

.message-item.message-self {
  flex-direction: row-reverse;
}

.message-item.message-system {
  justify-content: center;
}

.message-system-content {
  max-width: min(80%, 320px);
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(15, 23, 42, 0.06);
  color: #6b7280;
  font-size: 12px;
  text-align: center;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  color: #4b5563;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.05);
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-content-wrapper {
  max-width: min(74%, 320px);
  display: flex;
  flex-direction: column;
}

.message-self .message-content-wrapper {
  align-items: flex-end;
}

.message-sender {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 12px;
}

.message-sender__name {
  color: #111827;
  font-weight: 600;
}

.message-role {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.message-time,
.message-time-self {
  color: #9ca3af;
  font-size: 11px;
}

.message-shell {
  position: relative;
}

.message-quote {
  margin-bottom: 6px;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(15, 23, 42, 0.06);
  color: #4b5563;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.message-quote:hover {
  background: rgba(255, 255, 255, 0.9);
}

.quote-icon {
  margin-right: 6px;
  color: #9ca3af;
}

.quote-name {
  margin-right: 6px;
  font-weight: 700;
  color: #2563eb;
}

.message-time-self {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.message-content {
  padding: 12px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(15, 23, 42, 0.07);
  color: #111827;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.06);
  word-break: break-word;
}

.message-self .message-content {
  background: linear-gradient(135deg, #111827, #1f2937);
  border-color: rgba(17, 24, 39, 0.92);
  color: #f9fafb;
  box-shadow: 0 16px 28px rgba(17, 24, 39, 0.16);
}

.message-self .message-text {
  color: inherit;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-image img {
  max-width: 220px;
  max-height: 220px;
  border-radius: 16px;
  cursor: pointer;
}

.message-file {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 190px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.06);
  cursor: pointer;
}

.message-file:hover {
  background: #ffffff;
}

.file-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  color: #111827;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  margin-top: 2px;
  color: #9ca3af;
  font-size: 11px;
}

.message-actions {
  position: absolute;
  top: -6px;
  right: calc(100% + 8px);
  display: none;
  gap: 6px;
}

.message-item:hover .message-actions {
  display: flex;
}

.message-self .message-actions {
  right: auto;
  left: calc(100% + 8px);
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 23, 42, 0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
}

.action-btn:hover {
  color: #111827;
  background: #ffffff;
}

:deep(.mention) {
  color: #60a5fa;
  font-weight: 600;
}

/* Reactions */
.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.reaction-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.1);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.reaction-badge:hover {
  background: #f3f4f6;
}

.reaction-badge.is-active {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.reaction-emoji {
  font-size: 14px;
}

.reaction-count {
  color: #6b7280;
  font-size: 11px;
}

/* Read Receipt */
.read-receipt {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  color: #9ca3af;
  font-size: 11px;
}

.read-receipt svg {
  color: #34c759;
}

/* Message Edited */
.message-edited {
  margin-top: 2px;
  color: #9ca3af;
  font-size: 11px;
}

/* Reaction Picker */
.reaction-picker {
  position: absolute;
  top: -40px;
  left: 0;
  display: flex;
  gap: 4px;
  padding: 6px 10px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.reaction-picker__emoji {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  transition: background 0.2s;
}

.reaction-picker__emoji:hover {
  background: #f3f4f6;
  transform: scale(1.2);
}

/* Deleted message */
.message-item:has(.is-deleted) .message-content {
  opacity: 0.5;
  font-style: italic;
}

/* Self reactions */
.message-self .reaction-badge {
  background: rgba(17, 24, 39, 0.9);
}

.message-self .reaction-badge:hover {
  background: rgba(17, 24, 39, 0.7);
}

.message-self .reaction-badge .reaction-count {
  color: #9ca3af;
}
</style>
