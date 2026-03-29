<template>
  <main class="app-shell">

    <!-- Loading -->
    <div v-if="!ready" class="loading">
      <div class="loading-icon">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="10" fill="var(--accent)"/>
          <path d="M13 22h18M22 13v18" stroke="var(--surface)" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <span>OpenChat</span>
    </div>

    <!-- Auth -->
    <div v-else-if="!authed" class="auth-page">
      <div class="auth-header">
        <div class="auth-logo">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <rect width="52" height="52" rx="14" fill="var(--accent)"/>
            <path d="M15 26h22M26 15v22" stroke="var(--surface)" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        <h1>OpenChat 工作台</h1>
        <p>Agent 协作与审批中心</p>
      </div>

      <div class="auth-body">
        <div class="auth-tabs">
          <button :class="{ active: authMode === 'login' }" @click="authMode = 'login'">登录</button>
          <button :class="{ active: authMode === 'config' }" @click="authMode = 'config'">配置</button>
        </div>

        <form v-if="authMode === 'login'" class="auth-form" @submit.prevent="login">
          <div class="form-item">
            <input v-model.trim="form.username" type="text" placeholder="用户名" autocomplete="username" />
          </div>
          <div class="form-item">
            <input v-model="form.password" type="password" placeholder="密码" autocomplete="current-password" />
          </div>
          <p v-if="authError" class="auth-error">{{ authError }}</p>
          <button type="submit" class="btn-login" :disabled="loginBusy">
            {{ loginBusy ? '登录中...' : '登录' }}
          </button>
        </form>

        <div v-else class="config-form">
          <div class="form-item">
            <label>API 地址</label>
            <input v-model.trim="config.apiBaseUrl" type="text" placeholder="http://192.168.1.5:8004" />
          </div>
          <div class="form-item">
            <label>WebSocket 地址</label>
            <input v-model.trim="config.wsBaseUrl" type="text" placeholder="ws://192.168.1.5:8004" />
          </div>
        </div>
      </div>
    </div>

    <!-- Main: Conversation List -->
    <div v-else-if="view === 'list'" class="page-list">

      <!-- Header -->
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
        <button class="user-menu-btn logout" @click="logout">退出登录</button>
      </div>
      <div v-if="showUserMenu" class="user-menu-overlay" @click="showUserMenu = false"></div>

      <!-- Search -->
      <div class="search-bar">
        <input v-model="searchKeyword" type="text" placeholder="搜索" class="search-input" />
      </div>

      <!-- 聊天 Tab -->
      <div v-show="listTab === 'chat'" class="home-tab-content">

      <!-- Digital Employees -->
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
          <div
            v-for="agent in filteredAgents"
            :key="agent.id"
            class="agent-card"
            @click="openAgent(agent)"
          >
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

      <!-- Team List -->
      <div class="section-header">
        <span class="section-label">群聊</span>
        <span class="section-count">{{ filteredTeams.length }} 个</span>
      </div>

      <div class="conversations">
        <div
          v-for="team in filteredTeams"
          :key="team.id"
          class="conv-item"
          :class="{ active: team.id === activeTeamId }"
          @click="openTeam(team)"
        >
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

        <div v-if="filteredTeams.length === 0 && searchKeyword" class="empty-search">
          <p>没有找到匹配的群聊</p>
        </div>

        <div v-if="teams.length === 0" class="empty-list">
          <p>暂无群聊</p>
          <p class="hint">在网页端创建群聊后，这里将显示</p>
        </div>
      </div>
      </div><!-- /chat tab -->

      <!-- 待办 Tab -->
      <div v-show="listTab === 'todo'" class="home-tab-content">
        <div class="approval-filters">
          <button :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">
            待处理 <span v-if="pendingCount" class="filter-count">{{ pendingCount }}</span>
          </button>
          <button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
        </div>

        <div class="refresh-bar">
          <button class="btn-refresh" @click="loadApprovals" :disabled="approvalsBusy">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" :class="{ spinning: approvalsBusy }">
              <path d="M12 7A5 5 0 112.3 3.2M12 3.2V1M12 3.2H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            刷新
          </button>
        </div>

        <p v-if="approvalError" class="approval-error">{{ approvalError }}</p>

        <div v-if="!visibleApprovals.length && !approvalsBusy" class="empty-approval">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="22" fill="var(--bg)"/>
            <path d="M18 28l7 7 13-13" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>没有待处理审批</p>
        </div>

        <div class="approval-list">
          <div
            v-for="item in visibleApprovals"
            :key="item.id"
            class="approval-item"
            :class="{ focused: item.id === approvalId }"
            @click="approvalId = item.id; view = 'approvals'"
          >
            <div class="approval-top">
              <div class="approval-info">
                <div class="approval-agent">{{ item.agent_name || shortId(item.agent_id) }}</div>
                <div class="approval-action">{{ actionLabel(item.action_type) }}</div>
              </div>
              <span class="approval-status" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
            </div>

            <div class="approval-tags">
              <span class="tag" :class="riskClass(item.action_type)">{{ riskLabel(item.action_type) }}</span>
              <span class="tag">{{ toolLabel(item.details?.tool) }}</span>
            </div>

            <div class="approval-desc">{{ approvalBrief(item) }}</div>

            <div class="approval-meta">
              <span>{{ absoluteTime(item.created_at) }}</span>
              <span>编号: {{ shortId(item.id) }}</span>
            </div>

            <div v-if="item.status === 'pending'" class="approval-btns" @click.stop>
              <button class="btn-ok" :disabled="actionBusy === item.id" @click="resolveApproval(item, 'approve')">批准</button>
              <button class="btn-no" :disabled="actionBusy === item.id" @click="resolveApproval(item, 'reject')">拒绝</button>
            </div>
          </div>
        </div>
      </div><!-- /todo tab -->

      <!-- Bottom Tab Bar -->
      <nav class="home-tab-bar">
        <button :class="{ active: listTab === 'chat' }" @click="listTab = 'chat'">聊天</button>
        <button :class="{ active: listTab === 'todo' }" @click="listTab = 'todo'">
          审批
          <span v-if="pendingCount > 0" class="home-tab-badge">{{ pendingCount > 99 ? '99+' : pendingCount }}</span>
        </button>
      </nav>
    </div>

    <!-- Agent Chat (Private) -->
    <div v-else-if="view === 'agent-chat'" class="page-chat" :class="{ 'sidebar-open': agentSidebarOpen }">

      <!-- Agent Sidebar -->
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
          <div
            v-for="session in agentSessions"
            :key="session.session_id"
            class="session-item"
            :class="{ active: session.session_id === currentAgentSessionId }"
            @click="switchAgentSession(session.session_id)"
          >
            <div class="session-info">
              <div class="session-name">{{ session.name || '新会话' }}</div>
              <div class="session-time">{{ formatSessionTime(session.updated_at) }}</div>
            </div>
            <button v-if="session.session_id !== currentAgentSessionId" class="session-delete" @click.stop="deleteAgentSession(session.session_id)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div v-if="!agentSessions.length" class="session-empty">
            <p>暂无会话记录</p>
          </div>
        </div>
      </div>
      <div v-if="agentSidebarOpen" class="sidebar-overlay" @click="agentSidebarOpen = false"></div>

      <!-- Chat Main -->
      <div class="agent-chat-main">

        <!-- Header -->
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

        <!-- Messages -->
        <div ref="agentListRef" class="message-list">
          <div v-if="!agentMessages.length" class="empty-msgs">
            <p>开始和 {{ currentAgentChat?.name }} 私聊</p>
            <p class="hint">直接发送消息，AI 会回复</p>
          </div>
          <div
            v-for="msg in agentMessages"
            :key="msg.id"
            class="msg-item"
            :class="{
              'msg-me': msg.role === 'user',
              'msg-agent': msg.role === 'assistant'
            }"
          >
            <template v-if="msg.role === 'assistant'">
              <div class="msg-avatar agent-msg-avatar">{{ currentAgentChat?.name?.charAt(0) }}</div>
              <div class="msg-content">
                <div class="msg-name">{{ currentAgentChat?.name }}</div>
                <div class="msg-bubble">
                  <div class="bubble-inner" v-html="renderMarkdown(msg.content)"></div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="msg-avatar avatar-me">{{ avatarText(currentUser?.display_name || currentUser?.username) }}</div>
              <div class="msg-content">
                <div class="msg-name">{{ currentUser?.display_name || currentUser?.username }}</div>
                <div class="msg-bubble bubble-me">
                  <div class="bubble-inner">{{ msg.content }}</div>
                </div>
              </div>
            </template>
          </div>
          <div v-if="agentLoading" class="loading-agents">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            {{ currentAgentChat?.name }} 正在回复...
          </div>
        </div>

        <!-- Composer -->
        <div class="composer-bar">
          <button
            class="btn-voice"
            :class="{ recording: isRecording }"
            :disabled="isRecording || isTranscribing"
            @mousedown="startRecording"
            @mouseup="stopRecording"
            @mouseleave="stopRecording"
            @touchstart.prevent="startRecording"
            @touchend.prevent="stopRecording"
            title="按住说话"
          >
            <!-- WeChat-style mic: simple, clean -->
            <svg v-if="!isRecording && !isTranscribing" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="7" r="3.5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M5 9c0 2.2 1.8 4 4 4s4-1.8 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              <path d="M9 13v2M7 15h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <!-- Recording: pulsing ring -->
            <svg v-else-if="isRecording" width="18" height="18" viewBox="0 0 18 18" fill="none" class="recording-icon">
              <circle cx="9" cy="9" r="6" fill="currentColor" opacity="0.9"/>
            </svg>
            <!-- Transcribing: loading -->
            <svg v-else-if="isTranscribing" width="18" height="18" viewBox="0 0 18 18" fill="none" class="spinning">
              <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="20 8" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="composer-input-wrap">
            <textarea
              ref="agentComposerRef"
              v-model="agentComposer"
              class="composer-input"
              placeholder="发送消息..."
              rows="1"
              @keydown.enter.exact.prevent="sendAgentMessage"
              @input="autoResizeAgentComposer"
            ></textarea>
          </div>
          <button
            class="btn-send"
            :class="{ active: agentComposer.trim() }"
            :disabled="(!agentCanSend && !agentComposer.trim()) || isRecording || isTranscribing"
            @click="sendAgentMessage"
            title="发送"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Chat -->
    <div v-else-if="view === 'chat'" class="page-chat">

      <!-- Header -->
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

      <!-- Tab Bar -->
      <nav class="tab-bar">
        <button :class="{ active: tab === 'chat' }" @click="tab = 'chat'">聊天</button>
        <button :class="{ active: tab === 'approvals' }" @click="tab = 'approvals'">
          审批
          <span v-if="teamPendingCount > 0" class="red-badge">{{ teamPendingCount }}</span>
        </button>
      </nav>

      <!-- Chat Tab -->
      <section v-show="tab === 'chat'" class="chat-section">

        <!-- Messages -->
        <div ref="listRef" class="message-list">
          <div v-if="!messages.length" class="empty-msgs">
            <p>没有消息记录</p>
            <p class="hint">发送消息开始对话</p>
          </div>
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="msg-item"
            :class="{
              'msg-me': msg.senderId === currentUser.id,
              'msg-sys': msg.type === 'system',
              'msg-agent': msg.senderType === 'agent' || msg.senderType === 'assistant'
            }"
            @touchmove.passive="cancelMsgTouch"
          >
            <template v-if="msg.type === 'system'">
              <div class="sys-msg">{{ msg.text }}</div>
            </template>
            <template v-else>
              <div
                class="msg-avatar"
                :class="{ 'avatar-me': msg.senderId === currentUser.id }"
                @contextmenu.prevent="insertMentionFromMsg(msg)"
                @touchstart.passive="onMsgTouchStart(msg, $event)"
                @touchend.passive="onMsgTouchEnd(msg)"
                @touchcancel.passive="cancelMsgTouch"
              >
                {{ avatarText(msg.senderName) }}
              </div>
              <div class="msg-content">
                <div
                  class="msg-name"
                  @contextmenu.prevent="insertMentionFromMsg(msg)"
                  @touchstart.passive="onMsgTouchStart(msg, $event)"
                  @touchend.passive="onMsgTouchEnd(msg)"
                  @touchcancel.passive="cancelMsgTouch"
                >{{ msg.senderName || '未知' }}</div>
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
          <div
            v-for="(agent, idx) in mentionAgents"
            :key="agent.id"
            class="mention-item"
            :class="{ selected: idx === mentionSelectedIdx }"
            @click="insertMention(agent)"
          >
            <span class="mention-avatar">{{ agent.name.charAt(0) }}</span>
            <span class="mention-name">{{ agent.name }}</span>
          </div>
        </div>

        <!-- Composer -->
        <div class="composer-bar">
          <textarea
            ref="composerRef"
            v-model="composer"
            class="composer-input"
            placeholder="输入消息..."
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
            @keydown="handleComposerKeydown"
            @input="handleComposerInput"
          ></textarea>
          <button
            class="btn-send"
            :class="{ active: composer.trim() }"
            :disabled="!canSend"
            @click="sendMessage"
            title="发送"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Approvals Tab -->
      <section v-show="tab === 'approvals'" class="approvals-section">
        <div class="approval-filters">
          <button :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">
            待处理 <span v-if="pendingCount" class="filter-count">{{ pendingCount }}</span>
          </button>
          <button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
          <button :class="{ active: scopeFilter === 'team' }" :disabled="!currentTeam" @click="scopeFilter = 'team'">当前群聊</button>
          <button :class="{ active: scopeFilter === 'all' }" @click="scopeFilter = 'all'">全部</button>
        </div>

        <div class="refresh-bar">
          <button class="btn-refresh" @click="loadApprovals" :disabled="approvalsBusy">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" :class="{ spinning: approvalsBusy }">
              <path d="M12 7A5 5 0 112.3 3.2M12 3.2V1M12 3.2H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            刷新
          </button>
        </div>

        <p v-if="approvalError" class="approval-error">{{ approvalError }}</p>

        <div v-if="!visibleApprovals.length && !approvalsBusy" class="empty-approval">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="22" fill="var(--bg)"/>
            <path d="M18 28l7 7 13-13" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>没有待处理审批</p>
        </div>

        <div class="approval-list">
          <div
            v-for="item in visibleApprovals"
            :key="item.id"
            class="approval-item"
            :class="{ focused: item.id === approvalId }"
          >
            <div class="approval-top">
              <div class="approval-info">
                <div class="approval-agent">{{ item.agent_name || shortId(item.agent_id) }}</div>
                <div class="approval-action">{{ actionLabel(item.action_type) }}</div>
              </div>
              <span class="approval-status" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
            </div>

            <div class="approval-tags">
              <span class="tag" :class="riskClass(item.action_type)">{{ riskLabel(item.action_type) }}</span>
              <span class="tag">{{ toolLabel(item.details?.tool) }}</span>
              <span class="tag gray">{{ item.details?.requested_by ? '人工触发' : '系统' }}</span>
            </div>

            <div class="approval-desc">{{ approvalBrief(item) }}</div>

            <div class="approval-meta">
              <span>{{ absoluteTime(item.created_at) }}</span>
              <span>编号: {{ shortId(item.id) }}</span>
            </div>

            <details class="approval-detail">
              <summary>详情</summary>
              <pre>{{ approvalJson(item.details) }}</pre>
            </details>

            <div v-if="item.status === 'pending'" class="approval-btns">
              <button class="btn-ok" :disabled="actionBusy === item.id" @click="resolveApproval(item, 'approve')">批准</button>
              <button class="btn-no" :disabled="actionBusy === item.id" @click="resolveApproval(item, 'reject')">拒绝</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Group Info Modal -->
    <div v-if="groupInfoOpen" class="modal-overlay" @click.self="groupInfoOpen = false">
      <div class="group-info-panel">
        <div class="gi-header">
          <span class="gi-title">{{ groupInfo?.name || '群聊信息' }}</span>
          <button class="gi-close" @click="groupInfoOpen = false">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="gi-body">
          <!-- Members -->
          <div class="gi-section">
            <div class="gi-section-head">
              <span class="gi-section-title">成员 ({{ (groupInfo?.agents?.length || 0) + (groupInfo?.users?.length || 0) }})</span>
              <button class="gi-add-btn" @click="showMemberPicker = !showMemberPicker">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                添加
              </button>
            </div>

            <!-- Agent members -->
            <div v-if="groupInfo?.agents?.length" class="gi-member-group">
              <div class="gi-group-label">数字员工</div>
              <div v-for="agent in groupInfo.agents" :key="agent.id" class="gi-member-item">
                <div class="gi-member-avatar agent-avatar">{{ agent.name.charAt(0) }}</div>
                <span class="gi-member-name">{{ agent.name }}</span>
                <span class="gi-member-role">数字员工</span>
                <button class="gi-remove-btn" @click="removeMember('agent', agent.id)" title="移除">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- User members -->
            <div v-if="groupInfo?.users?.length" class="gi-member-group">
              <div class="gi-group-label">群成员</div>
              <div v-for="user in groupInfo.users" :key="user.id" class="gi-member-item">
                <div class="gi-member-avatar">{{ avatarText(user.display_name || user.username) }}</div>
                <span class="gi-member-name">{{ user.display_name || user.username }}</span>
                <button class="gi-remove-btn" @click="removeMember('user', user.id)" title="移除">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Member Picker -->
          <div v-if="showMemberPicker" class="gi-picker">
            <div class="gi-picker-tabs">
              <button :class="{ active: memberPickerTab === 'agents' }" @click="memberPickerTab = 'agents'">数字员工</button>
              <button :class="{ active: memberPickerTab === 'users' }" @click="memberPickerTab = 'users'">群成员</button>
            </div>

            <!-- Add agents -->
            <div v-if="memberPickerTab === 'agents'" class="gi-picker-list">
              <div v-if="!availableAgents.length" class="gi-picker-empty">暂无可添加的数字员工</div>
              <div
                v-for="agent in availableAgents"
                :key="agent.id"
                class="gi-picker-item"
                @click="addMember('agent', agent.id)"
              >
                <div class="gi-member-avatar agent-avatar">{{ agent.name.charAt(0) }}</div>
                <span class="gi-member-name">{{ agent.name }}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </div>
            </div>

            <!-- Add users -->
            <div v-if="memberPickerTab === 'users'" class="gi-picker-list">
              <div v-if="!availableUsers.length" class="gi-picker-empty">暂无可添加的群成员</div>
              <div
                v-for="user in availableUsers"
                :key="user.id"
                class="gi-picker-item"
                @click="addMember('user', user.id)"
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

    <!-- Create Agent Modal -->
    <div v-if="createAgentOpen" class="modal-overlay" @click.self="createAgentOpen = false">
      <div class="create-agent-panel">
        <!-- Header with step indicator -->
        <div class="ca-header">
          <button class="ca-back" @click="caGoBack" v-if="createAgentStep > 0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="ca-title">{{ caStepLabel }}</span>
          <button class="gi-close" @click="createAgentOpen = false">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Step dots -->
        <div class="ca-steps">
          <span v-for="i in 3" :key="i" class="ca-dot" :class="{ active: i === createAgentStep + 1, done: i < createAgentStep + 1 }"></span>
        </div>

        <div class="ca-body">

          <!-- Step 0: 基本信息 -->
          <div v-if="createAgentStep === 0">
            <!-- Loading -->
            <div v-if="createAgentLoading" class="ca-loading">
              <div class="loading-dots"><span></span><span></span><span></span></div>
            </div>

            <div v-else>
              <!-- Templates -->
              <div class="ca-section-title">选择模板（可选）</div>
              <div class="ca-templates">
                <div
                  v-for="tpl in createAgentTemplates"
                  :key="tpl.id"
                  class="ca-tpl-card"
                  :class="{ selected: createAgentForm.template_id === tpl.id }"
                  @click="selectTemplate(tpl)"
                >
                  <div class="ca-tpl-icon">{{ tpl.name.charAt(0) }}</div>
                  <div class="ca-tpl-info">
                    <div class="ca-tpl-name">{{ tpl.name }}</div>
                    <div class="ca-tpl-desc">{{ tpl.description }}</div>
                  </div>
                  <svg v-if="createAgentForm.template_id === tpl.id" width="16" height="16" viewBox="0 0 16 16" fill="none" class="ca-tpl-check">
                    <circle cx="8" cy="8" r="7" fill="var(--accent)"/>
                    <path d="M5 8l2.5 2.5L11 5.5" stroke="var(--surface)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>

              <!-- Name -->
              <div class="ca-field">
                <label class="ca-label">名称 <span class="ca-required">*</span></label>
                <input
                  v-model.trim="createAgentForm.name"
                  class="ca-input"
                  :class="{ error: createAgentError.name }"
                  placeholder="例如：智能助手、客服小明"
                  maxlength="100"
                />
                <div v-if="createAgentError.name" class="ca-field-error">{{ createAgentError.name }}</div>
              </div>

              <!-- Role description -->
              <div class="ca-field">
                <label class="ca-label">角色描述</label>
                <textarea
                  v-model.trim="createAgentForm.role_description"
                  class="ca-textarea"
                  placeholder="描述数字员工的职责和工作范围，例如：负责处理客户咨询、解答产品问题"
                  rows="3"
                  maxlength="500"
                ></textarea>
              </div>

              <div v-if="createAgentError.api" class="ca-api-error">{{ createAgentError.api }}</div>

              <button class="ca-submit" @click="caNextStep">下一步</button>
            </div>
          </div>

          <!-- Step 1: 模型选择 -->
          <div v-if="createAgentStep === 1">
            <div v-if="createAgentModels.length === 0 && !createAgentLoading" class="ca-empty-models">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="18" fill="var(--bg)"/>
                <path d="M16 24l6 6 10-10" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <p>暂无可用模型</p>
              <p class="hint">请在企业设置中添加模型</p>
            </div>

            <div v-if="createAgentLoading" class="ca-loading">
              <div class="loading-dots"><span></span><span></span><span></span></div>
            </div>

            <div v-else class="ca-models">
              <div
                v-for="model in createAgentModels"
                :key="model.id"
                class="ca-model-card"
                :class="{ selected: createAgentForm.primary_model_id === model.id }"
                @click="createAgentForm.primary_model_id = model.id; createAgentError.model = ''"
              >
                <div class="ca-model-info">
                  <div class="ca-model-name">{{ model.label || model.name }}</div>
                  <div class="ca-model-path">{{ model.provider }}/{{ model.model }}</div>
                </div>
                <svg v-if="createAgentForm.primary_model_id === model.id" width="16" height="16" viewBox="0 0 16 16" fill="none" class="ca-tpl-check">
                  <circle cx="8" cy="8" r="7" fill="var(--accent)"/>
                  <path d="M5 8l2.5 2.5L11 5.5" stroke="var(--surface)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>

            <div v-if="createAgentError.model" class="ca-field-error" style="margin-bottom:12px">{{ createAgentError.model }}</div>

            <button class="ca-submit" @click="caNextStep">下一步</button>
          </div>

          <!-- Step 2: 确认创建 -->
          <div v-if="createAgentStep === 2">
            <div class="ca-summary">
              <div class="ca-summary-item">
                <span class="ca-summary-k">名称</span>
                <span class="ca-summary-v">{{ createAgentForm.name }}</span>
              </div>
              <div class="ca-summary-item" v-if="createAgentForm.role_description">
                <span class="ca-summary-k">角色</span>
                <span class="ca-summary-v">{{ createAgentForm.role_description }}</span>
              </div>
              <div class="ca-summary-item">
                <span class="ca-summary-k">模型</span>
                <span class="ca-summary-v">{{ caSelectedModelName }}</span>
              </div>
              <div class="ca-summary-item" v-if="createAgentForm.template_id">
                <span class="ca-summary-k">模板</span>
                <span class="ca-summary-v">{{ caSelectedTemplateName }}</span>
              </div>
              <div class="ca-summary-item">
                <span class="ca-summary-k">可见范围</span>
                <span class="ca-summary-v">仅自己</span>
              </div>
            </div>

            <div v-if="createAgentError.api" class="ca-api-error">{{ createAgentError.api }}</div>

            <button class="ca-submit" :disabled="createAgentBusy" @click="submitCreateAgent">
              <span v-if="createAgentBusy">创建中...</span>
              <span v-else>确认创建</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Approvals Detail -->
    <div v-else-if="view === 'approvals'" class="page-approvals">

      <!-- Header -->
      <header class="wx-header">
        <button class="header-back" @click="view = 'list'">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 4l-8 7 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h1 class="header-title">审批中心</h1>
        <div class="header-right"></div>
      </header>

      <div class="approval-filters">
        <button :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">
          待处理 <span v-if="pendingCount" class="filter-count">{{ pendingCount }}</span>
        </button>
        <button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
      </div>

      <div class="refresh-bar">
        <button class="btn-refresh" @click="loadApprovals" :disabled="approvalsBusy">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" :class="{ spinning: approvalsBusy }">
            <path d="M12 7A5 5 0 112.3 3.2M12 3.2V1M12 3.2H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          刷新
        </button>
      </div>

      <p v-if="approvalError" class="approval-error">{{ approvalError }}</p>

      <div v-if="!visibleApprovals.length && !approvalsBusy" class="empty-approval">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="22" fill="var(--bg)"/>
          <path d="M18 28l7 7 13-13" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>没有待处理审批</p>
      </div>

      <div class="approval-list">
        <div
          v-for="item in visibleApprovals"
          :key="item.id"
          class="approval-item"
          :class="{ focused: item.id === approvalId }"
        >
          <div class="approval-top">
            <div class="approval-info">
              <div class="approval-agent">{{ item.agent_name || shortId(item.agent_id) }}</div>
              <div class="approval-action">{{ actionLabel(item.action_type) }}</div>
            </div>
            <span class="approval-status" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
          </div>

          <div class="approval-tags">
            <span class="tag" :class="riskClass(item.action_type)">{{ riskLabel(item.action_type) }}</span>
            <span class="tag">{{ toolLabel(item.details?.tool) }}</span>
            <span class="tag gray">{{ item.details?.requested_by ? '人工触发' : '系统' }}</span>
          </div>

          <div class="approval-desc">{{ approvalBrief(item) }}</div>

          <div class="approval-meta">
            <span>{{ absoluteTime(item.created_at) }}</span>
            <span>编号: {{ shortId(item.id) }}</span>
          </div>

          <details class="approval-detail">
            <summary>详情</summary>
            <pre>{{ approvalJson(item.details) }}</pre>
          </details>

          <div v-if="item.status === 'pending'" class="approval-btns">
            <button class="btn-ok" :disabled="actionBusy === item.id" @click="resolveApproval(item, 'approve')">批准</button>
            <button class="btn-no" :disabled="actionBusy === item.id" @click="resolveApproval(item, 'reject')">拒绝</button>
          </div>
        </div>
      </div>
    </div>

  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { registerServiceWorker, setBadgeCount, vibrateNotify } from './src/pwa'

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
const view = ref('list') // 'list' | 'chat' | 'approvals' | 'agent-chat'
const searchKeyword = ref('')
const tab = ref('chat')
const approvalId = ref(query.get('approvalId') || '')
const showUserMenu = ref(false)
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
const currentAgentChat = ref(null) // { id, name, teamId, teamName }
const agentMessages = ref([])
const agentComposer = ref('')
const agentLoading = ref(false)
const agentChatOnline = ref(false)
const agentListRef = ref(null)
const agentComposerRef = ref(null)
const agentWsRef = ref(null)
const userWsRef = ref(null)  // user-level WS for real-time approval push
const agentReconnectTimer = ref(null)
const agentLoadingTimeout = ref(null)
const agentAbortController = ref(null)
const agentSidebarOpen = ref(false)
const agentSessions = ref([])
const currentAgentSessionId = ref(null)
const isRecording = ref(false)
const isTranscribing = ref(false)
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

