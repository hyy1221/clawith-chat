# OpenChat 插件系统总手册

## 1. 手册范围

这份文档面向接入方、插件开发者和项目维护者，说明 OpenChat 当前插件系统的工作方式、使用方法和能力边界。

覆盖内容：

- 插件系统的整体结构
- `ChatPlugin` 接口说明
- 插件注册与执行时机
- 内置插件的使用方法
- 多插件组合时的顺序规则
- 自定义插件开发规范
- 常见问题与当前限制

相关源码：

- `packages/chat-core/src/types/index.ts`
- `packages/chat-core/src/plugin/PluginManager.ts`
- `packages/chat-sdk/src/index.ts`
- `packages/chat-plugins/src/filter-plugin.ts`
- `packages/chat-plugins/src/logger-plugin.ts`

## 2. 插件系统整体结构

当前插件系统分三层：

### 2.1 `ChatPlugin` 类型定义

插件协议定义在 `chat-core` 里，当前接口如下：

```ts
export interface ChatPlugin {
  name: string
  install?: (engine: ChatEngine) => void
  beforeSend?: (msg: Message) => Message | Promise<Message>
  afterReceive?: (msg: Message) => Message | Promise<Message>
  destroy?: () => void
}
```

含义：

- `name`：插件唯一名称，用于识别插件
- `install`：安装时触发，一般用于初始化
- `beforeSend`：消息发送前触发，可修改消息，也可抛错阻止发送
- `afterReceive`：消息接收后触发，可修改收到的消息
- `destroy`：插件销毁时触发，用于释放资源

### 2.2 `PluginManager`

`PluginManager` 是插件执行器，负责：

- 安装插件
- 保存插件列表
- 依次执行 `beforeSend`
- 依次执行 `afterReceive`
- 在销毁时调用插件的 `destroy`

### 2.3 `ChatSDK`

接入方通常不会直接操作 `PluginManager`，而是通过 SDK：

```ts
chat.use(plugin)
```

这会把插件注册到内部的 `ChatEngine -> PluginManager` 里。

## 3. 基本使用方式

### 3.1 安装插件

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
```

推荐做法：

1. 先创建 `ChatSDK`
2. 再调用 `chat.use(...)`
3. 最后再 `connect()`

这样连接后的第一批收发消息也能走插件链路。

### 3.2 一个页面可以安装多个插件

```ts
chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: true
}))

