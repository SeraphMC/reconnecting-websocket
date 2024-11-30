import { Logger } from "pino";
import { ClientOptions, WebSocket } from "ws";

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
	enabled: true
	message: Record<string, unknown>
	interval: number
} | {
	enabled: false
}

export enum ConnectionType {
	CONNECTING = WebSocket.CONNECTING,
	OPEN = WebSocket.OPEN,
	CLOSING = WebSocket.CLOSING,
	CLOSED = WebSocket.CLOSED,
}

export class ReconnectingWebSocket<
	SendType extends Record<string, unknown> = Record<string, unknown>,
	ReceiveType extends Record<string, unknown> = Record<string, unknown>
> {
	public readonly url: string;
	public reconnectAttempts = 0;
	public readyState = ConnectionType.CONNECTING;

	private ws: WebSocket | null = null;
	private forcedClose = false;
	private logger: Logger | Console;
	private heartbeatInterval: NodeJS.Timeout | null = null;

	private readonly debug: boolean;
	private readonly automaticOpen: boolean;
	private readonly reconnectInterval: number;
	private readonly maxReconnectInterval: number;
	private readonly reconnectDecay: number;
	private readonly maxReconnectAttempts: number | null;
	private readonly jsonStringifier?: (data: SendType) => string;

	private readonly websocketOptions?: ClientOptions;
	private readonly heartbeatOptions?: HeartbeatOptions;

	private eventHandlers: {
		message?: (data: ReceiveType) => void | Promise<void>;
		open?: (reconnectAttempt: boolean) => void;
		close?: (forced: boolean) => void;
		error?: (error: Error) => void;
	} = {};

	constructor(url: string, options: Partial<{
		reconnectOptions: ReconnectingWebSocketOptions;
		websocketOptions: ClientOptions;
		heartbeatOptions: HeartbeatOptions;
	}> = {}) {
		this.url = url;
		this.debug = options?.reconnectOptions?.debug ?? false;
		this.automaticOpen = options?.reconnectOptions?.automaticOpen ?? true;
		this.reconnectInterval = options?.reconnectOptions?.reconnectInterval ?? 1000;
		this.maxReconnectInterval = options?.reconnectOptions?.maxReconnectInterval ?? 30000;
		this.reconnectDecay = options?.reconnectOptions?.reconnectDecay ?? 1.5;
		this.maxReconnectAttempts = options?.reconnectOptions?.maxReconnectAttempts ?? null;
		this.logger = options?.reconnectOptions?.logger ?? console;
		this.jsonStringifier = options?.reconnectOptions?.jsonStringifier;

		this.websocketOptions = options?.websocketOptions;
		this.heartbeatOptions = options?.heartbeatOptions;

		if (this.automaticOpen) {
			this.open(false);
		}
		if (options.heartbeatOptions?.enabled) {
			this.startHeartbeat();
		}
	}

	private logDebug(message: string, ...args: unknown[]) {
		if (this.debug) {
			this.logger?.debug(message, ...args);
		}
	}

	private handleOpen(reconnectAttempt: boolean) {
		this.readyState = ConnectionType.OPEN;
		this.reconnectAttempts = 0;

		this.logDebug(`WebSocket connected: ${this.url} (reconnectAttempt: ${reconnectAttempt})`);
		this.eventHandlers.open?.(reconnectAttempt);
	}

	private handleClose() {
		const wasForced = this.forcedClose;
		this.logDebug(`WebSocket closed: ${this.url}, forced: ${wasForced}`);
		this.eventHandlers.close?.(wasForced);

		if (!wasForced) {
			this.reconnect();
		}
	}

	private async handleMessage(data: string | Buffer | ArrayBuffer | Buffer[]) {
		try {
			const parsedData = JSON.parse(data.toString()) as ReceiveType;
			this.logDebug("Message received:", parsedData);
			await this.eventHandlers.message?.(parsedData);
		} catch (error) {
			this.logDebug("Error parsing message:", error, data);
		}
	}

	private handleError(error: Error) {
		this.logDebug("WebSocket error:", error);
		this.eventHandlers.error?.(error);
	}

	private reconnect() {
		this.readyState = ConnectionType.CONNECTING;

		const timeout = Math.min(
			this.reconnectInterval * Math.pow(this.reconnectDecay, this.reconnectAttempts),
			this.maxReconnectInterval,
		);

		setTimeout(() => {
			if (this.maxReconnectAttempts && this.maxReconnectAttempts <= this.reconnectAttempts) {
				throw new Error("Too many reconnect attempts. Giving up!");
			}
			this.reconnectAttempts++;
			this.open(true);
		}, timeout);
	}

	public open(reconnectAttempt: boolean) {
		this.ws = new WebSocket(this.url, this.websocketOptions);
		this.logDebug("Attempting to connect:", this.url);

		this.ws.on("open", () => this.handleOpen(reconnectAttempt));
		this.ws.on("close", () => this.handleClose());
		this.ws.on("message", (data) => this.handleMessage(data));
		this.ws.on("error", (error) => this.handleError(error));
	}

	public send(data: SendType) {
		if (this.ws && this.readyState === ConnectionType.OPEN) {
			const payload = this.jsonStringifier ? this.jsonStringifier(data) : JSON.stringify(data);
			this.ws.send(payload);
		} else {
			throw new Error("WebSocket is not open. Unable to send message.");
		}
	}

	public close() {
		this.forcedClose = true;
		this.ws?.close();
	}

	private startHeartbeat() {
		this.stopHeartbeat();
		if (this.heartbeatOptions?.enabled == true) {
			const {message, interval} = this.heartbeatOptions
			this.heartbeatInterval = setInterval(() => {
				this.send(message as SendType);
			}, interval);
		}
	}

	private stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	public onMessage(handler: (data: ReceiveType) => void | Promise<void>) {
		this.eventHandlers.message = handler;
	}

	public onOpen(handler: (reconnectAttempt: boolean) => void | Promise<void>) {
		this.eventHandlers.open = handler;
	}

	public onClose(handler: (forced: boolean) => void | Promise<void>) {
		this.eventHandlers.close = handler;
	}

	public onError(handler: (error: Error) => void | Promise<void>) {
		this.eventHandlers.error = handler;
	}
}
