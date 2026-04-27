import { Storage } from '../Utils/Storage';

export type LangCode = 'zh-Hans' | 'zh-Hant' | 'en' | 'vi' | 'ko' | 'ja';

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
    vi: {
        '自己': 'Bản thân',
        '返回': 'Quay lại',
        '龙门客栈': 'Long Môn Khách Sạn',
        '背景音乐': 'Nhạc nền',
        '音效': 'Hiệu ứng âm thanh',
        '灵泉水明细': 'Chi tiết Linh Tuyền Thủy',
        '排行榜': 'Bảng xếp hạng',
        '记录': 'Lịch sử',
        '投入': 'Đặt cược',
        '历史记录': 'Lịch sử',
        '近100期被杀统计': 'Thống kê bị giết 100 ván gần nhất',
        '近10期杀手房间记录': 'Lịch sử phòng sát thủ 10 ván gần nhất',
        '我的参与记录': 'Lịch sử tham gia của tôi',
        '总投入': 'Tổng cược',
        '总获得': 'Tổng nhận',
        '本周排行榜': 'Bảng xếp hạng tuần này',
        '上周排行榜': 'Bảng xếp hạng tuần trước',
        '排行': 'Xếp hạng',
        '我的排行': 'Xếp hạng của tôi',
        '我选房间': 'Phòng tôi chọn',
        '被杀房间': 'Phòng bị giết',
        '投入灵石': 'Linh thạch cược',
        '获得灵石': 'Linh thạch nhận',
        '开': 'Bật',
        '关': 'Tắt',
        '东字号': 'Đông',
        '天字号': 'Thiên',
        '西字号': 'Tây',
        '中字号': 'Trung',
        '人字号': 'Nhân',
        '北字号': 'Bắc',
        '南字号': 'Nam',
        '地字号': 'Địa',
        '东字號': 'Đông',
        '天字號': 'Thiên',
        '西字號': 'Tây',
        '中字號': 'Trung',
        '人字號': 'Nhân',
        '北字號': 'Bắc',
        '南字號': 'Nam',
        '地字號': 'Địa',
        '第{gameId}期（{joinPeople}/{maxPeople}）': 'Ván {gameId} ({joinPeople}/{maxPeople})',
        '下局即将开始': 'Ván tiếp theo sắp bắt đầu',
        '即将开局': 'Sắp bắt đầu',
        '上期杀手去了{roomName}': 'Sát thủ ván trước đã vào {roomName}',
        '{displayTimer}秒后杀手出现': 'Sát thủ xuất hiện sau {displayTimer} giây',
        '杀手出现': 'Sát thủ xuất hiện',
        '<b>杀手攻击了<color=#FFCC00>{roomName}</color></b>': '<b>Sát thủ đã tấn công <color=#FFCC00>{roomName}</color></b>',
        '本期投入{userAmount}灵石，获得{userBonus}灵石': 'Ván này cược {userAmount} linh thạch, nhận {userBonus} linh thạch',
        '请先选择房间': 'Vui lòng chọn phòng trước',
        '请稍等': 'Vui lòng chờ',
        '未获取到当前期数': 'Chưa lấy được kỳ hiện tại',
        '投入成功': 'Đặt cược thành công',
        '躲避成功': 'Né tránh thành công',
        '躲避失败': 'Né tránh thất bại',
        '房间{roomId}': 'Phòng {roomId}',
        '登录已失效': 'Đăng nhập đã hết hiệu lực',
        '请求参数错误': 'Tham số yêu cầu không hợp lệ',
        '请求失败 ({status})': 'Yêu cầu thất bại ({status})',
        '请求超时 ({timeout}ms)': 'Yêu cầu quá thời gian ({timeout}ms)',
    },
    ko: {
        '自己': '나',
        '返回': '뒤로',
        '龙门客栈': '용문객잔',
        '背景音乐': '배경 음악',
        '音效': '효과음',
        '灵泉水明细': '영천수 상세',
        '排行榜': '랭킹',
        '记录': '기록',
        '投入': '베팅',
        '历史记录': '기록 내역',
        '近100期被杀统计': '최근 100회 처치 통계',
        '近10期杀手房间记录': '최근 10회 킬러 방 기록',
        '我的参与记录': '내 참여 기록',
        '总投入': '총 베팅',
        '总获得': '총 획득',
        '本周排行榜': '이번 주 랭킹',
        '上周排行榜': '지난주 랭킹',
        '排行': '순위',
        '我的排行': '내 순위',
        '我选房间': '내가 선택한 방',
        '被杀房间': '처치된 방',
        '投入灵石': '투입 영석',
        '获得灵石': '획득 영석',
        '开': '켜기',
        '关': '끄기',
        '东字号': '동',
        '天字号': '천',
        '西字号': '서',
        '中字号': '중',
        '人字号': '인',
        '北字号': '북',
        '南字号': '남',
        '地字号': '지',
        '东字號': '동',
        '天字號': '천',
        '西字號': '서',
        '中字號': '중',
        '人字號': '인',
        '北字號': '북',
        '南字號': '남',
        '地字號': '지',
        '第{gameId}期（{joinPeople}/{maxPeople}）': '{gameId}회 ({joinPeople}/{maxPeople})',
        '下局即将开始': '다음 판이 곧 시작됩니다',
        '即将开局': '곧 시작됩니다',
        '上期杀手去了{roomName}': '지난 판 킬러는 {roomName}에 갔습니다',
        '{displayTimer}秒后杀手出现': '{displayTimer}초 후 킬러 등장',
        '杀手出现': '킬러 등장',
        '<b>杀手攻击了<color=#FFCC00>{roomName}</color></b>': '<b>킬러가 <color=#FFCC00>{roomName}</color>을(를) 공격했습니다</b>',
        '本期投入{userAmount}灵石，获得{userBonus}灵石': '이번 판에 영석 {userAmount}을(를) 베팅하고 {userBonus}을(를) 획득했습니다',
        '请先选择房间': '먼저 방을 선택해 주세요',
        '请稍等': '잠시만 기다려 주세요',
        '未获取到当前期数': '현재 회차를 가져오지 못했습니다',
        '投入成功': '베팅 성공',
        '躲避成功': '회피 성공',
        '躲避失败': '회피 실패',
        '房间{roomId}': '{roomId}번 방',
        '登录已失效': '로그인이 만료되었습니다',
        '请求参数错误': '요청 파라미터 오류',
        '请求失败 ({status})': '요청 실패 ({status})',
        '请求超时 ({timeout}ms)': '요청 시간 초과 ({timeout}ms)',
    },
    ja: {
        '自己': '自分',
        '返回': '戻る',
        '龙门客栈': '龍門客桟',
        '背景音乐': 'BGM',
        '音效': '効果音',
        '灵泉水明细': '霊泉水明細',
        '排行榜': 'ランキング',
        '记录': '記録',
        '投入': '投入',
        '历史记录': '履歴',
        '近100期被杀统计': '直近100回の撃破統計',
        '近10期杀手房间记录': '直近10回のキラー部屋記録',
        '我的参与记录': '参加履歴',
        '总投入': '総投入',
        '总获得': '総獲得',
        '本周排行榜': '今週ランキング',
        '上周排行榜': '先週ランキング',
        '排行': '順位',
        '我的排行': '自分の順位',
        '我选房间': '選択した部屋',
        '被杀房间': '撃破された部屋',
        '投入灵石': '投入霊石',
        '获得灵石': '獲得霊石',
        '开': 'オン',
        '关': 'オフ',
        '东字号': '東',
        '天字号': '天',
        '西字号': '西',
        '中字号': '中',
        '人字号': '人',
        '北字号': '北',
        '南字号': '南',
        '地字号': '地',
        '东字號': '東',
        '天字號': '天',
        '西字號': '西',
        '中字號': '中',
        '人字號': '人',
        '北字號': '北',
        '南字號': '南',
        '地字號': '地',
        '第{gameId}期（{joinPeople}/{maxPeople}）': '第{gameId}回（{joinPeople}/{maxPeople}）',
        '下局即将开始': '次の回がまもなく始まります',
        '即将开局': 'まもなく開始',
        '上期杀手去了{roomName}': '前回のキラーは{roomName}へ行きました',
        '{displayTimer}秒后杀手出现': '{displayTimer}秒後にキラー出現',
        '杀手出现': 'キラー出現',
        '<b>杀手攻击了<color=#FFCC00>{roomName}</color></b>': '<b>キラーが<color=#FFCC00>{roomName}</color>を攻撃しました</b>',
        '本期投入{userAmount}灵石，获得{userBonus}灵石': '今回{userAmount}霊石を投入し、{userBonus}霊石を獲得しました',
        '请先选择房间': '先に部屋を選択してください',
        '请稍等': 'しばらくお待ちください',
        '未获取到当前期数': '現在の回を取得できませんでした',
        '投入成功': '投入成功',
        '躲避成功': '回避成功',
        '躲避失败': '回避失敗',
        '房间{roomId}': '部屋{roomId}',
        '登录已失效': 'ログインの有効期限が切れました',
        '请求参数错误': 'リクエストパラメータエラー',
        '请求失败 ({status})': 'リクエスト失敗 ({status})',
        '请求超时 ({timeout}ms)': 'リクエストタイムアウト ({timeout}ms)',
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

    if (normalized === 'vi' || normalized.startsWith('vi-')) {
        return 'vi';
    }

    if (normalized === 'ko' || normalized.startsWith('ko-')) {
        return 'ko';
    }

    if (normalized === 'ja' || normalized.startsWith('ja-')) {
        return 'ja';
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