chat.use(createLoggerPlugin())
```

插件按注册顺序依次执行，顺序会直接影响结果。

## 4. 插件生命周期

### 4.1 安装阶段

调用：

```ts
chat.use(plugin)
```

内部行为：

1. 如果插件提供了 `install`，先执行 `install(engine)`
2. 再把插件加入插件列表

适合放在 `install` 里的逻辑：

- 初始化内部状态
- 注册额外监听
- 打印安装日志

### 4.2 发送阶段 `beforeSend`

当 SDK 发送消息时，会依次执行每个插件的 `beforeSend`。

当前规则：

- 输入是一条消息对象
- 当前插件可以返回一条新消息
- 返回结果会作为下一个插件的输入
- 如果某个插件抛错，发送会被中断

这意味着 `beforeSend` 适合做：

- 敏感词过滤
- 内容补全
- 自动加标签
- 埋点打印
- 发送前数据标准化

### 4.3 接收阶段 `afterReceive`

收到消息后，会依次执行每个插件的 `afterReceive`。

当前规则：

- 每个插件都可以改写收到的消息
- 改写结果会传给下一个插件
- 如果某个插件抛错，错误会被记录，但不会中断其他插件继续执行

这意味着 `afterReceive` 适合做：

- 内容格式化
- 关键字高亮
- 调试日志
- 客户端侧补充展示字段

### 4.4 销毁阶段

当 SDK 被销毁时：

```ts
chat.destroy()
```

内部会触发插件管理器的 `destroy()`，然后依次执行每个插件自己的 `destroy`。

适合放在 `destroy` 里的逻辑：

- 清理定时器
- 取消订阅
- 释放临时缓存

## 5. 当前执行顺序规则

这是插件系统最重要的部分。

### 5.1 `beforeSend` 顺序

按 `chat.use(...)` 的先后顺序执行。

例如：

```ts
chat.use(pluginA)
chat.use(pluginB)
chat.use(pluginC)
```

发送时顺序是：

1. `pluginA.beforeSend`
2. `pluginB.beforeSend`
3. `pluginC.beforeSend`

### 5.2 `afterReceive` 顺序

也是按 `chat.use(...)` 的先后顺序执行。

### 5.3 为什么顺序重要

因为每个插件都可能修改消息内容。

例如：

```ts
chat.use(createLoggerPlugin())
chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: true
}))
```

这时：

- 日志插件先执行
- 它记录的是过滤前原文

如果顺序反过来：

```ts
chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: true
}))
chat.use(createLoggerPlugin())
```

这时：

- 日志插件记录的是过滤后的内容

## 6. 内置插件总览

当前 `@open-chat/chat-plugins` 暴露了两个内置插件：

```ts
export { createFilterPlugin } from './filter-plugin'
export { createLoggerPlugin } from './logger-plugin'
```

### 6.1 敏感词过滤插件 `createFilterPlugin`

作用：

- 在发送文本消息前检查敏感词

当前配置项：

```ts
interface FilterPluginOptions {
  sensitiveWords?: string[]
  replace?: boolean
  replaceChar?: string
  errorMessage?: string
}
```

行为规则：

- 只处理 `content.text` 这种文本消息
- 如果命中敏感词：
  - `replace = true`：替换后继续发送
  - `replace = false`：直接抛错，中断发送

最小示例：

```ts
chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词', '违禁词'],
  replace: true,
  replaceChar: '*'
}))
```

阻止发送示例：

```ts
chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: false,
  errorMessage: '消息命中敏感词，已阻止发送'
}))
```

注意：

- 当前实现只看文本消息，不处理图片、附件文件名等字段
- 匹配方式是简单的 `includes`
- 替换时是全量替换命中的词

### 6.2 日志插件 `createLoggerPlugin`

作用：

- 发送前打印日志
- 接收后打印日志

配置项：

```ts
interface LoggerPluginOptions {
  logSend?: boolean
  logReceive?: boolean
  logger?: (type: string, data: any) => void
}
```

示例：

```ts
chat.use(createLoggerPlugin({
  logSend: true,
  logReceive: true
}))
```

详细说明可继续看：

- `docs/logger-plugin-manual.md`

## 7. 多插件组合策略

### 7.1 开发环境推荐组合

```ts
chat.use(createLoggerPlugin())
chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: true
}))
```

适合：

- 先观察原始内容
- 再验证过滤效果

### 7.2 生产环境更稳妥的组合

```ts
chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: true
}))

chat.use(createLoggerPlugin({
  logger(title, data) {
    console.info('[chat]', title, {
      id: data.id,
      type: data.type,
      senderId: data.senderId
    })
  }
}))
```

适合：

- 先脱敏
- 再只记录必要字段

## 8. 自定义插件开发

### 8.1 最小插件模板

```ts
import type { ChatPlugin } from '@open-chat/chat-core'

export function createMyPlugin(): ChatPlugin {
  return {
    name: 'my-plugin'
  }
}
```

### 8.2 带安装和销毁逻辑的插件

```ts
import type { ChatPlugin, ChatEngine } from '@open-chat/chat-core'

export function createLifecyclePlugin(): ChatPlugin {
  let installedAt = 0

  return {
    name: 'lifecycle-plugin',

    install(engine: ChatEngine) {
      installedAt = Date.now()
      console.log('plugin installed', engine)
    },

    destroy() {
      console.log('plugin destroyed after', Date.now() - installedAt, 'ms')
    }
  }
}
```

### 8.3 发送前改写文本

```ts
import type { ChatPlugin, Message } from '@open-chat/chat-core'

export function createPrefixPlugin(prefix: string): ChatPlugin {
  return {
    name: 'prefix-plugin',

    beforeSend(message: Message) {
      if (message.type !== 'text') return message
      if (!message.content || typeof message.content !== 'object') return message
      if (!('text' in message.content)) return message

      return {
        ...message,
        content: {
          ...message.content,
          text: `${prefix}${message.content.text}`
        }
      }
    }
  }
}
```

### 8.4 接收后补充展示信息

```ts
import type { ChatPlugin, Message } from '@open-chat/chat-core'

