<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="create-agent-panel">
      <div class="ca-header">
        <button class="ca-back" @click="$emit('back')" v-if="step > 0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span class="ca-title">{{ stepLabel }}</span>
        <button class="gi-close" @click="$emit('close')">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="ca-steps">
        <span v-for="i in 3" :key="i" class="ca-dot" :class="{ active: i === step + 1, done: i < step + 1 }"></span>
      </div>

      <div class="ca-body">
        <!-- Step 0: Basic Info -->
        <div v-if="step === 0">
          <div v-if="loading" class="ca-loading">
            <div class="loading-dots"><span></span><span></span><span></span></div>
          </div>
          <div v-else>
            <div class="ca-section-title">选择模板（可选）</div>
            <div class="ca-templates">
              <div
                v-for="tpl in templates"
                :key="tpl.id"
                class="ca-tpl-card"
                :class="{ selected: form.template_id === tpl.id }"
                @click="selectTemplate(tpl)"
              >
                <div class="ca-tpl-icon">{{ tpl.name.charAt(0) }}</div>
                <div class="ca-tpl-info">
                  <div class="ca-tpl-name">{{ tpl.name }}</div>
                  <div class="ca-tpl-desc">{{ tpl.description }}</div>
                </div>
                <svg v-if="form.template_id === tpl.id" width="16" height="16" viewBox="0 0 16 16" fill="none" class="ca-tpl-check">
                  <circle cx="8" cy="8" r="7" fill="var(--accent)"/>
                  <path d="M5 8l2.5 2.5L11 5.5" stroke="var(--surface)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>

            <div class="ca-field">
              <label class="ca-label">名称 <span class="ca-required">*</span></label>
              <input v-model.trim="form.name" class="ca-input" :class="{ error: errors.name }"
                placeholder="例如：智能助手、客服小明" maxlength="100" />
              <div v-if="errors.name" class="ca-field-error">{{ errors.name }}</div>
            </div>

            <div class="ca-field">
              <label class="ca-label">角色描述</label>
              <textarea v-model.trim="form.role_description" class="ca-textarea"
                placeholder="描述数字员工的职责和工作范围" rows="3" maxlength="500"></textarea>
            </div>

            <div v-if="errors.api" class="ca-api-error">{{ errors.api }}</div>
            <button class="ca-submit" @click="$emit('next')">下一步</button>
          </div>
        </div>

        <!-- Step 1: Model Selection -->
        <div v-if="step === 1">
          <div v-if="models.length === 0 && !loading" class="ca-empty-models">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="18" fill="var(--bg)"/>
              <path d="M16 24l6 6 10-10" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p>暂无可用模型</p>
            <p class="hint">请在企业设置中添加模型</p>
          </div>

          <div v-if="loading" class="ca-loading">
            <div class="loading-dots"><span></span><span></span><span></span></div>
          </div>

          <div v-else class="ca-models">
            <div
              v-for="model in models"
              :key="model.id"
              class="ca-model-card"
              :class="{ selected: form.primary_model_id === model.id }"
              @click="form.primary_model_id = model.id; errors.model = ''"
            >
              <div class="ca-model-info">
                <div class="ca-model-name">{{ model.label || model.name }}</div>
                <div class="ca-model-path">{{ model.provider }}/{{ model.model }}</div>
              </div>
              <svg v-if="form.primary_model_id === model.id" width="16" height="16" viewBox="0 0 16 16" fill="none" class="ca-tpl-check">
                <circle cx="8" cy="8" r="7" fill="var(--accent)"/>
                <path d="M5 8l2.5 2.5L11 5.5" stroke="var(--surface)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <div v-if="errors.model" class="ca-field-error" style="margin-bottom:12px">{{ errors.model }}</div>
          <button class="ca-submit" @click="$emit('next')">下一步</button>
        </div>

        <!-- Step 2: Confirm -->
        <div v-if="step === 2">
          <div class="ca-summary">
            <div class="ca-summary-item">
              <span class="ca-summary-k">名称</span>
              <span class="ca-summary-v">{{ form.name }}</span>
            </div>
            <div class="ca-summary-item" v-if="form.role_description">
              <span class="ca-summary-k">角色</span>
              <span class="ca-summary-v">{{ form.role_description }}</span>
            </div>
            <div class="ca-summary-item">
              <span class="ca-summary-k">模型</span>
              <span class="ca-summary-v">{{ selectedModelName }}</span>
            </div>
            <div class="ca-summary-item" v-if="selectedTemplateName">
              <span class="ca-summary-k">模板</span>
              <span class="ca-summary-v">{{ selectedTemplateName }}</span>
            </div>
            <div class="ca-summary-item">
              <span class="ca-summary-k">可见范围</span>
              <span class="ca-summary-v">仅自己</span>
            </div>
          </div>

          <div v-if="errors.api" class="ca-api-error">{{ errors.api }}</div>
          <button class="ca-submit" :disabled="busy" @click="$emit('submit', form)">
            <span v-if="busy">创建中...</span>
            <span v-else>确认创建</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Model { id: string; name?: string; label?: string; provider?: string; model?: string }
interface Template { id: string; name: string; description?: string; role_description?: string }
interface Form { name: string; role_description: string; template_id: string; primary_model_id: string }
interface Errors { name: string; model: string; api: string }

const props = defineProps<{
  step: number
  templates: Template[]
  models: Model[]
  form: Form
  errors: Errors
  busy: boolean
  loading: boolean
}>()

defineEmits<{
  close: []
  back: []
  next: []
  submit: [form: Form]
}>()

const stepLabels = ['新建数字员工', '基本信息', '选择模型', '确认创建']
const stepLabel = computed(() => stepLabels[props.step + 1] || stepLabels[0])

const selectedModelName = computed(() => {
  const m = props.models.find((m) => m.id === props.form.primary_model_id)
  return m ? (m.label || m.name || m.model) : '未选择'
})

const selectedTemplateName = computed(() => {
  const t = props.templates.find((t) => t.id === props.form.template_id)
  return t ? t.name : ''
})

function selectTemplate(tpl: Template) {
  if (props.form.template_id === tpl.id) {
    props.form.template_id = ''
    props.form.role_description = ''
  } else {
    props.form.template_id = tpl.id
    if (tpl.role_description && !props.form.role_description) {
      props.form.role_description = tpl.role_description
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;
  display: flex; align-items: flex-end; justify-content: center;
}
.create-agent-panel {
  width: 100%; max-width: 420px; max-height: 90vh;
  background: var(--surface); border-radius: 16px 16px 0 0;
  display: flex; flex-direction: column; overflow: hidden;
  animation: slideUp 0.2s ease;
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
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
.gi-close {
  width: 32px; height: 32px; border-radius: 50%; background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); border: none; cursor: pointer;
}
.loading-dots { display: flex; gap: 4px; }
.loading-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: loadingPulse 1.2s ease-in-out infinite; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes loadingPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
