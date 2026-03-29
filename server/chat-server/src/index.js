import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { initDatabase, messageOps, groupOps, memberOps } from './db.js'

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'
const USE_DB = process.env.USE_DB !== 'false'

// Initialize database if enabled
if (USE_DB) {
  try {
    initDatabase()
    console.log('[Server] Database mode enabled')
  } catch (error) {
    console.warn('[Server] Failed to initialize database, falling back to memory:', error.message)
  }
}

// Create WebSocket server
const wss = new WebSocketServer({ host: HOST, port: PORT })

console.log(`[Server] WebSocket 服务器启动，端口: ${HOST}:${PORT}`)

// 存储
const clients = new Map() // ws -> { userId, userName, groupId, groupName }
const groups = new Map() // groupId -> { id, name, members: Set, messages: [] }
const userSessions = new Map() // userId -> Set<ws>

// 初始化默认群组
const defaultGroup = {
  id: 'group_demo',
  name: 'Demo 群聊',
  members: new Set(),
  messages: []
}
groups.set(defaultGroup.id, defaultGroup)

// 消息处理
wss.on('connection', (ws) => {
  const clientId = uuidv4()
  console.log(`[Server] 新客户端连接: ${clientId}`)

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      handleMessage(ws, msg)
    } catch (error) {
      console.error('[Server] 消息解析错误:', error)
    }
  })

  ws.on('close', () => {
    handleDisconnect(ws)
  })

  ws.on('error', (error) => {
    console.error('[Server] WebSocket 错误:', error)
  })
})

function handleMessage(ws, msg) {
  const { cmd, data } = msg

  switch (cmd) {
    case 'message_send':
      handleMessageSend(ws, data)
      break
    case 'message_recall':
      handleMessageRecall(ws, data)
      break
    case 'message_edit':
      handleMessageEdit(ws, data)
      break
    case 'message_delete':
      handleMessageDelete(ws, data)
      break
    case 'message_reaction_add':
      handleReactionAdd(ws, data)
      break
    case 'message_reaction_remove':
      handleReactionRemove(ws, data)
      break
    case 'message_read':
      handleMessageRead(ws, data)
      break
    case 'typing_start':
      handleTypingStart(ws, data)
      break
    case 'typing_stop':
      handleTypingStop(ws, data)
      break
    case 'presence_update':
      handlePresenceUpdate(ws, data)
      break
    case 'group_join':
      handleGroupJoin(ws, data)
      break
    case 'group_leave':
      handleGroupLeave(ws, data)
      break
    case 'ping':
      ws.send(JSON.stringify({ cmd: 'pong', data: {} }))
      break
    default:
      console.log(`[Server] 未知命令: ${cmd}`)
  }
}

function handleMessageSend(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  // 获取目标群组，使用客户端所在的群组
  const targetGroupId = client.groupId || 'group_demo'

  // 验证：发送者必须在目标群组中
  const group = groups.get(targetGroupId)
  if (!group || !group.members.has(client.userId)) {
    console.log(`[Server] 发送失败：用户不在群组中`)
    ws.send(JSON.stringify({
      cmd: 'error',
      data: { code: 'NOT_IN_GROUP', message: '你不在该群组中' }
    }))
    return
  }

  // 生成消息 ID
  const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

  // 创建消息
  const message = {
    id: messageId,
    groupId: targetGroupId,
    sessionId: data.sessionId,
    senderId: data.senderId || client.userId,
    senderName: data.senderName || client.userName,
    senderRole: data.senderRole || 'user',
    relaySource: data.relaySource,
    transportSenderId: client.userId,
    transportSenderName: client.userName,
    type: data.type || 'text',
    content: data.content,
    quoteId: data.quoteId,
    mentions: data.mentions,
    createdAt: Date.now(),
    reactions: data.reactions,
    readBy: data.readBy
  }

  // 存储消息到数据库
  if (USE_DB) {
    try {
      messageOps.insert({
        id: message.id,
        group_id: message.groupId,
        session_id: message.sessionId,
        sender_id: message.senderId,
        sender_name: message.senderName,
        sender_avatar: data.senderAvatar,
        sender_role: message.senderRole,
        relay_source: message.relaySource,
        type: message.type,
        content: message.content,
        quote_id: message.quoteId,
        mentions: message.mentions,
        created_at: message.createdAt,
        status: 'sent',
        reactions: message.reactions,
        read_by: message.readBy
      })
    } catch (error) {
      console.error('[Server] Failed to save message to DB:', error)
    }
  }

  // 存储消息到内存
  if (group) {
    group.messages.push(message)
    // 保留最近 100 条消息
    if (group.messages.length > 100) {
      group.messages = group.messages.slice(-100)
    }
  }

  // 广播消息
  broadcast(targetGroupId, {
    cmd: 'message_receive',
    data: message
  })

  console.log(`[Server] 消息发送: ${message.senderName} -> ${message.content?.text}`)
}

