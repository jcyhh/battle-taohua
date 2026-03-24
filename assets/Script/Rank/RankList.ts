import { _decorator, Button, Component, director, instantiate, Label, Node, Prefab } from 'cc';
import { Api } from '../Config/Api';
import { AppBridge } from '../Utils/AppBridge';
const { ccclass, property } = _decorator;

type MyRankData = {
    rank?: number;
    memail?: string;
    total_amount?: number | string;
};

type RankItem = {
    rank?: number;
    user_id?: number;
    memail?: string;
    total_amount?: number | string;
};

type RankResponse = {
    list?: RankItem[];
    my_rank?: MyRankData;
};

@ccclass('RankList')
export class RankList extends Component {
    @property(Prefab)
    rankItemPrefab: Prefab = null!;

    private currentType = 1;
    private rankData: RankResponse | null = null;
    private listContentNode: Node | null = null;
    private tabThisWeekButton: Button | null = null;
    private tabLastWeekButton: Button | null = null;
    private readonly renderedListNodes: Node[] = [];

    async start() {
        AppBridge.init();
        this.bindTabs();
        this.applyTabState(1);
        this.bindListContent();
        await this.fetchRankList();
    }

    onDestroy() {
        if (this.tabThisWeekButton?.node?.isValid) {
            this.tabThisWeekButton.node.targetOff(this);
        }
        if (this.tabLastWeekButton?.node?.isValid) {
            this.tabLastWeekButton.node.targetOff(this);
        }
    }

    private async fetchRankList() {
        try {
            this.rankData = await Api.battleRank(this.currentType);
            this.renderMyRank(this.rankData?.my_rank);
            this.renderTopThree(this.rankData?.list ?? []);
            this.renderRankList(this.rankData?.list ?? []);
            console.log('[RankList] 排行榜数据:', this.rankData);
        } catch (error) {
            console.error('[RankList] 获取排行榜失败:', error);
        }
    }

    private bindListContent() {
        this.listContentNode = this.node.getChildByPath('ScrollView/view/content') ?? null;
    }

    private bindTabs() {
        this.tabThisWeekButton = this.findNodeByName(director.getScene(), 'tabThisWeek')?.getComponent(Button) ?? null;
        this.tabLastWeekButton = this.findNodeByName(director.getScene(), 'tabLastWeek')?.getComponent(Button) ?? null;
        this.tabThisWeekButton?.node.on(Button.EventType.CLICK, this.onClickThisWeek, this);
        this.tabLastWeekButton?.node.on(Button.EventType.CLICK, this.onClickLastWeek, this);
    }

    private onClickThisWeek() {
        if (this.currentType === 1) return;
        this.currentType = 1;
        this.applyTabState(1);
        void this.fetchRankList();
    }

    private onClickLastWeek() {
        if (this.currentType === 2) return;
        this.currentType = 2;
        this.applyTabState(2);
        void this.fetchRankList();
    }

    private applyTabState(type: 1 | 2) {
        if (this.tabThisWeekButton) {
            this.tabThisWeekButton.interactable = type !== 1;
        }
        if (this.tabLastWeekButton) {
            this.tabLastWeekButton.interactable = type !== 2;
        }
    }

    private renderMyRank(myRank?: MyRankData) {
        const rankMyNode = this.findNodeByName(director.getScene(), 'rankMy');
        if (!rankMyNode) return;

        const rankingLabel = rankMyNode.getChildByName('ranking')?.getComponent(Label) ?? null;
        const nameLabel = rankMyNode.getChildByName('name')?.getComponent(Label) ?? null;
        const amountLabel = rankMyNode.getChildByName('amount')?.getComponent(Label) ?? null;

        if (rankingLabel) {
            const rankValue = Number(myRank?.rank);
            rankingLabel.string = Number.isFinite(rankValue) && rankValue > 0 ? String(rankValue) : '--';
        }
        if (nameLabel) {
            nameLabel.string = myRank?.memail || '';
        }
        if (amountLabel) {
            amountLabel.string = myRank?.total_amount !== undefined ? String(myRank.total_amount) : '0';
        }
    }

    private renderTopThree(list: RankItem[]) {
        const rankTopNode = this.findNodeByName(director.getScene(), 'rankTop');
        if (!rankTopNode) return;

        this.renderTopItem(rankTopNode, 'one', list[0]);
        this.renderTopItem(rankTopNode, 'two', list[1]);
        this.renderTopItem(rankTopNode, 'three', list[2]);
    }

    private renderTopItem(rankTopNode: Node, nodeName: 'one' | 'two' | 'three', item?: RankItem) {
        const itemNode = rankTopNode.getChildByName(nodeName);
        if (!itemNode) return;

        if (!item) {
            itemNode.active = false;
            return;
        }

        itemNode.active = true;
        const nameLabel = itemNode.getChildByPath('name')?.getComponent(Label) ?? null;
        const countLabel = itemNode.getChildByPath('amount/count')?.getComponent(Label) ?? null;

        if (nameLabel) {
            nameLabel.string = item.memail || '';
        }

        if (countLabel) {
            countLabel.string = item.total_amount !== undefined ? String(item.total_amount) : '0';
        }
    }

    private renderRankList(list: RankItem[]) {
        if (!this.rankItemPrefab || !this.listContentNode) return;

        this.clearRankList();
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const itemNode = instantiate(this.rankItemPrefab);
            const rank = this.normalizeRank(item?.rank, i + 1);

            this.applyRankStyle(itemNode, rank);
            this.setLabel(itemNode, 'name', item?.memail || '');
            this.setLabel(itemNode, 'amount', item?.total_amount !== undefined ? String(item.total_amount) : '0');

            this.listContentNode.addChild(itemNode);
            this.renderedListNodes.push(itemNode);
        }
    }

    private clearRankList() {
        for (const node of this.renderedListNodes) {
            if (node?.isValid) {
                node.destroy();
            }
        }
        this.renderedListNodes.length = 0;
    }

    private applyRankStyle(itemNode: Node, rank: number) {
        const rank1Node = itemNode.getChildByName('rank1');
        const rank2Node = itemNode.getChildByName('rank2');
        const rank3Node = itemNode.getChildByName('rank3');
        const rank4Node = itemNode.getChildByName('rank4');

        if (rank1Node) rank1Node.active = rank === 1;
        if (rank2Node) rank2Node.active = rank === 2;
        if (rank3Node) rank3Node.active = rank === 3;
        if (rank4Node) rank4Node.active = rank >= 4;

        if (rank4Node && rank >= 4) {
            const rank4Label = rank4Node.getChildByName('Label')?.getComponent(Label) ?? null;
            if (rank4Label) {
                rank4Label.string = String(rank);
            }
        }
    }

    private normalizeRank(rankValue?: number, fallbackRank: number = 0): number {
        const rank = Number(rankValue);
        if (Number.isFinite(rank) && rank > 0) return rank;
        return fallbackRank;
    }

    private setLabel(root: Node, path: string, value: string) {
        const label = root.getChildByPath(path)?.getComponent(Label);
        if (label) {
            label.string = value;
        }
    }

    private findNodeByName(root: Node | null, name: string): Node | null {
        if (!root) return null;
        if (root.name === name) return root;

        for (const child of root.children) {
            const found = this.findNodeByName(child, name);
            if (found) return found;
        }

        return null;
    }
}

