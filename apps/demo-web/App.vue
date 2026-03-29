<template>
  <main class="app-shell">

    <!-- Offline Banner -->
    <div v-if="isOffline && authed" class="offline-banner">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1L1 7l3 3 3-3 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M1 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      离线模式 · 部分功能不可用
    </div>

    <!-- Loading Skeleton -->
    <div v-if="!ready" class="skeleton-root">
      <SkeletonLoader />
    </div>

    <!-- Auth -->
    <AuthPage
      v-else-if="!authed"
      :auth-error="authError"
      :login-busy="loginBusy"
      :initial-config="config"
      @login="handleLogin"
      @update:config="handleConfigUpdate"
    />

    <!-- Main: Conversation List -->
    <div v-else-if="view === 'list'" class="page-list">

      <header class="wx-header">
        <div class="header-left"></div>
        <h1 class="header-title">OpenChat</h1>
        <div class="header-right">
          <div class="user-info" @click="showUserMenu = !showUserMenu">
            <span class="user-avatar-sm">{{ avatarText(currentUser?.display_name || currentUser?.username) }}</span>
          </div>
        </div>
      </header>

      <!-- User Dropdown -->
      <div v-if="showUserMenu" class="user-menu" @click.stop>
        <div class="user-menu-info">
          <span class="user-avatar-lg">{{ avatarText(currentUser?.display_name || currentUser?.username) }}</span>
          <div>
            <div class="user-menu-name">{{ currentUser?.display_name || currentUser?.username }}</div>
            <div class="user-menu-role">{{ roleLabel(currentUser?.role) }}</div>
          </div>
        </div>
        <div class="user-menu-divider"></div>
        <button class="user-menu-btn" @click="toggleTheme">
          <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 10A6 6 0 116 2a5 5 0 008 8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="theme === 'light'" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M11.54 4.46l1.41-1.41M3.05 12.95l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 5v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          {{ theme === 'dark' ? '深色' : theme === 'light' ? '浅色' : '跟随系统' }}
        </button>
        <button class="user-menu-btn logout" @click="logout">退出登录</button>
      </div>
      <div v-if="showUserMenu" class="user-menu-overlay" @click="showUserMenu = false"></div>

      <!-- Search -->
      <div class="search-bar">
        <input v-model="searchKeyword" type="text" placeholder="搜索" class="search-input" />
      </div>

      <!-- 聊天 Tab -->
      <div v-show="listTab === 'chat'" class="home-tab-content">
        <div v-if="allAgents.length > 0 || listTab === 'chat'" class="agents-section">
          <div class="section-label-row">
            <div class="section-label">数字员工</div>
            <button class="btn-add-section" @click="openCreateAgent" title="新建数字员工">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="agents-scroll" v-if="allAgents.length > 0">
            <div v-for="agent in filteredAgents" :key="agent.id" class="agent-card" @click="openAgent(agent)">
              <div class="agent-avatar">{{ agent.name.charAt(0) }}</div>
              <div class="agent-name">{{ agent.name }}</div>
            </div>
          </div>
          <div v-if="allAgents.length === 0" class="agents-empty" @click="openCreateAgent">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4v12M4 10h12" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <span>点击创建数字员工</span>
          </div>
        </div>

        <div class="section-header">
          <span class="section-label">群聊</span>
          <span class="section-count">{{ filteredTeams.length }} 个</span>
        </div>

        <div class="conversations">
          <div v-for="team in filteredTeams" :key="team.id" class="conv-item"
            :class="{ active: team.id === activeTeamId }" @click="openTeam(team)">
            <div class="conv-avatar">
              {{ team.name.charAt(0) }}
              <span v-if="getTeamPendingCount(team.id) > 0" class="unread-badge">
                {{ getTeamPendingCount(team.id) > 99 ? '99+' : getTeamPendingCount(team.id) }}
              </span>
            </div>
            <div class="conv-body">
              <div class="conv-top">
                <span class="conv-name">{{ team.name }}</span>
                <span class="conv-time">{{ getTeamTime(team.id) }}</span>
              </div>
              <div class="conv-desc">
                <span class="conv-preview">{{ getTeamPreview(team.id) }}</span>
                <span v-if="teamAgentCountMap[team.id]" class="agent-count">{{ teamAgentCountMap[team.id] }} 个数字员工</span>
              </div>
            </div>
          </div>
          <div v-if="filteredTeams.length === 0 && searchKeyword" class="empty-search"><p>没有找到匹配的群聊</p></div>
          <div v-if="teams.length === 0" class="empty-list">
            <p>暂无群聊</p>
            <p class="hint">在网页端创建群聊后，这里将显示</p>
          </div>
        </div>
      </div>

      <!-- 待办 Tab -->
      <div v-show="listTab === 'todo'" class="home-tab-content">
        <HomeApprovals
          :approvals="visibleApprovals"
          :pending-count="pendingCount"
          :loading="approvalsBusy"
          :error="approvalError"
          :action-busy="actionBusy"
          @resolve="resolveApproval"
          @refresh="loadApprovals"
        />
      </div>

      <!-- Bottom Tab Bar -->
      <nav class="home-tab-bar">
        <button :class="{ active: listTab === 'chat' }" @click="listTab = 'chat'">聊天</button>
        <button :class="{ active: listTab === 'todo' }" @click="listTab = 'todo'">
          审批
          <span v-if="pendingCount > 0" class="home-tab-badge">{{ pendingCount > 99 ? '99+' : pendingCount }}</span>
        </button>
      </nav>
    </div>

    <!-- Agent Chat -->
    <div v-else-if="view === 'agent-chat'" class="page-chat" :class="{ 'sidebar-open': agentSidebarOpen }">

      <div class="agent-sidebar">
        <div class="sidebar-header">
          <button class="sidebar-back" @click="agentSidebarOpen = false">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="sidebar-title">会话列表</span>
          <button class="btn-new-chat" @click="startNewAgentSession" title="新建会话">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v12M3 9h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="session-list">
          <div v-for="session in agentSessions" :key="session.session_id" class="session-item"
            :class="{ active: session.session_id === currentAgentSessionId }"
            @click="switchAgentSession(session.session_id)">
            <div class="session-info">
              <div class="session-name">{{ session.name || '新会话' }}</div>
              <div class="session-time">{{ formatSessionTime(session.updated_at) }}</div>
            </div>
            <button v-if="session.session_id !== currentAgentSessionId" class="session-delete"
              @click.stop="deleteAgentSession(session.session_id)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div v-if="!agentSessions.length" class="session-empty"><p>暂无会话记录</p></div>
        </div>
      </div>
      <div v-if="agentSidebarOpen" class="sidebar-overlay" @click="agentSidebarOpen = false"></div>

      <div class="agent-chat-main">
        <header class="wx-header">
          <button class="header-back" @click="view = 'list'">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M14 4l-8 7 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <h1 class="header-title">
            {{ currentAgentChat?.name || '私聊' }}
            <span class="header-online-dot" :class="{ on: agentChatOnline }"></span>
          </h1>
          <div class="header-right">
            <button class="header-session-list" @click="agentSidebarOpen = !agentSidebarOpen" title="会话列表">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="header-new" @click="startNewAgentSession" title="新会话">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </header>

        <div ref="agentListRef" class="message-list">
          <div v-if="!agentMessages.length" class="empty-msgs">
            <p>开始和 {{ currentAgentChat?.name }} 私聊</p>
            <p class="hint">直接发送消息，AI 会回复</p>
          </div>
          <div v-for="msg in agentMessages" :key="msg.id" class="msg-item" :class="{
            'msg-me': msg.role === 'user',
            'msg-agent': msg.role === 'assistant'
          }">
            <template v-if="msg.role === 'assistant'">
              <div class="msg-avatar agent-msg-avatar">{{ currentAgentChat?.name?.charAt(0) }}</div>
              <div class="msg-content">
                <div class="msg-name">{{ currentAgentChat?.name }}</div>
                <div class="msg-bubble"><div class="bubble-inner" v-html="renderMarkdown(msg.content)"></div></div>
              </div>
            </template>
            <template v-else>
              <div class="msg-avatar avatar-me">{{ avatarText(currentUser?.display_name || currentUser?.username) }}</div>
              <div class="msg-content">
                <div class="msg-name">{{ currentUser?.display_name || currentUser?.username }}</div>
                <div class="msg-bubble bubble-me"><div class="bubble-inner">{{ msg.content }}</div></div>
              </div>
            </template>
          </div>
          <div v-if="agentLoading" class="loading-agents">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            {{ currentAgentChat?.name }} 正在回复...
          </div>
        </div>

        <div class="composer-bar">
          <button
            class="btn-voice"
            :class="{ recording: isRecording }"
            :disabled="isRecording || isTranscribing"
            @mousedown="startRecording" @mouseup="stopRecording" @mouseleave="stopRecording"
            @touchstart.prevent="startRecording" @touchend.prevent="stopRecording"
            :title="isRecording ? `录音中 ${recordingDuration}s` : '按住说话'">
            <svg v-if="!isRecording && !isTranscribing" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="7" r="3.5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M5 9c0 2.2 1.8 4 4 4s4-1.8 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              <path d="M9 13v2M7 15h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <span v-else-if="isRecording" class="recording-count">{{ recordingDuration }}″</span>
            <svg v-else-if="isTranscribing" width="18" height="18" viewBox="0 0 18 18" fill="none" class="spinning">
              <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="20 8" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="composer-input-wrap">
            <textarea ref="agentComposerRef" v-model="agentComposer" class="composer-input"
              placeholder="发送消息..." rows="1"
              @keydown.enter.exact.prevent="sendAgentMessage"
              @input="autoResizeAgentComposer"></textarea>
          </div>
          <button
            class="btn-send"
            :class="{ active: agentComposer.trim() }"
            :disabled="(!agentCanSend && !agentComposer.trim()) || isRecording || isTranscribing"
            @click="sendAgentMessage" title="发送">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Group Chat -->
    <div v-else-if="view === 'chat'" class="page-chat">

      <header class="wx-header">
        <button class="header-back" @click="view = 'list'">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 4l-8 7 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h1 class="header-title">{{ currentTeam?.name || '聊天' }}</h1>
        <div class="header-right">
          <button class="btn-group-info" @click="openGroupInfo" title="群信息">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="4" cy="15" r="2.5" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="16" cy="15" r="2.5" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
          <span class="online-dot" :class="{ on: chatOnline }"></span>
        </div>
      </header>

      <nav class="tab-bar">
        <button :class="{ active: tab === 'chat' }" @click="tab = 'chat'">聊天</button>
        <button :class="{ active: tab === 'approvals' }" @click="tab = 'approvals'">
          审批
          <span v-if="teamPendingCount > 0" class="red-badge">{{ teamPendingCount }}</span>
        </button>
      </nav>

      <!-- Chat Tab -->
      <section v-show="tab === 'chat'" class="chat-section">
        <div ref="listRef" class="message-list">
          <div v-if="!messages.length" class="empty-msgs">
            <p>没有消息记录</p><p class="hint">发送消息开始对话</p>
          </div>
          <div v-for="msg in messages" :key="msg.id" class="msg-item" :class="{
            'msg-me': msg.senderId === currentUser.id,
            'msg-sys': msg.type === 'system',
            'msg-agent': msg.senderType === 'agent' || msg.senderType === 'assistant'
          }" @touchmove.passive="cancelMsgTouch">
            <template v-if="msg.type === 'system'">
              <div class="sys-msg">{{ msg.text }}</div>
            </template>
            <template v-else>
              <div class="msg-avatar" :class="{ 'avatar-me': msg.senderId === currentUser.id }"
                @contextmenu.prevent="insertMentionFromMsg(msg)"
                @touchstart.passive="onMsgTouchStart(msg, $event)"
                @touchend.passive="onMsgTouchEnd(msg)"
                @touchcancel.passive="cancelMsgTouch">
                {{ avatarText(msg.senderName) }}
              </div>
              <div class="msg-content">
                <div class="msg-name"
                  @contextmenu.prevent="insertMentionFromMsg(msg)"
                  @touchstart.passive="onMsgTouchStart(msg, $event)"
                  @touchend.passive="onMsgTouchEnd(msg)"
                  @touchcancel.passive="cancelMsgTouch">
                  {{ msg.senderName || '未知' }}
                </div>
                <div class="msg-bubble" :class="{ 'bubble-me': msg.senderId === currentUser.id }">
                  <div class="bubble-inner" v-html="renderMarkdown(msg.text)"></div>
                </div>
              </div>
            </template>
          </div>
          <div v-if="loadingAgents.length" class="loading-agents">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            等待 {{ loadingAgents.join('、') }}
          </div>
        </div>

        <!-- @ Mention Picker -->
        <div v-if="mentionPickerOpen && mentionAgents.length > 0" class="mention-picker">
          <div class="mention-header">选择要 @ 的数字员工</div>
          <div v-for="(agent, idx) in mentionAgents" :key="agent.id" class="mention-item"
            :class="{ selected: idx === mentionSelectedIdx }"
            @click="insertMention(agent)">
            <span class="mention-avatar">{{ agent.name.charAt(0) }}</span>
            <span class="mention-name">{{ agent.name }}</span>
          </div>
        </div>

        <!-- Composer -->
        <div class="composer-bar">
          <textarea ref="composerRef" v-model="composer" class="composer-input"
            placeholder="输入消息..." rows="1"
            @keydown.enter.exact.prevent="sendMessage"
            @keydown="handleComposerKeydown"
            @input="handleComposerInput"></textarea>
          <button class="btn-send" :class="{ active: composer.trim() }"
            :disabled="!canSend" @click="sendMessage" title="发送">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Approvals Tab -->
      <section v-show="tab === 'approvals'" class="approvals-section">
        <GroupApprovals
          :approvals="visibleApprovals"
          :pending-count="teamPendingCount"
          :loading="approvalsBusy"
          :error="approvalError"
          :action-busy="actionBusy"
          :scope-filter="scopeFilter"
          :current-team="currentTeam"
          @resolve="resolveApproval"
          @refresh="loadApprovals"
          @scope-change="scopeFilter = $event"
        />
      </section>
    </div>

    <!-- Group Info Modal -->
    <GroupInfoModal
      v-if="groupInfoOpen"
      :info="groupInfo"
      :all-agents="allAgentsList"
      :all-users="allUsersList"
      :loading="groupInfoLoading"
      @close="groupInfoOpen = false"
      @addMember="addMember"
      @removeMember="removeMember"
    />

    <!-- Create Agent Modal -->
    <CreateAgentModal
      v-if="createAgentOpen"
      :step="createAgentStep"
      :templates="createAgentTemplates"
      :models="createAgentModels"
      :form="createAgentForm"
      :errors="createAgentError"
      :busy="createAgentBusy"
      :loading="createAgentLoading"
      @close="createAgentOpen = false"
      @back="caGoBack"
      @next="caNextStep"
      @submit="submitCreateAgent"
    />

    <!-- Approvals Detail -->
    <div v-else-if="view === 'approvals'" class="page-approvals">
      <header class="wx-header">
        <button class="header-back" @click="view = 'list'">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 4l-8 7 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h1 class="header-title">审批中心</h1>
        <div class="header-right"></div>
      </header>
      <ApprovalsPage
        :approvals="visibleApprovals"
        :pending-count="pendingCount"
        :loading="approvalsBusy"
        :error="approvalError"
        :action-busy="actionBusy"
        @resolve="resolveApproval"
        @refresh="loadApprovals"
      />
    </div>

  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { registerServiceWorker, setBadgeCount, vibrateNotify } from './src/pwa'
