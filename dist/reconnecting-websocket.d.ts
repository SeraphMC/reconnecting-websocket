import { Logger } from "pino";
type ReconnectingWebSocketOptions = {
    debug?: boolean;
    automaticOpen?: boolean;
    reconnectInterval?: number;
    maxReconnectInterval?: number;
    reconnectDecay?: number;
    timeoutInterval?: number;
    maxReconnectAttempts?: number | null;
    binaryType?: "blob" | "arraybuffer";
    logger?: Logger | Console;
    jsonStringifier?: (data: Record<string, unknown>) => string;
};
export declare enum ConnectionType {
    CONNECTING,
    OPEN,
    CLOSING,
    CLOSED
}
export declare class ReconnectingWebSocket<SendType extends Record<string, unknown>, ReceiveType extends Record<string, unknown>> extends EventTarget {
    readonly url: string;
    reconnectAttempts: number;
    protocols: string | string[];
    readyState: ConnectionType;
    private ws;
    private forcedClose;
    private timedOut;
    private logger;
    private readonly debug;
    private readonly automaticOpen;
    private readonly reconnectInterval;
    private readonly maxReconnectInterval;
    private readonly reconnectDecay;
    private readonly timeoutInterval;
    private readonly binaryType;
    private readonly maxReconnectAttempts;
    private readonly jsonStringifier?;
    constructor(url: string, protocols?: string | string[], options?: ReconnectingWebSocketOptions);
    /**
     * Creates a custom WebSocket event with a new property, `isReconnect`.
     */
    private createEvent;
    private handleOpen;
    private handleClose;
    private handleMessage;
    private handleError;
    /**
     * Establishes a WebSocket connection to the specified URL.
     *
     * @param reconnectAttempt A boolean indicating whether the connection attempt has been tried before.
     * */
    open(reconnectAttempt: boolean): void;
    /**
     * Transmits data to the server over the WebSocket connection.
     *
     * @param data a text string, ArrayBuffer, Blob or Object to send to the server.
     */
    send(data: string | ArrayBuffer | Blob | SendType): void;
    /**
     * Closes the WebSocket connection and stops any connection attempts.
     * If the WebSocket is already in the state of {@link ConnectionType.CLOSED},
     * this method won't do anything.
     */
    close(code?: number, reason?: string): void;
    /**
     * Refreshes the WebSocket connection by closing and re-opening it.
     *
     * This can be useful if the application suspects that the connection is in an inconsistent state,
     * such as receiving bad data or missing heartbeats. Calling this method will attempt to re-establish
     * the WebSocket connection.
     *
     * This method doesn't do anything if the connection is already closed.
     */
    refresh(): void;
    private logDebug;
}
export {};
