/**
 * 机器人管理器
 */
export class BotManager {
    constructor() {
        this.bots = new Map();
    }
    /**
     * 注册机器人
     */
    register(bot) {
        this.bots.set(bot.id, bot);
        console.log(`[BotManager] Bot "${bot.name}" registered`);
    }
    /**
     * 注销机器人
     */
    unregister(botId) {
        return this.bots.delete(botId);
    }
    /**
     * 获取所有机器人
     */
    getAllBots() {
        return Array.from(this.bots.values());
    }
    /**
     * 获取机器人
     */
    getBot(botId) {
        return this.bots.get(botId);
    }
    /**
     * 根据名称获取机器人
     */
    getBotByName(name) {
        for (const bot of this.bots.values()) {
            if (bot.name === name) {
                return bot;
            }
        }
        return undefined;
    }
    /**
     * 触发机器人
     */
    async trigger(message) {
        const content = message.content;
        if (!content || typeof content !== 'object' || !('text' in content)) {
            return null;
        }
        const text = content.text;
        // 检查是否 @ 了某个机器人
        for (const bot of this.bots.values()) {
            const mention = `@${bot.name}`;
            if (text.includes(mention)) {
                try {
                    const response = await bot.onMessage(message);
                    return response;
                }
                catch (error) {
                    console.error(`[BotManager] Bot "${bot.name}" error:`, error);
                }
            }
        }
        return null;
    }
    /**
     * 触发所有相关机器人（广播模式）
     */
    async triggerAll(message) {
        const responses = [];
        const content = message.content;
        if (!content || typeof content !== 'object' || !('text' in content)) {
            return responses;
        }
        const text = content.text;
        for (const bot of this.bots.values()) {
            const mention = `@${bot.name}`;
            if (text.includes(mention)) {
                try {
                    const response = await bot.onMessage(message);
                    if (response) {
                        responses.push(response);
                    }
                }
                catch (error) {
                    console.error(`[BotManager] Bot "${bot.name}" error:`, error);
                }
            }
        }
        return responses;
    }
    /**
     * 清理
     */
    clear() {
        this.bots.clear();
    }
}
export default BotManager;
