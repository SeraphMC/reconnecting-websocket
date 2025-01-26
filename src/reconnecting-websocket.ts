import { type Logger } from "pino";
import { type ClientOptions, WebSocket } from "ws";
import { ClientRequest, IncomingMessage } from "http";

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

type WebsocketClientOptions = Partial<{ binaryType?: WebSocket["binaryType"]; } & ClientOptions>

type HeartbeatOptions<T> =
	| {
	enabled: true;
	message: T;
	interval: number;
}
	| {
	enabled: false;
};

type QueueOptions = {
	enabled: true;
	limit: number;
} | { enabled: false };

export enum ConnectionType {
	CONNECTING = WebSocket.CONNECTING,
	OPEN = WebSocket.OPEN,
	CLOSING = WebSocket.CLOSING,
	CLOSED = WebSocket.CLOSED,
}

export class ReconnectingWebSocket<SendType extends Record<string, unknown> = Record<string, unknown>, ReceiveType extends Record<string, unknown> = Record<string, unknown>> {
	public readonly url: string;
	public reconnectAttempts = 0;
	public readyState = ConnectionType.CONNECTING;

	private ws: WebSocket | null = null;
	private forcedClose = false;
	private logger: Logger | Console;
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private messageQueue = new Set<SendType>();

	private readonly debug: boolean;
	private readonly automaticOpen: boolean;
	private readonly reconnectInterval: number;
	private readonly maxReconnectInterval: number;
	private readonly reconnectDecay: number;
	private readonly maxReconnectAttempts: number | null;
	private readonly jsonStringifier?: (data: SendType) => string;

	private readonly websocketOptions?: typeof this.options.websocketOptions;
	private readonly heartbeatOptions?: typeof this.options.heartbeatOptions;
	private readonly queueOptions?: typeof this.options.queueOptions;

	private eventHandlers: {
		message?: (data: ReceiveType) => void | Promise<void>;
		messageBinary?: (data: Buffer | ArrayBuffer | Buffer[]) => void | Promise<void>
		rawMessage?: (data: string | Buffer | ArrayBuffer | Buffer[]) => void | Promise<void>
		open?: (reconnectAttempt: boolean) => void;
		close?: (forced: boolean) => void;
		error?: (error: Error) => void;
		heartbeat?: () => void;
		unexpectedResponse?: (request: ClientRequest, response: IncomingMessage) => void;
	} = {};

	constructor(
		url: string,
		private options: Partial<{
			reconnectOptions: ReconnectingWebSocketOptions;
			websocketOptions: WebsocketClientOptions;
			heartbeatOptions: HeartbeatOptions<SendType>;
			queueOptions: QueueOptions;
		}> = {},
	) {
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
		this.queueOptions = options?.queueOptions;

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
		this.releaseQueue();
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
			this.eventHandlers.rawMessage?.(data);
			if (typeof data === "string") {
				const parsedData = JSON.parse(data) as ReceiveType;
				this.logDebug("Message received:", parsedData);
				await this.eventHandlers.message?.(parsedData);
			} else {
				await this.eventHandlers.messageBinary?.(data);
			}
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

		const timeout = Math.min(this.reconnectInterval * Math.pow(this.reconnectDecay, this.reconnectAttempts), this.maxReconnectInterval);

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

		if (this.ws) {
			if (this.websocketOptions?.binaryType) {
				this.ws.binaryType = this.websocketOptions?.binaryType;
			}
			this.ws.on("open", () => this.handleOpen(reconnectAttempt));
			this.ws.on("close", () => this.handleClose());
			this.ws.on("message", (data) => this.handleMessage(data));
			this.ws.on("error", (error) => this.handleError(error));
			this.ws.on("unexpected-response", (request, response) => this.eventHandlers.unexpectedResponse?.(request, response));
		}
	}

	public send(data: SendType) {
		if (this.ws && this.readyState === ConnectionType.OPEN) {
			const payload = this.jsonStringifier ? this.jsonStringifier(data) : JSON.stringify(data);
			this.ws.send(payload);
		} else {
			if (this.queueOptions?.enabled && this.messageQueue.size < this.queueOptions.limit) {
				this.messageQueue.add(data);
			}
			throw new Error("WebSocket is not open. Unable to send message.");
		}
	}

	public sendBytes(bytes: Buffer | ArrayBuffer | ArrayBufferView) {
		if (this.ws && this.readyState === ConnectionType.OPEN) {
			this.ws.send(bytes);
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
			const { message, interval } = this.heartbeatOptions;
			this.heartbeatInterval = setInterval(() => {
				this.send(message);
			}, interval);
		}
	}

	private stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	private releaseQueue() {
		if (this.queueOptions?.enabled) {
			for (const message of this.messageQueue) {
				this.send(message);
			}
		}
	}

	public onRawMessage(handler: typeof this.eventHandlers.rawMessage) {
		this.eventHandlers.rawMessage?.bind(handler);
	}

	public onMessage(handler: typeof this.eventHandlers.message) {
		this.eventHandlers.message?.bind(handler);
	}

	public onMessageBinary(handler: typeof this.eventHandlers.messageBinary) {
		this.eventHandlers.messageBinary?.bind(handler);
	}

	public onOpen(handler: typeof this.eventHandlers.open) {
		this.eventHandlers.open?.bind(handler);
	}

	public onClose(handler: typeof this.eventHandlers.close) {
		this.eventHandlers.close?.bind(handler);
	}

	public onError(handler: typeof this.eventHandlers.error) {
		this.eventHandlers.error?.bind(handler);
	}

	public onHeartbeat(handler: typeof this.eventHandlers.heartbeat) {
		this.eventHandlers.heartbeat?.bind(handler);
	}

	public onUnexpectedResponse(handler: typeof this.eventHandlers.unexpectedResponse) {
		this.eventHandlers.unexpectedResponse?.bind(handler);
	}
}
