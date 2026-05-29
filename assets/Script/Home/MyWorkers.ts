import { _decorator, Component, Label, Node, ScrollView, UITransform, Vec2 } from 'cc';
import { Api } from '../Config/Api';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

@ccclass('MyWorkers')
export class MyWorkers extends Component {
    static instance: MyWorkers | null = null;

    @property(Node)
    myWorkerListNode: Node = null!;

    private workerAmountMap: Map<number, number | string> = new Map();
    private isDestroyed = false;

    onLoad() {
        this.isDestroyed = false;
        MyWorkers.instance = this;
    }

    onDestroy() {
        this.isDestroyed = true;
        this.unscheduleAllCallbacks();
        if (MyWorkers.instance === this) {
            MyWorkers.instance = null;
        }
    }

    start() {
        this.refresh();
    }

    async refresh(scrollToMinerId?: number) {
        try {
            const data = await Api.minerMy();
            if (this.isDestroyed || !this.node?.isValid) return;
            this.workerAmountMap.clear();
            for (const item of data.list) {
                this.workerAmountMap.set(item.miner_id, item.amount);
                this.renderMyWorkerAmount(item.miner_id, item.amount);
            }

            if (scrollToMinerId) {
                this.scheduleOnce(() => {
                    if (this.isDestroyed || !this.node?.isValid) return;
                    this.scrollToMiner(scrollToMinerId);
                }, 0);
            }
        } catch (error) {
            console.error('[MyWorkers] 获取用户持有矿工列表失败:', error);
        }
    }

    getWorkerAmount(minerId: number): number | string {
        return this.workerAmountMap.get(minerId) ?? 0;
    }

    private renderMyWorkerAmount(minerId: number, amount: number | string) {
        const itemNode = this.myWorkerListNode?.getChildByName(`myWorkerItem${minerId}`);
        const countLabel = itemNode?.getChildByName('count')?.getComponent(Label);
        if (!countLabel) return;

        countLabel.string = formatAmount(amount);
    }

    private scrollToMiner(minerId: number) {
        if (this.isDestroyed || !this.node?.isValid) return;
        const scrollView = this.getComponent(ScrollView);
        const itemNode = this.myWorkerListNode?.getChildByName(`myWorkerItem${minerId}`);
        const contentTransform = this.myWorkerListNode?.getComponent(UITransform);
        const viewTransform = scrollView?.view?.getComponent(UITransform);
        if (!scrollView || !itemNode || !contentTransform || !viewTransform) return;

        const contentLeftX = -contentTransform.contentSize.width * contentTransform.anchorPoint.x;
        const itemOffsetX = itemNode.position.x - contentLeftX;
        const maxOffsetX = Math.max(0, contentTransform.contentSize.width - viewTransform.contentSize.width);
        const offsetX = Math.min(maxOffsetX, Math.max(0, itemOffsetX - viewTransform.contentSize.width / 2));
        scrollView.stopAutoScroll();
        scrollView.scrollToOffset(new Vec2(offsetX, 0), 0.25);
    }

    update(deltaTime: number) {
        
    }
}