import { getStoredTheme, setStoredTheme, applyTheme, initTheme } from './src/theme'
import { useMarkdown } from './src/composables/useMarkdown'
import { useToast } from './src/composables/useToast'
import SkeletonLoader from './src/components/SkeletonLoader.vue'
import AuthPage from './src/views/AuthPage.vue'
import GroupInfoModal from './src/components/GroupInfoModal.vue'
import CreateAgentModal from './src/components/CreateAgentModal.vue'
import HomeApprovals from './src/components/HomeApprovals.vue'
import GroupApprovals from './src/components/GroupApprovals.vue'
import ApprovalsPage from './src/components/ApprovalsPage.vue'

const { renderMarkdown } = useMarkdown()
const { showToast } = useToast()

const query = new URLSearchParams(window.location.search)
const runtime = window.__OPENCHAT_CONFIG__ || {}
const storage = readJson('openchat-mobile-config')

const config = ref({
  apiBaseUrl: normalizeBase(query.get('apiBase') || storage.apiBaseUrl || runtime.apiBaseUrl || window.location.origin),
  wsBaseUrl: normalizeBase(query.get('wsBase') || storage.wsBaseUrl || runtime.wsBaseUrl || toWsBase(query.get('apiBase') || storage.apiBaseUrl || runtime.apiBaseUrl || window.location.origin)),
})

