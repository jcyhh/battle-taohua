import { Storage } from '../Utils/Storage';

export type LangCode = 'zh-Hans' | 'zh-Hant' | 'en';

export type I18nParams = Record<string, string | number | null | undefined>;
export type I18nDict = Record<string, string>;

const DEFAULT_LANG: LangCode = 'zh-Hans';
const LANG_STORAGE_KEY = 'lang';

const DICTS: Record<LangCode, I18nDict> = {
    'zh-Hans': {},
    'zh-Hant': {
        '自己': '自己',
        '返回': '返回',
        '龙门客栈': '龙门客栈',
        '背景音乐': '背景音樂',
        '音效': '音效',
        '灵泉水明细': '靈泉水明細',
        '排行榜': '排行榜',
        '记录': '記錄',
        '投入': '投入',
        '历史记录': '歷史記錄',
        '近100期被杀统计': '近100期被殺統計',
        '近10期杀手房间记录': '近10期殺手房間記錄',
        '我的参与记录': '我的參與記錄',
        '总投入': '總投入',
        '总获得': '總獲得',
        '本周排行榜': '本週排行榜',
        '上周排行榜': '上週排行榜',
        '排行': '排行',
        '我的排行': '我的排行',
        '我选房间': '我選房間',
        '被杀房间': '被殺房間',
        '投入灵石': '投入靈石',
        '获得灵石': '獲得靈石',
        '开': '開',
        '关': '關',
        '东字号': '東字號',
        '天字号': '天字號',
        '西字号': '西字號',
        '中字号': '中字號',
        '人字号': '人字號',
        '北字号': '北字號',
        '南字号': '南字號',
        '地字号': '地字號',
        '东字號': '東字號',
        '天字號': '天字號',
        '西字號': '西字號',
        '中字號': '中字號',
        '人字號': '人字號',
        '北字號': '北字號',
        '南字號': '南字號',
        '地字號': '地字號',
        '第{gameId}期（{joinPeople}/{maxPeople}）': '第{gameId}期（{joinPeople}/{maxPeople}）',
        '下局即将开始': '下局即將開始',
        '即将开局': '即將開局',
        '上期杀手去了{roomName}': '上期殺手去了{roomName}',
        '{displayTimer}秒后杀手出现': '{displayTimer}秒後殺手出現',
        '杀手出现': '殺手出現',
        '<b>杀手攻击了<color=#FFCC00>{roomName}</color></b>': '<b>殺手攻擊了<color=#FFCC00>{roomName}</color></b>',
        '本期投入{userAmount}灵石，获得{userBonus}灵石': '本期投入{userAmount}靈石，獲得{userBonus}靈石',
        '请先选择房间': '請先選擇房間',
        '请稍等': '請稍等',
        '未获取到当前期数': '未獲取到當前期數',
        '投入成功': '投入成功',
        '躲避成功': '躲避成功',
        '躲避失败': '躲避失敗',
        '房间{roomId}': '房間{roomId}',
        '登录已失效': '登入已失效',
        '请求参数错误': '請求參數錯誤',
        '请求失败 ({status})': '請求失敗 ({status})',
        '请求超时 ({timeout}ms)': '請求超時 ({timeout}ms)',
    },
    en: {
        '自己': 'Me',
        '返回': 'Back',
        '龙门客栈': 'Dragon Inn',
        '背景音乐': 'BGM',
        '音效': 'SFX',
        '灵泉水明细': 'Spring Water Details',
        '排行榜': 'Ranking',
        '记录': 'Records',
        '投入': 'Bet',
        '历史记录': 'History',
        '近100期被杀统计': 'Kills in Last 100 Rounds',
        '近10期杀手房间记录': 'Killer Rooms in Last 10 Rounds',
        '我的参与记录': 'My Records',
        '总投入': 'Total Bet',
        '总获得': 'Total Won',
        '本周排行榜': 'This Week',
        '上周排行榜': 'Last Week',
        '排行': 'Rank',
        '我的排行': 'My Rank',
        '我选房间': 'My Room',
        '被杀房间': 'Killed Room',
        '投入灵石': 'Bet Stones',
        '获得灵石': 'Won Stones',
        '开': 'On',
        '关': 'Off',
        '东字号': 'East',
        '天字号': 'Heaven',
        '西字号': 'West',
        '中字号': 'Center',
        '人字号': 'Human',
        '北字号': 'North',
        '南字号': 'South',
        '地字号': 'Earth',
        '东字號': 'East',
        '天字號': 'Heaven',
        '西字號': 'West',
        '中字號': 'Center',
        '人字號': 'Human',
        '北字號': 'North',
        '南字號': 'South',
        '地字號': 'Earth',
        '第{gameId}期（{joinPeople}/{maxPeople}）': 'Round {gameId} ({joinPeople}/{maxPeople})',
        '下局即将开始': 'Next round starts soon',
        '即将开局': 'Starting soon',
        '上期杀手去了{roomName}': 'Last killer went to {roomName}',
        '{displayTimer}秒后杀手出现': 'Killer appears in {displayTimer}s',
        '杀手出现': 'Killer Appears',
        '<b>杀手攻击了<color=#FFCC00>{roomName}</color></b>': '<b>Killer attacked <color=#FFCC00>{roomName}</color></b>',
        '本期投入{userAmount}灵石，获得{userBonus}灵石': 'Bet {userAmount} stones, won {userBonus} stones this round',
        '请先选择房间': 'Please select a room first',
        '请稍等': 'Please wait',
        '未获取到当前期数': 'Current round unavailable',
        '投入成功': 'Bet placed',
        '躲避成功': 'Escaped',
        '躲避失败': 'Failed',
        '房间{roomId}': 'Room {roomId}',
        '登录已失效': 'Login expired',
        '请求参数错误': 'Invalid request parameters',
        '请求失败 ({status})': 'Request failed ({status})',
        '请求超时 ({timeout}ms)': 'Request timed out ({timeout}ms)',
    },
};

