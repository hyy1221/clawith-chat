<template>
  <div class="search-panel">
    <div class="search-panel__header">
      <div class="search-panel__title">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <span>Search Messages</span>
      </div>
      <button class="search-panel__close" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <div class="search-panel__input-wrapper">
      <input
        v-model="searchKeyword"
        class="search-panel__input"
        type="text"
        placeholder="Search messages..."
        @input="handleSearch"
      />
      <button v-if="searchKeyword" class="search-panel__clear" @click="clearSearch">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <div class="search-panel__filters">
      <select v-model="dateFilter" class="search-filter" @change="handleSearch">
        <option value="">All time</option>
        <option value="today">Today</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
      </select>
    </div>

    <div v-if="isSearching" class="search-panel__loading">
      <div class="loading-spinner"></div>
      <span>Searching...</span>
    </div>

    <div v-else-if="searchKeyword && results.length === 0" class="search-panel__empty">
      <svg viewBox="0 0 24 24" width="48" height="48">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <p>No messages found for "{{ searchKeyword }}"</p>
    </div>

    <div v-else-if="!searchKeyword" class="search-panel__hint">
      <p>Enter a keyword to search messages</p>
    </div>

    <div v-else class="search-panel__results">
      <div class="search-results__count">
        {{ results.length }} result{{ results.length !== 1 ? 's' : '' }} found
      </div>

      <div
        v-for="result in results"
        :key="result.id"
        class="search-result"
        :data-message-id="result.id"
        @click="$emit('select', result)"
      >
        <div class="search-result__header">
          <span class="search-result__sender">{{ result.senderName || 'Unknown' }}</span>
          <span class="search-result__time">{{ formatTime(result.createdAt) }}</span>
        </div>
        <div class="search-result__content" v-html="highlightKeyword(result.content?.text || '')"></div>
        <div class="search-result__context">
          <span class="search-result__group">{{ result.groupName || 'Group' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Message } from '@open-chat/chat-core'

interface Props {
  results: Message[]
  isSearching?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  results: () => [],
  isSearching: false
})

const emit = defineEmits<{
  close: []
  search: [keyword: string, dateFilter: string]
  select: [message: Message]
}>()

const searchKeyword = ref('')
const dateFilter = ref('')

function handleSearch() {
  emit('search', searchKeyword.value, dateFilter.value)
}

function clearSearch() {
  searchKeyword.value = ''
  dateFilter.value = ''
  emit('search', '', '')
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const oneDay = 24 * 60 * 60 * 1000

  if (diff < oneDay && date.toDateString() === now.toDateString()) {
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `Today ${hour}:${minute}`
  }

  if (diff < 7 * oneDay) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return `${days[date.getDay()]} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

function highlightKeyword(text: string): string {
  if (!searchKeyword.value) return escapeHtml(text)
  const regex = new RegExp(`(${escapeRegex(searchKeyword.value)})`, 'gi')
  return escapeHtml(text).replace(regex, '<mark>$1</mark>')
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<style scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 16px;
  overflow: hidden;
}

.search-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.search-panel__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #111827;
}

.search-panel__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
}

.search-panel__close:hover {
  background: rgba(15, 23, 42, 0.05);
  color: #111827;
}

.search-panel__input-wrapper {
  position: relative;
  padding: 12px 16px;
}

.search-panel__input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-panel__input:focus {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-panel__clear {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
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
}

.search-panel__clear:hover {
  background: rgba(15, 23, 42, 0.05);
  color: #6b7280;
}

.search-panel__filters {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
}

.search-filter {
  padding: 6px 12px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.search-panel__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #6b7280;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.search-panel__empty,
.search-panel__hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: #9ca3af;
  text-align: center;
}

.search-panel__empty svg {
  opacity: 0.3;
  margin-bottom: 16px;
}

.search-panel__empty p,
.search-panel__hint p {
  margin: 0;
  font-size: 14px;
}

.search-panel__results {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.search-results__count {
  padding: 8px 0;
  font-size: 12px;
  color: #6b7280;
}

.search-result {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result:hover {
  background: rgba(15, 23, 42, 0.03);
}

.search-result__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.search-result__sender {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
}

.search-result__time {
  color: #9ca3af;
  font-size: 11px;
}

.search-result__content {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
  word-break: break-word;
}

.search-result__content :deep(mark) {
  background: rgba(254, 215, 170, 0.8);
  color: #92400e;
  padding: 0 2px;
  border-radius: 2px;
}

.search-result__context {
  margin-top: 6px;
}

.search-result__group {
  font-size: 11px;
  color: #6b7280;
  background: rgba(15, 23, 42, 0.05);
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
