export type MessageType = 'text' | 'image' | 'file' | 'system';
export type UserRole = 'owner' | 'admin' | 'member' | 'bot';
export interface User {
    id: string;
    name: string;
    avatar: string;
    role: UserRole;
}
export interface Group {
    id: string;
    name: string;
    ownerId: string;
    members: User[];
    createdAt: number;
}
export interface Message {
    id: string;
    groupId: string;
    sessionId?: string;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    senderRole?: 'user' | 'assistant' | 'system' | 'bot' | string;
    relaySource?: string;
    type: MessageType;
    content: any;
    quoteId?: string;
    mentions?: string[];
    createdAt: number;
    status?: 'sending' | 'sent' | 'failed';
}
export interface TextContent {
    text: string;
}
export interface ImageContent {
    url: string;
    width?: number;
    height?: number;
    thumbnail?: string;
}
export interface FileContent {
    name: string;
    url: string;
    size: number;
    type: string;
}
export interface Attachment {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
}
export interface Bot {
    id: string;
    name: string;
    avatar: string;
    onMessage: (msg: Message) => Promise<Message | null>;
}
export interface ChatPlugin {
    name: string;
    install?: (engine: ChatEngine) => void;
    beforeSend?: (msg: Message) => Message | Promise<Message>;
    afterReceive?: (msg: Message) => Message | Promise<Message>;
    destroy?: () => void;
}
export interface WSMessage {
    cmd: string;
    data: any;
    timestamp?: number;
}
export interface ChatConfig {
    userId: string;
    userName?: string;
    userAvatar?: string;
    wsUrl: string;
    groupId?: string;
    sessionId?: string;
}
export interface ChatEvents {
    'message:send': Message;
    'message:receive': Message;
    'message:recall': {
        messageId: string;
    };
    'group:create': Group;
    'group:join': {
        groupId: string;
        userId: string;
    };
    'group:leave': {
        groupId: string;
        userId: string;
    };
    'group:member-update': {
        groupId: string;
        members: User[];
    };
    'bot:trigger': {
        bot: Bot;
        message: Message;
    };
    'attachment:upload': Attachment;
    'connection:open': void;
    'connection:close': void;
    'connection:error': Error;
    'sync:complete': {
        groupId: string;
        messages: Message[];
    };
}
//# sourceMappingURL=index.d.ts.map