const availableAgents = computed(() => {
  const currentIds = new Set((groupInfo.value?.agents || []).map((a) => a.id))
  return allAgentsList.value.filter((a) => !currentIds.has(a.id))
})
const availableUsers = computed(() => {
  const currentIds = new Set((groupInfo.value?.users || []).map((u) => u.id))
  return allUsersList.value.filter((u) => !currentIds.has(u.id))
})

async function openGroupInfo() {
  if (!currentTeam.value) return
  groupInfoOpen.value = true
  showMemberPicker.value = false
  groupInfoLoading.value = true
  try {
    const data = await request(`/api/openchat/teams/${currentTeam.value.id}`)
    groupInfo.value = data
    // Load all agents and users for picker
    const [agentsData, usersData] = await Promise.all([
      request('/api/agents/').catch(() => []),
      request('/api/users/').catch(() => []),
    ])
    allAgentsList.value = agentsData || []
    allUsersList.value = usersData || []
  } catch (e) {
    console.error('Failed to load group info:', e)
  } finally {
    groupInfoLoading.value = false
  }
}

async function addMember(type, id) {
  if (addMemberBusy.value || !groupInfo.value) return
  addMemberBusy.value = true
  try {
    if (type === 'agent') {
      await request(`/api/openchat/teams/${groupInfo.value.id}/members/agents/${id}`, { method: 'POST' })
    } else {
      await request(`/api/openchat/teams/${groupInfo.value.id}/members/users/${id}`, { method: 'POST' })
    }
    // Refresh group info
    const data = await request(`/api/openchat/teams/${groupInfo.value.id}`)
    groupInfo.value = data
    // Refresh teams list so the sidebar updates
    await loadTeams()
  } catch (e) {
    alert('添加失败: ' + (e.message || e))
  } finally {
    addMemberBusy.value = false
  }
}

