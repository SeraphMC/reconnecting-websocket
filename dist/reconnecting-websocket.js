var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { WebSocket } from "ws";
export var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["CONNECTING"] = WebSocket.CONNECTING] = "CONNECTING";
    ConnectionType[ConnectionType["OPEN"] = WebSocket.OPEN] = "OPEN";
    ConnectionType[ConnectionType["CLOSING"] = WebSocket.CLOSING] = "CLOSING";
    ConnectionType[ConnectionType["CLOSED"] = WebSocket.CLOSED] = "CLOSED";
})(ConnectionType || (ConnectionType = {}));
var ReconnectingWebSocket = /** @class */ (function () {
    function ReconnectingWebSocket(url, options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        this.reconnectAttempts = 0;
        this.readyState = ConnectionType.CONNECTING;
        this.ws = null;
        this.forcedClose = false;
        this.timedOut = false;
        this.eventHandlers = {};
        this.url = url;
        this.debug = (_b = (_a = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _a === void 0 ? void 0 : _a.debug) !== null && _b !== void 0 ? _b : false;
        this.automaticOpen = (_d = (_c = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _c === void 0 ? void 0 : _c.automaticOpen) !== null && _d !== void 0 ? _d : true;
        this.reconnectInterval = (_f = (_e = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _e === void 0 ? void 0 : _e.reconnectInterval) !== null && _f !== void 0 ? _f : 1000;
        this.maxReconnectInterval = (_h = (_g = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _g === void 0 ? void 0 : _g.maxReconnectInterval) !== null && _h !== void 0 ? _h : 30000;
        this.reconnectDecay = (_k = (_j = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _j === void 0 ? void 0 : _j.reconnectDecay) !== null && _k !== void 0 ? _k : 1.5;
        this.timeoutInterval = (_m = (_l = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _l === void 0 ? void 0 : _l.timeoutInterval) !== null && _m !== void 0 ? _m : 2000;
        this.maxReconnectAttempts = (_p = (_o = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _o === void 0 ? void 0 : _o.maxReconnectAttempts) !== null && _p !== void 0 ? _p : null;
        this.logger = (_r = (_q = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _q === void 0 ? void 0 : _q.logger) !== null && _r !== void 0 ? _r : console;
        this.jsonStringifier = (_s = options === null || options === void 0 ? void 0 : options.reconnectOptions) === null || _s === void 0 ? void 0 : _s.jsonStringifier;
        this.websocketOptions = options === null || options === void 0 ? void 0 : options.websocketOptions;
        if (this.automaticOpen) {
            this.open(false);
        }
    }
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
    ReconnectingWebSocket.prototype.handleOpen = function (reconnectAttempt) {
        var _a, _b;
        this.readyState = ConnectionType.OPEN;
        this.reconnectAttempts = 0;
        this.logDebug("WebSocket connected: ".concat(this.url, " (reconnectAttempt: ").concat(reconnectAttempt, ")"));
        (_b = (_a = this.eventHandlers).open) === null || _b === void 0 ? void 0 : _b.call(_a, reconnectAttempt);
    };
    ReconnectingWebSocket.prototype.handleClose = function () {
        var _a, _b;
        var wasForced = this.forcedClose;
        this.logDebug("WebSocket closed: ".concat(this.url, ", forced: ").concat(wasForced));
        (_b = (_a = this.eventHandlers).close) === null || _b === void 0 ? void 0 : _b.call(_a, wasForced);
        if (!wasForced) {
            this.reconnect();
        }
    };
    ReconnectingWebSocket.prototype.handleMessage = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var parsedData, error_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        parsedData = JSON.parse(data.toString());
                        this.logDebug("Message received:", parsedData);
                        return [4 /*yield*/, ((_b = (_a = this.eventHandlers).message) === null || _b === void 0 ? void 0 : _b.call(_a, parsedData))];
                    case 1:
                        _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _c.sent();
                        this.logDebug("Error parsing message:", error_1, data);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ReconnectingWebSocket.prototype.handleError = function (error) {
        var _a, _b;
        this.logDebug("WebSocket error:", error);
        (_b = (_a = this.eventHandlers).error) === null || _b === void 0 ? void 0 : _b.call(_a, error);
    };
    ReconnectingWebSocket.prototype.reconnect = function () {
        var _this = this;
        this.readyState = ConnectionType.CONNECTING;
        var timeout = Math.min(this.reconnectInterval * Math.pow(this.reconnectDecay, this.reconnectAttempts), this.maxReconnectInterval);
        setTimeout(function () {
            if (_this.maxReconnectAttempts && _this.maxReconnectAttempts <= _this.reconnectAttempts) {
                throw new Error("Too many reconnect attempts. Giving up!");
            }
            _this.reconnectAttempts++;
            _this.open(true);
        }, timeout);
    };
    ReconnectingWebSocket.prototype.open = function (reconnectAttempt) {
        var _this = this;
        this.ws = new WebSocket(this.url, this.websocketOptions);
        this.logDebug("Attempting to connect:", this.url);
        this.ws.on("open", function () { return _this.handleOpen(reconnectAttempt); });
        this.ws.on("close", function () { return _this.handleClose(); });
        this.ws.on("message", function (data) { return _this.handleMessage(data); });
        this.ws.on("error", function (error) { return _this.handleError(error); });
    };
    ReconnectingWebSocket.prototype.send = function (data) {
        if (this.ws && this.readyState === ConnectionType.OPEN) {
            var payload = this.jsonStringifier ? this.jsonStringifier(data) : JSON.stringify(data);
            this.ws.send(payload);
        }
        else {
            throw new Error("WebSocket is not open. Unable to send message.");
        }
    };
    ReconnectingWebSocket.prototype.close = function () {
        var _a;
        this.forcedClose = true;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
    };
    ReconnectingWebSocket.prototype.onMessage = function (handler) {
        this.eventHandlers.message = handler;
    };
    ReconnectingWebSocket.prototype.onOpen = function (handler) {
        this.eventHandlers.open = handler;
    };
    ReconnectingWebSocket.prototype.onClose = function (handler) {
        this.eventHandlers.close = handler;
    };
    ReconnectingWebSocket.prototype.onError = function (handler) {
        this.eventHandlers.error = handler;
    };
    return ReconnectingWebSocket;
}());
export { ReconnectingWebSocket };
