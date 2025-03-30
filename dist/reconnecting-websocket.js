var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { WebSocket } from "ws";
export var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["CONNECTING"] = WebSocket.CONNECTING] = "CONNECTING";
    ConnectionType[ConnectionType["OPEN"] = WebSocket.OPEN] = "OPEN";
    ConnectionType[ConnectionType["CLOSING"] = WebSocket.CLOSING] = "CLOSING";
    ConnectionType[ConnectionType["CLOSED"] = WebSocket.CLOSED] = "CLOSED";
})(ConnectionType || (ConnectionType = {}));
export class ReconnectingWebSocket {
    constructor(url, options = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        this.options = options;
        this.reconnectAttempts = 0;
        this.readyState = ConnectionType.CONNECTING;
        this.ws = null;
        this.forcedClose = false;
        this.heartbeatInterval = null;
        this.messageQueue = new Set();
        this.eventHandlers = {};
        this.url = url;
        this.debug = (_b = (_a = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _a === void 0 ? void 0 : _a.debug) !== null && _b !== void 0 ? _b : false;
        this.automaticOpen = (_d = (_c = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _c === void 0 ? void 0 : _c.automaticOpen) !== null && _d !== void 0 ? _d : true;
        this.reconnectInterval = (_f = (_e = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _e === void 0 ? void 0 : _e.reconnectInterval) !== null && _f !== void 0 ? _f : 1000;
        this.maxReconnectInterval = (_h = (_g = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _g === void 0 ? void 0 : _g.maxReconnectInterval) !== null && _h !== void 0 ? _h : 30000;
        this.reconnectDecay = (_k = (_j = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _j === void 0 ? void 0 : _j.reconnectDecay) !== null && _k !== void 0 ? _k : 1.5;
        this.maxReconnectAttempts = (_m = (_l = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _l === void 0 ? void 0 : _l.maxReconnectAttempts) !== null && _m !== void 0 ? _m : null;
        this.logger = (_p = (_o = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _o === void 0 ? void 0 : _o.logger) !== null && _p !== void 0 ? _p : console;
        this.jsonStringifier = (_q = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _q === void 0 ? void 0 : _q.jsonStringifier;
        this.websocketOptions = options === null || options === void 0 ? void 0 : options.websocketOptions;
        this.heartbeatOptions = options === null || options === void 0 ? void 0 : options.heartbeatOptions;
        this.queueOptions = options === null || options === void 0 ? void 0 : options.queueOptions;
        if (this.automaticOpen) {
            this.open(false);
        }
        if ((_r = options.heartbeatOptions) === null || _r === void 0 ? void 0 : _r.enabled) {
            this.startHeartbeat();
        }
    }
    logDebug(message, ...args) {
        var _a;
        if (this.debug) {
            (_a = this.logger) === null || _a === void 0 ? void 0 : _a.debug(message, ...args);
        }
    }
    handleOpen(reconnectAttempt) {
        var _a, _b;
        this.readyState = ConnectionType.OPEN;
        this.reconnectAttempts = 0;
        this.logDebug(`WebSocket connected: ${this.url} (reconnectAttempt: ${reconnectAttempt})`);
        (_b = (_a = this.eventHandlers).open) === null || _b === void 0 ? void 0 : _b.call(_a, reconnectAttempt);
        this.releaseQueue();
    }
    handleClose() {
        var _a, _b;
        const wasForced = this.forcedClose;
        this.logDebug(`WebSocket closed: ${this.url}, forced: ${wasForced}`);
        (_b = (_a = this.eventHandlers).close) === null || _b === void 0 ? void 0 : _b.call(_a, wasForced);
        if (!wasForced) {
            this.reconnect();
        }
    }
    handleMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                (_b = (_a = this.eventHandlers).rawMessage) === null || _b === void 0 ? void 0 : _b.call(_a, data);
                if (typeof data === "string") {
                    const parsedData = JSON.parse(data);
                    this.logDebug("Message received:", parsedData);
                    yield ((_d = (_c = this.eventHandlers).message) === null || _d === void 0 ? void 0 : _d.call(_c, parsedData));
                }
                else {
                    yield ((_f = (_e = this.eventHandlers).messageBinary) === null || _f === void 0 ? void 0 : _f.call(_e, data));
                }
            }
            catch (error) {
                this.logDebug("Error parsing message:", error, data);
            }
        });
    }
    handleError(error) {
        var _a, _b;
        this.logDebug("WebSocket error:", error);
        (_b = (_a = this.eventHandlers).error) === null || _b === void 0 ? void 0 : _b.call(_a, error);
    }
    reconnect() {
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
    open(reconnectAttempt) {
        var _a, _b;
        this.ws = new WebSocket(this.url, this.websocketOptions);
        this.logDebug("Attempting to connect:", this.url);
        if (this.ws) {
            if ((_a = this.websocketOptions) === null || _a === void 0 ? void 0 : _a.binaryType) {
                this.ws.binaryType = (_b = this.websocketOptions) === null || _b === void 0 ? void 0 : _b.binaryType;
            }
            this.ws.on("open", () => this.handleOpen(reconnectAttempt));
            this.ws.on("close", () => this.handleClose());
            this.ws.on("message", (data) => this.handleMessage(data));
            this.ws.on("error", (error) => this.handleError(error));
            this.ws.on("unexpected-response", (request, response) => { var _a, _b; return (_b = (_a = this.eventHandlers).unexpectedResponse) === null || _b === void 0 ? void 0 : _b.call(_a, request, response); });
        }
    }
    send(data) {
        var _a;
        if (this.ws && this.readyState === ConnectionType.OPEN) {
            const payload = this.jsonStringifier ? this.jsonStringifier(data) : JSON.stringify(data);
            this.ws.send(payload);
        }
        else {
            if (((_a = this.queueOptions) === null || _a === void 0 ? void 0 : _a.enabled) && this.messageQueue.size < this.queueOptions.limit) {
                this.messageQueue.add(data);
            }
            throw new Error("WebSocket is not open. Unable to send message.");
        }
    }
    sendBytes(bytes) {
        if (this.ws && this.readyState === ConnectionType.OPEN) {
            this.ws.send(bytes);
        }
        else {
            throw new Error("WebSocket is not open. Unable to send message.");
        }
    }
    close() {
        var _a;
        this.forcedClose = true;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
    }
    startHeartbeat() {
        var _a;
        this.stopHeartbeat();
        if (((_a = this.heartbeatOptions) === null || _a === void 0 ? void 0 : _a.enabled) == true) {
            const { message, interval } = this.heartbeatOptions;
            this.heartbeatInterval = setInterval(() => {
                this.send(message);
            }, interval);
        }
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    releaseQueue() {
        var _a;
        if ((_a = this.queueOptions) === null || _a === void 0 ? void 0 : _a.enabled) {
            for (const message of this.messageQueue) {
                this.send(message);
            }
        }
    }
    onRawMessage(handler) {
        this.eventHandlers.rawMessage = handler;
    }
    onMessage(handler) {
        this.eventHandlers.message = handler;
    }
    onMessageBinary(handler) {
        this.eventHandlers.messageBinary = handler;
    }
    onOpen(handler) {
        this.eventHandlers.open = handler;
    }
    onClose(handler) {
        this.eventHandlers.close = handler;
    }
    onError(handler) {
        this.eventHandlers.error = handler;
    }
    onHeartbeat(handler) {
        this.eventHandlers.heartbeat = handler;
    }
    onUnexpectedResponse(handler) {
        this.eventHandlers.unexpectedResponse = handler;
    }
}
