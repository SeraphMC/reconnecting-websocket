import { type Logger } from "pino";
import { type ClientOptions, WebSocket } from "ws";
type ReconnectingWebSocketOptions = Partial<{
    debug?: boolean;
    automaticOpen?: boolean;
    reconnectInterval?: number;
    maxReconnectInterval?: number;
    reconnectDecay?: number;
    timeoutInterval?: number;
    maxReconnectAttempts?: number | null;
    logger?: Logger | Console;
    jsonStringifier?: (data: Record<string, unknown>) => string;
}>;
type WebsocketClientOptions = Partial<{
    binaryType?: WebSocket["binaryType"];
} & ClientOptions>;
type HeartbeatOptions<T> = {
    enabled: true;
    message: T;
    interval: number;
} | {
    enabled: false;
};
type QueueOptions = {
    enabled: true;
    limit: number;
} | {
    enabled: false;
};
export declare enum ConnectionType {
    CONNECTING,
    OPEN,
    CLOSING,
    CLOSED
}
export declare class ReconnectingWebSocket<SendType extends Record<string, unknown> = Record<string, unknown>, ReceiveType extends Record<string, unknown> = Record<string, unknown>> {
    private options;
    readonly url: string;
    reconnectAttempts: number;
    readyState: ConnectionType;
    private ws;
    private forcedClose;
    private logger;
    private heartbeatInterval;
    private messageQueue;
    private readonly debug;
    private readonly automaticOpen;
    private readonly reconnectInterval;
    private readonly maxReconnectInterval;
    private readonly reconnectDecay;
    private readonly maxReconnectAttempts;
    private readonly jsonStringifier?;
    private readonly websocketOptions?;
    private readonly heartbeatOptions?;
    private readonly queueOptions?;
    private eventHandlers;
    constructor(url: string, options?: Partial<{
        reconnectOptions: ReconnectingWebSocketOptions;
        websocketOptions: WebsocketClientOptions;
        heartbeatOptions: HeartbeatOptions<SendType>;
        queueOptions: QueueOptions;
    }>);
    private logDebug;
    private handleOpen;
    private handleClose;
    private handleMessage;
    private handleError;
    private reconnect;
    open(reconnectAttempt: boolean): void;
    send(data: SendType): void;
    sendBytes(bytes: Buffer | ArrayBuffer | ArrayBufferView): void;
    close(): void;
    private startHeartbeat;
    private stopHeartbeat;
    private releaseQueue;
    onMessage(handler: typeof this.eventHandlers.message): void;
    onMessageBinary(handler: typeof this.eventHandlers.messageBinary): void;
    onOpen(handler: typeof this.eventHandlers.open): void;
    onClose(handler: typeof this.eventHandlers.close): void;
    onError(handler: typeof this.eventHandlers.error): void;
    onHeartbeat(handler: typeof this.eventHandlers.heartbeat): void;
    onUnexpectedResponse(handler: typeof this.eventHandlers.unexpectedResponse): void;
}
export {};