async function removeMember(type, id) {
  if (addMemberBusy.value || !groupInfo.value) return
  if (!confirm('确定移除该成员？')) return
  addMemberBusy.value = true
  try {
    if (type === 'agent') {
      await request(`/api/openchat/teams/${groupInfo.value.id}/members/agents/${id}`, { method: 'DELETE' })
    } else {
      await request(`/api/openchat/teams/${groupInfo.value.id}/members/users/${id}`, { method: 'DELETE' })
    }
    // Refresh group info
    const data = await request(`/api/openchat/teams/${groupInfo.value.id}`)
    groupInfo.value = data
    // Refresh teams list
    await loadTeams()
  } catch (e) {
    alert('移除失败: ' + (e.message || e))
  } finally {
    addMemberBusy.value = false
  }
}

// Create Agent
const createAgentOpen = ref(false)
const createAgentStep = ref(0)
const createAgentBusy = ref(false)
const createAgentLoading = ref(false)
const createAgentTemplates = ref([])
const createAgentModels = ref([])
const createAgentForm = ref({ name: '', role_description: '', template_id: '', primary_model_id: '' })
const createAgentError = ref({ name: '', model: '', api: '' })

const caStepLabel = computed(() => {
  const labels = ['新建数字员工', '基本信息', '选择模型', '确认创建']
  return labels[createAgentStep.value + 1] || labels[0]
})

const caSelectedModelName = computed(() => {
  const m = createAgentModels.value.find((m) => m.id === createAgentForm.value.primary_model_id)
  return m ? (m.label || m.name || m.model) : '未选择'
})

const caSelectedTemplateName = computed(() => {
  const t = createAgentTemplates.value.find((t) => t.id === createAgentForm.value.template_id)
  return t ? t.name : ''
})

async function openCreateAgent() {
  createAgentStep.value = 0
  createAgentForm.value = { name: '', role_description: '', template_id: '', primary_model_id: '' }
  createAgentError.value = { name: '', model: '', api: '' }
  createAgentOpen.value = true
  createAgentLoading.value = true
  try {
    const [tplData, modelData] = await Promise.all([
      request('/api/agents/templates').catch(() => []),
      request('/api/enterprise/llm-models').catch(() => []),
    ])
    createAgentTemplates.value = tplData || []
    createAgentModels.value = (modelData || []).filter((m) => m.enabled)
  } catch (e) {
    console.error('Failed to load agent creation data:', e)
  } finally {
    createAgentLoading.value = false
  }
}

function selectTemplate(tpl) {
  if (createAgentForm.value.template_id === tpl.id) {
    createAgentForm.value.template_id = ''
    createAgentForm.value.role_description = ''
  } else {
    createAgentForm.value.template_id = tpl.id
    if (tpl.role_description && !createAgentForm.value.role_description) {
      createAgentForm.value.role_description = tpl.role_description
    }
    if (tpl.default_skills?.length && !createAgentForm.value.name) {
      createAgentForm.value.name = tpl.name
    }
  }
}

