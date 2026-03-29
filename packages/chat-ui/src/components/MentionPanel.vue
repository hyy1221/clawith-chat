<template>
  <div class="mention-panel">
    <div class="mention-header">
      <span>Mention someone</span>
      <button class="close-btn" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    <div class="mention-list">
      <div
        v-for="member in filteredMembers"
        :key="member.id"
        class="mention-item"
        @click="handleSelect(member)"
      >
        <div class="member-avatar">
          <img v-if="member.avatar" :src="member.avatar" :alt="member.name" />
          <span v-else>{{ member.name.charAt(0) }}</span>
        </div>
        <div class="member-info">
          <div class="member-name">{{ member.name }}</div>
          <div class="member-role">
            {{ member.role === 'bot' ? '数字员工' : '团队成员（自然人）' }}
          </div>
        </div>
        <span v-if="member.role === 'bot'" class="bot-tag">数字员工</span>
      </div>
      <div v-if="filteredMembers.length === 0" class="no-members">
        No members available
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@open-chat/chat-core'

interface Props {
  members: User[]
  filter?: string
}

const props = withDefaults(defineProps<Props>(), {
  filter: ''
})

const emit = defineEmits<{
  select: [user: User]
  close: []
}>()

const filteredMembers = computed(() => {
  if (!props.filter) return props.members
  const keyword = props.filter.toLowerCase()
  return props.members.filter((member) => member.name.toLowerCase().includes(keyword))
})

const handleSelect = (member: User) => {
  emit('select', member)
}
</script>

<style scoped>
.mention-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 12px);
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(24px);
  z-index: 100;
}

.mention-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  color: #4b5563;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.04);
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(15, 23, 42, 0.08);
  color: #111827;
}

.mention-list {
  max-height: 220px;
  overflow-y: auto;
  padding: 8px;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}

.mention-item:hover {
  background: rgba(15, 23, 42, 0.04);
  transform: translateY(-1px);
}

.member-avatar {
  width: 34px;
  height: 34px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #4b5563;
  overflow: hidden;
  flex-shrink: 0;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}

.member-role {
  margin-top: 2px;
  color: #9ca3af;
  font-size: 11px;
}

.bot-tag {
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.no-members {
  padding: 28px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}
</style>
