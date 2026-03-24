import { Request } from '../Utils/Request';

const http = Request.instance;

// ==================== 类型定义 ====================

interface BattleInitData {
    balance: string;
    game_id: number;
    pre_killer_room: number;
    user_id: number;
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
    memail: string;
    total_amount: number;
}

interface BattleRankData {
    list: RankItem[];
    my_rank: RankItem;
}

// ==================== 接口 ====================

export class Api {
    // ---- 大逃杀模块 /api/battle ----

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
