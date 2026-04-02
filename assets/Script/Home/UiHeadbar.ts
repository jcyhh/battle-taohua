import { _decorator, Component, Label, tween, Tween, Vec3 } from 'cc';
import { Api } from '../Config/Api';
import { t } from '../Config/I18n';
import { AudioManager } from '../Manager/AudioManager';
import { AppBridge } from '../Utils/AppBridge';
import { GamePhase, GameStateManager } from '../Manager/GameStateManager';
import { getRoomNameById } from './RoomConfig';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

@ccclass('UiHeadbar')
export class UiHeadbar extends Component {
    static instance: UiHeadbar | null = null;

    @property(Label)
    labelPeach: Label = null!;

    @property(Label)
    labelWater: Label = null!;

    @property(Label)
    labelStone: Label = null!;

    @property(Label)
    boardTitleLabel: Label = null!;

    @property(Label)
    boardMsgLabel: Label = null!;

    private stoneBalance = 0;
    private lastCountdownTimer: number | null = null;

    private readonly onGameChanged = () => {
        this.fetchBattleInit();
    };

    private readonly onDtsDataChanged = (payload: {
        dtsData: {
            join_people?: number | string;
            max_people?: number | string;
            game_id?: number | string;
            pre_killer_room?: number | string;
            timer?: number | string;
        };
        currentPhase: GamePhase;
    }) => {
        this.updateBoardTitleByDtsData(payload.dtsData);
        this.updateBoardMessageByDtsData(payload.dtsData, payload.currentPhase);
    };

    onLoad() {
        UiHeadbar.instance = this;
        AppBridge.init();
        this.bindLabels();
        GameStateManager.instance.onGameChanged(this.onGameChanged);
        GameStateManager.instance.onDtsDataChanged(this.onDtsDataChanged);
        this.fetchBattleInit();
    }

    onDestroy() {
        if (UiHeadbar.instance === this) {
            UiHeadbar.instance = null;
        }
        GameStateManager.instance.offGameChanged(this.onGameChanged);
        GameStateManager.instance.offDtsDataChanged(this.onDtsDataChanged);
    }

    onQuit() {
        AppBridge.postMessage('navBack', '')
    }

    async fetchBattleInit() {
        try {
            const [battleData, userData] = await Promise.all([
                Api.battleInit(),
                Api.userMy(),
            ]);
            const data = battleData;
            GameStateManager.instance.setInitialGameId(data.game_id);
            GameStateManager.instance.setSelfUserId(data.user_id);
            this.setStoneBalance(data.balance);
            this.setWaterBalance(userData?.balance_spring_water);
            this.updateBoardTitle(data.game_id);
        } catch (e) {
            console.error('[UiHeadbar] 获取初始化信息失败:', e);
        }
    }

    private bindLabels() {
        this.labelPeach = this.findLabel('asset/assetPeach/Label', this.labelPeach);
        this.labelWater = this.findNodeLabel([
            'asset/assetWater/Label',
            'asset/assetHolyWater/Label',
            'asset/assetPeach/Label',
        ], this.labelWater);
        this.labelStone = this.findLabel('asset/assetStone/Label', this.labelStone);
        this.boardTitleLabel = this.findNodeLabel(['board/title', 'board/number'], this.boardTitleLabel);
        this.boardMsgLabel = this.findNodeLabel(['board/msg'], this.boardMsgLabel);
    }

    private findLabel(path: string, fallback: Label | null): Label {
        return this.node.getChildByPath(path)?.getComponent(Label) ?? fallback!;
    }

    private findNodeLabel(paths: string[], fallback: Label | null): Label {
        for (const path of paths) {
            const label = this.node.getChildByPath(path)?.getComponent(Label);
            if (label) return label;
        }
        return fallback!;
    }

    public setBoardTitle(value: string) {
        this.updateBoardLabel(this.boardTitleLabel, value);
    }

    public setBoardMessage(value: string) {
        this.updateBoardLabel(this.boardMsgLabel, value);
    }