const form = ref({ username: query.get('username') || '', password: '' })
const token = ref(query.get('token') || localStorage.getItem('openchat-mobile-token') || '')
const currentUser = ref(null)
const ready = ref(false)
const loginBusy = ref(false)
const approvalsBusy = ref(false)
const actionBusy = ref('')
const authError = ref('')
const approvalError = ref('')
const authMode = ref('login')
const view = ref('list')
const searchKeyword = ref('')
const tab = ref('chat')
const approvalId = ref(query.get('approvalId') || '')
const showUserMenu = ref(false)
const theme = ref(getStoredTheme())
const listTab = ref('chat')

// Teams
const teams = ref([])
const teamId = ref('')
const approvals = ref([])
const messages = ref([])
const composer = ref('')
const loadingAgents = ref([])
const chatOnline = ref(false)
const statusFilter = ref('pending')
const scopeFilter = ref('all')
const listRef = ref(null)
const composerRef = ref(null)

// @ Mention state
const mentionPickerOpen = ref(false)
const mentionFilter = ref('')
const mentionStartPos = ref(-1)
const mentionSelectedIdx = ref(0)

// Agent private chat
const currentAgentChat = ref(null)
const agentMessages = ref([])
const agentComposer = ref('')
const agentLoading = ref(false)
const agentChatOnline = ref(false)
const agentListRef = ref(null)
const agentComposerRef = ref(null)
const agentWsRef = ref(null)
const userWsRef = ref(null)
const agentReconnectTimer = ref(null)
const agentLoadingTimeout = ref(null)
const agentAbortController = ref(null)
const agentSidebarOpen = ref(false)
const agentSessions = ref([])
const currentAgentSessionId = ref(null)
const isRecording = ref(false)
const isTranscribing = ref(false)
const isOffline = ref(!navigator.onLine)
const mediaRecorder = ref(null)
const audioChunks = ref([])
const recordingStartTime = ref(null)
const recordingTimer = ref(null)
const recordingDuration = ref(0)

// Group info modal
const groupInfoOpen = ref(false)
const groupInfo = ref(null)
const groupInfoLoading = ref(false)
const showMemberPicker = ref(false)
const memberPickerTab = ref('agents')
const allAgentsList = ref([])
const allUsersList = ref([])
const addMemberBusy = ref(false)
const standaloneAgents = ref([])
const agentLastChatTime = ref({})

// Create Agent
const createAgentOpen = ref(false)
const createAgentStep = ref(0)
const createAgentBusy = ref(false)
const createAgentLoading = ref(false)
const createAgentTemplates = ref([])
const createAgentModels = ref([])
const createAgentForm = ref({ name: '', role_description: '', template_id: '', primary_model_id: '' })
const createAgentError = ref({ name: '', model: '', api: '' })

// Message tracking per team
const lastMessages = ref({})
const lastMsgTime = ref({})

// Current time
const currentTime = ref('')
let timeInterval = null

// ─── Computed ──────────────────────────────────────────────────────────────────

const authed = computed(() => Boolean(token.value && currentUser.value))
const currentTeam = computed(() => teams.value.find((t) => t.id === teamId.value) || null)
const currentTeamAgents = computed(() => new Set((currentTeam.value?.agents || []).map((a) => a.id)))
const activeTeamId = computed(() => teamId.value)
const teamAgentCountMap = computed(() => {
  const map = {}
  for (const t of teams.value) { map[t.id] = t.agents?.length || 0 }
  return map
})
const pendingCount = computed(() => approvals.value.filter((a) => a.status === 'pending').length)
watch(pendingCount, (count) => { setBadgeCount(count) }, { immediate: true })
const teamPendingCount = computed(() => {
  if (!currentTeam.value) return 0
  return approvals.value.filter((a) => a.status === 'pending' && currentTeamAgents.value.has(a.agent_id)).length
})
const canSend = computed(() => Boolean(currentTeam.value && composer.value.trim() && chatOnline.value))
const agentCanSend = computed(() => Boolean(currentAgentChat.value && agentComposer.value.trim() && agentChatOnline.value && !agentLoading.value))

const allAgents = computed(() => {
  const agents = []
  for (const t of teams.value) {
    for (const a of (t.agents || [])) { agents.push({ ...a, teamName: t.name, teamId: t.id }) }
  }
  const teamAgentIds = new Set(agents.map((a) => a.id))
  for (const a of standaloneAgents.value) {
    if (!teamAgentIds.has(a.id)) { agents.push({ ...a, teamName: '', teamId: '' }) }
  }
  return agents
})

const filteredAgents = computed(() => {
  if (!searchKeyword.value) {
    const list = [...allAgents.value]
    list.sort((a, b) => (agentLastChatTime.value[b.id] || 0) - (agentLastChatTime.value[a.id] || 0))
    return list
  }
  const kw = searchKeyword.value.toLowerCase()
  return allAgents.value.filter((a) => a.name.toLowerCase().includes(kw) || a.teamName.toLowerCase().includes(kw))
})

const filteredTeams = computed(() => {
  if (!searchKeyword.value) return teams.value
  const kw = searchKeyword.value.toLowerCase()
  return teams.value.filter((t) => t.name.toLowerCase().includes(kw))
})

const visibleApprovals = computed(() => {
  let list = Array.isArray(approvals.value) ? [...approvals.value] : []
  if (statusFilter.value === 'pending') list = list.filter((a) => a.status === 'pending')
  if (scopeFilter.value === 'team' && currentTeam.value) list = list.filter((a) => currentTeamAgents.value.has(a.agent_id))
  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

const mentionAgents = computed(() => {
  if (!currentTeam.value?.agents) return []
  if (!mentionFilter.value) return currentTeam.value.agents
  const filter = mentionFilter.value.toLowerCase()
  return currentTeam.value.agents.filter((a) => a.name.toLowerCase().includes(filter))
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function handleLogin(f) {
  loginBusy.value = true
  authError.value = ''
  try {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: f.username, password: f.password }),
    }, false)
    token.value = res.access_token
    currentUser.value = res.user
    localStorage.setItem('openchat-mobile-token', token.value)
    f.password = ''
    await afterAuth()
  } catch (e) { authError.value = e.message || '登录失败' }
  finally { loginBusy.value = false }
}

function handleConfigUpdate(cfg) {
  config.value = { ...cfg }
}

function logout() {
  token.value = ''; currentUser.value = null; teams.value = []; approvals.value = []; messages.value = []
  lastMessages.value = {}; lastMsgTime.value = {}
  localStorage.removeItem('openchat-mobile-token')
  disconnectWs(); disconnectUserWs(); stopPolling()
  view.value = 'list'; showUserMenu.value = false
}

async function bootstrap() {
  currentUser.value = await request('/api/auth/me')
  await afterAuth()
}

async function afterAuth() {
  await Promise.all([loadTeams(), loadApprovals()])
  startPolling(); connectUserWs()
}

// ─── Teams ──────────────────────────────────────────────────────────────────────

async function loadTeams() {
  const [teamsData, agentsData] = await Promise.all([
    request('/api/openchat/teams/'),
    request('/api/agents/').catch(() => []),
  ])
  teams.value = teamsData || []
  standaloneAgents.value = agentsData || []
}

async function openTeam(team) {
  teamId.value = team.id; tab.value = 'chat'; view.value = 'chat'
  mentionPickerOpen.value = false; connectTeam(team.id)
}

// ─── Group Chat WS ─────────────────────────────────────────────────────────────

