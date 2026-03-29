<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="group-info-panel">
      <div class="gi-header">
        <span class="gi-title">{{ info?.name || '群聊信息' }}</span>
        <button class="gi-close" @click="$emit('close')">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="gi-body">
        <div class="gi-section">
          <div class="gi-section-head">
            <span class="gi-section-title">成员 ({{ (info?.agents?.length || 0) + (info?.users?.length || 0) }})</span>
            <button class="gi-add-btn" @click="showPicker = !showPicker">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              添加
            </button>
          </div>

          <div v-if="info?.agents?.length" class="gi-member-group">
            <div class="gi-group-label">数字员工</div>
            <div v-for="agent in info.agents" :key="agent.id" class="gi-member-item">
              <div class="gi-member-avatar agent-avatar">{{ agent.name.charAt(0) }}</div>
              <span class="gi-member-name">{{ agent.name }}</span>
              <span class="gi-member-role">数字员工</span>
              <button class="gi-remove-btn" @click="$emit('removeMember', 'agent', agent.id)" title="移除">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <div v-if="info?.users?.length" class="gi-member-group">
            <div class="gi-group-label">群成员</div>
            <div v-for="user in info.users" :key="user.id" class="gi-member-item">
              <div class="gi-member-avatar">{{ avatarText(user.display_name || user.username) }}</div>
              <span class="gi-member-name">{{ user.display_name || user.username }}</span>
              <button class="gi-remove-btn" @click="$emit('removeMember', 'user', user.id)" title="移除">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-if="showPicker" class="gi-picker">
          <div class="gi-picker-tabs">
            <button :class="{ active: pickerTab === 'agents' }" @click="pickerTab = 'agents'">数字员工</button>
            <button :class="{ active: pickerTab === 'users' }" @click="pickerTab = 'users'">群成员</button>
          </div>

          <div v-if="pickerTab === 'agents'" class="gi-picker-list">
            <div v-if="availableAgents.length === 0" class="gi-picker-empty">暂无可添加的数字员工</div>
            <div
              v-for="agent in availableAgents"
              :key="agent.id"
              class="gi-picker-item"
              @click="$emit('addMember', 'agent', agent.id)"
            >
              <div class="gi-member-avatar agent-avatar">{{ agent.name.charAt(0) }}</div>
              <span class="gi-member-name">{{ agent.name }}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
          </div>

          <div v-if="pickerTab === 'users'" class="gi-picker-list">
            <div v-if="availableUsers.length === 0" class="gi-picker-empty">暂无可添加的群成员</div>
            <div
              v-for="user in availableUsers"
              :key="user.id"
              class="gi-picker-item"
              @click="$emit('addMember', 'user', user.id)"
            >
              <div class="gi-member-avatar">{{ avatarText(user.display_name || user.username) }}</div>
              <div class="gi-picker-user-info">
                <span class="gi-member-name">{{ user.display_name || user.username }}</span>
                <span class="gi-picker-user-role">{{ roleLabel(user.role) }}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface MemberItem { id: string; name?: string; username?: string; display_name?: string; role?: string }
interface GroupInfo { name?: string; agents?: MemberItem[]; users?: MemberItem[] }

const props = defineProps<{
  info: GroupInfo | null
  allAgents: MemberItem[]
  allUsers: MemberItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  close: []
  addMember: [type: 'agent' | 'user', id: string]
  removeMember: [type: 'agent' | 'user', id: string]
}>()

const showPicker = ref(false)
const pickerTab = ref<'agents' | 'users'>('agents')

const availableAgents = computed(() => {
  const currentIds = new Set((props.info?.agents || []).map((a) => a.id))
  return props.allAgents.filter((a) => !currentIds.has(a.id))
})

const availableUsers = computed(() => {
  const currentIds = new Set((props.info?.users || []).map((u) => u.id))
  return props.allUsers.filter((u) => !currentIds.has(u.id))
})

function avatarText(v: string) { return String(v || '系').charAt(0) }
function roleLabel(role: string) {
  return { platform_admin: '平台管理员', enterprise_admin: '企业管理员', agent_admin: 'Agent 管理员', user: '普通成员' }[role] || role || '普通成员'
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;
  display: flex; align-items: flex-end; justify-content: center;
}
.group-info-panel {
  width: 100%; max-width: 420px; max-height: 80vh;
  background: var(--surface); border-radius: 16px 16px 0 0;
  display: flex; flex-direction: column; overflow: hidden;
  animation: slideUp 0.2s ease;
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.gi-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.gi-title { font-size: 17px; font-weight: 600; color: var(--text-primary); }
.gi-close {
  width: 32px; height: 32px; border-radius: 50%; background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); border: none; cursor: pointer;
}
.gi-body { flex: 1; overflow-y: auto; padding: 0 0 env(safe-area-inset-bottom); }
.gi-section { padding: 12px 16px; }
.gi-section-head {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
}
.gi-section-title { font-size: 13px; color: var(--text-muted); font-weight: 600; }
.gi-add-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 4px;
  background: var(--accent); color: var(--surface);
  font-size: 13px; font-weight: 600; border: none; cursor: pointer;
}
.gi-member-group { margin-bottom: 12px; }
.gi-group-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; font-weight: 600; }
.gi-member-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--border);
}
.gi-member-item:last-child { border-bottom: none; }
.gi-member-avatar {
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
  background: var(--bg); color: var(--text-secondary);
  font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.gi-member-avatar.agent-avatar { background: var(--accent); color: var(--surface); }
.gi-member-name { flex: 1; font-size: 15px; color: var(--text-primary); }
.gi-member-role { font-size: 12px; color: var(--text-muted); }
.gi-remove-btn {
  width: 28px; height: 28px; border-radius: 50%; background: transparent;
  border: none; cursor: pointer; color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
}
.gi-remove-btn:hover { color: var(--error); background: #FFF0F0; }
.gi-picker { border-top: 1px solid var(--border); padding: 12px 16px; }
.gi-picker-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
.gi-picker-tabs button {
  flex: 1; padding: 7px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--bg); font-size: 13px; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.gi-picker-tabs button.active { background: var(--accent); color: var(--surface); border-color: var(--accent); }
.gi-picker-list { display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow-y: auto; }
.gi-picker-empty { text-align: center; padding: 20px; color: var(--text-muted); font-size: 14px; }
.gi-picker-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px; border-radius: 6px; cursor: pointer;
}
.gi-picker-item:hover { background: var(--accent-light); }
.gi-picker-item:active { opacity: 0.8; }
.gi-picker-user-info { flex: 1; display: flex; flex-direction: column; }
.gi-picker-user-role { font-size: 12px; color: var(--text-muted); }
</style>
