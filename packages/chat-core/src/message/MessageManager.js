/**
 * 消息管理器
 */
export class MessageManager {
    constructor() {
        this.messages = new Map();
        this.currentGroupId = null;
        this.currentSessionId = null;
    }
    /**
     * 设置当前群组
     */
    setCurrentGroup(groupId) {
        this.currentGroupId = groupId;
        this.ensureBucket(groupId, this.currentSessionId);
    }
    /**
     * 获取当前群组 ID
     */
    getCurrentGroupId() {
        return this.currentGroupId;
    }
    /**
     * 设置当前会话
     */
    setCurrentSession(sessionId) {
        this.currentSessionId = sessionId;
        if (this.currentGroupId) {
            this.ensureBucket(this.currentGroupId, sessionId);
        }
    }
    /**
     * 获取当前会话 ID
     */
    getCurrentSessionId() {
        return this.currentSessionId;
    }
    /**
     * 添加消息
     */
    addMessage(msg) {
        const groupId = msg.groupId || this.currentGroupId;
        if (!groupId)
            return;
        const bucketKey = this.getBucketKey(groupId, msg.sessionId ?? this.currentSessionId);
        const groupMessages = this.messages.get(bucketKey) || [];
        groupMessages.push(msg);
        this.messages.set(bucketKey, groupMessages);
    }
    /**
     * 获取当前群组的消息
     */
    getMessages() {
        if (!this.currentGroupId)
            return [];
        return this.messages.get(this.getBucketKey(this.currentGroupId, this.currentSessionId)) || [];
    }
    /**
     * 获取指定群组的消息
     */
    getMessagesByGroup(groupId, sessionId) {
        if (sessionId !== undefined) {
            return this.messages.get(this.getBucketKey(groupId, sessionId)) || [];
        }
        const prefix = `${groupId}::`;
        return Array.from(this.messages.entries())
            .filter(([key]) => key.startsWith(prefix))
            .flatMap(([, value]) => value);
    }
    /**
     * 根据 ID 获取消息
     */
    getMessageById(messageId) {
        for (const messages of this.messages.values()) {
            const msg = messages.find(m => m.id === messageId);
            if (msg)
                return msg;
        }
        return undefined;
    }
    /**
     * 更新消息
     */
    updateMessage(messageId, updates) {
        for (const messages of this.messages.values()) {
            const index = messages.findIndex(m => m.id === messageId);
            if (index !== -1) {
                messages[index] = { ...messages[index], ...updates };
                return messages[index];
            }
        }
        return undefined;
    }
    /**
     * 删除消息
     */
    deleteMessage(messageId) {
        for (const messages of this.messages.values()) {
            const index = messages.findIndex(m => m.id === messageId);
            if (index !== -1) {
                messages.splice(index, 1);
                return true;
            }
        }
        return false;
    }
    /**
     * 撤回消息
     */
    recallMessage(messageId) {
        return this.updateMessage(messageId, {
            content: { text: '消息已撤回' },
            type: 'system'
        }) !== undefined;
    }
    /**
     * 搜索消息
     */
    searchMessages(keyword, groupId) {
        const results = [];
        const targetBuckets = groupId
            ? Array.from(this.messages.keys()).filter((key) => key.startsWith(`${groupId}::`))
            : this.currentGroupId
                ? [this.getBucketKey(this.currentGroupId, this.currentSessionId)]
                : Array.from(this.messages.keys());
        for (const bucketKey of targetBuckets) {
            const messages = this.messages.get(bucketKey) || [];
            for (const msg of messages) {
                const content = msg.content;
                if (typeof content === 'object' && 'text' in content) {
                    if (content.text.toLowerCase().includes(keyword.toLowerCase())) {
                        results.push(msg);
                    }
                }
            }
        }
        return results;
    }
    /**
     * 清空消息
     */
    clearMessages(groupId) {
        if (groupId) {
            const keys = Array.from(this.messages.keys()).filter((key) => key.startsWith(`${groupId}::`));
            keys.forEach((key) => this.messages.delete(key));
        }
        else {
            this.messages.clear();
        }
    }
    /**
     * 加载历史消息
     */
    loadHistory(messages, groupId, sessionId) {
        const targetGroupId = groupId || this.currentGroupId;
        if (!targetGroupId)
            return;
        const bucketKey = this.getBucketKey(targetGroupId, sessionId ?? this.currentSessionId);
        const existing = this.messages.get(bucketKey) || [];
        this.messages.set(bucketKey, [...messages, ...existing]);
    }
    /**
     * 获取消息数量
     */
    getMessageCount(groupId) {
        if (groupId) {
            return this.getMessagesByGroup(groupId).length;
        }
        let total = 0;
        for (const messages of this.messages.values()) {
            total += messages.length;
        }
        return total;
    }
    getBucketKey(groupId, sessionId) {
        return `${groupId}::${sessionId || '__default__'}`;
    }
    ensureBucket(groupId, sessionId) {
        const bucketKey = this.getBucketKey(groupId, sessionId);
        if (!this.messages.has(bucketKey)) {
            this.messages.set(bucketKey, []);
        }
    }
}
export default MessageManager;