function connectTeam(targetTeamId) {
  messages.value = []; loadingAgents.value = []; chatOnline.value = false; seen.clear()
  disconnectWs()
  if (!token.value) return
  const socket = new WebSocket(`${config.value.wsBaseUrl}/ws/team/${targetTeamId}?token=${encodeURIComponent(token.value)}`)
  wsRef.value = socket
  socket.onopen = () => { chatOnline.value = true }
  socket.onerror = () => { chatOnline.value = false }
  socket.onclose = () => {
    if (wsRef.value !== socket) return
    chatOnline.value = false
    reconnectTimer.value = setTimeout(() => {
      if (teamId.value === targetTeamId && token.value && view.value === 'chat') connectTeam(targetTeamId)
    }, 3000)
  }
  socket.onmessage = (e) => {
    const payload = JSON.parse(e.data)
    if (payload.type === 'team_info' || payload.type === 'connected') return
    if (payload.type !== 'message' && payload.type !== 'system') return
    const msg = normalizeMsg(payload)
    if (msg.senderType === 'system' && msg.text?.includes('No agent connected')) return
    if (msg.senderType !== 'system') {
      lastMessages.value[targetTeamId] = msg.text.slice(0, 40)
      const time = new Date(msg.timestamp)
      lastMsgTime.value[targetTeamId] = `${time.getHours().toString().padStart(2,'0')}:${time.getMinutes().toString().padStart(2,'0')}`
    }
    const key = payload.msg_id ? `id:${payload.msg_id}` : `${msg.senderId}:${msg.timestamp}:${msg.text}`
    if (seen.has(key)) return
    seen.add(key)
    if ((msg.senderType === 'agent' || msg.senderType === 'assistant') && msg.senderName) {
      loadingAgents.value = loadingAgents.value.filter((n) => n !== msg.senderName)
    }
    if (teamId.value === targetTeamId) {
      messages.value.push(msg)
      nextTick(() => { if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight })
    }
  }
}

const wsRef = ref(null)
const reconnectTimer = ref(null)
const seen = new Set()

function disconnectWs() {
  if (reconnectTimer.value) { clearTimeout(reconnectTimer.value); reconnectTimer.value = null }
  if (wsRef.value) { const s = wsRef.value; wsRef.value = null; s.close() }
  chatOnline.value = false
}

function normalizeMsg(payload) {
  return {
    id: payload.msg_id || payload.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    senderId: payload.sender_id || 'system',
    senderName: payload.sender_name || '系统',
    senderType: payload.sender_type || payload.role || 'system',
    type: payload.type === 'system' ? 'system' : 'text',
    text: payload.content?.text || (typeof payload.content === 'string' ? payload.content : JSON.stringify(payload.content || '')),
    timestamp: payload.timestamp || payload.createdAt || new Date().toISOString(),
  }
}

function sendMessage() {
  if (mentionPickerOpen.value && mentionAgents.value.length > 0) { insertMention(mentionAgents.value[mentionSelectedIdx.value]); return }
  const text = composer.value.trim()
  if (!text || !wsRef.value || wsRef.value.readyState !== WebSocket.OPEN) return
  const names = []
  const re = /@([^\s@,]+)/g; let m
  while ((m = re.exec(text)) !== null) names.push(m[1])
  if (names.length && currentTeam.value) {
    loadingAgents.value = currentTeam.value.agents.filter((a) => names.includes(a.name)).map((a) => a.name)
  }
  wsRef.value.send(JSON.stringify({ content: text }))
  composer.value = ''
  if (composerRef.value) { composerRef.value.style.height = 'auto' }
}

// ─── @ Mention ─────────────────────────────────────────────────────────────────

function handleComposerInput(e) {
  const el = composerRef.value; if (!el) return
  const cursorPos = el.selectionStart
  const textBeforeCursor = composer.value.slice(0, cursorPos)
  const atMatch = textBeforeCursor.match(/@([^\s@]*)$/)
  if (atMatch) {
    mentionPickerOpen.value = true; mentionFilter.value = atMatch[1]
    mentionStartPos.value = cursorPos - atMatch[0].length; mentionSelectedIdx.value = 0
  } else {
    mentionPickerOpen.value = false; mentionFilter.value = ''
  }
  el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

let msgTouchTimer = null, msgTouchMoved = false
function onMsgTouchStart(msg, e) {
  if (msg.senderId === currentUser.value?.id) return
  msgTouchMoved = false
  msgTouchTimer = setTimeout(() => { if (!msgTouchMoved) insertMentionFromMsg(msg) }, 500)
}
function onMsgTouchEnd() { cancelMsgTouch() }
function cancelMsgTouch() { if (msgTouchTimer) { clearTimeout(msgTouchTimer); msgTouchTimer = null } }
function insertMentionFromMsg(msg) {
  if (!composerRef.value || !msg.senderName || msg.senderId === currentUser.value?.id) return
  composer.value += `@${msg.senderName} `; composerRef.value.focus()
}
function handleComposerKeydown(e) {
  if (!mentionPickerOpen.value || mentionAgents.value.length === 0) return
  if (e.key === 'ArrowDown') { e.preventDefault(); mentionSelectedIdx.value = (mentionSelectedIdx.value + 1) % mentionAgents.value.length }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mentionSelectedIdx.value = (mentionSelectedIdx.value - 1 + mentionAgents.value.length) % mentionAgents.value.length }
  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionAgents.value[mentionSelectedIdx.value]) }
  else if (e.key === 'Escape') { mentionPickerOpen.value = false }
}
function insertMention(agent) {
  if (!agent || !composerRef.value) return
  const el = composerRef.value
  const cursorPos = el.selectionStart
  const textBefore = composer.value.slice(0, mentionStartPos.value)
  const textAfter = composer.value.slice(cursorPos)
  composer.value = `${textBefore}@${agent.name} ${textAfter}`
  mentionPickerOpen.value = false
  nextTick(() => {
    const newPos = mentionStartPos.value + agent.name.length + 2
    el.focus(); el.setSelectionRange(newPos, newPos)
  })
}

// ─── Approvals ─────────────────────────────────────────────────────────────────

async function loadApprovals() {
  approvalsBusy.value = true; approvalError.value = ''
  try {
    const data = await request('/api/enterprise/approvals')
    const incoming = Array.isArray(data) ? data : []
    const wsIds = new Set(approvals.value.filter((a) => a._wsPush).map((a) => a.id))
    const merged = [
      ...incoming.map((a) => ({ ...a, _wsPush: wsIds.has(a.id) })),
      ...approvals.value.filter((a) => a._wsPush && !incoming.some((b) => b.id === a.id)),
    ]
    approvals.value = merged
  } catch (e) { approvalError.value = e.message || '加载审批失败' }
  finally { approvalsBusy.value = false }
}

async function resolveApproval(item, action) {
  actionBusy.value = item.id; approvalError.value = ''
  try {
    const updated = await request(`/api/enterprise/approvals/${item.id}/resolve`, {
      method: 'POST', body: JSON.stringify({ action }),
    })
    if (updated?.id) { approvals.value = approvals.value.map((e) => e.id === updated.id ? updated : e) }
    approvalId.value = item.id
  } catch (e) { approvalError.value = e.message || '处理失败' }
  finally { actionBusy.value = '' }
}

// ─── Group Info Modal ──────────────────────────────────────────────────────────

async function openGroupInfo() {
  if (!currentTeam.value) return
  groupInfoOpen.value = true; showMemberPicker.value = false; groupInfoLoading.value = true
  try {
    const data = await request(`/api/openchat/teams/${currentTeam.value.id}`)
    groupInfo.value = data
    const [agentsData, usersData] = await Promise.all([
      request('/api/agents/').catch(() => []),
      request('/api/users/').catch(() => []),
    ])
    allAgentsList.value = agentsData || []
    allUsersList.value = usersData || []
  } catch (e) { console.error('Failed to load group info:', e) }
  finally { groupInfoLoading.value = false }
}

async function addMember(type, id) {
  if (addMemberBusy.value || !groupInfo.value) return
  addMemberBusy.value = true
  try {
    if (type === 'agent') { await request(`/api/openchat/teams/${groupInfo.value.id}/members/agents/${id}`, { method: 'POST' }) }
    else { await request(`/api/openchat/teams/${groupInfo.value.id}/members/users/${id}`, { method: 'POST' }) }
    groupInfo.value = await request(`/api/openchat/teams/${groupInfo.value.id}`)
    await loadTeams()
  } catch (e) { alert('添加失败: ' + (e.message || e)) }
  finally { addMemberBusy.value = false }
}

async function removeMember(type, id) {
  if (addMemberBusy.value || !groupInfo.value) return
  if (!confirm('确定移除该成员？')) return
  addMemberBusy.value = true
  try {
    if (type === 'agent') { await request(`/api/openchat/teams/${groupInfo.value.id}/members/agents/${id}`, { method: 'DELETE' }) }
    else { await request(`/api/openchat/teams/${groupInfo.value.id}/members/users/${id}`, { method: 'DELETE' }) }
    groupInfo.value = await request(`/api/openchat/teams/${groupInfo.value.id}`)
    await loadTeams()
  } catch (e) { alert('移除失败: ' + (e.message || e)) }
  finally { addMemberBusy.value = false }
}

// ─── Create Agent ─────────────────────────────────────────────────────────────