function caNextStep() {
  createAgentError.value = { name: '', model: '', api: '' }
  if (createAgentStep.value === 0) {
    if (!createAgentForm.value.name || createAgentForm.value.name.trim().length < 2) {
      createAgentError.value.name = '名称至少2个字符'
      return
    }
    createAgentStep.value = 1
  } else if (createAgentStep.value === 1) {
    if (!createAgentForm.value.primary_model_id && createAgentModels.value.length > 0) {
      createAgentError.value.model = '请选择一个模型'
      return
    }
    createAgentStep.value = 2
  }
}

function caGoBack() {
  createAgentError.value = { name: '', model: '', api: '' }
  createAgentStep.value = Math.max(0, createAgentStep.value - 1)
}

async function submitCreateAgent() {
  createAgentError.value = { name: '', model: '', api: '' }
  createAgentBusy.value = true
  try {
    const payload = {
      name: createAgentForm.value.name.trim(),
      role_description: createAgentForm.value.role_description.trim() || undefined,
      template_id: createAgentForm.value.template_id || undefined,
      primary_model_id: createAgentForm.value.primary_model_id || undefined,
      permission_scope_type: 'user',
    }
    await request('/api/agents/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    createAgentOpen.value = false
    await loadTeams()
  } catch (e) {
    createAgentError.value.api = e.message || '创建失败'
  } finally {
    createAgentBusy.value = false
  }
}

// Message tracking per team
const lastMessages = ref({})
const lastMsgTime = ref({})

// Current time
const currentTime = ref('')
let timeInterval = null

const authed = computed(() => Boolean(token.value && currentUser.value))
const currentTeam = computed(() => teams.value.find((t) => t.id === teamId.value) || null)
const currentTeamAgents = computed(() => new Set((currentTeam.value?.agents || []).map((a) => a.id)))
const activeTeamId = computed(() => teamId.value)
const teamAgentCountMap = computed(() => {
  const map = {}
  for (const t of teams.value) {
    map[t.id] = t.agents?.length || 0
  }
  return map
})
const teamAgentCount = computed(() => currentTeam.value?.agents?.length || 0)
const pendingCount = computed(() => approvals.value.filter((a) => a.status === 'pending').length)

// Sync App Badge with pending approval count
watch(pendingCount, (count) => { setBadgeCount(count) }, { immediate: true })
const teamPendingCount = computed(() => {
  if (!currentTeam.value) return 0
  return approvals.value.filter((a) => a.status === 'pending' && currentTeamAgents.value.has(a.agent_id)).length
})
const canSend = computed(() => Boolean(currentTeam.value && composer.value.trim() && chatOnline.value))
const isConnected = computed(() => chatOnline.value)
const agentCanSend = computed(() => Boolean(currentAgentChat.value && agentComposer.value.trim() && agentChatOnline.value && !agentLoading.value))

// All agents flat list
const allAgents = computed(() => {
  const agents = []
  for (const t of teams.value) {
    for (const a of (t.agents || [])) {
      agents.push({ ...a, teamName: t.name, teamId: t.id })
    }
  }
  // Add standalone agents (not in any team)
  const teamAgentIds = new Set(agents.map((a) => a.id))
  for (const a of standaloneAgents.value) {
    if (!teamAgentIds.has(a.id)) {
      agents.push({ ...a, teamName: '', teamId: '' })
    }
  }
  return agents
})

const filteredAgents = computed(() => {
  if (!searchKeyword.value) {
    const list = [...allAgents.value]
    list.sort((a, b) => {
      const ta = agentLastChatTime.value[a.id] || 0
      const tb = agentLastChatTime.value[b.id] || 0
      return tb - ta
    })
    return list
  }
  const kw = searchKeyword.value.toLowerCase()
  return allAgents.value.filter((a) =>
    a.name.toLowerCase().includes(kw) || a.teamName.toLowerCase().includes(kw)
  )
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


// @ Mention: filtered agents
const mentionAgents = computed(() => {
  if (!currentTeam.value?.agents) return []
  if (!mentionFilter.value) return currentTeam.value.agents
  const filter = mentionFilter.value.toLowerCase()
  return currentTeam.value.agents.filter((a) => a.name.toLowerCase().includes(filter))
})

function getTeamPendingCount(teamId) {
  const team = teams.value.find((t) => t.id === teamId)
  if (!team) return 0
  const agentIds = new Set((team.agents || []).map((a) => a.id))
  return approvals.value.filter((a) => a.status === 'pending' && agentIds.has(a.agent_id)).length
}

function getTeamPreview(teamId) {
  return lastMessages.value[teamId] || '暂无消息'
}

function getTeamTime(teamId) {
  return lastMsgTime.value[teamId] || ''
}

function getAgentTeamName(agentId) {
  for (const t of teams.value) {
    if ((t.agents || []).some((a) => a.id === agentId)) {
      return t.name
    }
  }
  return ''
}

async function openAgent(agent) {
  // 开启与数字员工的私聊
  disconnectAgentWs()
  currentAgentChat.value = {
    id: agent.id,
    name: agent.name,
    teamId: agent.teamId,
    teamName: agent.teamName
  }
  agentMessages.value = []
  agentLoading.value = false
  currentAgentSessionId.value = null
  view.value = 'agent-chat'
  agentSidebarOpen.value = false

  // 先加载会话列表，获取最近会话
  await loadAgentSessions(agent.id)

  // 如果有历史会话，使用最近的一个
  if (agentSessions.value.length > 0) {
    const latest = agentSessions.value[0] // 后端已按 last_message_at 倒序
    switchAgentSession(latest.session_id)
  } else {
    // 无历史会话，创建新会话并连接
    connectAgentWs(agent.id, null)
  }
}

function closeAgentChat() {
  disconnectAgentWs()
  stopRecording()
  view.value = 'list'
  currentAgentChat.value = null
  agentMessages.value = []
}

async function startRecording() {
  if (isRecording.value || isTranscribing.value) return

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'

    audioChunks.value = []
    mediaRecorder.value = new MediaRecorder(stream, { mimeType })

    mediaRecorder.value.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        audioChunks.value.push(e.data)
      }
    }

    mediaRecorder.value.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      await transcribeAudio()
    }

    recordingStartTime.value = Date.now()
    recordingDuration.value = 0
    recordingTimer.value = setInterval(() => {
      recordingDuration.value = Math.floor((Date.now() - recordingStartTime.value) / 1000)
    }, 1000)

    mediaRecorder.value.start()
    isRecording.value = true
  } catch (e) {
    console.error('无法访问麦克风:', e)
    alert('请允许麦克风权限后重试')
  }
}

async function transcribeAudio() {
  if (audioChunks.value.length === 0) return

  isRecording.value = false
  isTranscribing.value = true

  clearInterval(recordingTimer.value)
  recordingTimer.value = null

  const blob = new Blob(audioChunks.value, { type: audioChunks.value[0]?.type || 'audio/webm' })
  audioChunks.value = []

  const formData = new FormData()
  formData.append('file', blob, `voice_${Date.now()}.webm`)

  try {
    const res = await fetch(`${config.value.apiBaseUrl}/api/stt/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
      body: formData,
    })

    if (res.ok) {
      const data = await res.json()
      if (data.text) {
        agentComposer.value += data.text.trim()
        nextTick(() => {
          if (agentComposerRef.value) {
            agentComposerRef.value.style.height = 'auto'
            agentComposerRef.value.style.height = Math.min(agentComposerRef.value.scrollHeight, 120) + 'px'
            agentComposerRef.value.focus()
          }
        })
      }
    } else {
      const err = await res.json().catch(() => ({ detail: '转写失败' }))
      console.error('转写失败:', err.detail)
    }
  } catch (e) {
    console.error('转写请求失败:', e)
  } finally {
    isTranscribing.value = false
    recordingDuration.value = 0
  }
}

function stopRecording() {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
  }
  isRecording.value = false
  clearInterval(recordingTimer.value)
  recordingTimer.value = null
  recordingDuration.value = 0
}

function scrollAgentToBottom() {
  nextTick(() => {
    if (agentListRef.value) {
      agentListRef.value.scrollTop = agentListRef.value.scrollHeight
    }
  })
}

function connectAgentWs(agentId, sessionId) {
  if (!token.value) return
  agentChatOnline.value = false

  // 从 wsBaseUrl 提取 base
  const base = config.value.wsBaseUrl.replace(/\/+$/, '')
  let wsUrl = `${base}/ws/chat/${agentId}?token=${encodeURIComponent(token.value)}`
  if (sessionId) {
    wsUrl += `&session_id=${encodeURIComponent(sessionId)}`
  }

  const socket = new WebSocket(wsUrl)
  agentWsRef.value = socket

  socket.onopen = () => { agentChatOnline.value = true }
  socket.onerror = () => { agentChatOnline.value = false }
  socket.onclose = () => {
    if (agentWsRef.value !== socket) return
    agentChatOnline.value = false
    // If loading is stuck (socket closed before done arrived), keep partial message but clear loading
    if (agentLoading.value) {
      agentLoading.value = false
      // Schedule reconnect but don't auto-send
      agentReconnectTimer.value = setTimeout(() => {
        if (currentAgentChat.value?.id === agentId && view.value === 'agent-chat') {
          connectAgentWs(agentId, currentAgentSessionId.value)
        }
      }, 3000)
    }
  }
  socket.onmessage = (e) => {
    const data = JSON.parse(e.data)
    handleAgentMessage(data)
  }

  // 滚动到底部
  scrollAgentToBottom()
}

function disconnectAgentWs() {
  if (agentReconnectTimer.value) { clearTimeout(agentReconnectTimer.value); agentReconnectTimer.value = null }
  if (agentLoadingTimeout.value) { clearTimeout(agentLoadingTimeout.value); agentLoadingTimeout.value = null }
  if (agentAbortController.value) { agentAbortController.value.abort(); agentAbortController.value = null }
  if (agentWsRef.value) {
    const s = agentWsRef.value
    agentWsRef.value = null
    s.close()
  }
  agentChatOnline.value = false
}

function connectUserWs() {
  if (!token.value) return
  const wsUrl = `${config.value.wsBaseUrl}/ws/user?token=${encodeURIComponent(token.value)}`
  const socket = new WebSocket(wsUrl)
  userWsRef.value = socket

  socket.onopen = () => { console.log('[WS/user] Connected, token prefix:', token.value?.slice(0, 8)) }
  socket.onerror = () => { console.warn('[WS/user] Error') }
  socket.onclose = () => {
    if (userWsRef.value !== socket) return
    userWsRef.value = null
    // Auto-reconnect after 5s
    if (token.value) {
      setTimeout(() => { if (token.value) connectUserWs() }, 5000)
    }
  }
  socket.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      handleUserWsMessage(msg)
    } catch (err) {
      console.error('[WS/user] Failed to parse message', err)
    }
  }
}

function disconnectUserWs() {
  if (userWsRef.value) {
    userWsRef.value.close()
    userWsRef.value = null
  }
}

function handleUserWsMessage(msg) {
  console.log('[WS/user] Message received:', msg.type, msg)
  if (msg.type === 'approval_pending') {
    // Add to approvals list if not already present (dedupe by id)
    const exists = approvals.value.some(a => a.id === msg.approval_id)
    console.log('[WS/user] approval_pending: exists=', exists, 'scopeFilter=', scopeFilter.value, 'currentTeamAgents=', currentTeamAgents.value, 'msg.agent_id=', msg.agent_id)
    if (!exists) {
      approvals.value = [{
        id: msg.approval_id,
        agent_id: msg.agent_id,
        agent_name: msg.agent_name,
        action_type: msg.action_type,
        status: 'pending',
        details: msg.details,
        created_at: msg.created_at,
        _wsPush: true,  // marked so loadApprovals won't overwrite it
      }, ...approvals.value]
      console.log('[WS/user] Added to approvals, total:', approvals.value.length, 'visible:', visibleApprovals.value.length, 'scopeFilter:', scopeFilter.value)
    }
    // Show a toast-like notification
    const toName = msg.approver_name ? `发给 ${msg.approver_name}` : '待审批'
    showToast(`[${msg.agent_name}] ${msg.action_type} — ${toName}`, 'warning')
    // Haptic feedback for new approval notification
    vibrateNotify()
  } else if (msg.type === 'approval_resolved') {
    approvals.value = approvals.value.map(a =>
      a.id === msg.approval_id ? { ...a, status: msg.status, resolved_at: msg.resolved_at } : a
    )
    const label = msg.status === 'approved' ? '已批准' : '已拒绝'
    showToast(`[${msg.agent_name}] ${msg.action_type} — ${label}`, msg.status === 'approved' ? 'success' : 'error')
  } else if (msg.type === 'ping') {
    // Respond with pong
    userWsRef.value?.send?.('pong')
  }
}

// Simple toast — appended to body, auto-removed after 4s
function showToast(message, type = 'info') {
  const colors = { info: '#3b82f6', success: '#22c55e', warning: '#f59e0b', error: '#ef4444' }
  const color = colors[type] || colors.info
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:${color};color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;z-index:99999;opacity:1;transition:opacity 0.3s;max-width:280px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)`
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300) }, 4000)
}

