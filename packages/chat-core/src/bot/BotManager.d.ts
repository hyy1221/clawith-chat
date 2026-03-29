import { Bot, Message } from '../types';
/**
 * 机器人管理器
 */
export declare class BotManager {
    private bots;
    /**
     * 注册机器人
     */
    register(bot: Bot): void;
    /**
     * 注销机器人
     */
    unregister(botId: string): boolean;
    /**
     * 获取所有机器人
     */
    getAllBots(): Bot[];
    /**
     * 获取机器人
     */
    getBot(botId: string): Bot | undefined;
    /**
     * 根据名称获取机器人
     */
    getBotByName(name: string): Bot | undefined;
    /**
     * 触发机器人
     */
    trigger(message: Message): Promise<Message | null>;
    /**
     * 触发所有相关机器人（广播模式）
     */
    triggerAll(message: Message): Promise<Message[]>;
    /**
     * 清理
     */
    clear(): void;
}
export default BotManager;
//# sourceMappingURL=BotManager.d.ts.map