async function openCreateAgent() {
  createAgentStep.value = 0
  createAgentForm.value = { name: '', role_description: '', template_id: '', primary_model_id: '' }
  createAgentError.value = { name: '', model: '', api: '' }
  createAgentOpen.value = true; createAgentLoading.value = true
  try {
    const [tplData, modelData] = await Promise.all([
      request('/api/agents/templates').catch(() => []),
      request('/api/enterprise/llm-models').catch(() => []),
    ])
    createAgentTemplates.value = tplData || []
    createAgentModels.value = (modelData || []).filter((m) => m.enabled)
  } catch (e) { console.error('Failed to load agent creation data:', e) }
  finally { createAgentLoading.value = false }
}

function caNextStep() {
  createAgentError.value = { name: '', model: '', api: '' }
  if (createAgentStep.value === 0) {
    if (!createAgentForm.value.name || createAgentForm.value.name.trim().length < 2) {
      createAgentError.value.name = '名称至少2个字符'; return
    }
    createAgentStep.value = 1
  } else if (createAgentStep.value === 1) {
    if (!createAgentForm.value.primary_model_id && createAgentModels.value.length > 0) {
      createAgentError.value.model = '请选择一个模型'; return
    }
    createAgentStep.value = 2
  }
}

function caGoBack() {
  createAgentError.value = { name: '', model: '', api: '' }
  createAgentStep.value = Math.max(0, createAgentStep.value - 1)
}

async function submitCreateAgent(f) {
  createAgentError.value = { name: '', model: '', api: '' }; createAgentBusy.value = true
  try {
    await request('/api/agents/', {
      method: 'POST',
      body: JSON.stringify({
        name: f.name.trim(),
        role_description: f.role_description.trim() || undefined,
        template_id: f.template_id || undefined,
        primary_model_id: f.primary_model_id || undefined,
        permission_scope_type: 'user',
      }),
    })
    createAgentOpen.value = false; await loadTeams()
  } catch (e) { createAgentError.value.api = e.message || '创建失败' }
  finally { createAgentBusy.value = false }
}

// ─── Team Helper ───────────────────────────────────────────────────────────────

function getTeamPendingCount(teamId) {
  const team = teams.value.find((t) => t.id === teamId)
  if (!team) return 0
  const agentIds = new Set((team.agents || []).map((a) => a.id))
  return approvals.value.filter((a) => a.status === 'pending' && agentIds.has(a.agent_id)).length
}
function getTeamPreview(id) { return lastMessages.value[id] || '暂无消息' }
function getTeamTime(id) { return lastMsgTime.value[id] || '' }

// ─── Agent Chat ────────────────────────────────────────────────────────────────

async function openAgent(agent) {
  disconnectAgentWs()
  currentAgentChat.value = { id: agent.id, name: agent.name, teamId: agent.teamId, teamName: agent.teamName }
  agentMessages.value = []; agentLoading.value = false; currentAgentSessionId.value = null
  view.value = 'agent-chat'; agentSidebarOpen.value = false
  await loadAgentSessions(agent.id)
  if (agentSessions.value.length > 0) {
    switchAgentSession(agentSessions.value[0].session_id)
  } else {
    connectAgentWs(agent.id, null)
  }
}

function connectAgentWs(agentId, sessionId) {
  if (!token.value) return; agentChatOnline.value = false
  const base = config.value.wsBaseUrl.replace(/\/+$/, '')
  let wsUrl = `${base}/ws/chat/${agentId}?token=${encodeURIComponent(token.value)}`
  if (sessionId) { wsUrl += `&session_id=${encodeURIComponent(sessionId)}` }
  const socket = new WebSocket(wsUrl); agentWsRef.value = socket
  socket.onopen = () => { agentChatOnline.value = true }
  socket.onerror = () => { agentChatOnline.value = false }
  socket.onclose = () => {
    if (agentWsRef.value !== socket) return; agentChatOnline.value = false
    if (agentLoading.value) {
      agentLoading.value = false
      agentReconnectTimer.value = setTimeout(() => {
        if (currentAgentChat.value?.id === agentId && view.value === 'agent-chat') {
          connectAgentWs(agentId, currentAgentSessionId.value)
        }
      }, 3000)
    }
  }
  socket.onmessage = (e) => { const data = JSON.parse(e.data); handleAgentMessage(data) }
  scrollAgentToBottom()
}

function disconnectAgentWs() {
  if (agentReconnectTimer.value) { clearTimeout(agentReconnectTimer.value); agentReconnectTimer.value = null }
  if (agentLoadingTimeout.value) { clearTimeout(agentLoadingTimeout.value); agentLoadingTimeout.value = null }
  if (agentAbortController.value) { agentAbortController.value.abort(); agentAbortController.value = null }
  if (agentWsRef.value) { const s = agentWsRef.value; agentWsRef.value = null; s.close() }
  agentChatOnline.value = false
}

// ─── User WS ───────────────────────────────────────────────────────────────────

function connectUserWs() {
  if (!token.value) return
  const wsUrl = `${config.value.wsBaseUrl}/ws/user?token=${encodeURIComponent(token.value)}`
  const socket = new WebSocket(wsUrl); userWsRef.value = socket
  socket.onopen = () => { console.log('[WS/user] Connected') }
  socket.onerror = () => { console.warn('[WS/user] Error') }
  socket.onclose = () => {
    if (userWsRef.value !== socket) return; userWsRef.value = null
    if (token.value) { setTimeout(() => { if (token.value) connectUserWs() }, 5000) }
  }
  socket.onmessage = (e) => {
    try { const msg = JSON.parse(e.data); handleUserWsMessage(msg) }
    catch (err) { console.error('[WS/user] Failed to parse message', err) }
  }
}

function disconnectUserWs() {
  if (userWsRef.value) { userWsRef.value.close(); userWsRef.value = null }
}

function handleUserWsMessage(msg) {
  if (msg.type === 'approval_pending') {
    const exists = approvals.value.some((a) => a.id === msg.approval_id)
    if (!exists) {
      approvals.value = [{
        id: msg.approval_id, agent_id: msg.agent_id, agent_name: msg.agent_name,
        action_type: msg.action_type, status: 'pending', details: msg.details,
        created_at: msg.created_at, _wsPush: true,
      }, ...approvals.value]
    }
    const toName = msg.approver_name ? `发给 ${msg.approver_name}` : '待审批'
    showToast(`[${msg.agent_name}] ${msg.action_type} — ${toName}`, 'warning')
    vibrateNotify()
  } else if (msg.type === 'approval_resolved') {
    approvals.value = approvals.value.map((a) =>
      a.id === msg.approval_id ? { ...a, status: msg.status, resolved_at: msg.resolved_at } : a)
    const label = msg.status === 'approved' ? '已批准' : '已拒绝'
    showToast(`[${msg.agent_name}] ${msg.action_type} — ${label}`, msg.status === 'approved' ? 'success' : 'error')
  } else if (msg.type === 'ping') {
    userWsRef.value?.send?.('pong')
  }
}

// ─── Agent Message Handler ─────────────────────────────────────────────────────

function handleAgentMessage(data) {
  if (data.type === 'start' || data.type === 'streaming') {
    if (agentMessages.value.length === 0 || agentMessages.value[agentMessages.value.length - 1].role !== 'assistant') {
      agentMessages.value.push({ id: `agent_${Date.now()}`, role: 'assistant', content: '' })
    }
    const last = agentMessages.value[agentMessages.value.length - 1]
    last.content = (last.content || '') + (data.content || '')
    agentLastChatTime.value[currentAgentChat.value?.id] = Date.now()
    agentLoading.value = true
  } else if (data.type === 'done' || data.type === 'message') {
    if (agentLoadingTimeout.value) { clearTimeout(agentLoadingTimeout.value); agentLoadingTimeout.value = null }
    agentLoading.value = false
    agentLastChatTime.value[currentAgentChat.value?.id] = Date.now()
    if (data.content) {
      if (agentMessages.value.length === 0 || agentMessages.value[agentMessages.value.length - 1].role !== 'assistant') {
        agentMessages.value.push({ id: `agent_${Date.now()}`, role: 'assistant', content: data.content })
      } else {
        agentMessages.value[agentMessages.value.length - 1].content = data.content
      }
    }
  } else if (data.type === 'error') {
    if (agentLoadingTimeout.value) { clearTimeout(agentLoadingTimeout.value); agentLoadingTimeout.value = null }
    agentLoading.value = false
    agentMessages.value.push({ id: `agent_error_${Date.now()}`, role: 'assistant', content: `错误: ${data.content || '未知错误'}` })
  }
  nextTick(() => { if (agentListRef.value) agentListRef.value.scrollTop = agentListRef.value.scrollHeight })
}

