import { _decorator, Color, Component, director, instantiate, Label, Node, Prefab, ScrollView } from 'cc';
import { Api } from '../Config/Api';
import { t } from '../Config/I18n';
import { getRoomNameById } from '../Home/RoomConfig';
import { AppBridge } from '../Utils/AppBridge';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

const PAGE_SIZE = 20;
const LOAD_MORE_THRESHOLD = 60;
const RECORD_STATUS_MAP: Record<number, string> = {
    1: '躲避成功',
    2: '躲避失败',
};

type RecordListItem = {
    game_id: number;
    room_id: number;
    killer_room: number;
    amount: string;
    bonus: string;
    state: number;
    created_at: string;
};

@ccclass('RecordStats')
export class RecordStats extends Component {
    @property(Prefab)
    recordItemPrefab: Prefab = null!;

    private readonly roomCountLabels: Array<Label | null> = [];
    private readonly latestRoomLabels: Array<Label | null> = [];
    private readonly latestGameLabels: Array<Label | null> = [];
    private readonly latestRecordItems: Array<Node | null> = [];
    private payoutLabel: Label | null = null;
    private bonusLabel: Label | null = null;
    private scrollView: ScrollView | null = null;
    private contentNode: Node | null = null;
    private currentPage = 1;
    private isLoadingMore = false;
    private hasMore = true;
    private readonly listRecordNodes: Node[] = [];

    async start() {
        AppBridge.init();
        this.bindScrollView();
        this.bindRoomCountLabels();
        this.bindRoomRecordLabels();
        this.bindTotalLabels();
        try {
            const data = await Api.battleRecord();
            this.renderKillRecord(data.kill_record);
            this.renderRoomRecord(data.room_record);
            this.renderJoinRecord(data.join_record);
            await this.loadMoreRecords(true);
        } catch (e) {
            console.error('[RecordStats] 获取游戏记录失败:', e);
        }
    }

    onDestroy() {
        if (this.scrollView?.node?.isValid) {
            this.scrollView.node.targetOff(this);
        }
    }

    private bindScrollView() {
        this.scrollView = this.getComponent(ScrollView);
        this.contentNode = this.scrollView?.content ?? this.node.getChildByPath('view/content') ?? null;
        this.scrollView?.node.on(ScrollView.EventType.SCROLLING, this.onScroll, this);
    }

    private bindRoomCountLabels() {
        this.roomCountLabels.length = 0;
        const record100Node = this.findNodeByName(director.getScene(), 'record100');
        for (let i = 1; i <= 8; i++) {
            this.roomCountLabels.push(
                record100Node?.getChildByPath(`cardTags/cardTag${i}/count`)?.getComponent(Label) ?? null,
            );
        }
    }

    private bindRoomRecordLabels() {
        this.latestRoomLabels.length = 0;
        this.latestGameLabels.length = 0;
        this.latestRecordItems.length = 0;
        const record10Node = this.findNodeByName(director.getScene(), 'record10');
        for (let i = 1; i <= 10; i++) {
            const cardTagNode = record10Node?.getChildByPath(`cardTags/cardTag${i}`) ?? null;
            this.latestRecordItems.push(cardTagNode);
            this.latestRoomLabels.push(
                cardTagNode?.getChildByPath('count')?.getComponent(Label) ?? null,
            );
            this.latestGameLabels.push(
                cardTagNode?.getChildByPath('roomname')?.getComponent(Label) ?? null,
            );
        }
    }

    private bindTotalLabels() {
        const recordTotalNode = this.findNodeByName(director.getScene(), 'recordTotal');
        this.payoutLabel = recordTotalNode?.getChildByPath('cardTags/cardTag1/count')?.getComponent(Label) ?? null;
        this.bonusLabel = recordTotalNode?.getChildByPath('cardTags/cardTag2/count')?.getComponent(Label) ?? null;
    }

    private renderKillRecord(killRecord: Array<{ room_id: number; count: number }>) {
        for (let i = 0; i < this.roomCountLabels.length; i++) {
            const roomId = i + 1;
            const record = killRecord?.find((item) => Number(item.room_id) === roomId);
            const label = this.roomCountLabels[i];
            if (label) {
                label.string = String(record?.count ?? 0);
            }
        }
    }

