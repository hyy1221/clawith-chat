import { EventBus } from '../event/EventBus';
import { SocketManager } from '../transport/SocketManager';
import { PluginManager } from '../plugin/PluginManager';
import { MessageManager } from '../message/MessageManager';
import { GroupManager } from '../group/GroupManager';
import { BotManager } from '../bot/BotManager';
/**
 * 聊天引擎 - 核心模块
 */
export class ChatEngine {
    constructor(config) {
        this.isConnected = false;
        this.config = config;
        this.currentSessionId = config.sessionId || null;
        // 初始化事件总线
        this.eventBus = new EventBus();
        // 初始化各管理器
        this.pluginManager = new PluginManager(this);
        this.messageManager = new MessageManager();
        this.groupManager = new GroupManager();
        this.botManager = new BotManager();
        this.messageManager.setCurrentSession(this.currentSessionId);
        // 初始化 Socket
        this.socketManager = new SocketManager(config.wsUrl);
        // 初始化
        this.init();
    }
    init() {
        // 监听 Socket 事件
        this.socketManager.onMessage('open', () => {
            this.isConnected = true;
            this.eventBus.emit('connection:open');
        });
        this.socketManager.onMessage('close', () => {
            this.isConnected = false;
            this.eventBus.emit('connection:close');
        });
        this.socketManager.onMessage('error', (msg) => {
            this.eventBus.emit('connection:error', msg.data);
        });
        // 监听消息
        this.socketManager.onMessage('message_receive', (msg) => {
            this.handleReceiveMessage(msg.data);
        });
        this.socketManager.onMessage('message_recall', (msg) => {
            this.handleRecallMessage(msg.data);
        });
        this.socketManager.onMessage('group_member_update', (msg) => {
            this.handleGroupMemberUpdate(msg.data);
        });
        this.socketManager.onMessage('pong', () => {
            // 心跳响应
        });
    }
    /**
     * 连接服务器
     */
    async connect() {
        await this.socketManager.connect();
        // 发送加入群组消息
        if (this.config.groupId) {
            this.joinGroup(this.config.groupId);
        }
    }
    /**
     * 断开连接
     */
    disconnect() {
        this.socketManager.disconnect();
    }
    /**
     * 是否已连接
     */
    get connected() {
        return this.isConnected;
    }
    /**
     * 获取当前用户 ID
     */
    get userId() {
        return this.config.userId;
    }
    /**
     * 获取当前用户信息
     */
    get currentUser() {
        return {
            id: this.config.userId,
            name: this.config.userName || 'User',
            avatar: this.config.userAvatar || '',
            role: 'member'
        };
    }
    /**
     * 发送消息
     */
    async sendMessage(content, type = 'text') {
        const message = {
            id: this.generateMessageId(),
            groupId: this.groupManager.getCurrentGroupId() || '',
            sessionId: this.currentSessionId || undefined,
            senderId: this.config.userId,
            senderName: this.config.userName,
            senderAvatar: this.config.userAvatar,
            senderRole: 'user',
            type,
            content,
            createdAt: Date.now(),
            status: 'sending'
        };
        // 触发发送前事件
        this.eventBus.emit('message:send', message);
        try {
            // 通过插件处理
            const processedMsg = await this.pluginManager.runBeforeSend(message);
            // 发送消息到服务器
            this.socketManager.send({
                cmd: 'message_send',
                data: processedMsg
            });
            // 添加到本地消息列表
            this.messageManager.addMessage(processedMsg);
            // 更新消息状态
            this.messageManager.updateMessage(processedMsg.id, { status: 'sent' });
            return processedMsg;
        }
        catch (error) {
            // 发送失败
            this.messageManager.updateMessage(message.id, { status: 'failed' });
            throw error;
        }
    }
    /**
     * 发送文本消息
     */
    async sendText(text, mentions) {
        return this.sendMessage({ text }, 'text');
    }
    /**
     * 发送图片消息
     */
    async sendImage(url, thumbnail) {
        return this.sendMessage({ url, thumbnail }, 'image');
    }
    /**
     * 发送文件消息
     */
    async sendFile(file) {
        return this.sendMessage(file, 'file');
    }
    /**
     * 撤回消息
     */
    recallMessage(messageId) {
        this.socketManager.send({
            cmd: 'message_recall',
            data: { messageId }
        });
        this.messageManager.recallMessage(messageId);
        this.eventBus.emit('message:recall', { messageId });
    }
    /**
     * 加入群组
     */
    joinGroup(groupId) {
        this.groupManager.setCurrentGroup(groupId);
        this.messageManager.setCurrentGroup(groupId);
        this.messageManager.setCurrentSession(this.currentSessionId);
        this.socketManager.send({
            cmd: 'group_join',
            data: {
                groupId,
                userId: this.config.userId,
                userName: this.config.userName
            }
        });
    }
    /**
     * 创建群组
     */
    createGroup(name) {
        const group = this.groupManager.createGroup({
            id: this.generateGroupId(),
            name,
            ownerId: this.config.userId
        });
        // 添加创建者为成员
        this.groupManager.addMember(group.id, this.currentUser);
        // 加入群组
        this.joinGroup(group.id);
        this.eventBus.emit('group:create', group);
        return group;
    }
    /**
     * 安装插件
     */
    use(plugin) {
        this.pluginManager.use(plugin);
    }
    /**
     * 注册机器人
     */
    registerBot(bot) {
        this.botManager.register(bot);
    }
    /**
     * 创建新会话并切换到该会话
     */
    createSession() {
        const sessionId = this.generateSessionId();
        this.setSession(sessionId);
        return sessionId;
    }
    /**
     * 切换当前会话
     */
    setSession(sessionId) {
        this.currentSessionId = sessionId;
        this.messageManager.setCurrentSession(sessionId);
    }
    /**
     * 获取当前会话 ID
     */
    getSessionId() {
        return this.currentSessionId;
    }
    /**
     * 搜索消息
     */
    searchMessages(keyword) {
        return this.messageManager.searchMessages(keyword);
    }
    /**
     * 获取当前群组消息
     */
    getMessages() {
        return this.messageManager.getMessages();
    }
    /**
     * 获取当前群组
     */
    getCurrentGroup() {
        return this.groupManager.getCurrentGroup();
    }
    /**
     * 获取当前群组成员
     */
    getMembers() {
        const groupId = this.groupManager.getCurrentGroupId();
        if (!groupId)
            return [];
        return this.groupManager.getMembers(groupId);
    }
    /**
     * 销毁引擎
     */
    destroy() {
        this.disconnect();
        this.pluginManager.destroy();
        this.botManager.clear();
        this.eventBus.clear();
    }
    // 私有方法
    async handleReceiveMessage(data) {
        const message = {
            id: data.id,
            groupId: data.groupId,
            sessionId: data.sessionId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            senderRole: data.senderRole,
            relaySource: data.relaySource,
            type: data.type,
            content: data.content,
            quoteId: data.quoteId,
            mentions: data.mentions,
            createdAt: data.createdAt,
            status: 'sent'
        };
        // 通过插件处理
        const processedMsg = await this.pluginManager.runAfterReceive(message);
        // 添加到本地消息列表
        this.messageManager.addMessage(processedMsg);
        // 触发机器人
        this.handleBotTrigger(processedMsg);
        // 触发事件
        this.eventBus.emit('message:receive', processedMsg);
    }
    handleRecallMessage(data) {
        this.messageManager.recallMessage(data.messageId);
        this.eventBus.emit('message:recall', { messageId: data.messageId });
    }
    handleGroupMemberUpdate(data) {
        this.groupManager.setMembers(data.groupId, data.members);
        this.eventBus.emit('group:member-update', data);
    }
    async handleBotTrigger(message) {
        const response = await this.botManager.trigger(message);
        if (response) {
            // 发送机器人回复
            this.messageManager.addMessage(response);
            this.eventBus.emit('message:receive', response);
        }
    }
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    generateGroupId() {
        return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}
export default ChatEngine;
