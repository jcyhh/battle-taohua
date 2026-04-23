import { _decorator, Component, Node, Label, Button, Prefab, Sprite, tween, Tween, Vec3, instantiate, EventTouch } from 'cc';
import { Api } from '../Config/Api';
import { Toast } from '../Common/Toast';
import { t } from '../Config/I18n';
import { AudioManager } from '../Manager/AudioManager';
import { GamePhase, GameStateManager } from '../Manager/GameStateManager';
import { MapRoot } from './MapRoot';
import { UiHeadbar } from './UiHeadbar';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

const DEFAULT_TAB_VALUES = [10, 30, 50, 100, 200, 500, 1000, 10000];

@ccclass('Picker')
export class Picker extends Component {
    @property(Node)
    pickerPop: Node = null!;

    @property(Label)
    countLabel: Label = null!;

    @property(Node)
    contentNode: Node = null!;

    @property(Prefab)
    tabPrefab: Prefab = null!;

    private selectedValue = 10;
    private isPopOpen = false;
    private isPopAnimating = false;
    private isSubmitting = false;
    private tabValues: number[] = [...DEFAULT_TAB_VALUES];
    private readonly delayedClosePop = () => {
        this.closePop();
    };

    onLoad() {
        this.countLabel.string = formatAmount(this.selectedValue);
        this.pickerPop.setScale(1, 0, 1);
        this.initTabs().catch((err) => {
            console.error('[Picker] 初始化下注金额失败:', err);
        });
        this.node.on(Node.EventType.TOUCH_END, this.togglePop, this);
    }

    onDestroy() {
        this.unschedule(this.delayedClosePop);
        if (this.pickerPop?.isValid) {
            Tween.stopAllByTarget(this.pickerPop);
            this.pickerPop.targetOff(this);
        }
        if (this.node?.isValid) {
            this.node.off(Node.EventType.TOUCH_END, this.togglePop, this);
        }
    }

    private async initTabs() {
        await this.loadTabValues();
        this.contentNode.removeAllChildren();

        for (const value of this.tabValues) {
            const tab = instantiate(this.tabPrefab);
            tab.getComponentInChildren(Label)!.string = formatAmount(value);
            this.contentNode.addChild(tab);
            tab.on(Button.EventType.CLICK, () => this.onTabClick(value));
        }

        if (this.tabValues.indexOf(this.selectedValue) < 0) {
            this.selectedValue = this.tabValues[0] ?? 0;
            this.countLabel.string = formatAmount(this.selectedValue);
        }

        this.scheduleOnce(() => {
            this.updateTabStates();
            this.pickerPop.active = false;
        });
    }

    private onTabClick(value: number) {
        if (this.isSubmitting) return;
        if (value === this.selectedValue) return;

        this.selectedValue = value;
        this.updateTabStates();
        this.countLabel.string = formatAmount(value);
        this.unschedule(this.delayedClosePop);
        this.scheduleOnce(this.delayedClosePop, 0.3);
    }

    private updateTabStates() {
        const children = this.contentNode.children;
        for (let i = 0; i < children.length; i++) {
            const btn = children[i].getComponent(Button)!;
            const selected = this.tabValues[i] === this.selectedValue;
            btn.interactable = !selected;
            const sprite = btn.target.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = selected ? btn.disabledSprite : btn.normalSprite;
            }
        }
    }

    private async loadTabValues() {
        try {
            const values = await Api.battleBetAmount();
            if (Array.isArray(values) && values.length > 0) {
                this.tabValues = values;
            }
        } catch (e) {
            console.warn('[Picker] 获取可用下注金额失败，使用默认配置', e);
            this.tabValues = [...DEFAULT_TAB_VALUES];
        }
    }

    private togglePop(event?: EventTouch) {
        if (this.isSubmitting || this.isPopAnimating) {
            return;
        }

        if (event && this.pickerPop?.isValid && this.pickerPop.active && this.isNodeInsidePopup(event.target as Node | null)) {
            return;
        }

        if (!this.canOpenPicker()) {
            Toast.showFail(t('请稍等'));
            return;
        }

        if (this.isPopOpen) {
            this.closePop();
        } else {
            this.openPop();
        }
    }

    private openPop() {
        if (!this.pickerPop?.isValid) return;
        if (this.isPopOpen || this.isPopAnimating) return;
        this.unschedule(this.delayedClosePop);
        Tween.stopAllByTarget(this.pickerPop);
        this.isPopAnimating = true;
        this.isPopOpen = true;
        this.pickerPop.active = true;
        this.pickerPop.setScale(1, 0, 1);
        tween(this.pickerPop)
            .to(0.15, { scale: new Vec3(1, 1.05, 1) })
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .call(() => {
                this.isPopAnimating = false;
            })
            .start();
    }

    private closePop() {
        if (!this.pickerPop?.isValid) return;
        if (!this.isPopOpen || this.isPopAnimating) return;
        this.unschedule(this.delayedClosePop);
        Tween.stopAllByTarget(this.pickerPop);
        this.isPopAnimating = true;
        this.isPopOpen = false;
        tween(this.pickerPop)
            .to(0.15, { scale: new Vec3(1, 0, 1) })
            .call(() => {
                this.pickerPop.active = false;
                this.isPopAnimating = false;
            })
            .start();
    }

    private forceClosePop() {
        this.unschedule(this.delayedClosePop);
        if (!this.pickerPop?.isValid) {
            this.isPopAnimating = false;
            this.isPopOpen = false;
            return;
        }
        Tween.stopAllByTarget(this.pickerPop);
        this.isPopAnimating = false;
        this.isPopOpen = false;
        this.pickerPop.active = false;
        this.pickerPop.setScale(1, 0, 1);
    }

    private canOpenPicker() {
        const phase = GameStateManager.instance.currentPhase;
        return phase === GamePhase.Gathering || phase === GamePhase.Starting;
    }

    private isNodeInsidePopup(node: Node | null) {
        let current = node;
        while (current) {
            if (current === this.pickerPop) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    public async submitBet() {
        if (this.isSubmitting) return;

        const roomId = MapRoot.instance?.getSelfSelectedRoomId() ?? 0;
        if (roomId < 1 || roomId > 8) {
            Toast.showFail(t('请先选择房间'));
            return;
        }

        const gameId = GameStateManager.instance.currentGameId;
        if (!gameId) {
            Toast.showFail(t('未获取到当前期数'));
            return;
        }

        this.isSubmitting = true;
        this.forceClosePop();

        try {
            await Api.battleJoin({
                game_id: gameId,
                room_id: roomId,
                amount: this.selectedValue,
            });
            AudioManager.instance?.playCoinOnce();
            Toast.showSuccess(t('投入成功'));
            UiHeadbar.instance?.decreaseStoneBalance(this.selectedValue);
        } catch (e) {
            console.error('[Picker] 投入失败:', e);
        } finally {
            this.isSubmitting = false;
        }
    }
}
