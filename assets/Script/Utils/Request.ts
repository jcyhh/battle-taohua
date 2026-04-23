import { Toast } from '../Common/Toast';
import { t } from '../Config/I18n';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class HttpError extends Error {
    status: number;
    data: any;

    constructor(status: number, message: string, data?: any) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.data = data;
    }
}

interface RequestOptions {
    headers?: Record<string, string>;
    timeout?: number;
    /** 为 true 时不自动附带 token */
    noAuth?: boolean;
}

type Interceptor<T> = (value: T) => T | Promise<T>;

export class Request {
    private static _instance: Request | null = null;

    private _baseURL: string = '';
    private _timeout: number = 15000;
    private _token: string = '';
    private _lang: string = '';
    private _defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    private _requestInterceptors: Interceptor<RequestInit>[] = [];
    private _responseInterceptors: Interceptor<any>[] = [];

    static get instance(): Request {
        if (!Request._instance) {
            Request._instance = new Request();
        }
        return Request._instance;
    }

    private constructor() {}

    /** 初始化基础配置 */
    init(baseURL: string, timeout?: number): void {
        this._baseURL = baseURL.replace(/\/+$/, '');
        if (timeout !== undefined) this._timeout = timeout;
    }

    set token(value: string) {
        this._token = value;
    }

    get token(): string {
        return this._token;
    }

    set lang(value: string) {
        this._lang = value;
    }

    get lang(): string {
        return this._lang;
    }

    setHeader(key: string, value: string): void {
        this._defaultHeaders[key] = value;
    }

    addRequestInterceptor(interceptor: Interceptor<RequestInit>): void {
        this._requestInterceptors.push(interceptor);
    }

    addResponseInterceptor<T = any>(interceptor: Interceptor<T>): void {
        this._responseInterceptors.push(interceptor);
    }

    get<T = any>(url: string, params?: Record<string, any>, options?: RequestOptions): Promise<T> {
        const query = params ? this._buildQuery(params) : '';
        return this._request<T>('GET', `${url}${query}`, undefined, options);
    }

    post<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
        return this._request<T>('POST', url, body, options);
    }

    put<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
        return this._request<T>('PUT', url, body, options);
    }

    delete<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
        return this._request<T>('DELETE', url, body, options);
    }

    private async _request<T>(method: Method, url: string, body?: any, options?: RequestOptions): Promise<T> {
        const fullURL = url.startsWith('http') ? url : `${this._baseURL}${url}`;
        const timeout = options?.timeout ?? this._timeout;

        const headers: Record<string, string> = { ...this._defaultHeaders, ...options?.headers };
        if (this._token && !options?.noAuth) {
            headers['Authorization'] = `Bearer ${this._token}`;
        }
        if (this._lang) {
            headers.lang = this._lang;
        }

        let init: RequestInit = {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        };

        for (const interceptor of this._requestInterceptors) {
            init = await interceptor(init);
        }

        const controller = new AbortController();
        init.signal = controller.signal;
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(fullURL, init);
            clearTimeout(timer);
            const responseData = await this._readResponseData(response);

            switch (response.status) {
            case 200:
            case 201:
            case 202:
            case 204: {
                let result: T = responseData as T;

                for (const interceptor of this._responseInterceptors) {
                    result = await interceptor(result) as T;
                }

                return result;
            }
            case 401: {
                const errorMessage = this._pickErrorMessage(responseData, t('登录已失效'));
                // TODO: 登录失效处理
                console.warn(`[Request] 登录已失效: ${method} ${fullURL}`);
                Toast.showFail(errorMessage);
                return Promise.reject(new HttpError(response.status, errorMessage, responseData));
            }
            case 400: {
                const errorMessage = this._pickErrorMessage(responseData, t('请求参数错误'));
                console.error(
                    `[Request] 请求失败: ${method} ${fullURL} status=${response.status}`,
                    responseData,
                );
                Toast.showFail(errorMessage);
                return Promise.reject(new HttpError(response.status, errorMessage, responseData));
            }
            default: {
                const errorMessage = this._pickErrorMessage(
                    responseData,
                    t('请求失败 ({status})', { status: response.status }),
                );
                console.error(
                    `[Request] 请求失败: ${method} ${fullURL} status=${response.status}`,
                    responseData,
                );
                Toast.showFail(errorMessage);
                return Promise.reject(new HttpError(response.status, errorMessage, responseData));
            }
            }
        } catch (err: any) {
            clearTimeout(timer);

            if (err.name === 'AbortError') {
                console.error(`[Request] 请求超时: ${method} ${fullURL}`);
                return Promise.reject(new Error(t('请求超时 ({timeout}ms)', { timeout })));
            }

            console.error(`[Request] 请求失败: ${method} ${fullURL}`, err);
            return Promise.reject(err);
        }
    }

    private async _readResponseData(response: Response): Promise<any> {
        try {
            const text = await response.text();
            if (!text) return {};

            try {
                return JSON.parse(text);
            } catch {
                return { message: text, raw: text };
            }
        } catch {
            return {};
        }
    }

    private _pickErrorMessage(data: any, defaultMessage: string): string {
        if (!data || typeof data !== 'object') return defaultMessage;
        return data.msg || data.message || defaultMessage;
    }

    private _buildQuery(params: Record<string, any>): string {
        const parts: string[] = [];
        for (const key in params) {
            if (params[key] === undefined || params[key] === null) continue;
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
        }
        return parts.length ? `?${parts.join('&')}` : '';
    }
}
