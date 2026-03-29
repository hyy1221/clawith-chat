import { EventBus } from '../event/EventBus';
import { PluginManager } from '../plugin/PluginManager';
import { MessageManager } from '../message/MessageManager';
import { GroupManager } from '../group/GroupManager';
import { BotManager } from '../bot/BotManager';
import { ChatConfig, Message, Group, User, Bot, ChatPlugin } from '../types';
/**
 * 聊天引擎 - 核心模块
 */
export declare class ChatEngine {
    eventBus: EventBus;
    pluginManager: PluginManager;
    messageManager: MessageManager;
    groupManager: GroupManager;
    botManager: BotManager;
    private socketManager;
    private config;
    private isConnected;
    private currentSessionId;
    constructor(config: ChatConfig);
    private init;
    /**
     * 连接服务器
     */
    connect(): Promise<void>;
    /**
     * 断开连接
     */
    disconnect(): void;
    /**
     * 是否已连接
     */
    get connected(): boolean;
    /**
     * 获取当前用户 ID
     */
    get userId(): string;
    /**
     * 获取当前用户信息
     */
    get currentUser(): User;
    /**
     * 发送消息
     */
    sendMessage(content: any, type?: 'text' | 'image' | 'file'): Promise<Message>;
    /**
     * 发送文本消息
     */
    sendText(text: string, mentions?: string[]): Promise<Message>;
    /**
     * 发送图片消息
     */
    sendImage(url: string, thumbnail?: string): Promise<Message>;
    /**
     * 发送文件消息
     */
    sendFile(file: {
        name: string;
        url: string;
        size: number;
        type: string;
    }): Promise<Message>;
    /**
     * 撤回消息
     */
    recallMessage(messageId: string): void;
    /**
     * 加入群组
     */
    joinGroup(groupId: string): void;
    /**
     * 创建群组
     */
    createGroup(name: string): Group;
    /**
     * 安装插件
     */
    use(plugin: ChatPlugin): void;
    /**
     * 注册机器人
     */
    registerBot(bot: Bot): void;
    /**
     * 创建新会话并切换到该会话
     */
    createSession(): string;
    /**
     * 切换当前会话
     */
    setSession(sessionId: string | null): void;
    /**
     * 获取当前会话 ID
     */
    getSessionId(): string | null;
    /**
     * 搜索消息
     */
    searchMessages(keyword: string): Message[];
    /**
     * 获取当前群组消息
     */
    getMessages(): Message[];
    /**
     * 获取当前群组
     */
    getCurrentGroup(): Group | undefined;
    /**
     * 获取当前群组成员
     */
    getMembers(): User[];
    /**
     * 销毁引擎
     */
    destroy(): void;
    private handleReceiveMessage;
    private handleRecallMessage;
    private handleGroupMemberUpdate;
    private handleBotTrigger;
    private generateMessageId;
    private generateGroupId;
    private generateSessionId;
}
export default ChatEngine;
//# sourceMappingURL=ChatEngine.d.ts.map