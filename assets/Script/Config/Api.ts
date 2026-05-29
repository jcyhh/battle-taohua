import { Request } from '../Utils/Request';

const http = Request.instance;

// ==================== 类型定义 ====================

interface BattleInitData {
    balance: string;
    game_id: number;
    pre_killer_room: number;
    user_id: number;
}

interface UserMyData {
    balance_spring_water?: string | number;
    balance_xz?: string | number;
}

export interface MinerMyItem {
    miner_id: number;
    name?: string;
    price?: number | string;
    cycle?: number | string;
    yield?: number | string;
    amount: number | string;
}

export interface MinerMyResponse {
    list: MinerMyItem[];
}

export interface MinerShopItem {
    miner_id: number;
    name?: string;
    price: number | string;
    cycle: number | string;
    yield?: number | string;
    payback_yield?: number | string;
    stock?: number | string;
}

export interface MinerShopResponse {
    list: MinerShopItem[];
}

export interface MineWorkerItem {
    id: number;
    miner_id: number;
    mine_level: number;
    miner_name?: string;
    status: number | string;
    cycle?: number | string;
    work_day?: number | string;
    count_yield?: number | string;
    ripe_yield?: number | string;
    extra_yield?: number | string;
    total_yield?: number | string;
    next_work_time?: string;
    created_at?: string;
}

export interface MineWorkItem {
    mine_level: number;
    mine_name?: string;
    active_count?: number | string;
    working_count: number | string;
    wait_water_count?: number | string;
    workers?: MineWorkerItem[];
}

export interface MineWorksResponse {
    list: MineWorkItem[];
}

export interface BalanceLogItem {
    amount?: string | number;
    change_amount?: string | number;
    value?: string | number;
    num?: string | number;
    is_inc?: number | string;
    remark?: string;
    note?: string;
    title?: string;
    content?: string;
    desc?: string;
    created_at?: string;
    create_time?: string;
    time?: string;
    updated_at?: string;
    [key: string]: any;
}

export interface BalanceLogResponse {
    total?: number | string;
    list?: BalanceLogItem[];
    logs?: BalanceLogItem[];
    items?: BalanceLogItem[];
    data?: BalanceLogItem[] | {
        total?: number | string;
        list?: BalanceLogItem[];
        logs?: BalanceLogItem[];
        items?: BalanceLogItem[];
        asset_logs?: BalanceLogItem[];
    };
    asset_logs?: BalanceLogItem[];
    [key: string]: any;
}

interface KillRecord {
    room_id: number;
    count: number;
}

interface RoomRecord {
    game_id: number;
    killer_room: number;
}

interface JoinRecord {
    game_id: number;
    room_id: number;
    killer_room: number;
    amount: string;
    bonus: string;
    state: number;
    created_at: string;
}

interface BattleRecordData {
    kill_record: KillRecord[];
    room_record: RoomRecord[];
    join_record: {
        bonus: string;
        payout: string;
        last_record: JoinRecord[];
    };
}

interface RankItem {
    rank: number;
    user_id: number;
    mphone: string;
    total_amount: number;
}

interface BattleRankData {
    list: RankItem[];
    my_rank: RankItem;
}

// ==================== 接口 ====================

export class Api {
    // ---- 大逃杀模块 /api/battle ----

    /** GET /api/user/my 用户资产信息 */
    static userMy(): Promise<UserMyData> {
        return http.get<UserMyData>('/api/users/my');
    }

    /** GET /api/miner/my 用户持有矿工列表 */
    static minerMy(): Promise<MinerMyResponse> {
        return http.get<MinerMyResponse>('/api/miner/my');
    }

    /** GET /api/miner 矿工商店列表 */
    static minerList(): Promise<MinerShopResponse> {
        return http.get<MinerShopResponse>('/api/miner');
    }

    /** POST /api/miner/buy 购买矿工 */
    static minerBuy(data: { miner_id: number; buy_num: number }): Promise<Record<string, never>> {
        return http.post<Record<string, never>>('/api/miner/buy', data);
    }

    /** GET /api/mine/works 矿场列表 */
    static mineWorks(): Promise<MineWorksResponse> {
        return http.get<MineWorksResponse>('/api/mine/works');
    }

    /** POST /api/mine/put 投入矿场 */
    static minePut(data: { mine_level: number }): Promise<Record<string, never>> {
        return http.post<Record<string, never>>('/api/mine/put', data);
    }

    /** POST /api/mine/drink_water 矿工喝水 */
    static mineDrinkWater(data: { work_id: number }): Promise<Record<string, never>> {
        return http.post<Record<string, never>>('/api/mine/drink_water', data);
    }

    /** GET /api/users/my/balance_logs 用户资产明细 */
    static userBalanceLogs(params: {
        ccy?: 'balance_spring_water' | 'balance_xz';
        page_no?: number;
        page_size?: number;
    } = {}): Promise<BalanceLogResponse> {
        return http.get<BalanceLogResponse>('/api/users/my/balance_logs', {
            ccy: params.ccy ?? 'balance_spring_water',
            page_no: params.page_no ?? 1,
            page_size: params.page_size ?? 20,
        });
    }

    /** GET /api/battle/initGame 初始化游戏 */
    static battleInit(): Promise<BattleInitData> {
        return http.get<BattleInitData>('/api/battle/initGame');
    }

    /** POST /api/battle/quitGame 退出房间 */
    static battleQuit(game_id: number): Promise<Record<string, never>> {
        return http.post<Record<string, never>>('/api/battle/quitGame', { game_id });
    }

    /** POST /api/battle/join 下注 */
    static battleJoin(data: { game_id: number; room_id: number; amount: number }): Promise<Record<string, never>> {
        return http.post<Record<string, never>>('/api/battle/join', data);
    }

    /** GET /api/battle/record 游戏记录 */
    static battleRecord(): Promise<BattleRecordData> {
        return http.get<BattleRecordData>('/api/battle/record');
    }

    /** GET /api/battle/record2 更多参与记录 */
    static battleRecord2(params: { page_no?: number; page_size?: number } = {}): Promise<JoinRecord[]> {
        return http.get<JoinRecord[]>('/api/battle/record2', {
            page_no: params.page_no ?? 1,
            page_size: params.page_size ?? 10,
        });
    }

    /** GET /api/battle/bet_amount 可用下注金额列表 */
    static battleBetAmount(): Promise<number[]> {
        return http.get<number[]>('/api/battle/bet_amount');
    }

    /** GET /api/battle/rank 灵石参与排行榜 (type: 1=本周 2=上周) */
    static battleRank(type: number = 1): Promise<BattleRankData> {
        return http.get<BattleRankData>('/api/battle/rank', { type });
    }
}
