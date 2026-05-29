import { _decorator, Component, Label, Node } from 'cc';
import { Toast } from '../Common/Toast';
import { Api } from '../Config/Api';
import { t } from '../Config/I18n';
import { AudioManager } from '../Manager/AudioManager';
import { formatAmount } from '../Utils/Format';
import { Content } from './Content';
import { MyWorkers } from './MyWorkers';
const { ccclass, property } = _decorator;

@ccclass('WorkerItem')
export class WorkerItem extends Component {
    @property(Label)
    priceLabel: Label = null!;

    @property(Label)
    countLabel: Label = null!;

    @property(Label)
    daysLabel: Label = null!;

    private minerId = 0;
    private unitPrice = 0;
    private count = 1;
    private isDestroyed = false;

    onLoad() {
        this.isDestroyed = false;
    }

    onDestroy() {
        this.isDestroyed = true;
        this.unscheduleAllCallbacks();
    }

    renderShopInfo(minerId: number, cycle: number | string, price: number | string) {
        this.minerId = minerId;
        this.unitPrice = Number(price) || 0;
        this.count = 1;

        if (this.daysLabel) {
            this.daysLabel.string = t('工作周期: {cycle}天', { cycle });
        }

        this.renderCountAndPrice();
    }

    async buyMiner() {
        if (!this.minerId) return;

        try {
            await Api.minerBuy({
                miner_id: this.minerId,
                buy_num: this.count,
            });
            if (this.isDestroyed || !this.node?.isValid) return;
            Toast.showSuccess(t('购买成功'));
            this.scheduleOnce(() => {
                if (this.isDestroyed || !this.node?.isValid) return;
                AudioManager.instance?.playCoinOnce();
            }, 0.3);
            this.count = 1;
            this.renderCountAndPrice();
            Content.instance?.refreshBalance();
            MyWorkers.instance?.refresh(this.minerId);
        } catch (error) {
            console.error('[WorkerItem] 购买矿工失败:', error);
        }
    }

    addCount() {
        this.count += 1;
        this.renderCountAndPrice();
    }

    subCount() {
        this.count = Math.max(1, this.count - 1);
        this.renderCountAndPrice();
    }

    private renderCountAndPrice() {
        if (this.priceLabel) {
            this.priceLabel.string = formatAmount(this.count * this.unitPrice);
        }

        if (this.countLabel) {
            this.countLabel.string = String(this.count);
        }
    }

    start() {

    }

    update(deltaTime: number) {
        
    }
}

