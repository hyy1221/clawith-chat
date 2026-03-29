import { ChatPlugin, Message } from '../types';
import type { ChatEngine } from './ChatEngine';
/**
 * 插件管理器
 */
export declare class PluginManager {
    private plugins;
    private engine;
    constructor(engine: ChatEngine);
    /**
     * 安装插件
     */
    use(plugin: ChatPlugin): void;
    /**
     * 卸载插件
     */
    unuse(name: string): void;
    /**
     * 获取所有插件
     */
    getPlugins(): ChatPlugin[];
    /**
     * 获取指定插件
     */
    getPlugin(name: string): ChatPlugin | undefined;
    /**
     * 执行 beforeSend 钩子
     */
    runBeforeSend(msg: Message): Promise<Message>;
    /**
     * 执行 afterReceive 钩子
     */
    runAfterReceive(msg: Message): Promise<Message>;
    /**
     * 销毁所有插件
     */
    destroy(): void;
}
export default PluginManager;
//# sourceMappingURL=PluginManager.d.ts.map