// ─── Agent Sessions ────────────────────────────────────────────────────────────

async function loadAgentSessions(agentId) {
  try {
    const sessions = await request(`/api/agents/${agentId}/sessions`)
    agentSessions.value = (sessions || []).map((s) => ({
      session_id: s.id, name: s.title || '新会话',
      created_at: s.created_at, updated_at: s.last_message_at || s.created_at, message_count: s.message_count || 0,
    }))
    const latest = sessions?.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))[0]
    if (latest?.last_message_at) { agentLastChatTime.value[agentId] = new Date(latest.last_message_at).getTime() }
  } catch (e) { console.error('加载会话列表失败:', e); agentSessions.value = [] }
}

function switchAgentSession(sessionId) {
  if (sessionId === currentAgentSessionId.value) { agentSidebarOpen.value = false; return }
  disconnectAgentWs()
  currentAgentSessionId.value = sessionId; agentMessages.value = []; agentLoading.value = false; agentSidebarOpen.value = false
  loadAgentMessages(currentAgentChat.value.id, sessionId); connectAgentWs(currentAgentChat.value.id, sessionId)
}

async function startNewAgentSession() {
  try {
    const result = await request(`/api/agents/${currentAgentChat.value.id}/sessions`, {
      method: 'POST', body: JSON.stringify({ title: `会话 ${new Date().toLocaleString('zh-CN')}` }),
    })
    disconnectAgentWs()
    currentAgentSessionId.value = result.id; agentMessages.value = []; agentLoading.value = false; agentSidebarOpen.value = false
    agentSessions.value.unshift({ session_id: result.id, name: result.title || '新会话', created_at: result.created_at, updated_at: result.created_at, message_count: 0 })
    connectAgentWs(currentAgentChat.value.id, result.id)
  } catch (e) {
    console.error('创建会话失败:', e)
    disconnectAgentWs(); currentAgentSessionId.value = null; agentMessages.value = []; agentLoading.value = false; agentSidebarOpen.value = false
    connectAgentWs(currentAgentChat.value.id, null)
  }
}

async function deleteAgentSession(sessionId) {
  try {
    await request(`/api/agents/${currentAgentChat.value.id}/sessions/${sessionId}`, { method: 'DELETE' })
    agentSessions.value = agentSessions.value.filter((s) => s.session_id !== sessionId)
    if (currentAgentSessionId.value === sessionId) { startNewAgentSession() }
  } catch (e) { console.error('删除会话失败:', e) }
}

async function loadAgentMessages(agentId, sessionId) {
  try {
    const msgs = await request(`/api/agents/${agentId}/sessions/${sessionId}/messages`)
    if (msgs?.length > 0) {
      agentMessages.value = msgs.filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ id: m.id || `msg_${Date.now()}_${Math.random()}`, role: m.role, content: m.content || '' }))
    }
    scrollAgentToBottom()
  } catch (e) { console.error('加载历史消息失败:', e) }
}

function sendAgentMessage() {
  const text = agentComposer.value.trim()
  if (!text || !agentWsRef.value || agentWsRef.value.readyState !== WebSocket.OPEN || agentLoading.value) return
  if (agentLoadingTimeout.value) { clearTimeout(agentLoadingTimeout.value); agentLoadingTimeout.value = null }
  agentLoadingTimeout.value = setTimeout(() => {
    if (agentLoading.value) {
      agentLoading.value = false
      agentMessages.value.push({ id: `agent_timeout_${Date.now()}`, role: 'assistant', content: '⚠️ 回复超时了，AI 还在思考，请稍后再试' })
      agentLoadingTimeout.value = null
    }
  }, 180000)
  agentMessages.value.push({ id: `user_${Date.now()}`, role: 'user', content: text })
  agentLastChatTime.value[currentAgentChat.value.id] = Date.now()
  agentWsRef.value.send(JSON.stringify({ content: text }))
  agentComposer.value = ''; agentLoading.value = true
  agentMessages.value.push({ id: `agent_${Date.now() + 1}`, role: 'assistant', content: '' })
  nextTick(() => { if (agentListRef.value) agentListRef.value.scrollTop = agentListRef.value.scrollHeight })
}

function scrollAgentToBottom() {
  nextTick(() => { if (agentListRef.value) agentListRef.value.scrollTop = agentListRef.value.scrollHeight })
}

function autoResizeAgentComposer() {
  const el = agentComposerRef.value; if (!el) return
  el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

// ─── Voice Recording ───────────────────────────────────────────────────────────

async function startRecording() {
  if (isRecording.value || isTranscribing.value) return
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm'
    audioChunks.value = []
    mediaRecorder.value = new MediaRecorder(stream, { mimeType })
    mediaRecorder.value.ondataavailable = (e) => { if (e.data?.size > 0) audioChunks.value.push(e.data) }
    mediaRecorder.value.onstop = async () => { stream.getTracks().forEach(t => t.stop()); await transcribeAudio() }
    recordingStartTime.value = Date.now(); recordingDuration.value = 0
    recordingTimer.value = setInterval(() => { recordingDuration.value = Math.floor((Date.now() - recordingStartTime.value) / 1000) }, 1000)
    mediaRecorder.value.start(); isRecording.value = true
  } catch (e) { console.error('无法访问麦克风:', e); alert('请允许麦克风权限后重试') }
}

async function transcribeAudio() {
  if (audioChunks.value.length === 0) return
  isRecording.value = false; isTranscribing.value = true
  clearInterval(recordingTimer.value); recordingTimer.value = null
  const blob = new Blob(audioChunks.value, { type: audioChunks.value[0]?.type || 'audio/webm' })
  audioChunks.value = []
  const formData = new FormData(); formData.append('file', blob, `voice_${Date.now()}.webm`)
  try {
    const res = await fetch(`${config.value.apiBaseUrl}/api/stt/transcribe`, {
      method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: formData,
    })
    if (res.ok) {
      const data = await res.json()
      if (data.text && data.text.trim()) {
        agentComposer.value += data.text.trim()
        nextTick(() => {
          if (agentComposerRef.value) {
            agentComposerRef.value.style.height = 'auto'
            agentComposerRef.value.style.height = Math.min(agentComposerRef.value.scrollHeight, 120) + 'px'
            agentComposerRef.value.focus()
          }
        })
      } else {
        showToast('未检测到语音，请重试', 'warning')
      }
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(err.detail || `转写失败 (${res.status})`, 'error')
    }
  } catch (e) {
    console.error('转写请求失败:', e)
    showToast('网络错误，转写失败', 'error')
  }
  finally { isTranscribing.value = false; recordingDuration.value = 0 }
}

function stopRecording() {
  if (mediaRecorder.value && isRecording.value) { mediaRecorder.value.stop() }
  isRecording.value = false; clearInterval(recordingTimer.value); recordingTimer.value = null; recordingDuration.value = 0
}

function formatSessionTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp); const now = new Date(); const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

