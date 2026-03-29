<template>
  <div class="member-panel">
    <div class="member-panel__header">
      <h3 class="member-panel__title">
        Members
        <span class="member-count">{{ members.length }}</span>
      </h3>
      <button class="member-panel__close" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <div class="member-panel__search">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search members..."
        class="member-panel__search-input"
      />
    </div>

    <div class="member-panel__list">
      <!-- Online members section -->
      <div v-if="onlineMembers.length > 0" class="member-section">
        <div class="member-section__title">
          Online
          <span class="member-section__count">{{ onlineMembers.length }}</span>
        </div>
        <div
          v-for="member in filteredOnlineMembers"
          :key="member.id"
          class="member-item"
          @click="$emit('mention', member)"
        >
          <div class="member-item__avatar">
            <img v-if="member.avatar" :src="member.avatar" :alt="member.name" />
            <span v-else>{{ member.name.charAt(0) }}</span>
            <span class="presence-dot" :class="getPresenceClass(member)"></span>
          </div>
          <div class="member-item__info">
            <span class="member-item__name">{{ member.name }}</span>
            <span v-if="member.role !== 'member'" class="member-item__role">{{ formatRole(member.role) }}</span>
          </div>
          <button class="member-item__mention" @click.stop="$emit('mention', member)">
            @ Mention
          </button>
          <button v-if="isAdmin && member.id !== currentUserId" class="member-item__action" @click.stop="$emit('remove', member)">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Offline members section -->
      <div v-if="offlineMembers.length > 0" class="member-section">
        <div class="member-section__title">
          Offline
          <span class="member-section__count">{{ offlineMembers.length }}</span>
        </div>
        <div
          v-for="member in filteredOfflineMembers"
          :key="member.id"
          class="member-item"
          @click="$emit('mention', member)"
        >
          <div class="member-item__avatar is-offline">
            <img v-if="member.avatar" :src="member.avatar" :alt="member.name" />
            <span v-else>{{ member.name.charAt(0) }}</span>
          </div>
          <div class="member-item__info">
            <span class="member-item__name">{{ member.name }}</span>
            <span class="member-item__status">Last seen {{ formatLastSeen(member.lastSeen) }}</span>
          </div>
          <button v-if="isAdmin && member.id !== currentUserId" class="member-item__action" @click.stop="$emit('remove', member)">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Agents/Bots section -->
      <div v-if="agents.length > 0" class="member-section">
        <div class="member-section__title">
          Agents & Bots
          <span class="member-section__count">{{ agents.length }}</span>
        </div>
        <div
          v-for="member in filteredAgents"
          :key="member.id"
          class="member-item"
          @click="$emit('mention', member)"
        >
          <div class="member-item__avatar is-agent">
            <img v-if="member.avatar" :src="member.avatar" :alt="member.name" />
            <span v-else>{{ member.name.charAt(0) }}</span>
            <span class="presence-dot is-agent-dot"></span>
          </div>
          <div class="member-item__info">
            <span class="member-item__name">{{ member.name }}</span>
            <span class="member-item__role">Agent</span>
          </div>
          <button class="member-item__mention" @click.stop="$emit('mention', member)">
            @ Mention
          </button>
        </div>
      </div>

      <div v-if="filteredMembers.length === 0" class="member-panel__empty">
        <p v-if="searchQuery">No members found</p>
        <p v-else>No members in this group</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { User, PresenceStatus } from '@open-chat/chat-core'

interface Props {
  members: User[]
  currentUserId: string
  isAdmin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  members: () => [],
  isAdmin: false
})

defineEmits<{
  close: []
  mention: [member: User]
  remove: [member: User]
}>()

const searchQuery = ref('')

const filteredMembers = computed(() => {
  if (!searchQuery.value) return props.members
  const query = searchQuery.value.toLowerCase()
  return props.members.filter(m => m.name.toLowerCase().includes(query))
})

const onlineMembers = computed(() =>
  filteredMembers.value.filter(m => m.presence === 'online' || !m.presence)
)

const offlineMembers = computed(() =>
  filteredMembers.value.filter(m => m.presence === 'offline' || m.presence === 'away')
)

const agents = computed(() =>
  filteredMembers.value.filter(m => m.role === 'bot' || m.role === 'owner')
)

const filteredOnlineMembers = computed(() =>
  onlineMembers.value.filter(m => m.role !== 'bot' && m.role !== 'owner')
)

const filteredOfflineMembers = computed(() =>
  offlineMembers.value.filter(m => m.role !== 'bot' && m.role !== 'owner')
)

const filteredAgents = computed(() =>
  agents.value.filter(m => filteredMembers.value.includes(m))
)

function getPresenceClass(member: User): string {
  switch (member.presence) {
    case 'online': return 'is-online'
    case 'away': return 'is-away'
    case 'busy': return 'is-busy'
    default: return 'is-online'
  }
}

function formatRole(role: string): string {
  switch (role) {
    case 'owner': return 'Owner'
    case 'admin': return 'Admin'
    case 'member': return 'Member'
    case 'bot': return 'Bot'
    default: return role
  }
}

function formatLastSeen(lastSeen?: number): string {
  if (!lastSeen) return 'recently'

  const diff = Date.now() - lastSeen
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return 'a while ago'
}
</script>

<style scoped>
.member-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.member-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.member-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-count {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  background: rgba(15, 23, 42, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
}

.member-panel__close {
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

.member-panel__close:hover {
  background: rgba(15, 23, 42, 0.05);
  color: #111827;
}

.member-panel__search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 16px;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.04);
  border-radius: 10px;
  color: #9ca3af;
}

.member-panel__search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: #111827;
}

.member-panel__search-input::placeholder {
  color: #9ca3af;
}

.member-panel__list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.member-section {
  margin-bottom: 16px;
}

.member-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.member-section__count {
  font-size: 10px;
  color: #9ca3af;
  background: rgba(15, 23, 42, 0.05);
  padding: 1px 6px;
  border-radius: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.member-item:hover {
  background: rgba(15, 23, 42, 0.04);
}

.member-item__avatar {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  color: #6b7280;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  overflow: hidden;
}

.member-item__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-item__avatar.is-offline {
  opacity: 0.5;
}

.member-item__avatar.is-agent {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
}

.presence-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
}

.presence-dot.is-online {
  background: #34c759;
}

.presence-dot.is-away {
  background: #fbbf24;
}

.presence-dot.is-busy {
  background: #ef4444;
}

.presence-dot.is-agent-dot {
  background: #8b5cf6;
}

.member-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-item__name {
  font-weight: 500;
  font-size: 14px;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-item__role,
.member-item__status {
  font-size: 12px;
  color: #6b7280;
}

.member-item__role {
  color: #2563eb;
  font-weight: 500;
}

.member-item__mention {
  padding: 4px 10px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: transparent;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.member-item:hover .member-item__mention {
  opacity: 1;
}

.member-item__mention:hover {
  background: #111827;
  border-color: #111827;
  color: white;
}

.member-item__action {
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
  transition: all 0.2s;
}

.member-item:hover .member-item__action {
  opacity: 1;
}

.member-item__action:hover {
  background: #fee2e2;
  color: #ef4444;
}

.member-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
}
</style>
