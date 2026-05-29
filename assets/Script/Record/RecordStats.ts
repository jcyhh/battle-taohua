import { _decorator, Color, Component, instantiate, Label, Node, Prefab, ScrollView } from 'cc';
import { Api, BalanceLogItem, BalanceLogResponse } from '../Config/Api';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

const PAGE_SIZE = 20;
const LOAD_MORE_THRESHOLD = 60;
const INCREASE_COLOR = new Color(87, 255, 26, 255);
const DECREASE_COLOR = new Color(255, 26, 26, 255);

@ccclass('RecordStats')
export class RecordStats extends Component {
    @property(Prefab)
    recordItemPrefab: Prefab = null!;

    private scrollView: ScrollView | null = null;
    private contentNode: Node | null = null;
    private currentPage = 1;
    private isLoadingMore = false;
    private hasMore = true;
    private readonly listRecordNodes: Node[] = [];
    private isDestroyed = false;

    async start() {
        this.isDestroyed = false;
        this.bindScrollView();
        await this.loadBalanceLogs(true);
    }

    onDestroy() {
        this.isDestroyed = true;
        if (this.scrollView?.node?.isValid) {
            this.scrollView.node.targetOff(this);
        }
        this.unscheduleAllCallbacks();
    }

    private bindScrollView() {
        this.scrollView = this.getComponent(ScrollView);
        this.contentNode = this.scrollView?.content ?? this.node.getChildByPath('view/content') ?? null;
        this.scrollView?.node.on(ScrollView.EventType.SCROLLING, this.onScroll, this);
    }

    private async loadBalanceLogs(reset: boolean = false) {
        if (!this.recordItemPrefab || !this.contentNode || this.isLoadingMore) return;

        if (reset) {
            this.currentPage = 1;
            this.hasMore = true;
            this.clearListRecords();
        }

        if (!this.hasMore) return;

        this.isLoadingMore = true;
        try {
            const response = await Api.userBalanceLogs({
                ccy: 'balance_xz',
                page_no: this.currentPage,
                page_size: PAGE_SIZE,
            });
            if (this.isDestroyed || !this.node?.isValid) return;
            const list = this.getBalanceLogList(response);
            this.appendRecordItems(list ?? []);
            this.hasMore = Array.isArray(list) && list.length >= PAGE_SIZE;
            if (this.hasMore) {
                this.currentPage += 1;
            }
        } catch (e) {
            console.error('[RecordStats] 获取余额明细失败:', e);
        } finally {
            if (!this.isDestroyed) {
                this.isLoadingMore = false;
            }
        }
    }

    private getBalanceLogList(response: BalanceLogResponse): BalanceLogItem[] {
        if (Array.isArray(response.list)) return response.list;
        if (Array.isArray(response.logs)) return response.logs;
        if (Array.isArray(response.items)) return response.items;
        if (Array.isArray(response.asset_logs)) return response.asset_logs;
        if (Array.isArray(response.data)) return response.data;
        if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.list)) return response.data.list;
            if (Array.isArray(response.data.logs)) return response.data.logs;
            if (Array.isArray(response.data.items)) return response.data.items;
            if (Array.isArray(response.data.asset_logs)) return response.data.asset_logs;
        }
        return [];
    }

    private appendRecordItems(list: BalanceLogItem[]) {
        if (this.isDestroyed || !this.contentNode?.isValid) return;

        for (const item of list) {
            const itemNode = instantiate(this.recordItemPrefab);
            this.renderRecordItem(itemNode, item);
            this.contentNode.addChild(itemNode);
            this.listRecordNodes.push(itemNode);
        }
    }

    private renderRecordItem(itemNode: Node, item: BalanceLogItem) {
        this.setLabelString(itemNode, 'remark', item.content || item.remark || '');
        this.setLabelString(itemNode, 'time', item.created_at || item.create_time || item.time || '');
        this.renderAmount(itemNode, item);
    }

    private renderAmount(itemNode: Node, item: BalanceLogItem) {
        const amountLabel = itemNode.getChildByName('amount')?.getComponent(Label);
        if (!amountLabel) return;

        const isIncrease = Number(item.is_inc) === 1;
        amountLabel.string = `${isIncrease ? '+' : '-'}${formatAmount(item.amount)}`;
        amountLabel.color = isIncrease ? INCREASE_COLOR : DECREASE_COLOR;
    }

    private setLabelString(root: Node, childName: string, value: string) {
        const label = root.getChildByName(childName)?.getComponent(Label);
        if (label) {
            label.string = value;
        }
    }

    private clearListRecords() {
        for (const node of this.listRecordNodes) {
            if (node?.isValid) {
                node.destroy();
            }
        }
        this.listRecordNodes.length = 0;
    }

    private onScroll() {
        if (!this.scrollView || this.isLoadingMore || !this.hasMore) return;
        const offset = this.scrollView.getScrollOffset();
        const maxOffset = this.scrollView.getMaxScrollOffset();
        if (maxOffset.y - offset.y <= LOAD_MORE_THRESHOLD) {
            void this.loadBalanceLogs();
        }
    }
}

