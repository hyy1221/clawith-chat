type EventHandler = (...args: any[]) => void;
/**
 * 事件总线 - 用于系统模块间解耦
 */
export declare class EventBus {
    private events;
    /**
     * 订阅事件
     */
    on(event: string, handler: EventHandler): () => void;
    /**
     * 取消订阅
     */
    off(event: string, handler: EventHandler): void;
    /**
     * 触发事件
     */
    emit(event: string, ...args: any[]): void;
    /**
     * 只订阅一次
     */
    once(event: string, handler: EventHandler): void;
    /**
     * 清除所有事件
     */
    clear(): void;
    /**
     * 获取事件处理器数量
     */
    listenerCount(event: string): number;
}
export default EventBus;
//# sourceMappingURL=EventBus.d.ts.map