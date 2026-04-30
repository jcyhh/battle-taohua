import { _decorator, Component, director, Label } from 'cc';
import { t } from '../Config/I18n';
import { GameStateManager } from '../Manager/GameStateManager';
import { formatAmount } from '../Utils/Format';
const { ccclass } = _decorator;

@ccclass('UiBotbar')
export class UiBotbar extends Component {
    private static hasPreloadedSubScenes = false;
    private amountLabel: Label | null = null;

    private readonly onDtsDataChanged = (payload: {
        dtsData: {
            user_amount?: number | string;
        };
    }) => {
        this.updateAmountLabel(payload.dtsData.user_amount);
    };

    onLoad() {
        this.bindNodes();
        GameStateManager.instance.onDtsDataChanged(this.onDtsDataChanged);
        this.updateAmountLabel(GameStateManager.instance.currentDtsData?.user_amount);
    }

    start() {
        this.preloadSubScenes();
    }

    onDestroy() {
        GameStateManager.instance.offDtsDataChanged(this.onDtsDataChanged);
    }

    goRecordScene() {
        director.loadScene('Record');
    }

    goRankScene() {
        director.loadScene('Rank');
    }

    goLogScene() {
        director.loadScene('Log');
    }

    private bindNodes() {
        this.amountLabel = this.node.getChildByPath('botbar/amount')?.getComponent(Label)
            ?? this.node.getChildByName('amount')?.getComponent(Label)
            ?? null;
    }

    private updateAmountLabel(value?: number | string) {
        if (!this.amountLabel) return;
        this.amountLabel.string = t('本期已投入 {userAmount} 灵石', {
            userAmount: formatAmount(value),
        });
    }

    private preloadSubScenes() {
        if (UiBotbar.hasPreloadedSubScenes) {
            return;
        }
        UiBotbar.hasPreloadedSubScenes = true;

        director.preloadScene('Record', (error) => {
            if (error) {
                console.warn('[UiBotbar] 预加载 Record 场景失败:', error);
            }
        });

        director.preloadScene('Rank', (error) => {
            if (error) {
                console.warn('[UiBotbar] 预加载 Rank 场景失败:', error);
            }
        });

        director.preloadScene('Log', (error) => {
            if (error) {
                console.warn('[UiBotbar] 预加载 Log 场景失败:', error);
            }
        });
    }
}

