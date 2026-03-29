<template>
  <div class="approval-filters">
    <button :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">
      待处理 <span v-if="pendingCount" class="filter-count">{{ pendingCount }}</span>
    </button>
    <button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
  </div>

  <div class="refresh-bar">
    <button class="btn-refresh" @click="$emit('refresh')" :disabled="loading">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" :class="{ spinning: loading }">
        <path d="M12 7A5 5 0 112.3 3.2M12 3.2V1M12 3.2H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      刷新
    </button>
  </div>

  <p v-if="error" class="approval-error">{{ error }}</p>

  <div v-if="!approvals.length && !loading" class="empty-approval">
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="22" fill="var(--bg)"/>
      <path d="M18 28l7 7 13-13" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <p>没有待处理审批</p>
  </div>

  <div class="approval-list">
    <div v-for="item in approvals" :key="item.id" class="approval-item"
      :class="{ focused: item.id === focusedId }"
      @click="focusedId = item.id">
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
      <details class="approval-detail">
        <summary>详情</summary>
        <pre>{{ approvalJson(item.details) }}</pre>
      </details>
      <div v-if="item.status === 'pending'" class="approval-btns" @click.stop>
        <button class="btn-ok" :disabled="actionBusy === item.id" @click="$emit('resolve', item, 'approve')">批准</button>
        <button class="btn-no" :disabled="actionBusy === item.id" @click="$emit('resolve', item, 'reject')">拒绝</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  approvals: any[]
  pendingCount: number
  loading: boolean
  error: string
  actionBusy: string
}>()

defineEmits<{ resolve: [item: any, action: string]; refresh: [] }>()

const statusFilter = ref('pending')
const focusedId = ref('')

function shortId(v: string) { return v ? String(v).slice(0, 8) : '-' }
function absoluteTime(v: string) { return v ? new Date(v).toLocaleString('zh-CN') : '-' }
function approvalJson(v: any) { try { return JSON.stringify(v || {}, null, 2) } catch { return String(v || '') } }
function statusLabel(s: string) { return { pending: '待处理', approved: '已批准', rejected: '已拒绝' }[s] || s || '未知' }
function statusClass(s: string) { return { approved: 's-ok', rejected: 's-no' }[s] || 's-pending' }
function actionLabel(a: string) { return { write_workspace_files: '写入工作区文件', delete_files: '删除文件', send_feishu_message: '发送飞书消息', web_search: '联网搜索', execute_code: '执行代码' }[a] || a || '审批操作' }
function riskLabel(a: string) { return a === 'delete_files' || a === 'execute_code' ? '高风险' : a === 'send_feishu_message' || a === 'web_search' ? '外部动作' : '常规' }
function riskClass(a: string) { return a === 'delete_files' || a === 'execute_code' ? 'r-high' : a === 'send_feishu_message' || a === 'web_search' ? 'r-mid' : 'r-low' }
function approvalBrief(a: any) { const t = toolLabel(a.details?.tool); const args = a.details?.args ? String(a.details.args).replace(/\s+/g, ' ').slice(0, 60) : ''; return args ? `${t} · ${args}${args.length >= 60 ? '...' : ''}` : `即将执行 ${t}` }
function toolLabel(t: string) { return { write_file: '写文件', delete_file: '删文件', send_feishu_message: '发飞书', send_message_to_agent: '发消息', send_file_to_agent: '发文件', web_search: '联网搜索', execute_code: '执行代码' }[t] || t || '未知' }
</script>

<style scoped>
.approval-filters { display: flex; gap: 8px; padding: 10px 12px; background: var(--surface); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.approval-filters button { padding: 5px 12px; border-radius: 4px; font-size: 13px; color: var(--text-secondary); background: var(--bg); display: flex; align-items: center; gap: 4px; transition: all 0.15s; }
.approval-filters button.active { background: var(--accent); color: var(--surface); }
.approval-filters button:disabled { color: var(--text-muted); cursor: not-allowed; }
.filter-count { background: var(--surface); color: var(--error); font-size: 11px; padding: 0 4px; border-radius: 3px; }
.approval-filters button.active .filter-count { background: rgba(255,255,255,0.2); color: var(--surface); }
.refresh-bar { padding: 8px 12px; background: var(--bg); }
.btn-refresh { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); font-size: 13px; color: var(--text-secondary); transition: all 0.15s; }
.btn-refresh:hover { background: var(--bg); }
.btn-refresh:disabled { color: var(--text-muted); cursor: not-allowed; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.approval-error { margin: 8px 12px; padding: 10px 12px; background: rgba(220,38,38,0.05); border-radius: 4px; color: var(--error); font-size: 13px; }
.empty-approval { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 16px; color: var(--text-secondary); }
.empty-approval p { margin: 0; font-size: 15px; }
.approval-list { padding: 8px 12px; display: flex; flex-direction: column; gap: 10px; }
.approval-item { background: var(--surface); border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 10px; }
.approval-item.focused { border: 1px solid var(--accent); box-shadow: 0 0 0 2px rgba(37,99,235,0.12); }
.approval-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.approval-agent { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.approval-action { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-top: 2px; }
.approval-status { padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.s-pending { background: rgba(245,158,11,0.1); color: #B45309; }
.s-ok { background: rgba(34,197,94,0.1); color: #059669; }
.s-no { background: rgba(220,38,38,0.05); color: var(--error); }
.approval-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { padding: 2px 7px; border-radius: 3px; font-size: 12px; background: var(--bg); color: var(--text-secondary); }
.tag.gray { background: var(--bg); }
.r-high { background: rgba(220,38,38,0.05); color: var(--error); }
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
</style>
