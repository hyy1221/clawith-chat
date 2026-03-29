# OpenChat 日志插件使用手册

## 1. 插件作用

`createLoggerPlugin` 是 `@open-chat/chat-plugins` 提供的调试插件，用来在消息发送前和消息接收后输出日志。

它适合这些场景：

- 本地联调时确认消息有没有真正发出
- 排查收到的消息结构是否符合预期
- 检查插件链路里消息内容有没有被其他插件改写
- 演示环境里快速观察 SDK 的消息流转

当前实现默认把日志输出到浏览器控制台，不会自动写文件，也不会自动上传到服务端。

源码位置：

- [logger-plugin.ts](/D:/code/open-chat/packages/chat-plugins/src/logger-plugin.ts)
- [PluginManager.ts](/D:/code/open-chat/packages/chat-core/src/plugin/PluginManager.ts)
- [packages/chat-sdk/src/index.ts](/D:/code/open-chat/packages/chat-sdk/src/index.ts)

## 2. 最小接入示例

```ts
import ChatSDK from '@open-chat/chat-sdk'
import { createLoggerPlugin } from '@open-chat/chat-plugins'

const chat = new ChatSDK({
  userId: 'user_001',
  userName: '张三',
  wsUrl: 'ws://localhost:3001',
  groupId: 'group_demo'
})

chat.use(createLoggerPlugin())

await chat.connect()
await chat.sendText('你好')
```

推荐在 `connect()` 之前安装插件。

## 3. 当前实现到底做了什么

根据当前代码，日志插件只做两件事：

1. 在 `beforeSend` 里打印发送日志
2. 在 `afterReceive` 里打印接收日志

默认输出字段：

```ts
{
  id: message.id,
  type: message.type,
  content: message.content,
  senderId: message.senderId
}
```

默认标签：

- 发送：`[LoggerPlugin] 发送消息`
- 接收：`[LoggerPlugin] 接收消息`

## 4. 配置项说明

### `logSend?: boolean`

是否打印发送日志，默认 `true`。

### `logReceive?: boolean`

是否打印接收日志，默认 `true`。

### `logger?: (type: string, data: any) => void`

自定义日志函数。插件调用时会传两个参数：

1. 日志标题字符串
2. 日志数据对象

默认值是 `console.log`。

## 5. 常见配置写法

### 5.1 只看发送日志

```ts
chat.use(createLoggerPlugin({
  logSend: true,
  logReceive: false
}))
```

### 5.2 只看接收日志

```ts
chat.use(createLoggerPlugin({
  logSend: false,
  logReceive: true
}))
```

### 5.3 自定义打印格式

```ts
chat.use(createLoggerPlugin({
  logger(title, data) {
    console.log(new Date().toISOString(), title, data)
  }
}))
```

### 5.4 接入你自己的日志收集函数

```ts
function reportChatLog(title: string, data: any) {
  console.info('[chat-log]', {
    at: Date.now(),
    title,
    data
  })
}

chat.use(createLoggerPlugin({
  logger: reportChatLog
}))
```
## 6. 与其他插件一起使用时的顺序

插件顺序很重要。

从 [PluginManager.ts](/D:/code/open-chat/packages/chat-core/src/plugin/PluginManager.ts) 可以看出：

- `beforeSend` 按 `chat.use(...)` 的注册顺序执行
- `afterReceive` 也按注册顺序执行

这意味着日志插件记录的是“流经它时”的消息内容。

### 示例 1：先过滤，再记录

```ts
chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: true
}))

chat.use(createLoggerPlugin())
```

结果：

- 日志里看到的是过滤后的内容

### 示例 2：先记录，再过滤

```ts
chat.use(createLoggerPlugin())

chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: true
}))
```

结果：

- 日志里看到的是过滤前的原始内容

如果你用于排查过滤规则，建议先记录再过滤。
如果你用于生产排查且不希望日志里出现原文，建议先过滤再记录。

## 7. 典型日志长什么样

### 发送文本消息

