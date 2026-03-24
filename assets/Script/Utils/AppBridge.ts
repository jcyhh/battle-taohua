import { PREVIEW } from 'cc/env';
import { Request } from './Request';
import { Socket } from './Socket';
import { Storage } from './Storage';
import { DevConfig } from '../Config/DevConfig';

interface AppParams {
    apiUrl: string;
    wsUrl: string;
    token: string;
    [key: string]: string;
}

export class AppBridge {
    private static _params: AppParams | null = null;
    private static readonly TOKEN_STORAGE_KEY = 'token';

    static init(): AppParams {
        const params = PREVIEW ? this._devParams() : this._parseUrlParams();
        const cachedToken = Storage.getString(this.TOKEN_STORAGE_KEY, '');
        params.token = cachedToken || params.token;
        this._params = params;

        console.log(`[AppBridge] 环境: ${PREVIEW ? 'DEV' : 'PROD'}`);
        console.log('[AppBridge] 参数:', JSON.stringify(params));

        if (params.apiUrl) {
            Request.instance.init(params.apiUrl);
            console.log(`[AppBridge] Request 已初始化: ${params.apiUrl}`);
        } else {
            console.warn('[AppBridge] 未收到 apiUrl，Request 未初始化');
        }

        if (params.token) {
            Request.instance.token = params.token;
            console.log('[AppBridge] Token 已设置');
        }

        if (params.wsUrl) {
            Socket.instance.connect({ url: params.wsUrl, token: params.token });
            console.log(`[AppBridge] Socket 正在连接: ${params.wsUrl}`);
        } else {
            console.warn('[AppBridge] 未收到 wsUrl，Socket 未连接');
        }

        return params;
    }

    static get params(): AppParams {
        if (!this._params) {
            this._params = PREVIEW ? this._devParams() : this._parseUrlParams();
        }
        return this._params;
    }

    static getParam(key: string, defaultValue: string = ''): string {
        return this.params[key] ?? defaultValue;
    }

    private static _devParams(): AppParams {
        return { ...DevConfig } as AppParams;
    }

    private static _parseUrlParams(): AppParams {
        const result: AppParams = { apiUrl: '', wsUrl: '', token: '' };

        try {
            const search = window.location.search;
            if (!search || search.length <= 1) return result;

            const pairs = search.substring(1).split('&');
            for (const pair of pairs) {
                const eqIndex = pair.indexOf('=');
                if (eqIndex < 0) continue;
                const key = decodeURIComponent(pair.substring(0, eqIndex));
                const value = decodeURIComponent(pair.substring(eqIndex + 1));
                result[key] = value;
            }
        } catch (e) {
            console.error('[AppBridge] URL 参数解析失败:', e);
        }

        return result;
    }
}
