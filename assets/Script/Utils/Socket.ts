import { GameStateManager, GameDtsData } from '../Manager/GameStateManager';

type MessageHandler = (data: any) => void;

interface SocketOptions {
    url: string;
    token?: string;
    heartbeatInterval?: number;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

const DEFAULT_OPTIONS: Required<Omit<SocketOptions, 'url' | 'token'>> = {
    heartbeatInterval: 30000,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
};

export class Socket {
    private static _instance: Socket | null = null;

    private _ws: WebSocket | null = null;
    private _url: string = '';
    private _options: Required<Omit<SocketOptions, 'url' | 'token'>>;
    private _listeners: Map<string, Set<MessageHandler>> = new Map();
    private _heartbeatTimer: number | null = null;
    private _reconnectTimer: number | null = null;
    private _reconnectAttempts: number = 0;
    private _manualClose: boolean = false;
    private _connected: boolean = false;

    static get instance(): Socket {
        if (!Socket._instance) {
            Socket._instance = new Socket();
        }
        return Socket._instance;
    }

    private constructor() {
        this._options = { ...DEFAULT_OPTIONS };
    }

    get connected(): boolean {
        return this._connected;
    }

    setCurrentGameId(gameId: number | string | null | undefined): void {
        GameStateManager.instance.setInitialGameId(gameId);
    }

    connect(options: SocketOptions): void {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            console.warn('[Socket] 已存在活跃连接，请先断开');
            return;
        }

        this._url = this._buildUrl(options.url, options.token);
        this._options = { ...DEFAULT_OPTIONS, ...options };
        this._manualClose = false;
        this._reconnectAttempts = 0;
        this._doConnect();
    }

    private _doConnect(): void {
        console.log(`[Socket] 正在连接 ${this._url}...`);

        this._ws = new WebSocket(this._url);

        this._ws.onopen = () => {
            console.log('[Socket] 连接成功');
            this._connected = true;
            this._reconnectAttempts = 0;
            this._startHeartbeat();
            this._emit('open', null);
        };

        this._ws.onmessage = (event: MessageEvent) => {
            let data: any;
            try {
                data = JSON.parse(event.data);
            } catch {
                data = event.data;
            }

            if (data?.type === 'pong') return;

            if (data && typeof data === 'object' && data.dts_data) {
                this._handleDtsData(data.dts_data as GameDtsData, data);
            }

            if (data?.type) {
                this._emit(data.type, data);
            }
            this._emit('message', data);
        };

        this._ws.onerror = (event: Event) => {
            console.error('[Socket] 连接错误', event);
            this._emit('error', event);
        };

        this._ws.onclose = (event: CloseEvent) => {
            console.log(`[Socket] 连接关闭 code=${event.code} reason=${event.reason}`);
            this._connected = false;
            this._stopHeartbeat();
            this._emit('close', event);

            if (!this._manualClose) {
                this._tryReconnect();
            }
        };
    }

    send(type: string, data?: any): void {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
            console.warn('[Socket] 未连接，消息发送失败:', type);
            return;
        }
        const message = JSON.stringify({ type, ...data });
        this._ws.send(message);
    }

    sendRaw(data: string | ArrayBuffer): void {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
            console.warn('[Socket] 未连接，消息发送失败');
            return;
        }
        this._ws.send(data);
    }

    on(event: string, handler: MessageHandler): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event)!.add(handler);
    }

    off(event: string, handler?: MessageHandler): void {
        if (!handler) {
            this._listeners.delete(event);
            return;
        }
        this._listeners.get(event)?.delete(handler);
    }

    once(event: string, handler: MessageHandler): void {
        const wrapper: MessageHandler = (data) => {
            handler(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    close(): void {
        this._manualClose = true;
        this._stopHeartbeat();
        this._stopReconnect();
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
        this._connected = false;
    }

    destroy(): void {
        this.close();
        this._listeners.clear();
        Socket._instance = null;
    }

    private _emit(event: string, data: any): void {
        this._listeners.get(event)?.forEach((handler) => {
            try {
                handler(data);
            } catch (e) {
                console.error(`[Socket] 事件 "${event}" 处理出错:`, e);
            }
        });
    }

    private _startHeartbeat(): void {
        this._stopHeartbeat();
        this._heartbeatTimer = setInterval(() => {
            if (this._ws?.readyState === WebSocket.OPEN) {
                this._ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, this._options.heartbeatInterval) as unknown as number;
    }

    private _stopHeartbeat(): void {
        if (this._heartbeatTimer !== null) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }

    private _tryReconnect(): void {
        if (this._reconnectAttempts >= this._options.maxReconnectAttempts) {
            console.warn('[Socket] 达到最大重连次数，停止重连');
            this._emit('reconnect_failed', null);
            return;
        }

        this._reconnectAttempts++;
        console.log(`[Socket] ${this._options.reconnectInterval}ms 后尝试第 ${this._reconnectAttempts} 次重连...`);

        this._reconnectTimer = setTimeout(() => {
            this._doConnect();
        }, this._options.reconnectInterval) as unknown as number;

        this._emit('reconnecting', { attempt: this._reconnectAttempts });
    }

    private _stopReconnect(): void {
        if (this._reconnectTimer !== null) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
    }

    private _handleDtsData(dtsData: GameDtsData, rawData: any): void {
        const syncResult = GameStateManager.instance.syncFromDtsData(dtsData);
        if (syncResult.gameChanged && syncResult.currentGameId !== null) {
            this._emit('game_changed', {
                previousGameId: syncResult.previousGameId,
                currentGameId: syncResult.currentGameId,
                dtsData,
                rawData,
            });
        }

        this._emit('dts_data', dtsData);
    }

    private _buildUrl(url: string, token?: string): string {
        if (!token) return url;
        const separator = url.indexOf('?') >= 0 ? '&' : '?';
        return `${url}${separator}token=${encodeURIComponent(token)}`;
    }
}