function handleMessageRecall(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  const group = groups.get(client.groupId || 'group_demo')
  if (!group) return

  // 查找消息
  const message = group.messages.find(m => m.id === data.messageId)
  if (!message) return

  // 检查是否是发送者本人
  if (message.senderId !== client.userId) {
    console.log(`[Server] 无权撤回他人消息`)
    return
  }

  // 检查是否在 2 分钟内
  const twoMinutes = 2 * 60 * 1000
  if (Date.now() - message.createdAt > twoMinutes) {
    console.log(`[Server] 消息已超过 2 分钟，无法撤回`)
    return
  }

  // 广播撤回
  broadcast(client.groupId || 'group_demo', {
    cmd: 'message_recall',
    data: { messageId: data.messageId }
  })

  console.log(`[Server] 消息撤回: ${data.messageId}`)
}

function handleMessageEdit(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  const group = groups.get(client.groupId || 'group_demo')
  if (!group) return

  // 查找消息
  const message = group.messages.find(m => m.id === data.messageId)
  if (!message) return

  // 检查是否是发送者本人
  if (message.senderId !== client.userId) {
    console.log(`[Server] 无权编辑他人消息`)
    return
  }

  // 检查是否在 5 分钟内
  const fiveMinutes = 5 * 60 * 1000
  if (Date.now() - message.createdAt > fiveMinutes) {
    console.log(`[Server] 消息已超过 5 分钟，无法编辑`)
    return
  }

  // 保存编辑历史
  if (!message.editHistory) {
    message.editHistory = []
  }
  message.editHistory.push({
    content: message.content,
    editedAt: message.editedAt || message.createdAt
  })

  // 更新消息
  message.content = data.content
  message.editedAt = data.editedAt

  // 广播编辑
  broadcast(client.groupId || 'group_demo', {
    cmd: 'message_edit_notify',
    data: {
      messageId: data.messageId,
      content: data.content,
      editedAt: data.editedAt,
      userId: client.userId
    }
  })

  console.log(`[Server] 消息编辑: ${data.messageId}`)
}

function handleMessageDelete(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  const group = groups.get(client.groupId || 'group_demo')
  if (!group) return

  // 查找消息
  const message = group.messages.find(m => m.id === data.messageId)
  if (!message) return

  // 检查是否是发送者本人
  if (message.senderId !== client.userId) {
    console.log(`[Server] 无权删除他人消息`)
    return
  }

  // 标记为已删除
  message.isDeleted = true
  message.type = 'system'
  message.content = { text: '消息已删除' }

  // 广播删除
  broadcast(client.groupId || 'group_demo', {
    cmd: 'message_delete',
    data: {
      messageId: data.messageId,
      userId: client.userId
    }
  })

  console.log(`[Server] 消息删除: ${data.messageId}`)
}

function handleReactionAdd(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  const group = groups.get(client.groupId || 'group_demo')
  if (!group) return

  // 查找消息
  const message = group.messages.find(m => m.id === data.messageId)
  if (!message) return

  // 添加表情回应
  if (!message.reactions) {
    message.reactions = []
  }

  const existing = message.reactions.find(r => r.emoji === data.emoji)
  if (existing) {
    if (!existing.userIds.includes(data.userId)) {
      existing.userIds.push(data.userId)
    }
  } else {
    message.reactions.push({ emoji: data.emoji, userIds: [data.userId] })
  }

  // 广播表情回应
  broadcast(client.groupId || 'group_demo', {
    cmd: 'message_reaction_add',
    data: {
      messageId: data.messageId,
      emoji: data.emoji,
      userId: data.userId
    }
  })

  console.log(`[Server] 表情回应添加: ${data.emoji} -> ${data.messageId}`)
}

function handleReactionRemove(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  const group = groups.get(client.groupId || 'group_demo')
  if (!group) return

  // 查找消息
  const message = group.messages.find(m => m.id === data.messageId)
  if (!message || !message.reactions) return

  const existing = message.reactions.find(r => r.emoji === data.emoji)
  if (existing) {
    existing.userIds = existing.userIds.filter(id => id !== data.userId)
    if (existing.userIds.length === 0) {
      const index = message.reactions.indexOf(existing)
      if (index !== -1) {
        message.reactions.splice(index, 1)
      }
    }
  }

  // 广播表情回应移除
  broadcast(client.groupId || 'group_demo', {
    cmd: 'message_reaction_remove',
    data: {
      messageId: data.messageId,
      emoji: data.emoji,
      userId: data.userId
    }
  })

  console.log(`[Server] 表情回应移除: ${data.emoji} -> ${data.messageId}`)
}

