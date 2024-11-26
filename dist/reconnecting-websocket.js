var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
export var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["CONNECTING"] = WebSocket.CONNECTING] = "CONNECTING";
    ConnectionType[ConnectionType["OPEN"] = WebSocket.OPEN] = "OPEN";
    ConnectionType[ConnectionType["CLOSING"] = WebSocket.CLOSING] = "CLOSING";
    ConnectionType[ConnectionType["CLOSED"] = WebSocket.CLOSED] = "CLOSED";
})(ConnectionType || (ConnectionType = {}));
var ReconnectingWebSocket = /** @class */ (function (_super) {
    __extends(ReconnectingWebSocket, _super);
    function ReconnectingWebSocket(url, protocols, options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        var _this = _super.call(this) || this;
        _this.reconnectAttempts = 0;
        _this.protocols = [];
        _this.readyState = ConnectionType.CONNECTING;
        _this.ws = null;
        _this.forcedClose = false;
        _this.timedOut = false;
        _this.url = url;
        _this.protocols = protocols !== null && protocols !== void 0 ? protocols : [];
        _this.debug = (_a = options.debug) !== null && _a !== void 0 ? _a : false;
        _this.automaticOpen = (_b = options.automaticOpen) !== null && _b !== void 0 ? _b : true;
        _this.reconnectInterval = (_c = options.reconnectInterval) !== null && _c !== void 0 ? _c : 1000;
        _this.maxReconnectInterval = (_d = options.maxReconnectInterval) !== null && _d !== void 0 ? _d : 30000;
        _this.reconnectDecay = (_e = options.reconnectDecay) !== null && _e !== void 0 ? _e : 1.5;
        _this.timeoutInterval = (_f = options.timeoutInterval) !== null && _f !== void 0 ? _f : 2000;
        _this.maxReconnectAttempts = (_g = options.maxReconnectAttempts) !== null && _g !== void 0 ? _g : null;
        _this.binaryType = (_h = options.binaryType) !== null && _h !== void 0 ? _h : "blob";
        _this.logger = (_j = options.logger) !== null && _j !== void 0 ? _j : console;
        // Whether or not to create a websocket upon instantiation
        if (_this.automaticOpen) {
            _this.open(false);
        }
        return _this;
    }
    /**
     * Creates a custom WebSocket event with a new property, `isReconnect`.
     */
    ReconnectingWebSocket.prototype.createEvent = function (type, eventDetails) {
        return new CustomEvent(type, { detail: eventDetails });
    };
    // Handles the WebSocket open event, setting the connection state and dispatching the 'open' event.
    ReconnectingWebSocket.prototype.handleOpen = function (reconnectAttempt) {
        this.readyState = ConnectionType.OPEN;
        this.reconnectAttempts = 0;
        var event = this.createEvent("open", { isReconnect: reconnectAttempt });
        this.dispatchEvent(event);
    };
    // Handles the WebSocket close event, manages reconnection logic if necessary.
    ReconnectingWebSocket.prototype.handleClose = function (event) {
        var _this = this;
        if (this.forcedClose) {
            this.readyState = ConnectionType.CLOSED;
            this.dispatchEvent(new CloseEvent("close", event));
        }
        else {
            this.readyState = ConnectionType.CONNECTING;
            this.dispatchEvent(new CustomEvent("connecting", { detail: event }));
            if (!this.timedOut) {
                this.dispatchEvent(new CloseEvent("close", event));
            }
            var timeout = Math.min(this.reconnectInterval * Math.pow(this.reconnectDecay, this.reconnectAttempts), this.maxReconnectInterval);
            setTimeout(function () {
                _this.reconnectAttempts++;
                _this.open(true);
            }, timeout);
        }
    };
    // Handles messages by dispatching a 'message' event with the message contents.
    ReconnectingWebSocket.prototype.handleMessage = function (event) {
        this.dispatchEvent(new MessageEvent("message", { data: event.data }));
    };
    // Handles errors by dispatching an 'error' event with the event details.
    ReconnectingWebSocket.prototype.handleError = function (event) {
        this.dispatchEvent(new ErrorEvent("error", event));
    };
    /**
     * Establishes a WebSocket connection to the specified URL.
     *
     * @param reconnectAttempt A boolean indicating whether the connection attempt has been tried before.
     * */
    ReconnectingWebSocket.prototype.open = function (reconnectAttempt) {
        var _this = this;
        if (this.ws) {
            this.ws.close();
        }
        this.ws = new WebSocket(this.url, this.protocols);
        if (this.ws) {
            this.ws.binaryType = this.binaryType;
            if (this.debug) {
                this.logDebug("attempting to connect to", this.url);
            }
            var timeout_1 = setTimeout(function () {
                if (_this.ws) {
                    _this.timedOut = true;
                    _this.ws.close();
                    _this.timedOut = false;
                }
            }, this.timeoutInterval);
            this.ws.onopen = function () {
                clearTimeout(timeout_1);
                if (_this.debug) {
                    _this.logDebug("onopen", _this.url);
                }
                _this.handleOpen(reconnectAttempt);
            };
            this.ws.onclose = function (event) {
                clearTimeout(timeout_1);
                _this.ws = null;
                _this.handleClose(event);
            };
            this.ws.onmessage = function (event) {
                if (_this.debug) {
                    _this.logDebug("onmessage", _this.url, event.data);
                }
                _this.handleMessage(event);
            };
            this.ws.onerror = function (event) {
                if (_this.debug) {
                    _this.logDebug("onerror", _this.url, event);
                }
                _this.handleError(event);
            };
        }
    };
    /**
     * Transmits data to the server over the WebSocket connection.
     *
     * @param data a text string, ArrayBuffer, Blob or Object to send to the server.
     */
    ReconnectingWebSocket.prototype.send = function (data) {
        if (this.ws && this.readyState === ConnectionType.OPEN) {
            /**
             * Automatically stringifies the object if it is not already a string using the function defined in options.
             * This ensures that any object passed to the WebSocket will be properly converted into a string before being sent over the connection.
             */
            if (typeof data === "object") {
                data = JSON.stringify(data);
            }
            this.ws.send(data);
        }
        else {
            throw new Error("Websocket is not ready or connected.");
        }
    };
    /**
     * Closes the WebSocket connection and stops any connection attempts.
     * If the WebSocket is already in the state of {@link ConnectionType.CLOSED},
     * this method won't do anything.
     */
    ReconnectingWebSocket.prototype.close = function (code, reason) {
        if (code === void 0) { code = 1000; }
        this.forcedClose = true;
        if (this.ws) {
            this.ws.close(code, reason);
        }
    };
    /**
     * Refreshes the WebSocket connection by closing and re-opening it.
     *
     * This can be useful if the application suspects that the connection is in an inconsistent state,
     * such as receiving bad data or missing heartbeats. Calling this method will attempt to re-establish
     * the WebSocket connection.
     *
     * This method doesn't do anything if the connection is already closed.
     */
    ReconnectingWebSocket.prototype.refresh = function () {
        if (this.ws) {
            this.ws.close();
        }
    };
    // Logger helpers to make the code look nicer and handle future changes with ease.
    ReconnectingWebSocket.prototype.logDebug = function (message) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this.debug) {
            (_a = this.logger) === null || _a === void 0 ? void 0 : _a.debug.apply(_a, __spreadArray([message], args, false));
        }
    };
    return ReconnectingWebSocket;
}(EventTarget));
export { ReconnectingWebSocket };
