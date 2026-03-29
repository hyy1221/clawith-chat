import { Message } from '../types';
/**
 * 消息管理器
 */
export declare class MessageManager {
    private messages;
    private currentGroupId;
    private currentSessionId;
    /**
     * 设置当前群组
     */
    setCurrentGroup(groupId: string): void;
    /**
     * 获取当前群组 ID
     */
    getCurrentGroupId(): string | null;
    /**
     * 设置当前会话
     */
    setCurrentSession(sessionId: string | null): void;
    /**
     * 获取当前会话 ID
     */
    getCurrentSessionId(): string | null;
    /**
     * 添加消息
     */
    addMessage(msg: Message): void;
    /**
     * 获取当前群组的消息
     */
    getMessages(): Message[];
    /**
     * 获取指定群组的消息
     */
    getMessagesByGroup(groupId: string, sessionId?: string | null): Message[];
    /**
     * 根据 ID 获取消息
     */
    getMessageById(messageId: string): Message | undefined;
    /**
     * 更新消息
     */
    updateMessage(messageId: string, updates: Partial<Message>): Message | undefined;
    /**
     * 删除消息
     */
    deleteMessage(messageId: string): boolean;
    /**
     * 撤回消息
     */
    recallMessage(messageId: string): boolean;
    /**
     * 搜索消息
     */
    searchMessages(keyword: string, groupId?: string): Message[];
    /**
     * 清空消息
     */
    clearMessages(groupId?: string): void;
    /**
     * 加载历史消息
     */
    loadHistory(messages: Message[], groupId?: string, sessionId?: string | null): void;
    /**
     * 获取消息数量
     */
    getMessageCount(groupId?: string): number;
    private getBucketKey;
    private ensureBucket;
}
export default MessageManager;
//# sourceMappingURL=MessageManager.d.ts.map