function handleMessageRead(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  const group = groups.get(client.groupId || 'group_demo')
  if (!group) return

  // 查找消息
  const message = group.messages.find(m => m.id === data.messageId)
  if (!message) return

  // 添加已读回执
  if (!message.readBy) {
    message.readBy = []
  }

  const existing = message.readBy.find(r => r.userId === data.userId)
  if (existing) {
    existing.readAt = data.readAt
  } else {
    message.readBy.push({ userId: data.userId, readAt: data.readAt })
  }

  // 广播已读回执（仅发送给发送者）
  const senderWs = findClientByUserId(message.senderId)
  if (senderWs && senderWs.readyState === WebSocket.OPEN) {
    senderWs.send(JSON.stringify({
      cmd: 'read_receipt_update',
      data: {
        messageId: data.messageId,
        userId: data.userId,
        readAt: data.readAt
      }
    }))
  }

  console.log(`[Server] 消息已读: ${data.messageId} by ${data.userId}`)
}

function handleTypingStart(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  // 广播打字开始（排除自己）
  broadcastToGroup(client.groupId || 'group_demo', ws, {
    cmd: 'typing_start',
    data: {
      groupId: data.groupId,
      userId: data.userId,
      userName: data.userName
    }
  })

  console.log(`[Server] 打字开始: ${data.userName} in ${data.groupId}`)
}

function handleTypingStop(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  // 广播打字停止（排除自己）
  broadcastToGroup(client.groupId || 'group_demo', ws, {
    cmd: 'typing_stop',
    data: {
      groupId: data.groupId,
      userId: data.userId
    }
  })

  console.log(`[Server] 打字停止: ${data.userId} in ${data.groupId}`)
}

function handlePresenceUpdate(ws, data) {
  // 更新用户在线状态（可以存储在客户端信息中）
  const client = clients.get(ws)
  if (client) {
    client.presence = data.status
    client.lastSeen = data.lastSeen

    // 广播给其他用户
    broadcastToGroup(client.groupId || 'group_demo', ws, {
      cmd: 'presence_update',
      data: {
        userId: data.userId,
        status: data.status,
        lastSeen: data.lastSeen
      }
    })
  }
}

function findClientByUserId(userId) {
  for (const [ws, client] of clients.entries()) {
    if (client.userId === userId) {
      return ws
    }
  }
  return null
}

function handleGroupJoin(ws, data) {
  const { groupId, groupName, userId, userName } = data

  // 检查是否已经加入了其他群组
  const existingClient = clients.get(ws)
  if (existingClient && existingClient.groupId && existingClient.groupId !== groupId) {
    console.log(`[Server] 用户 ${userName} 已在群组 ${existingClient.groupId} 中，拒绝加入 ${groupId}`)
    ws.send(JSON.stringify({
      cmd: 'error',
      data: { code: 'ALREADY_IN_GROUP', message: `你已在群组 ${existingClient.groupId} 中，请先退出` }
    }))
    return
  }

  // 记录客户端信息
  clients.set(ws, { userId, userName, groupId, groupName: groupName || groupId })

  // 添加到用户会话
  if (!userSessions.has(userId)) {
    userSessions.set(userId, new Set())
  }
  userSessions.get(userId).add(ws)

  // 获取或创建群组
  let group = groups.get(groupId)
  if (!group) {
    group = {
      id: groupId,
      name: groupName || groupId,
      members: new Set(),
      messages: []
    }
    groups.set(groupId, group)

    // Save to database
    if (USE_DB) {
      try {
        groupOps.create({
          id: groupId,
          name: group.name,
          owner_id: userId,
          created_at: Date.now(),
          updated_at: Date.now()
        })
      } catch (error) {
        console.error('[Server] Failed to create group in DB:', error)
      }
    }
  } else if (groupName && group.name !== groupName) {
    group.name = groupName
  }

  // 添加到群组
  const wasMember = group.members.has(userId)
  group.members.add(userId)

  // Save member to database
  if (USE_DB) {
    try {
      memberOps.add({
        group_id: groupId,
        user_id: userId,
        user_name: userName,
        role: 'member',
        joined_at: Date.now()
      })
    } catch (error) {
      console.error('[Server] Failed to add member to DB:', error)
    }
  }

  // 广播成员更新
  broadcast(groupId, {
    cmd: 'group_member_update',
    data: {
      groupId,
      groupName: group.name,
      members: Array.from(group.members).map(id => ({
        id,
        name: getUserName(id),
        role: 'member',
        avatar: ''
      }))
    }
  })

  // 首次入群才发送欢迎消息，避免 chat-ui 重复 join 时刷屏
  if (!wasMember) {
    broadcast(groupId, {
      cmd: 'message_receive',
      data: {
        id: 'msg_welcome_' + Date.now(),
        groupId,
        groupName: group.name,
        senderId: 'system',
        senderName: '系统',
        type: 'system',
        content: { text: `${userName} 加入了群聊` },
        createdAt: Date.now()
      }
    })
  }

  // 加载历史消息（优先从数据库）
  let historyMessages = []
  if (USE_DB) {
    try {
      const dbMessages = messageOps.getByGroupId(groupId, 200)
      historyMessages = dbMessages.map(msg => ({
        id: msg.id,
        groupId: msg.group_id,
        sessionId: msg.session_id,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        senderAvatar: msg.sender_avatar,
        senderRole: msg.sender_role,
        relaySource: msg.relay_source,
        type: msg.type,
        content: msg.content,
        quoteId: msg.quote_id,
        mentions: msg.mentions,
        createdAt: msg.created_at,
        status: msg.status,
        reactions: msg.reactions,
        readBy: msg.read_by,
        editedAt: msg.edited_at,
        editHistory: msg.edit_history,
        isDeleted: msg.is_deleted
      }))
    } catch (error) {
      console.error('[Server] Failed to load messages from DB:', error)
      historyMessages = group.messages.slice(-20)
    }
  } else {
    historyMessages = group.messages.slice(-20)
  }

  // 发送历史消息
  ws.send(JSON.stringify({
    cmd: 'history',
    data: {
      groupId,
      groupName: group.name,
      messages: historyMessages
    }
  }))

  console.log(`[Server] 用户加入群组: ${userName} -> ${groupId} (${group.name}), loaded ${historyMessages.length} messages`)
}

