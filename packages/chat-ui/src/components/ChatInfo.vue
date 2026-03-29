<template>
  <div class="chat-info">
    <div class="chat-info__header">
      <h3 class="chat-info__title">Group Info</h3>
      <button class="chat-info__close" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <div class="chat-info__content">
      <!-- Group Avatar & Name -->
      <div class="chat-info__profile">
        <div class="chat-info__avatar">
          <img v-if="group?.avatar" :src="group.avatar" :alt="group.name" />
          <span v-else>{{ (group?.name || 'G').charAt(0) }}</span>
        </div>
        <h2 class="chat-info__name">{{ group?.name || 'Group Chat' }}</h2>
        <p class="chat-info__members">
          {{ memberCount }} members
          <span v-if="onlineCount > 0" class="online-count">· {{ onlineCount }} online</span>
        </p>
      </div>

      <!-- Description Section -->
      <div class="chat-info__section">
        <div class="chat-info__section-header">
          <span class="chat-info__section-title">Description</span>
          <button v-if="isAdmin" class="chat-info__edit-btn" @click="editMode = 'description'">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        </div>
        <div v-if="editMode === 'description'" class="chat-info__edit">
          <textarea v-model="editDescription" class="chat-info__textarea" placeholder="Add a description..."></textarea>
          <div class="chat-info__edit-actions">
            <button class="chat-info__btn chat-info__btn--cancel" @click="editMode = null">Cancel</button>
            <button class="chat-info__btn chat-info__btn--save" @click="saveDescription">Save</button>
          </div>
        </div>
        <p v-else class="chat-info__description">{{ description || 'No description' }}</p>
      </div>

      <!-- Announcement Section -->
      <div class="chat-info__section">
        <div class="chat-info__section-header">
          <span class="chat-info__section-title">Pinned Announcement</span>
          <button v-if="isAdmin" class="chat-info__edit-btn" @click="editMode = 'announcement'">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        </div>
        <div v-if="editMode === 'announcement'" class="chat-info__edit">
          <textarea v-model="editAnnouncement" class="chat-info__textarea" placeholder="Pin an announcement..."></textarea>
          <div class="chat-info__edit-actions">
            <button class="chat-info__btn chat-info__btn--cancel" @click="editMode = null">Cancel</button>
            <button class="chat-info__btn chat-info__btn--save" @click="saveAnnouncement">Save</button>
          </div>
        </div>
        <div v-else-if="announcement" class="chat-info__announcement">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12.01 21.49L23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7l11.63 14.49.01.01.01-.01z"/>
          </svg>
          <p>{{ announcement }}</p>
        </div>
        <p v-else class="chat-info__empty">No pinned announcement</p>
      </div>

      <!-- Media Section -->
      <div class="chat-info__section">
        <div class="chat-info__section-header">
          <span class="chat-info__section-title">Shared Files & Images</span>
          <span class="chat-info__count">{{ mediaCount }}</span>
        </div>
        <div v-if="media.length > 0" class="chat-info__media-grid">
          <div
            v-for="item in media.slice(0, 6)"
            :key="item.id"
            class="chat-info__media-item"
            @click="$emit('preview-media', item)"
          >
            <img v-if="item.type === 'image'" :src="item.url" :alt="item.name" />
            <div v-else class="chat-info__media-file">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              <span>{{ item.name }}</span>
            </div>
          </div>
        </div>
        <button v-if="mediaCount > 6" class="chat-info__view-all">
          View all {{ mediaCount }} files
        </button>
        <p v-else class="chat-info__empty">No shared files yet</p>
      </div>

      <!-- Quick Actions -->
      <div class="chat-info__actions">
        <button class="chat-info__action" @click="$emit('view-members')">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <span>View Members</span>
        </button>
        <button class="chat-info__action" @click="$emit('mute-notifications')">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          <span>{{ isMuted ? 'Unmute Notifications' : 'Mute Notifications' }}</span>
        </button>
        <button class="chat-info__action chat-info__action--danger" @click="$emit('leave-group')">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
          </svg>
          <span>Leave Group</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface ChatGroup {
  id: string
  name: string
  avatar?: string
  description?: string
  announcement?: string
  memberCount: number
  onlineCount: number
}