    public decreaseStoneBalance(amount: number) {
        this.setStoneBalance(this.stoneBalance - amount);
    }

    private updateBoardTitle(gameId: number | string) {
        const dtsData = GameStateManager.instance.currentDtsData;
        const dtsGameId = dtsData ? Number(dtsData.game_id) : null;
        const currentGameId = Number(gameId);
        const joinPeople = dtsData && dtsGameId === currentGameId ? this.normalizeCount(dtsData.join_people) : 0;
        const maxPeople = dtsData && dtsGameId === currentGameId ? this.normalizeCount(dtsData.max_people) : 0;
        this.setBoardTitle(t('第{gameId}期（{joinPeople}/{maxPeople}）', {
            gameId: currentGameId,
            joinPeople,
            maxPeople,
        }));
    }

    private updateBoardTitleByDtsData(dtsData: { join_people?: number | string; max_people?: number | string; game_id?: number | string }) {
        const gameId = dtsData?.game_id ?? GameStateManager.instance.currentGameId;
        if (gameId === null || gameId === undefined || gameId === '') return;

        const joinPeople = this.normalizeCount(dtsData.join_people);
        const maxPeople = this.normalizeCount(dtsData.max_people);
        this.setBoardTitle(t('第{gameId}期（{joinPeople}/{maxPeople}）', {
            gameId,
            joinPeople,
            maxPeople,
        }));
    }

    private updateBoardMessageByDtsData(
        dtsData: { pre_killer_room?: number | string; timer?: number | string },
        currentPhase: GamePhase,
    ) {
        if (GameStateManager.instance.skipCurrentRoundVisuals) {
            this.setBoardMessage(t('下局即将开始'));
            return;
        }

        if (currentPhase === GamePhase.Gathering) {
            const preKillerRoom = this.normalizeCount(dtsData.pre_killer_room);
            if (preKillerRoom === 0) {
                this.setBoardMessage(t('即将开局'));
                return;
            }

            const roomName = getRoomNameById(preKillerRoom);
            this.setBoardMessage(t('上期杀手去了{roomName}', { roomName }));
            return;
        }

        if (currentPhase === GamePhase.Starting) {
            const timer = this.normalizeCount(dtsData.timer);
            const displayTimer = timer <= 0 ? 1 : timer;
            this.setBoardMessage(t('{displayTimer}秒后杀手出现', { displayTimer }));
            this.tryPlayCountdownTick(timer, currentPhase);
            return;
        }

        if (currentPhase === GamePhase.KillerAppearing) {
            this.setBoardMessage(t('杀手出现'));
        }
    }

    private tryPlayCountdownTick(timer: number, currentPhase: GamePhase) {
        if (currentPhase !== GamePhase.Starting) {
            this.lastCountdownTimer = null;
            return;
        }

        if (timer > 10 || timer <= 0) {
            this.lastCountdownTimer = timer;
            return;
        }

        if (this.lastCountdownTimer === timer) return;
        this.lastCountdownTimer = timer;
        AudioManager.instance?.playCountdownTick();
    }

    private updateBoardLabel(label: Label | null, value: string) {
        if (!label) return;
        if (label.string === value) return;
        label.string = value;
        this.playLabelUpdateAnim(label);
    }

    private playLabelUpdateAnim(label: Label) {
        const target = label.node;
        Tween.stopAllByTarget(target);
        target.setScale(1, 1, 1);
        tween(target)
            .to(0.12, { scale: new Vec3(1.1, 1.1, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();
    }
    private normalizeCount(value?: number | string): number {
        const count = Number(value);
        return Number.isFinite(count) ? count : 0;
    }

    private setStoneBalance(value?: number | string) {
        const balance = Number(value);
        this.stoneBalance = Number.isFinite(balance) ? balance : 0;
        this.labelStone.string = formatAmount(this.stoneBalance);
    }

    private setWaterBalance(value?: number | string) {
        if (!this.labelWater) return;
        this.labelWater.string = formatAmount(value);
    }
}