function handleGroupLeave(ws, data) {
  const client = clients.get(ws)
  if (!client) return

  const group = groups.get(client.groupId || data.groupId)
  if (group) {
    group.members.delete(client.userId)

    // 广播成员更新
    broadcast(group.id, {
      cmd: 'group_member_update',
      data: {
        groupId: group.id,
        groupName: group.name,
        members: Array.from(group.members).map(id => ({
          id,
          name: getUserName(id),
          role: 'member',
          avatar: ''
        }))
      }
    })
  }

  clients.delete(ws)
}

function handleDisconnect(ws) {
  const client = clients.get(ws)
  if (client) {
    // 从用户会话中移除
    const sessions = userSessions.get(client.userId)
    if (sessions) {
      sessions.delete(ws)
      if (sessions.size === 0) {
        userSessions.delete(client.userId)
      }
    }

    // 从群组中移除
    const group = groups.get(client.groupId || 'group_demo')
    if (group) {
      group.members.delete(client.userId)

      // 广播成员更新
      broadcast(client.groupId || 'group_demo', {
        cmd: 'group_member_update',
        data: {
          groupId: group.id,
          groupName: group.name,
          members: Array.from(group.members).map(id => ({
            id,
            name: getUserName(id),
            role: 'member',
            avatar: ''
          }))
        }
      })
    }

    console.log(`[Server] 客户端断开: ${client.userName}`)
  }

  clients.delete(ws)
}

function broadcast(groupId, message) {
  const group = groups.get(groupId)
  if (!group) {
    console.log(`[Server] Broadcast: group ${groupId} not found`)
    return
  }

  const messageStr = JSON.stringify(message)
  let sentCount = 0

  // 发送给群组所有成员
  for (const [ws, client] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      const clientGroupId = client.groupId || 'group_demo'
      if (clientGroupId === groupId) {
        ws.send(messageStr)
        sentCount++
      }
    }
  }

  console.log(`[Server] Broadcast to ${groupId}: ${message.cmd}, sent to ${sentCount} clients, group has ${group.members.size} members`)
}

function broadcastToGroup(groupId, excludeWs, message) {
  const group = groups.get(groupId)
  if (!group) {
    console.log(`[Server] BroadcastToGroup: group ${groupId} not found`)
    return
  }

  const messageStr = JSON.stringify(message)
  let sentCount = 0

  // 发送给群组所有成员（排除指定连接）
  for (const [ws, client] of clients.entries()) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      const clientGroupId = client.groupId || 'group_demo'
      if (clientGroupId === groupId) {
        ws.send(messageStr)
        sentCount++
      }
    }
  }

  console.log(`[Server] BroadcastToGroup (excl) to ${groupId}: ${message.cmd}, sent to ${sentCount} clients`)
}

function getUserName(userId) {
  for (const [, client] of clients.entries()) {
    if (client.userId === userId) {
      return client.userName
    }
  }
  return '用户' + userId.slice(-4)
}

// 定期清理断开的连接
setInterval(() => {
  for (const [ws] of clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN) {
      clients.delete(ws)
    }
  }
}, 30000)

console.log(`[Server] 等待客户端连接...`)