    private renderRoomRecord(roomRecord: Array<{ game_id: number; killer_room: number }>) {
        for (let i = 0; i < 10; i++) {
            const record = roomRecord?.[i];
            const itemNode = this.latestRecordItems[i];
            const roomLabel = this.latestRoomLabels[i];
            const gameLabel = this.latestGameLabels[i];

            if (itemNode) {
                itemNode.active = !!record;
            }

            if (!record) {
                continue;
            }

            if (roomLabel) {
                roomLabel.string = getRoomNameById(Number(record?.killer_room));
            }

            if (gameLabel) {
                gameLabel.string = record ? `No.${record.game_id}` : '';
            }
        }
    }

    private renderJoinRecord(joinRecord: { payout?: number | string; bonus?: number | string }) {
        if (this.payoutLabel) {
            this.payoutLabel.string = formatAmount(joinRecord?.payout);
        }

        if (this.bonusLabel) {
            this.bonusLabel.string = formatAmount(joinRecord?.bonus);
        }
    }

    private async loadMoreRecords(reset: boolean = false) {
        if (!this.recordItemPrefab || !this.contentNode || this.isLoadingMore) return;

        if (reset) {
            this.currentPage = 1;
            this.hasMore = true;
            this.clearListRecords();
        }

        if (!this.hasMore) return;

        this.isLoadingMore = true;
        try {
            const list = await Api.battleRecord2({
                page_no: this.currentPage,
                page_size: PAGE_SIZE,
            }) as RecordListItem[];
            this.appendRecordItems(list ?? []);
            this.hasMore = Array.isArray(list) && list.length >= PAGE_SIZE;
            if (this.hasMore) {
                this.currentPage += 1;
            }
        } catch (e) {
            console.error('[RecordStats] 获取更多参与记录失败:', e);
        } finally {
            this.isLoadingMore = false;
        }
    }

    private appendRecordItems(list: RecordListItem[]) {
        if (!this.contentNode) return;

        for (const item of list) {
            const itemNode = instantiate(this.recordItemPrefab);
            this.renderRecordItem(itemNode, item);
            this.contentNode.addChild(itemNode);
            this.listRecordNodes.push(itemNode);
        }
    }

    private renderRecordItem(itemNode: Node, item: RecordListItem) {
        this.setLabelString(itemNode, 'cardTitle/Node/id', `No.${item.game_id}`);
        this.setLabelString(itemNode, 'cardTitle/Node/time', item.created_at || '');
        this.setLabelString(itemNode, 'cardTitle/status', this.getRecordStatusText(item));
        this.setStatusColor(itemNode, item);
        this.setLabelString(itemNode, 'room/data', getRoomNameById(Number(item.room_id)));
        this.setLabelString(itemNode, 'killed/data', getRoomNameById(Number(item.killer_room)));
        this.setLabelString(itemNode, 'amount/data', formatAmount(item.amount));
        this.setLabelString(itemNode, 'award/data', formatAmount(item.bonus));
    }

    private getRecordStatusText(item: RecordListItem): string {
        const key = RECORD_STATUS_MAP[Number(item.state)] ?? '';
        return key ? t(key) : '';
    }

    private setLabelString(root: Node, path: string, value: string) {
        const label = root.getChildByPath(path)?.getComponent(Label);
        if (label) {
            label.string = value;
        }
    }

    private setStatusColor(root: Node, item: RecordListItem) {
        const label = root.getChildByPath('cardTitle/status')?.getComponent(Label);
        if (!label) return;
        label.color = Number(item.state) === 2 ? new Color(255, 0, 0, 255) : new Color(3, 203, 15, 255);
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
            void this.loadMoreRecords();
        }
    }

    private findNodeByName(root: Node | null, name: string): Node | null {
        if (!root) return null;
        if (root.name === name) return root;

        for (const child of root.children) {
            const result = this.findNodeByName(child, name);
            if (result) return result;
        }

        return null;
    }
}

