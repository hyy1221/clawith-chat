# OpenChat - 网页弹窗群聊插件

一个可嵌入任意网站的聊天插件系统，支持群聊、消息收发、@提及、插件系统等功能。

## 项目结构

```
open-chat
│
├─ packages
│   ├─ chat-core        # 聊天核心引擎
│   ├─ chat-sdk         # 前端 SDK
│   ├─ chat-ui          # Vue UI 组件
│   ├─ chat-plugins     # 官方插件
│   └─ chat-utils       # 工具函数
│
├─ apps
│   └─ demo-web         # 示例项目
│
└─ server
    └─ chat-server      # WebSocket 服务器
```

## 快速开始

### 1. 安装依赖

```bash
# 安装 pnpm (如果没有)
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 2. 启动服务器

```bash
# 启动 WebSocket 服务器
pnpm dev:server

# 或者单独进入服务器目录
cd server/chat-server
npm install
npm run dev
```

服务器默认在 `ws://localhost:3001` 启动

### 3. 启动示例

```bash
# 启动示例项目
pnpm dev
```

示例项目将在 `http://localhost:5173` 打开

## 使用方式

### 1. 引入 SDK

```javascript
import { ChatSDK } from '@open-chat/chat-sdk'
import { ChatWindow } from '@open-chat/chat-ui'
import { createFilterPlugin } from '@open-chat/chat-plugins'
```

### 2. 初始化

```javascript
const chat = new ChatSDK({
  userId: 'user_1',
  userName: '张三',
  userAvatar: '',
  wsUrl: 'ws://localhost:3001',
  groupId: 'group_demo'
})
```

### 3. 安装插件

```javascript
// 敏感词过滤插件
chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词', '违禁词'],
  replace: true,  // 替换为 * 号
  replaceChar: '*'
}))

// 日志插件
chat.use(createLoggerPlugin())
```

### 4. 注册机器人

```javascript
chat.registerBot({
  id: 'bot_ai',
  name: 'AI助手',
  avatar: '',
  onMessage: async (msg) => {
    return {
      id: 'bot_' + Date.now(),
      groupId: msg.groupId,
      senderId: 'bot_ai',
      senderName: 'AI助手',
      type: 'text',
      content: { text: '你好！我是 AI 助手' },
      createdAt: Date.now()
    }
  }
})
```

### 5. 发送消息

```javascript
// 发送文本
await chat.sendText('你好')

// 发送图片
await chat.sendImage('https://example.com/image.jpg')

// 发送文件
await chat.sendFile({
  name: 'document.pdf',
  url: 'https://example.com/document.pdf',
  size: 1024000,
  type: 'application/pdf'
})
```

### 6. 监听事件

```javascript
// 监听消息接收
chat.onReceive((message) => {
  console.log('收到消息:', message)
})

// 监听消息发送
chat.onSend((message) => {
  console.log('发送消息:', message)
})

// 监听连接状态
chat.onConnect(() => {
  console.log('已连接')
})

chat.onDisconnect(() => {
  console.log('已断开')
})
```

## 功能列表

### 核心功能
- [x] 群聊消息收发
- [x] 文本/图片/文件消息
- [x] @成员 提及功能
- [x] 消息引用
- [x] 消息撤回 (2分钟内)
- [x] 消息搜索
- [x] 历史消息

### 扩展功能
- [x] 插件系统
- [x] 敏感词过滤
- [x] 日志插件
- [x] 机器人支持
- [x] 事件系统

### UI 组件
- [x] 聊天窗口
- [x] 消息列表
- [x] 消息项
- [x] 提及面板
- [x] 工具栏

## 技术栈

- **前端**: Vue3 + TypeScript + Vite
- **状态管理**: 事件总线 (EventBus)
- **通信**: WebSocket
- **架构**: Monorepo (pnpm workspace)

## 许可证

MIT License

## 更多文档

- [Plugin System Manual](./docs/plugin-system-manual.md)
- [Logger Plugin Manual](./docs/logger-plugin-manual.md)
## Standalone Mobile Workspace

`apps/demo-web` has been upgraded from a demo page into a standalone mobile-first H5 workspace for Clawith.

What it supports now:

- Independent deployment as a static frontend
- Runtime backend switching via `openchat.config.js`
- Username/password login against Clawith `/api/auth/login`
- Team chat over Clawith `/ws/team/{team_id}?token=...`
- Mobile approval cards backed by `/api/enterprise/approvals`
- Deep links such as `?tab=approvals&teamId=<id>&approvalId=<id>`

### Local Dev

```bash
cd open-chat
pnpm install
pnpm dev
```

Then open `http://localhost:5173`.

### Runtime Config

Edit `apps/demo-web/public/openchat.config.js`:

```js
window.__OPENCHAT_CONFIG__ = {
  apiBaseUrl: "https://your-clawith-host",
  wsBaseUrl: "wss://your-clawith-host",
  defaultTab: "chat",
}
```

If the frontend is deployed on a different origin than Clawith, make sure the backend CORS policy allows that origin.

### Docker Build

```bash
cd open-chat
docker build -f apps/demo-web/Dockerfile -t openchat-mobile .
docker run --rm -p 8080:8080 openchat-mobile
```

The container serves the standalone H5 on port `8080`.