function handleAgentMessage(data) {
  if (data.type === 'start' || data.type === 'streaming') {
    // 正在流式输出，更新最后一条消息
    if (agentMessages.value.length === 0 || agentMessages.value[agentMessages.value.length - 1].role !== 'assistant') {
      agentMessages.value.push({
        id: `agent_${Date.now()}`,
        role: 'assistant',
        content: ''
      })
    }
    const last = agentMessages.value[agentMessages.value.length - 1]
    last.content = (last.content || '') + (data.content || '')
    agentLastChatTime.value[currentAgentChat.value?.id] = Date.now()
    agentLoading.value = true
  } else if (data.type === 'done' || data.type === 'message') {
    // 完成或完整消息
    if (agentLoadingTimeout.value) { clearTimeout(agentLoadingTimeout.value); agentLoadingTimeout.value = null }
    agentLoading.value = false
    agentLastChatTime.value[currentAgentChat.value?.id] = Date.now()
    if (data.content) {
      if (agentMessages.value.length === 0 || agentMessages.value[agentMessages.value.length - 1].role !== 'assistant') {
        agentMessages.value.push({
          id: `agent_${Date.now()}`,
          role: 'assistant',
          content: data.content
        })
      } else {
        const last = agentMessages.value[agentMessages.value.length - 1]
        last.content = data.content
      }
    }
  } else if (data.type === 'error') {
    if (agentLoadingTimeout.value) { clearTimeout(agentLoadingTimeout.value); agentLoadingTimeout.value = null }
    agentLoading.value = false
    agentMessages.value.push({
      id: `agent_error_${Date.now()}`,
      role: 'assistant',
      content: `错误: ${data.content || '未知错误'}`
    })
  }

  nextTick(() => {
    if (agentListRef.value) agentListRef.value.scrollTop = agentListRef.value.scrollHeight
  })
}

async function loadAgentSessions(agentId) {
  try {
    const sessions = await request(`/api/agents/${agentId}/sessions`)
    agentSessions.value = (sessions || []).map((s) => ({
      session_id: s.id,
      name: s.title || '新会话',
      created_at: s.created_at,
      updated_at: s.last_message_at || s.created_at,
      message_count: s.message_count || 0
    }))
    // Seed last chat time from session
    const latest = sessions?.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))[0]
    if (latest?.last_message_at) {
      agentLastChatTime.value[agentId] = new Date(latest.last_message_at).getTime()
    }
  } catch (e) {
    console.error('加载会话列表失败:', e)
    agentSessions.value = []
  }
}

function switchAgentSession(sessionId) {
  if (sessionId === currentAgentSessionId.value) {
    agentSidebarOpen.value = false
    return
  }
  disconnectAgentWs()
  currentAgentSessionId.value = sessionId
  agentMessages.value = []
  agentLoading.value = false
  agentSidebarOpen.value = false
  // 加载历史消息
  loadAgentMessages(currentAgentChat.value.id, sessionId)
  connectAgentWs(currentAgentChat.value.id, sessionId)
}

async function startNewAgentSession() {
  try {
    // 通过 API 创建新会话
    const result = await request(`/api/agents/${currentAgentChat.value.id}/sessions`, {
      method: 'POST',
      body: JSON.stringify({ title: `会话 ${new Date().toLocaleString('zh-CN')}` })
    })
    disconnectAgentWs()
    currentAgentSessionId.value = result.id
    agentMessages.value = []
    agentLoading.value = false
    agentSidebarOpen.value = false
    // 添加到会话列表顶部
    agentSessions.value.unshift({
      session_id: result.id,
      name: result.title || '新会话',
      created_at: result.created_at,
      updated_at: result.created_at,
      message_count: 0
    })
    connectAgentWs(currentAgentChat.value.id, result.id)
  } catch (e) {
    console.error('创建会话失败:', e)
    // 如果 API 失败，回退到让后端创建
    disconnectAgentWs()
    currentAgentSessionId.value = null
    agentMessages.value = []
    agentLoading.value = false
    agentSidebarOpen.value = false
    connectAgentWs(currentAgentChat.value.id, null)
  }
}

async function deleteAgentSession(sessionId) {
  try {
    await request(`/api/agents/${currentAgentChat.value.id}/sessions/${sessionId}`, { method: 'DELETE' })
    agentSessions.value = agentSessions.value.filter((s) => s.session_id !== sessionId)
    if (currentAgentSessionId.value === sessionId) {
      startNewAgentSession()
    }
  } catch (e) {
    console.error('删除会话失败:', e)
  }
}

function formatSessionTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

async function loadAgentMessages(agentId, sessionId) {
  try {
    const messages = await request(`/api/agents/${agentId}/sessions/${sessionId}/messages`)
    if (messages && messages.length > 0) {
      agentMessages.value = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          id: m.id || `msg_${Date.now()}_${Math.random()}`,
          role: m.role,
          content: m.content || ''
        }))
    }
    // 加载完历史消息后滚动到底部
    scrollAgentToBottom()
  } catch (e) {
    console.error('加载历史消息失败:', e)
  }
}