export interface MediaItem {
  id: string
  type: 'image' | 'file'
  url: string
  name: string
  size?: number
}

interface Props {
  group?: ChatGroup
  members?: Array<{ id: string }>
  isAdmin?: boolean
  isMuted?: boolean
  description?: string
  announcement?: string
  media?: MediaItem[]
}

const props = withDefaults(defineProps<Props>(), {
  group: () => ({ id: '', name: '', memberCount: 0, onlineCount: 0 }),
  members: () => [],
  isAdmin: false,
  isMuted: false,
  description: '',
  announcement: '',
  media: () => []
})

const emit = defineEmits<{
  close: []
  'update-description': [description: string]
  'update-announcement': [announcement: string]
  'view-members': []
  'mute-notifications': []
  'leave-group': []
  'preview-media': [item: MediaItem]
}>()

const editMode = ref<string | null>(null)
const editDescription = ref('')
const editAnnouncement = ref('')

const memberCount = computed(() => props.group?.memberCount || props.members.length)
const onlineCount = computed(() => props.group?.onlineCount || 0)
const mediaCount = computed(() => props.media.length)

function saveDescription() {
  emit('update-description', editDescription.value)
  editMode.value = null
}

function saveAnnouncement() {
  emit('update-announcement', editAnnouncement.value)
  editMode.value = null
}
</script>

<style scoped>
.chat-info {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.chat-info__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.chat-info__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.chat-info__close {
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

.chat-info__close:hover {
  background: rgba(15, 23, 42, 0.05);
  color: #111827;
}

.chat-info__content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
}

.chat-info__profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 24px;
}

.chat-info__avatar {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  color: #6b7280;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  overflow: hidden;
}

.chat-info__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-info__name {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.chat-info__members {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.online-count {
  color: #34c759;
}

.chat-info__section {
  margin-bottom: 24px;
}

.chat-info__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.chat-info__section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chat-info__count {
  font-size: 12px;
  color: #9ca3af;
}

.chat-info__edit-btn {
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

.chat-info__edit-btn:hover {
  background: rgba(15, 23, 42, 0.05);
  color: #6b7280;
}

.chat-info__description {
  margin: 0;
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
}

.chat-info__empty {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
  font-style: italic;
}

.chat-info__announcement {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.08);
  border-radius: 12px;
  border-left: 3px solid #2563eb;
}

.chat-info__announcement svg {
  color: #2563eb;
  flex-shrink: 0;
  margin-top: 2px;
}

.chat-info__announcement p {
  margin: 0;
  font-size: 13px;
  color: #1e40af;
  line-height: 1.5;
}

.chat-info__edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-info__textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 10px;
  font-size: 13px;
  resize: none;
  outline: none;
}

.chat-info__textarea:focus {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.chat-info__edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.chat-info__btn {
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-info__btn--cancel {
  background: transparent;
  color: #6b7280;
}

.chat-info__btn--cancel:hover {
  background: rgba(15, 23, 42, 0.05);
}

.chat-info__btn--save {
  background: #111827;
  color: white;
}

.chat-info__btn--save:hover {
  background: #1f2937;
}

.chat-info__media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.chat-info__media-item {
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.chat-info__media-item:hover {
  transform: scale(1.05);
}

.chat-info__media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-info__media-file {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.04);
  color: #6b7280;
}

.chat-info__media-file span {
  font-size: 10px;
  text-align: center;
  padding: 0 4px;
  word-break: break-all;
}

.chat-info__view-all {
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  border: 1px dashed rgba(15, 23, 42, 0.15);
  background: transparent;
  border-radius: 10px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-info__view-all:hover {
  border-color: #111827;
  color: #111827;
}

.chat-info__actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.chat-info__action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: none;
  background: transparent;
  border-radius: 12px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: background 0.2s;
}

.chat-info__action:hover {
  background: rgba(15, 23, 42, 0.04);
}

.chat-info__action svg {
  color: #6b7280;
}

.chat-info__action--danger {
  color: #dc2626;
}

.chat-info__action--danger svg {
  color: #ef4444;
}

.chat-info__action--danger:hover {
  background: rgba(239, 68, 68, 0.08);
}
</style>
