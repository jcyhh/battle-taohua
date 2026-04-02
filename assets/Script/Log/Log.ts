import { _decorator, Color, Component, director, instantiate, Label, Node, Prefab, ScrollView } from 'cc';
import { Api, BalanceLogItem, BalanceLogResponse } from '../Config/Api';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

@ccclass('Log')
export class Log extends Component {
    private static readonly SCENE_NAME = 'Log';
    private static readonly PAGE_LOAD_GAP = 80;
    private static readonly INCREASE_COLOR = new Color(0x5E, 0x21, 0x1A, 0xFF);
    private static readonly DECREASE_COLOR = new Color(0xFF, 0x00, 0x84, 0xFF);

    @property({ type: Prefab, tooltip: '日志预设体' })
    itemPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: 'ScrollView content 节点' })
    contentNode: Node | null = null;

    @property({ tooltip: '每页数量' })
    pageSize = 20;

    private scrollView: ScrollView | null = null;
    private pageNo = 1;
    private loading = false;
    private hasMore = true;

    static open() {
        director.loadScene(this.SCENE_NAME);
    }

    onLoad() {
        this.scrollView = this.getComponent(ScrollView);
        this.contentNode = this.contentNode ?? this.scrollView?.content ?? this.node.getChildByPath('view/content') ?? null;
        this.node.on('scrolling', this.onScrolling, this);
    }

    onDestroy() {
        this.node.off('scrolling', this.onScrolling, this);
    }

    start() {
        void this.reload();
    }

    private async reload() {
        this.pageNo = 1;
        this.hasMore = true;
        this.clearList();

        if (this.scrollView) {
            this.scrollView.stopAutoScroll();
            this.scrollView.scrollToTop(0);
        }

        await this.loadNextPage();
    }

    private async loadNextPage() {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        try {
            const response = await Api.userBalanceLogs({
                page_no: this.pageNo,
                page_size: this.pageSize,
            });
            const list = this.pickLogList(response);
            this.renderList(list);
            this.hasMore = this.pickHasMore(response, list.length);
            if (list.length > 0) {
                this.pageNo += 1;
            }
        } catch (error) {
            console.error('[Log] 获取资产明细失败:', error);
        } finally {
            this.loading = false;
        }
    }

    private onScrolling() {
        if (!this.scrollView || this.loading || !this.hasMore) return;

        const maxOffset = this.scrollView.getMaxScrollOffset();
        const offset = this.scrollView.getScrollOffset();
        if (maxOffset.y <= 0) return;
        if (offset.y >= maxOffset.y - Log.PAGE_LOAD_GAP) {
            void this.loadNextPage();
        }
    }

    private pickLogList(response: BalanceLogResponse | BalanceLogItem[]): BalanceLogItem[] {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray((response as any).asset_logs)) {
            return (response as any).asset_logs;
        }

        if (Array.isArray(response.list)) {
            return response.list;
        }

        if (Array.isArray(response.logs)) {
            return response.logs;
        }

        if (Array.isArray(response.items)) {
            return response.items;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (response.data && !Array.isArray(response.data)) {
            if (Array.isArray((response.data as any).asset_logs)) {
                return (response.data as any).asset_logs;
            }
            if (Array.isArray(response.data.list)) {
                return response.data.list;
            }
            if (Array.isArray(response.data.logs)) {
                return response.data.logs;
            }
            if (Array.isArray(response.data.items)) {
                return response.data.items;
            }
        }

        return [];
    }

    private pickHasMore(response: BalanceLogResponse, currentSize: number) {
        if (currentSize < this.pageSize) {
            return false;
        }

        const total = Number(response.total ?? NaN);
        if (Number.isFinite(total) && total >= 0 && this.contentNode) {
            return this.contentNode.children.length < total;
        }

        return currentSize >= this.pageSize;
    }

    private renderList(list: BalanceLogItem[]) {
        if (!this.contentNode || !this.itemPrefab || list.length === 0) return;

        for (const item of list) {
            const node = instantiate(this.itemPrefab);
            node.active = true;
            this.contentNode.addChild(node);
            this.fillItem(node, item);
        }
    }

    private fillItem(node: Node, item: BalanceLogItem) {
        const remarkLabel = node.getChildByName('remark')?.getComponent(Label)
            ?? node.getChildByName('Label')?.getComponent(Label)
            ?? null;
        const amountLabel = node.getChildByName('amount')?.getComponent(Label)
            ?? node.getChildByName('Label-001')?.getComponent(Label)
            ?? null;
        const timeLabel = node.getChildByName('time')?.getComponent(Label)
            ?? node.getChildByName('Label-002')?.getComponent(Label)
            ?? null;

        if (remarkLabel) {
            remarkLabel.string = this.getRemarkText(item);
        }
        if (amountLabel) {
            amountLabel.string = this.getAmountText(item);
            amountLabel.color = this.isIncrease(item) ? Log.INCREASE_COLOR : Log.DECREASE_COLOR;
        }
        if (timeLabel) {
            timeLabel.string = this.getTimeText(item);
        }
    }

    private getRemarkText(item: BalanceLogItem) {
        return String(
            item.remark
            ?? item.note
            ?? item.title
            ?? item.content
            ?? item.desc
            ?? '--',
        );
    }

    private getAmountText(item: BalanceLogItem) {
        const raw = item.amount ?? item.change_amount ?? item.value ?? item.num ?? 0;
        const num = Number(raw);
        if (!Number.isFinite(num)) {
            return String(raw ?? '0');
        }

        const absText = formatAmount(Math.abs(num));
        if (this.isIncrease(item)) return `+${absText}`;
        if (num !== 0) return `-${absText}`;
        return '0';
    }

    private getTimeText(item: BalanceLogItem) {
        return String(item.created_at ?? item.create_time ?? item.time ?? item.updated_at ?? '');
    }

    private isIncrease(item: BalanceLogItem) {
        return Number((item as any).is_inc ?? 0) === 1;
    }

    private clearList() {
        if (!this.contentNode) return;
        for (const child of [...this.contentNode.children]) {
            child.destroy();
        }
    }

}

