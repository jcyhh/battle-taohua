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
    nameLabel: Label = null!;

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
        this.nameLabel = this.nameLabel ?? this.findTitleLabel();
    }

    onDestroy() {
        this.isDestroyed = true;
        this.unscheduleAllCallbacks();
    }

    renderShopInfo(minerId: number, name: string | undefined, cycle: number | string, price: number | string) {
        this.minerId = minerId;
        this.unitPrice = Number(price) || 0;
        this.count = 1;

        const titleLabel = this.nameLabel ?? this.findTitleLabel();
        if (titleLabel) {
            titleLabel.string = name ? t(name) : t(this.getDefaultMinerName(minerId));
            this.nameLabel = titleLabel;
        }

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

    private getDefaultMinerName(minerId: number): string {
        switch (minerId) {
        case 1:
            return '白银矿工';
        case 2:
            return '黄金矿工';
        case 3:
            return '铂金矿工';
        case 4:
            return '钻石矿工';
        case 5:
            return '荣耀矿工';
        case 6:
            return '王者矿工';
        default:
            return '矿工';
        }
    }

    private findTitleLabel(): Label | null {
        const labels = this.node.getComponentsInChildren(Label)
            .filter((label) => label !== this.priceLabel && label !== this.countLabel && label !== this.daysLabel);
        if (labels.length === 0) return null;

        return labels.sort((a, b) => b.node.worldPosition.y - a.node.worldPosition.y)[0];
    }

    start() {

    }

    update(deltaTime: number) {
        
    }
}