export function normalizeLang(value?: string): LangCode {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return DEFAULT_LANG;

    if (
        normalized === 'zh-hant'
        || normalized === 'zh-hk'
        || normalized === 'zh-tw'
        || normalized === 'zh-mo'
        || normalized.includes('hant')
        || normalized.includes('traditional')
    ) {
        return 'zh-Hant';
    }

    if (normalized === 'en' || normalized.startsWith('en-')) {
        return 'en';
    }

    return 'zh-Hans';
}

export class I18n {
    private static _lang: LangCode = DEFAULT_LANG;
    private static readonly _listeners = new Set<(lang: LangCode) => void>();

    static init(lang?: string) {
        const detectedLang = lang
            || Storage.getString(LANG_STORAGE_KEY, '')
            || (typeof navigator !== 'undefined' ? navigator.language : '');
        this.setLang(detectedLang);
    }

    static get lang(): LangCode {
        return this._lang;
    }

    static setLang(lang?: string) {
        const nextLang = normalizeLang(lang);
        if (nextLang === this._lang) return;
        this._lang = nextLang;
        Storage.setString(LANG_STORAGE_KEY, this._lang);
        this._listeners.forEach((listener) => listener(this._lang));
    }

    static onChanged(listener: (lang: LangCode) => void) {
        this._listeners.add(listener);
    }

    static offChanged(listener: (lang: LangCode) => void) {
        this._listeners.delete(listener);
    }

    static registerDict(lang: LangCode, dict: I18nDict) {
        Object.assign(DICTS[lang], dict);
    }

    static t(key: string, params?: I18nParams) {
        const dict = DICTS[this._lang] ?? {};
        const fallbackDict = DICTS[DEFAULT_LANG] ?? {};
        const template = dict[key] ?? fallbackDict[key] ?? key;
        if (!params) {
            return template;
        }

        return template.replace(/\{(\w+)\}/g, (_match, token: string) => {
            const value = params[token];
            return value != null ? String(value) : `{${token}}`;
        });
    }
}

export function t(key: string, params?: I18nParams) {
    return I18n.t(key, params);
}