```ts
[LoggerPlugin] 发送消息
{
  id: 'msg_xxx',
  type: 'text',
  content: { text: '你好' },
  senderId: 'user_001'
}
```

### 接收图片消息

```ts
[LoggerPlugin] 接收消息
{
  id: 'msg_xxx',
  type: 'image',
  content: { url: 'https://example.com/a.png' },
  senderId: 'user_002'
}
```

### 接收文件消息

```ts
[LoggerPlugin] 接收消息
{
  id: 'msg_xxx',
  type: 'file',
  content: {
    name: 'report.pdf',
    url: 'https://example.com/report.pdf',
    size: 102400,
    type: 'application/pdf'
  },
  senderId: 'user_003'
}
```

## 8. 适合做什么，不适合做什么

适合：

- 调试消息结构
- 检查插件链路是否生效
- 快速确认 SDK 是否收发了某条消息

不适合：

- 长期持久化审计
- 服务端运营统计
- 高敏感内容的生产环境明文落盘

原因是它当前只是一个前端插件，没有内建脱敏、缓冲、重试、采样、落库能力。

## 9. 当前能力边界

按现在的代码实现，它有这些边界：

1. 只记录发送和接收，不记录连接、断开、撤回、群成员变化。
2. 默认只输出到控制台，不写本地文件。
3. 不带批量上报、采样、重试、缓冲。
4. 不会自动脱敏。
5. 如果你的自定义 `logger` 自己抛错，可能影响当前钩子执行体验。
## 10. 常见问题

### Q1：为什么安装了插件却没看到发送日志？

先检查：

- 是否执行了 `chat.use(createLoggerPlugin())`
- 是否在发送前已经 `connect()`
- `logSend` 是否被关掉
- 浏览器控制台是否把 `log` 级别隐藏了

### Q2：为什么只有发送日志，没有接收日志？

可能原因：

- 当前没有其他客户端给你发消息
- `logReceive` 被设成了 `false`
- 服务端没有把消息广播回来

### Q3：为什么日志里的内容和最终看到的不一样？

优先看插件顺序。

日志插件前面如果还有过滤、转换、补字段等插件，那么日志打印的是该时刻的消息内容，不一定是最原始内容。

### Q4：可以把日志发到后端吗？

可以，但要自己提供 `logger`：

```ts
chat.use(createLoggerPlugin({
  async logger(title, data) {
    fetch('/api/chat-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, data, at: Date.now() })
    }).catch(() => {})
  }
}))
```

注意：这是你自己的上报逻辑，不是插件内建能力。生产环境还要考虑脱敏、失败重试、采样和权限控制。

## 11. 推荐实践

开发环境推荐：

```ts
chat.use(createLoggerPlugin())
```

测试环境推荐：

```ts
chat.use(createLoggerPlugin({
  logger(title, data) {
    console.info('[test-chat]', title, data)
  }
}))
```

生产环境推荐：

- 只记录必要字段
- 先脱敏，再记录
- 不要默认把全文消息明文上报
- 最好把 `logger` 包一层统一治理逻辑

## 12. 一份完整示例

```ts
import ChatSDK from '@open-chat/chat-sdk'
import { createFilterPlugin, createLoggerPlugin } from '@open-chat/chat-plugins'

const chat = new ChatSDK({
  userId: 'user_001',
  userName: '张三',
  wsUrl: 'ws://localhost:3001',
  groupId: 'group_demo'
})

chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: true
}))

chat.use(createLoggerPlugin({
  logSend: true,
  logReceive: true,
  logger(title, data) {
    console.log('[OpenChat]', title, data)
  }
}))

await chat.connect()
await chat.sendText('你好')
```

## 13. 相关文件

- [logger-plugin.ts](/D:/code/open-chat/packages/chat-plugins/src/logger-plugin.ts)
- [PluginManager.ts](/D:/code/open-chat/packages/chat-core/src/plugin/PluginManager.ts)
- [packages/chat-sdk/src/index.ts](/D:/code/open-chat/packages/chat-sdk/src/index.ts)
- [README.md](/D:/code/open-chat/README.md)
