import { Request } from './Request';
import { Socket } from './Socket';
import { Storage } from './Storage';
import { I18n } from '../Config/I18n';

interface AppParams {
    apiUrl: string;
    wsUrl: string;
    token: string;
    lang: string;
    [key: string]: string;
}

export class AppBridge {
    private static _params: AppParams | null = null;
    private static readonly TOKEN_STORAGE_KEY = 'token';

    static async init(): Promise<AppParams> {
        const params = this._parseUrlParams();
        const cachedToken = Storage.getString(this.TOKEN_STORAGE_KEY, '');
        params.token = cachedToken || params.token;
        this._params = params;
        I18n.init(params.lang);

        console.log('[AppBridge] 获取到的参数:', params);

        if (params.apiUrl) {
            Request.instance.init(params.apiUrl);
        } else {
            console.warn('[AppBridge] 未收到 apiUrl，Request 未初始化');
        }

        if (params.token) {
            Request.instance.token = params.token;
        }

        if (params.lang) {
            Request.instance.lang = params.lang;
        }

        if (params.wsUrl) {
            if (!Socket.instance.connected) {
                Socket.instance.connect({ url: params.wsUrl, token: params.token });
            }
        } else {
            console.warn('[AppBridge] 未收到 wsUrl，Socket 未初始化');
        }

        return params;
    }

    static get params(): AppParams {
        if (!this._params) {
            this._params = this._parseUrlParams();
        }
        return this._params;
    }

    static getParam(key: string, defaultValue: string = ''): string {
        return this.params[key] ?? defaultValue;
    }

    static postMessage(type: string, data?: string) {
        console.log(`?type=${type}&data=${data}`);
        
        if (typeof window === 'undefined') {
            return;
        }

        const { Flutter } = window as any;
        if (!Flutter) {
            return;
        }

        let url = `?type=${type}`;
        if (data) {
            url += `&data=${data}`;
        }
        console.log(url);
        Flutter.postMessage(url);
    }

    private static _parseUrlParams(): AppParams {
        const result: AppParams = { apiUrl: '', wsUrl: '', token: '', lang: '' };

        try {
            const search = typeof window !== 'undefined' ? window.location.search : '';
            const hash = typeof window !== 'undefined' ? window.location.hash : '';
            this.applyQueryString(result, search);

            const hashQueryIndex = hash.indexOf('?');
            if (hashQueryIndex >= 0) {
                this.applyQueryString(result, hash.substring(hashQueryIndex));
            }
        } catch (e) {
            console.error('[AppBridge] URL 参数解析失败:', e);
        }

        return result;
    }

    private static applyQueryString(target: AppParams, query: string) {
        if (!query || query.length <= 1) return;

        const pairs = query.replace(/^[?#]/, '').split('&');
        for (const pair of pairs) {
            const eqIndex = pair.indexOf('=');
            if (eqIndex < 0) continue;
            const key = decodeURIComponent(pair.substring(0, eqIndex));
            const value = decodeURIComponent(pair.substring(eqIndex + 1));
            target[key] = value;
        }
    }
}
