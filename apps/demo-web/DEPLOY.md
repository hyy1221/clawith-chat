# OpenChat Mobile Workbench — 部署指南

## 快速启动

```bash
cd apps/demo-web
pnpm install
pnpm dev
```

访问 `http://localhost:5173`

---

## 服务架构

```
浏览器(手机/电脑)
  │
  ├── demo-web (Vite dev)        http://localhost:5173
  │   └── 语音输入 → POST /api/stt/transcribe
  │
  └── Clawith Backend (Docker)    http://localhost:8004
      ├── WebSocket /ws/user      (实时消息推送)
      ├── REST API /api/*         (业务接口)
      └── STT /api/stt/transcribe → Whisper API

Whisper API (本地 Python)        http://localhost:9000
  └── /v1/audio/transcriptions   (语音转文字)
```

---

## 语音输入 (STT)

### 依赖组件

| 组件 | 地址 | 说明 |
|------|------|------|
| Whisper 服务 | `localhost:9000` | faster-whisper 模型服务 |
| Clawith 后端 | `localhost:8004` | 转发 STT 请求到 Whisper |
| demo-web | `localhost:5173` | 录音并调用 `/api/stt/transcribe` |

### 启动 Whisper 服务

**前置依赖**（安装一次即可）：
```bash
pip install faster-whisper uvicorn
```

**启动服务**：
```bash
cd apps/demo-web
HF_ENDPOINT=https://hf-mirror.com python whisper_server.py --model medium --device cpu --port 9000
```

> 首次启动会自动下载模型（medium 约 500MB）。使用国内镜像加速。
> 有 NVIDIA GPU 可加 `--device cuda` 加速。

**可选模型**：
- `tiny`    (~75MB, 速度快, 精度低)
- `base`    (~150MB)
- `small`   (~240MB)
- `medium`  (~500MB, 默认)
- `large-v3` (~3GB, 精度最高)

### 验证

```bash
# Whisper 服务健康检查
curl http://localhost:9000/health

# STT 端点（需认证）
curl -X POST http://localhost:8004/api/stt/transcribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.wav"
```

---

## PWA 移动端

### 功能

- **离线缓存**: Workbox CDN 运行时缓存（API NetworkFirst，静态资源 CacheFirst）
- **Push 通知**: 支持 Web Push，审批消息推送
- **App Badge**: 移动端桌面图标显示未读数
- **系统主题**: 跟随手机系统深/浅色切换

### 构建生产版本

```bash
cd apps/demo-web
pnpm build
# 产物在 dist/
```

### PWA 文件说明

| 文件 | 用途 |
|------|------|
| `public/sw.js` | Service Worker 源码（含 Workbox CDN 缓存 + Push 通知） |
| `src/sw.js` | 同上，src 版本（用于 vite-plugin-pwa injectManifest） |
| `src/pwa.ts` | PWA 辅助模块（SW 注册、Badge、振动） |
| `vite.config.ts` | PWA 插件配置（manifest、injectManifest） |

---

## 环境变量

### Whisper

```bash
# 设置在启动 Whisper 服务的终端
HF_ENDPOINT=https://hf-mirror.com    # 国内下载模型加速
```

### Clawith Backend (docker-compose.yml)

```yaml
environment:
  WHISPER_API_URL: http://host.docker.internal:9000
```

> 从 Docker 容器内访问 Windows 本地 Whisper 服务用 `host.docker.internal`。

---

## 开发注意

- `vite.config.ts` 的 proxy 将 `/api` 和 `/ws` 代理到 `localhost:8004`
- 生产构建：`dist/` 目录需部署到支持 HTTPS 的服务器（语音功能在手机上必须 HTTPS）
- Service Worker 仅在 HTTPS 或 localhost 下可用

---

## 文件结构

```
apps/demo-web/
├── App.vue                    # 主应用（Vue 3 Composition API）
├── index.html                 # 入口 HTML
├── vite.config.ts             # Vite + PWA 配置
├── public/
│   ├── sw.js                 # Service Worker 源码
│   ├── icon-192.svg          # PWA 图标
│   └── icon-512.svg
├── src/
│   ├── sw.js                 # 同上（injectManifest 源）
│   ├── pwa.ts                # PWA 辅助模块
│   ├── theme.ts              # 主题系统
│   ├── composables/
│   │   ├── useApi.ts        # API 请求封装
│   │   ├── useMarkdown.ts   # Markdown 渲染
│   │   └── useToast.ts      # Toast 通知
│   ├── components/
│   │   ├── SkeletonLoader.vue
│   │   ├── GroupInfoModal.vue
│   │   ├── CreateAgentModal.vue
│   │   ├── HomeApprovals.vue
│   │   ├── GroupApprovals.vue
│   │   └── ApprovalsPage.vue
│   └── views/
│       └── AuthPage.vue
└── whisper_server.py         # 本地 Whisper API 服务
```

---

## 版本历史

| 版本 | 变更 |
|------|------|
| v1.0.0 | 初始版本 |
| v1.1.0 | 添加 PWA 支持 |
| v1.2.0 | 骨架屏 + 系统主题 + 代码拆分 |
| v1.3.0 | 离线缓存 + 语音输入优化 |
