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
};

type ReconnectingWebsocketWebSocketEventMap<T extends keyof WebSocketEventMap> = WebSocketEventMap[T] & {
	isReconnect: boolean;
};

export enum ConnectionType {
	CONNECTING = WebSocket.CONNECTING,
	OPEN = WebSocket.OPEN,
	CLOSING = WebSocket.CLOSING,
	CLOSED = WebSocket.CLOSED,
}

export class ReconnectingWebSocket<SendType extends Record<string, unknown>, ReceiveType extends Record<string, unknown>> extends EventTarget {
	public readonly url: string;
	public reconnectAttempts = 0;
	public protocols: string | string[] = [];
	public readyState = ConnectionType.CONNECTING;

	private ws: WebSocket | null = null;
	private forcedClose = false;
	private timedOut = false;
	private logger: Logger | Console;

	public debug: boolean;
	public automaticOpen: boolean;
	public reconnectInterval: number;
	public maxReconnectInterval: number;
	public reconnectDecay: number;
	public timeoutInterval: number;
	public maxReconnectAttempts: number | null;
	public binaryType: BinaryType;

	constructor(url: string, protocols?: string | string[], options: ReconnectingWebSocketOptions = {}) {
		super();

		this.url = url;
		this.protocols = protocols ?? [];
		this.debug = options.debug ?? false;
		this.automaticOpen = options.automaticOpen ?? true;
		this.reconnectInterval = options.reconnectInterval ?? 1000;
		this.maxReconnectInterval = options.maxReconnectInterval ?? 30000;
		this.reconnectDecay = options.reconnectDecay ?? 1.5;
		this.timeoutInterval = options.timeoutInterval ?? 2000;
		this.maxReconnectAttempts = options.maxReconnectAttempts ?? null;
		this.binaryType = options.binaryType ?? "blob";
		this.logger = options.logger ?? console;

		// Whether or not to create a websocket upon instantiation
		if (this.automaticOpen) {
			this.open(false);
		}
	}

	/**
	 * Creates a custom WebSocket event with a new property, `isReconnect`.
	 */
	private createEvent<T extends keyof WebSocketEventMap>(type: T, eventDetails?: Partial<ReconnectingWebsocketWebSocketEventMap<T>>) {
		return new CustomEvent(type, { detail: eventDetails });
	}

	// Handles the WebSocket open event, setting the connection state and dispatching the 'open' event.
	private handleOpen(reconnectAttempt: boolean) {
		this.readyState = ConnectionType.OPEN;
		this.reconnectAttempts = 0;

		const event = this.createEvent("open", { isReconnect: reconnectAttempt });
		this.dispatchEvent(event);
	}

	// Handles the WebSocket close event, manages reconnection logic if necessary.
	private handleClose(event: CloseEvent) {
		if (this.forcedClose) {
			this.readyState = ConnectionType.CLOSED;
			this.dispatchEvent(new CloseEvent("close", event));
		} else {
			this.readyState = ConnectionType.CONNECTING;
			this.dispatchEvent(new CustomEvent("connecting", { detail: event }));

			if (!this.timedOut) {
				this.dispatchEvent(new CloseEvent("close", event));
			}

			const timeout = Math.min(this.reconnectInterval * Math.pow(this.reconnectDecay, this.reconnectAttempts), this.maxReconnectInterval);

			setTimeout(() => {
				this.reconnectAttempts++;
				this.open(true);
			}, timeout);
		}
	}

	// Handles messages by dispatching a 'message' event with the message contents.
	private handleMessage(event: MessageEvent<ReceiveType>) {
		this.dispatchEvent(new MessageEvent("message", { data: event.data }));
	}

	// Handles errors by dispatching an 'error' event with the event details.
	private handleError(event: Event) {
		this.dispatchEvent(new ErrorEvent("error", event));
	}

	/**
	 * Establishes a WebSocket connection to the specified URL.
	 *
	 * @param reconnectAttempt A boolean indicating whether the connection attempt has been tried before.
	 * */
	public open(reconnectAttempt: boolean) {
		if (this.ws) {
			this.ws.close();
		}

		this.ws = new WebSocket(this.url, this.protocols);
		if (this.ws) {
			this.ws.binaryType = this.binaryType;
			if (this.debug) {
				this.logDebug("attempting to connect to", this.url);
			}

			const timeout = setTimeout(() => {
				if (this.ws) {
					this.timedOut = true;
					this.ws.close();
					this.timedOut = false;
				}
			}, this.timeoutInterval);

			this.ws.onopen = () => {
				clearTimeout(timeout);
				if (this.debug) {
					this.logDebug("onopen", this.url);
				}
				this.handleOpen(reconnectAttempt);
			};

			this.ws.onclose = (event) => {
				clearTimeout(timeout);
				this.ws = null;
				this.handleClose(event);
			};

			this.ws.onmessage = (event) => {
				if (this.debug) {
					this.logDebug("onmessage", this.url, event.data);
				}
				this.handleMessage(event);
			};

			this.ws.onerror = (event) => {
				if (this.debug) {
					this.logDebug("onerror", this.url, event);
				}
				this.handleError(event);
			};
		}
	}

	/**
	 * Transmits data to the server over the WebSocket connection.
	 *
	 * @param data a text string, ArrayBuffer, Blob or Object to send to the server.
	 */
	public send(data: string | ArrayBuffer | Blob | SendType) {
		if (this.ws && this.readyState === ConnectionType.OPEN) {
			/**
			 * Automatically stringifies the object if it is not already a string using the function defined in options.
			 * This ensures that any object passed to the WebSocket will be properly converted into a string before being sent over the connection.
			 */
			if (typeof data === "object") {
				data = JSON.stringify(data);
			}
			this.ws.send(data);
		} else {
			throw new Error("Websocket is not ready or connected.");
		}
	}

	/**
	 * Closes the WebSocket connection and stops any connection attempts.
	 * If the WebSocket is already in the state of {@link ConnectionType.CLOSED},
	 * this method won't do anything.
	 */
	public close(code: number = 1000, reason?: string) {
		this.forcedClose = true;
		if (this.ws) {
			this.ws.close(code, reason);
		}
	}

	/**
	 * Refreshes the WebSocket connection by closing and re-opening it.
	 *
	 * This can be useful if the application suspects that the connection is in an inconsistent state,
	 * such as receiving bad data or missing heartbeats. Calling this method will attempt to re-establish
	 * the WebSocket connection.
	 *
	 * This method doesn't do anything if the connection is already closed.
	 */
	public refresh() {
		if (this.ws) {
			this.ws.close();
		}
	}

	// Logger helpers to make the code look nicer and handle future changes with ease.
	private logDebug(message: string, ...args: unknown[]) {
		if (this.debug) {
			this.logger?.debug(message, ...args);
		}
	}
}
