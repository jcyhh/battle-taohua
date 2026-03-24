export enum GamePhase {
    Unknown = 0,
    Gathering = 1,
    Starting = 2,
    KillerAppearing = 3,
    Settlement = 4,
}

export interface SocketRoomInfo {
    room_id?: number | string;
    amount?: number | string;
}

export interface SocketUserInfo {
    user_id?: number | string;
    nickname?: string;
    room_id?: number | string;
    amount?: number | string;
}

export interface GameDtsData {
    game_id?: number | string;
    state?: number | string;
    user_id?: number | string;
    user_amount?: number | string;
    user_bonus?: number | string;
    join_people?: number | string;
    max_people?: number | string;
    pre_killer_room?: number | string;
    killer_room?: number | string;
    timer?: number | string;
    room_list?: SocketRoomInfo[];
    user_list?: SocketUserInfo[];
    [key: string]: any;
}

type GameChangedHandler = (payload: {
    previousGameId: number | null;
    currentGameId: number;
    dtsData: GameDtsData;
}) => void;

type PhaseChangedHandler = (payload: {
    previousPhase: GamePhase;
    currentPhase: GamePhase;
    dtsData: GameDtsData;
}) => void;

type DtsDataChangedHandler = (payload: {
    dtsData: GameDtsData;
    currentGameId: number | null;
    currentPhase: GamePhase;
}) => void;

export class GameStateManager {
    private static _instance: GameStateManager | null = null;

    private _currentGameId: number | null = null;
    private _currentSelfUserId: number | null = null;
    private _currentPhase: GamePhase = GamePhase.Unknown;
    private _currentDtsData: GameDtsData | null = null;
    private _skipCurrentRoundVisuals = false;
    private readonly _gameChangedHandlers = new Set<GameChangedHandler>();
    private readonly _phaseChangedHandlers = new Set<PhaseChangedHandler>();
    private readonly _dtsDataChangedHandlers = new Set<DtsDataChangedHandler>();

    static get instance(): GameStateManager {
        if (!this._instance) {
            this._instance = new GameStateManager();
        }
        return this._instance;
    }

    get currentGameId(): number | null {
        return this._currentGameId;
    }

    get currentPhase(): GamePhase {
        return this._currentPhase;
    }

    get currentSelfUserId(): number | null {
        return this._currentSelfUserId;
    }

    get currentDtsData(): GameDtsData | null {
        return this._currentDtsData;
    }

    get skipCurrentRoundVisuals(): boolean {
        return this._skipCurrentRoundVisuals;
    }

    setInitialGameId(gameId: number | string | null | undefined): void {
        const normalizedGameId = this.normalizeGameId(gameId);
        if (normalizedGameId === null) return;
        this._currentGameId = normalizedGameId;
    }

    setSelfUserId(userId: number | string | null | undefined): void {
        const normalizedUserId = this.normalizeUserId(userId);
        if (normalizedUserId === null) return;
        this._currentSelfUserId = normalizedUserId;
    }

    syncFromDtsData(dtsData: GameDtsData) {
        this._currentDtsData = dtsData;

        const previousGameId = this._currentGameId;
        const nextGameId = this.normalizeGameId(dtsData.game_id);
        const gameChanged = previousGameId !== null && nextGameId !== null && nextGameId !== previousGameId;
        if (nextGameId !== null) {
            this._currentGameId = nextGameId;
        }

        const previousPhase = this._currentPhase;
        const currentPhase = this.mapSocketState(dtsData.state);
        const phaseChanged = currentPhase !== previousPhase;
        this._currentPhase = currentPhase;

        if (gameChanged || currentPhase === GamePhase.Gathering || currentPhase === GamePhase.Starting) {
            this._skipCurrentRoundVisuals = false;
        } else if (previousPhase === GamePhase.Unknown && currentPhase === GamePhase.KillerAppearing) {
            this._skipCurrentRoundVisuals = true;
        }

        const dtsPayload = {
            dtsData,
            currentGameId: this._currentGameId,
            currentPhase: this._currentPhase,
        };

        if (gameChanged && nextGameId !== null) {
            const payload = { previousGameId, currentGameId: nextGameId, dtsData };
            this._gameChangedHandlers.forEach((handler) => handler(payload));
        }

        if (phaseChanged) {
            const payload = { previousPhase, currentPhase, dtsData };
            this._phaseChangedHandlers.forEach((handler) => handler(payload));
        }

        this._dtsDataChangedHandlers.forEach((handler) => handler(dtsPayload));

        return {
            previousGameId,
            currentGameId: this._currentGameId,
            gameChanged,
            previousPhase,
            currentPhase,
            phaseChanged,
        };
    }

    onGameChanged(handler: GameChangedHandler): void {
        this._gameChangedHandlers.add(handler);
    }

    offGameChanged(handler: GameChangedHandler): void {
        this._gameChangedHandlers.delete(handler);
    }

    onPhaseChanged(handler: PhaseChangedHandler): void {
        this._phaseChangedHandlers.add(handler);
    }

    offPhaseChanged(handler: PhaseChangedHandler): void {
        this._phaseChangedHandlers.delete(handler);
    }

    onDtsDataChanged(handler: DtsDataChangedHandler): void {
        this._dtsDataChangedHandlers.add(handler);
    }

    offDtsDataChanged(handler: DtsDataChangedHandler): void {
        this._dtsDataChangedHandlers.delete(handler);
    }

    private normalizeGameId(gameId: number | string | null | undefined): number | null {
        if (gameId === null || gameId === undefined || gameId === '') return null;
        const normalizedGameId = Number(gameId);
        return Number.isFinite(normalizedGameId) ? normalizedGameId : null;
    }

    private normalizeUserId(userId: number | string | null | undefined): number | null {
        if (userId === null || userId === undefined || userId === '') return null;
        const normalizedUserId = Number(userId);
        return Number.isInteger(normalizedUserId) ? normalizedUserId : null;
    }

    private mapSocketState(state: number | string | null | undefined): GamePhase {
        const normalizedState = Number(state);
        switch (normalizedState) {
            case GamePhase.Gathering:
                return GamePhase.Gathering;
            case GamePhase.Starting:
                return GamePhase.Starting;
            case GamePhase.KillerAppearing:
                return GamePhase.KillerAppearing;
            case GamePhase.Settlement:
                return GamePhase.Settlement;
            default:
                return GamePhase.Unknown;
        }
    }
}
