<template>
  <div class="auth-page">
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

      <form v-if="authMode === 'login'" class="auth-form" @submit.prevent="$emit('login', form)">
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
          <input v-model.trim="configForm.apiBaseUrl" type="text" placeholder="http://192.168.1.5:8004" />
        </div>
        <div class="form-item">
          <label>WebSocket 地址</label>
          <input v-model.trim="configForm.wsBaseUrl" type="text" placeholder="ws://192.168.1.5:8004" />
        </div>
        <button class="btn-login" @click="$emit('update:config', configForm)">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  authError: string
  loginBusy: boolean
  initialConfig: { apiBaseUrl: string; wsBaseUrl: string }
}>()

const emit = defineEmits<{
  login: [form: { username: string; password: string }]
  'update:config': [config: { apiBaseUrl: string; wsBaseUrl: string }]
}>()

const authMode = ref('login')
const form = ref({ username: '', password: '' })
const configForm = ref({ ...props.initialConfig })

watch(() => props.initialConfig, (v) => { configForm.value = { ...v } }, { deep: true })
</script>

<style scoped>
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
  margin: 0; padding: 10px 12px;
  background: rgba(220, 38, 38, 0.05);
  border: 1px solid var(--error); border-radius: 4px; color: var(--error); font-size: 13px;
}
.btn-login {
  width: 100%; padding: 13px; background: var(--accent); color: var(--surface);
  border-radius: 6px; font-size: 16px; font-weight: 600; margin-top: 8px; transition: opacity 0.2s;
}
.btn-login:not(:disabled):active { opacity: 0.8; }
.btn-login:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
