import { sys } from 'cc';

export class Storage {
    static setString(key: string, value: string) {
        sys.localStorage.setItem(key, value);
    }

    static getString(key: string, defaultValue = ''): string {
        const val = sys.localStorage.getItem(key);
        if (val == null || val === '') return defaultValue;
        return val;
    }

    static setNumber(key: string, value: number) {
        sys.localStorage.setItem(key, String(value));
    }

    static getNumber(key: string, defaultValue = 0): number {
        const val = sys.localStorage.getItem(key);
        if (val == null || val === '') return defaultValue;
        const num = Number(val);
        return isNaN(num) ? defaultValue : num;
    }

    static setBool(key: string, value: boolean) {
        sys.localStorage.setItem(key, value ? '1' : '0');
    }

    static getBool(key: string, defaultValue = false): boolean {
        const val = sys.localStorage.getItem(key);
        if (val == null || val === '') return defaultValue;
        return val === '1';
    }

    static setObject<T>(key: string, value: T) {
        sys.localStorage.setItem(key, JSON.stringify(value));
    }

    static getObject<T>(key: string, defaultValue: T | null = null): T | null {
        const val = sys.localStorage.getItem(key);
        if (val == null || val === '') return defaultValue;
        try {
            return JSON.parse(val) as T;
        } catch {
            return defaultValue;
        }
    }

    static remove(key: string) {
        sys.localStorage.removeItem(key);
    }

    static clear() {
        sys.localStorage.clear();
    }
}