function autoResizeAgentComposer(e) {
  const el = agentComposerRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function sendAgentMessage() {
  const text = agentComposer.value.trim()
  if (!text || !agentWsRef.value || agentWsRef.value.readyState !== WebSocket.OPEN || agentLoading.value) return

  // 清除之前的超时
  if (agentLoadingTimeout.value) { clearTimeout(agentLoadingTimeout.value); agentLoadingTimeout.value = null }
  // 180秒超时保护（AI 回复较慢）
  agentLoadingTimeout.value = setTimeout(() => {
    if (agentLoading.value) {
      agentLoading.value = false
      agentMessages.value.push({
        id: `agent_timeout_${Date.now()}`,
        role: 'assistant',
        content: '⚠️ 回复超时了，AI 还在思考，请稍后再试'
      })
      agentLoadingTimeout.value = null
    }
  }, 180000)

  // 添加用户消息
  agentMessages.value.push({
    id: `user_${Date.now()}`,
    role: 'user',
    content: text
  })
  agentLastChatTime.value[currentAgentChat.value.id] = Date.now()

  // 发送消息
  agentWsRef.value.send(JSON.stringify({ content: text }))
  agentComposer.value = ''
  agentLoading.value = true

  // 添加空的消息占位
  agentMessages.value.push({
    id: `agent_${Date.now() + 1}`,
    role: 'assistant',
    content: ''
  })

  nextTick(() => {
    if (agentListRef.value) agentListRef.value.scrollTop = agentListRef.value.scrollHeight
  })
}

// === Markdown Renderer ===
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInline(text) {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="md-link">$1</a>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
}

function renderMarkdown(md) {
  if (!md) return ''
  const lines = md.split('\n')
  let html = ''
  let inCodeBlock = false
  let codeLines = []
  let inList = null
  let inBlockquote = false
  let inTable = false

  const flushList = () => {
    if (inList) { html += inList === 'ul' ? '</ul>' : '</ol>'; inList = null }
  }
  const flushBlockquote = () => {
    if (inBlockquote) { html += '</blockquote>'; inBlockquote = false }
  }
  const flushTable = () => {
    if (inTable) { html += '</tbody></table>'; inTable = false }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushList(); flushBlockquote(); flushTable()
        inCodeBlock = true
        codeLines = []
      } else {
        html += `<pre class="code-block"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
        inCodeBlock = false
        codeLines = []
      }
      continue
    }
    if (inCodeBlock) { codeLines.push(line); continue }

    // Blank line
    if (line.trim() === '') {
      flushList(); flushBlockquote(); flushTable()
      continue
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.*)/)
    if (hMatch) {
      flushList(); flushBlockquote(); flushTable()
      const level = hMatch[1].length
      const sizes = ['1.5em', '1.3em', '1.15em', '1.05em', '1em', '0.9em']
      html += `<h${level} class="md-h${level}">${renderInline(hMatch[2])}</h${level}>`
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushList(); flushBlockquote(); flushTable()
      html += '<hr class="md-hr">'
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList(); flushTable()
      if (!inBlockquote) {
        html += '<blockquote class="md-blockquote">'
        inBlockquote = true
      }
      html += `<div>${renderInline(line.slice(2))}</div>`
      continue
    } else if (inBlockquote) {
      flushBlockquote()
    }

    // Tables
    if (line.includes('|')) {
      flushList(); flushBlockquote()
      const cols = line.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)
      if (cols.every(c => /^[-:]+$/.test(c))) continue
      if (!inTable) {
        html += '<table class="md-table"><thead><tr>' + cols.map(c => `<th>${renderInline(c)}</th>`).join('') + '</tr></thead><tbody>'
        inTable = true
      } else {
        html += '<tr>' + cols.map(c => `<td>${renderInline(c)}</td>`).join('') + '</tr>'
      }
      continue
    } else if (inTable) {
      flushTable()
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[*\-+]\s+(.*)/)
    if (ulMatch) {
      flushBlockquote(); flushTable()
      if (inList !== 'ul') { if (inList) flushList(); html += '<ul class="md-ul">'; inList = 'ul' }
      html += `<li>${renderInline(ulMatch[2])}</li>`
      continue
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/)
    if (olMatch) {
      flushBlockquote(); flushTable()
      if (inList !== 'ol') { if (inList) flushList(); html += '<ol class="md-ol">'; inList = 'ol' }
      html += `<li>${renderInline(olMatch[2])}</li>`
      continue
    }

    // Regular paragraph
    flushList(); flushBlockquote(); flushTable()
    html += `<p class="md-p">${renderInline(line)}</p>`
  }

  flushList(); flushBlockquote(); flushTable()
  if (inCodeBlock) {
    html += `<pre class="code-block"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
  }

  return html
}

watch(config, (v) => localStorage.setItem('openchat-mobile-config', JSON.stringify(v)), { deep: true })
watch(approvalId, syncUrl)

onMounted(async () => {
  updateTime()
  timeInterval = setInterval(updateTime, 60000)

  // Register Service Worker for PWA (offline, push, badge)
  registerServiceWorker()

  if (query.get('token')) localStorage.setItem('openchat-mobile-token', query.get('token'))
  if (token.value) {
    try { await bootstrap() }
    catch (e) { authError.value = e.message || '恢复登录失败' }
  }
  ready.value = true
})

onBeforeUnmount(() => {
  disconnectWs()
  disconnectAgentWs()
  disconnectUserWs()
  stopPolling()
  if (timeInterval) clearInterval(timeInterval)
})

function updateTime() {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  currentTime.value = `${h}:${m}`
}

// === @ Mention handlers ===
function handleComposerInput(e) {
  const el = composerRef.value
  if (!el) return
  const cursorPos = el.selectionStart
  const textBeforeCursor = composer.value.slice(0, cursorPos)
  const atMatch = textBeforeCursor.match(/@([^\s@]*)$/)

  if (atMatch) {
    mentionPickerOpen.value = true
    mentionFilter.value = atMatch[1]
    mentionStartPos.value = cursorPos - atMatch[0].length
    mentionSelectedIdx.value = 0
  } else {
    mentionPickerOpen.value = false
    mentionFilter.value = ''
  }

  // Auto resize
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

// Long-press / right-click on a message to @mention the sender
let msgTouchTimer = null
let msgTouchMoved = false

function onMsgTouchStart(msg, e) {
  if (msg.senderId === currentUser.value?.id) return  // skip self
  msgTouchMoved = false
  const target = e.currentTarget
  msgTouchTimer = setTimeout(() => {
    if (!msgTouchMoved) insertMentionFromMsg(msg)
  }, 500)
}

function onMsgTouchEnd(msg) {
  cancelMsgTouch()
}

function cancelMsgTouch() {
  if (msgTouchTimer) {
    clearTimeout(msgTouchTimer)
    msgTouchTimer = null
  }
}

function insertMentionFromMsg(msg) {
  if (!composerRef.value || !msg.senderName) return
  if (msg.senderId === currentUser.value?.id) return  // can't @ yourself
  composer.value += `@${msg.senderName} `
  composerRef.value.focus()
}

function handleComposerKeydown(e) {
  if (!mentionPickerOpen.value || mentionAgents.value.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    mentionSelectedIdx.value = (mentionSelectedIdx.value + 1) % mentionAgents.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    mentionSelectedIdx.value = (mentionSelectedIdx.value - 1 + mentionAgents.value.length) % mentionAgents.value.length
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    insertMention(mentionAgents.value[mentionSelectedIdx.value])
  } else if (e.key === 'Escape') {
    mentionPickerOpen.value = false
  }
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
    el.focus()
    el.setSelectionRange(newPos, newPos)
  })
}

async function login() {
  loginBusy.value = true
  authError.value = ''
  try {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: form.value.username, password: form.value.password }),
    }, false)
    token.value = res.access_token
    currentUser.value = res.user
    localStorage.setItem('openchat-mobile-token', token.value)
    form.value.password = ''
    await afterAuth()
  } catch (e) {
    authError.value = e.message || '登录失败'
  } finally {
    loginBusy.value = false
  }
}

function logout() {
  token.value = ''
  currentUser.value = null
  teams.value = []
  approvals.value = []
  messages.value = []
  lastMessages.value = {}
  lastMsgTime.value = {}
  localStorage.removeItem('openchat-mobile-token')
  disconnectWs()
  disconnectUserWs()
  stopPolling()
  view.value = 'list'
  showUserMenu.value = false
}

async function bootstrap() {
  currentUser.value = await request('/api/auth/me')
  await afterAuth()
}

async function afterAuth() {
  await Promise.all([loadTeams(), loadApprovals()])
  startPolling()
  connectUserWs()
}

async function loadTeams() {
  const [teamsData, agentsData] = await Promise.all([
    request('/api/openchat/teams/'),
    request('/api/agents/').catch(() => []),
  ])
  teams.value = teamsData || []
  standaloneAgents.value = agentsData || []
}

async function loadApprovals() {
  approvalsBusy.value = true
  approvalError.value = ''
  try {
    const data = await request('/api/enterprise/approvals')
    const incoming = Array.isArray(data) ? data : []
    // Merge: keep WebSocket-pushed approvals (marked with wsPush=true), add new ones from API
    const wsIds = new Set(
      approvals.value.filter((a) => a._wsPush).map((a) => a.id)
    )
    const merged = [
      ...incoming.map((a) => ({ ...a, _wsPush: wsIds.has(a.id) })),
      ...approvals.value.filter((a) => a._wsPush && !incoming.some((b) => b.id === a.id)),
    ]
    approvals.value = merged
  } catch (e) {
    approvalError.value = e.message || '加载审批失败'
  } finally {
    approvalsBusy.value = false
  }
}

function openTeam(team) {
  teamId.value = team.id
  tab.value = 'chat'
  view.value = 'chat'
  mentionPickerOpen.value = false
  connectTeam(team.id)
}

function openApprovals() {
  scopeFilter.value = 'all'
  statusFilter.value = 'pending'
  view.value = 'approvals'
  showUserMenu.value = false
}

function connectTeam(targetTeamId) {
  messages.value = []
  loadingAgents.value = []
  chatOnline.value = false
  seen.clear()
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

    // Skip the "No agent connected" system message
    if (msg.senderType === 'system' && msg.text && msg.text.includes('No agent connected')) return

    // Update last message for team list (skip for system messages)
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

    // Only add to current chat if this is the active team
    if (teamId.value === targetTeamId) {
      messages.value.push(msg)
      nextTick(() => {
        if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
      })
    }
  }
}

const wsRef = ref(null)
const reconnectTimer = ref(null)
const seen = new Set()

function disconnectWs() {
  if (reconnectTimer.value) { clearTimeout(reconnectTimer.value); reconnectTimer.value = null }
  if (wsRef.value) {
    const s = wsRef.value
    wsRef.value = null
    s.close()
  }
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
  if (mentionPickerOpen.value && mentionAgents.value.length > 0) {
    insertMention(mentionAgents.value[mentionSelectedIdx.value])
    return
  }
  const text = composer.value.trim()
  if (!text || !wsRef.value || wsRef.value.readyState !== WebSocket.OPEN) return
  const names = []
  const re = /@([^\s@,]+)/g
  let m
  while ((m = re.exec(text)) !== null) names.push(m[1])
  if (names.length && currentTeam.value) {
    loadingAgents.value = currentTeam.value.agents.filter((a) => names.includes(a.name)).map((a) => a.name)
  }
  wsRef.value.send(JSON.stringify({ content: text }))
  composer.value = ''
  if (composerRef.value) {
    composerRef.value.style.height = 'auto'
  }
}

