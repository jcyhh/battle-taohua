import { Vec2 } from 'cc';

// TODO: 在编辑器中量出精确值
export const VERT_X = 170;
export const UPPER_Y = 60;
export const LOWER_Y = -220;

export const MOVE_SPEED = 300;

export const ROOM_NAME_MAP = [
    '',
    '东字号',
    '天字号',
    '西字号',
    '中字号',
    '人字号',
    '北字号',
    '南字号',
    '地字号',
];

export function getRoomNameById(roomId: number): string {
    return ROOM_NAME_MAP[roomId] ?? `房间${roomId}`;
}

export interface RoomInfo {
    corridor: 'upper' | 'lower';
    doorX: number;
    enterOrder: 'yx' | 'xy';
}

export const ROOMS: Record<string, RoomInfo> = {
    room1: { corridor: 'upper', doorX: -130,   enterOrder: 'yx' },
    room2: { corridor: 'upper', doorX: -40,    enterOrder: 'yx' },
    room3: { corridor: 'upper', doorX: 170,    enterOrder: 'yx' },
    room4: { corridor: 'upper', doorX: -130,   enterOrder: 'xy' },
    room5: { corridor: 'lower', doorX: -35,    enterOrder: 'yx' },
    room6: { corridor: 'lower', doorX: 170,    enterOrder: 'xy' },
    room7: { corridor: 'lower', doorX: -130,   enterOrder: 'xy' },
    room8: { corridor: 'lower', doorX: 20,     enterOrder: 'yx' },
};

export const ROOM_KEYS = Object.keys(ROOMS);

function corridorY(corridor: 'upper' | 'lower'): number {
    return corridor === 'upper' ? UPPER_Y : LOWER_Y;
}

function push(path: Vec2[], cx: number, cy: number, nx: number, ny: number): { x: number; y: number } {
    if (Math.abs(nx - cx) > 0.1 || Math.abs(ny - cy) > 0.1) {
        path.push(new Vec2(nx, ny));
    }
    return { x: nx, y: ny };
}

/**
 * @param targetX 目标房间内 standBy 随机点的 MapRoot 坐标 x
 * @param targetY 目标房间内 standBy 随机点的 MapRoot 坐标 y
 */
export function buildPath(
    fromX: number, fromY: number,
    fromRoom: string | null,
    toRoom: string,
    targetX: number, targetY: number,
): Vec2[] {
    const target = ROOMS[toRoom];
    if (!target) return [];

    const targetCY = corridorY(target.corridor);
    const path: Vec2[] = [];
    let cx = fromX;
    let cy = fromY;

    // ---- 退出当前房间 ----
    if (fromRoom) {
        const source = ROOMS[fromRoom];
        const sourceCY = corridorY(source.corridor);
        const sameCorridor = source.corridor === target.corridor;

        if (source.enterOrder === 'yx') {
            ({ x: cx, y: cy } = push(path, cx, cy, source.doorX, cy));
            ({ x: cx, y: cy } = push(path, cx, cy, cx, sourceCY));
        } else {
            ({ x: cx, y: cy } = push(path, cx, cy, cx, sourceCY));
            ({ x: cx, y: cy } = push(path, cx, cy, source.doorX, cy));
        }

        if (sameCorridor) {
            ({ x: cx, y: cy } = push(path, cx, cy, target.doorX, cy));
        } else {
            ({ x: cx, y: cy } = push(path, cx, cy, VERT_X, cy));
            ({ x: cx, y: cy } = push(path, cx, cy, cx, targetCY));
            ({ x: cx, y: cy } = push(path, cx, cy, target.doorX, cy));
        }
    } else {
        ({ x: cx, y: cy } = push(path, cx, cy, VERT_X, cy));
        ({ x: cx, y: cy } = push(path, cx, cy, cx, targetCY));
        ({ x: cx, y: cy } = push(path, cx, cy, target.doorX, cy));
    }

    // ---- 进入房间 ----
    if (target.enterOrder === 'yx') {
        ({ x: cx, y: cy } = push(path, cx, cy, cx, targetY));
        ({ x: cx, y: cy } = push(path, cx, cy, targetX, cy));
    } else {
        ({ x: cx, y: cy } = push(path, cx, cy, targetX, cy));
        ({ x: cx, y: cy } = push(path, cx, cy, cx, targetY));
    }

    return path;
}
