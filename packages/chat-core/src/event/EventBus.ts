type EventHandler = (...args: any[]) => void

/**
 * 事件总线 - 用于系统模块间解耦
 */
export class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map()

  /**
   * 订阅事件
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(handler)

    // 返回取消订阅的函数
    return () => this.off(event, handler)
  }

  /**
   * 取消订阅
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.events.delete(event)
      }
    }
  }

  /**
   * 触发事件
   */
  emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      })
    }
  }

  /**
   * 只订阅一次
   */
  once(event: string, handler: EventHandler): void {
    const wrappedHandler = (...args: any[]) => {
      this.off(event, wrappedHandler)
      handler(...args)
    }
    this.on(event, wrappedHandler)
  }

  /**
   * 清除所有事件
   */
  clear(): void {
    this.events.clear()
  }

  /**
   * 获取事件处理器数量
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0
  }
}

export default EventBus