async function resolveApproval(item, action) {
  actionBusy.value = item.id
  approvalError.value = ''
  try {
    const updated = await request(`/api/enterprise/approvals/${item.id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
    if (updated && updated.id) {
      approvals.value = approvals.value.map((e) => e.id === updated.id ? updated : e)
    }
    approvalId.value = item.id
  } catch (e) {
    approvalError.value = e.message || '处理失败'
  } finally {
    actionBusy.value = ''
  }
}

let pollTimer = null
function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => { if (authed.value) void loadApprovals() }, 20000)
}
function stopPolling() {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

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

function normalizeBase(v) { return (v || window.location.origin).replace(/\/+$/, '') }
function toWsBase(v) { return normalizeBase(v).replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') }
function readJson(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') } catch { return {} } }
function avatarText(v) { return String(v || '系').charAt(0) }
function shortId(v) { return v ? String(v).slice(0, 8) : '-' }
function absoluteTime(v) { return v ? new Date(v).toLocaleString('zh-CN') : '-' }
function approvalJson(v) { try { return JSON.stringify(v || {}, null, 2) } catch { return String(v || '') } }

function statusLabel(s) {
  return { pending: '待处理', approved: '已批准', rejected: '已拒绝' }[s] || s || '未知'
}
function statusClass(s) {
  return { approved: 's-ok', rejected: 's-no' }[s] || 's-pending'
}
function actionLabel(a) {
  return {
    write_workspace_files: '写入工作区文件', delete_files: '删除文件',
    send_feishu_message: '发送飞书消息', web_search: '联网搜索', execute_code: '执行代码',
  }[a] || a || '审批操作'
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
  return {
    write_file: '写文件', delete_file: '删文件', send_feishu_message: '发飞书',
    send_message_to_agent: '发消息', send_file_to_agent: '发文件', web_search: '联网搜索', execute_code: '执行代码',
  }[t] || t || '未知'
}
function roleLabel(role) {
  return {
    platform_admin: '平台管理员', enterprise_admin: '企业管理员',
    agent_admin: 'Agent 管理员', user: '普通成员',
  }[role] || role || '普通成员'
}
</script>

<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); }
body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: var(--text-primary);
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
}
button, input, textarea, select { font-family: inherit; font-size: inherit; }
button { border: none; background: none; cursor: pointer; padding: 0; }
pre, code { font-family: "Cascadia Code", Consolas, monospace; }
</style>

<style scoped>
/* ─── Color System (Minimalist) ─── */
.app-shell {
  --bg: #F5F5F5;
  --surface: #FFFFFF;
  --accent: #2563EB;
  --accent-light: #EFF6FF;
  --accent-mid: #DBEAFE;
  --text-primary: #1E293B;
  --text-secondary: #64748B;
  --text-muted: #94A3B8;
  --border: #E2E8F0;
  --warn-bg: #FFFBEB;
  --warn-text: #B45309;
  --warn-border: #FDE68A;
  --error: #DC2626;
  --green: #059669;

  min-height: 100vh;
  max-width: 100%;
  background: var(--bg);
}

/* Loading */
.loading {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--surface);
}
.loading span { font-size: 14px; color: var(--text-secondary); }
.loading-icon { animation: loadingPulse 1.4s ease-in-out infinite; }
@keyframes loadingPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Auth */
.auth-page { min-height: 100vh; background: var(--surface); display: flex; flex-direction: column; }
.auth-header { padding: 60px 32px 32px; text-align: center; }
.auth-logo { margin-bottom: 20px; }
.auth-header h1 { margin: 0; font-size: 24px; font-weight: 600; color: var(--text-primary); }
.auth-header p { margin: 8px 0 0; font-size: 14px; color: var(--text-secondary); }
.auth-body { padding: 0 24px; flex: 1; }
.auth-tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
.auth-tabs button { flex: 1; padding: 12px; font-size: 15px; color: var(--text-secondary); border-bottom: 2px solid transparent; transition: all 0.2s; }
.auth-tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }
.auth-form, .config-form { display: flex; flex-direction: column; gap: 16px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item label { font-size: 13px; color: var(--text-secondary); }
.form-item input {
  padding: 12px 14px; border: 1px solid var(--border); border-radius: 6px;
  font-size: 15px; outline: none; background: var(--bg); transition: border-color 0.2s;
}
.form-item input:focus { border-color: var(--accent); background: var(--surface); }
.auth-error {
  margin: 0; padding: 10px 12px; background: var(--surface)5f5;
  border: 1px solid var(--error); border-radius: 4px; color: var(--error); font-size: 13px;
}
.btn-login {
  width: 100%; padding: 13px; background: var(--accent); color: var(--surface);
  border-radius: 6px; font-size: 16px; font-weight: 600; margin-top: 8px; transition: opacity 0.2s;
}
.btn-login:not(:disabled):active { opacity: 0.8; }
.btn-login:disabled { opacity: 0.5; cursor: not-allowed; }

/* Workspace */
.page-list, .page-chat, .page-approvals {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* Agent Chat Main */
.agent-chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* Agent Sidebar */
.agent-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  background: var(--surface);
  z-index: 200;
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
}
.page-chat.sidebar-open .agent-sidebar {
  transform: translateX(0);
}
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 199;
}
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.sidebar-back {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
}
.sidebar-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.btn-new-chat {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent); color: var(--surface);
  border-radius: 8px;
}
.btn-new-chat:active { opacity: 0.8; }
.session-list {
  flex: 1;
  overflow-y: auto;
}
.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--accent-light);
  cursor: pointer;
  transition: background 0.15s;
}
.session-item:hover { background: var(--bg); }
.session-item.active {
  background: var(--accent-light);
  border-left: 3px solid var(--accent);
}
.session-info { flex: 1; min-width: 0; }
.session-name {
  font-size: 15px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-item.active .session-name { font-weight: 600; }
.session-time { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.session-delete {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); border-radius: 6px;
  flex-shrink: 0;
}
.session-delete:hover { background: #FFF0F0; color: var(--error); }
.session-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}
.header-menu, .header-new, .header-session-list {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
}

/* Header */
.wx-header {
  height: 50px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}
.header-left, .header-right { width: 80px; }
.header-right { display: flex; justify-content: flex-end; align-items: center; gap: 2px; }
.header-title {
  flex: 1; text-align: center; font-size: 17px; font-weight: 600;
  color: var(--text-primary); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.header-online-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--text-muted); flex-shrink: 0;
}
.header-online-dot.on { background: var(--green); }
.header-back {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
}
.online-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); display: inline-block;
}
.online-dot.on { background: var(--green); box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.15); }

/* User Menu */
.user-info { cursor: pointer; }
.user-avatar-sm {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--surface);
  color: var(--text-primary); font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.user-menu-overlay {
  position: fixed; inset: 0; z-index: 99;
}
.user-menu {
  position: absolute; top: 50px; right: 8px;
  width: 240px; background: var(--surface); border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  z-index: 100; overflow: hidden;
  animation: slideDown 0.15s ease-out;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.user-menu-info {
  display: flex; align-items: center; gap: 12px;
  padding: 16px;
}
.user-avatar-lg {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--surface);
  color: var(--text-primary); font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.user-menu-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.user-menu-role { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.user-menu-divider { height: 1px; background: var(--accent-light); }
.user-menu-btn {
  width: 100%; padding: 14px 16px;
  text-align: left; font-size: 15px; color: var(--text-primary);
  transition: background 0.15s;
}
.user-menu-btn:hover { background: var(--bg); }
.user-menu-btn.logout { color: var(--error); }

/* Search */
.search-bar { padding: 8px 12px; background: var(--bg); flex-shrink: 0; }
.search-input {
  width: 100%; padding: 8px 12px; border: none; border-radius: 6px;
  background: var(--surface); font-size: 14px; outline: none;
}

/* Home Tab Bar */
.home-tab-bar {
  display: flex; background: var(--surface); border-top: 1px solid var(--border); flex-shrink: 0;
}
.home-tab-bar button {
  flex: 1; padding: 11px; font-size: 15px; color: var(--text-secondary);
  border-top: 2px solid transparent; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.home-tab-bar button.active { color: var(--accent); border-top-color: var(--accent); }
.home-tab-badge {
  background: var(--error); color: var(--surface);
  font-size: 11px; font-weight: 700; padding: 1px 5px; border-radius: 3px;
}

/* Home Tab Content */
.home-tab-content {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column;
}

/* Section Header */
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px 6px;
}
.section-label {
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.section-count { font-size: 12px; color: var(--text-muted); }
.section-label-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 0 6px;
}
.btn-add-section {
  width: 24px; height: 24px; border-radius: 50%; background: var(--accent);
  border: none; cursor: pointer; color: var(--surface);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity 0.15s;
}
.btn-add-section:active { opacity: 0.7; }

/* Agents Section */
.agents-section {
  background: var(--surface); border-bottom: 1px solid var(--accent-light);
  padding: 8px 16px 12px;
}
.agents-scroll {
  display: flex; gap: 12px;
  padding: 6px 0 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.agents-scroll::-webkit-scrollbar { display: none; }
.agents-empty {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 0; color: var(--text-muted); font-size: 14px; cursor: pointer;
}
.agents-empty:active { color: var(--accent); }
.agent-card {
  display: flex; flex-direction: column; align-items: center;
  gap: 5px; min-width: 64px; cursor: pointer;
  flex-shrink: 0;
}
.agent-card:active { opacity: 0.7; }
.agent-avatar {
  width: 48px; height: 48px; border-radius: 12px;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: var(--surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.agent-name {
  font-size: 12px; font-weight: 500; color: var(--text-primary);
  max-width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  text-align: center;
}

/* Unread Badge */
.unread-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: var(--error); color: var(--surface);
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

/* Conversations */
.conversations { flex: 1; overflow-y: auto; }
.conv-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--accent-light);
  cursor: pointer; transition: background 0.15s;
}
.conv-item:active { background: var(--accent-light); }
.conv-item.active { background: var(--accent-light); }
.conv-avatar {
  width: 46px; height: 46px; border-radius: 10px;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: var(--surface); position: relative; flex-shrink: 0;
}
.conv-body { flex: 1; min-width: 0; }
.conv-top { display: flex; justify-content: space-between; align-items: baseline; }
.conv-name { font-size: 16px; font-weight: 500; color: var(--text-primary); }
.conv-time { font-size: 12px; color: var(--text-muted); flex-shrink: 0; }
.conv-desc { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.conv-preview { font-size: 13px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.agent-count {
  font-size: 11px; padding: 1px 6px; border-radius: 3px;
  background: var(--accent); color: var(--surface); flex-shrink: 0; margin-left: 8px;
}
.empty-search, .empty-list {
  padding: 60px 20px; text-align: center; color: var(--text-secondary); font-size: 15px;
}
.empty-list .hint { font-size: 13px; color: var(--text-muted); margin-top: 8px; }

/* Tab Bar */
.tab-bar {
  display: flex; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.tab-bar button {
  flex: 1; padding: 12px; font-size: 15px; color: var(--text-secondary);
  border-bottom: 2px solid transparent; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;
}
.tab-bar button.active { color: var(--accent); border-bottom-color: var(--accent); }
.red-badge {
  background: var(--error); color: var(--surface); font-size: 11px; font-weight: 700;
  padding: 1px 5px; border-radius: 3px;
}

/* Chat */
.chat-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.stats-strip { display: flex; gap: 1px; background: var(--border); border-bottom: 1px solid var(--border); flex-shrink: 0; }
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 10px 8px; background: var(--surface); gap: 2px; }
.stat-v { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.stat-v.warn { color: var(--error); }
.stat-k { font-size: 11px; color: var(--text-secondary); }
.online-agents {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.online-agents::-webkit-scrollbar { display: none; }
.online-agents-label {
  font-size: 16px;
  color: var(--accent);
  font-weight: 700;
  flex-shrink: 0;
}
.online-agents-list {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}
.online-agent-btn {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-light);
  white-space: nowrap;
  transition: background 0.15s, opacity 0.15s;
  flex-shrink: 0;
}
.online-agent-btn:active { background: var(--accent-mid); }
.approval-hint {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: var(--warn-bg); border-bottom: 1px solid var(--warn-border);
  font-size: 14px; color: var(--warn-text); flex-shrink: 0; cursor: pointer;
}
.hint-arrow { font-size: 18px; color: var(--warn-text); }
.message-list { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.empty-msgs { text-align: center; padding: 60px 0; color: var(--text-secondary); }
.empty-msgs p { margin: 0; }
.empty-msgs p:first-child { font-size: 15px; margin-bottom: 8px; }
.empty-msgs .hint { font-size: 13px; color: var(--text-muted); }
.msg-item { display: flex; gap: 10px; align-items: flex-start; }
.msg-item.msg-me { flex-direction: row-reverse; }
.msg-item.msg-sys { justify-content: center; }
.msg-item.msg-agent:not(.msg-me) .msg-avatar { background: var(--accent); color: var(--surface); }
.msg-avatar {
  width: 40px; height: 40px; border-radius: 8px;
  background: var(--accent-light); display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700; color: var(--text-secondary); flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.msg-avatar.avatar-me { background: var(--accent); color: var(--surface); }
.agent-msg-avatar { background: var(--accent) !important; color: var(--surface) !important; }
.online-tag {
  padding: 3px 8px; border-radius: 4px;
  font-size: 12px; font-weight: 500;
  background: var(--bg); color: var(--text-secondary);
}
.online-tag.on { background: var(--accent-light); color: var(--accent); }
.msg-content { max-width: 78%; display: flex; flex-direction: column; gap: 5px; }
.msg-me .msg-content { align-items: flex-end; }
.msg-name { font-size: 12px; color: var(--text-secondary); padding: 0 4px; cursor: pointer; user-select: none; -webkit-user-select: none; }
.msg-bubble {
  position: relative;
  padding: 10px 14px;
  background: var(--surface);
  border-radius: 10px;
  font-size: 15px; line-height: 1.55;
  color: var(--text-primary);
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  word-break: break-word;
}
.msg-bubble::before {
  content: ''; position: absolute; top: 12px; left: -8px;
  width: 0; height: 0;
  border-top: 8px solid transparent; border-bottom: 8px solid transparent;
  border-right: 8px solid var(--surface);
}
.msg-me .msg-bubble {
  background: var(--accent);
  color: var(--surface);
  border-radius: 10px 4px 10px 10px;
}
.msg-me .msg-bubble::before {
  left: auto; right: -8px;
  border-right: none; border-left: 8px solid var(--accent);
}
.bubble-inner { min-width: 0; }
.bubble-inner .md-p { margin: 0 0 4px; line-height: 1.55; }
.bubble-inner .md-p:last-child { margin-bottom: 0; }
.bubble-inner .md-h1, .bubble-inner .md-h2, .bubble-inner .md-h3 { margin: 8px 0 4px; font-weight: 600; }
.bubble-inner .md-h1:first-child, .bubble-inner .md-h2:first-child, .bubble-inner .md-h3:first-child { margin-top: 0; }
.bubble-inner .md-ul, .bubble-inner .md-ol { margin: 4px 0; padding-left: 20px; }
.bubble-inner li { margin: 2px 0; }
.bubble-inner .inline-code {
  background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px;
  font-family: "Cascadia Code", Consolas, monospace; font-size: 0.9em;
}
.bubble-inner .code-block {
  background: var(--bg); border-radius: 6px; padding: 10px 12px;
  margin: 6px 0; overflow-x: auto; font-size: 12px; line-height: 1.5;
}
.bubble-inner .code-block code { font-family: "Cascadia Code", Consolas, monospace; }
.bubble-inner .md-link { color: var(--text-secondary); }
.bubble-inner .md-blockquote {
  border-left: 3px solid var(--accent); margin: 4px 0; padding: 4px 10px;
  background: var(--accent-light); border-radius: 0 4px 4px 0; color: var(--text-secondary);
}
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
.mention-picker {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: var(--surface); border-top: 1px solid var(--border);
  box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
  z-index: 50; max-height: 200px; overflow-y: auto;
  animation: slideUp 0.15s ease-out;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.mention-header {
  padding: 8px 14px; font-size: 12px; color: var(--text-secondary);
  background: var(--bg); border-bottom: 1px solid var(--accent-light);
}
.mention-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; cursor: pointer; transition: background 0.1s;
}
.mention-item:hover, .mention-item.selected { background: var(--bg); }
.mention-avatar {
  width: 32px; height: 32px; border-radius: 6px;
  background: var(--surface);
  color: var(--surface); font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.mention-name { font-size: 14px; color: var(--text-primary); }

/* Composer */
.composer-input-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-end;
}
.composer-bar {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 8px 10px;
  background: var(--bg);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.composer-input {
  flex: 1;
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  outline: none;
  max-height: 120px;
  overflow-y: auto;
  transition: border-color 0.2s;
  display: block;
  box-sizing: border-box;
}
.composer-input:focus { border-color: var(--accent); }
.composer-input:disabled { background: var(--bg); }
.btn-send {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--text-muted);
  color: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s, transform 0.1s;
  padding: 0;
}
.btn-send.active {
  background: var(--accent);
}
.btn-send.active:active { transform: scale(0.94); }
.btn-send:disabled { background: var(--text-muted); cursor: not-allowed; }
.btn-voice {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all 0.2s;
}
.btn-voice:active:not(:disabled) {
  background: var(--accent-light);
}
.btn-voice.recording {
  background: var(--error);
  border-color: var(--error);
  color: var(--surface);
}
.recording-icon {
  animation: recording-pulse 1s ease-in-out infinite;
}
@keyframes recording-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Approvals */
.approvals-section { flex: 1; overflow-y: auto; min-height: 0; }
.approval-filters { display: flex; gap: 8px; padding: 10px 12px; background: var(--surface); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.approval-filters button {
  padding: 5px 12px; border-radius: 4px; font-size: 13px; color: var(--text-secondary);
  background: var(--bg); display: flex; align-items: center; gap: 4px; transition: all 0.15s;
}
.approval-filters button.active { background: var(--accent); color: var(--surface); }
.approval-filters button:disabled { color: var(--text-muted); cursor: not-allowed; }
.filter-count { background: var(--surface); color: var(--error); font-size: 11px; padding: 0 4px; border-radius: 3px; }
.approval-filters button.active .filter-count { background: rgba(255,255,255,0.2); color: var(--surface); }
.refresh-bar { padding: 8px 12px; background: var(--bg); }
.btn-refresh {
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px;
  border: 1px solid var(--border); border-radius: 4px; background: var(--surface);
  font-size: 13px; color: var(--text-secondary); transition: all 0.15s;
}
.btn-refresh:hover { background: var(--bg); }
.btn-refresh:disabled { color: var(--text-muted); cursor: not-allowed; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.approval-error { margin: 8px 12px; padding: 10px 12px; background: var(--surface)5f5; border-radius: 4px; color: var(--error); font-size: 13px; }
.empty-approval { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 16px; color: var(--text-secondary); }
.empty-approval p { margin: 0; font-size: 15px; }
.approval-list { padding: 8px 12px; display: flex; flex-direction: column; gap: 10px; }
.approval-item { background: var(--surface); border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 10px; }
.approval-item.focused { border: 1px solid var(--accent); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12); }
.approval-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.approval-agent { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.approval-action { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-top: 2px; }
.approval-status { padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.s-pending { background: var(--surface)be6; color: var(--warn-text); }
.s-ok { background: var(--warn-bg); color: var(--green); }
.s-no { background: #FFF0F0; color: var(--error); }
.approval-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { padding: 2px 7px; border-radius: 3px; font-size: 12px; background: var(--bg); color: var(--text-secondary); }
.tag.gray { background: var(--bg); }
.r-high { background: #FFF0F0; color: var(--error); }
.r-mid { background: var(--accent-light); color: var(--text-secondary); }
.approval-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
.approval-meta { display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); }
.approval-detail { font-size: 12px; }
.approval-detail summary { color: var(--text-secondary); cursor: pointer; user-select: none; }
.approval-detail pre { margin: 8px 0 0; padding: 8px; background: var(--bg); border-radius: 4px; font-size: 11px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
.approval-btns { display: flex; gap: 8px; margin-top: 4px; }
.btn-ok, .btn-no { flex: 1; padding: 10px; border-radius: 4px; font-size: 15px; font-weight: 600; transition: opacity 0.2s; }
.btn-ok { background: var(--accent); color: var(--surface); }
.btn-ok:not(:disabled):active { opacity: 0.8; }
.btn-no { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); }
.btn-no:not(:disabled):active { background: var(--bg); }
.btn-ok:disabled, .btn-no:disabled { opacity: 0.5; cursor: not-allowed; }

/* Group Info Modal */
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
  padding: 16px 16px 14px; border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.gi-title { font-size: 17px; font-weight: 600; color: var(--text-primary); }
.gi-close {
  width: 32px; height: 32px; border-radius: 50%; background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); border: none; cursor: pointer;
}
.gi-close:active { background: var(--border); }
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
.gi-add-btn:active { opacity: 0.85; }
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
.gi-remove-btn:active { opacity: 0.7; }

/* Member Picker */
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

/* Group info button */
.btn-group-info {
  width: 34px; height: 34px; border-radius: 50%; background: transparent;
  border: none; cursor: pointer; color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center;
}
.btn-group-info:active { background: var(--bg); }

/* Create Agent Panel */
.create-agent-panel {
  width: 100%; max-width: 420px; max-height: 90vh;
  background: var(--surface); border-radius: 16px 16px 0 0;
  display: flex; flex-direction: column; overflow: hidden;
  animation: slideUp 0.2s ease;
}
.ca-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.ca-title { font-size: 17px; font-weight: 600; color: var(--text-primary); flex: 1; text-align: center; }
.ca-back {
  width: 32px; height: 32px; border-radius: 50%; background: var(--bg);
  border: none; cursor: pointer; color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ca-back:active { background: var(--border); }
.ca-steps {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; flex-shrink: 0;
}
.ca-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--border);
  transition: background 0.2s, transform 0.2s;
}
.ca-dot.active { background: var(--accent); transform: scale(1.2); }
.ca-dot.done { background: var(--accent); opacity: 0.4; }
.ca-body {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 14px;
}
.ca-loading {
  display: flex; justify-content: center; align-items: center; padding: 40px;
}
.ca-section-title { font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
.ca-templates { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
.ca-tpl-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px;
  background: var(--bg); cursor: pointer; transition: all 0.15s;
}
.ca-tpl-card:active { background: var(--accent-light); }
.ca-tpl-card.selected { border-color: var(--accent); background: var(--accent-light); }
.ca-tpl-icon {
  width: 38px; height: 38px; border-radius: 10px; background: var(--accent);
  color: var(--surface); font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ca-tpl-info { flex: 1; min-width: 0; }
.ca-tpl-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.ca-tpl-desc { font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.ca-tpl-check { flex-shrink: 0; }
.ca-field { display: flex; flex-direction: column; gap: 6px; }
.ca-label { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.ca-required { color: var(--error); }
.ca-input, .ca-textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg); font-size: 15px; color: var(--text-primary); outline: none;
  box-sizing: border-box; transition: border-color 0.2s;
}
.ca-input:focus, .ca-textarea:focus { border-color: var(--accent); }
.ca-input.error { border-color: var(--error); }
.ca-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
.ca-field-error { font-size: 12px; color: var(--error); }
.ca-tip {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--text-muted); padding: 10px 12px;
  background: var(--bg); border-radius: 6px;
}
.ca-api-error {
  padding: 10px 12px; background: #FFF0F0; border-radius: 6px;
  color: var(--error); font-size: 14px;
}
.ca-submit {
  width: 100%; padding: 14px; border-radius: 8px; border: none;
  background: var(--accent); color: var(--surface);
  font-size: 16px; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
}
.ca-submit:active { opacity: 0.85; }
.ca-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.ca-models { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
.ca-model-card {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 10px;
  background: var(--bg); cursor: pointer; transition: all 0.15s;
}
.ca-model-card:active { background: var(--accent-light); }
.ca-model-card.selected { border-color: var(--accent); background: var(--accent-light); }
.ca-model-info { flex: 1; min-width: 0; }
.ca-model-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.ca-model-path { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.ca-empty-models {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 20px; gap: 10px; color: var(--text-secondary); text-align: center;
}
.ca-empty-models p { margin: 0; font-size: 15px; }
.ca-empty-models .hint { font-size: 13px; color: var(--text-muted); }
.ca-summary {
  background: var(--bg); border-radius: 10px; padding: 14px;
  display: flex; flex-direction: column; gap: 12px;
}
.ca-summary-item { display: flex; gap: 10px; align-items: flex-start; }
.ca-summary-k { font-size: 13px; color: var(--text-muted); min-width: 48px; flex-shrink: 0; }
.ca-summary-v { font-size: 14px; color: var(--text-primary); flex: 1; word-break: break-all; }
</style>
