/**
 * WebSocket 管理器
 */
export class SocketManager {
    constructor(url) {
        this.socket = null;
        this.handlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.pingInterval = null;
        this.isManualClose = false;
        this.url = url;
    }
    /**
     * 连接 WebSocket
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.isManualClose = false;
            try {
                this.socket = new WebSocket(this.url);
                this.socket.onopen = () => {
                    console.log('[SocketManager] Connected to', this.url);
                    this.reconnectAttempts = 0;
                    this.startPing();
                    this.emit('open', undefined);
                    resolve();
                };
                this.socket.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        this.handleMessage(msg);
                    }
                    catch (error) {
                        console.error('[SocketManager] Failed to parse message:', error);
                    }
                };
                this.socket.onclose = (event) => {
                    console.log('[SocketManager] Connection closed', event.code, event.reason);
                    this.stopPing();
                    this.emit('close', event);
                    if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnect();
                    }
                };
                this.socket.onerror = (error) => {
                    console.error('[SocketManager] Error:', error);
                    this.emit('error', error);
                    reject(error);
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 断开连接
     */
    disconnect() {
        this.isManualClose = true;
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
    /**
     * 发送消息
     */
    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                ...data,
                timestamp: data.timestamp || Date.now()
            }));
        }
        else {
            console.warn('[SocketManager] Cannot send message, socket not connected');
        }
    }
    /**
     * 订阅消息
     */
    onMessage(cmd, handler) {
        if (!this.handlers.has(cmd)) {
            this.handlers.set(cmd, new Set());
        }
        this.handlers.get(cmd).add(handler);
        return () => {
            this.handlers.get(cmd)?.delete(handler);
        };
    }
    /**
     * 发送并等待响应
     */
    sendAndWait(cmd, data, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const clientMsgId = this.generateClientId();
            const cleanup = this.onMessage(cmd + '_response', (msg) => {
                if (msg.data.clientMsgId === clientMsgId) {
                    cleanup();
                    clearTimeout(timer);
                    resolve(msg.data);
                }
            });
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error('Request timeout'));
            }, timeout);
            this.send({ cmd, data: { ...data, clientMsgId } });
        });
    }
    /**
     * 是否连接中
     */
    isConnected() {
        return this.socket?.readyState === WebSocket.OPEN;
    }
    handleMessage(msg) {
        const handlers = this.handlers.get(msg.cmd);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(msg);
                }
                catch (error) {
                    console.error(`[SocketManager] Error in handler for "${msg.cmd}":`, error);
                }
            });
        }
        // 同时触发所有处理器
        this.emit('message', msg);
    }
    emit(event, data) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.forEach(handler => handler({ cmd: event, data }));
        }
    }
    reconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`[SocketManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => {
            this.connect().catch(() => {
                // 连接失败，会自动重试
            });
        }, delay);
    }
    startPing() {
        this.pingInterval = window.setInterval(() => {
            this.send({ cmd: 'ping', data: {} });
        }, 30000);
    }
    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    generateClientId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}
export default SocketManager;