export function createReceiveDecoratePlugin(): ChatPlugin {
  return {
    name: 'receive-decorate-plugin',

    afterReceive(message: Message) {
      if (message.type !== 'text') return message
      if (!message.content || typeof message.content !== 'object') return message
      if (!('text' in message.content)) return message

      return {
        ...message,
        content: {
          ...message.content,
          text: `[已接收] ${message.content.text}`
        }
      }
    }
  }
}
```

### 8.5 阻止某类消息发送

```ts
import type { ChatPlugin, Message } from '@open-chat/chat-core'

export function createBlockImagePlugin(): ChatPlugin {
  return {
    name: 'block-image-plugin',

    beforeSend(message: Message) {
      if (message.type === 'image') {
        throw new Error('当前环境不允许发送图片')
      }
      return message
    }
  }
}
```

## 9. 开发插件时的建议

### 9.1 始终返回消息对象

如果你的钩子不是要阻止发送，就应该返回消息对象本身或改写后的消息对象，不要返回 `null` 或 `undefined`。

### 9.2 只改你需要改的字段

推荐写法：

```ts
return {
  ...message,
  content: {
    ...message.content,
    text: '新内容'
  }
}
```

不要直接把其他字段丢掉。

### 9.3 处理非文本消息

很多插件只适合文本消息。开发时先判断：

```ts
if (message.type !== 'text') return message
```

### 9.4 控制副作用

如果插件里有日志、网络上报、定时器、缓存，最好都在 `install` / `destroy` 生命周期里配对处理。

### 9.5 让插件名稳定且唯一

建议 `name` 不要随配置动态变化，避免排查时难以识别。

## 10. 当前能力边界

根据当前源码，插件系统目前有这些限制：

1. SDK 公开接口只有 `use`，没有公开 `unuse`。
2. 没有优先级系统，只能靠注册顺序控制执行顺序。
3. `install` 和 `destroy` 不是异步钩子。
4. `beforeSend` 抛错会中断发送。
5. `afterReceive` 抛错会被记录，但不会阻止后续插件继续执行。
6. 当前没有插件隔离沙箱，插件代码就是直接跑在前端运行时里。
7. 当前内置插件数量很少，更多能力需要自己扩展。

## 11. 常见问题

### Q1：插件什么时候生效？

从 `chat.use(plugin)` 之后开始生效。建议在 `connect()` 前安装。

### Q2：插件能不能卸载？

底层 `PluginManager` 有 `unuse(name)`，但当前 `ChatSDK` 没有直接暴露这个接口。现在最稳妥的做法是销毁 SDK 后重新初始化。

### Q3：插件能不能改消息 ID、发送人、群组 ID？

技术上能改，因为钩子拿到的是完整消息对象；但不建议这么做，容易破坏消息链路一致性。通常只改 `content` 或新增轻量字段更稳妥。

### Q4：插件适合做服务端鉴权吗？

不适合。插件运行在前端，只适合做前端增强、校验、展示和调试，不应该替代服务端安全策略。

### Q5：多个插件一起挂时怎么排查问题？

建议：

1. 先只挂一个插件确认行为
2. 再逐个叠加
3. 用日志插件观察每一步消息内容变化

## 12. 一份完整示例

```ts
import ChatSDK from '@open-chat/chat-sdk'
import {
  createFilterPlugin,
  createLoggerPlugin
} from '@open-chat/chat-plugins'

function createPrefixPlugin(prefix: string) {
  return {
    name: 'prefix-plugin',
    beforeSend(message) {
      if (message.type !== 'text') return message
      if (!message.content || typeof message.content !== 'object') return message
      if (!('text' in message.content)) return message

      return {
        ...message,
        content: {
          ...message.content,
          text: `${prefix}${message.content.text}`
        }
      }
    }
  }
}

const chat = new ChatSDK({
  userId: 'user_001',
  userName: '张三',
  wsUrl: 'ws://localhost:3001',
  groupId: 'group_demo'
})

chat.use(createPrefixPlugin('[测试环境] '))

chat.use(createFilterPlugin({
  sensitiveWords: ['敏感词'],
  replace: true,
  replaceChar: '*'
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

## 13. 配套文档

- `docs/logger-plugin-manual.md`

如果你后面要继续扩展插件系统，下一步最值得补的是：

- 自定义插件脚手架模板
- 插件测试手册
- 插件发布与版本兼容说明