function updateTime() {
  const now = new Date()
  currentTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

let pollTimer = null
function startPolling() { stopPolling(); pollTimer = setInterval(() => { if (authed.value) void loadApprovals() }, 20000) }
function stopPolling() { if (!pollTimer) return; clearInterval(pollTimer); pollTimer = null }

async function request(path, options = {}, auth = true) {
  const res = await fetch(`${config.value.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (res.status === 401 && auth) { logout(); throw new Error('登录过期') }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

function syncUrl() {
  const next = new URL(window.location.href)
  if (approvalId.value) next.searchParams.set('approvalId', approvalId.value)
  else next.searchParams.delete('approvalId')
  next.searchParams.delete('token')
  window.history.replaceState({}, '', next.toString())
}

watch(config, (v) => localStorage.setItem('openchat-mobile-config', JSON.stringify(v)), { deep: true })
watch(approvalId, syncUrl)

onMounted(async () => {
  updateTime(); timeInterval = setInterval(updateTime, 60000)
  initTheme(); theme.value = getStoredTheme()
  registerServiceWorker()
  window.addEventListener('online', () => { isOffline.value = false })
  window.addEventListener('offline', () => { isOffline.value = true })
  if (query.get('token')) localStorage.setItem('openchat-mobile-token', query.get('token'))
  if (token.value) {
    try { await bootstrap() }
    catch (e) { authError.value = e.message || '恢复登录失败' }
  }
  ready.value = true
})

onUnmounted(() => {
  clearInterval(timeInterval); timeInterval = null
  window.removeEventListener('online', () => { isOffline.value = false })
  window.removeEventListener('offline', () => { isOffline.value = true })
})

onBeforeUnmount(() => {
  disconnectWs(); disconnectAgentWs(); disconnectUserWs(); stopPolling()
  if (timeInterval) clearInterval(timeInterval)
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

function normalizeBase(v) { return (v || window.location.origin).replace(/\/+$/, '') }
function toWsBase(v) { return normalizeBase(v).replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') }
function readJson(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') } catch { return {} } }
function avatarText(v) { return String(v || '系').charAt(0) }
function shortId(v) { return v ? String(v).slice(0, 8) : '-' }
function absoluteTime(v) { return v ? new Date(v).toLocaleString('zh-CN') : '-' }
function approvalJson(v) { try { return JSON.stringify(v || {}, null, 2) } catch { return String(v || '') } }
function statusLabel(s) { return { pending: '待处理', approved: '已批准', rejected: '已拒绝' }[s] || s || '未知' }
function statusClass(s) { return { approved: 's-ok', rejected: 's-no' }[s] || 's-pending' }
function actionLabel(a) {
  return { write_workspace_files: '写入工作区文件', delete_files: '删除文件', send_feishu_message: '发送飞书消息', web_search: '联网搜索', execute_code: '执行代码' }[a] || a || '审批操作'
}
function riskLabel(a) {
  if (a === 'delete_files' || a === 'execute_code') return '高风险'
  if (a === 'send_feishu_message' || a === 'web_search') return '外部动作'
  return '常规'
}
function riskClass(a) {
  if (a === 'delete_files' || a === 'execute_code') return 'r-high'
  if (a === 'send_feishu_message' || a === 'web_search') return 'r-mid'
  return 'r-low'
}
function approvalBrief(a) {
  const tool = toolLabel(a.details?.tool)
  const args = a.details?.args ? String(a.details.args).replace(/\s+/g, ' ').slice(0, 60) : ''
  return args ? `${tool} · ${args}${args.length >= 60 ? '...' : ''}` : `即将执行 ${tool}`
}
function toolLabel(t) {
  return { write_file: '写文件', delete_file: '删文件', send_feishu_message: '发飞书', send_message_to_agent: '发消息', send_file_to_agent: '发文件', web_search: '联网搜索', execute_code: '执行代码' }[t] || t || '未知'
}
function roleLabel(role) {
  return { platform_admin: '平台管理员', enterprise_admin: '企业管理员', agent_admin: 'Agent 管理员', user: '普通成员' }[role] || role || '普通成员'
}

// Expose to template
const __templateHelpers = { statusLabel, statusClass, actionLabel, riskLabel, riskClass, approvalBrief, toolLabel, shortId, absoluteTime, approvalJson, roleLabel }
</script>

<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); }
body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; color: var(--text-primary); font-size: 15px; -webkit-font-smoothing: antialiased; }
button, input, textarea, select { font-family: inherit; font-size: inherit; }
button { border: none; background: none; cursor: pointer; padding: 0; }
pre, code { font-family: "Cascadia Code", Consolas, monospace; }
</style>

<style scoped>
.app-shell {
  --bg: #F5F5F5; --surface: #FFFFFF; --accent: #2563EB; --accent-light: #EFF6FF; --accent-mid: #DBEAFE;
  --text-primary: #1E293B; --text-secondary: #64748B; --text-muted: #94A3B8;
  --border: #E2E8F0; --warn-bg: #FFFBEB; --warn-text: #B45309; --warn-border: #FDE68A;
  --error: #DC2626; --green: #059669;
  min-height: 100vh; max-width: 100%; background: var(--bg);
}
[data-theme="dark"] .app-shell {
  --bg: #0f172a; --surface: #1E293B; --accent: #3B82F6; --accent-light: #1E3A5F; --accent-mid: #1E3A5F;
  --text-primary: #F1F5F9; --text-secondary: #94A3B8; --text-muted: #64748B;
  --border: #334155; --error: #EF4444; --green: #10B981;
  --warn-bg: #1C1400; --warn-text: #FCD34D; --warn-border: #713F12;
}
.skeleton-root { min-height: 100vh; background: var(--surface); }
.offline-banner {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 6px 12px; background: var(--warn-bg); color: var(--warn-text);
  font-size: 12px; font-weight: 500; border-bottom: 1px solid var(--warn-border);
}
.page-list, .page-chat, .page-approvals { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.agent-chat-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.agent-sidebar {
  position: fixed; top: 0; left: 0; width: 280px; height: 100vh; background: var(--surface);
  z-index: 200; display: flex; flex-direction: column; transform: translateX(-100%); transition: transform 0.25s ease;
}
.page-chat.sidebar-open .agent-sidebar { transform: translateX(0); }
.sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 199; }
.sidebar-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.sidebar-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: var(--accent); }
.sidebar-title { flex: 1; font-size: 16px; font-weight: 600; color: var(--text-primary); }
.btn-new-chat { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--accent); color: var(--surface); border-radius: 8px; }
.btn-new-chat:active { opacity: 0.8; }
.session-list { flex: 1; overflow-y: auto; }
.session-item { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--accent-light); cursor: pointer; transition: background 0.15s; }
.session-item:hover { background: var(--bg); }
.session-item.active { background: var(--accent-light); border-left: 3px solid var(--accent); }
.session-info { flex: 1; min-width: 0; }
.session-name { font-size: 15px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-item.active .session-name { font-weight: 600; }
.session-time { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.session-delete { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); border-radius: 6px; flex-shrink: 0; }
.session-delete:hover { background: #FFF0F0; color: var(--error); }
.session-empty { padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 14px; }
.header-menu, .header-new, .header-session-list { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--accent); }
.wx-header { height: 50px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 12px; flex-shrink: 0; position: relative; z-index: 10; }
.header-left, .header-right { width: 80px; }
.header-right { display: flex; justify-content: flex-end; align-items: center; gap: 2px; }
.header-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: var(--text-primary); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 5px; }
.header-online-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); flex-shrink: 0; }
.header-online-dot.on { background: var(--green); }
.header-back { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--accent); }
.online-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); display: inline-block; }
.online-dot.on { background: var(--green); box-shadow: 0 0 0 2px rgba(5,150,105,0.15); }
.user-info { cursor: pointer; }
.user-avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: var(--surface); color: var(--text-primary); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.user-menu-overlay { position: fixed; inset: 0; z-index: 99; }
.user-menu { position: absolute; top: 50px; right: 8px; width: 240px; background: var(--surface); border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 100; overflow: hidden; animation: slideDown 0.15s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.user-menu-info { display: flex; align-items: center; gap: 12px; padding: 16px; }
.user-avatar-lg { width: 44px; height: 44px; border-radius: 50%; background: var(--surface); color: var(--text-primary); font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.user-menu-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.user-menu-role { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.user-menu-divider { height: 1px; background: var(--accent-light); }
.user-menu-btn { width: 100%; padding: 14px 16px; text-align: left; font-size: 15px; color: var(--text-primary); transition: background 0.15s; display: flex; align-items: center; gap: 8px; }
.user-menu-btn:hover { background: var(--bg); }
.user-menu-btn.logout { color: var(--error); }
.search-bar { padding: 8px 12px; background: var(--bg); flex-shrink: 0; }
.search-input { width: 100%; padding: 8px 12px; border: none; border-radius: 6px; background: var(--surface); font-size: 14px; outline: none; }
.home-tab-bar { display: flex; background: var(--surface); border-top: 1px solid var(--border); flex-shrink: 0; }
.home-tab-bar button { flex: 1; padding: 11px; font-size: 15px; color: var(--text-secondary); border-top: 2px solid transparent; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.home-tab-bar button.active { color: var(--accent); border-top-color: var(--accent); }
.home-tab-badge { background: var(--error); color: var(--surface); font-size: 11px; font-weight: 700; padding: 1px 5px; border-radius: 3px; }
.home-tab-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.section-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 6px; }
.section-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.section-count { font-size: 12px; color: var(--text-muted); }
.section-label-row { display: flex; align-items: center; justify-content: space-between; padding: 0 0 6px; }
.btn-add-section { width: 24px; height: 24px; border-radius: 50%; background: var(--accent); border: none; cursor: pointer; color: var(--surface); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s; }
.btn-add-section:active { opacity: 0.7; }
.agents-section { background: var(--surface); border-bottom: 1px solid var(--accent-light); padding: 8px 16px 12px; }
.agents-scroll { display: flex; gap: 12px; padding: 6px 0 0; overflow-x: auto; scrollbar-width: none; }
.agents-scroll::-webkit-scrollbar { display: none; }
.agents-empty { display: flex; align-items: center; gap: 8px; padding: 12px 0; color: var(--text-muted); font-size: 14px; cursor: pointer; }
.agents-empty:active { color: var(--accent); }
.agent-card { display: flex; flex-direction: column; align-items: center; gap: 5px; min-width: 64px; cursor: pointer; flex-shrink: 0; }
.agent-card:active { opacity: 0.7; }
.agent-avatar { width: 48px; height: 48px; border-radius: 12px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: var(--surface); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.agent-name { font-size: 12px; font-weight: 500; color: var(--text-primary); max-width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
.unread-badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--error); color: var(--surface); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.conversations { flex: 1; overflow-y: auto; }
.conv-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--accent-light); cursor: pointer; transition: background 0.15s; }
.conv-item:active { background: var(--accent-light); }
.conv-item.active { background: var(--accent-light); }
.conv-avatar { width: 46px; height: 46px; border-radius: 10px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: var(--surface); position: relative; flex-shrink: 0; }
.conv-body { flex: 1; min-width: 0; }
.conv-top { display: flex; justify-content: space-between; align-items: baseline; }
.conv-name { font-size: 16px; font-weight: 500; color: var(--text-primary); }
.conv-time { font-size: 12px; color: var(--text-muted); flex-shrink: 0; }
.conv-desc { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.conv-preview { font-size: 13px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.agent-count { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: var(--accent); color: var(--surface); flex-shrink: 0; margin-left: 8px; }
.empty-search, .empty-list { padding: 60px 20px; text-align: center; color: var(--text-secondary); font-size: 15px; }
.empty-list .hint { font-size: 13px; color: var(--text-muted); margin-top: 8px; }
.tab-bar { display: flex; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
.tab-bar button { flex: 1; padding: 12px; font-size: 15px; color: var(--text-secondary); border-bottom: 2px solid transparent; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; }
.tab-bar button.active { color: var(--accent); border-bottom-color: var(--accent); }
.red-badge { background: var(--error); color: var(--surface); font-size: 11px; font-weight: 700; padding: 1px 5px; border-radius: 3px; }
.chat-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.message-list { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.empty-msgs { text-align: center; padding: 60px 0; color: var(--text-secondary); }
.empty-msgs p { margin: 0; }
.empty-msgs p:first-child { font-size: 15px; margin-bottom: 8px; }
.empty-msgs .hint { font-size: 13px; color: var(--text-muted); }
.msg-item { display: flex; gap: 10px; align-items: flex-start; }
.msg-item.msg-me { flex-direction: row-reverse; }
.msg-item.msg-sys { justify-content: center; }
.msg-item.msg-agent:not(.msg-me) .msg-avatar { background: var(--accent); color: var(--surface); }
.msg-avatar { width: 40px; height: 40px; border-radius: 8px; background: var(--accent-light); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: var(--text-secondary); flex-shrink: 0; cursor: pointer; user-select: none; }
.msg-avatar.avatar-me { background: var(--accent); color: var(--surface); }
.agent-msg-avatar { background: var(--accent) !important; color: var(--surface) !important; }
.msg-content { max-width: 78%; display: flex; flex-direction: column; gap: 5px; }
.msg-me .msg-content { align-items: flex-end; }
.msg-name { font-size: 12px; color: var(--text-secondary); padding: 0 4px; cursor: pointer; user-select: none; }
.msg-bubble { position: relative; padding: 10px 14px; background: var(--surface); border-radius: 10px; font-size: 15px; line-height: 1.55; color: var(--text-primary); box-shadow: 0 1px 2px rgba(0,0,0,0.06); word-break: break-word; }
.msg-bubble::before { content: ''; position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid var(--surface); }
.msg-me .msg-bubble { background: var(--accent); color: var(--surface); border-radius: 10px 4px 10px 10px; }
.msg-me .msg-bubble::before { left: auto; right: -8px; border-right: none; border-left: 8px solid var(--accent); }
.bubble-inner { min-width: 0; }
.bubble-inner .md-p { margin: 0 0 4px; line-height: 1.55; }
.bubble-inner .md-p:last-child { margin-bottom: 0; }
.bubble-inner .md-h1, .bubble-inner .md-h2, .bubble-inner .md-h3 { margin: 8px 0 4px; font-weight: 600; }
.bubble-inner .md-ul, .bubble-inner .md-ol { margin: 4px 0; padding-left: 20px; }
.bubble-inner li { margin: 2px 0; }
.bubble-inner .inline-code { background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px; font-family: "Cascadia Code", Consolas, monospace; font-size: 0.9em; }
.bubble-inner .code-block { background: var(--bg); border-radius: 6px; padding: 10px 12px; margin: 6px 0; overflow-x: auto; font-size: 12px; line-height: 1.5; }
.bubble-inner .code-block code { font-family: "Cascadia Code", Consolas, monospace; }
.bubble-inner .md-link { color: var(--text-secondary); }
.bubble-inner .md-blockquote { border-left: 3px solid var(--accent); margin: 4px 0; padding: 4px 10px; background: var(--accent-light); border-radius: 0 4px 4px 0; color: var(--text-secondary); }
.bubble-inner .md-hr { border: none; border-top: 1px solid var(--border); margin: 10px 0; }
.bubble-inner .md-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 13px; }
.bubble-inner .md-table th, .bubble-inner .md-table td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; }
.bubble-inner .md-table th { background: var(--bg); font-weight: 600; }
.sys-msg { padding: 5px 12px; background: rgba(0,0,0,0.04); border-radius: 4px; font-size: 12px; color: var(--text-secondary); }
.loading-agents { display: flex; align-items: center; gap: 8px; padding: 8px 0; font-size: 13px; color: var(--text-secondary); }
.loading-dots { display: flex; gap: 4px; }
.loading-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: loadingPulse 1.2s ease-in-out infinite; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes loadingPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.mention-picker { position: absolute; bottom: 0; left: 0; right: 0; background: var(--surface); border-top: 1px solid var(--border); box-shadow: 0 -4px 16px rgba(0,0,0,0.1); z-index: 50; max-height: 200px; overflow-y: auto; animation: slideUp 0.15s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.mention-header { padding: 8px 14px; font-size: 12px; color: var(--text-secondary); background: var(--bg); border-bottom: 1px solid var(--accent-light); }
.mention-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background 0.1s; }
.mention-item:hover, .mention-item.selected { background: var(--bg); }
.mention-avatar { width: 32px; height: 32px; border-radius: 6px; background: var(--surface); color: var(--surface); font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.mention-name { font-size: 14px; color: var(--text-primary); }
.composer-input-wrap { flex: 1; min-width: 0; display: flex; align-items: flex-end; }
.composer-bar { display: flex; align-items: flex-end; gap: 6px; padding: 8px 10px; background: var(--bg); border-top: 1px solid var(--border); flex-shrink: 0; }
.composer-input { flex: 1; width: 100%; padding: 9px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); font-size: 15px; line-height: 1.5; resize: none; outline: none; max-height: 120px; overflow-y: auto; transition: border-color 0.2s; box-sizing: border-box; }
.composer-input:focus { border-color: var(--accent); }
.composer-input:disabled { background: var(--bg); }
.btn-send { width: 40px; height: 40px; border-radius: 50%; background: var(--text-muted); color: var(--surface); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.2s, transform 0.1s; padding: 0; }
.btn-send.active { background: var(--accent); }
.btn-send.active:active { transform: scale(0.94); }
.btn-send:disabled { background: var(--text-muted); cursor: not-allowed; }
.btn-voice { width: 40px; height: 40px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); flex-shrink: 0; transition: all 0.2s; }
.btn-voice:active:not(:disabled) { background: var(--accent-light); }
.btn-voice.recording { background: var(--error); border-color: var(--error); color: var(--surface); }
.recording-count { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; color: inherit; }
.recording-icon { animation: recording-pulse 1s ease-in-out infinite; }
@keyframes recording-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.approvals-section { flex: 1; overflow-y: auto; min-height: 0; }
.btn-group-info { width: 34px; height: 34px; border-radius: 50%; background: transparent; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; }
.btn-group-info:active { background: var(--bg); }
</style>
