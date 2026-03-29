import { WSMessage } from '../types';
type MessageHandler = (msg: WSMessage) => void;
/**
 * WebSocket 管理器
 */
export declare class SocketManager {
    private socket;
    private url;
    private handlers;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private pingInterval;
    private isManualClose;
    constructor(url: string);
    /**
     * 连接 WebSocket
     */
    connect(): Promise<void>;
    /**
     * 断开连接
     */
    disconnect(): void;
    /**
     * 发送消息
     */
    send(data: WSMessage): void;
    /**
     * 订阅消息
     */
    onMessage(cmd: string, handler: MessageHandler): () => void;
    /**
     * 发送并等待响应
     */
    sendAndWait<T = any>(cmd: string, data: any, timeout?: number): Promise<T>;
    /**
     * 是否连接中
     */
    isConnected(): boolean;
    private handleMessage;
    private emit;
    private reconnect;
    private startPing;
    private stopPing;
    private generateClientId;
}
export default SocketManager;
//# sourceMappingURL=SocketManager.d.ts.map