/**
 * 插件管理器
 */
export class PluginManager {
    constructor(engine) {
        this.plugins = [];
        this.engine = engine;
    }
    /**
     * 安装插件
     */
    use(plugin) {
        // 调用插件的 install 钩子
        if (plugin.install) {
            plugin.install(this.engine);
        }
        this.plugins.push(plugin);
        console.log(`[PluginManager] Plugin "${plugin.name}" installed`);
    }
    /**
     * 卸载插件
     */
    unuse(name) {
        const index = this.plugins.findIndex(p => p.name === name);
        if (index !== -1) {
            const plugin = this.plugins[index];
            if (plugin.destroy) {
                plugin.destroy();
            }
            this.plugins.splice(index, 1);
            console.log(`[PluginManager] Plugin "${name}" uninstalled`);
        }
    }
    /**
     * 获取所有插件
     */
    getPlugins() {
        return [...this.plugins];
    }
    /**
     * 获取指定插件
     */
    getPlugin(name) {
        return this.plugins.find(p => p.name === name);
    }
    /**
     * 执行 beforeSend 钩子
     */
    async runBeforeSend(msg) {
        let result = msg;
        for (const plugin of this.plugins) {
            if (plugin.beforeSend) {
                try {
                    result = await plugin.beforeSend(result);
                }
                catch (error) {
                    console.error(`[PluginManager] Plugin "${plugin.name}" beforeSend error:`, error);
                    throw error;
                }
            }
        }
        return result;
    }
    /**
     * 执行 afterReceive 钩子
     */
    async runAfterReceive(msg) {
        let result = msg;
        for (const plugin of this.plugins) {
            if (plugin.afterReceive) {
                try {
                    result = await plugin.afterReceive(result);
                }
                catch (error) {
                    console.error(`[PluginManager] Plugin "${plugin.name}" afterReceive error:`, error);
                }
            }
        }
        return result;
    }
    /**
     * 销毁所有插件
     */
    destroy() {
        for (const plugin of this.plugins) {
            if (plugin.destroy) {
                plugin.destroy();
            }
        }
        this.plugins = [];
    }
}
export default PluginManager;
