import { Logger } from "pino";
import { ClientOptions } from "ws";
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
type HeartbeatOptions = {
    enabled: true;
    message: Record<string, unknown>;
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
        websocketOptions: ClientOptions;
        heartbeatOptions: HeartbeatOptions;
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
    close(): void;
    private startHeartbeat;
    private stopHeartbeat;
    private releaseQueue;
    onMessage(handler: (data: ReceiveType) => void | Promise<void>): void;
    onOpen(handler: (reconnectAttempt: boolean) => void | Promise<void>): void;
    onClose(handler: (forced: boolean) => void | Promise<void>): void;
    onError(handler: (error: Error) => void | Promise<void>): void;
    onHeartbeat(handler: () => void | Promise<void>): void;
}
export {};
